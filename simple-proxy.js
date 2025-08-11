const http = require('http');
const { URL } = require('url');

const TARGET = 'http://192.168.199.11:8554';
const PORT = 3001;

const server = http.createServer((req, res) => {
  // Always add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const targetUrl = `${TARGET}${req.url}`;
  console.log(`[${new Date().toISOString()}] Proxying: ${req.method} ${targetUrl}`);

  const proxyReq = http.request(targetUrl, {
    method: req.method,
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }, (proxyRes) => {
    // Log response
    console.log(`Response: ${proxyRes.statusCode}`);
    
    // Copy headers and add CORS
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Override with CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    
    res.writeHead(proxyRes.statusCode);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end('Proxy Error: ' + err.message);
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`Simple CORS proxy running on http://localhost:${PORT}`);
  console.log(`Proxying all requests to ${TARGET}`);
  console.log('Test with: curl http://localhost:3001/download/');
});

process.on('SIGINT', () => {
  console.log('\nShutting down proxy...');
  server.close(() => process.exit(0));
});