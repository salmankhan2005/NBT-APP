require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

Promise.all([
  sql`SELECT t.id, t.driver_id, t.status, t.pod_photo_url, t.pod_signature FROM trips t ORDER BY t.created_at DESC LIMIT 3`,
  sql`SELECT d.id, d.active FROM drivers d LIMIT 5`,
]).then(([trips, drivers]) => {
  console.log('TRIPS:', JSON.stringify(trips, null, 2));
  console.log('DRIVERS:', JSON.stringify(drivers, null, 2));
}).catch(e => console.error(e.message));
