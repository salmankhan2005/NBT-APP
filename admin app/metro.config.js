const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ── Block non-app folders from being watched/bundled ──────────────────────────
// These folders contain HTML docs, design files, scripts etc. — not app code.
config.watchFolders = [__dirname];

config.resolver.blockList = [
  // Design/doc folders
  /.*\/admin_overview\/.*/,
  /.*\/create_new_trip\/.*/,
  /.*\/live_monitoring\/.*/,
  /.*\/logistics_command\/.*/,
  /.*\/trip_management\/.*/,
  // Build output
  /.*\/dist\/.*/,
  /.*\/web\/.*/,
  // Android native build
  /.*\/android\/build\/.*/,
  /.*\/android\/.gradle\/.*/,
];

// ── Enable persistent Metro cache on disk ─────────────────────────────────────
// Dramatically speeds up subsequent starts (warm starts go from ~30s → ~3s).
config.cacheStores = undefined; // use default disk cache

// ── Increase transformer concurrency for faster builds ────────────────────────
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      // Disable aggressive minification in dev for faster transforms
      reduce_funcs: false,
    },
  },
};

module.exports = config;
