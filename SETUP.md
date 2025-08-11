# EPS File Browser Setup Guide

## Problem Diagnosis

Your React app isn't showing files because of several issues:

1. **CORS Issues** - Your current http-proxy.js doesn't have CORS headers
2. **HTTP vs RTSP** - The proxy is configured for RTSP, not HTTP file serving
3. **HTML Parsing** - The React app needs better HTML parsing logic

## Quick Fix Solutions

### Option 1: Use the New HTTP File Server (Recommended)

1. **Stop your current proxy:**
   ```bash
   # Stop the running http-proxy.js (Ctrl+C)
   ```

2. **Start the new HTTP file server:**
   ```bash
   cd C:\Users\ninano-110\dev\eps
   node http-file-server.js
   ```

3. **Edit the file path in `http-file-server.js`:**
   - Open `http-file-server.js`
   - Change line 165: `rootPath: 'D:/',` to your actual file directory
   - Example: `rootPath: 'C:/Users/ninano-110/Documents/',`

### Option 2: Quick Fix Your Current Proxy (Alternative)

Add CORS headers to your existing `http-proxy.js`:

```javascript
// Add this after line 22 in handleClient method:
clientSocket.on("data", (data) => {
  // Add CORS headers for HTTP responses
  if (data.toString().includes('GET /download')) {
    const corsHeaders = [
      'HTTP/1.1 200 OK',
      'Access-Control-Allow-Origin: *',
      'Access-Control-Allow-Methods: GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers: Content-Type, Authorization',
      'Content-Type: text/html',
      '',
      ''
    ].join('\r\n');
    
    clientSocket.write(corsHeaders);
  }
  
  if (sourceSocket.writable) {
    sourceSocket.write(data);
  }
});
```

## Start the React App

1. **Install dependencies:**
   ```bash
   cd C:\Users\ninano-110\dev\eps\web-frontend
   npm install
   ```

2. **Start development server:**
   ```bash
   npm start
   ```

3. **Open browser to:**
   ```
   http://localhost:3000
   ```

## Debugging Steps

1. **Use the Debug Panel:**
   - Go to Files page in your React app
   - Use the Debug Panel to test connections
   - Check browser console for errors

2. **Test direct connection:**
   ```bash
   curl http://192.168.199.11:8554/download/
   ```

3. **Check CORS headers:**
   ```bash
   curl -I http://192.168.199.11:8554/download/
   ```

## Expected Results

After fixing:
- ✅ React app loads without errors
- ✅ Files page shows directory listing
- ✅ Debug panel shows successful connection
- ✅ You can browse folders and download files

## Configuration Notes

- **Proxy URL:** `http://192.168.199.11:8554`
- **Files Endpoint:** `/download/`
- **Development Server:** `http://localhost:3000`
- **File Root:** Configure in `http-file-server.js`

## Common Issues

1. **"No files shown"** → Check CORS headers and file path configuration
2. **"Network Error"** → Verify proxy server is running on correct port
3. **"Parse Error"** → Use Debug Panel to check HTML format
4. **"CORS blocked"** → Switch to the new HTTP file server with CORS support

## Next Steps

1. Start with Option 1 (new file server)
2. Test using Debug Panel
3. Configure correct file root directory
4. Remove Debug Panel when working (optional)