# MaxAR Field Engineer - Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "ModuleNotFoundError: No module named 'fastapi'"

**Cause**: Python packages not installed or installed to wrong Python version

**Solution**:
```bash
# Check your Python version
python --version

# Install packages with the correct Python
python -m pip install -r backend/requirements.txt
```

**Note**: If you have multiple Python installations, make sure you're using the same one for both installation and running.

### Issue 2: START_ALL.bat does nothing when double-clicked

**Cause**: Batch file permissions or path issues

**Solution - Manual Start**:

Open 3 separate PowerShell or Command Prompt windows:

**Window 1 - Mock Maximo:**
```bash
cd C:\Users\tatsm\Desktop\Max-AR\backend
python maximo_mock.py
```

**Window 2 - FastAPI Bridge:**
```bash
cd C:\Users\tatsm\Desktop\Max-AR\backend
python main.py
```

**Window 3 - Frontend:**
```bash
cd C:\Users\tatsm\Desktop\Max-AR\frontend
npm start
```

### Issue 3: Port Already in Use

**Error**: "Address already in use: Port 9000/8000/3000"

**Solution**:
1. Close any running instances of the services
2. Or kill the process:
```powershell
# Find process using port
netstat -ano | findstr :9000
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Issue 4: watsonx.ai Returns Error

**Error**: "Invalid API key" or "Unauthorized"

**Check**:
1. Open `backend/.env`
2. Verify credentials:
```
WATSONX_APIKEY=ajoroU-sX4lpiZtA0cSRod2aAorq5tpx5fEdCq46rIWD
WATSONX_PROJECT_ID=e3b4eb68-b866-4061-9357-ac12f55de857
```
3. No quotes, no spaces around =

### Issue 5: Frontend Shows "Network Error"

**Cause**: Backend services not running

**Solution**:
1. Check if backend is running:
```bash
# Test Mock Maximo
curl http://localhost:9000/health

# Test FastAPI Bridge
curl http://localhost:8000/health
```

2. If not responding, start backend services first

### Issue 6: npm install fails

**Error**: Various npm errors

**Solution**:
```bash
cd frontend
# Clear cache
npm cache clean --force
# Delete node_modules
rmdir /s node_modules
# Reinstall
npm install
```

### Issue 7: Voice WO Takes Too Long (>90s)

**Causes**:
- First request (cold start) - normal
- Slow internet connection
- watsonx.ai service busy

**Solutions**:
- Warm up before demo: Test one WO first
- Check internet connection
- Have backup video ready

### Issue 8: Browser Doesn't Open Automatically

**Solution**:
Manually open browser and go to: http://localhost:3000

### Issue 9: Python Version Mismatch

**Error**: Packages installed but not found

**Solution**:
```bash
# Check which Python is being used
where python

# Use specific Python version
py -3.12 -m pip install -r backend/requirements.txt
py -3.12 backend/maximo_mock.py
```

## Quick Verification Commands

### Check if Services are Running

```powershell
# PowerShell
Invoke-WebRequest -Uri http://localhost:9000/health
Invoke-WebRequest -Uri http://localhost:8000/health
```

```bash
# Command Prompt
curl http://localhost:9000/health
curl http://localhost:8000/health
```

### Check Python Packages

```bash
python -m pip list | findstr fastapi
python -m pip list | findstr uvicorn
python -m pip list | findstr ibm-watson
```

### Check Node Packages

```bash
cd frontend
npm list react
npm list axios
```

## Manual Testing Steps

### 1. Test Mock Maximo
```bash
cd backend
python maximo_mock.py
```
Should see: `Uvicorn running on http://0.0.0.0:9000`

### 2. Test FastAPI Bridge
```bash
cd backend
python main.py
```
Should see: `Uvicorn running on http://0.0.0.0:8000`

### 3. Test Frontend
```bash
cd frontend
npm start
```
Should see: `Compiled successfully!` and browser opens

## Getting Help

### Check Logs

**Backend Errors**: Look in the terminal windows where services are running

**Frontend Errors**: 
- Browser console (F12)
- Terminal where npm start is running

### Verify Setup

Run through SETUP_COMPLETE.md checklist:
- [ ] Python 3.9+ installed
- [ ] Node.js 16+ installed
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] .env file configured
- [ ] All 3 services can start

### Still Having Issues?

1. Check `docs/SETUP_GUIDE.md` for detailed setup
2. Review `SETUP_COMPLETE.md` for configuration
3. Verify all files are present (use `dir` or `ls`)
4. Try restarting your computer
5. Check Windows Firewall isn't blocking ports

## Success Indicators

When everything works:
- ✅ 3 terminal windows open and stay open
- ✅ Mock Maximo shows "Uvicorn running"
- ✅ FastAPI Bridge shows "Uvicorn running"
- ✅ Browser opens to http://localhost:3000
- ✅ Dashboard loads with 5 assets visible
- ✅ No red error messages in any terminal

## Emergency Demo Backup

If nothing works on demo day:
1. Use the backup video (record one during rehearsal)
2. Walk through the code and architecture
3. Show the documentation and design
4. Explain the technical approach

The engineering is sound - technical difficulties happen!