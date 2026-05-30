# Manual Start Guide - MaxAR Field Engineer

If the START_ALL.bat file doesn't work, follow these steps to start the services manually.

## Prerequisites Check

Before starting, verify:
```bash
# Check Python version (should be 3.9+)
python --version

# Check Node.js version (should be 16+)
node --version

# Check if packages are installed
python -m pip list | findstr fastapi
```

## Step-by-Step Manual Start

### Step 1: Open First Terminal (Mock Maximo API)

1. Press `Win + R`
2. Type `cmd` and press Enter
3. Run these commands:

```bash
cd C:\Users\tatsm\Desktop\Max-AR\backend
python maximo_mock.py
```

**Expected Output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:9000 (Press CTRL+C to quit)
```

**Keep this window open!**

### Step 2: Open Second Terminal (FastAPI Bridge)

1. Press `Win + R` again
2. Type `cmd` and press Enter
3. Run these commands:

```bash
cd C:\Users\tatsm\Desktop\Max-AR\backend
python main.py
```

**Expected Output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**Keep this window open!**

### Step 3: Open Third Terminal (Frontend Dashboard)

1. Press `Win + R` again
2. Type `cmd` and press Enter
3. Run these commands:

```bash
cd C:\Users\tatsm\Desktop\Max-AR\frontend
npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view maxar-demo-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

**Browser should open automatically to http://localhost:3000**

## Verification

### Test Backend Services

Open a new terminal and run:

```bash
# Test Mock Maximo
curl http://localhost:9000/health

# Test FastAPI Bridge  
curl http://localhost:8000/health

# Test Assets
curl http://localhost:8000/assets
```

All should return JSON responses.

### Test Frontend

1. Browser should show MaxAR dashboard
2. You should see:
   - Header with "MaxAR Field Engineer"
   - 5 assets in left sidebar
   - Green "ONLINE" button top right
   - KPI strip showing >85%, <90s, 100%

## If Something Goes Wrong

### Mock Maximo Won't Start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Fix**:
```bash
python -m pip install -r C:\Users\tatsm\Desktop\Max-AR\backend\requirements.txt
```

### Port Already in Use

**Error**: `Address already in use`

**Fix**: Close any other instances or change the port:
- Mock Maximo: Edit line 56 in `backend/maximo_mock.py`
- FastAPI: Edit line 181 in `backend/main.py`
- Frontend: Set `PORT=3001` before `npm start`

### Frontend Won't Start

**Error**: `Cannot find module`

**Fix**:
```bash
cd C:\Users\tatsm\Desktop\Max-AR\frontend
npm install
npm start
```

## Quick Test After Starting

Once all 3 services are running:

1. Go to http://localhost:3000 in browser
2. Click **KEN-TR-001** in sidebar
3. Asset details should load
4. Click **Voice WO** tab
5. Select **VT-001 (FORMAL)**
6. Click **"Simulate Voice Command"**
7. Wait 30-60 seconds
8. Should see WO created with number 1001

## Stopping Services

To stop all services:
1. Go to each terminal window
2. Press `Ctrl + C`
3. Close the window

## Alternative: Using PowerShell

If you prefer PowerShell:

```powershell
# Terminal 1
cd C:\Users\tatsm\Desktop\Max-AR\backend
python maximo_mock.py

# Terminal 2
cd C:\Users\tatsm\Desktop\Max-AR\backend
python main.py

# Terminal 3
cd C:\Users\tatsm\Desktop\Max-AR\frontend
npm start
```

## Success Checklist

- [ ] 3 terminal windows open and running
- [ ] Mock Maximo shows "Uvicorn running on http://0.0.0.0:9000"
- [ ] FastAPI shows "Uvicorn running on http://0.0.0.0:8000"
- [ ] Frontend shows "Compiled successfully!"
- [ ] Browser opens to http://localhost:3000
- [ ] Dashboard loads with 5 assets visible
- [ ] No error messages in any terminal

## Need More Help?

- Check `TROUBLESHOOTING.md` for common issues
- Review `SETUP_COMPLETE.md` for configuration
- See `docs/SETUP_GUIDE.md` for detailed setup

---

**Remember**: Keep all 3 terminal windows open while using the application!