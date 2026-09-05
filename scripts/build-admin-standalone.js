const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const ADMIN_DIR = path.join(ROOT_DIR, 'admin app');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist-admin');
const APP_JSON_PATH = path.join(ADMIN_DIR, 'app.json');

console.log('🚀 [Build Admin App] Exporting Standalone Production-Grade Admin Application...\n');

// 1. Ensure dependencies in admin app
if (!fs.existsSync(path.join(ADMIN_DIR, 'node_modules'))) {
  console.log('📦 [Admin App] Installing node_modules...');
  execSync('npm install --prefer-offline --no-audit', { stdio: 'inherit', cwd: ADMIN_DIR });
}

// 2. Clear old output directory
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}

// Read original app.json
const originalAppJsonStr = fs.readFileSync(APP_JSON_PATH, 'utf8');

try {
  // Strip baseUrl so Admin App runs directly at the root / URL (production style)
  const appJson = JSON.parse(originalAppJsonStr);
  if (appJson.expo && appJson.expo.experiments) {
    delete appJson.expo.experiments.baseUrl;
  }
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');

  // 3. Export Expo Web for Admin App
  console.log('🔨 Exporting Admin App (Expo Web static bundle)...');
  execSync('npx expo export --platform web', {
    stdio: 'inherit',
    cwd: ADMIN_DIR,
    env: {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://nbt-app.onrender.com',
    }
  });

  // 4. Copy dist directly to root dist-admin/
  if (fs.existsSync(path.join(ADMIN_DIR, 'dist'))) {
    fs.cpSync(path.join(ADMIN_DIR, 'dist'), OUTPUT_DIR, { recursive: true });
  }

  // 5. Add SPA redirect rules
  fs.writeFileSync(path.join(OUTPUT_DIR, '_redirects'), '/*  /index.html  200\n', 'utf8');

  console.log('\n✅ [Build Admin App] Standalone Admin App compiled directly to dist-admin/ !');
} finally {
  // Restore original app.json
  fs.writeFileSync(APP_JSON_PATH, originalAppJsonStr, 'utf8');
}
