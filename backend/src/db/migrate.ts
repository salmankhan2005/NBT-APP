import { sql } from './client';
import 'dotenv/config';

/**
 * Runs the full DDL migration against Neon Postgres.
 * Safe to run multiple times — all statements use CREATE IF NOT EXISTS / DO blocks.
 * Run via: npm run db:migrate
 */
async function migrate() {
  console.log('▶  Running NBT-ARS database migration…');

  // ── Admin Users ───────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL DEFAULT 'Admin User',
      role          TEXT NOT NULL DEFAULT 'super_admin',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  ✓ admin_users');

  // ── Revoked JWT Tokens (server-side logout denylist) ──────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      token_jti   TEXT PRIMARY KEY,
      revoked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at  TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires
    ON revoked_tokens(expires_at)
  `;
  console.log('  ✓ revoked_tokens (JWT denylist)');

  // ── Database-backed uploaded files ──────────────────────────────────────
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
  console.log('  ✓ uploaded_files');

  // ── Drivers ──────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS drivers (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      pin_hash    TEXT NOT NULL,
      phone       TEXT DEFAULT '',
      license     TEXT DEFAULT '',
      vehicle_number TEXT DEFAULT '',
      active      BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  ✓ drivers');

  // ── Trips ─────────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS trips (
      id                   TEXT PRIMARY KEY,
      driver_id            TEXT REFERENCES drivers(id) ON DELETE SET NULL,
      tracking_id          TEXT UNIQUE NOT NULL,
      driver_name          TEXT NOT NULL DEFAULT '',
      driver_pin           TEXT,
      vehicle_number       TEXT NOT NULL DEFAULT '',
      vehicle_type         TEXT NOT NULL DEFAULT '',
      starting_point       TEXT NOT NULL DEFAULT '',
      destination          TEXT NOT NULL DEFAULT '',
      distance_km          NUMERIC(10,2) DEFAULT 0,
      estimated_travel_time TEXT DEFAULT '',
      recommended_route    TEXT DEFAULT '',
      tolls_count          INTEGER NOT NULL DEFAULT 0,
      estimated_toll_cost  NUMERIC(12,2) NOT NULL DEFAULT 0,
      agreed_freight       NUMERIC(12,2) DEFAULT 0,
      status               TEXT NOT NULL DEFAULT 'ASSIGNED',
      odometer_start       NUMERIC,
      odometer_end         NUMERIC,
      odometer_start_url   TEXT,
      diesel_start         TEXT,
      diesel_end           TEXT,
      start_date           TIMESTAMPTZ,
      end_date             TIMESTAMPTZ,
      pod_photo_url        TEXT,
      pod_signature        TEXT,
      pod_notes            TEXT,
      driver_payment       NUMERIC(12,2) DEFAULT 0,
      profit_or_loss       NUMERIC(12,2) DEFAULT 0,
      is_pinned            BOOLEAN DEFAULT false,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  ✓ trips');

  // ── Managed Vehicles ──────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS managed_vehicles (
      vehicle_id           TEXT PRIMARY KEY,
      vehicle_number       TEXT UNIQUE NOT NULL,
      vehicle_type         TEXT NOT NULL,
      wheel_type           TEXT NOT NULL,
      vehicle_make         TEXT DEFAULT '',
      vehicle_model        TEXT DEFAULT '',
      owner_name           TEXT DEFAULT '',
      owner_phone          TEXT DEFAULT '',
      rc_number            TEXT DEFAULT '',
      engine_number        TEXT DEFAULT '',
      chassis_number       TEXT DEFAULT '',
      year_of_manufacture  TEXT DEFAULT '',
      status               TEXT NOT NULL DEFAULT 'AVAILABLE',
      rc_front_url         TEXT,
      rc_back_url          TEXT,
      insurance_url        TEXT,
      insurance_expiry_date TIMESTAMPTZ,
      pollution_url        TEXT,
      pollution_expiry_date TIMESTAMPTZ,
      permit_url           TEXT,
      permit_expiry_date   TIMESTAMPTZ,
      fc_url               TEXT,
      fc_expiry_date       TIMESTAMPTZ,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  ✓ managed_vehicles');

  // ── Vehicle Documents ─────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS vehicle_documents (
      doc_id       TEXT PRIMARY KEY,
      vehicle_id   TEXT REFERENCES managed_vehicles(vehicle_id) ON DELETE CASCADE,
      doc_type     TEXT NOT NULL,
      doc_label    TEXT NOT NULL,
      doc_number   TEXT DEFAULT '',
      issue_date   TIMESTAMPTZ,
      expiry_date  TIMESTAMPTZ,
      file_uri     TEXT DEFAULT '',
      file_name    TEXT DEFAULT '',
      file_type    TEXT DEFAULT '',
      uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      uploaded_by  TEXT DEFAULT 'admin',
      is_active    BOOLEAN NOT NULL DEFAULT true
    )
  `;
  console.log('  ✓ vehicle_documents');

  // ── Fleet Vehicles (GPS Device Registry) ──────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS fleet_vehicles (
      id                    TEXT PRIMARY KEY,
      vehicle_number        TEXT UNIQUE NOT NULL,
      vehicle_type          TEXT DEFAULT '',
      vehicle_model         TEXT DEFAULT '',
      vehicle_make          TEXT DEFAULT '',
      owner_name            TEXT DEFAULT '',
      registration_date     TIMESTAMPTZ,
      vehicle_status        TEXT DEFAULT 'Active',
      gps_provider          TEXT DEFAULT 'Jio GPS',
      gps_device_brand      TEXT DEFAULT '',
      gps_device_model      TEXT DEFAULT '',
      gps_device_id         TEXT DEFAULT '',
      imei_number           TEXT DEFAULT '',
      sim_number            TEXT DEFAULT '',
      external_gps_device_id TEXT DEFAULT '',
      gps_installation_date TIMESTAMPTZ,
      gps_device_status     TEXT DEFAULT 'Connected',
      last_known_lat        NUMERIC(10,7),
      last_known_lng        NUMERIC(10,7),
      last_known_city       TEXT DEFAULT '',
      last_known_address    TEXT DEFAULT '',
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  ✓ fleet_vehicles');

  // ── GC Notes ──────────────────────────────────────────────────────────────
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
  console.log('  ✓ gc_notes');

  // ── Memos ─────────────────────────────────────────────────────────────────
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
  console.log('  ✓ memos');

  // ── Activity Logs ─────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id          BIGSERIAL PRIMARY KEY,
      type        TEXT NOT NULL,
      description TEXT NOT NULL,
      timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
      metadata    JSONB DEFAULT '{}'
    )
  `;
  console.log('  ✓ activity_logs');

  // ── GPS Updates (append-only time-series) ─────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS gps_updates (
      id           BIGSERIAL PRIMARY KEY,
      trip_id      TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      latitude     NUMERIC(10,7) NOT NULL,
      longitude    NUMERIC(10,7) NOT NULL,
      city         TEXT NOT NULL DEFAULT '',
      address      TEXT NOT NULL DEFAULT '',
      recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_gps_trip_id_time ON gps_updates(trip_id, recorded_at DESC)
  `;
  console.log('  ✓ gps_updates');

  // ── Expenses ──────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id            TEXT PRIMARY KEY,
      trip_id       TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      category      TEXT NOT NULL,
      amount        NUMERIC(12,2) NOT NULL,
      reason        TEXT,
      liters        NUMERIC,
      receipt_url   TEXT,
      receipt_urls  JSONB NOT NULL DEFAULT '[]',
      recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Add receipt_urls to existing tables (idempotent)
  await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_urls JSONB NOT NULL DEFAULT '[]'`;
  // Add a CHECK constraint to enforce max 10 photos per expense (idempotent via DO block)
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
  await sql`
    CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id)
  `;
  console.log('  ✓ expenses (receipt_urls multi-photo, max 10)');

  // ── Offline Sync Audit Log ────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS sync_log (
      id           BIGSERIAL PRIMARY KEY,
      trip_id      TEXT,
      action_type  TEXT NOT NULL,
      payload      JSONB NOT NULL DEFAULT '{}',
      driver_id    TEXT,
      synced_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log('  ✓ sync_log');

  // ── Lorry Booking Agency daily profit summaries ────────────────────────
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
  console.log('  ✓ lorry booking tables');

  // ── Add missing columns (idempotent ALTER TABLE statements) ────────────────
  await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS odometer_end_url TEXT`;
  await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7)`;
  await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7)`;
  await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS city TEXT`;
  await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS address TEXT`;
  console.log('  ✓ column patches (odometer_end_url, expense location columns)');

  // ── Updated-at trigger function ───────────────────────────────────────────
  await sql`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$
  `;

  // ── Updated-at triggers (one per table — Neon doesn't support params inside DO $$) ─
  const triggerTables = ['admin_users', 'drivers', 'trips', 'managed_vehicles', 'fleet_vehicles', 'gc_notes', 'memos'];
  for (const tbl of triggerTables) {
    const triggerName = `trg_${tbl}_updated_at`;
    const createSql = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = '${triggerName}'
          AND tgrelid = '${tbl}'::regclass
        ) THEN
          CREATE TRIGGER ${triggerName}
            BEFORE UPDATE ON ${tbl}
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END;
      $$
    `;
    // Use sql.unsafe for DDL that cannot use parameterized queries
    await sql(createSql);
  }
  console.log('  ✓ updated_at triggers');

  // ── Cleanup cron: purge expired revoked tokens (auto-housekeeping) ─────────
  await sql`
    CREATE OR REPLACE FUNCTION cleanup_expired_revoked_tokens()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      DELETE FROM revoked_tokens WHERE expires_at < now();
      RETURN NEW;
    END;
    $$
  `;
  console.log('  ✓ revoked_token cleanup function');

  console.log('\n✅  Migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌  Migration failed:', err);
  process.exit(1);
});
