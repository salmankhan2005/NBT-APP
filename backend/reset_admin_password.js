const { neon } = require('@neondatabase/serverless');
const argon2 = require('argon2');
require('dotenv').config();
const sql = neon(process.env.DATABASE_URL);

async function main() {
  // Show current admin user
  const admins = await sql`SELECT id, username, name, role, password_hash FROM admin_users`;
  console.log('Admin users:', admins.map(a => ({ id: a.id, username: a.username, name: a.name, role: a.role, hash_preview: a.password_hash?.substring(0, 30) })));

  // Reset admin password to '9999'
  const newPassword = '9999';
  const hash = await argon2.hash(newPassword, { type: argon2.argon2id });
  
  await sql`UPDATE admin_users SET password_hash = ${hash} WHERE username = 'admin'`;
  console.log(`\nAdmin password reset to: ${newPassword}`);
  
  // Verify it works
  const row = await sql`SELECT password_hash FROM admin_users WHERE username = 'admin' LIMIT 1`;
  const valid = await argon2.verify(row[0].password_hash, newPassword);
  console.log('Argon2 Verification:', valid ? 'SUCCESS ✓' : 'FAILED ✗');

  // Test live API
  try {
    const fetch = require('node-fetch');
    const res = await fetch('https://nbt-app.onrender.com/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingId: 'admin', pin: '9999' })
    });
    console.log('Render live login status:', res.status);
    const data = await res.json();
    console.log('Render live response:', data);
  } catch (err) {
    console.log('Render test error:', err.message);
  }
}
main().catch(console.error);
