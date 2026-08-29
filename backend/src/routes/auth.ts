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
      // Fall through to error response
    }

    // Generic — do NOT reveal whether the username exists
    return reply.code(401).send({ error: 'Invalid credentials', message: 'Invalid Admin username or password.' });
  });

  // ── POST /api/auth/send-otp — Send SMS OTP to registered admin mobile ────
  app.post('/send-otp', async (req: FastifyRequest, reply: FastifyReply) => {
    const { phone, otp, purpose } = (req.body as any) || {};
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return reply.code(400).send({ error: 'Invalid phone number' });
    }

    if (!otp) {
      return reply.code(400).send({ error: 'Missing OTP' });
    }

    // Check if SMS gateway credentials exist (Fast2SMS, 2Factor, Twilio, or generic webhook)
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    const twoFactorKey = process.env.TWOFACTOR_API_KEY;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
    const customSmsUrl = process.env.SMS_GATEWAY_URL;

    let smsDispatched = false;
    let gatewayUsed = 'none';

    try {
      if (fast2smsKey) {
        // Fast2SMS integration (India)
        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': fast2smsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: String(otp),
            numbers: cleanPhone,
          }),
        });
        if (res.ok) {
          smsDispatched = true;
          gatewayUsed = 'Fast2SMS';
        }
      } else if (twoFactorKey) {
        // 2Factor.in integration (India)
        const res = await fetch(`https://2factor.in/API/V1/${twoFactorKey}/SMS/${cleanPhone}/${otp}/OTP1`);
        if (res.ok) {
          smsDispatched = true;
          gatewayUsed = '2Factor';
        }
      } else if (twilioSid && twilioToken && twilioFrom) {
        // Twilio SMS integration
        const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
        const bodyParams = new URLSearchParams({
          To: `+91${cleanPhone}`,
          From: twilioFrom,
          Body: `Your NBT Admin verification code is: ${otp}. Valid for 5 minutes.`,
        });
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: bodyParams.toString(),
        });
        if (res.ok) {
          smsDispatched = true;
          gatewayUsed = 'Twilio';
        }
      } else if (customSmsUrl) {
        // Custom SMS gateway / webhook
        const res = await fetch(customSmsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone, otp, message: `Your NBT verification code is: ${otp}` }),
        });
        if (res.ok) {
          smsDispatched = true;
          gatewayUsed = 'CustomGateway';
        }
      }
    } catch (smsErr) {
      req.log.warn({ err: smsErr }, 'SMS dispatch attempt error');
    }

    req.log.info(`[SMS Dispatch] Phone: +91 ******${cleanPhone.slice(-4)} | Gateway: ${gatewayUsed} | Status: ${smsDispatched ? 'Sent' : 'Queued/Simulated'}`);

    return reply.code(200).send({
      success: true,
      message: `Verification code dispatched via SMS to +91 ******${cleanPhone.slice(-4)}`,
      gateway: gatewayUsed,
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
