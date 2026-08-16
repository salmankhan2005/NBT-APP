require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

sql`SELECT d.id, d.pin_hash, t.driver_pin, t.tracking_id FROM drivers d JOIN trips t ON t.driver_id = d.id ORDER BY t.created_at DESC LIMIT 3`
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(e => console.error(e.message));
