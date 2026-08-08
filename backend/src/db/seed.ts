import { sql } from './client';
import argon2 from 'argon2';
import 'dotenv/config';

/**
 * Seeds default admin, drivers, trips, vehicles, and fleet devices into Neon Postgres.
 * Run via: npm run db:seed
 */
async function seed() {
  console.log('▶  Seeding NBT-ARS database…');

  // Hash PINs & Passwords with Argon2id
  const adminPassHash = await argon2.hash('9999', { type: argon2.argon2id });
  const pin1Hash = await argon2.hash('123456', { type: argon2.argon2id });
  const pin2Hash = await argon2.hash('654321', { type: argon2.argon2id });

  // ── Admin Users ───────────────────────────────────────────────────────────
  await sql`
    INSERT INTO admin_users (id, username, password_hash, name, role)
    VALUES
      ('ADM-001', 'admin', ${adminPassHash}, 'NBT Administrator', 'super_admin')
    ON CONFLICT (id) DO UPDATE
      SET username      = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash,
          updated_at    = now()
  `;
  console.log('  ✓ admin user seeded (username: admin, role: super_admin)');

  // ── Drivers ──────────────────────────────────────────────────────────────
  await sql`
    INSERT INTO drivers (id, name, pin_hash, phone, license, vehicle_number)
    VALUES
      ('DRV-5566', 'Senthil Rajesh', ${pin1Hash}, '+91 98765 43210', 'TN3820190001234', 'TN 38 AB 1234'),
      ('DRV-4421', 'Karthik Raja',   ${pin2Hash}, '+91 98765 43211', 'TN3720200005678', 'TN 37 CB 5678')
    ON CONFLICT (id) DO UPDATE
      SET name           = EXCLUDED.name,
          pin_hash       = EXCLUDED.pin_hash,
          phone          = EXCLUDED.phone,
          license        = EXCLUDED.license,
          vehicle_number = EXCLUDED.vehicle_number,
          updated_at     = now()
  `;
  console.log('  ✓ drivers seeded (DRV-5566, DRV-4421)');

  // ── Trips ─────────────────────────────────────────────────────────────────
  await sql`
    INSERT INTO trips (
      id, driver_id, tracking_id, driver_name,
      vehicle_number, vehicle_type,
      starting_point, destination,
      tolls_count, estimated_toll_cost, status
    )
    VALUES
      (
        'DRV-5566', 'DRV-5566', 'TRK-5566', 'Senthil Rajesh',
        'TN 38 AB 1234', '12 Wheel',
        'Salem A2B Restaurant', 'Lumen Technologies, Bengaluru',
        8, 2450, 'ASSIGNED'
      ),
      (
        'DRV-4421', 'DRV-4421', 'TRK-4421', 'Karthik Raja',
        'TN 37 CB 5678', '16 Wheel',
        'Chennai Port Terminal', 'Coimbatore Cargo Terminal',
        12, 3200, 'ASSIGNED'
      )
    ON CONFLICT (id) DO NOTHING
  `;
  console.log('  ✓ trips seeded (TRK-5566, TRK-4421)');

  // ── Seed Managed Vehicles ───────────────────────────────────────────────
  await sql`
    INSERT INTO managed_vehicles (
      vehicle_id, vehicle_number, vehicle_type, wheel_type, vehicle_make, vehicle_model, owner_name, status
    )
    VALUES
      ('VEH-101', 'TN 38 AB 1234', '12 Wheel', '12 Wheel', 'Ashok Leyland', 'Captain 3118', 'NBT Logistics', 'ON TRIP'),
      ('VEH-102', 'TN 37 CB 5678', '16 Wheel', '16 Wheel', 'Tata Motors', 'Signa 4825.TK', 'ARS Fleet', 'ON TRIP'),
      ('VEH-103', 'TN 38 BK 9999', '10 Wheel', '10 Wheel', 'Eicher Motors', 'Pro 6028', 'NBT Logistics', 'AVAILABLE')
    ON CONFLICT (vehicle_id) DO NOTHING
  `;
  console.log('  ✓ managed_vehicles seeded');

  // ── Seed Fleet Vehicles (GPS Device Registry) ────────────────────────────
  await sql`
    INSERT INTO fleet_vehicles (
      id, vehicle_number, vehicle_type, vehicle_make, vehicle_model, owner_name, gps_provider, gps_device_id, imei_number, gps_device_status, last_known_lat, last_known_lng, last_known_city
    )
    VALUES
      ('FV-201', 'TN 38 AB 1234', '12 Wheel', 'Ashok Leyland', 'Captain 3118', 'NBT Logistics', 'Jio GPS', 'GPS-DEV-8891', '864209048123456', 'Connected', 11.6643, 78.1460, 'Salem Bypass'),
      ('FV-202', 'TN 37 CB 5678', '16 Wheel', 'Tata Motors', 'Signa 4825.TK', 'ARS Fleet', 'Jio GPS', 'GPS-DEV-8892', '864209048123457', 'Connected', 13.0827, 80.2707, 'Chennai Central')
    ON CONFLICT (id) DO NOTHING
  `;
  console.log('  ✓ fleet_vehicles seeded');

  // ── Seed initial GPS positions ────────────────────────────────────────────
  await sql`
    INSERT INTO gps_updates (trip_id, latitude, longitude, city, address)
    VALUES
      ('DRV-5566', 11.6643, 78.1460, 'Salem Bypass',    'NH544, Salem, Tamil Nadu'),
      ('DRV-4421', 13.0827, 80.2707, 'Chennai Central', 'Rajaji Salai, Chennai, Tamil Nadu')
  `;
  console.log('  ✓ initial GPS positions seeded');

  console.log('\n✅  Seed complete.');
  console.log('\n  Login credentials:');
  console.log('  Driver 1 → Tracking ID: TRK-5566  |  PIN: 123456');
  console.log('  Driver 2 → Tracking ID: TRK-4421  |  PIN: 654321');
  console.log('  Admin    → Username: admin     |  PIN/Password: 9999');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
