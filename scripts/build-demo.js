const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const ADMIN_DIR = path.join(ROOT_DIR, 'admin app');
const DRIVER_DIR = path.join(ROOT_DIR, 'DRIVER APP');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist');

console.log('🚀 [Build Demo] Starting Unified NBT Logistics Demo Suite Build...\n');

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
console.log('📦 [1/4] Exporting Admin App (Expo Web with baseUrl /admin)...');
execSync('npx expo export --platform web', { stdio: 'inherit', cwd: ADMIN_DIR });

// 2. Build Driver App
console.log('\n📦 [2/4] Exporting Driver App (Expo Web with baseUrl /driver)...');
execSync('npx expo export --platform web', { stdio: 'inherit', cwd: DRIVER_DIR });

// 3. Assemble root dist folder
console.log('\n📁 [3/4] Assembling unified distribution directory: dist/...');
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Copy admin app/dist -> dist/admin
fs.cpSync(path.join(ADMIN_DIR, 'dist'), path.join(OUTPUT_DIR, 'admin'), { recursive: true });

// Copy DRIVER APP/dist -> dist/driver
fs.cpSync(path.join(DRIVER_DIR, 'dist'), path.join(OUTPUT_DIR, 'driver'), { recursive: true });

// 4. Adapt demo-suite.html -> dist/index.html
console.log('✨ [4/4] Generating production demo showcase: dist/index.html...');
let demoSuiteHtml = fs.readFileSync(path.join(ROOT_DIR, 'demo-suite.html'), 'utf8');

// Replace localhost default URLs with relative web URLs
demoSuiteHtml = demoSuiteHtml.replace(
  'src="http://localhost:8081"',
  'src="/admin/"'
);
demoSuiteHtml = demoSuiteHtml.replace(
  'value="http://localhost:8081"',
  'value="/admin"'
);
demoSuiteHtml = demoSuiteHtml.replace(
  'src="http://localhost:8082"',
  'src="/driver/"'
);

fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), demoSuiteHtml, 'utf8');

// Copy redirect configuration for SPAs
const redirectsContent = `/admin/*  /admin/index.html  200\n/driver/*  /driver/index.html  200\n`;
fs.writeFileSync(path.join(OUTPUT_DIR, '_redirects'), redirectsContent, 'utf8');

console.log('\n✅ [Build Demo] Unified demo suite compiled successfully to dist/ !');
console.log('   - Interactive Presentation Suite: /');
console.log('   - Admin Command Console:          /admin');
console.log('   - Driver Mobile Console:          /driver');
