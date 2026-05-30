@echo off
echo Starting MaxAR Backend Services...
echo.

echo [1/2] Starting Mock Maximo API on port 9000...
start "Mock Maximo API" cmd /k "cd backend && python maximo_mock.py"
timeout /t 3 /nobreak >nul

echo [2/2] Starting FastAPI Bridge on port 8000...
start "FastAPI Bridge" cmd /k "cd backend && python main.py"

echo.
echo ========================================
echo Backend services are starting...
echo Mock Maximo: http://localhost:9000
echo FastAPI Bridge: http://localhost:8000
echo ========================================
echo.
echo Press any key to close this window (services will keep running)
pause >nul