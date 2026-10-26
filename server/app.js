const http = require('http');
const fs = require('fs');
const path = require('path');

const FLAVORS = [
  { id: 1, name: "Crimson Solaris", port: 9001, dir: "flavor1" },
  { id: 2, name: "Cyber Azure", port: 9002, dir: "flavor2" },
  { id: 3, name: "Emerald Aurora", port: 9003, dir: "flavor3" },
  { id: 4, name: "Neon Amethyst", port: 9004, dir: "flavor4" },
  { id: 5, name: "Solar Amber", port: 9005, dir: "flavor5" }
];

const PUBLIC_DIR = path.resolve(__dirname, '../public');

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'text/plain; charset=utf-8';
  }
}

FLAVORS.forEach((flavor) => {
  const server = http.createServer((req, res) => {
    // Standard response headers proving the origin
    res.setHeader('X-Flavor', flavor.name);
    res.setHeader('X-Served-Port', flavor.port.toString());
    res.setHeader('X-Backend-Worker', `Node-Worker-${flavor.id}`);

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // API diagnostics endpoint
    if (pathname === '/api/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const info = {
        flavor: flavor.name,
        flavorId: flavor.id,
        port: flavor.port,
        hostHeader: req.headers.host,
        clientIp: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress,
        targetIpHeader: req.headers['x-target-ip'] || null,
        timestamp: new Date().toISOString(),
        headers: req.headers
      };
      return res.end(JSON.stringify(info, null, 2));
    }

    // Static file routing
    let targetFilePath;
    if (pathname.startsWith('/shared/')) {
      targetFilePath = path.join(PUBLIC_DIR, pathname);
    } else if (pathname === '/' || pathname === '/index.html') {
      targetFilePath = path.join(PUBLIC_DIR, flavor.dir, 'index.html');
    } else {
      targetFilePath = path.join(PUBLIC_DIR, flavor.dir, pathname);
    }

    // Security check to avoid directory traversal
    if (!targetFilePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 Forbidden');
    }

    fs.readFile(targetFilePath, (err, data) => {
      if (err) {
        // Fallback to index.html for flavor if file not found
        const fallbackPath = path.join(PUBLIC_DIR, flavor.dir, 'index.html');
        fs.readFile(fallbackPath, (fbErr, fbData) => {
          if (fbErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('404 Not Found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(fbData);
        });
        return;
      }

      res.writeHead(200, { 'Content-Type': getMimeType(targetFilePath) });
      res.end(data);
    });
  });

  // Listen on localhost on the specified port
  server.listen(flavor.port, '127.0.0.1', () => {
    console.log(`[Flavor 0${flavor.id}] ${flavor.name} listening on http://127.0.0.1:${flavor.port}`);
  });
});
