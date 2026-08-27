import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import argon2 from 'argon2';
import { sql } from '../db/client';
import { CreateTripSchema } from '../middleware/validate';

function parseToIsoString(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return null;
  const str = value.trim();
  if (!str) return undefined;

  let d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d.toISOString();

  // Try DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmYMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
  if (dmYMatch) {
    const [, day, month, year] = dmYMatch;
    d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  // Try YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
  const yMdMatch = str.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
  if (yMdMatch) {
    const [, year, month, day] = yMdMatch;
    d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

function optionalTimestamp(value: unknown): string | null | undefined {
  return parseToIsoString(value);
}

/**
 * Admin routes — all require admin JWT role.
 */
export async function adminRoutes(app: FastifyInstance) {
  const adminHook = { preHandler: [app.authenticate, app.requireAdmin] };

  // GET /api/admin/trips — all trips with latest GPS and expenses
  app.get('/trips', adminHook, async (_req: FastifyRequest, reply: FastifyReply) => {
    const rows = await sql`
      SELECT
        t.id,
        t.driver_id,
        t.tracking_id,
        t.driver_name,
        t.driver_pin,
        t.vehicle_number,
        t.vehicle_type,
        t.starting_point,
        t.destination,
        t.status,
        t.agreed_freight,
        t.distance_km,
        t.estimated_travel_time,
        t.tolls_count,
        t.estimated_toll_cost,
        t.odometer_start,
        t.odometer_end,
        t.odometer_start_url,
        t.odometer_end_url,
        t.diesel_start,
        t.diesel_end,
        t.start_date,
        t.end_date,
        t.pod_photo_url,
        t.pod_signature,
        t.pod_notes,
        t.driver_payment,
        t.profit_or_loss,
        t.is_pinned,
        t.created_at,
        t.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id',          e.id,
              'category',    e.category,
              'amount',      e.amount,
              'reason',      e.reason,
              'liters',      e.liters,
              'receiptUri',  e.receipt_url,
              'receiptUris', COALESCE(e.receipt_urls, '[]'::jsonb),
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
        ) AS current_gps
      FROM trips t
      LEFT JOIN expenses e ON e.trip_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    return reply.code(200).send(rows);
  });

  // GET /api/admin/trips/:id
  app.get('/trips/:id', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const rows = await sql`
      SELECT t.*,
        COALESCE(json_agg(
          json_build_object(
            'id',          e.id,
            'category',    e.category,
            'amount',      e.amount,
            'reason',      e.reason,
            'liters',      e.liters,
            'receiptUri',  e.receipt_url,
            'receiptUris', COALESCE(e.receipt_urls, '[]'::jsonb),
            'timestamp',   e.recorded_at,
            'location',    CASE WHEN e.latitude IS NOT NULL THEN
                             json_build_object(
                               'latitude',  e.latitude,
                               'longitude', e.longitude,
                               'city',      e.city,
                               'address',   e.address
                             )
                           ELSE NULL END
          )
          ORDER BY e.recorded_at
        ) FILTER (WHERE e.id IS NOT NULL), '[]') AS expenses
      FROM trips t
      LEFT JOIN expenses e ON e.trip_id = t.id
      WHERE t.id = ${id}
      GROUP BY t.id
    `;
    if (!rows.length) return reply.code(404).send({ error: 'Trip not found.' });
    return reply.code(200).send(rows[0]);
  });

  // POST /api/admin/trips — create new trip
  app.post('/trips', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    const trip = parsed.data;

    // Upsert driver record
    const pinHash = await argon2.hash(trip.driverPin ?? '1234', { type: argon2.argon2id });
    await sql`
      INSERT INTO drivers (id, name, pin_hash)
      VALUES (${trip.driverId}, ${trip.driverName}, ${pinHash})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `;

    await sql`
      INSERT INTO trips (
        id, driver_id, tracking_id, driver_name, driver_pin,
        vehicle_number, vehicle_type,
        starting_point, destination,
        tolls_count, estimated_toll_cost, agreed_freight, status
      )
      VALUES (
        ${trip.id}, ${trip.driverId}, ${trip.trackingId}, ${trip.driverName}, ${trip.driverPin ?? '1234'},
        ${trip.vehicleNumber}, ${trip.vehicleType},
        ${trip.startingPoint}, ${trip.destination},
        ${trip.tollsCount}, ${trip.estimatedTollCost}, ${trip.agreedFreight ?? 0}, 'ASSIGNED'
      )
    `;

    return reply.code(201).send({ id: trip.id, trackingId: trip.trackingId });
  });

  // PATCH /api/admin/trips/:id — update status or fields
  app.patch('/trips/:id', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;

    if (body.status !== undefined) {
      await sql`UPDATE trips SET status = ${String(body.status)}, updated_at = now() WHERE id = ${id}`;
    }
    if (body.driver_name !== undefined) {
      await sql`UPDATE trips SET driver_name = ${String(body.driver_name)}, updated_at = now() WHERE id = ${id}`;
    }
    if (body.vehicle_number !== undefined) {
      await sql`UPDATE trips SET vehicle_number = ${String(body.vehicle_number)}, updated_at = now() WHERE id = ${id}`;
    }
    if (body.starting_point !== undefined) {
      await sql`UPDATE trips SET starting_point = ${String(body.starting_point)}, updated_at = now() WHERE id = ${id}`;
    }
    if (body.destination !== undefined) {
      await sql`UPDATE trips SET destination = ${String(body.destination)}, updated_at = now() WHERE id = ${id}`;
    }
    if (body.agreed_freight !== undefined) {
      await sql`UPDATE trips SET agreed_freight = ${Number(body.agreed_freight)}, updated_at = now() WHERE id = ${id}`;
    }
    if (body.driver_pin !== undefined) {
      await sql`UPDATE trips SET driver_pin = ${String(body.driver_pin)}, updated_at = now() WHERE id = ${id}`;
    }
    if (body.odometer_start !== undefined) {
      await sql`UPDATE trips SET odometer_start = ${body.odometer_start === null ? null : Number(body.odometer_start)}, updated_at = now() WHERE id = ${id}`;
    }
    if (body.odometer_end !== undefined) {
      await sql`UPDATE trips SET odometer_end = ${body.odometer_end === null ? null : Number(body.odometer_end)}, updated_at = now() WHERE id = ${id}`;
    }

    return reply.code(200).send({ updated: true });
  });

  // PATCH /api/admin/trips/:id/pin — toggle trip pinned status
  app.patch('/trips/:id/pin', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { isPinned } = req.body as { isPinned: boolean };
    await sql`UPDATE trips SET is_pinned = ${Boolean(isPinned)}, updated_at = now() WHERE id = ${id}`;
    return reply.code(200).send({ success: true, isPinned: Boolean(isPinned) });
  });

  // DELETE /api/admin/trips/:id — delete trip permanently
  app.delete('/trips/:id', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    await sql`DELETE FROM trips WHERE id = ${id}`;
    return reply.code(200).send({ deleted: true, id });
  });

  // PATCH /api/admin/trips/:id/payment — persist driver payment & profit/loss to Neon DB
  app.patch('/trips/:id/payment', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { driverPayment } = req.body as { driverPayment: number };

    if (typeof driverPayment !== 'number' || driverPayment < 0) {
      return reply.code(400).send({ error: 'Invalid driverPayment value.' });
    }

    // Fetch agreed_freight so we can compute profit/loss server-side
    const rows = await sql`SELECT agreed_freight FROM trips WHERE id = ${id}`;
    if (!rows.length) return reply.code(404).send({ error: 'Trip not found.' });

    const agreedFreight = Number(rows[0].agreed_freight || 0);

    // Fetch total expenses for this trip
    const expenseRows = await sql`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE trip_id = ${id}`;
    const totalExpenses = Number(expenseRows[0].total || 0);

    // Profit/Loss = Agreed Freight - Driver Payment - Total Expenses
    const profitOrLoss = agreedFreight - driverPayment - totalExpenses;

    await sql`
      UPDATE trips
      SET driver_payment  = ${driverPayment},
          profit_or_loss  = ${profitOrLoss},
          updated_at      = now()
      WHERE id = ${id}
    `;

    app.log.info(`[Admin] Payment updated for trip ${id}: payment=${driverPayment}, P&L=${profitOrLoss}`);

    return reply.code(200).send({ updated: true, driverPayment, profitOrLoss });
  });

  // GET /api/admin/gps/:tripId — full GPS history for a trip
  app.get('/gps/:tripId', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { tripId } = req.params as { tripId: string };
    const rows = await sql`
      SELECT latitude, longitude, city, address, recorded_at
      FROM gps_updates
      WHERE trip_id = ${tripId}
      ORDER BY recorded_at ASC
    `;
    return reply.code(200).send(rows);
  });

  // ── Managed Vehicles Routes ───────────────────────────────────────────────
  app.get('/vehicles', adminHook, async (_req: FastifyRequest, reply: FastifyReply) => {
    const rows = await sql`SELECT * FROM managed_vehicles ORDER BY created_at DESC`;
    return reply.code(200).send(rows);
  });

  app.post('/vehicles', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const v = req.body as Record<string, any>;
    const vehicleId = v.vehicle_id || v.id || `VEH-${Date.now()}`;
    const insuranceExpiry = parseToIsoString(v.insuranceExpiryDate) ?? null;
    const pollutionExpiry = parseToIsoString(v.pollutionExpiryDate) ?? null;
    const permitExpiry = parseToIsoString(v.permitExpiryDate) ?? null;
    const fcExpiry = parseToIsoString(v.fcExpiryDate) ?? null;

    await sql`
      INSERT INTO managed_vehicles (
        vehicle_id, vehicle_number, vehicle_type, wheel_type, vehicle_make, vehicle_model,
        owner_name, owner_phone, rc_number, engine_number, chassis_number, year_of_manufacture, status,
        insurance_expiry_date, pollution_expiry_date, permit_expiry_date, fc_expiry_date,
        insurance_url, pollution_url, permit_url, fc_url, rc_front_url, rc_back_url
      )
      VALUES (
        ${vehicleId}, ${v.vehicleNumber}, ${v.vehicleType || '12 Wheel'}, ${v.wheelType || '12 Wheel'},
        ${v.vehicleMake || ''}, ${v.vehicleModel || ''}, ${v.ownerName || ''}, ${v.ownerPhone || ''},
        ${v.rcNumber || ''}, ${v.engineNumber || ''}, ${v.chassisNumber || ''}, ${v.yearOfManufacture || ''},
        ${v.status || 'AVAILABLE'},
        ${insuranceExpiry}, ${pollutionExpiry}, ${permitExpiry}, ${fcExpiry},
        ${v.insuranceUrl || null}, ${v.pollutionUrl || null}, ${v.permitUrl || null}, ${v.fcUrl || null},
        ${v.rcFrontUrl || null}, ${v.rcBackUrl || null}
      )
      ON CONFLICT (vehicle_id) DO UPDATE SET
        vehicle_number        = EXCLUDED.vehicle_number,
        vehicle_type          = EXCLUDED.vehicle_type,
        wheel_type            = EXCLUDED.wheel_type,
        vehicle_make          = EXCLUDED.vehicle_make,
        vehicle_model         = EXCLUDED.vehicle_model,
        owner_name            = EXCLUDED.owner_name,
        owner_phone           = EXCLUDED.owner_phone,
        rc_number             = EXCLUDED.rc_number,
        chassis_number        = EXCLUDED.chassis_number,
        year_of_manufacture   = EXCLUDED.year_of_manufacture,
        status                = EXCLUDED.status,
        insurance_expiry_date = COALESCE(EXCLUDED.insurance_expiry_date, managed_vehicles.insurance_expiry_date),
        pollution_expiry_date = COALESCE(EXCLUDED.pollution_expiry_date, managed_vehicles.pollution_expiry_date),
        permit_expiry_date    = COALESCE(EXCLUDED.permit_expiry_date, managed_vehicles.permit_expiry_date),
        fc_expiry_date        = COALESCE(EXCLUDED.fc_expiry_date, managed_vehicles.fc_expiry_date),
        insurance_url         = COALESCE(EXCLUDED.insurance_url, managed_vehicles.insurance_url),
        pollution_url         = COALESCE(EXCLUDED.pollution_url, managed_vehicles.pollution_url),
        permit_url            = COALESCE(EXCLUDED.permit_url, managed_vehicles.permit_url),
        fc_url                = COALESCE(EXCLUDED.fc_url, managed_vehicles.fc_url),
        rc_front_url          = COALESCE(EXCLUDED.rc_front_url, managed_vehicles.rc_front_url),
        rc_back_url           = COALESCE(EXCLUDED.rc_back_url, managed_vehicles.rc_back_url),
        updated_at            = now()
    `;

    return reply.code(201).send({ vehicleId, vehicle_id: vehicleId });
  });

  app.patch('/vehicles/:vehicleId', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { vehicleId } = req.params as { vehicleId: string };
    const body = req.body as Record<string, any>;

    if (body.status !== undefined) {
      await sql`UPDATE managed_vehicles SET status = ${body.status}, updated_at = now() WHERE vehicle_id = ${vehicleId}`;
    }
    if (body.insuranceExpiryDate !== undefined) {
      const dateVal = parseToIsoString(body.insuranceExpiryDate) ?? null;
      await sql`UPDATE managed_vehicles SET insurance_expiry_date = ${dateVal}, updated_at = now() WHERE vehicle_id = ${vehicleId}`;
    }
    if (body.pollutionExpiryDate !== undefined) {
      const dateVal = parseToIsoString(body.pollutionExpiryDate) ?? null;
      await sql`UPDATE managed_vehicles SET pollution_expiry_date = ${dateVal}, updated_at = now() WHERE vehicle_id = ${vehicleId}`;
    }
    if (body.permitExpiryDate !== undefined) {
      const dateVal = parseToIsoString(body.permitExpiryDate) ?? null;
      await sql`UPDATE managed_vehicles SET permit_expiry_date = ${dateVal}, updated_at = now() WHERE vehicle_id = ${vehicleId}`;
    }
    if (body.fcExpiryDate !== undefined) {
      const dateVal = parseToIsoString(body.fcExpiryDate) ?? null;
      await sql`UPDATE managed_vehicles SET fc_expiry_date = ${dateVal}, updated_at = now() WHERE vehicle_id = ${vehicleId}`;
    }
    if (body.insuranceUrl !== undefined) {
      await sql`UPDATE managed_vehicles SET insurance_url = ${body.insuranceUrl || null}, updated_at = now() WHERE vehicle_id = ${vehicleId}`;
    }
    if (body.pollutionUrl !== undefined) {
      await sql`UPDATE managed_vehicles SET pollution_url = ${body.pollutionUrl || null}, updated_at = now() WHERE vehicle_id = ${vehicleId}`;
    }
    if (body.permitUrl !== undefined) {
      await sql`UPDATE managed_vehicles SET permit_url = ${body.permitUrl || null}, updated_at = now() WHERE vehicle_id = ${vehicleId}`;
    }
    if (body.fcUrl !== undefined) {
      await sql`UPDATE managed_vehicles SET fc_url = ${body.fcUrl || null}, updated_at = now() WHERE vehicle_id = ${vehicleId}`;
    }
    if (body.rcFrontUrl !== undefined) {
      await sql`UPDATE managed_vehicles SET rc_front_url = ${body.rcFrontUrl || null}, updated_at = now() WHERE vehicle_id = ${vehicleId}`;
    }
    if (body.rcBackUrl !== undefined) {
      await sql`UPDATE managed_vehicles SET rc_back_url = ${body.rcBackUrl || null}, updated_at = now() WHERE vehicle_id = ${vehicleId}`;
    }

    return reply.code(200).send({ success: true });
  });

  app.delete('/vehicles/:vehicleId', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { vehicleId } = req.params as { vehicleId: string };
    await sql`DELETE FROM managed_vehicles WHERE vehicle_id = ${vehicleId}`;
    return reply.code(200).send({ deleted: true });
  });

  // ── Vehicle Documents Routes ──────────────────────────────────────────────
  app.get('/vehicle-documents/all', adminHook, async (_req: FastifyRequest, reply: FastifyReply) => {
    const rows = await sql`SELECT * FROM vehicle_documents WHERE is_active = true ORDER BY uploaded_at DESC`;
    return reply.code(200).send(rows);
  });

  app.get('/vehicles/:vehicleId/documents', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { vehicleId } = req.params as { vehicleId: string };
    const rows = await sql`SELECT * FROM vehicle_documents WHERE vehicle_id = ${vehicleId} ORDER BY uploaded_at DESC`;
    return reply.code(200).send(rows);
  });

  app.post('/vehicles/:vehicleId/documents', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { vehicleId } = req.params as { vehicleId: string };
    const doc = req.body as Record<string, any>;
    const docId = doc.doc_id || `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const issueDate = parseToIsoString(doc.issueDate) ?? null;
    const expiryDate = parseToIsoString(doc.expiryDate) ?? null;

    await sql`
      INSERT INTO vehicle_documents (
        doc_id, vehicle_id, doc_type, doc_label, doc_number,
        issue_date, expiry_date, file_uri, file_name, file_type, uploaded_by, is_active
      )
      VALUES (
        ${docId}, ${vehicleId}, ${doc.docType || 'OTHER'}, ${doc.docLabel || 'Document'}, ${doc.docNumber || ''},
        ${issueDate}, ${expiryDate}, ${doc.fileUri || ''}, ${doc.fileName || ''},
        ${doc.fileType || ''}, ${doc.uploadedBy || 'admin'}, true
      )
    `;

    return reply.code(201).send({ doc_id: docId, success: true });
  });

  app.patch('/vehicles/:vehicleId/documents/:docId', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { vehicleId, docId } = req.params as { vehicleId: string; docId: string };
    const doc = req.body as Record<string, any>;
    const issueDate = optionalTimestamp(doc.issueDate);
    const expiryDate = optionalTimestamp(doc.expiryDate);

    if (issueDate === null || expiryDate === null) {
      return reply.code(400).send({ error: 'Invalid document date. Use YYYY-MM-DD.' });
    }

    await sql`
      UPDATE vehicle_documents SET
        doc_type    = COALESCE(${doc.docType}, doc_type),
        doc_label   = COALESCE(${doc.docLabel}, doc_label),
        doc_number  = COALESCE(${doc.docNumber}, doc_number),
        issue_date  = COALESCE(${issueDate}, issue_date),
        expiry_date = COALESCE(${expiryDate}, expiry_date),
        file_uri    = COALESCE(${doc.fileUri}, file_uri),
        file_name   = COALESCE(${doc.fileName}, file_name),
        file_type   = COALESCE(${doc.fileType}, file_type),
        is_active   = true
      WHERE vehicle_id = ${vehicleId} AND doc_id = ${docId}
    `;

    return reply.code(200).send({ success: true });
  });

  app.delete('/vehicles/:vehicleId/documents/:docId', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const { vehicleId, docId } = req.params as { vehicleId: string; docId: string };
    await sql`
      DELETE FROM vehicle_documents
      WHERE vehicle_id = ${vehicleId} AND doc_id = ${docId}
    `;
    return reply.code(200).send({ success: true });
  });

  // ── Fleet Vehicles (GPS Registry) Routes ──────────────────────────────────
  app.get('/fleet', adminHook, async (_req: FastifyRequest, reply: FastifyReply) => {
    const rows = await sql`SELECT * FROM fleet_vehicles ORDER BY created_at DESC`;
    return reply.code(200).send(rows);
  });

  app.post('/fleet', adminHook, async (req: FastifyRequest, reply: FastifyReply) => {
    const f = req.body as Record<string, any>;
    const id = f.id || `FV-${Date.now()}`;

    await sql`
      INSERT INTO fleet_vehicles (
        id, vehicle_number, vehicle_type, vehicle_make, vehicle_model, owner_name,
        gps_provider, gps_device_id, imei_number, gps_device_status
      )
      VALUES (
        ${id}, ${f.vehicleNumber}, ${f.vehicleType || ''}, ${f.vehicleMake || ''}, ${f.vehicleModel || ''},
        ${f.ownerName || ''}, ${f.gpsProvider || 'Jio GPS'}, ${f.gpsDeviceId || ''}, ${f.imeiNumber || ''},
        ${f.gpsDeviceStatus || 'Connected'}
      )
      ON CONFLICT (id) DO UPDATE SET
        gps_device_id     = EXCLUDED.gps_device_id,
        imei_number       = EXCLUDED.imei_number,
        gps_device_status = EXCLUDED.gps_device_status,
        updated_at        = now()
    `;

    return reply.code(201).send({ id });
  });

  // ── Activity Logs Routes ──────────────────────────────────────────────────
  app.get('/activity-logs', adminHook, async (_req: FastifyRequest, reply: FastifyReply) => {
    const rows = await sql`SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100`;
    return reply.code(200).send(rows);
  });

  // POST /api/admin/reset — wipe ALL dynamic data from the shared database
  app.post('/reset', adminHook, async (_req: FastifyRequest, reply: FastifyReply) => {
    const results: string[] = [];
    const del = async (label: string, query: () => Promise<any>) => {
      try { await query(); results.push(`✓ ${label}`); } catch { results.push(`- ${label} (skipped)`); }
    };
    await del('expenses',                    () => sql`DELETE FROM expenses`);
    await del('gps_updates',                 () => sql`DELETE FROM gps_updates`);
    await del('vehicle_documents',           () => sql`DELETE FROM vehicle_documents`);
    await del('sync_log',                    () => sql`DELETE FROM sync_log`);
    await del('activity_logs',               () => sql`DELETE FROM activity_logs`);
    await del('gc_notes',                    () => sql`DELETE FROM gc_notes`);
    await del('memos',                       () => sql`DELETE FROM memos`);
    await del('lorry_booking_entries',       () => sql`DELETE FROM lorry_booking_entries`);
    await del('lorry_booking_daily_profits', () => sql`DELETE FROM lorry_booking_daily_profits`);
    await del('trips',                       () => sql`DELETE FROM trips`);
    await del('fleet_vehicles',              () => sql`DELETE FROM fleet_vehicles`);
    await del('managed_vehicles',            () => sql`DELETE FROM managed_vehicles`);
    await del('drivers',                     () => sql`DELETE FROM drivers`);
    app.log.info('[Admin] Database wiped: ' + results.join(', '));
    return reply.code(200).send({ success: true, message: 'All data deleted successfully.', details: results });
  });
}
