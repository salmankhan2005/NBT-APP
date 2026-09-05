// NBT-ARS Enterprise Production Backend v2.5.0 (Live Release)
import Fastify from 'fastify';
import compress from '@fastify/compress';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import path from 'path';
import 'dotenv/config';

import { pingDatabase, sql } from './db/client';
import { authRoutes } from './routes/auth';
import { tripRoutes } from './routes/trips';
import { adminRoutes } from './routes/admin';
import { docsRoutes } from './routes/docs';
import { mapsRoutes } from './routes/maps';
import { uploadRoutes, fileRoutes, legacyUploadsFallbackRoutes } from './routes/upload';
import { lorryBookingRoutes } from './routes/lorryBooking';
import { authenticate, requireAdmin } from './middleware/auth';

// ── Type augmentation for Fastify ────────────────────────────────────────────
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
    requireAdmin:  (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      jti?: string;
      driverId?: string;
      tripId?: string;
      trackingId?: string;
      role?: string;
      adminId?: string;
      username?: string;
    };
    user: {
      jti?: string;
      driverId?: string;
      tripId?: string;
      trackingId?: string;
      role?: string;
      adminId?: string;
      username?: string;
    };
  }
}

// ── Build server ─────────────────────────────────────────────────────────────
const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
        : undefined,
  },
  bodyLimit: 50 * 1024 * 1024, // 50MB to support large Base64 fallbacks for offline sync
});

// ── Validate required environment variables ──────────────────────────────────
function validateEnvironment() {
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV'];
  const optionalEnvVars = ['GOOGLE_MAPS_API_KEY', 'WHATSAPP_API_KEY', 'WHATSAPP_API_URL'];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`FATAL: Required environment variable missing: ${envVar}`);
    }
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET!.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters. Set it in your .env file.');
  }

  // Validate DATABASE_URL format
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith('postgresql')) {
    throw new Error('FATAL: Invalid DATABASE_URL format (must start with postgresql)');
  }

  // Log optional variables
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      app.log.info(`✓ ${envVar} configured`);
    } else {
      app.log.warn(`⚠ ${envVar} not configured — feature disabled`);
    }
  }

  app.log.info('✅ All required environment variables validated');
}

async function bootstrap() {
  try {
    // Validate environment first, before any operations
    validateEnvironment();

    await pingDatabase();
    await sql`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        file_id     TEXT PRIMARY KEY,
        file_name   TEXT NOT NULL,
        mime_type   TEXT NOT NULL,
        content     BYTEA,
        storage_path TEXT,
        size_bytes  INTEGER NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`ALTER TABLE uploaded_files ALTER COLUMN content DROP NOT NULL`;
    await sql`ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS storage_path TEXT`;
    // Auto-migrate: expenses table location columns
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS latitude NUMERIC`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS longitude NUMERIC`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS city TEXT`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS address TEXT`;
    // Auto-migrate: trips table financial columns
    await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS agreed_freight NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_payment NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS profit_or_loss NUMERIC DEFAULT 0`;
    // Auto-migrate: trips table receipt url column on expenses
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT`;
    // Auto-migrate: expenses multi-photo support (up to 10 per expense)
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_urls JSONB NOT NULL DEFAULT '[]'`;
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_expenses_receipt_urls_max10'
          AND conrelid = 'expenses'::regclass
        ) THEN
          ALTER TABLE expenses
            ADD CONSTRAINT chk_expenses_receipt_urls_max10
            CHECK (jsonb_array_length(receipt_urls) <= 10);
        END IF;
      END;
      $$
    `;
    // Backfill: migrate existing single receipt_url into receipt_urls array
    await sql`
      UPDATE expenses
      SET receipt_urls = jsonb_build_array(receipt_url)
      WHERE receipt_url IS NOT NULL
        AND receipt_url <> ''
        AND (receipt_urls = '[]'::jsonb OR receipt_urls IS NULL)
    `;
    // Auto-migrate: trips table driver pin
    await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_pin TEXT`;
    // Auto-migrate: odometer start url
    await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS odometer_start_url TEXT`;
    // Auto-migrate: odometer end url
    await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS odometer_end_url TEXT`;
    // Auto-migrate: pod photo url
    await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS pod_photo_url TEXT`;
    // Auto-migrate: pod signature and notes
    await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS pod_signature TEXT`;
    await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS pod_notes TEXT`;
    // Auto-migrate: trip is_pinned
    await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false`;
    await sql`
      CREATE TABLE IF NOT EXISTS lorry_booking_daily_profits (
        profit_date DATE PRIMARY KEY,
        total_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS lorry_booking_entries (
        id TEXT PRIMARY KEY,
        profit_date DATE NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        vehicle_number TEXT NOT NULL DEFAULT '',
        from_point TEXT NOT NULL DEFAULT '',
        destination_point TEXT NOT NULL DEFAULT '',
        load_freight NUMERIC(12,2) NOT NULL DEFAULT 0,
        lorry_freight NUMERIC(12,2) NOT NULL DEFAULT 0,
        gross_freight NUMERIC(12,2) NOT NULL DEFAULT 0,
        coolie NUMERIC(12,2) NOT NULL DEFAULT 0,
        commission_freight NUMERIC(12,2) NOT NULL DEFAULT 0,
        total_freight NUMERIC(12,2) NOT NULL DEFAULT 0,
        expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
        profit NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_lorry_booking_entries_date ON lorry_booking_entries(profit_date)`;
    // Auto-migrate: lorry_booking_entries name and vehicle_number columns
    await sql`ALTER TABLE lorry_booking_entries ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE lorry_booking_entries ADD COLUMN IF NOT EXISTS vehicle_number TEXT NOT NULL DEFAULT ''`;
    // Auto-migrate: fix vehicle_documents rows where is_active is null (set to true)
    await sql`UPDATE vehicle_documents SET is_active = true WHERE is_active IS NULL`;
    // Auto-migrate: fix empty string pod fields to null
    await sql`UPDATE trips SET pod_signature = NULL WHERE pod_signature = ''`;
    await sql`UPDATE trips SET pod_notes = NULL WHERE pod_notes = ''`;
    await sql`UPDATE trips SET pod_photo_url = NULL WHERE pod_photo_url = ''`;
    // Auto-migrate: gc_notes table
    await sql`
      CREATE TABLE IF NOT EXISTS gc_notes (
        id               TEXT PRIMARY KEY,
        gc_number        TEXT UNIQUE NOT NULL,
        date             TEXT NOT NULL,
        consignor_name   TEXT DEFAULT '',
        consignee_name   TEXT DEFAULT '',
        items            JSONB DEFAULT '[]',
        freight_amount   NUMERIC(12,2) DEFAULT 0,
        total_amount     NUMERIC(12,2) DEFAULT 0,
        advance_amount   NUMERIC(12,2) DEFAULT 0,
        balance_amount   NUMERIC(12,2) DEFAULT 0,
        raw_data         JSONB DEFAULT '{}',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    // Auto-migrate: memos table
    await sql`
      CREATE TABLE IF NOT EXISTS memos (
        id           TEXT PRIMARY KEY,
        date         TEXT NOT NULL,
        content_html TEXT NOT NULL DEFAULT '',
        created_by   TEXT DEFAULT 'Admin',
        status       TEXT DEFAULT 'SAVED',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    // Auto-migrate: performance indexes for fast mobile queries
    await sql`CREATE INDEX IF NOT EXISTS idx_gps_trip_id_time ON gps_updates(trip_id, recorded_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_trips_updated_at ON trips(updated_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_managed_vehicles_number ON managed_vehicles(vehicle_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle_id ON vehicle_documents(vehicle_id, is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_id ON uploaded_files(file_id)`;
    app.log.info('  ✓ DB auto-migrations applied (expenses + trips financial columns + driver pin + odometer_start_url + is_pinned + lorry booking tables + vehicle_documents is_active fix + gc_notes + memos + performance indexes)');
  } catch (err) {
    app.log.warn(`Database connection or auto-migration failed: ${err}`);
  }

  // ── Security headers ──────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false, // Mobile app doesn't need strict CSP
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  });

  // ── Gzip / Brotli Compression (Reduces payload size by 80-90%) ─────────────
  await app.register(compress, {
    global: true,
    threshold: 512,
  });

  // ── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:8081,http://localhost:8082,http://localhost:8083,http://localhost:19006,http://localhost:3000,http://127.0.0.1:19006,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim());

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || process.env.NODE_ENV !== 'production') {
        cb(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── Rate limiting — global ─────────────────────────────────────────────
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down.',
    }),
  });

  // ── JWT ───────────────────────────────────────────────────────────────────
  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { algorithm: 'HS256' },
  });

  // Decorate instance with auth hooks so routes can reference app.authenticate
  app.decorate('authenticate', authenticate);
  app.decorate('requireAdmin', requireAdmin);

  // ── Auth routes — with tighter rate limit ─────────────────────────────────
  app.register(async (instance) => {
    await instance.register(rateLimit, {
      max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
      timeWindow: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60000),
      errorResponseBuilder: () => ({
        error: 'Too Many Requests',
        message: 'Too many login attempts. Please wait a minute.',
      }),
    });
    instance.register(authRoutes, { prefix: '/api/auth' });
  });

  // ── Trip routes ───────────────────────────────────────────────────────────
  app.register(tripRoutes, { prefix: '/api/trips' });

  // ── Admin routes ──────────────────────────────────────────────────────────
  app.register(adminRoutes, { prefix: '/api/admin' });

  // —— Docs & Memos routes ————————————————————————————————————————
  app.register(docsRoutes, { prefix: '/api' });

  // —— Maps proxy routes (Google Maps API key never exposed to clients) —————
  app.register(mapsRoutes, { prefix: '/api/maps' });

  // ── Multipart (file upload support) ──────────────────────────────────────
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB max per upload
      files: 1,
    },
  });

  // ── Static file serving for uploaded images ────────────────────────────────
  await app.register(staticFiles, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
    setHeaders: (res, _path, stat) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  // Keep older document URLs working after the upload route was standardized.
  await app.register(staticFiles, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/api/uploads/',
    decorateReply: false,
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  // Ensure uploaded files are accessible from web app origins for all static response flows.
  app.addHook('onRequest', async (req, reply) => {
    if (req.raw.url?.startsWith('/uploads/')) {
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    }
  });
  // ── Upload route ──────────────────────────────────────────────────────────
  app.register(uploadRoutes, { prefix: '/api/upload' });
  app.register(fileRoutes, { prefix: '/api/files' });
  app.register(legacyUploadsFallbackRoutes, { prefix: '/uploads' });
  app.register(legacyUploadsFallbackRoutes, { prefix: '/api/uploads' });

  // ── Lorry Booking Agency routes ─────────────────────────────────────────
  app.register(lorryBookingRoutes, { prefix: '/api/lorry-booking' });

  // ── Root Landing & System Portal (Prevents 404 on root domain) ─────────
  app.get('/', async (req, reply) => {
    const acceptsHtml = req.headers.accept?.includes('text/html');
    let dbStatus = 'CONNECTED';
    let dbPing = true;
    try {
      await pingDatabase();
    } catch {
      dbStatus = 'DISCONNECTED';
      dbPing = false;
    }

    if (!acceptsHtml) {
      return reply.code(200).send({
        status: dbPing ? 'ok' : 'degraded',
        service: 'NBT Logistics Enterprise Cloud API',
        version: '2.5.0',
        environment: process.env.NODE_ENV || 'production',
        database: dbStatus,
        endpoints: {
          health: '/health',
          auth: '/api/auth',
          trips: '/api/trips',
          admin: '/api/admin',
          gc: '/api/gc',
          memos: '/api/memos',
          maps: '/api/maps',
          uploads: '/api/upload',
          lorryBooking: '/api/lorry-booking',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NBT Logistics — Enterprise Cloud Gateway</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1e3a5f;
      --accent: #f97316;
      --success: #16a34a;
      --bg: #0f172a;
      --card-bg: rgba(30, 41, 59, 0.75);
      --border: rgba(255, 255, 255, 0.12);
      --text: #f8fafc;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: radial-gradient(circle at top right, #1e293b, #0f172a 70%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 40px;
      max-width: 680px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .badge-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(22, 163, 74, 0.15);
      border: 1px solid rgba(22, 163, 74, 0.4);
      color: #4ade80;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: #4ade80;
      border-radius: 50%;
      box-shadow: 0 0 8px #4ade80;
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin-bottom: 8px;
    }
    p.sub {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .item {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .item-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .item-val {
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
    }
    .endpoints-box {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      font-family: monospace;
      font-size: 12px;
      color: #cbd5e1;
      margin-bottom: 20px;
      line-height: 1.9;
    }
    .endpoints-box a {
      color: #38bdf8;
      text-decoration: none;
    }
    .endpoints-box a:hover {
      text-decoration: underline;
    }
    .footer {
      font-size: 11px;
      color: var(--muted);
      text-align: center;
      border-top: 1px solid var(--border);
      padding-top: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge-bar">
      <div class="status-pill">
        <div class="status-dot"></div>
        LIVE & OPERATIONAL
      </div>
    </div>
    <h1>NBT Logistics Enterprise Cloud</h1>
    <p class="sub">Production Backend API Gateway & Telematics Engine for New Balaji Transports.</p>
    
    <div class="grid">
      <div class="item">
        <span class="item-label">Database Status</span>
        <span class="item-val" style="color: ${dbPing ? '#4ade80' : '#f87171'}">${dbStatus} (Neon PostgreSQL)</span>
      </div>
      <div class="item">
        <span class="item-label">Cloud Storage</span>
        <span class="item-val">Supabase Storage + DB Blob</span>
      </div>
      <div class="item">
        <span class="item-label">Environment</span>
        <span class="item-val">Production (Render Cloud)</span>
      </div>
      <div class="item">
        <span class="item-label">API Version</span>
        <span class="item-val">v2.5.0 Enterprise</span>
      </div>
    </div>

    <div class="endpoints-box">
      <strong>Active Endpoints:</strong><br/>
      • <a href="/health">/health</a> — Real-time health & DB latency check<br/>
      • <a href="/api/trips">/api/trips</a> — Driver live dispatch & GPS sync<br/>
      • <a href="/api/admin/trips">/api/admin/trips</a> — Trip registry & management<br/>
      • <a href="/api/gc">/api/gc</a> — Goods Consignment Notes API<br/>
      • <a href="/api/memos">/api/memos</a> — Lorry Hire Memos API<br/>
      • <a href="/api/upload">/api/upload</a> — Document & receipt vault
    </div>

    <div class="footer">
      © 2026 New Balaji Transports (NBT-ARS). All rights reserved.
    </div>
  </div>
</body>
</html>`;

    reply.type('text/html').send(html);
  });

  app.get('/api', async (_req, reply) => {
    return reply.code(200).send({
      status: 'ok',
      service: 'NBT Logistics Enterprise Cloud API',
      version: '2.5.0',
      routes: [
        '/health',
        '/api/auth',
        '/api/trips',
        '/api/admin',
        '/api/gc',
        '/api/memos',
        '/api/maps',
        '/api/upload',
        '/api/lorry-booking',
      ],
    });
  });

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', async (_req, reply) => {
    try {
      await pingDatabase();
      return reply.code(200).send({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
    } catch {
      return reply.code(503).send({ status: 'error', db: 'disconnected' });
    }
  });

  // ── 404 handler ────────────────────────────────────────────────────────────
  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: 'Not Found', message: 'The requested endpoint does not exist.' });
  });

  // ── Global error handler ──────────────────────────────────────────────────
  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    if (err.statusCode === 429) {
      return reply.code(429).send({ error: 'Too Many Requests', message: err.message });
    }
    reply.code(err.statusCode ?? 500).send({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
    });
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  const port = Number(process.env.PORT ?? 3001);
  // Always bind to 0.0.0.0 — required by cloud hosts (Render, Railway, etc.)
  const host = '0.0.0.0';

  app.log.info(`⏳  Attempting to bind on ${host}:${port}...`);
  await app.listen({ port, host });
  app.log.info(`🚀  NBT-ARS Backend running at http://${host}:${port}`);
  app.log.info(`🔒  JWT auth + token revocation enabled | CORS: ${allowedOrigins.join(', ')}`);
  app.log.info(`📦  Endpoints: /health  /api/auth  /api/trips  /api/admin  /api/gc  /api/memos  /api/maps  /api/upload`);
  app.log.info(`🗺️  Maps proxy: ${process.env.GOOGLE_MAPS_API_KEY ? 'ENABLED (key configured)' : 'DISABLED (GOOGLE_MAPS_API_KEY not set)'}`);
  app.log.info(`📸  File uploads: /api/upload → served at /uploads/`);

  // ── Periodic Keepalive Self-Ping (Prevents Render free-tier spin down) ────
  setInterval(async () => {
    try {
      await pingDatabase();
      app.log.info('💓 [Keepalive] Database & server active ping');
    } catch {
      // ignore transient keepalive failures
    }
  }, 10 * 60 * 1000);
}

bootstrap().catch((err) => {
  console.error('❌  Failed to start server:', err);
  process.exit(1);
});
