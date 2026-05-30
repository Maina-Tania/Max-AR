@echo off
echo ========================================
echo MaxAR Field Engineer - Starting All Services
echo ========================================
echo.

echo [1/3] Starting Mock Maximo API on port 9000...
start "Mock Maximo API" cmd /k "cd /d %~dp0backend && python maximo_mock.py"
timeout /t 3 /nobreak >nul

echo [2/3] Starting FastAPI Bridge on port 8000...
start "FastAPI Bridge" cmd /k "cd /d %~dp0backend && python main.py"
timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend Dashboard on port 3000...
start "Frontend Dashboard" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ========================================
echo All services are starting!
echo ========================================
echo.
echo Mock Maximo API: http://localhost:9000
echo FastAPI Bridge: http://localhost:8000
echo Frontend Dashboard: http://localhost:3000
echo.
echo Three new windows will open. Please wait...
echo Browser will open automatically in ~30 seconds.
echo.
echo Press any key to close this window (services will keep running)
pause >nul