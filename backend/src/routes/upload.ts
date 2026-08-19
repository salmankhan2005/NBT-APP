import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';

// Directory where uploaded files are stored
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function uploadRoutes(app: FastifyInstance) {
  /**
   * POST /api/upload
   * Accepts a multipart form file upload (field name: "file")
   * Returns: { url: "http://localhost:3001/uploads/<filename>" }
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

        // Sanitize and build a safe unique filename
        const ext = path.extname(data.filename || '.jpg').replace(/[^a-zA-Z0-9.]/g, '') || '.jpg';
        const safeName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const savePath = path.join(UPLOAD_DIR, safeName);

        // Stream file to disk
        await pipeline(data.file, fs.createWriteStream(savePath));

        // Build the public URL — always use localhost so admin browser can load it
        const host = (process.env.PUBLIC_HOST || `http://localhost:${process.env.PORT || 3001}`)
          .replace('10.0.2.2', 'localhost')
          .replace('127.0.0.1', 'localhost');
        const publicUrl = `${host}/uploads/${safeName}`;

        app.log.info(`📸 File uploaded: ${safeName}`);

        return reply.code(201).send({ url: publicUrl, filename: safeName });
      } catch (err: any) {
        app.log.error('Upload error:', err);
        return reply.code(500).send({ error: 'Upload failed', message: err.message || 'Unknown error' });
      }
    }
  );
}
