import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import argon2 from 'argon2';
import { sql } from '../db/client';
import { LoginSchema } from '../middleware/validate';

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
      // Fall through to dev fallback
    }

    // Default dev credentials fallback (for 'admin' / '9999')
    if (username === 'admin' && pin === '9999') {
      const jti = `adm-dev-${Date.now()}`;
      const token = app.jwt.sign(
        { jti, adminId: 'ADM-001', username: 'admin', role: 'admin' },
        { expiresIn: '24h' }
      );
      return reply.code(200).send({ token, username: 'admin', name: 'Administrator', role: 'admin' });
    }

    // Generic — do NOT reveal whether the username exists
    return reply.code(401).send({ error: 'Invalid credentials', message: 'Invalid Admin username or password.' });
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
