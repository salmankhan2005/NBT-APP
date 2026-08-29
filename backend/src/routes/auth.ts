import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import argon2 from 'argon2';
import nodemailer from 'nodemailer';
import { sql } from '../db/client';
import { LoginSchema } from '../middleware/validate';

// ─── Registered admin emails (only these can receive OTP) ─────────────────────
const REGISTERED_ADMIN_EMAILS = [
  'krithickpranav906@gmail.com',
  'newbalajitransports1@gmail.com',
];

let mailTransporter: any = null;

function getMailTransporter() {
  if (!mailTransporter) {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (gmailUser && gmailPass) {
      mailTransporter = nodemailer.createTransport({
        service: 'gmail',
        pool: true,             // Enable SMTP connection pooling
        maxConnections: 3,      // Maintain up to 3 concurrent connections
        maxMessages: 100,       // Max 100 emails per connection
        rateLimit: 10,          // Limit connection rate
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });
    }
  }
  return mailTransporter;
}

/**
 * Auth routes — no JWT required on login, JWT required on logout.
 */
export async function authRoutes(app: FastifyInstance) {

  // ── POST /api/auth/driver/login ───────────────────────────────────────────
  app.post('/driver/login', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { trackingId, pin } = parsed.data;
    const cleanId = trackingId.toUpperCase().trim();

    // Look up by trackingId, trip id, or driverId
    const rows = await sql`
      SELECT
        t.id          AS trip_id,
        t.tracking_id,
        t.driver_id,
        t.driver_name,
        t.status,
        d.pin_hash,
        d.active
      FROM trips t
      JOIN drivers d ON d.id = t.driver_id
      WHERE
        UPPER(t.tracking_id) = ${cleanId}
        OR UPPER(t.id)       = ${cleanId}
        OR UPPER(d.id)       = ${cleanId}
      LIMIT 1
    `;

    const sendInvalidCreds = () => reply.code(401).send({
      error: 'Invalid credentials',
      message: 'Invalid Tracking ID or PIN. Please try again.'
    });

    if (rows.length === 0) return sendInvalidCreds();

    const record = rows[0] as {
      trip_id: string;
      tracking_id: string;
      driver_id: string;
      driver_name: string;
      status: string;
      pin_hash: string;
      active: boolean;
    };

    // Reject inactive drivers
    if (!record.active) return sendInvalidCreds();

    // Constant-time argon2 verification (prevents timing attacks)
    const valid = await argon2.verify(record.pin_hash, pin);
    if (!valid) return sendInvalidCreds();

    // Issue JWT — 8-hour expiry, includes jti for revocation
    const jti = `drv-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const token = app.jwt.sign(
      {
        jti,
        driverId: record.driver_id,
        tripId: record.trip_id,
        trackingId: record.tracking_id,
        role: 'driver',
      },
      { expiresIn: '8h' }
    );

    return reply.code(200).send({
      token,
      driverId: record.driver_id,
      tripId: record.trip_id,
      trackingId: record.tracking_id,
      driverName: record.driver_name,
      status: record.status,
    });
  });

  // ── POST /api/auth/driver/logout — server-side token revocation ───────────
  app.post(
    '/driver/logout',
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const rawToken = req.headers.authorization?.replace('Bearer ', '');
      if (rawToken) {
        try {
          // Decode without verify to get expiry — token already verified by authenticate hook
          const decoded = app.jwt.decode<{ jti?: string; exp?: number }>(rawToken);
          if (decoded?.jti) {
            const expiresAt = decoded.exp
              ? new Date(decoded.exp * 1000).toISOString()
              : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
            await sql`
              INSERT INTO revoked_tokens (token_jti, expires_at)
              VALUES (${rawToken}, ${expiresAt})
              ON CONFLICT (token_jti) DO NOTHING
            `;
          }
        } catch {
          // Non-critical — logout always succeeds on the client side
        }
      }
      return reply.code(200).send({ message: 'Logged out successfully.' });
    }
  );

  // ── POST /api/auth/admin/login — DB-backed Argon2id verification ──────────
  app.post('/admin/login', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation failed' });
    }

    const { trackingId, pin } = parsed.data;
    const username = trackingId.toLowerCase().trim();

    // Look up admin user in DB (primary path)
    try {
      const rows = await sql`
        SELECT id, username, password_hash, name, role
        FROM admin_users
        WHERE LOWER(username) = ${username}
        LIMIT 1
      `.catch(() => []);

      if (rows.length > 0) {
        const admin = rows[0] as { id: string; username: string; password_hash: string; name: string; role: string };
        const valid = await argon2.verify(admin.password_hash, pin);
        if (valid) {
          const jti = `adm-${Date.now()}-${Math.random().toString(36).substring(2)}`;
          const token = app.jwt.sign(
            { jti, adminId: admin.id, username: admin.username, role: admin.role || 'admin' },
            { expiresIn: '12h' }
          );
          return reply.code(200).send({ token, username: admin.username, name: admin.name, role: admin.role || 'admin' });
        }
      }
    } catch {
      // Fall through to error response
    }

    // Generic — do NOT reveal whether the username exists
    return reply.code(401).send({ error: 'Invalid credentials', message: 'Invalid Admin username or password.' });
  });

  // ── POST /api/auth/send-otp — Send Email OTP to registered admin email ────
  app.post('/send-otp', async (req: FastifyRequest, reply: FastifyReply) => {
    const { email, otp, purpose } = (req.body as any) || {};
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return reply.code(400).send({ error: 'Invalid email address' });
    }

    // Only allow registered admin emails
    if (!REGISTERED_ADMIN_EMAILS.includes(cleanEmail)) {
      return reply.code(403).send({ error: 'Email not registered as admin' });
    }

    if (!otp) {
      return reply.code(400).send({ error: 'Missing OTP' });
    }

    const transporter = getMailTransporter();
    if (!transporter) {
      req.log.error('[Email OTP] Gmail credentials not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing)');
      return reply.code(500).send({ error: 'Email service not configured on server' });
    }

    // Fire email delivery in the background asynchronously so the client doesn't wait
    transporter.sendMail({
      from: `"NBT Admin Security" <${process.env.GMAIL_USER}>`,
      to: cleanEmail,
      subject: '🔐 NBT Admin PIN Reset — Verification Code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:24px;text-align:center">
            <h2 style="color:#fff;margin:0;font-size:20px;letter-spacing:1px">NEW BALAJI TRANSPORT</h2>
            <p style="color:#bfdbfe;margin:4px 0 0;font-size:12px">ADMIN COMMAND CONSOLE</p>
          </div>
          <div style="padding:28px 32px">
            <h3 style="color:#1e293b;margin:0 0 8px">Security PIN Reset OTP</h3>
            <p style="color:#475569;font-size:14px;margin:0 0 20px">Use the verification code below to reset your Admin Security PIN. This code is valid for <strong>5 minutes</strong>.</p>
            <div style="background:#f8fafc;border:2px dashed #3b82f6;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px">
              <p style="margin:0 0 6px;font-size:12px;color:#64748b;font-weight:600;letter-spacing:1px">YOUR VERIFICATION CODE</p>
              <p style="margin:0;font-size:40px;font-weight:900;letter-spacing:12px;color:#1e40af">${otp}</p>
            </div>
            <p style="color:#94a3b8;font-size:12px;margin:0">If you did not request this, please ignore this email. Do not share this code with anyone.</p>
          </div>
          <div style="background:#f1f5f9;padding:14px 32px;text-align:center">
            <p style="margin:0;font-size:11px;color:#94a3b8">New Balaji Transport • Admin Security System</p>
          </div>
        </div>
      `,
      text: `Your NBT Admin PIN Reset OTP is: ${otp}\nThis code is valid for 5 minutes.\nIf you did not request this, ignore this email.`,
    }).then(() => {
      req.log.info(`[Email OTP] Successfully delivered to ${cleanEmail.replace(/(.{2}).*@/, '$1***@')}`);
    }).catch((emailErr: any) => {
      req.log.error({ err: emailErr }, '[Email OTP] Async email delivery failed');
    });

    req.log.info(`[Email OTP] Initiated delivery to ${cleanEmail.replace(/(.{2}).*@/, '$1***@')} | Purpose: ${purpose || 'admin_pin_reset'}`);

    return reply.code(200).send({
      success: true,
      message: `Verification code sent to ${cleanEmail.replace(/(.{3}).*@(.{2}).*?(\..+)$/, '$1***@$2***$3')}`,
    });
  });

  // ── POST /api/auth/admin/logout — server-side token revocation ────────────
  app.post(
    '/admin/logout',
    { preHandler: [app.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const rawToken = req.headers.authorization?.replace('Bearer ', '');
      if (rawToken) {
        try {
          const decoded = app.jwt.decode<{ jti?: string; exp?: number }>(rawToken);
          if (decoded?.jti) {
            const expiresAt = decoded.exp
              ? new Date(decoded.exp * 1000).toISOString()
              : new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
            await sql`
              INSERT INTO revoked_tokens (token_jti, expires_at)
              VALUES (${rawToken}, ${expiresAt})
              ON CONFLICT (token_jti) DO NOTHING
            `;
          }
        } catch {}
      }
      return reply.code(200).send({ message: 'Admin logged out successfully.' });
    }
  );
}
