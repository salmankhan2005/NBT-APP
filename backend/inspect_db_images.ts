import { sql } from './src/db/client';

async function inspectImages() {
  console.log('--- INSPECTING TRIPS IN NEON DB ---');
  const trips = await sql`
    SELECT id, driver_name, status, odometer_start_url, odometer_end_url, pod_photo_url, created_at
    FROM trips
    ORDER BY created_at DESC
    LIMIT 10
  `;
  console.log('Recent Trips:', JSON.stringify(trips, null, 2));

  console.log('\n--- INSPECTING EXPENSES IN NEON DB ---');
  const expenses = await sql`
    SELECT id, trip_id, category, amount, receipt_url, recorded_at
    FROM expenses
    ORDER BY recorded_at DESC
    LIMIT 5
  `;
  console.log('Recent Expenses:', JSON.stringify(expenses, null, 2));
  process.exit(0);
}

inspectImages().catch(console.error);
