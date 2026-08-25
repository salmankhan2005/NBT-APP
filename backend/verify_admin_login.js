const fetch = require('node-fetch');
const API = 'https://nbt-app.onrender.com';

async function main() {
  const loginRes = await fetch(`${API}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackingId: 'admin', pin: 'Admin@2026' })
  });
  console.log('Login status:', loginRes.status);
  const data = await loginRes.json();
  if (!loginRes.ok) { console.log('Error:', data); return; }
  
  console.log('Login SUCCESS! Token (first 50 chars):', data.token?.substring(0, 50));
  
  const tripsRes = await fetch(`${API}/api/admin/trips`, {
    headers: { Authorization: `Bearer ${data.token}` }
  });
  console.log('Trips status:', tripsRes.status);
  const trips = await tripsRes.json();
  console.log('Trips count:', Array.isArray(trips) ? trips.length : trips);
  if (Array.isArray(trips) && trips.length > 0) {
    console.log('Latest trip id:', trips[0].id, 'status:', trips[0].status);
  }
}
main().catch(console.error);
