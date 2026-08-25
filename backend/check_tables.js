const { neon } = require('@neondatabase/serverless');
require('dotenv').config();
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log('Tables:', tables.map(t => t.table_name));

  // Check admin auth 
  try {
    const auth = await sql`SELECT id, username FROM admin_users LIMIT 5`;
    console.log('admin_users:', auth);
  } catch (e) {
    console.log('admin_users error:', e.message);
  }

  // Check what /api/admin/login expects
  const trips = await sql`SELECT id, status, driver_name, odometer_start_url FROM trips ORDER BY created_at DESC LIMIT 3`;
  console.log('Latest trips:', JSON.stringify(trips, null, 2));
}
main().catch(console.error);
