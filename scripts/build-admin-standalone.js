const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const ADMIN_DIR = path.join(ROOT_DIR, 'admin app');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist-admin');
const APP_JSON_PATH = path.join(ADMIN_DIR, 'app.json');

console.log('🚀 [Build Admin App] Starting Dedicated Standalone Admin Application Build...\n');

// 1. Ensure dependencies in admin app
if (!fs.existsSync(path.join(ADMIN_DIR, 'node_modules'))) {
  console.log('📦 [Admin App] node_modules missing. Installing dependencies...');
  execSync('npm install --prefer-offline --no-audit', { stdio: 'inherit', cwd: ADMIN_DIR });
}

// 2. Clear old output directory
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}

// Read original app.json
const originalAppJsonStr = fs.readFileSync(APP_JSON_PATH, 'utf8');

try {
  // Ensure baseUrl is set to /admin for iframe routing within showcase
  const appJson = JSON.parse(originalAppJsonStr);
  if (!appJson.expo.experiments) appJson.expo.experiments = {};
  appJson.expo.experiments.baseUrl = '/admin';
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');

  // 3. Export Expo Web for Admin App
  console.log('🔨 [Admin App] Exporting Standalone Admin Expo Web bundle...');
  execSync('npx expo export --platform web', {
    stdio: 'inherit',
    cwd: ADMIN_DIR,
    env: {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://nbt-app.onrender.com',
    }
  });

  // 4. Copy dist -> dist-admin/admin
  fs.mkdirSync(path.join(OUTPUT_DIR, 'admin'), { recursive: true });
  if (fs.existsSync(path.join(ADMIN_DIR, 'dist'))) {
    fs.cpSync(path.join(ADMIN_DIR, 'dist'), path.join(OUTPUT_DIR, 'admin'), { recursive: true });
    // Also copy to root for direct access
    fs.cpSync(path.join(ADMIN_DIR, 'dist'), OUTPUT_DIR, { recursive: true });
  }

  // 5. Copy admin-demo.html as root showcase entry point
  let adminDemoHtml = fs.readFileSync(path.join(ROOT_DIR, 'admin-demo.html'), 'utf8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), adminDemoHtml, 'utf8');

  // 6. Add SPA redirect rules
  const redirectsContent = `/admin/*  /admin/index.html  200\n/*  /index.html  200\n`;
  fs.writeFileSync(path.join(OUTPUT_DIR, '_redirects'), redirectsContent, 'utf8');

  console.log('\n✅ [Build Admin App] Dedicated Standalone Admin App compiled successfully to dist-admin/ !');
} finally {
  // Always restore original app.json
  fs.writeFileSync(APP_JSON_PATH, originalAppJsonStr, 'utf8');
}
