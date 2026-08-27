require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

sql`
  SELECT t.id as trip_id, t.driver_id, t.tracking_id, t.driver_pin,
         d.id as driver_table_id, d.active
  FROM trips t
  LEFT JOIN drivers d ON d.id = t.driver_id
  ORDER BY t.created_at DESC LIMIT 5
`.then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error(e.message));
