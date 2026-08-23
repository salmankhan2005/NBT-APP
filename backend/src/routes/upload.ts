import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import path from 'path';
import { sql } from '../db/client';

const FILE_ID_PATTERN = /^[a-zA-Z0-9_-]{8,80}$/;

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
   * Used by Driver App to upload POD photos and expense receipt images.
   * The returned URL is stored in Neon Postgres and served to the Admin App.
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

        await sql`
          INSERT INTO uploaded_files (file_id, file_name, mime_type, content, size_bytes)
          VALUES (${fileId}, ${safeName}, ${data.mimetype}, ${content}, ${content.length})
        `;

        const publicUrl = `${getPublicHost(req)}/api/files/${fileId}`;
        app.log.info(`File uploaded to database: ${fileId}`);

        return reply.code(201).send({ url: publicUrl, filename: safeName, fileId });
      } catch (err: any) {
        app.log.error('Upload error:', err);
        return reply.code(500).send({ error: 'Upload failed', message: err.message || 'Unknown error' });
      }
    }
  );
}

export async function fileRoutes(app: FastifyInstance) {
  app.get('/:fileId', async (req: FastifyRequest, reply: FastifyReply) => {
    const { fileId } = req.params as { fileId: string };
    if (!FILE_ID_PATTERN.test(fileId)) {
      return reply.code(404).send({ error: 'File not found' });
    }

    const rows = await sql`
      SELECT file_name, mime_type, content
      FROM uploaded_files
      WHERE file_id = ${fileId}
      LIMIT 1
    `;
    if (!rows.length) {
      return reply.code(404).send({ error: 'File not found' });
    }

    const file = rows[0] as { file_name: string; mime_type: string; content: Uint8Array };
    reply.header('Content-Type', file.mime_type);
    reply.header('Content-Length', String(file.content.length));
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Content-Disposition', `inline; filename="${file.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
    return reply.send(Buffer.from(file.content));
  });
}
