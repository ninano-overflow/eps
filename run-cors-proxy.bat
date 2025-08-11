@echo off
echo Starting CORS Proxy Server...
echo This will proxy requests from localhost:3001 to 192.168.199.11:8554
echo.

REM Install http-proxy if not installed
npm list http-proxy >nul 2>&1
if errorlevel 1 (
    echo Installing http-proxy...
    npm install http-proxy
    echo.
)

echo Starting CORS proxy on http://localhost:3001
echo Proxying to http://192.168.199.11:8554
echo.
echo Press Ctrl+C to stop
echo.

node cors-proxy.js