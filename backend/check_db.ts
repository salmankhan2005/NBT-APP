import { sql } from './src/db/client';

async function check() {
  const trips = await sql`SELECT id, odometer_start_url, pod_photo_url, odometer_end_url FROM trips ORDER BY created_at DESC LIMIT 5`;
  console.log("Latest Trips:", trips);
  
  const expenses = await sql`SELECT id, trip_id, receipt_url FROM expenses ORDER BY recorded_at DESC LIMIT 5`;
  console.log("Latest Expenses:", expenses);
  
  const files = await sql`SELECT file_id, file_name, storage_path FROM uploaded_files ORDER BY created_at DESC LIMIT 5`;
  console.log("Latest Files:", files);
  
  process.exit(0);
}

check().catch(console.error);
