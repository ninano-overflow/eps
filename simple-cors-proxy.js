const http = require('http');
const { URL } = require('url');

const TARGET_HOST = '192.168.199.11';
const TARGET_PORT = 8554;
const PROXY_PORT = 3001;

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Create request to target server
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${TARGET_HOST}:${TARGET_PORT}`
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    // Copy status and headers
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    
    // Pipe the response
    proxyRes.pipe(res);
  });

  // Handle errors
  proxyReq.on('error', (err) => {
    console.error('Proxy request error:', err);
    res.writeHead(500);
    res.end('Proxy Error');
  });

  // Pipe the request
  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, () => {
  console.log(`CORS Proxy running on port ${PROXY_PORT}`);
  console.log(`Proxying to ${TARGET_HOST}:${TARGET_PORT}`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down proxy...');
  server.close(() => process.exit(0));
});