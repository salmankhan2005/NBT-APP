require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

sql`SELECT id, driver_id, tracking_id, status, driver_pin, pod_photo_url, pod_signature FROM trips ORDER BY created_at DESC LIMIT 5`
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(e => console.error(e.message));
