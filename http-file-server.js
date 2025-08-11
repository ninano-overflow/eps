#!/usr/bin/env node

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

class HTTPFileServer {
  constructor(options = {}) {
    this.rootPath = options.rootPath || 'C:/'; // Adjust this to your file root
    this.port = options.port || 8554;
    this.host = options.host || '0.0.0.0';
    this.server = null;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`HTTP File Server listening on ${this.host}:${this.port}`);
        console.log(`Serving files from: ${this.rootPath}`);
        resolve();
      });
    });
  }

  handleRequest(req, res) {
    // Add CORS headers for React app
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url);
    const pathname = decodeURIComponent(parsedUrl.pathname);
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${pathname} from ${req.connection.remoteAddress}`);

    // Security check - prevent path traversal
    if (pathname.includes('..')) {
      this.sendError(res, 403, 'Forbidden: Path traversal detected');
      return;
    }

    // Map /download to your actual file directory
    let filePath;
    if (pathname.startsWith('/download')) {
      // Remove /download prefix and map to actual path
      const relativePath = pathname.replace('/download', '') || '/';
      filePath = path.join(this.rootPath, relativePath);
    } else if (pathname.startsWith('/api/status')) {
      // API endpoint for server status
      this.sendJSON(res, {
        status: 'running',
        uptime: process.uptime() * 1000,
        connections: 1,
        rootPath: this.rootPath
      });
      return;
    } else {
      this.sendError(res, 404, 'Not Found');
      return;
    }

    // Normalize path
    filePath = path.resolve(filePath);

    // Security check - ensure we're still within root
    if (!filePath.startsWith(path.resolve(this.rootPath))) {
      this.sendError(res, 403, 'Forbidden: Access denied');
      return;
    }

    this.serveFile(req, res, filePath, pathname);
  }

  serveFile(req, res, filePath, pathname) {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          this.sendError(res, 404, 'File not found');
        } else {
          this.sendError(res, 500, 'Internal server error');
        }
        return;
      }

      if (stats.isDirectory()) {
        this.serveDirectory(req, res, filePath, pathname);
      } else {
        this.serveStaticFile(req, res, filePath, stats);
      }
    });
  }

  serveDirectory(req, res, dirPath, pathname) {
    fs.readdir(dirPath, { withFileTypes: true }, (err, entries) => {
      if (err) {
        this.sendError(res, 500, 'Unable to read directory');
        return;
      }

      // Generate HTML directory listing
      let html = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">
<html>
<head>
  <title>Index of ${pathname}</title>
  <meta charset="utf-8">
</head>
<body>
<h1>Index of ${pathname}</h1>
<pre>`;

      // Add parent directory link if not root
      if (pathname !== '/download/' && pathname !== '/download') {
        const parentPath = path.dirname(pathname);
        html += `<a href="${parentPath === '/download' ? '/download/' : parentPath}/">..</a>                        -       -\n`;
      }

      // Sort entries - directories first, then alphabetically
      entries.sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) {
          return a.isDirectory() ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      entries.forEach(entry => {
        const entryPath = path.join(dirPath, entry.name);
        const href = pathname.endsWith('/') ? `${pathname}${entry.name}` : `${pathname}/${entry.name}`;
        
        fs.stat(entryPath, (statErr, stats) => {
          const isDir = entry.isDirectory();
          const displayName = isDir ? `${entry.name}/` : entry.name;
          const size = isDir ? '-' : this.formatFileSize(stats?.size || 0);
          const date = stats ? this.formatDate(stats.mtime) : '-';
          
          html += `<a href="${href}${isDir ? '/' : ''}">${displayName}</a>`;
          
          // Pad to align columns
          const padding = Math.max(1, 50 - displayName.length);
          html += ' '.repeat(padding);
          html += `${date}  ${size}\n`;
        });
      });

      // Close after processing all entries
      setTimeout(() => {
        html += '</pre></body></html>';
        
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': Buffer.byteLength(html)
        });
        res.end(html);
      }, 100); // Small delay to allow stat calls to complete
    });
  }

  serveStaticFile(req, res, filePath, stats) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.woff': 'application/font-woff',
      '.ttf': 'application/font-ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.otf': 'application/font-otf',
      '.svg': 'application/image/svg+xml'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Last-Modified': stats.mtime.toUTCString(),
      'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    
    readStream.on('error', (err) => {
      console.error('Error serving file:', err);
      if (!res.headersSent) {
        this.sendError(res, 500, 'Error reading file');
      }
    });
  }

  sendError(res, code, message) {
    res.writeHead(code, { 'Content-Type': 'text/plain' });
    res.end(message);
  }

  sendJSON(res, data) {
    const json = JSON.stringify(data, null, 2);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json)
    });
    res.end(json);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'K', 'M', 'G'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + sizes[i];
  }

  formatDate(date) {
    return date.toISOString().split('T')[0] + ' ' + 
           date.toTimeString().split(' ')[0].substring(0, 5);
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('HTTP File Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// CLI usage
if (require.main === module) {
  const server = new HTTPFileServer({
    rootPath: 'D:/', // Change this to your actual file root directory
    port: 8554,
    host: '0.0.0.0'
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  // Start the server
  server.start().catch((err) => {
    console.error('Failed to start HTTP File Server:', err);
    process.exit(1);
  });
}

module.exports = HTTPFileServer;