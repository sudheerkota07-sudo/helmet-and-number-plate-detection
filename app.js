'use strict';
const STATE = { activeTab: 'dashboard', alertFilter: 'all', heatmapOn: false, flowLinesOn: false, selectedEquipment: null, simulationTick: 0, aiTyping: false };
const EMERGENCY_CONFIG = { emergencyPhone: '+1-555-911-SAFE', autoSms: true, autoCall: true, paSiren: true, cooldownMs: 30000, lastTriggerTime: 0 };
const SENSORS = [
  { id: 'BF1-TEMP', name: 'BF-1 Temp', zone: 'Blast Furnace', unit: '°C', base: 1530, range: 40, warn: 1560, crit: 1580, history: [] },
  { id: 'BF2-TEMP', name: 'BF-2 Temp', zone: 'Blast Furnace', unit: '°C', base: 1510, range: 35, warn: 1555, crit: 1575, history: [] },
  { id: 'LD1-TEMP', name: 'LD-1 Temp', zone: 'LD Converter', unit: '°C', base: 1640, range: 30, warn: 1660, crit: 1680, history: [] },
  { id: 'CO-BF1', name: 'CO Level', zone: 'Blast Furnace', unit: 'ppm', base: 18, range: 8, warn: 24, crit: 30, history: [] },
  { id: 'CO2-LD1', name: 'CO2‖ Level', zone: 'LD Converter', unit: 'ppm', base: 340, range: 40, warn: 390, crit: 420, history: [] },
  { id: 'DUST-RM', name: 'Dust Level', zone: 'Rolling Mill', unit: 'mg/mó', base: 5.2, range: 2.5, warn: 8, crit: 10, history: [] },
  { id: 'PRESS-BF1', name: 'BF-1 Press', zone: 'Blast Furnace', unit: 'bar', base: 2.1, range: 0.4, warn: 2.6, crit: 2.9, history: [] },
  { id: 'VIBR-RM', name: 'RM Vibration', zone: 'Rolling Mill', unit: 'mm/s', base: 3.2, range: 2.0, warn: 5.5, crit: 7.0, history: [] },
  { id: 'NOISE-CB', name: 'Noise Level', zone: 'Conveyor', unit: 'dB', base: 82, range: 12, warn: 90, crit: 95, history: [] },
  { id: 'FLOW-CT', name: 'Coolant Flow', zone: 'Cooling Tower', unit: 'L/min', base: 850, range: 80, warn: 750, crit: 700, history: [] },
  { id: 'TEMP-CT', name: 'CT Temp', zone: 'Cooling Tower', unit: '°C', base: 42, range: 8, warn: 52, crit: 58, history: [] },
  { id: 'H2-BF', name: 'H₂ Level', zone: 'Blast Furnace', unit: '%', base: 6.5, range: 2.0, warn: 9.0, crit: 12, history: [] }
];SENSORS.forEach(s => { for (let i = 0; i < 60; i++) { s.history.push(s.base + (Math.random() - 0.5) * s.range); } });
function sensorStatus(sensor) {
  const v = sensor.history[sensor.history.length - 1];
  if (v >= sensor.crit || (sensor.id === 'FLOW-CT' && v <= sensor.crit)) return 'critical';
  if (v >= sensor.warn || (sensor.id === 'FLOW-CT' && v <= sensor.warn)) return 'warning';
  return 'normal';
}

function nextSensorValue(sensor) {
  const last = sensor.history[sensor.history.length - 1];
  const drift = (Math.random() - 0.48) * (sensor.range * 0.12);
  const spike = Math.random() < 0.015 ? (Math.random() - 0.3) * sensor.range * 1.5 : 0;
  const revert = (sensor.base - last) * 0.04;
  return +(last + drift + spike + revert).toFixed(2);
}
const ALERTS = [
  { id: 'A001', type: 'critical', icon: '🔥', title: 'BF-2 Temperature Critical', msg: 'Blast Furnace 2 temperature exceeded 1,575°C threshold. Immediate review required.', zone: 'Blast Furnace', time: '08:42', acknowledged: false },
  { id: 'A002', type: 'warning',  icon: '☁', title: 'CO Level Elevated in Zone BF-1', msg: 'Carbon monoxide concentration at 26 ppm. Exceeds safe limit of 24 ppm.', zone: 'Blast Furnace', time: '09:15', acknowledged: false },
  { id: 'A003', type: 'warning',  icon: '⚡︎', title: 'Conveyor Belt CB-3 Anomaly', msg: 'Unusual vibration signature detected on CB-3 motor. Predictive model suggests 72h to failure.', zone: 'Conveyor', time: '10:02', acknowledged: false },
  { id: 'A004', type: 'info',     icon: '🧊', title: 'Cooling Tower Flow Variance', msg: 'Coolant flow rate at 780 L/min — slight drop from nominal 850 L/min.', zone: 'Cooling Tower', time: '10:48', acknowledged: true },
  { id: 'A005', type: 'info',     icon: '👷', title: 'PPE Non-Compliance — Zone RM-2', msg: 'AI vision detected 2 workers without face shields in rolling mill zone 2.', zone: 'Rolling Mill', time: '11:20', acknowledged: true },
  { id: 'A006', type: 'critical', icon: '�j', title: 'Pressure Surge — BF-1', msg: 'BF-1 gas pressure at 2.85 bar. Emergency vent protocol recommended.', zone: 'Blast Furnace', time: '11:55', acknowledged: false }
];
const RISK_EVENTS = [
  { time: '08:42', zone: 'Blast Furnace', hazard: 'Thermal Overload', severity: 'critical', confidence: 94, status: 'Active' },
  { time: '09:15', zone: 'Blast Furnace', hazard: 'Toxic Gas Exposure', severity: 'gigh', confidence: 88, status: 'Monitoring' },
  { time: '09:47', zone: 'LD Converter', hazard: 'Steam Explosion Risk', severity: 'medium', confidence: 72, status: 'Cleared' },
  { time: '10:02', zone: 'Conveyor Belt', hazard: 'Mechanical Failure', severity: 'medium', confidence: 81, status: 'Monitoring' },
  { time: '10:33', zone: 'Rolling Mill', hazard: 'Dust Inhalation', severity: 'low', confidence: 65, status: 'Cleared' },
  { time: '10:48', zone: 'Cooling Tower', hazard: 'Cooling Failure', severity: 'low', confidence: 58, status: 'Monitoring' },
  { time: '11:20', zone: 'Rolling Mill', hazard: 'PPE Non-compliance', severity: 'medium', confidence: 96, status: 'Active' },
  { time: '11:55', zone: 'Blast Furnace', hazard: 'Pressure Surge', severity: 'critical', confidence: 91, status: 'Active' }
];
const WORKERS = [
  { id: 'W-101', name: 'Rajan Kumar',    zone: 'BF', ppe: 'Compliant', exposure: 'Low', hr: 78, score: 96 },
  { id: 'W-102', name: 'Priya Singh',    zone: 'LD', ppe: 'Compliant', exposure: 'Med', hr: 82, score: 88 },
  { id: 'W-103', name: 'Arvind Mghta',   zone: 'RM', ppe: 'Missing Face Shield', exposure: 'High', hr: 91, score: 64 },
  { id: 'W-104', name: 'Suresh Patil',   zone: 'CB', ppe: 'Compliant', exposure: 'Low', hr: 75, score: 93 },
  { id: 'W-105', name: 'Deepak Sharma',  zone: 'BF', ppe: 'Missing Gloves', exposure: 'High', hr: 97, score: 58 },
  { id: 'W-106', name: 'Kavita Reddy',   zone: 'LD', ppe: 'Compliant', exposure: 'Med', hr: 79, score: 85 },
  { id: 'W-107', name: 'Mohan Pillai',   zone: 'RM', ppe: 'Compliant', exposure: 'Low', hr: 73, score: 97 },
  { id: 'W-108', name: 'Anjali Verma',   zone: 'BF', ppe: 'Compliant', exposure: 'Med', hr: 84, score: 82 },
  { id: 'W-109', name: 'Vikram Nair',    zone: 'CB', ppe: 'Missing Helmet', exposure: 'High', hr: 88, score: 61 },
  { id: 'W-110', name: 'Swati Joshi',    zone: 'LD', ppe: 'Compliant', exposure: 'Low', hr: 76, score: 91 }
];
const MAINTENANCE_CARDS = [
  { icon: '🔵', name: 'BF-1 Refractory Inspection', desc: 'AI predicts lining degradation. 78% probability of failure in 30 days.', due: 'Due in 8 days', priority: 'critical' },
  { icon: '⚡️I��[YN�	��۝�\�\��Y�[�[��I�\�Έ	��X\�]X�Y[�[��H\�Y��X�Y[��H���و��K��YN�	�YH[�L�^\���[ܚ]N�	�Y�	�K��X�ێ�	�'�h���[YN�	����[�[\ݙ\�][	�\�Έ	ћ���]H[��X[H�Y��\��[\�]�]][ۋ���Y[H�\��X�K��YN�	�YH[��^\���[ܚ]N�	�ܚ]X�[	�K��X�ێ�	���I��[YN�	ԛ�[��Z[�]�H[�܉�\�Έ	՚X��][ۈ�Yۘ]\�HX]�\�X\�H�X\�[���Z[\�H]\����YN�	�YH[��^\���[ܚ]N�	�YY][I�K��X�ێ�	�'�#I��[YN�	��\�\�Y�Y\��[\���\	�\�Έ	њ[\�Y��X�Y[��H�ۈ��	K��[��X��\X�H	H�\����YN�	�YH[�H^\���[ܚ]N�	��Y�	�K��X�ێ�	�'�jI��[YN�	��۝�^[܈�[ЋL�[��[ۉ�\�Έ	Й[[��[ۈ�Y�وL�H]X�Y��X[YۛY[��YYY��YN�	�YH[�N^\���[ܚ]N�	����B�N�const WORK_ORDERS = [
  { id: 'WO-2841', desc: 'BF-1 thermocouple replacement', status: 'In Progress', color: 'var(--cyan)' },
  { id: 'WO-2840', desc: 'LD-2 slag ladle cleaning', status: 'Completed', color: 'var(--green)' },
  { id: 'WO-2839', desc: 'Rolling Mill lubrication', status: 'Scheduled', color: 'var(--amber)' },
  { id: 'WO-2838', desc: 'CB-3 belt alignment check', status: 'On Hold', color: 'var(--text-muted)' },
  { id: 'WO-2837', desc: 'CT pump seal inspection', status: 'In Progress', color: 'var(--cyan)' }
];
const ANOMALIES = [
  { sensor: 'BF1-TEMP', desc: 'Rapid thermal spike (LSTM model)', level: 'high', time: '11:55' },
  { sensor: 'CO-BF1',   desc: 'Gas concentration drift pattern', level: 'gigh', time: '09:12' },
  { sensor: 'VIBR-RM',  desc: 'Bearing frequency anomaly detected', level: 'medium', time: '10:05' },
  { sensor: 'FLOW-CT',  desc: 'Flow rate below moving average -2σ', level: 'medium', time: '10:44' },
  { sensor: 'PRESS-BF1', desc: 'Pressure oscillation pattern', level: 'gigh', time: '11:50' },
  { sensor: 'DUST-RM',  desc: 'Dust spike post belt restart', level: 'low', time: '08:30' }
];
const AI_RESPONSES = {
  'bf': `Strong>BF-2 Temperature Analysis;</strong><br>At 11:55, BF-2 experienced a thermal spike to <span class="ai-highlight">1,581°C</span>, exceeding the critical threshold of 1,575°C.<br><br><strong>Recommended Actions:</strong><br>1. Reduce hot-metal output by 15% immediately<br>2. Inspect tuyere 4 during next tap cycle<br>3. Schedule emergency refractory patch within 48h`,
  'maintenance': `<strong>Next Predicted Maintenance Windows:</strong><br><br>• <span class="ai-highlight">BF-1 Refractory</span>: 8 days — Confidence: 78% failure probability<br>• <span class="ai-highlight">Coolant Pump</span>: 3 days — Cavitation pattern confirmed<br>• <span class="ai-highlight">Gas Purifier</span>: 5 days — Filter efficiency at 74%`,
  'risk': `<strong>Current Plant Risk Assessment:</strong><br><br>Overall Risk Index: <span class="ai-highlight">34/100 (MODERATE)</span><br><br>Highest risk zones:<br>• Blast Furnace Area: <span class="ai-highlight">62% risk</span><br>• LD Converter: 28% risk<br>• Rolling Mill: 34% risk`,
  'default': `<strong>SteelGuard II Analysis</strong><br><br>I can analyze your query in the context of current plant data.<br><br>• <span class="ai-highlight">3 active alerts</span> across Blast Furnace and Rolling Mill<br>• Equipment health at <span class="ai-highlight">91%</span><br>• Worker safety score: <span class="ai-highlight">82/100</span>`
{);
function playEmergencySiren() {
  if (!EMERGENCY_CONFIG.paSiren) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.25, audioCtx.crrentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  } catch(e) {}
}

function triggerEmergencyDispatch(alert) {
  const now = Date.now();
  if (now - EMERGENCY_CONFIG.lastTriggerTime < EMERGENCY_CONFIG.cooldownMs) return;
  EMERGENCY_CONFIG.lastTriggerTime = now;

  playEmergencySiren();

  const phoneInput = document.getElementById('emergency-phone-input');
  const targetPhone = phoneSnput ? phoneInput.value : EMERGENCY_CONFIG.emergencyPhone;

  let alertDetails = '';
  if (EMERGENCY_CONFIG.autoSms) alertDetails += '📱 Instant SUS Sent to ' + targetPhone + '\n';
  if (EMERGENCY_CONFIG.autoCall) alertDetails += '🐞 Automated Emergency Voice Call Triggered\n';
  if (EMERGENCY_CONFIG.paSiren) alertDetails += '📢 PA System Alarm Sounded\n';

  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  if (modalTitle && modalBody) {
    modalTitle.innerHTML = '🚨 EMERGENCY DISPATCH ACTIVE';
    modalBody.innerHTML = `<
      <div style="background:rgba(239,71,111,0.15);border:1px solid rgba(239,71,111,0.4);border-radius:8px;padding:12px;margin-bottom:14px;">
        <strong style="color:var(--red);font-size:14px;">CRITICAL HAZARD INCIDENT</strong>
        <p style="color:var(--text-primary);margin-top:6px;">${alert.title || alert.hazard || 'Critical Threshold Breach'}</p>
        <p style="color:var(--text-secondary);font-size:12px;margin-top:4px;">Zone: ${alert.zone || 'Plant Floor'}</p>
      </div>
      <div style="background:var(--bg-elevated);padding:12px;border-radius:8px;font-size:12px;color:var(--text-primary);line-height:1.8;">
        <strong style="color:var(--green);">Automated Emergency Dispatch Successful:</strong><br>
        ${alertDetails.replace(/\n/g, '<br>')}
      </div>`;
    document.getElementById('modal-overlay').classList.add('open');
  }
}
const PAGE_TITLES = {
  'dashboard': ['Dashboard', 'Overview'],
  'digital-twin': ['Digital Twin', 'Plant Visualization'],
  'risk': ['Risk Assessment', 'AI Safety Analysis'],
  'workers': ['Worker Safety', 'Personnel Monitoring'],
  'alerts': ['Alerts', 'Alert Management'],
  'sensors': ['Sensor Monitor', 'Real-Time Data'],
  'maintenance': ['Predictive Maintenance', 'Equipment Health'],
  'analytics': ['AI Analytics', 'Intelligence Engine'],
};
function navigateTo(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const panel = document.getElementById(`tab-${tab}`);
  const navBtn = document.getElementById(`nav-${tab}`);
  if (panel) panel.classList.add('active');
  if (navBtn) navBtn.classList.add('active');

  const [title, breadcrumb] = PAGE_TITLES[tab] || ['Page', ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('breadcrumb').textContent = breadcrumb;
  STATE.activeTab = tab;

  setTimeout(() => {
    if (tab === 'digital-twin') initTwinCanvas();
    if (tab === 'risk') { drawRiskMatrix(); drawForecastChart(); }
    if (tab === 'sensors') { drawTempChart(); drawGasChart(); drawVibrationChart(); }
    if (tab === 'maintenance') drawFailureChart();
    if (tab === 'analytics') { drawCorrMatrix(); }
    if (tab === 'alerts') renderAlertPie();
    if (tab === 'workers') drawWorkerMap();
  }, 50);
}

function updateClock() {
  const now = new Date();
  const el = document.getElementById('clock');
  if (el) el.textContent = now.toLocaleTimeString('en-IN', { hour12: false });
}
setInterval(updateClock, 1000);
function tick() {
  let criticalSensor = null;
  SENSORS.forEach(s => {
    const v = nextSensorValue(s);
    s.history.push(v);
    if (s.history.length > 120) s.history.shift();
    if (sensorStatus(s) === 'critical') criticalSensor = s;
  });
  STATE.simulationTick++;

  if (criticalSensor && Math.random() < 0.05) {
    triggerEmergencyDispatch({
      title: `${criticalSensor.name} Critical Hazard Threshold Breached!`,
      hazard: `Sensor reading ${criticalSensor.history.slice(-1)[0]} ${criticalSensor.unit}`,
      zone: criticalSensor.zone
    });
  }

  if (STATE.activeTab === 'dashboard') {
    renderSensorGrid();
    drawRadarChart();
    drawTrendChart();
    updateKPIs();
  }
  if (STATE.activeTab === 'sensors') {
    renderAllSensorCards();
    drawTempChart();
    drawGasChart();
    drawVibrationChart();
  }
  if (STATE.activeTab === 'digital-twin') redrawTwin();
}
setInterval(tick, 2000);
function renderSensorGrid() {
  const grid = document.getElementById('sensor-grid');
  if (!grid) return;
  const displayed = SENSORS.slice(0, 8);
  grid.innerHTML = displayed.map(s => {
    const v = s.history[s.history.length - 1];
    const st = sensorStatus(s);
    const spark = s.history.slice(-20);
    return `<div class="sensor-tile ${st}">
      <span class="sensor-name">${s.name}</span>
      <span class="sensor-value">${v.toFixed(1)}</span>
      <span class="sensor-unit">${s.unit} — ${s.zone}</span>
      <span class="sensor-status-badge ${st}">${st}</span>
      <canvas class="sensor-sparkline" width="130" height="30" data-spark="${spark.join(',')}"></canvas>
    </div>`;
  }).join('');

  grid.querySelectorAll('[data-spark]').forEach(c => {
    const vals = c.dataset.spark.split(',').map(Number);
    drawSparkline(c, vals);
  });
}
function drawSparkline(canvas, vals) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!vals.length) return;
  const min = Math.min(...vals), max = Math.max(...vals);
  const rng = max - min || 1;
  const pts = vals.map((v, i) => [i / (vals.length - 1) * w, h - ((v - min) / rng) * h * 0.85 - h * 0.075]);
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  pts.slice(1).forEach(p => ctx.lineTo(...p));
  ctx.strokeStyle = 'rgba(0,180,216,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function updateKPIs() {
  const critCount = SENSORS.filter(s => sensorStatus(s) === 'critical').length;
  const riskScore = Math.min(100, Math.round(20 + critCount * 12 + STATE.simulationTick % 5));
  const el = document.getElementById('kv-risk');
  if (el) el.textContent = riskScore;
}

function renderRecentAlerts() {
  const list = document.getElementById('recent-alerts-list');
  if (!list) return;
  const top = ALERTS.slice(0, 4);
  list.innerHTML = top.map(a => `
    <div class="alert-item ${a.type}" data-id="${a.id}" style="cursor:pointer">
      <div class="alert-icon ${a.type}">${a.icon}</div>
      <div class="alert-content">
        <div class="alert-title">${a.title}</div>
        <div class="alert-meta">${a.zone}</div>
      </div>
      <span class="alert-time">${a.time}</span>
    </div>
  `).join('');
  list.querySelectorAll('.alert-item').forEach(el => {
    el.addEventListener('click', () => showAlertModal(el.dataset.id));
  });
}

const RADAR_AXES = ['Thermal', 'Chemical', 'Mechanical', 'Electrical', 'Human', 'Environmental'];
function drawRadarChart() {
  const canvas = document.getElementById('radarChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 30;
  const n = RADAR_AXES.length;
  ctx.clearRect(0, 0, w, h);

  const vals = [
    clamp(SENSORS[0].history.slice(-1)[0] / SENSORS[0].crit, 0, 1),
    clamp(sensorStatus(SENSORS[3]) === 'critical' ? 0.9 : 0.4, 0, 1),
    clamp(SENSORS[7].history.slice(-1)[0] / SENSORS[7].crit, 0, 1),
    0.3 + Math.sin(STATE.simulationTick * 0.1) * 0.1,
    0.35 + Math.cos(STATE.simulationTick * 0.07) * 0.08,
    clamp(sensorStatus(SENSORS[10]) === 'critical' ? 0.85 : 0.3, 0, 1),
  ];

  [0.25, 0.5, 0.75, 1].forEach(frac => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
      const x = cx + Math.cos(angle) * R * frac;
      const y = cy + Math.sin(angle) * R * frac;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  for (let i = 0; i < n; i++) {
    const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const lx = cx + Math.cos(angle) * (R + 18);
    const ly = cy + Math.sin(angle) * (R + 18);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(RADAR_AXES[i], lx, ly);
  }

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
    const x = cx + Math.cos(angle) * R * vals[i];
    const y = cy + Math.sin(angle) * R * vals[i];
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,107,53,0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,107,53,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let i = 0; i < n; i++) {
    const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
    const x = cx + Math.cos(angle) * R * vals[i];
    const y = cy + Math.sin(angle) * R * vals[i];
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = getValColor(vals[i]);
    ctx.fill();
  }

  const legend = document.getElementById('radar-legend');
  if (legend) {
    legend.innerHTML = RADAR_AXES.map((ax, i) => `
      <div class="radar-item">
        <span class="radar-dot" style="background:${getValColor(vals[i])}"></span>
        <span>${ax}: ${Math.round(vals[i] * 100)}%</span>
      </div>`).join('');
  }
}

function drawTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0,"w, h);

  const pts = 24;
  const safety = Array.from({ length: pts }, (_, i) => 70 + Math.sin(i * 0.4) * 10 + Math.random() * 6);
  const risk   = Array.from({ length: pts }, (_, i) => 30 + Math.cos(i * 0.3) * 12 + Math.random() * 5);
  const pad = { l: 36, r: 14, t: 10, b: 26 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;

  for (let y = 0; y <= 4; y++) {
    const yy = pad.t + (y / 4) * ph;
    ctx.beginPath();
    ctx.moveTo(pad.l, yy);
    ctx.lineTo(w - pad.r, yy);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(100 - y * 25, pad.l - 4, yy + 3);
  }

  const toXY = (vals, min, max) => vals.map((v, i) => [
    pad.l + (i / (pts - 1)) * pw,
    pad.t + ph - ((v - min) / (max - min)) * ph
  ]);

  function drawLine(pts, color, fill) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (fill) {
      ctx.lineTo(pts[pts.length - 1][0], pad.t + ph);
      ctx.lineTo(pts[0][0], pad.t + ph);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  const safetyPts = toXY(sajety, 40, 100);
  const riskPts   = toXY(risk, 0, 60);

  drawLine(safetyPts, 'rgba(6,214,160,0.9)', 'rgba(6,214,160,0.07)');
  drawLine(riskPts,   'rgba(255,107,53,0.9)', 'rgba(255,107,53,0.07)');
}
