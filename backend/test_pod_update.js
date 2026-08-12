require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

// Manually simulate a POD update for TRIP-2026-5216
const tripId = 'TRIP-2026-5216';
const podPhotoUrl = 'http://localhost:3001/uploads/upload_1786525474962_zfl8ui.jpg';
const podSignature = 'Receiver Signature Captured';
const podNotes = 'Test delivery notes';

console.log('Testing direct DB update for', tripId);

sql`
  UPDATE trips
  SET
    pod_photo_url = COALESCE(${podPhotoUrl}, pod_photo_url),
    pod_signature = COALESCE(${podSignature}, pod_signature),
    pod_notes     = COALESCE(${podNotes}, pod_notes),
    status        = 'REACHED_DESTINATION'
  WHERE id = ${tripId}
`
  .then(r => {
    console.log('✓ UPDATE result:', JSON.stringify(r));
    return sql`SELECT id, status, pod_photo_url, pod_signature, pod_notes FROM trips WHERE id = ${tripId}`;
  })
  .then(r => console.log('✓ Verify row:', JSON.stringify(r, null, 2)))
  .catch(e => console.error('✗ Error:', e.message));
