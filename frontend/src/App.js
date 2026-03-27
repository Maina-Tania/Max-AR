import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://localhost:8000';

// Test transcriptions from the project guide
const TEST_TRANSCRIPTIONS = [
  { id: 'VT-001', text: 'Fault on transformer KEN-TR-001, overheating, temperature 95 degrees, priority high', dialect: 'FORMAL' },
  { id: 'VT-002', text: 'Unit 3 generator gen 004 vibrating badly need mechanic urgent', dialect: 'INFORMAL' },
  { id: 'VT-003', text: 'The switchgear in bay 7 smells like burning insulation priority 2', dialect: 'FORMAL' },
  { id: 'VT-004', text: 'pump house B pump 003 not building pressure check suction', dialect: 'ABBREVIATED' },
  { id: 'VT-005', text: 'valve 15 is stuck we cannot open it at all', dialect: 'INFORMAL' },
  { id: 'VT-006', text: 'generator 4 showing low oil alarm stop it now', dialect: 'ABBREVIATED' },
  { id: 'VT-007', text: 'hii transformer inafanya kelele ya ajabu, tafadhali angalia haraka', dialect: 'PIDGIN' },
  { id: 'VT-008', text: 'TR 001 iko hot sana, 102 degrees, fundi wa umeme anahitajika', dialect: 'PIDGIN' },
];

function App() {
  const [activeTab, setActiveTab] = useState('assets');
  const [assets, setAssets] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedTranscription, setSelectedTranscription] = useState('');
  const [voiceResult, setVoiceResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cvResult, setCvResult] = useState(null);
  const [maintenanceSteps, setMaintenanceSteps] = useState([
    { id: 1, description: 'Visual inspection', completed: false, tools: 'Flashlight, Camera', minutes: 10 },
    { id: 2, description: 'Check oil level', completed: false, tools: 'Dipstick', minutes: 5 },
    { id: 3, description: 'Test protection relay', completed: false, tools: 'Multimeter', minutes: 15 },
    { id: 4, description: 'Record all readings in Maximo', completed: false, tools: 'Tablet', minutes: 5 },
  ]);

  // Load assets on mount
  useEffect(() => {
    loadAssets();
    loadWorkOrders();
  }, []);

  const loadAssets = async () => {
    try {
      if (isOffline) {
        // Load from localStorage cache
        const cached = localStorage.getItem('maxar_assets');
        if (cached) {
          setAssets(JSON.parse(cached));
        }
      } else {
        const response = await axios.get(`${API_BASE}/assets`);
        const assetData = response.data.member || response.data;
        setAssets(assetData);
        // Cache for offline use
        localStorage.setItem('maxar_assets', JSON.stringify(assetData));
      }
    } catch (error) {
      console.error('Error loading assets:', error);
      // Fallback to cache
      const cached = localStorage.getItem('maxar_assets');
      if (cached) {
        setAssets(JSON.parse(cached));
      }
    }
  };

  const loadWorkOrders = async () => {
    try {
      if (isOffline) {
        const cached = localStorage.getItem('maxar_workorders');
        if (cached) {
          setWorkOrders(JSON.parse(cached));
        }
      } else {
        const response = await axios.get(`${API_BASE}/workorders`);
        const woData = response.data.member || response.data;
        setWorkOrders(woData);
        localStorage.setItem('maxar_workorders', JSON.stringify(woData));
      }
    } catch (error) {
      console.error('Error loading work orders:', error);
      const cached = localStorage.getItem('maxar_workorders');
      if (cached) {
        setWorkOrders(JSON.parse(cached));
      }
    }
  };

  const handleVoiceCommand = async () => {
    if (!selectedTranscription) {
      alert('Please select a test transcription first');
      return;
    }

    setIsProcessing(true);
    setVoiceResult(null);
    const startTime = Date.now();

    try {
      const response = await axios.post(`${API_BASE}/voice-to-wo`, {
        transcription: selectedTranscription
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      setVoiceResult({
        ...response.data,
        elapsed_seconds: elapsed
      });

      // Reload work orders to show the new one
      await loadWorkOrders();
    } catch (error) {
      console.error('Error processing voice command:', error);
      setVoiceResult({
        error: true,
        message: error.response?.data?.detail || error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateCVIdentification = () => {
    // Simulate CV model identification
    const assetTypes = ['TRANSFORMER', 'GENERATOR', 'SWITCHGEAR', 'PUMP', 'VALVE'];
    const randomType = assetTypes[Math.floor(Math.random() * assetTypes.length)];
    const confidence = (0.75 + Math.random() * 0.2).toFixed(2);
    
    setCvResult({
      assetType: randomType,
      confidence: parseFloat(confidence),
      timestamp: new Date().toISOString()
    });
  };

  const toggleOfflineMode = () => {
    setIsOffline(!isOffline);
    if (!isOffline) {
      // Going offline - ensure cache is populated
      loadAssets();
      loadWorkOrders();
    }
  };

  const toggleMaintenanceStep = (stepId) => {
    setMaintenanceSteps(steps =>
      steps.map(step =>
        step.id === stepId ? { ...step, completed: !step.completed } : step
      )
    );
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>MaxAR Field Engineer</h1>
          <span className="subtitle">Augmented Reality Maintenance Platform</span>
        </div>
        <div className="header-right">
          <div className="kpi-strip">
            <div className="kpi">
              <span className="kpi-value">{'>'} 85%</span>
              <span className="kpi-label">CV Accuracy</span>
            </div>
            <div className="kpi">
              <span className="kpi-value">{'<'} 90s</span>
              <span className="kpi-label">Voice WO</span>
            </div>
            <div className="kpi">
              <span className="kpi-value">100%</span>
              <span className="kpi-label">Offline</span>
            </div>
          </div>
          <button 
            className={`offline-toggle ${isOffline ? 'offline' : 'online'}`}
            onClick={toggleOfflineMode}
          >
            {isOffline ? '📡 OFFLINE' : '🌐 ONLINE'}
          </button>
        </div>
      </header>

      <div className="main-container">
        {/* Sidebar - Asset List */}
        <aside className="sidebar">
          <h2>Assets</h2>
          <div className="asset-list">
            {assets.map(asset => (
              <div
                key={asset.assetnum}
                className={`asset-card ${selectedAsset?.assetnum === asset.assetnum ? 'selected' : ''}`}
                onClick={() => setSelectedAsset(asset)}
              >
                <div className="asset-type">{asset.assettype}</div>
                <div className="asset-id">{asset.assetnum}</div>
                <div className="asset-desc">{asset.description}</div>
                <div className="asset-location">📍 {asset.location}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="content">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'assets' ? 'active' : ''}`}
              onClick={() => setActiveTab('assets')}
            >
              Asset Details
            </button>
            <button
              className={`tab ${activeTab === 'voice' ? 'active' : ''}`}
              onClick={() => setActiveTab('voice')}
            >
              Voice WO
            </button>
            <button
              className={`tab ${activeTab === 'cv' ? 'active' : ''}`}
              onClick={() => setActiveTab('cv')}
            >
              CV Identification
            </button>
            <button
              className={`tab ${activeTab === 'workorders' ? 'active' : ''}`}
              onClick={() => setActiveTab('workorders')}
            >
              Work Orders
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'assets' && (
              <div className="asset-detail">
                {selectedAsset ? (
                  <>
                    <div className="detail-header">
                      <h2>{selectedAsset.description}</h2>
                      <span className={`status-badge ${selectedAsset.status.toLowerCase()}`}>
                        {selectedAsset.status}
                      </span>
                    </div>

                    <div className="detail-grid">
                      <div className="detail-section">
                        <h3>Asset Information</h3>
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="label">Asset ID:</span>
                            <span className="value">{selectedAsset.assetnum}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Type:</span>
                            <span className="value">{selectedAsset.assettype}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Location:</span>
                            <span className="value">{selectedAsset.location}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Manufacturer:</span>
                            <span className="value">{selectedAsset.manufacturer}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Model:</span>
                            <span className="value">{selectedAsset.modelnum}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Serial:</span>
                            <span className="value">{selectedAsset.serialnum}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Installed:</span>
                            <span className="value">{selectedAsset.installdate}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Site:</span>
                            <span className="value">{selectedAsset.siteid}</span>
                          </div>
                        </div>
                      </div>

                      <div className="detail-section">
                        <h3>Maintenance Steps</h3>
                        <div className="maintenance-steps">
                          {maintenanceSteps.map(step => (
                            <div key={step.id} className="step-item">
                              <input
                                type="checkbox"
                                checked={step.completed}
                                onChange={() => toggleMaintenanceStep(step.id)}
                              />
                              <div className="step-content">
                                <div className="step-desc">{step.description}</div>
                                <div className="step-meta">
                                  🔧 {step.tools} • ⏱️ {step.minutes} min
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="detail-section">
                        <h3>Live Sensor Readings</h3>
                        <div className="sensor-gauges">
                          <div className="gauge">
                            <div className="gauge-value" style={{color: '#4ade80'}}>72°C</div>
                            <div className="gauge-label">Temperature</div>
                            <div className="gauge-status normal">NORMAL</div>
                          </div>
                          <div className="gauge">
                            <div className="gauge-value" style={{color: '#fbbf24'}}>2.3mm/s</div>
                            <div className="gauge-label">Vibration</div>
                            <div className="gauge-status caution">CAUTION</div>
                          </div>
                          <div className="gauge">
                            <div className="gauge-value" style={{color: '#4ade80'}}>145A</div>
                            <div className="gauge-label">Current</div>
                            <div className="gauge-status normal">NORMAL</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <p>Select an asset from the sidebar to view details</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'voice' && (
              <div className="voice-wo">
                <h2>Voice Work Order Creation</h2>
                <p className="description">
                  Select a test transcription and simulate voice command processing through watsonx.ai Granite-13B
                </p>

                <div className="voice-input-section">
                  <label>Select Test Transcription:</label>
                  <select
                    value={selectedTranscription}
                    onChange={(e) => setSelectedTranscription(e.target.value)}
                    className="transcription-select"
                  >
                    <option value="">-- Choose a test case --</option>
                    {TEST_TRANSCRIPTIONS.map(t => (
                      <option key={t.id} value={t.text}>
                        {t.id} ({t.dialect}): {t.text.substring(0, 50)}...
                      </option>
                    ))}
                  </select>

                  {selectedTranscription && (
                    <div className="selected-transcription">
                      <strong>Selected:</strong> {selectedTranscription}
                    </div>
                  )}

                  <button
                    className="voice-button"
                    onClick={handleVoiceCommand}
                    disabled={isProcessing || !selectedTranscription}
                  >
                    {isProcessing ? '⏳ Processing...' : '🎤 Simulate Voice Command'}
                  </button>
                </div>

                {voiceResult && (
                  <div className={`voice-result ${voiceResult.error ? 'error' : 'success'}`}>
                    {voiceResult.error ? (
                      <>
                        <h3>❌ Error</h3>
                        <p>{voiceResult.message}</p>
                      </>
                    ) : (
                      <>
                        <h3>✅ Work Order Created</h3>
                        <div className="result-grid">
                          <div className="result-item">
                            <span className="label">WO Number:</span>
                            <span className="value highlight">{voiceResult.wo_number}</span>
                          </div>
                          <div className="result-item">
                            <span className="label">Asset ID:</span>
                            <span className="value">{voiceResult.asset_id}</span>
                          </div>
                          <div className="result-item">
                            <span className="label">Fault Description:</span>
                            <span className="value">{voiceResult.fault_description}</span>
                          </div>
                          <div className="result-item">
                            <span className="label">Priority:</span>
                            <span className="value">{voiceResult.priority}</span>
                          </div>
                          <div className="result-item">
                            <span className="label">Required Trade:</span>
                            <span className="value">{voiceResult.required_trade}</span>
                          </div>
                          <div className="result-item">
                            <span className="label">Location:</span>
                            <span className="value">{voiceResult.location}</span>
                          </div>
                          <div className="result-item">
                            <span className="label">Processing Time:</span>
                            <span className="value highlight">{voiceResult.elapsed_seconds}s</span>
                          </div>
                        </div>
                        {parseFloat(voiceResult.elapsed_seconds) < 90 && (
                          <div className="success-message">
                            ✅ Target achieved: Work order created in under 90 seconds!
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'cv' && (
              <div className="cv-identification">
                <h2>Computer Vision Asset Identification</h2>
                <p className="description">
                  Upload equipment photo for automatic identification (simulated)
                </p>

                <div className="cv-section">
                  <button className="cv-button" onClick={simulateCVIdentification}>
                    📷 Simulate CV Identification
                  </button>

                  {cvResult && (
                    <div className="cv-result">
                      <h3>Identification Result</h3>
                      <div className="cv-result-content">
                        <div className="cv-type">{cvResult.assetType}</div>
                        <div className="cv-confidence">
                          Confidence: <span className={cvResult.confidence >= 0.85 ? 'high' : 'medium'}>
                            {(cvResult.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        {cvResult.confidence >= 0.85 ? (
                          <div className="cv-status success">✅ High confidence - Asset identified</div>
                        ) : cvResult.confidence >= 0.60 ? (
                          <div className="cv-status warning">⚠️ Medium confidence - Manual verification recommended</div>
                        ) : (
                          <div className="cv-status error">❌ Low confidence - Manual check required</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="cv-info">
                    <h4>Model Information</h4>
                    <ul>
                      <li>Architecture: EfficientNet-B3 CNN</li>
                      <li>Training Platform: IBM Watson Studio CV Lab</li>
                      <li>Classes: TRANSFORMER, GENERATOR, SWITCHGEAR, PUMP, VALVE</li>
                      <li>Target Accuracy: {'>'} 85%</li>
                      <li>Inference Time: {'<'} 200ms on HoloLens 2</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'workorders' && (
              <div className="work-orders">
                <h2>Work Orders</h2>
                <div className="wo-list">
                  {workOrders.length === 0 ? (
                    <div className="empty-state">
                      <p>No work orders yet. Create one using the Voice WO tab.</p>
                    </div>
                  ) : (
                    workOrders.map(wo => (
                      <div key={wo.wonum} className="wo-card">
                        <div className="wo-header">
                          <span className="wo-number">WO #{wo.wonum}</span>
                          <span className={`wo-status ${wo.status.toLowerCase()}`}>{wo.status}</span>
                        </div>
                        <div className="wo-body">
                          <div className="wo-field">
                            <strong>Asset:</strong> {wo.assetnum}
                          </div>
                          <div className="wo-field">
                            <strong>Description:</strong> {wo.description}
                          </div>
                          <div className="wo-field">
                            <strong>Priority:</strong> {wo.priority}
                          </div>
                          <div className="wo-field">
                            <strong>Type:</strong> {wo.worktype}
                          </div>
                          <div className="wo-field">
                            <strong>Reported:</strong> {new Date(wo.reportdate).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;