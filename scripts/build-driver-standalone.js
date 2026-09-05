const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DRIVER_DIR = path.join(ROOT_DIR, 'DRIVER APP');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist-driver');
const APP_JSON_PATH = path.join(DRIVER_DIR, 'app.json');

console.log('🚀 [Build Driver App] Exporting Standalone Production-Grade Driver Application...\n');

// 1. Ensure dependencies in DRIVER APP
if (!fs.existsSync(path.join(DRIVER_DIR, 'node_modules'))) {
  console.log('📦 [Driver App] Installing node_modules...');
  execSync('npm install --prefer-offline --no-audit', { stdio: 'inherit', cwd: DRIVER_DIR });
}

// 2. Clear old output directory
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}

// Read original app.json
const originalAppJsonStr = fs.readFileSync(APP_JSON_PATH, 'utf8');

try {
  // Strip baseUrl so Driver App runs directly at the root / URL (production style)
  const appJson = JSON.parse(originalAppJsonStr);
  if (appJson.expo && appJson.expo.experiments) {
    delete appJson.expo.experiments.baseUrl;
  }
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');

  // 3. Export Expo Web for Driver App
  console.log('🔨 Exporting Driver App (Expo Web static bundle)...');
  execSync('npx expo export --platform web', {
    stdio: 'inherit',
    cwd: DRIVER_DIR,
    env: {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://nbt-app.onrender.com',
    }
  });

  // 4. Copy dist directly to root dist-driver/
  if (fs.existsSync(path.join(DRIVER_DIR, 'dist'))) {
    fs.cpSync(path.join(DRIVER_DIR, 'dist'), OUTPUT_DIR, { recursive: true });
  }

  // 5. Add SPA redirect rules
  fs.writeFileSync(path.join(OUTPUT_DIR, '_redirects'), '/*  /index.html  200\n', 'utf8');

  console.log('\n✅ [Build Driver App] Standalone Driver App compiled directly to dist-driver/ !');
} finally {
  // Restore original app.json
  fs.writeFileSync(APP_JSON_PATH, originalAppJsonStr, 'utf8');
}
