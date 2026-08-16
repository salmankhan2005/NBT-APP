require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

sql`
  SELECT
    t.id,
    t.pod_photo_url,
    t.pod_signature,
    t.pod_notes,
    t.status
  FROM trips t
  WHERE t.id = 'TRIP-2026-5216'
  LIMIT 1
`
  .then(r => {
    console.log('Current DB state for TRIP-2026-5216:');
    console.log(JSON.stringify(r, null, 2));
  })
  .catch(e => console.error(e.message));
