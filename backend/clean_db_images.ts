import { sql } from './src/db/client';

async function cleanImages() {
  console.log('Cleaning up raw file:// URIs in Neon DB...');
  
  // Set any file:/// paths in trips to null
  const tripUpdate = await sql`
    UPDATE trips
    SET
      odometer_start_url = CASE WHEN odometer_start_url LIKE 'file://%' OR odometer_start_url LIKE 'content://%' THEN NULL ELSE odometer_start_url END,
      odometer_end_url   = CASE WHEN odometer_end_url LIKE 'file://%' OR odometer_end_url LIKE 'content://%' THEN NULL ELSE odometer_end_url END,
      pod_photo_url      = CASE WHEN pod_photo_url LIKE 'file://%' OR pod_photo_url LIKE 'content://%' THEN NULL ELSE pod_photo_url END
    WHERE
      odometer_start_url LIKE 'file://%' OR odometer_start_url LIKE 'content://%'
      OR odometer_end_url LIKE 'file://%' OR odometer_end_url LIKE 'content://%'
      OR pod_photo_url LIKE 'file://%' OR pod_photo_url LIKE 'content://%'
  `;
  console.log('Trips cleaned.');

  // Set any file:/// paths in expenses to null
  const expenseUpdate = await sql`
    UPDATE expenses
    SET
      receipt_url = CASE WHEN receipt_url LIKE 'file://%' OR receipt_url LIKE 'content://%' THEN NULL ELSE receipt_url END
    WHERE
      receipt_url LIKE 'file://%' OR receipt_url LIKE 'content://%'
  `;
  console.log('Expenses cleaned.');
  process.exit(0);
}

cleanImages().catch(console.error);
