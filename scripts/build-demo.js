const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const ADMIN_DIR = path.join(ROOT_DIR, 'admin app');
const DRIVER_DIR = path.join(ROOT_DIR, 'DRIVER APP');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist');

console.log('🚀 [Build Suite] Starting NBT Logistics Combined Production Build...\n');

// Ensure sub-app dependencies are installed
if (!fs.existsSync(path.join(ADMIN_DIR, 'node_modules'))) {
  console.log('📦 [Admin App] node_modules missing. Installing dependencies...');
  execSync('npm install --prefer-offline --no-audit', { stdio: 'inherit', cwd: ADMIN_DIR });
}

if (!fs.existsSync(path.join(DRIVER_DIR, 'node_modules'))) {
  console.log('📦 [Driver App] node_modules missing. Installing dependencies...');
  execSync('npm install --prefer-offline --no-audit', { stdio: 'inherit', cwd: DRIVER_DIR });
}

// 1. Build Admin App
console.log('📦 [1/3] Exporting Admin App (Expo Web with baseUrl /admin)...');
execSync('npx expo export --platform web', { stdio: 'inherit', cwd: ADMIN_DIR });

// 2. Build Driver App
console.log('\n📦 [2/3] Exporting Driver App (Expo Web with baseUrl /driver)...');
execSync('npx expo export --platform web', { stdio: 'inherit', cwd: DRIVER_DIR });

// 3. Assemble root dist folder
console.log('\n📁 [3/3] Assembling unified distribution directory: dist/...');
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Copy admin app/dist -> dist/admin
fs.cpSync(path.join(ADMIN_DIR, 'dist'), path.join(OUTPUT_DIR, 'admin'), { recursive: true });

// Copy DRIVER APP/dist -> dist/driver
fs.cpSync(path.join(DRIVER_DIR, 'dist'), path.join(OUTPUT_DIR, 'driver'), { recursive: true });

// Default index.html redirects to /admin/
const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NBT Logistics Applications</title>
  <meta http-equiv="refresh" content="0; url=/admin/">
  <script>window.location.href = "/admin/";</script>
</head>
<body>
  <p>Redirecting to <a href="/admin/">NBT Admin Portal</a>...</p>
</body>
</html>`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml, 'utf8');

// Copy redirect configuration for SPAs
const redirectsContent = `/admin/*  /admin/index.html  200\n/driver/*  /driver/index.html  200\n/*  /admin/index.html  200\n`;
fs.writeFileSync(path.join(OUTPUT_DIR, '_redirects'), redirectsContent, 'utf8');

console.log('\n✅ [Build Suite] Unified distribution compiled successfully to dist/ !');
console.log('   - Admin Command Console: /admin/');
console.log('   - Driver Mobile Console:  /driver/');
