@echo off
echo Starting EPS Development Environment
echo =====================================
echo.

REM Check if running in correct directory
if not exist "simple-proxy.js" (
    echo Error: simple-proxy.js not found. Make sure you're in the correct directory.
    pause
    exit /b 1
)

REM Start the CORS proxy in background
echo [1/2] Starting CORS Proxy on localhost:3001...
start "CORS Proxy" cmd /k "node simple-proxy.js"
timeout /t 3 /nobreak >nul

REM Start the React app
echo [2/2] Starting React App on localhost:3000...
cd eps-frontend
start "React App" cmd /k "npm run dev"

echo.
echo =====================================
echo Development servers starting...
echo.
echo CORS Proxy: http://localhost:3001
echo React App:  http://localhost:3000
echo.
echo Close both command windows to stop the servers.
echo =====================================
pause