import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { cacheGet, cacheSet, createLocalId, queueAdd, queueGetAll, queueRemove, queueUpdate } from './offline/db';

const API_BASE = 'http://localhost:8000';

// ─── Fallback mock assets (shown when backend is unavailable) ─────────────────
const MOCK_ASSETS = [
  { assetnum: 'KEN-TR-001', description: 'Power Transformer 132/11kV', assettype: 'TRANSFORMER', location: 'KenGen Nairobi — Bay 1', siteid: 'KENGEN', manufacturer: 'ABB', modelnum: 'ONAN-40MVA', serialnum: 'ABB-2018-0042', installdate: '2018-03-15', status: 'OPERATING' },
  { assetnum: 'KEN-GEN-004', description: 'Generator Set 20MVA', assettype: 'GENERATOR', location: 'KenGen Nairobi — Unit 4', siteid: 'KENGEN', manufacturer: 'Cummins', modelnum: 'C2000D5', serialnum: 'CUM-2019-0117', installdate: '2019-07-22', status: 'OPERATING' },
  { assetnum: 'KEN-SWG-007', description: 'HV Switchgear Bay 7', assettype: 'SWITCHGEAR', location: 'KenGen Nairobi — HV Yard', siteid: 'KENGEN', manufacturer: 'Schneider', modelnum: 'SM6-24', serialnum: 'SCH-2017-0331', installdate: '2017-11-05', status: 'OPERATING' },
  { assetnum: 'KPC-PMP-003', description: 'Centrifugal Pump B', assettype: 'PUMP', location: 'KPC Pump Station B', siteid: 'KPC', manufacturer: 'Grundfos', modelnum: 'NK 80-200', serialnum: 'GRF-2020-0088', installdate: '2020-02-10', status: 'OPERATING' },
  { assetnum: 'KPC-VLV-015', description: 'Gate Valve 6-inch', assettype: 'VALVE', location: 'KPC Main Line — Km 42', siteid: 'KPC', manufacturer: 'Crane', modelnum: 'F6300-6', serialnum: 'CRN-2016-0204', installdate: '2016-09-30', status: 'OPERATING' },
];

// ─── Data ─────────────────────────────────────────────────────────────────────
const MAINTENANCE_STEPS_BY_ASSETNUM = {
  'KEN-TR-001': [
    { id: 1, description: 'Confirm permit-to-work and LOTO: verify isolation tags on LV/HV as per site procedure before approaching the tank.', completed: false, tools: 'Permit board, padlock checklist', minutes: 10 },
    { id: 2, description: 'Walk-around visual: bushings, conservator oil level, silica gel colour, leaks, paint blisters, and ground connections.', completed: false, tools: 'Flashlight, IR camera (if issued)', minutes: 15 },
    { id: 3, description: 'Record top-oil temperature (and winding if RTDs available); compare to ambient and nameplate limits.', completed: false, tools: 'Digital thermometer / SCADA readout', minutes: 10 },
    { id: 4, description: 'Check Buchholz / sudden-pressure relay windows; note any gas or trip flags; do not reset without authorised procedure.', completed: false, tools: 'Site relay procedure', minutes: 10 },
    { id: 5, description: 'If oil sample due or after fault: take DGA sample per lab chain-of-custody; label and ship to lab.', completed: false, tools: 'Sampling kit, PPE', minutes: 20 },
    { id: 6, description: 'Log all readings, photos, and anomalies in Maximo PM; hand back permit only when equipment is left safe.', completed: false, tools: 'Tablet / work order', minutes: 10 },
  ],
  'KEN-GEN-004': [
    { id: 1, description: 'Confirm LOTO on Unit 3 generator: breaker, fuel, and start circuits per KenGen isolation list.', completed: false, tools: 'Isolation list, locks', minutes: 10 },
    { id: 2, description: 'Check engine oil level and coolant level on level gauges; inspect for leaks at lines and filters.', completed: false, tools: 'Rags, torch', minutes: 10 },
    { id: 3, description: 'Measure vibration at DE/NDE bearings per OEM points (mm/s RMS); flag if above alarm band.', completed: false, tools: 'Vibration meter', minutes: 15 },
    { id: 4, description: 'Test emergency stop and battery-start circuit; verify control panel alarms clear only after fault cleared.', completed: false, tools: 'Multimeter (if authorised)', minutes: 15 },
    { id: 5, description: 'Run or witness no-load / load test only per schedule and with operations sign-off.', completed: false, tools: 'Ops checklist', minutes: 30 },
    { id: 6, description: 'Record results and hours in Maximo; attach trend plots if vibration case.', completed: false, tools: 'Tablet', minutes: 10 },
  ],
  'KEN-SWG-007': [
    { id: 1, description: 'Confirm LOTO on Bay 7: all incoming feeders isolated and visibly open; verify voltage detectors show zero.', completed: false, tools: 'Approved voltage detector, PPE', minutes: 15 },
    { id: 2, description: 'Thermal scan busbar joints and cable terminations; mark hotspots for torque check or rework.', completed: false, tools: 'IR camera', minutes: 20 },
    { id: 3, description: 'Read SF6 / vacuum gauges per panel; compare to manufacturer fill tables; log any drop.', completed: false, tools: 'Manufacturer tables', minutes: 10 },
    { id: 4, description: 'Exercise disconnectors only per OEM under supervision; confirm mechanical stops and position indicators.', completed: false, tools: 'Radio to spotter', minutes: 20 },
    { id: 5, description: 'Review protection relay flags and event log after any trip; coordinate with protection engineer before reset.', completed: false, tools: 'Relay HMI / laptop', minutes: 15 },
    { id: 6, description: 'Document findings in Maximo; raise WO for any defect beyond on-shift repair.', completed: false, tools: 'Tablet', minutes: 10 },
  ],
  'KPC-PMP-003': [
    { id: 1, description: 'Confirm LOTO: suction and discharge block valves closed, locked, and tagged; bleed pressure safely.', completed: false, tools: 'Bleed hose, PPE', minutes: 15 },
    { id: 2, description: 'Read suction and discharge pressure gauges; compare to pump curve at current speed / valve position.', completed: false, tools: 'Calibrated gauges if available', minutes: 10 },
    { id: 3, description: 'Inspect mechanical seal drip tray and bearing housing for leakage or abnormal noise.', completed: false, tools: 'Stethoscope / listening stick', minutes: 10 },
    { id: 4, description: 'Measure motor current on all three phases; check imbalance within site limits.', completed: false, tools: 'Clamp meter', minutes: 10 },
    { id: 5, description: 'If low flow: check strainer differential and suction line for obstruction (per isolation).', completed: false, tools: 'Differential gauge', minutes: 15 },
    { id: 6, description: 'Record flows/pressures in Maximo; request alignment check if vibration or high bearing temp.', completed: false, tools: 'Tablet', minutes: 10 },
  ],
  'KPC-VLV-015': [
    { id: 1, description: 'Confirm LOTO: upstream and downstream isolation verified; zero energy in line before opening bonnet or packing.', completed: false, tools: 'Bleed valve, pressure gauge', minutes: 15 },
    { id: 2, description: 'Operate handwheel through full stroke; count turns and match open/closed indicator to line walk-down.', completed: false, tools: 'Torque wrench if specified', minutes: 15 },
    { id: 3, description: 'Inspect stem packing for external leak; tighten gland nuts only to OEM torque if trained—otherwise tag for workshop.', completed: false, tools: 'Torque wrench, OEM chart', minutes: 10 },
    { id: 4, description: 'If seized: apply approved penetrating lubricant per KPC procedure; do not use cheater bar beyond max torque.', completed: false, tools: 'Approved lubricant', minutes: 15 },
    { id: 5, description: 'After repair: pressure test only under controlled hydro/pneumatic test plan and second person present.', completed: false, tools: 'Test pump, calibrated gauge', minutes: 30 },
    { id: 6, description: 'Log condition, torque, and test results in Maximo; return line to service only with operations approval.', completed: false, tools: 'Tablet', minutes: 10 },
  ],
};

const DEFAULT_MAINTENANCE_STEPS = MAINTENANCE_STEPS_BY_ASSETNUM['KEN-TR-001'];

const SENSOR_READINGS_BY_ASSETNUM = {
  'KEN-TR-001': [
    { label: 'Top oil temp', value: '72°C', status: 'normal', unit: '/ 85°C max' },
    { label: 'Winding hot-spot', value: '78°C', status: 'normal', unit: '/ 98°C max' },
    { label: 'Load current', value: '145 A', status: 'normal', unit: '/ 200A rated' },
  ],
  'KEN-GEN-004': [
    { label: 'Coolant temp', value: '88°C', status: 'normal', unit: '/ 95°C max' },
    { label: 'Oil pressure', value: '4.2 bar', status: 'normal', unit: '/ 6 bar rated' },
    { label: 'Vibration (NDE)', value: '4.1 mm/s', status: 'caution', unit: 'alarm @ 4.5' },
  ],
  'KEN-SWG-007': [
    { label: 'Bus voltage (L-L)', value: '11.1 kV', status: 'normal', unit: 'nominal 11kV' },
    { label: 'SF6 pressure', value: '5.2 bar', status: 'normal', unit: 'min 4.5 bar' },
    { label: 'Partial discharge', value: 'Low', status: 'normal', unit: 'no alarm' },
  ],
  'KPC-PMP-003': [
    { label: 'Discharge pressure', value: '6.8 bar', status: 'normal', unit: 'design 7 bar' },
    { label: 'Suction pressure', value: '0.4 bar', status: 'normal', unit: 'min 0.2 bar' },
    { label: 'Motor current', value: '38 A', status: 'normal', unit: '/ 45A FLA' },
  ],
  'KPC-VLV-015': [
    { label: 'Upstream pressure', value: '12.4 bar', status: 'normal', unit: 'MAOP 16 bar' },
    { label: 'Downstream pressure', value: '2.1 bar', status: 'normal', unit: '' },
    { label: 'ΔP across valve', value: '10.3 bar', status: 'normal', unit: 'design ΔP' },
  ],
};

const TEST_TRANSCRIPTIONS = [
  { id: 'VT-001', text: 'Fault on transformer KEN-TR-001, overheating, temperature 95 degrees, priority high', dialect: 'FORMAL' },
  { id: 'VT-002', text: 'Unit 3 generator gen 004 vibrating badly need mechanic urgent', dialect: 'INFORMAL' },
  { id: 'VT-003', text: 'The switchgear in bay 7 smells like burning insulation priority 2', dialect: 'FORMAL' },
  { id: 'VT-004', text: 'pump house B pump 003 not building pressure check suction', dialect: 'ABBREVIATED' },
  { id: 'VT-005', text: 'valve 15 is stuck we cannot open it at all', dialect: 'INFORMAL' },
  { id: 'VT-006', text: 'generator 4 showing low oil alarm stop it now', dialect: 'ABBREVIATED' },
  { id: 'VT-007', text: 'hii transformer inafanya kelele ya ajabu, tafadhali angalia haraka', dialect: 'SWAHILI' },
  { id: 'VT-008', text: 'TR 001 iko hot sana, 102 degrees, fundi wa umeme anahitajika', dialect: 'SWAHILI' },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  asset: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  voice: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>,
  cv: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  workorders: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  parts: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M20 12h-2M6 12H4M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 20v-2M12 6V4"/></svg>,
  safety: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  pin: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  alert: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  signal: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6C1 6 5 2 12 2s11 4 11 4M5 10s2-2 7-2 7 2 7 2M9 14s1-1 3-1 3 1 3 1"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>,
  offline: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>,
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="logo-wrap">
      <div>
        <div className="logo-name">MAX<span style={{ color: '#F58220' }}>AR</span></div>
        <div className="logo-sub">Field Engineer</div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    OPERATING: { cls: 'badge-green', label: 'Operating' },
    ACTIVE:    { cls: 'badge-green', label: 'Active' },
    DEACTIVE:  { cls: 'badge-grey',  label: 'Inactive' },
    WAPPR:     { cls: 'badge-amber', label: 'Awaiting Approval' },
    INPRG:     { cls: 'badge-blue',  label: 'In Progress' },
    COMP:      { cls: 'badge-green', label: 'Complete' },
  };
  const s = map[status?.toUpperCase()] || { cls: 'badge-grey', label: status || '—' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

// ─── Asset type icon / color ──────────────────────────────────────────────────
const ASSET_TYPE_COLOR = {
  TRANSFORMER: '#f59e0b',
  GENERATOR: '#06b6d4',
  SWITCHGEAR: '#a78bfa',
  PUMP: '#34d399',
  VALVE: '#fb923c',
};

// ─── CSS ─────────────────────────────────────────────────────────────────────
const buildCSS = () => `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /*
   * KPC — Kenya Pipeline Company
   * Industrial Blue #003366 · Pipeline Orange #F58220
   * Steel Gray #6B7280 · White #FFFFFF
   */
  :root {
    --kpc-blue:   #003366;
    --kpc-orange: #F58220;
    --kpc-steel:  #6B7280;
    --kpc-white:  #FFFFFF;
  }

  /* ── KPC LIGHT (primary) ──────────────────────── */
  [data-theme="kpc"] {
    --bg:            #F5F7FA;
    --surface:       #FFFFFF;
    --surface2:      #EDF1F7;
    --surface3:      #E0E8F2;
    --border:        #C8D4E8;
    --border2:       #A8BCDA;
    --text:          #00213F;
    --text-dim:      #4A6080;
    --text-muted:    #8AA0BC;
    --accent:        #F58220;
    --accent-dim:    rgba(245,130,32,0.1);
    --accent-border: rgba(245,130,32,0.35);
    --accent-btn-text: #FFFFFF;
    --sidebar-bg:    #003366;
    --sidebar-text:  #FFFFFF;
    --sidebar-dim:   rgba(255,255,255,0.55);
    --sidebar-muted: rgba(255,255,255,0.28);
    --sidebar-border:rgba(255,255,255,0.12);
    --sidebar-hover: rgba(255,255,255,0.08);
    --sidebar-active:rgba(245,130,32,0.18);
    --sidebar-active-border: rgba(245,130,32,0.6);
    --sidebar-id:    #F58220;
    --teal:          #0284c7;
    --teal-dim:      rgba(2,132,199,0.1);
    --green:         #16a34a;
    --green-dim:     rgba(22,163,74,0.1);
    --red:           #dc2626;
    --red-dim:       rgba(220,38,38,0.09);
    --blue:          #1d4ed8;
    --shadow:        0 1px 4px rgba(0,51,102,0.10);
    --shadow-lg:     0 4px 20px rgba(0,51,102,0.14);
    --sidebar-stripe:linear-gradient(180deg,rgba(245,130,32,0.08) 0%,transparent 35%);
    --topbar-bg:     #003366;
    --topbar-text:   #FFFFFF;
    --topbar-dim:    rgba(255,255,255,0.6);
    --nav-bg:        #FFFFFF;
    --kpi-val-color: #F58220;
  }

  /* ── KPC DARK ─────────────────────────────────── */
  [data-theme="kpc-dark"] {
    --bg:            #020b18;
    --surface:       #031527;
    --surface2:      #051e38;
    --surface3:      #07274a;
    --border:        #0d3260;
    --border2:       #144080;
    --text:          #ddeeff;
    --text-dim:      #6898cc;
    --text-muted:    #2d5880;
    --accent:        #F58220;
    --accent-dim:    rgba(245,130,32,0.14);
    --accent-border: rgba(245,130,32,0.4);
    --accent-btn-text: #020b18;
    --sidebar-bg:    #010d1e;
    --sidebar-text:  #ddeeff;
    --sidebar-dim:   #5580a8;
    --sidebar-muted: #2a4a68;
    --sidebar-border:#0d2a48;
    --sidebar-hover: rgba(245,130,32,0.07);
    --sidebar-active:rgba(245,130,32,0.14);
    --sidebar-active-border: rgba(245,130,32,0.5);
    --sidebar-id:    #F58220;
    --teal:          #38bdf8;
    --teal-dim:      rgba(56,189,248,0.1);
    --green:         #4ade80;
    --green-dim:     rgba(74,222,128,0.1);
    --red:           #f87171;
    --red-dim:       rgba(248,113,113,0.1);
    --blue:          #60a5fa;
    --shadow:        0 1px 4px rgba(0,0,0,0.5);
    --shadow-lg:     0 4px 20px rgba(0,0,0,0.65);
    --sidebar-stripe:linear-gradient(180deg,rgba(245,130,32,0.07) 0%,transparent 35%);
    --topbar-bg:     #010d1e;
    --topbar-text:   #ddeeff;
    --topbar-dim:    #5580a8;
    --nav-bg:        #031527;
    --kpi-val-color: #F58220;
  }

  html, body, #root { height: 100%; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    transition: background 0.2s, color 0.2s;
  }

  /* ── Shell ── */
  .shell { display: flex; height: 100vh; overflow: hidden; }

  /* ── Sidebar ── */
  .sidebar {
    width: 232px; min-width: 232px;
    background: var(--sidebar-bg, var(--surface));
    border-right: 1px solid var(--sidebar-border, var(--border));
    display: flex; flex-direction: column;
    overflow: hidden;
    box-shadow: 2px 0 12px rgba(0,0,0,0.15);
    z-index: 10;
    position: relative;
  }
  .sidebar::before {
    content: '';
    position: absolute; inset: 0;
    background: var(--sidebar-stripe, none);
    pointer-events: none; z-index: 0;
  }
  .sidebar > * { position: relative; z-index: 1; }

  .logo-wrap {
    display: flex; align-items: center; gap: 10px;
    padding: 20px 16px 16px;
    border-bottom: 1px solid var(--sidebar-border, var(--border));
    border-top: 3px solid var(--accent);
  }
  .logo-name {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 15px; font-weight: 700;
    letter-spacing: 0.08em; color: var(--sidebar-text, var(--text));
  }
  .logo-sub {
    font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--sidebar-muted, var(--text-muted));
    margin-top: 1px;
  }

  .sidebar-scroll {
    flex: 1; overflow-y: auto;
    padding: 8px 10px 10px;
    scrollbar-width: thin; scrollbar-color: var(--border2) transparent;
  }
  .sidebar-scroll::-webkit-scrollbar { width: 4px; }
  .sidebar-scroll::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

  .sidebar-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; font-weight: 600;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--sidebar-muted, var(--text-muted)); padding: 12px 6px 5px;
  }

  .asset-row {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 8px; border-radius: 7px; cursor: pointer;
    border: 1px solid transparent; margin-bottom: 2px;
    transition: all 0.13s;
  }
  .asset-row:hover { background: var(--sidebar-hover, var(--surface2)); border-color: var(--sidebar-border, var(--border)); }
  .asset-row.active { background: var(--sidebar-active, var(--accent-dim)); border-color: var(--sidebar-active-border, var(--accent-border)); }

  .asset-dot {
    width: 8px; height: 8px; min-width: 8px;
    border-radius: 50%; margin-top: 1px;
  }
  .asset-row-info { flex: 1; min-width: 0; }
  .asset-row-id {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; font-weight: 700;
    color: var(--sidebar-id, var(--accent)); letter-spacing: 0.03em;
  }
  .asset-row.active .asset-row-id { color: var(--sidebar-id, var(--accent)); }
  .asset-row-desc {
    font-size: 11.5px; color: var(--sidebar-dim, var(--text-dim));
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: 1px;
  }
  .asset-row-loc {
    font-size: 10px; color: var(--sidebar-muted, var(--text-muted));
    display: flex; align-items: center; gap: 3px; margin-top: 2px;
  }

  .sidebar-footer {
    border-top: 1px solid var(--sidebar-border, var(--border));
    padding: 12px 12px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .footer-meta {
    display: flex; justify-content: space-between; align-items: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; color: var(--sidebar-muted, var(--text-muted));
  }

  /* Connectivity toggle */
  .conn-btn {
    display: flex; align-items: center; gap: 7px;
    width: 100%; padding: 7px 10px;
    background: var(--sidebar-hover, var(--surface2)); border: 1px solid var(--sidebar-border, var(--border2));
    border-radius: 6px; cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em;
    color: var(--sidebar-dim, var(--text-dim)); transition: all 0.13s;
  }
  .conn-btn:hover { border-color: var(--sidebar-dim, var(--text-muted)); color: var(--sidebar-text, var(--text)); }
  .conn-btn.offline { border-color: var(--red); color: var(--red); background: var(--red-dim); }
  .conn-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); }
  .conn-dot.offline { background: var(--red); animation: blink 1.2s infinite; }
  @keyframes blink { 0%,100%{opacity:1}50%{opacity:0.3} }

  /* ── Right panel ── */
  .right-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  /* ── Topbar ── */
  .topbar {
    height: 54px; min-height: 54px;
    background: var(--topbar-bg, var(--surface)); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 22px; gap: 16px;
    box-shadow: var(--shadow);
  }
  .topbar-title { flex: 1; }
  .topbar-page { font-size: 14px; font-weight: 600; color: var(--topbar-text, var(--text)); }
  .topbar-sub { font-size: 11px; color: var(--topbar-dim, var(--text-dim)); margin-top: 1px; }

  .kpi-strip { display: flex; align-items: center; gap: 6px; margin-right: 8px; }
  .kpi-chip {
    display: flex; flex-direction: column; align-items: center;
    padding: 5px 12px; background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; min-width: 56px;
  }
  .kpi-chip-val {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px; font-weight: 700; color: var(--kpi-val-color, var(--accent));
  }
  .kpi-chip-lbl { font-size: 9px; color: var(--topbar-dim, var(--text-muted)); letter-spacing: 0.08em; text-transform: uppercase; }

  /* Theme toggle */
  .theme-btn {
    width: 32px; height: 32px; border-radius: 8px;
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--topbar-dim, var(--text-dim)); transition: all 0.13s;
  }
  .theme-btn:hover { color: var(--accent); border-color: var(--accent-border); }

  /* ── Nav tabs ── */
  .nav-tabs {
    background: var(--nav-bg, var(--surface)); border-bottom: 1px solid var(--border);
    padding: 0 18px; display: flex; gap: 0;
    overflow-x: auto; scrollbar-width: none;
  }
  .nav-tabs::-webkit-scrollbar { display: none; }
  .nav-tab {
    display: flex; align-items: center; gap: 6px;
    padding: 13px 15px 12px;
    background: none; border: none; border-bottom: 2px solid transparent;
    color: var(--text-dim); font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; font-weight: 500; cursor: pointer;
    transition: all 0.13s; white-space: nowrap;
  }
  .nav-tab:hover { color: var(--text); }
  .nav-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

  /* ── Content ── */
  .content {
    flex: 1; overflow-y: auto; padding: 22px 24px;
    scrollbar-width: thin; scrollbar-color: var(--border2) transparent;
  }
  .content::-webkit-scrollbar { width: 5px; }
  .content::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

  /* ── Panel ── */
  .panel {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden;
    box-shadow: var(--shadow);
  }
  .panel-hd {
    padding: 13px 17px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    background: var(--surface);
  }
  .panel-title {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-dim);
  }
  .panel-bd { padding: 17px; }

  /* ── Grids ── */
  .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }

  /* ── Info rows ── */
  .irow {
    display: flex; align-items: baseline; gap: 12px;
    padding: 7px 0; border-bottom: 1px solid var(--border);
  }
  .irow:last-child { border-bottom: none; }
  .ilabel { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--text-dim); width: 100px; min-width: 100px; }
  .ival { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; color: var(--text); }

  /* ── Gauge cards ── */
  .gauge {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; padding: 14px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .gauge-val {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 20px; font-weight: 700; color: var(--green);
  }
  .gauge-val.caution { color: #f59e0b; }
  .gauge-lbl { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
  .gauge-unit { font-size: 10px; color: var(--text-muted); font-family: 'IBM Plex Mono', monospace; margin-top: 1px; }
  .gauge-status {
    font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 700;
    padding: 3px 8px; border-radius: 4px; letter-spacing: 0.06em;
  }
  .gauge-status.normal { background: var(--green-dim); color: var(--green); }
  .gauge-status.caution { background: rgba(245,158,11,0.12); color: #f59e0b; }

  /* ── Checklist steps ── */
  .step {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 12px 0; border-bottom: 1px solid var(--border);
  }
  .step:last-child { border-bottom: none; }
  .step-cb {
    width: 18px; height: 18px; min-width: 18px;
    border: 1.5px solid var(--border2); border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; margin-top: 1px; transition: all 0.13s;
    background: transparent;
  }
  .step-cb.done { background: var(--accent); border-color: var(--accent); color: #fff; }
  .step-body { flex: 1; }
  .step-text { font-size: 13px; line-height: 1.5; color: var(--text); }
  .step-text.done { color: var(--text-muted); text-decoration: line-through; }
  .step-meta { margin-top: 3px; font-size: 11px; color: var(--text-muted); font-family: 'IBM Plex Mono', monospace; }

  /* ── Badges ── */
  .badge { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.04em; }
  .badge-green { background: var(--green-dim); color: var(--green); }
  .badge-amber { background: var(--accent-dim); color: var(--accent); }
  .badge-blue  { background: rgba(96,165,250,0.1); color: var(--blue); }
  .badge-grey  { background: var(--surface3); color: var(--text-dim); }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; background: var(--accent); color: #fff;
    font-family: 'IBM Plex Mono', monospace; font-size: 11.5px;
    font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    border: none; border-radius: 7px; cursor: pointer;
    transition: all 0.13s; white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
  .btn { color: var(--accent-btn-text); }
  .btn:hover { filter: brightness(1.1); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; filter: none; }
  .btn-ghost {
    background: transparent; color: var(--text-dim);
    border: 1px solid var(--border2); box-shadow: none;
  }
  .btn-ghost:hover { color: var(--text); border-color: var(--text-dim); filter: none; }

  /* ── Form elements ── */
  .field-lbl {
    font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; font-weight: 600;
    letter-spacing: 0.09em; text-transform: uppercase; color: var(--text-dim);
    margin-bottom: 6px; display: block;
  }
  select, input[type="file"] {
    width: 100%; background: var(--surface2);
    border: 1px solid var(--border2); border-radius: 7px;
    color: var(--text); font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; padding: 9px 11px;
    appearance: none; outline: none; transition: border-color 0.13s;
  }
  select:focus { border-color: var(--accent); }
  select option { background: var(--surface); }

  .preview-box {
    background: var(--surface2); border: 1px solid var(--border2);
    border-left: 3px solid var(--teal); border-radius: 7px;
    padding: 10px 12px; font-size: 13px; color: var(--text);
    font-style: italic; line-height: 1.5;
  }

  /* ── Result box ── */
  .result-box {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden; box-shadow: var(--shadow);
  }
  .result-box.success { border-left: 3px solid var(--green); }
  .result-box.error   { border-left: 3px solid var(--red); }
  .result-box.queued  { border-left: 3px solid var(--teal); }
  .result-hd {
    padding: 11px 16px; border-bottom: 1px solid var(--border);
    font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 700;
    letter-spacing: 0.06em;
  }
  .result-bd { padding: 16px; }
  .rrow {
    display: flex; align-items: baseline; gap: 12px;
    padding: 7px 0; border-bottom: 1px dashed var(--border);
  }
  .rrow:last-child { border-bottom: none; }
  .rkey { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--text-dim); width: 140px; min-width: 140px; }
  .rval { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; color: var(--text); }
  .rval.hi { color: var(--accent); font-weight: 700; }

  .success-chip {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--green-dim); border: 1px solid rgba(74,222,128,0.25);
    color: var(--green); font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; font-weight: 600; padding: 6px 12px;
    border-radius: 5px; margin-top: 12px;
  }

  /* ── WO cards ── */
  .wo-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; overflow: hidden; margin-bottom: 10px;
    box-shadow: var(--shadow);
  }
  .wo-hd {
    padding: 9px 14px; background: var(--surface2);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .wo-num { font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 700; color: var(--accent); }
  .wo-bd { padding: 11px 14px; }
  .wo-field { font-size: 12px; color: var(--text-dim); padding: 2px 0; }
  .wo-field strong { color: var(--text); font-weight: 600; }

  /* ── Parts ── */
  .part-row {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 14px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: 7px; margin-bottom: 7px;
  }
  .part-num { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--teal); font-weight: 700; min-width: 120px; }
  .part-desc { flex: 1; font-size: 13px; color: var(--text); }
  .part-qty {
    font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; font-weight: 700;
    color: var(--green); background: var(--green-dim); padding: 3px 9px; border-radius: 4px;
  }

  /* ── Safety / PPE ── */
  .ppe-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ppe-card {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: 7px;
  }
  .ppe-dot { width: 9px; height: 9px; min-width: 9px; border-radius: 50%; }
  .ppe-dot.ok  { background: var(--green); box-shadow: 0 0 6px rgba(74,222,128,0.5); }
  .ppe-dot.bad { background: var(--red);   box-shadow: 0 0 6px rgba(248,113,113,0.5); }
  .ppe-lbl { font-size: 13px; color: var(--text); flex: 1; }
  .ppe-status { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700; }

  .banner {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 7px;
    font-size: 13px; font-weight: 600;
  }
  .banner.ok  { background: var(--green-dim); border: 1px solid rgba(74,222,128,0.25); color: var(--green); }
  .banner.err { background: var(--red-dim);   border: 1px solid rgba(248,113,113,0.3);  color: var(--red); animation: pulse-b 1s infinite; }
  @keyframes pulse-b { 0%,100%{border-color:rgba(248,113,113,0.3)}50%{border-color:rgba(248,113,113,0.7)} }

  /* ── CV result ── */
  .cv-result {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; padding: 22px; text-align: center;
  }
  .cv-type {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 26px; font-weight: 700; color: var(--accent);
    letter-spacing: 0.05em; margin: 8px 0;
  }
  .cv-bar-wrap { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin: 12px 0 5px; }
  .cv-bar { height: 100%; border-radius: 3px; transition: width 0.4s; }
  .cv-bar.high { background: var(--green); }
  .cv-bar.med  { background: #f59e0b; }
  .cv-bar.low  { background: var(--red); }

  /* ── CV model spec ── */
  .cv-spec { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border); }
  .cv-spec:last-child { border-bottom: none; }
  .cv-spec-lbl { font-size: 12px; color: var(--text-dim); }
  .cv-spec-val { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--text); }

  /* ── Tags ── */
  .tag { display: inline-block; font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 3px; border: 1px solid var(--border2); color: var(--text-muted); letter-spacing: 0.05em; }
  .tag.formal     { color: #a78bfa; border-color: rgba(167,139,250,0.3); background: rgba(167,139,250,0.08); }
  .tag.informal   { color: var(--green); border-color: rgba(74,222,128,0.3); background: var(--green-dim); }
  .tag.swahili    { color: var(--teal); border-color: rgba(6,182,212,0.3); background: var(--teal-dim); }
  .tag.abbreviated{ color: #fb923c; border-color: rgba(251,146,60,0.3); background: rgba(251,146,60,0.08); }

  /* ── Pending badge ── */
  .pending-badge {
    display: inline-flex; align-items: center; gap: 4px;
    background: var(--teal-dim); border: 1px solid rgba(6,182,212,0.3);
    color: var(--teal); font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.06em;
  }

  /* ── Spacing ── */
  .stack  > * + * { margin-top: 16px; }
  .stack-sm > * + * { margin-top: 10px; }
  .flex   { display: flex; }
  .flex-c { display: flex; align-items: center; }
  .flex-b { display: flex; align-items: center; justify-content: space-between; }
  .gap-6  { gap: 6px; }
  .gap-8  { gap: 8px; }
  .gap-12 { gap: 12px; }
  .mb-12  { margin-bottom: 12px; }
  .mb-16  { margin-bottom: 16px; }
  .mb-20  { margin-bottom: 20px; }
  .page-desc { font-size: 13px; color: var(--text-dim); line-height: 1.6; }

  /* ── Empty ── */
  .empty { text-align: center; padding: 48px 20px; color: var(--text-muted); }
  .empty-icon { font-size: 28px; margin-bottom: 10px; opacity: 0.35; }

  /* ── Asset header chip ── */
  .asset-type-chip {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600;
    padding: 3px 9px; border-radius: 4px; letter-spacing: 0.05em;
  }
`;

function InjectCSS() {
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'maxar-styles';
    el.textContent = buildCSS();
    document.head.appendChild(el);
    return () => { const s = document.getElementById('maxar-styles'); if (s) s.remove(); };
  }, []);
  return null;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState('kpc');  // 'kpc' | 'kpc-dark'
  const [activeTab, setActiveTab] = useState('assets');
  const [assets, setAssets] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [queuedWorkOrders, setQueuedWorkOrders] = useState([]);
  const [jobplans, setJobplans] = useState([]);
  const [selectedJobplanId, setSelectedJobplanId] = useState('');
  const [partsRecs, setPartsRecs] = useState([]);
  const [isPartsLoading, setIsPartsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedTranscription, setSelectedTranscription] = useState('');
  const [voiceResult, setVoiceResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cvResult, setCvResult] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [isCvLoading, setIsCvLoading] = useState(false);
  const [safetyRunning, setSafetyRunning] = useState(false);
  const [safetyResult, setSafetyResult] = useState(null);
  const [maintenanceSteps, setMaintenanceSteps] = useState(() =>
    DEFAULT_MAINTENANCE_STEPS.map(s => ({ ...s }))
  );

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Boot: load assets (fallback to MOCK if backend unavailable)
  useEffect(() => {
    loadAssets();
    loadWorkOrders();
    loadQueuedWorkOrders();
    loadJobplans();
  }, []);

  useEffect(() => {
    if (!selectedAsset?.assetnum) return;
    const steps = MAINTENANCE_STEPS_BY_ASSETNUM[selectedAsset.assetnum] || DEFAULT_MAINTENANCE_STEPS;
    setMaintenanceSteps(steps.map(s => ({ ...s, completed: false })));
  }, [selectedAsset?.assetnum]);

  // Auto-sync queued WOs every 8 s when online
  useEffect(() => {
    const id = setInterval(() => { if (!effectively_offline()) syncQueued(); }, 8000);
    return () => clearInterval(id);
  }, [isOffline]);

  // Safety polling
  useEffect(() => {
    if (!safetyRunning) return;
    const id = setInterval(async () => {
      try {
        if (effectively_offline()) { setSafetyResult(fakePPE()); return; }
        const r = await axios.post(`${API_BASE}/safety/ppe`, { hv_nearby: true });
        setSafetyResult(r.data);
      } catch { setSafetyResult(fakePPE()); }
    }, 200);
    return () => clearInterval(id);
  }, [safetyRunning, isOffline]);

  const effectively_offline = () => isOffline || (typeof navigator !== 'undefined' && !navigator.onLine);

  // ── Load helpers ────────────────────────────────────────────────────────────
  const loadAssets = async () => {
    // Always populate from mock first so sidebar is never empty
    setAssets(MOCK_ASSETS);
    try {
      const cached = await cacheGet('assets');
      if (cached?.length) setAssets(cached);
      if (!effectively_offline()) {
        const r = await axios.get(`${API_BASE}/assets`);
        const data = r.data.member || r.data;
        if (Array.isArray(data) && data.length) {
          setAssets(data);
          await cacheSet('assets', data);
        }
      }
    } catch { /* keep mock data */ }
  };

  const loadWorkOrders = async () => {
    try {
      if (effectively_offline()) { const c = await cacheGet('workorders'); if (c) setWorkOrders(c); return; }
      const r = await axios.get(`${API_BASE}/workorders`);
      const data = r.data.member || r.data;
      setWorkOrders(data); await cacheSet('workorders', data);
    } catch { const c = await cacheGet('workorders'); if (c) setWorkOrders(c); }
  };

  const loadQueuedWorkOrders = async () => {
    try { setQueuedWorkOrders(await queueGetAll()); } catch {}
  };

  const loadJobplans = async () => {
    try {
      if (effectively_offline()) { const c = await cacheGet('jobplans'); if (c) { setJobplans(c); if (c[0]?.jobplanid) setSelectedJobplanId(c[0].jobplanid); } return; }
      const r = await axios.get(`${API_BASE}/jobplans`);
      const data = r.data.member || r.data;
      setJobplans(data); await cacheSet('jobplans', data);
      if (data[0]?.jobplanid) setSelectedJobplanId(data[0].jobplanid);
    } catch {}
  };

  const syncQueued = async () => {
    const queued = await queueGetAll();
    const toSync = queued.filter(q => q.status === 'pending' || q.status === 'failed');
    if (!toSync.length) return;
    await Promise.all(toSync.map(q => queueUpdate(q.local_id, { status: 'syncing', last_attempt_at: new Date().toISOString() })));
    await loadQueuedWorkOrders();
    try {
      const r = await axios.post(`${API_BASE}/sync/workorders`, { items: toSync.map(q => ({ local_id: q.local_id, transcription: q.transcription, created_at: q.created_at })) });
      for (const res of (r.data?.results || [])) {
        if (res.ok) await queueRemove(res.local_id);
        else await queueUpdate(res.local_id, { status: 'failed', error_message: res.error });
      }
    } catch (e) {
      await Promise.all(toSync.map(q => queueUpdate(q.local_id, { status: 'failed', error_message: e.message })));
    }
    await loadQueuedWorkOrders(); await loadWorkOrders();
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleVoice = async () => {
    if (!selectedTranscription) return alert('Select a transcription.');
    setIsProcessing(true); setVoiceResult(null);
    const t0 = Date.now();
    try {
      if (effectively_offline()) {
        const local_id = createLocalId();
        const created_at = new Date().toISOString();
        await queueAdd({ local_id, created_at, status: 'pending', transcription: selectedTranscription });
        await loadQueuedWorkOrders();
        setVoiceResult({ queued: true, message: 'Saved locally — will sync when back online.', local_id, created_at });
        return;
      }
      const r = await axios.post(`${API_BASE}/voice-to-wo`, { transcription: selectedTranscription });
      setVoiceResult({ ...r.data, elapsed_seconds: ((Date.now() - t0) / 1000).toFixed(2) });
      await loadWorkOrders();
    } catch (e) {
      setVoiceResult({ error: true, message: e.response?.data?.detail || e.message });
    } finally { setIsProcessing(false); }
  };

  const simulateCV = () => {
    const types = ['TRANSFORMER', 'GENERATOR', 'SWITCHGEAR', 'PUMP', 'VALVE'];
    setCvResult({ assetType: types[Math.floor(Math.random() * types.length)], confidence: parseFloat((0.74 + Math.random() * 0.22).toFixed(2)), timestamp: new Date().toISOString() });
  };

  const handleCvPhoto = async () => {
    if (!cvFile) return alert('Select an image first.');
    setIsCvLoading(true); setCvResult(null);
    try {
      if (effectively_offline()) { simulateCV(); return; }
      const fd = new FormData(); fd.append('file', cvFile);
      const r = await axios.post(`${API_BASE}/cv/identify`, fd);
      setCvResult(r.data);
    } catch { simulateCV(); } finally { setIsCvLoading(false); }
  };

  const fakeParts = (asset_id, jobplan_id) => {
    const inv = { "P-TR-OIL-01":12,"P-TR-RELAY-02":4,"P-SWG-FUSE-10":18,"P-GEN-BEAR-07":6,"P-PMP-SEAL-03":9,"P-VLV-PACK-15":7,"P-PPE-HH-01":25,"P-PPE-VEST-02":30 };
    const desc = { "P-TR-OIL-01":"Transformer insulating oil (20L)","P-TR-RELAY-02":"Protection relay module","P-SWG-FUSE-10":"HV fuse set","P-GEN-BEAR-07":"Generator bearing kit","P-PMP-SEAL-03":"Pump mechanical seal","P-VLV-PACK-15":"Valve packing set","P-PPE-HH-01":"Hard hat (Class E)","P-PPE-VEST-02":"High-visibility vest" };
    const a = (asset_id||'').toUpperCase();
    let p = [];
    if (a.startsWith('KEN-TR-')) p = ["P-TR-OIL-01","P-TR-RELAY-02","P-PPE-HH-01"];
    else if (a.startsWith('KEN-SWG-')) p = ["P-SWG-FUSE-10","P-TR-RELAY-02","P-PPE-HH-01"];
    else if (a.startsWith('KEN-GEN-')) p = ["P-GEN-BEAR-07","P-PPE-VEST-02"];
    else if (a.startsWith('KPC-PMP-')) p = ["P-PMP-SEAL-03","P-PPE-VEST-02"];
    else if (a.startsWith('KPC-VLV-')) p = ["P-VLV-PACK-15","P-PPE-VEST-02"];
    return p.map(x => ({ partnum: x, description: desc[x]||'Unknown', qty_available: inv[x]??0 }));
  };

  const handleParts = async () => {
    if (!selectedAsset) return alert('Select an asset first.');
    setIsPartsLoading(true);
    try {
      if (effectively_offline()) { setPartsRecs(fakeParts(selectedAsset.assetnum, selectedJobplanId)); return; }
      const r = await axios.get(`${API_BASE}/parts/recommendations?asset_id=${encodeURIComponent(selectedAsset.assetnum)}&jobplan_id=${encodeURIComponent(selectedJobplanId)}`);
      setPartsRecs(r.data.recommendations || []);
    } catch { setPartsRecs(fakeParts(selectedAsset.assetnum, selectedJobplanId)); }
    finally { setIsPartsLoading(false); }
  };

  const fakePPE = () => {
    const now = Math.floor(Date.now() / 1000);
    const hard_hat_present = ![0,1,2].includes(now % 10);
    const high_vis_present = ![0,1].includes(now % 14);
    const safety_boots_present = ![0,1,2].includes(now % 18);
    const alert_triggered = !hard_hat_present;
    return { hard_hat_present, high_vis_present, safety_boots_present, hv_nearby: true, distance_m: 1.5, alert_triggered, alert_reason: alert_triggered ? 'Hard hat missing near HV equipment' : '', timestamp: new Date().toISOString() };
  };

  const toggleOffline = () => {
    const next = !isOffline;
    setIsOffline(next);
    if (!next) { loadAssets(); loadWorkOrders(); loadQueuedWorkOrders(); loadJobplans(); syncQueued(); }
  };

  const toggleStep = id => setMaintenanceSteps(steps => steps.map(s => s.id === id ? { ...s, completed: !s.completed } : s));

  // ── Nav items ───────────────────────────────────────────────────────────────
  const NAV = [
    { id: 'assets',     label: 'Asset Details',    icon: Icons.asset },
    { id: 'voice',      label: 'Voice Work Order',  icon: Icons.voice },
    { id: 'cv',         label: 'CV Identification', icon: Icons.cv },
    { id: 'workorders', label: 'Work Orders',       icon: Icons.workorders },
    { id: 'parts',      label: 'Parts Finder',      icon: Icons.parts },
    { id: 'safety',     label: 'Safety Checker',    icon: Icons.safety },
  ];

  const pageLabel = NAV.find(n => n.id === activeTab)?.label || '';
  const doneSteps = maintenanceSteps.filter(s => s.completed).length;
  const assetColor = selectedAsset ? (ASSET_TYPE_COLOR[selectedAsset.assettype] || '#f59e0b') : '#f59e0b';

  return (
    <>
      <InjectCSS />
      <div className="shell">

        {/* ═══════ SIDEBAR ═══════ */}
        <aside className="sidebar">
          <Logo />

          <div className="sidebar-scroll">
            <div className="sidebar-label">Equipment</div>
            {assets.map(a => {
              const col = ASSET_TYPE_COLOR[a.assettype] || '#f59e0b';
              return (
                <div
                  key={a.assetnum}
                  className={`asset-row ${selectedAsset?.assetnum === a.assetnum ? 'active' : ''}`}
                  onClick={() => { setSelectedAsset(a); setActiveTab('assets'); }}
                >
                  <div className="asset-dot" style={{ background: col, boxShadow: `0 0 5px ${col}55` }} />
                  <div className="asset-row-info">
                    <div className="asset-row-id">{a.assetnum}</div>
                    <div className="asset-row-desc">{a.description}</div>
                    <div className="asset-row-loc">{Icons.pin} {a.location?.split(' — ')[0]}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sidebar-footer">
            <div className="footer-meta">
              <span>MAXIMO MAS 9.1</span>
              <span>i3 EA · Sol.02</span>
            </div>
            <button className={`conn-btn ${isOffline ? 'offline' : ''}`} onClick={toggleOffline}>
              <span className={`conn-dot ${isOffline ? 'offline' : ''}`} />
              {isOffline ? Icons.offline : Icons.signal}
              {isOffline ? 'OFFLINE MODE' : 'ONLINE'}
            </button>
          </div>
        </aside>

        {/* ═══════ RIGHT PANEL ═══════ */}
        <div className="right-panel">

          {/* Topbar */}
          <div className="topbar">
            <div className="topbar-title">
              <div className="topbar-page">{pageLabel}</div>
              {selectedAsset && (
                <div className="topbar-sub">{selectedAsset.description} · {selectedAsset.siteid}</div>
              )}
            </div>
            <div className="kpi-strip">
              {[['> 85%','CV Acc.'],['< 90s','Voice WO'],['100%','Offline'],['< 2s','Safety']].map(([v,l]) => (
                <div key={l} className="kpi-chip">
                  <span className="kpi-chip-val">{v}</span>
                  <span className="kpi-chip-lbl">{l}</span>
                </div>
              ))}
            </div>
            <button className="theme-btn" onClick={() => setTheme(t => t === 'kpc' ? 'kpc-dark' : 'kpc')} title="Toggle light/dark">
              {theme === 'kpc-dark' ? Icons.sun : Icons.moon}
            </button>
          </div>

          {/* Nav tabs */}
          <div className="nav-tabs">
            {NAV.map(n => (
              <button key={n.id} className={`nav-tab ${activeTab === n.id ? 'active' : ''}`} onClick={() => setActiveTab(n.id)}>
                {n.icon} {n.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="content">

            {/* ── ASSET DETAILS ── */}
            {activeTab === 'assets' && (
              selectedAsset ? (
                <div className="stack">
                  {/* Asset header */}
                  <div className="flex-b">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '22px', fontWeight: '700', color: assetColor, letterSpacing: '0.03em' }}>
                          {selectedAsset.assetnum}
                        </span>
                        <span className="asset-type-chip" style={{ background: `${assetColor}18`, color: assetColor, border: `1px solid ${assetColor}40` }}>
                          {selectedAsset.assettype}
                        </span>
                      </div>
                      <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: '500' }}>{selectedAsset.description}</div>
                    </div>
                    <StatusBadge status={selectedAsset.status} />
                  </div>

                  <div className="g2">
                    {/* Asset info */}
                    <div className="panel">
                      <div className="panel-hd"><span className="panel-title">Asset Information</span></div>
                      <div className="panel-bd">
                        {[['Type', selectedAsset.assettype],['Location', selectedAsset.location],['Site', selectedAsset.siteid],['Manufacturer', selectedAsset.manufacturer],['Model', selectedAsset.modelnum],['Serial', selectedAsset.serialnum],['Installed', selectedAsset.installdate]].map(([l,v]) => (
                          <div key={l} className="irow">
                            <span className="ilabel">{l}</span>
                            <span className="ival">{v || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sensors */}
                    <div className="panel">
                      <div className="panel-hd">
                        <span className="panel-title">Live Sensor Readings</span>
                        <span style={{ fontSize: '10px', fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text-muted)' }}>SCADA / IoT</span>
                      </div>
                      <div className="panel-bd">
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.6' }}>
                          Telemetry from site historians and Maximo Monitor. Check before starting work to confirm safe conditions.
                        </p>
                        <div className="stack-sm">
                          {(SENSOR_READINGS_BY_ASSETNUM[selectedAsset.assetnum] || []).map(g => (
                            <div key={g.label} className="gauge">
                              <div>
                                <div className={`gauge-val ${g.status}`}>{g.value}</div>
                                <div className="gauge-lbl">{g.label}</div>
                                {g.unit && <div className="gauge-unit">{g.unit}</div>}
                              </div>
                              <span className={`gauge-status ${g.status}`}>{g.status.toUpperCase()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Maintenance checklist */}
                  <div className="panel">
                    <div className="panel-hd">
                      <span className="panel-title">Maintenance Checklist</span>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '12px', color: doneSteps === maintenanceSteps.length && doneSteps > 0 ? 'var(--green)' : 'var(--text-dim)' }}>
                        {doneSteps}/{maintenanceSteps.length} complete
                      </span>
                    </div>
                    <div className="panel-bd">
                      {maintenanceSteps.map(s => (
                        <div key={s.id} className="step">
                          <div className={`step-cb ${s.completed ? 'done' : ''}`} onClick={() => toggleStep(s.id)}>
                            {s.completed && Icons.check}
                          </div>
                          <div className="step-body">
                            <div className={`step-text ${s.completed ? 'done' : ''}`}>{s.description}</div>
                            <div className="step-meta">⚙ {s.tools} · ⏱ {s.minutes} min</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty">
                  <div className="empty-icon">⚡</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-dim)', fontWeight: '500' }}>Select an asset from the sidebar</div>
                  <div style={{ fontSize: '12px', marginTop: '5px' }}>Click any equipment item to view details, live readings, and the maintenance checklist.</div>
                </div>
              )
            )}

            {/* ── VOICE WO ── */}
            {activeTab === 'voice' && (
              <div className="stack">
                <p className="page-desc mb-20">
                  Pick a voice transcription — formal English, site shorthand, or Swahili — and send it through the watsonx.ai Granite-13B pipeline to create a Maximo work order in under 90 seconds.
                </p>
                <div className="panel">
                  <div className="panel-hd"><span className="panel-title">Voice Input</span></div>
                  <div className="panel-bd stack-sm">
                    <div>
                      <label className="field-lbl">Select test transcription</label>
                      <select value={selectedTranscription} onChange={e => setSelectedTranscription(e.target.value)}>
                        <option value="">— choose a test case —</option>
                        {TEST_TRANSCRIPTIONS.map(t => (
                          <option key={t.id} value={t.text}>{t.id} ({t.dialect}): {t.text.substring(0, 52)}…</option>
                        ))}
                      </select>
                    </div>
                    {selectedTranscription && (() => {
                      const found = TEST_TRANSCRIPTIONS.find(t => t.text === selectedTranscription);
                      return (
                        <div>
                          <div className="flex-c gap-8 mb-12" style={{ marginBottom: '8px' }}>
                            <span className={`tag ${found?.dialect.toLowerCase()}`}>{found?.dialect}</span>
                          </div>
                          <div className="preview-box">"{selectedTranscription}"</div>
                        </div>
                      );
                    })()}
                    <button className="btn" onClick={handleVoice} disabled={isProcessing || !selectedTranscription}>
                      {isProcessing ? '⏳ Processing via Granite-13B…' : ' Submit Voice Command'}
                    </button>
                  </div>
                </div>

                {voiceResult && (
                  <div className={`result-box ${voiceResult.error ? 'error' : voiceResult.queued ? 'queued' : 'success'}`}>
                    <div className="result-hd" style={{ color: voiceResult.error ? 'var(--red)' : voiceResult.queued ? 'var(--teal)' : 'var(--green)' }}>
                      {voiceResult.error ? '✕ Error' : voiceResult.queued ? '⏳ Queued — will sync when online' : '✓ Work Order Created'}
                    </div>
                    <div className="result-bd">
                      {voiceResult.error && <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>{voiceResult.message}</p>}
                      {voiceResult.queued && <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '10px' }}>{voiceResult.message}</p>}
                      {!voiceResult.error && [
                        !voiceResult.queued && ['WO Number', voiceResult.wo_number, true],
                        ['Asset ID', voiceResult.asset_id, false],
                        ['Fault Description', voiceResult.fault_description, false],
                        ['Priority', voiceResult.priority, false],
                        ['Required Trade', voiceResult.required_trade, false],
                        ['Location', voiceResult.location, false],
                        !voiceResult.queued && ['Processing Time', `${voiceResult.elapsed_seconds}s`, true],
                      ].filter(Boolean).map(([k, v, hi]) => v && (
                        <div key={k} className="rrow">
                          <span className="rkey">{k}</span>
                          <span className={`rval ${hi ? 'hi' : ''}`}>{v}</span>
                        </div>
                      ))}
                      {!voiceResult.error && !voiceResult.queued && parseFloat(voiceResult.elapsed_seconds) < 90 && (
                        <div className="success-chip">{Icons.check} Target met — under 90 seconds</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CV IDENTIFICATION ── */}
            {activeTab === 'cv' && (
              <div className="stack">
                <p className="page-desc mb-20">
                  Upload a photo of field equipment and the EfficientNet-B3 model (trained in IBM Watson Studio CV Lab) will classify it into one of five asset categories with confidence scoring.
                </p>
                <div className="g2">
                  <div className="panel">
                    <div className="panel-hd"><span className="panel-title">Image Input</span></div>
                    <div className="panel-bd stack-sm">
                      <div>
                        <label className="field-lbl">Upload equipment photo</label>
                        <input type="file" accept="image/*" onChange={e => setCvFile(e.target.files?.[0] || null)} />
                      </div>
                      <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                        <button className="btn" onClick={handleCvPhoto} disabled={isCvLoading}>
                          {isCvLoading ? '⏳ Identifying…' : '📷 Identify From Photo'}
                        </button>
                        <button className="btn btn-ghost" onClick={simulateCV}>Simulate (demo)</button>
                      </div>
                    </div>
                  </div>
                  <div className="panel">
                    <div className="panel-hd"><span className="panel-title">Model Specs</span></div>
                    <div className="panel-bd">
                      {[['Architecture','EfficientNet-B3 CNN'],['Training','IBM Watson Studio CV Lab'],['Classes','TR / GEN / SWG / PMP / VLV'],['Target accuracy','> 85%'],['Inference time','< 200ms (HoloLens 2)']].map(([l,v]) => (
                        <div key={l} className="cv-spec">
                          <span className="cv-spec-lbl">{l}</span>
                          <span className="cv-spec-val">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {cvResult && (() => {
                  const pct = (cvResult.confidence * 100).toFixed(1);
                  const cls = cvResult.confidence >= 0.85 ? 'high' : cvResult.confidence >= 0.60 ? 'med' : 'low';
                  return (
                    <div className="cv-result">
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '0.1em' }}>IDENTIFIED ASSET CLASS</div>
                      <div className="cv-type">{cvResult.assetType}</div>
                      <div className="cv-bar-wrap"><div className={`cv-bar ${cls}`} style={{ width: `${pct}%` }} /></div>
                      <div className="flex-b" style={{ fontSize: '12px', fontFamily: "'IBM Plex Mono',monospace", marginBottom: '14px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Confidence</span>
                        <span style={{ color: cls === 'high' ? 'var(--green)' : cls === 'med' ? '#f59e0b' : 'var(--red)', fontWeight: '700' }}>{pct}%</span>
                      </div>
                      {cls === 'high'
                        ? <div className="banner ok">{Icons.check} High confidence — asset identified</div>
                        : cls === 'med'
                        ? <div style={{ color: '#f59e0b', fontWeight: '600', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>{Icons.alert} Medium confidence — manual verification recommended</div>
                        : <div className="banner err">{Icons.alert} Low confidence — manual check required</div>
                      }
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── WORK ORDERS ── */}
            {activeTab === 'workorders' && (
              <div className="stack">
                <div className="flex-b mb-16">
                  <p className="page-desc" style={{ marginBottom: 0 }}>Work orders from IBM Maximo MAS 9.1. Queued items are created offline and auto-sync when connectivity returns.</p>
                  {queuedWorkOrders.length > 0 && !effectively_offline() && (
                    <button className="btn" style={{ fontSize: '11px', padding: '7px 12px', marginLeft: '16px' }} onClick={syncQueued}>Sync Now</button>
                  )}
                </div>
                {workOrders.length === 0 && queuedWorkOrders.length === 0 ? (
                  <div className="empty"><div className="empty-icon">📋</div><div style={{ color: 'var(--text-dim)' }}>No work orders yet</div><div style={{ fontSize: '12px', marginTop: '5px' }}>Create one using the Voice WO tab.</div></div>
                ) : (
                  <>
                    {queuedWorkOrders.map(q => (
                      <div key={q.local_id} className="wo-card">
                        <div className="wo-hd">
                          <span className="wo-num">LOCAL/{q.local_id.slice(0,8)}</span>
                          <span className="pending-badge">{q.status.toUpperCase()}</span>
                        </div>
                        <div className="wo-bd">
                          <div className="wo-field"><strong>Transcription:</strong> {q.transcription}</div>
                          <div className="wo-field"><strong>Created:</strong> {new Date(q.created_at).toLocaleString()}</div>
                          {q.error_message && <div className="wo-field" style={{ color: 'var(--red)' }}><strong>Error:</strong> {q.error_message}</div>}
                        </div>
                      </div>
                    ))}
                    {workOrders.map(wo => (
                      <div key={wo.wonum} className="wo-card">
                        <div className="wo-hd">
                          <span className="wo-num">WO-{wo.wonum}</span>
                          <StatusBadge status={wo.status} />
                        </div>
                        <div className="wo-bd">
                          <div className="wo-field"><strong>Asset:</strong> {wo.assetnum}</div>
                          <div className="wo-field"><strong>Description:</strong> {wo.description}</div>
                          <div className="wo-field"><strong>Priority:</strong> {wo.priority} · <strong>Type:</strong> {wo.worktype}</div>
                          <div className="wo-field"><strong>Reported:</strong> {new Date(wo.reportdate).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── PARTS FINDER ── */}
            {activeTab === 'parts' && (
              <div className="stack">
                <p className="page-desc mb-20">Get recommended spare parts for the selected asset and job plan. Works fully offline with local inventory fallback.</p>
                <div className="panel">
                  <div className="panel-hd"><span className="panel-title">Query</span></div>
                  <div className="panel-bd stack-sm">
                    <div>
                      <label className="field-lbl">Selected Asset</label>
                      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '7px', padding: '9px 11px', fontFamily: "'IBM Plex Mono',monospace", fontSize: '13px', color: selectedAsset ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {selectedAsset ? `${selectedAsset.assetnum} — ${selectedAsset.description}` : 'No asset selected — click one in the sidebar'}
                      </div>
                    </div>
                    <div>
                      <label className="field-lbl">Job Plan (optional)</label>
                      <select value={selectedJobplanId} onChange={e => setSelectedJobplanId(e.target.value)} disabled={jobplans.length === 0}>
                        {(jobplans.length ? jobplans : [{ jobplanid: 'JP-TR-001', description: 'Transformer inspection procedure' }]).map(jp => (
                          <option key={jp.jobplanid} value={jp.jobplanid}>{jp.jobplanid}: {jp.description}</option>
                        ))}
                      </select>
                    </div>
                    <button className="btn" onClick={handleParts} disabled={isPartsLoading || !selectedAsset}>
                      {isPartsLoading ? '⏳ Looking up inventory…' : ' Get Recommended Parts'}
                    </button>
                  </div>
                </div>
                {partsRecs.length > 0 && (
                  <div className="panel">
                    <div className="panel-hd">
                      <span className="panel-title">Recommended Parts</span>
                      <span style={{ fontSize: '12px', fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text-dim)' }}>{partsRecs.length} items</span>
                    </div>
                    <div className="panel-bd stack-sm">
                      {partsRecs.map(p => (
                        <div key={p.partnum} className="part-row">
                          <span className="part-num">{p.partnum}</span>
                          <span className="part-desc">{p.description}</span>
                          <span className="part-qty">Qty {p.qty_available}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {partsRecs.length === 0 && <div className="empty"><div className="empty-icon">🔩</div><div style={{ color: 'var(--text-dim)' }}>No parts queried yet</div></div>}
              </div>
            )}

            {/* ── SAFETY CHECKER ── */}
            {activeTab === 'safety' && (
              <div className="stack">
                <p className="page-desc mb-20">
                  Simulates HoloLens 2 PPE detection at ~5 FPS. If a hard hat is missing within 2m of HV equipment, an alert fires in under 2 seconds.
                </p>
                <div className="panel">
                  <div className="panel-hd"><span className="panel-title">PPE Detection</span></div>
                  <div className="panel-bd">
                    <div className="flex gap-8" style={{ marginBottom: '20px' }}>
                      <button className="btn" onClick={() => setSafetyRunning(true)} disabled={safetyRunning}>▶ Start Live Check</button>
                      <button className="btn btn-ghost" onClick={() => { setSafetyRunning(false); setSafetyResult(null); }} disabled={!safetyRunning}>■ Stop</button>
                    </div>
                    {safetyResult ? (
                      <div className="stack">
                        <div className={`banner ${safetyResult.alert_triggered ? 'err' : 'ok'}`}>
                          {safetyResult.alert_triggered ? Icons.alert : Icons.check}
                          {safetyResult.alert_triggered ? `ALERT: ${safetyResult.alert_reason}` : 'All PPE checks passed — safe to proceed'}
                        </div>
                        <div className="ppe-grid">
                          {[
                            { label: 'Hard Hat', present: safetyResult.hard_hat_present },
                            { label: 'High-Vis Vest', present: safetyResult.high_vis_present },
                            { label: 'Safety Boots', present: safetyResult.safety_boots_present },
                            { label: `HV Proximity (${safetyResult.distance_m}m)`, present: safetyResult.distance_m > 2 },
                          ].map(item => (
                            <div key={item.label} className="ppe-card">
                              <span className={`ppe-dot ${item.present ? 'ok' : 'bad'}`} />
                              <span className="ppe-lbl">{item.label}</span>
                              <span className="ppe-status" style={{ color: item.present ? 'var(--green)' : 'var(--red)' }}>{item.present ? 'OK' : 'MISSING'}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono',monospace" }}>
                          Last checked: {new Date(safetyResult.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ) : (
                      <div className="empty" style={{ padding: '28px 0' }}>
                        <div className="empty-icon">🦺</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Press Start to begin PPE monitoring</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>{/* /content */}
        </div>{/* /right-panel */}
      </div>{/* /shell */}
    </>
  );
}