import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sql } from '../db/client';
import {
  StartTripSchema,
  GpsSchema,
  ExpenseSchema,
  PodSchema,
  CompleteTripSchema,
} from '../middleware/validate';

type JWTUser = { driverId: string; tripId: string; trackingId: string; role: string };

// ── Helper: build the trip response shape the driver app expects ─────────────
async function buildTripResponse(tripId: string) {
  const rows = await sql`
    SELECT
      t.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id',          e.id,
            'category',    e.category,
            'amount',      e.amount,
            'reason',      e.reason,
            'liters',      e.liters,
            'receiptUri',  e.receipt_url,
            'timestamp',   e.recorded_at,
            'location',    CASE WHEN e.latitude IS NOT NULL THEN
                             json_build_object(
                               'latitude',  e.latitude,
                               'longitude', e.longitude,
                               'city',      e.city,
                               'address',   e.address
                             )
                           ELSE NULL END
          ) ORDER BY e.recorded_at
        ) FILTER (WHERE e.id IS NOT NULL),
        '[]'
      ) AS expenses,
      (
        SELECT json_build_object(
          'latitude',    g.latitude,
          'longitude',   g.longitude,
          'city',        g.city,
          'address',     g.address,
          'lastUpdated', g.recorded_at
        )
        FROM gps_updates g
        WHERE g.trip_id = t.id
        ORDER BY g.recorded_at DESC
        LIMIT 1
      ) AS current_gps,
      (
        SELECT json_build_object(
          'vehicleId',           mv.vehicle_id,
          'vehicleNumber',       mv.vehicle_number,
          'vehicleType',         mv.vehicle_type,
          'vehicleMake',         mv.vehicle_make,
          'vehicleModel',        mv.vehicle_model,
          'ownerName',           mv.owner_name,
          'ownerPhone',          mv.owner_phone,
          'rcNumber',            mv.rc_number,
          'rcFrontUrl',          mv.rc_front_url,
          'rcBackUrl',           mv.rc_back_url,
          'insuranceUrl',        mv.insurance_url,
          'insuranceExpiryDate', mv.insurance_expiry_date,
          'pollutionUrl',        mv.pollution_url,
          'pollutionExpiryDate', mv.pollution_expiry_date,
          'permitUrl',           mv.permit_url,
          'permitExpiryDate',    mv.permit_expiry_date,
          'fcUrl',               mv.fc_url,
          'fcExpiryDate',        mv.fc_expiry_date
        )
        FROM managed_vehicles mv
        WHERE mv.vehicle_number = t.vehicle_number
        LIMIT 1
      ) AS vehicle_details,
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'docId',        vd.doc_id,
              'docType',      vd.doc_type,
              'docLabel',     vd.doc_label,
              'docNumber',    vd.doc_number,
              'issueDate',    vd.issue_date,
              'expiryDate',   vd.expiry_date,
              'fileUri',      vd.file_uri,
              'fileName',     vd.file_name,
              'fileType',     vd.file_type,
              'uploadedAt',   vd.uploaded_at,
              'isActive',     vd.is_active
            ) ORDER BY vd.uploaded_at DESC
          ),
          '[]'
        )
        FROM vehicle_documents vd
        JOIN managed_vehicles mv ON mv.vehicle_id = vd.vehicle_id
        WHERE mv.vehicle_number = t.vehicle_number AND vd.is_active = true
      ) AS vehicle_documents
    FROM trips t
    LEFT JOIN expenses e ON e.trip_id = t.id
    WHERE t.id = ${tripId}
    GROUP BY t.id
  `;
  return rows[0] ?? null;
}

export async function tripRoutes(app: FastifyInstance) {
  const authHook = { preHandler: [app.authenticate] };

  // ── GET /api/trips — fetch driver's own trips ─────────────────────────────
  app.get('/', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user as JWTUser;
    const rows = await sql`
      SELECT
        t.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id',          e.id,
              'category',    e.category,
              'amount',      e.amount,
              'reason',      e.reason,
              'liters',      e.liters,
              'receiptUri',  e.receipt_url,
              'timestamp',   e.recorded_at,
              'location',    CASE WHEN e.latitude IS NOT NULL THEN
                               json_build_object(
                                 'latitude',  e.latitude,
                                 'longitude', e.longitude,
                                 'city',      e.city,
                                 'address',   e.address
                               )
                             ELSE NULL END
            ) ORDER BY e.recorded_at
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'
        ) AS expenses,
        (
          SELECT json_build_object(
            'latitude',    g.latitude,
            'longitude',   g.longitude,
            'city',        g.city,
            'address',     g.address,
            'lastUpdated', g.recorded_at
          )
          FROM gps_updates g
          WHERE g.trip_id = t.id
          ORDER BY g.recorded_at DESC
          LIMIT 1
        ) AS current_gps,
        (
          SELECT json_build_object(
            'vehicleId',           mv.vehicle_id,
            'vehicleNumber',       mv.vehicle_number,
            'vehicleType',         mv.vehicle_type,
            'vehicleMake',         mv.vehicle_make,
            'vehicleModel',        mv.vehicle_model,
            'ownerName',           mv.owner_name,
            'ownerPhone',          mv.owner_phone,
            'rcNumber',            mv.rc_number,
            'rcFrontUrl',          mv.rc_front_url,
            'rcBackUrl',           mv.rc_back_url,
            'insuranceUrl',        mv.insurance_url,
            'insuranceExpiryDate', mv.insurance_expiry_date,
            'pollutionUrl',        mv.pollution_url,
            'pollutionExpiryDate', mv.pollution_expiry_date,
            'permitUrl',           mv.permit_url,
            'permitExpiryDate',    mv.permit_expiry_date,
            'fcUrl',               mv.fc_url,
            'fcExpiryDate',        mv.fc_expiry_date
          )
          FROM managed_vehicles mv
          WHERE mv.vehicle_number = t.vehicle_number
          LIMIT 1
        ) AS vehicle_details,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'docId',        vd.doc_id,
                'docType',      vd.doc_type,
                'docLabel',     vd.doc_label,
                'docNumber',    vd.doc_number,
                'issueDate',    vd.issue_date,
                'expiryDate',   vd.expiry_date,
                'fileUri',      vd.file_uri,
                'fileName',     vd.file_name,
                'fileType',     vd.file_type,
                'uploadedAt',   vd.uploaded_at,
                'isActive',     vd.is_active
              ) ORDER BY vd.uploaded_at DESC
            ),
            '[]'
          )
          FROM vehicle_documents vd
          JOIN managed_vehicles mv ON mv.vehicle_id = vd.vehicle_id
          WHERE mv.vehicle_number = t.vehicle_number AND vd.is_active = true
        ) AS vehicle_documents
      FROM trips t
      LEFT JOIN expenses e ON e.trip_id = t.id
      WHERE t.driver_id = ${user.driverId}
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    return reply.code(200).send(rows);
  });

  // ── PATCH /api/trips/:id/start ────────────────────────────────────────────
  app.patch('/:id/start', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const user = req.user as JWTUser;
    const check = await sql`SELECT id FROM trips WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId}) LIMIT 1`;
    if (check.length === 0) {
      return reply.code(403).send({ error: 'Access denied.' });
    }

    const parsed = StartTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { driverName, odometer, odometerPhotoUrl, dieselLevel, gps } = parsed.data;

    await sql`
      UPDATE trips
      SET
        driver_name        = ${driverName},
        odometer_start     = ${odometer},
        odometer_start_url = COALESCE(${odometerPhotoUrl ?? null}, odometer_start_url),
        diesel_start       = ${dieselLevel},
        status             = 'STARTED',
        start_date         = now()
      WHERE id = ${id}
        AND (driver_id = ${user.driverId} OR id = ${user.tripId})
    `;

    await sql`
      INSERT INTO gps_updates (trip_id, latitude, longitude, city, address)
      VALUES (${id}, ${gps.latitude}, ${gps.longitude}, ${gps.city}, ${gps.address})
    `;

    const trip = await buildTripResponse(id);
    return reply.code(200).send(trip);
  });

  // ── PATCH /api/trips/:id/photo ────────────────────────────────────────────
  // Called after async image upload succeeds to update just the photo URL
  app.patch('/:id/photo', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const user = req.user as JWTUser;
    const { photoUrl, photoField } = req.body as { photoUrl: string; photoField?: string };

    if (!photoUrl || typeof photoUrl !== 'string') {
      return reply.code(400).send({ error: 'photoUrl is required' });
    }

    const check = await sql`SELECT id FROM trips WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId}) LIMIT 1`;
    if (check.length === 0) {
      return reply.code(403).send({ error: 'Access denied.' });
    }

    const field = photoField || 'odometer_start_url';
    const allowedFields = ['odometer_start_url', 'odometer_end_url', 'pod_photo_url'];
    if (!allowedFields.includes(field)) {
      return reply.code(400).send({ error: 'Invalid photoField' });
    }

    if (field === 'odometer_start_url') {
      await sql`UPDATE trips SET odometer_start_url = ${photoUrl} WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId})`;
    } else if (field === 'odometer_end_url') {
      await sql`UPDATE trips SET odometer_end_url = ${photoUrl} WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId})`;
    } else if (field === 'pod_photo_url') {
      await sql`UPDATE trips SET pod_photo_url = ${photoUrl} WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId})`;
    }

    return reply.code(200).send({ success: true, photoUrl });
  });

  // ── POST /api/trips/:id/gps ───────────────────────────────────────────────
  app.post('/:id/gps', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const user = req.user as JWTUser;
    const check = await sql`SELECT id FROM trips WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId}) LIMIT 1`;
    if (check.length === 0) {
      return reply.code(403).send({ error: 'Access denied.' });
    }

    const parsed = GpsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { latitude, longitude, city, address } = parsed.data;

    await sql`
      INSERT INTO gps_updates (trip_id, latitude, longitude, city, address)
      VALUES (${id}, ${latitude}, ${longitude}, ${city}, ${address})
    `;

    // If trip is still 'acknowledged' advance it to 'STARTED'
    await sql`
      UPDATE trips SET status = 'STARTED'
      WHERE id = ${id}
        AND driver_id = ${user.driverId}
        AND status = 'acknowledged'
    `;

    return reply.code(200).send({ ok: true, latitude, longitude });
  });

  // ── POST /api/trips/:id/expenses ──────────────────────────────────────────
  app.post('/:id/expenses', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const user = req.user as JWTUser;
    const check = await sql`SELECT id FROM trips WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId}) LIMIT 1`;
    if (check.length === 0) {
      return reply.code(403).send({ error: 'Access denied.' });
    }

    const parsed = ExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { category, amount, reason, liters, receiptUrl, location } = parsed.data;
    const expenseId = `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await sql`
      INSERT INTO expenses (id, trip_id, category, amount, reason, liters, receipt_url, latitude, longitude, city, address)
      VALUES (
        ${expenseId}, 
        ${id}, 
        ${category}, 
        ${amount}, 
        ${reason ?? null}, 
        ${liters ?? null}, 
        ${receiptUrl ?? null},
        ${location?.latitude ?? null},
        ${location?.longitude ?? null},
        ${location?.city ?? null},
        ${location?.address ?? null}
      )
    `;

    if (location) {
      await sql`
        INSERT INTO gps_updates (trip_id, latitude, longitude, city, address)
        VALUES (${id}, ${location.latitude}, ${location.longitude}, ${location.city}, ${location.address})
      `;
    }

    return reply.code(201).send({ id: expenseId, category, amount });
  });

  // ── POST /api/trips/:id/pod ───────────────────────────────────────────────
  app.post('/:id/pod', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = req.params as { id: string };
      const user = req.user as JWTUser;

      const check = await sql`
        SELECT id FROM trips
        WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId})
        LIMIT 1
      `;
      if (check.length === 0) {
        return reply.code(403).send({ error: 'Access denied.' });
      }

      const parsed = PodSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.errors });
      }

      const { podPhotoUrl, podSignature, podNotes, gps } = parsed.data;

      const finalPhotoUrl = podPhotoUrl && podPhotoUrl.trim() ? podPhotoUrl.trim() : null;
      const finalSignature = podSignature && podSignature.trim() ? podSignature.trim() : null;
      const finalNotes = podNotes && podNotes.trim() ? podNotes.trim() : null;

      await sql`
        UPDATE trips
        SET
          pod_photo_url = COALESCE(${finalPhotoUrl}, pod_photo_url),
          pod_signature = COALESCE(${finalSignature}, pod_signature),
          pod_notes     = COALESCE(${finalNotes}, pod_notes),
          status        = 'REACHED_DESTINATION'
        WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId})
      `;

      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        await sql`
          INSERT INTO gps_updates (trip_id, latitude, longitude, city, address)
          VALUES (${id}, ${gps.latitude}, ${gps.longitude}, ${gps.city || 'Destination'}, ${gps.address || 'Destination'})
        `;
      }

      const trip = await buildTripResponse(id);
      return reply.code(200).send(trip);
    } catch (err: any) {
      console.error('[Backend API Error] POST /api/trips/:id/pod failed:', err);
      return reply.code(500).send({ error: 'Internal Server Error', message: err?.message || String(err) });
    }
  });

  // ── PATCH /api/trips/:id/arrived ─────────────────────────────────────────
  app.patch('/:id/arrived', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = req.params as { id: string };
      const user = req.user as JWTUser;

      const check = await sql`
        SELECT id FROM trips
        WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId})
        LIMIT 1
      `;
      if (check.length === 0) {
        return reply.code(403).send({ error: 'Access denied.' });
      }

      await sql`
        UPDATE trips
        SET status = 'REACHED_DESTINATION'
        WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId})
      `;

      const trip = await buildTripResponse(id);
      return reply.code(200).send(trip);
    } catch (err: any) {
      console.error('[Backend API Error] PATCH /api/trips/:id/arrived failed:', err);
      return reply.code(500).send({ error: 'Internal Server Error', message: err?.message || String(err) });
    }
  });

  // ── PATCH /api/trips/:id/complete ─────────────────────────────────────────
  app.patch('/:id/complete', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = req.params as { id: string };
      const user = req.user as JWTUser;

      const check = await sql`
        SELECT id FROM trips
        WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId})
        LIMIT 1
      `;
      if (check.length === 0) {
        return reply.code(403).send({ error: 'Access denied.' });
      }

      const parsed = CompleteTripSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parsed.error.errors });
      }

      const { odometerEnd, odometerEndPhotoUrl, dieselEnd } = parsed.data;

      await sql`
        UPDATE trips
        SET
          odometer_end     = ${odometerEnd},
          odometer_end_url = ${odometerEndPhotoUrl ?? null},
          diesel_end       = ${dieselEnd},
          status           = 'COMPLETED',
          end_date         = now()
        WHERE id = ${id} AND (driver_id = ${user.driverId} OR id = ${user.tripId})
      `;

      const trip = await buildTripResponse(id);
      return reply.code(200).send(trip);
    } catch (err: any) {
      console.error('[Backend API Error] PATCH /api/trips/:id/complete failed:', err);
      return reply.code(500).send({ error: 'Internal Server Error', message: err?.message || String(err) });
    }
  });

  // ── POST /api/trips/sync — bulk reconcile offline queue ───────────────────
  app.post('/sync', authHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user as JWTUser;
    const { actions } = req.body as { actions: Array<{ id: string; type: string; payload: Record<string, unknown>; timestamp: string }> };

    if (!Array.isArray(actions)) {
      return reply.code(400).send({ error: 'actions array required.' });
    }

    const results: Array<{ id: string; status: 'ok' | 'error'; reason?: string }> = [];

    for (const action of actions) {
      try {
        // Audit log every sync action
        await sql`
          INSERT INTO sync_log (trip_id, action_type, payload, driver_id)
          VALUES (${user.tripId}, ${action.type}, ${JSON.stringify(action.payload)}, ${user.driverId})
        `;

        // Replay action
        switch (action.type) {
          case 'UPDATE_GPS': {
            const p = action.payload as { gps: { latitude: number; longitude: number; city: string; address: string } };
            await sql`
              INSERT INTO gps_updates (trip_id, latitude, longitude, city, address)
              VALUES (${user.tripId}, ${p.gps.latitude}, ${p.gps.longitude}, ${p.gps.city}, ${p.gps.address})
            `;
            break;
          }
          case 'ADD_EXPENSE': {
            const p = action.payload as { expense: { 
              id: string; 
              category: string; 
              amount: number; 
              reason?: string; 
              liters?: number; 
              receiptUri?: string;
              location?: { latitude: number; longitude: number; city: string; address: string }
            } };
            await sql`
              INSERT INTO expenses (id, trip_id, category, amount, reason, liters, receipt_url, latitude, longitude, city, address)
              VALUES (
                ${p.expense.id}, 
                ${user.tripId}, 
                ${p.expense.category}, 
                ${p.expense.amount},
                ${p.expense.reason ?? null}, 
                ${p.expense.liters ?? null}, 
                ${p.expense.receiptUri ?? null},
                ${p.expense.location?.latitude ?? null},
                ${p.expense.location?.longitude ?? null},
                ${p.expense.location?.city ?? null},
                ${p.expense.location?.address ?? null}
              )
              ON CONFLICT (id) DO NOTHING
            `;
            break;
          }
          case 'COMPLETE_TRIP': {
            const p = action.payload as { odometerEnd: number; dieselEnd: string };
            await sql`
              UPDATE trips SET odometer_end=${p.odometerEnd}, diesel_end=${p.dieselEnd}, status='COMPLETED', end_date=now()
              WHERE id=${user.tripId} AND driver_id=${user.driverId}
            `;
            break;
          }
          default:
            break;
        }
        results.push({ id: action.id, status: 'ok' });
      } catch (err) {
        results.push({ id: action.id, status: 'error', reason: String(err) });
      }
    }

    return reply.code(200).send({ synced: results.filter(r => r.status === 'ok').length, results });
  });
}
