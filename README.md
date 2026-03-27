# MaxAR Field Engineer

**Augmented Reality Field Maintenance Platform**

IBM-powered AR solution for East African field engineers at KenGen and KPC sites. Solution 02 of 08 in the i3 East Africa Agentic AI Platform.

## 🎯 Core Features

- **Computer Vision Asset ID**: Identifies equipment from camera feed (>85% accuracy)
- **Voice Work Orders**: Creates Maximo WOs in <90 seconds via natural language
- **Offline-First**: 100% functionality in airplane mode with auto-sync
- **AR Overlay**: Real-time asset info, maintenance steps, and sensor data
- **Safety Checker**: PPE detection with instant alerts

## 🏗️ Architecture

```
HoloLens 2 / Web Dashboard
         ↓
   FastAPI Bridge
    ↙         ↘
watsonx.ai    Maximo MAS 9.1
(Granite-13B)  (Assets/WOs)
```

## 🚀 Quick Start

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Copy and configure environment
cp .env.template .env
# Edit .env with your IBM Cloud credentials

# Start mock Maximo server (terminal 1)
python maximo_mock.py

# Start FastAPI bridge (terminal 2)
python main.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

## 📊 Demo Assets

- **KEN-TR-001**: Power Transformer 132/11kV (ABB)
- **KEN-GEN-004**: Generator Set 20MVA (Cummins)
- **KEN-SWG-007**: HV Switchgear Bay 7 (Schneider)
- **KPC-PMP-003**: Centrifugal Pump B (Grundfos)
- **KPC-VLV-015**: Gate Valve 6-inch (Crane)

## 🧪 Testing Voice WO Pipeline

```bash
# Test with formal English
curl -X POST http://localhost:8000/voice-to-wo \
  -H "Content-Type: application/json" \
  -d '{"transcription": "Fault on transformer KEN-TR-001, overheating 95 degrees, priority high"}'

# Test with Pidgin dialect
curl -X POST http://localhost:8000/voice-to-wo \
  -H "Content-Type: application/json" \
  -d '{"transcription": "hii KEN-SWG-007 inafanya kelele nyingi, tafadhali angalia"}'
```

## 📈 Success Metrics

- ✅ CV Accuracy: >85% (Watson Studio validation)
- ✅ Voice WO Time: <90s (avg 65s in pilot)
- ✅ Offline Reliability: 100% (all features work)
- ✅ AR Positioning: <5cm (Azure Spatial Anchors)
- ✅ Safety Alert: <2s (PPE detection)

## 🛠️ Technology Stack

### IBM Products
- IBM watsonx.ai (Granite-13B NLP)
- IBM Maximo MAS 9.1 (Asset Management)
- IBM Watson Studio CV Lab (Computer Vision)
- IBM Cloud Object Storage

### Open Source
- Microsoft HoloLens 2
- Unity 2023.2 LTS + MRTK 3.x
- FastAPI + Uvicorn
- React + Three.js
- Azure Spatial Anchors

## 📁 Project Structure

```
Max-AR/
├── backend/
│   ├── main.py              # FastAPI bridge
│   ├── maximo_mock.py       # Mock Maximo API
│   ├── requirements.txt
│   └── .env.template
├── frontend/
│   ├── public/
│   └── src/
├── data/
│   ├── transformer/         # CV training images
│   ├── generator/
│   ├── switchgear/
│   ├── pump/
│   └── valve/
└── docs/
```

## 🎓 Team

- **Technical Lead**: Project coordination, Maximo setup, API integration
- **AR/Unity Developer**: HoloLens app, spatial mapping, MRTK
- **Voice AI Engineer**: watsonx.ai NLP, FastAPI bridge
- **CV/Offline Engineer**: Watson Studio CV, offline sync, SQLite

## 📅 Demo Day: March 30, 2026

**8-Minute Demo Flow:**
1. Asset identification via CV (0:00-1:30)
2. AR overlay with live data (1:30-3:00)
3. Voice WO creation (3:00-6:00)
4. Offline mode demonstration (6:00-7:00)
5. Metrics and ROI (7:00-8:00)

## 🔐 Credentials Required

- IBM Cloud API Key (watsonx.ai access)
- watsonx.ai Project ID
- Maximo API Key (or use mock server)
- Azure Spatial Anchors credentials (for HoloLens)

## 📞 Support

i3 Technologies | IBM Silver Partner CEID 7sq30  
Philip Mukiti | March 2026

---

**Target Clients**: 67 organizations across 6 sectors in East Africa  
**First Pilots**: KenGen Nairobi + KPC Kenya Pipeline Company