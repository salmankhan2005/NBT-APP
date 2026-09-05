const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DRIVER_DIR = path.join(ROOT_DIR, 'DRIVER APP');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist-driver');

console.log('🚀 [Build Driver App] Exporting Standalone Production-Grade Driver Application...\n');

// 1. Ensure dependencies in DRIVER APP
if (!fs.existsSync(path.join(DRIVER_DIR, 'node_modules'))) {
  console.log('📦 [Driver App] Installing node_modules...');
  execSync('npm install --prefer-offline --no-audit', { stdio: 'inherit', cwd: DRIVER_DIR });
}

// 2. Clear old output directory & Metro cache
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
if (fs.existsSync(path.join(DRIVER_DIR, '.expo'))) {
  fs.rmSync(path.join(DRIVER_DIR, '.expo'), { recursive: true, force: true });
}

// 3. Export Expo Web for Driver App cleanly at root /
console.log('🔨 Exporting Driver App (Expo Web static bundle with cleared cache)...');
execSync('npx expo export --platform web --clear', {
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
  fs.writeFileSync(path.join(DRIVER_DIR, 'dist', '.nojekyll'), '', 'utf8');
  fs.writeFileSync(path.join(DRIVER_DIR, 'dist', '_redirects'), '/*  /index.html  200\n', 'utf8');
}

// 5. Add SPA redirect rules and .nojekyll for Netlify static processing
fs.writeFileSync(path.join(OUTPUT_DIR, '_redirects'), '/*  /index.html  200\n', 'utf8');
fs.writeFileSync(path.join(OUTPUT_DIR, '.nojekyll'), '', 'utf8');

console.log('\n✅ [Build Driver App] Standalone Driver App compiled directly to dist-driver/ !');
