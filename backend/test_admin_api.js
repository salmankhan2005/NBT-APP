const fetch = require('node-fetch');

const API = 'https://nbt-app.onrender.com';

async function main() {
  // 1. Test admin login
  console.log('1. Testing admin login...');
  const loginRes = await fetch(`${API}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackingId: 'admin', pin: 'admin123' })
  });
  console.log('   Login status:', loginRes.status);
  const loginText = await loginRes.text();
  console.log('   Login response:', loginText.substring(0, 200));

  if (!loginRes.ok) {
    console.log('\nTrying default pins...');
    for (const pin of ['1234', 'admin', 'password', 'Admin@123', 'admin@123']) {
      const r = await fetch(`${API}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingId: 'admin', pin })
      });
      console.log(`   pin=${pin} => status=${r.status}`);
      if (r.ok) {
        const d = await r.json();
        console.log('   TOKEN:', d.token?.substring(0, 60));
        
        // 2. Test fetching trips with this token
        const tripsRes = await fetch(`${API}/api/admin/trips`, {
          headers: { Authorization: `Bearer ${d.token}` }
        });
        console.log('\n2. Admin trips status:', tripsRes.status);
        const tripsData = await tripsRes.json();
        console.log('   Trips count:', Array.isArray(tripsData) ? tripsData.length : tripsData);
        if (Array.isArray(tripsData) && tripsData.length > 0) {
          console.log('   Latest trip:', JSON.stringify(tripsData[0], null, 2).substring(0, 500));
        }
        break;
      }
    }
  } else {
    const loginData = JSON.parse(loginText);
    const token = loginData.token;
    const tripsRes = await fetch(`${API}/api/admin/trips`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('\n2. Admin trips status:', tripsRes.status);
    const tripsData = await tripsRes.json();
    console.log('   Trips count:', Array.isArray(tripsData) ? tripsData.length : JSON.stringify(tripsData).substring(0, 200));
    if (Array.isArray(tripsData) && tripsData.length > 0) {
      console.log('   Latest trip:', JSON.stringify(tripsData[0], null, 2).substring(0, 500));
    }
  }
}

main().catch(console.error);
