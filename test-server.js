const http = require('http');

// Test direct connection to your file server
const options = {
  hostname: '192.168.199.11',
  port: 8554,
  path: '/download/',
  method: 'GET',
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  }
};

console.log('Testing connection to http://192.168.199.11:8554/download/');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n--- Response Body ---');
    console.log(data);
    console.log('\n--- Parse Test ---');
    
    // Test HTML parsing logic
    const lines = data.split('\n');
    console.log(`Found ${lines.length} lines`);
    
    // Look for <a href> patterns
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      const linkMatch = line.match(/<a href="([^"]+)">([^<]+)<\/a>/);
      if (linkMatch) {
        const [, href, linkText] = linkMatch;
        console.log(`Link found: href="${href}", text="${linkText}"`);
      }
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.end();