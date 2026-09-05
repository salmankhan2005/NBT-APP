const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  
  // Normalization
  let filePath = path.join(DIST_DIR, reqPath);

  // Check if directory -> index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // SPA fallback routing
  if (!fs.existsSync(filePath)) {
    if (reqPath.startsWith('/admin')) {
      filePath = path.join(DIST_DIR, 'admin', 'index.html');
    } else if (reqPath.startsWith('/driver')) {
      filePath = path.join(DIST_DIR, 'driver', 'index.html');
    } else {
      filePath = path.join(DIST_DIR, 'index.html');
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🌐 [Preview Server] Unified Demo Suite running at: http://localhost:${PORT}`);
  console.log(`   - Suite Showcase: http://localhost:${PORT}`);
  console.log(`   - Admin Portal:   http://localhost:${PORT}/admin`);
  console.log(`   - Driver Console: http://localhost:${PORT}/driver`);
});
