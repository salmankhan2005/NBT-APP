const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const ADMIN_DIR = path.join(ROOT_DIR, 'admin app');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist-admin');

console.log('🚀 [Build Admin App] Exporting Standalone Production-Grade Admin Application...\n');

// 1. Ensure dependencies in admin app
if (!fs.existsSync(path.join(ADMIN_DIR, 'node_modules'))) {
  console.log('📦 [Admin App] Installing node_modules...');
  execSync('npm install --prefer-offline --no-audit', { stdio: 'inherit', cwd: ADMIN_DIR });
}

// 2. Clear old output directory & Metro cache
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
if (fs.existsSync(path.join(ADMIN_DIR, '.expo'))) {
  fs.rmSync(path.join(ADMIN_DIR, '.expo'), { recursive: true, force: true });
}

// 3. Export Expo Web for Admin App cleanly at root /
console.log('🔨 Exporting Admin App (Expo Web static bundle with cleared cache)...');
execSync('npx expo export --platform web --clear', {
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
  fs.writeFileSync(path.join(ADMIN_DIR, 'dist', '.nojekyll'), '', 'utf8');
  fs.writeFileSync(path.join(ADMIN_DIR, 'dist', '_redirects'), '/*  /index.html  200\n', 'utf8');
}

// 5. Add SPA redirect rules and .nojekyll for Netlify static processing
fs.writeFileSync(path.join(OUTPUT_DIR, '_redirects'), '/*  /index.html  200\n', 'utf8');
fs.writeFileSync(path.join(OUTPUT_DIR, '.nojekyll'), '', 'utf8');

console.log('\n✅ [Build Admin App] Standalone Admin App compiled directly to dist-admin/ !');
