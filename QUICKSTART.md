# MaxAR Field Engineer - Quick Start Guide

**Get the demo running in 15 minutes**

## Prerequisites Check

- [ ] Python 3.9+ installed: `python --version`
- [ ] Node.js 16+ installed: `node --version`
- [ ] Git installed: `git --version`
- [ ] IBM Cloud account created

## Step 1: Get IBM Credentials (5 minutes)

### watsonx.ai API Key
1. Go to https://cloud.ibm.com
2. Click your profile → Manage → Access (IAM) → API keys
3. Click "Create" → Name it "MaxAR" → Create
4. **Copy the API key** (you won't see it again!)

### watsonx.ai Project ID
1. Go to https://dataplatform.cloud.ibm.com/wx/home
2. Create a new project or open existing
3. Go to Manage tab → General
4. **Copy the Project ID**

## Step 2: Install Backend (3 minutes)

```bash
# Navigate to backend
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Configure environment
cp .env.template .env

# Edit .env file - add your credentials:
# WATSONX_APIKEY=your_api_key_here
# WATSONX_PROJECT_ID=your_project_id_here
```

**Windows users**: Use `notepad .env` to edit  
**Mac/Linux users**: Use `nano .env` or your preferred editor

## Step 3: Install Frontend (2 minutes)

```bash
# Navigate to frontend (from project root)
cd frontend

# Install Node dependencies
npm install
```

## Step 4: Start All Services (2 minutes)

Open **3 separate terminals**:

### Terminal 1 - Mock Maximo API
```bash
cd backend
python maximo_mock.py
```
Wait for: `Uvicorn running on http://0.0.0.0:9000`

### Terminal 2 - FastAPI Bridge
```bash
cd backend
python main.py
```
Wait for: `Uvicorn running on http://0.0.0.0:8000`

### Terminal 3 - Frontend Dashboard
```bash
cd frontend
npm start
```
Wait for: Browser opens at `http://localhost:3000`

## Step 5: Verify Setup (3 minutes)

### Test Backend Services

```bash
# Test Mock Maximo (should return status: ok)
curl http://localhost:9000/health

# Test FastAPI Bridge (should return status: ok)
curl http://localhost:8000/health

# Test Assets Endpoint (should return 5 assets)
curl http://localhost:8000/assets
```

### Test Frontend Dashboard

1. Browser should open automatically at http://localhost:3000
2. You should see:
   - ✅ Header with "MaxAR Field Engineer"
   - ✅ KPI strip showing >85%, <90s, 100%
   - ✅ Sidebar with 5 assets
   - ✅ Online/Offline toggle (green)

3. Click on **KEN-TR-001** in sidebar
   - Asset details should load
   - Sensor gauges should show values

4. Click **Voice WO** tab
   - Dropdown should show 8 test transcriptions

## Step 6: Test Voice WO Creation (Optional)

1. In Voice WO tab, select: **VT-001 (FORMAL)**
2. Click **"Simulate Voice Command"**
3. Wait 30-60 seconds
4. Should see:
   - ✅ WO Number: 1001
   - ✅ Asset ID: KEN-TR-001
   - ✅ Fault: "Overheating -- temperature 95C"
   - ✅ Time: XX.X seconds (under 90s)

5. Click **Work Orders** tab
   - New WO should appear in list

## Troubleshooting

### "Module not found" errors
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### "Port already in use"
- Kill the process using that port
- Or change port in code:
  - Mock Maximo: Edit `maximo_mock.py` line 56
  - FastAPI: Edit `main.py` line 181
  - Frontend: Set `PORT=3001` before `npm start`

### "WATSONX_APIKEY not found"
- Ensure `.env` file exists in `backend/` directory
- Check that you copied `.env.template` to `.env`
- Verify credentials are correct (no quotes needed)

### Voice WO returns error
- Check that watsonx.ai credentials are correct
- Verify you have access to Granite-13B model
- Try the health endpoint: `curl http://localhost:8000/health`

### Frontend shows "Network Error"
- Ensure FastAPI bridge is running on port 8000
- Check browser console for CORS errors
- Verify both backend services are running

## What's Next?

### For Demo Preparation:
1. Read `docs/DEMO_SCRIPT.md` for 8-minute demo flow
2. Practice the demo sequence
3. Test all 8 voice transcriptions
4. Record a backup video

### For Development:
1. Read `docs/SETUP_GUIDE.md` for detailed setup
2. Read `docs/CV_TRAINING_GUIDE.md` for CV model training
3. Check `docs/PROJECT_STATUS.md` for current status

### For Testing:
1. Test offline mode (toggle button)
2. Try all test transcriptions
3. Verify work orders are created
4. Test CV identification simulation

## Quick Reference

| Service | URL | Purpose |
|---------|-----|---------|
| Mock Maximo | http://localhost:9000 | Simulated Maximo API |
| FastAPI Bridge | http://localhost:8000 | Voice WO processing |
| Frontend Dashboard | http://localhost:3000 | Demo interface |

| Endpoint | Method | Description |
|----------|--------|-------------|
| /health | GET | Service health check |
| /assets | GET | Get all assets |
| /workorders | GET | Get all work orders |
| /voice-to-wo | POST | Create WO from voice |

## Demo Assets

- **KEN-TR-001**: Power Transformer 132/11kV (ABB)
- **KEN-GEN-004**: Generator Set 20MVA (Cummins)
- **KEN-SWG-007**: HV Switchgear Bay 7 (Schneider)
- **KPC-PMP-003**: Centrifugal Pump B (Grundfos)
- **KPC-VLV-015**: Gate Valve 6-inch (Crane)

## Success Metrics

- ✅ CV Accuracy: >85% (target)
- ✅ Voice WO Time: <90s (target)
- ✅ Offline Mode: 100% functional
- ✅ All 5 assets loaded
- ✅ All 8 test transcriptions working

---

**Need Help?** Check the full documentation in the `docs/` folder or review `README.md`

**Ready for Demo?** Follow `docs/DEMO_SCRIPT.md` for the 8-minute presentation flow