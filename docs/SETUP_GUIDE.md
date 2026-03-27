# MaxAR Field Engineer - Setup Guide

## Prerequisites

- Python 3.9 or higher
- Node.js 16 or higher
- npm or yarn
- IBM Cloud account (for watsonx.ai)
- Git

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
# Copy the template
cp .env.template .env

# Edit .env with your credentials
# Required variables:
# - WATSONX_APIKEY: Your IBM Cloud API key
# - WATSONX_PROJECT_ID: Your watsonx.ai project ID
# - WATSONX_URL: https://eu-de.ml.cloud.ibm.com
# - MAXIMO_BASE_URL: http://localhost:9000 (for mock)
# - MAXIMO_API_KEY: any_value (mock ignores this)
```

### 3. Get IBM Cloud Credentials

#### watsonx.ai API Key:
1. Go to https://cloud.ibm.com
2. Navigate to Manage → Access (IAM) → API keys
3. Click "Create" and copy the API key
4. Paste into `.env` as `WATSONX_APIKEY`

#### watsonx.ai Project ID:
1. Go to https://dataplatform.cloud.ibm.com/wx/home
2. Create or open a project
3. Go to Manage tab → General
4. Copy the Project ID
5. Paste into `.env` as `WATSONX_PROJECT_ID`

### 4. Start the Mock Maximo Server

```bash
# Terminal 1
cd backend
python maximo_mock.py
```

Server will start on http://localhost:9000

Test it:
```bash
curl http://localhost:9000/health
```

### 5. Start the FastAPI Bridge

```bash
# Terminal 2
cd backend
python main.py
```

Server will start on http://localhost:8000

Test it:
```bash
curl http://localhost:8000/health
curl http://localhost:8000/assets
```

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm start
```

Application will open at http://localhost:3000

## Verification Checklist

- [ ] Mock Maximo API responding at http://localhost:9000/health
- [ ] FastAPI bridge responding at http://localhost:8000/health
- [ ] Frontend loads at http://localhost:3000
- [ ] Assets visible in sidebar
- [ ] Can select an asset and view details
- [ ] Voice WO tab loads test transcriptions
- [ ] CV Identification tab functional
- [ ] Work Orders tab displays (empty initially)

## Testing the Voice WO Pipeline

### Using curl:

```bash
curl -X POST http://localhost:8000/voice-to-wo \
  -H "Content-Type: application/json" \
  -d '{"transcription": "Fault on transformer KEN-TR-001, overheating 95 degrees, priority high"}'
```

Expected response:
```json
{
  "wo_number": "1001",
  "asset_id": "KEN-TR-001",
  "fault_description": "Overheating -- temperature 95C",
  "priority": 2,
  "required_trade": "ELECTRICIAN",
  "location": "Unit 3 control room",
  "elapsed_seconds": 28.4
}
```

### Using the Dashboard:

1. Navigate to "Voice WO" tab
2. Select a test transcription from dropdown
3. Click "Simulate Voice Command"
4. Wait for processing (should be < 90 seconds)
5. View the created work order
6. Check "Work Orders" tab to see it listed

## Troubleshooting

### Backend Issues

**Error: "Import 'fastapi' could not be resolved"**
- Solution: Ensure you're in the backend directory and run `pip install -r requirements.txt`

**Error: "WATSONX_APIKEY not found"**
- Solution: Create `.env` file from `.env.template` and add your credentials

**Error: "Connection refused to localhost:9000"**
- Solution: Start the mock Maximo server first: `python maximo_mock.py`

### Frontend Issues

**Error: "Module not found"**
- Solution: Run `npm install` in the frontend directory

**Error: "Network Error" when creating WO**
- Solution: Ensure FastAPI bridge is running on port 8000

**CORS Error**
- Solution: Both servers have CORS enabled. Check that FastAPI is running.

### watsonx.ai Issues

**Error: "Invalid API key"**
- Solution: Regenerate API key in IBM Cloud and update `.env`

**Error: "Project not found"**
- Solution: Verify project ID in watsonx.ai Studio → Manage → General

**Slow Response (> 90s)**
- This is normal for first request (cold start)
- Subsequent requests should be faster
- Check your internet connection

## Next Steps

1. **Collect CV Training Images**: See `CV_TRAINING_GUIDE.md`
2. **Run Integration Tests**: See `TESTING_GUIDE.md`
3. **Prepare Demo**: See `DEMO_SCRIPT.md`

## Support

For issues or questions:
- Check the main README.md
- Review the Complete Project Guide document
- Contact: i3 Technologies team