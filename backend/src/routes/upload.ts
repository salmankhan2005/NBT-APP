import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { sql } from '../db/client';

const FILE_ID_PATTERN = /^[a-zA-Z0-9._-]{5,120}$/;
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'nbt-uploads';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
}) : null;

function getPublicHost(req: FastifyRequest): string {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || 'http';
  const forwardedHost = req.headers['x-forwarded-host'];
  const requestHostName = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host || `localhost:${process.env.PORT || 3001}`;
  const requestHost = `${protocol}://${requestHostName}`;
  const configuredHost = process.env.PUBLIC_HOST?.trim();
  return (configuredHost && !/localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(configuredHost) ? configuredHost : requestHost)
    .replace('10.0.2.2', 'localhost')
    .replace('127.0.0.1', 'localhost');
}

export async function uploadRoutes(app: FastifyInstance) {
  /**
   * POST /api/upload
   * Accepts a multipart form file upload (field name: "file")
   * Returns a permanent database-backed URL: /api/files/<fileId>
   *
   * Used by Driver App & Admin App to upload photos, document images, and receipts.
   * The file binary is stored permanently in Neon Postgres and cached locally on disk.
   */
  app.post(
    '/',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await req.file();

        if (!data) {
          return reply.code(400).send({ error: 'No file provided', message: 'Please upload a file.' });
        }

        // Validate MIME type — allow images and PDFs for vehicle documents and receipts
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'application/pdf'];
        if (!allowedMimes.includes(data.mimetype)) {
          return reply.code(400).send({
            error: 'Invalid file type',
            message: `Only images and PDF files are allowed. Received: ${data.mimetype}`,
          });
        }

        // Keep the original extension for content disposition and downloads.
        const ext = path.extname(data.filename || '.jpg').replace(/[^a-zA-Z0-9.]/g, '') || '.jpg';
        const safeName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const content = await data.toBuffer();
        const storagePath = `${fileId}/${safeName}`;

        if (supabase) {
          const { error } = await supabase.storage.from(supabaseBucket).upload(storagePath, content, {
            contentType: data.mimetype,
            cacheControl: '31536000',
            upsert: false,
          });
          if (error) throw new Error(`Supabase upload failed: ${error.message}`);
        }

        // 1. Permanent database store in Neon Postgres
        await sql`
          INSERT INTO uploaded_files (file_id, file_name, mime_type, content, storage_path, size_bytes)
          VALUES (${fileId}, ${safeName}, ${data.mimetype}, ${supabase ? null : content}, ${supabase ? storagePath : null}, ${content.length})
          ON CONFLICT (file_id) DO NOTHING
        `;

        // 2. Cache to local disk for fast static file serving
        try {
          const uploadsDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          fs.writeFileSync(path.join(uploadsDir, safeName), content);
        } catch (diskErr) {
          app.log.warn(`Local disk caching failed (non-critical): ${diskErr}`);
        }

        const publicUrl = `${getPublicHost(req)}/api/files/${fileId}`;
        app.log.info(`File uploaded to ${supabase ? 'Supabase Storage' : 'database fallback'}: ${fileId}`);

        return reply.code(201).send({ url: publicUrl, filename: safeName, fileId });
      } catch (err: any) {
        app.log.error('Upload error:', err);
        return reply.code(500).send({ error: 'Upload failed', message: err.message || 'Unknown error' });
      }
    }
  );
}

export async function fileRoutes(app: FastifyInstance) {
  // Helper function to serve file from DB or Disk
  const serveFile = async (req: FastifyRequest, reply: FastifyReply, fileIdentifier: string) => {
    if (!FILE_ID_PATTERN.test(fileIdentifier)) {
      return reply.code(404).send({ error: 'File not found' });
    }

    // 1. Query Neon Postgres first
    try {
      const rows = await sql`
        SELECT file_name, mime_type, content, storage_path
        FROM uploaded_files
        WHERE file_id = ${fileIdentifier} OR file_name = ${fileIdentifier}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const file = rows[0] as { file_name: string; mime_type: string; content: Uint8Array | null; storage_path: string | null };
        let content = file.content ? Buffer.from(file.content) : null;
        if (file.storage_path && supabase) {
          const { data, error } = await supabase.storage.from(supabaseBucket).download(file.storage_path);
          if (!error && data) content = Buffer.from(await data.arrayBuffer());
        }
        if (!content) throw new Error('Stored file content unavailable');
        reply.header('Content-Type', file.mime_type || 'image/jpeg');
        reply.header('Content-Length', String(content.length));
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');
        reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Content-Disposition', `inline; filename="${file.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
        return reply.send(content);
      }
    } catch (err) {
      app.log.warn(`DB file lookup failed for ${fileIdentifier}, checking local disk...`);
    }

    // 2. Check local disk fallback
    const diskPath = path.join(process.cwd(), 'uploads', fileIdentifier);
    if (fs.existsSync(diskPath) && fs.statSync(diskPath).isFile()) {
      const ext = path.extname(fileIdentifier).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.pdf' ? 'application/pdf' : 'image/jpeg';
      const fileBuffer = fs.readFileSync(diskPath);
      reply.header('Content-Type', mimeType);
      reply.header('Content-Length', String(fileBuffer.length));
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Content-Disposition', `inline; filename="${fileIdentifier.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
      return reply.send(fileBuffer);
    }

    return reply.code(404).send({ error: 'File not found', message: 'The requested image or file could not be found.' });
  };

  // Serve GET /api/files/:fileId
  app.get('/:fileId', async (req: FastifyRequest, reply: FastifyReply) => {
    const { fileId } = req.params as { fileId: string };
    return serveFile(req, reply, fileId);
  });
}

export async function legacyUploadsFallbackRoutes(app: FastifyInstance) {
  const serveFile = async (req: FastifyRequest, reply: FastifyReply, fileName: string) => {
    const diskPath = path.join(process.cwd(), 'uploads', fileName);
    if (fs.existsSync(diskPath) && fs.statSync(diskPath).isFile()) {
      const ext = path.extname(fileName).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.pdf' ? 'application/pdf' : 'image/jpeg';
      const fileBuffer = fs.readFileSync(diskPath);
      reply.header('Content-Type', mimeType);
      reply.header('Content-Length', String(fileBuffer.length));
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Content-Disposition', `inline; filename="${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
      return reply.send(fileBuffer);
    }

    // DB fallback
    try {
      const rows = await sql`
        SELECT file_name, mime_type, content
        FROM uploaded_files
        WHERE file_name = ${fileName} OR file_id = ${fileName}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const file = rows[0] as { file_name: string; mime_type: string; content: Uint8Array };
        reply.header('Content-Type', file.mime_type || 'image/jpeg');
        reply.header('Content-Length', String(file.content.length));
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');
        reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Content-Disposition', `inline; filename="${file.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
        return reply.send(Buffer.from(file.content));
      }
    } catch (err) {
      app.log.warn(`DB file lookup failed for legacy filename ${fileName}`);
    }

    return reply.code(404).send({ error: 'File not found' });
  };

  app.get('/:fileName', async (req: FastifyRequest, reply: FastifyReply) => {
    const { fileName } = req.params as { fileName: string };
    return serveFile(req, reply, fileName);
  });
}
