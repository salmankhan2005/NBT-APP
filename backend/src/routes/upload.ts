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

let bucketInitialized = false;
async function ensureSupabaseBucket() {
  if (!supabase || bucketInitialized) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b: any) => b.name === supabaseBucket);
    if (!exists) {
      await supabase.storage.createBucket(supabaseBucket, {
        public: true,
        fileSizeLimit: 10485760,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'application/pdf'],
      });
    } else {
      await supabase.storage.updateBucket(supabaseBucket, {
        public: true,
        fileSizeLimit: 10485760,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'application/pdf'],
      });
    }
    bucketInitialized = true;
  } catch (err) {
    // Non-fatal bucket check failure
  }
}

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
   * Returns a permanent URL: /api/files/<fileId>
   *
   * Stores files in Supabase Storage and preserves binary backup in Neon Postgres.
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

        // Validate MIME type
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'application/pdf'];
        if (!allowedMimes.includes(data.mimetype)) {
          return reply.code(400).send({
            error: 'Invalid file type',
            message: `Only images and PDF files are allowed. Received: ${data.mimetype}`,
          });
        }

        const ext = path.extname(data.filename || '.jpg').replace(/[^a-zA-Z0-9.]/g, '') || '.jpg';
        const safeName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const content = await data.toBuffer();
        const storagePath = `${fileId}/${safeName}`;

        let uploadedToSupabase = false;
        if (supabase) {
          try {
            await ensureSupabaseBucket();
            const { error } = await supabase.storage.from(supabaseBucket).upload(storagePath, content, {
              contentType: data.mimetype,
              cacheControl: '31536000',
              upsert: true,
            });
            if (error) {
              app.log.error(`Supabase upload warning: ${error.message}`);
            } else {
              uploadedToSupabase = true;
            }
          } catch (spErr: any) {
            app.log.error(`Supabase upload failed: ${spErr?.message || spErr}`);
          }
        }

        // Permanent database backup in Neon Postgres
        await sql`
          INSERT INTO uploaded_files (file_id, file_name, mime_type, content, storage_path, size_bytes)
          VALUES (${fileId}, ${safeName}, ${data.mimetype}, ${content}, ${uploadedToSupabase ? storagePath : null}, ${content.length})
          ON CONFLICT (file_id) DO UPDATE SET
            content = EXCLUDED.content,
            storage_path = EXCLUDED.storage_path,
            size_bytes = EXCLUDED.size_bytes
        `;

        // Cache to local disk for fast static file serving
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
        let supabasePublicUrl: string | undefined = undefined;
        if (uploadedToSupabase && supabase) {
          const { data: pUrlData } = supabase.storage.from(supabaseBucket).getPublicUrl(storagePath);
          if (pUrlData?.publicUrl) {
            supabasePublicUrl = pUrlData.publicUrl;
          }
        }
        const finalUrl = supabasePublicUrl || publicUrl;
        app.log.info(`File uploaded to ${uploadedToSupabase ? 'Supabase Storage + Neon Backup' : 'Neon Postgres Database'}: ${fileId}`);

        return reply.code(201).send({ url: finalUrl, supabaseUrl: supabasePublicUrl, publicUrl, filename: safeName, fileId });
      } catch (err: any) {
        app.log.error('Upload error:', err);
        return reply.code(500).send({ error: 'Upload failed', message: err.message || 'Unknown error' });
      }
    }
  );
}

export async function fileRoutes(app: FastifyInstance) {
  // Helper function to serve file from Supabase, Neon DB, or Disk
  const serveFile = async (req: FastifyRequest, reply: FastifyReply, fileIdentifier: string) => {
    if (!FILE_ID_PATTERN.test(fileIdentifier)) {
      return reply.code(404).send({ error: 'File not found' });
    }

    // 1. Query Neon Postgres metadata & binary content
    try {
      const rows = await sql`
        SELECT file_name, mime_type, content, storage_path
        FROM uploaded_files
        WHERE file_id = ${fileIdentifier} OR file_name = ${fileIdentifier}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const file = rows[0] as { file_name: string; mime_type: string; content: Uint8Array | null; storage_path: string | null };
        let content: Buffer | null = file.content ? Buffer.from(file.content) : null;

        // Try downloading from Supabase Storage first
        if (file.storage_path && supabase) {
          try {
            const { data, error } = await supabase.storage.from(supabaseBucket).download(file.storage_path);
            if (!error && data) {
              content = Buffer.from(await data.arrayBuffer());
            }
          } catch (spErr) {
            app.log.warn(`Supabase download failed for ${file.storage_path}, falling back to Neon DB content...`);
          }
        }

        if (content && content.length > 0) {
          reply.header('Content-Type', file.mime_type || 'image/jpeg');
          reply.header('Content-Length', String(content.length));
          reply.header('Cache-Control', 'public, max-age=31536000, immutable');
          reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
          reply.header('Access-Control-Allow-Origin', '*');
          reply.header('Content-Disposition', `inline; filename="${file.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
          return reply.send(content);
        }
      }
    } catch (err) {
      app.log.warn(`DB file lookup failed for ${fileIdentifier}, checking local disk...`);
    }

    // 2. Local disk fallback
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
        SELECT file_name, mime_type, content, storage_path
        FROM uploaded_files
        WHERE file_name = ${fileName} OR file_id = ${fileName}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const file = rows[0] as { file_name: string; mime_type: string; content: Uint8Array | null; storage_path: string | null };
        let content: Buffer | null = file.content ? Buffer.from(file.content) : null;

        if (file.storage_path && supabase) {
          try {
            const { data, error } = await supabase.storage.from(supabaseBucket).download(file.storage_path);
            if (!error && data) {
              content = Buffer.from(await data.arrayBuffer());
            }
          } catch (spErr) {
            // non-critical
          }
        }

        if (content && content.length > 0) {
          reply.header('Content-Type', file.mime_type || 'image/jpeg');
          reply.header('Content-Length', String(content.length));
          reply.header('Cache-Control', 'public, max-age=31536000, immutable');
          reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
          reply.header('Access-Control-Allow-Origin', '*');
          reply.header('Content-Disposition', `inline; filename="${file.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
          return reply.send(content);
        }
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

