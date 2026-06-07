// dashboard.js — orchestrates the main dashboard view.
// Wires up meter stats, prediction ring, Bluetooth, and recent token preview.

import { meter as meterApi, tokens as tokenApi } from './api.js';
import { setMeter, setPrediction, setBluetoothDevice, getBluetoothDevice, isLoggedIn, clearUser, applyTheme, getTheme } from './store.js';
import { fetchPrediction, estimateLocally, checkAlerts } from './predictor.js';
import { connectToMeter, autoPushIfConnected, isBluetoothSupported, disconnect, getConnectedDeviceName } from './bluetooth.js';

if (!isLoggedIn()) location.href = 'index.html';

// ── DOM refs ─────────────────────────────────────────────────────────────
const ringArc      = document.getElementById('ring-arc');
const ringValue    = document.getElementById('ring-value');
const valDays      = document.getElementById('val-days');
const valAvg       = document.getElementById('val-avg');
const valDepletion = document.getElementById('val-depletion');
const valUpdated   = document.getElementById('val-updated');
const alertBadge   = document.getElementById('alert-badge');
const alertBanner  = document.getElementById('alert-banner');
const alertBannerText = document.getElementById('alert-banner-text');
const btLabel      = document.getElementById('bt-label');
const btIcon       = document.getElementById('bt-icon');

// ── Helpers ───────────────────────────────────────────────────────────────
const RING_CIRCUMFERENCE = 2 * Math.PI * 80; // matches r=80 in SVG
const MAX_UNITS = 100; // ring is "full" at 100 kWh

function updateRing(units) {
  const pct = Math.min(units / MAX_UNITS, 1);
  const offset = RING_CIRCUMFERENCE * (1 - pct);
  ringArc.style.strokeDashoffset = offset;
  ringValue.textContent = units.toFixed(1);

  // Color the ring based on alert level
  ringArc.classList.remove('ring-ok', 'ring-warn', 'ring-critical');
  if (pct < 0.1) ringArc.classList.add('ring-critical');
  else if (pct < 0.25) ringArc.classList.add('ring-warn');
  else ringArc.classList.add('ring-ok');
}

function renderPrediction(pred) {
  if (!pred) return;
  valDays.textContent = pred.daysRemaining != null ? `${pred.daysRemaining} days` : '—';
  valAvg.textContent  = pred.dailyAvgUnits ? `${pred.dailyAvgUnits.toFixed(2)} kWh` : '—';

  if (pred.depletionDate) {
    const d = new Date(pred.depletionDate);
    valDepletion.textContent = d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  // Alert banner
  if (pred.alertLevel === 'critical') {
    alertBanner.classList.remove('hidden');
    alertBannerText.textContent = '⚠ Power critically low — top up immediately!';
    alertBanner.dataset.level = 'critical';
    alertBadge.classList.remove('hidden');
    alertBadge.textContent = 'Critical';
  } else if (pred.alertLevel === 'warning') {
    alertBanner.classList.remove('hidden');
    alertBannerText.textContent = `Running low — approximately ${pred.daysRemaining} days of power remaining.`;
    alertBanner.dataset.level = 'warning';
    alertBadge.classList.remove('hidden');
    alertBadge.textContent = 'Low';
  } else {
    alertBanner.classList.add('hidden');
    alertBadge.classList.add('hidden');
  }
}

async function renderRecentTokens() {
  const list = document.getElementById('recent-tokens');
  const data = await tokenApi.listHistory().catch(() => []);
  const recent = data.slice(0, 3);
  if (!recent.length) {
    list.innerHTML = '<p class="empty-state">No tokens yet.</p>';
    return;
  }
  list.innerHTML = recent.map(t => `
    <div class="token-row">
      <span class="token-num-sm">${t.token_number}</span>
      <span class="token-units">${t.units} kWh</span>
      <span class="token-amount">Ksh ${t.amount_ksh}</span>
      <span class="token-push-icon" title="${t.push_status}">${t.push_status === 'success' ? '✓' : '○'}</span>
    </div>
  `).join('');
}

// ── Main load ─────────────────────────────────────────────────────────────
async function init() {
  const [meterData, pred] = await Promise.all([
    meterApi.getStatus().catch(() => null),
    fetchPrediction().catch(() => null),
  ]);

  if (meterData) {
    setMeter(meterData);
    updateRing(meterData.units_remaining);
    valUpdated.textContent = meterData.last_reading_at
      ? new Date(meterData.last_reading_at).toLocaleTimeString('en-KE')
      : 'Not yet recorded';

    const localEst = estimateLocally(meterData.units_remaining, meterData.daily_avg_units);
    const display = pred || localEst;
    renderPrediction(display);
    setPrediction(display);

    await checkAlerts(meterData.units_remaining, display.daysRemaining);
  }

  await renderRecentTokens();

  // Bluetooth status
  updateBtButton();
}

// ── Manual reading update ─────────────────────────────────────────────────
document.getElementById('btn-update-reading').addEventListener('click', async () => {
  const val = parseFloat(document.getElementById('input-units').value);
  if (isNaN(val) || val < 0) { alert('Enter a valid unit reading.'); return; }
  await meterApi.postTelemetry(val);
  await init(); // refresh all stats
});

// ── Bluetooth ─────────────────────────────────────────────────────────────
function updateBtButton() {
  const name = getConnectedDeviceName();
  if (name) {
    btLabel.textContent = name;
    btIcon.textContent = '●';
    document.getElementById('btn-bluetooth').classList.add('bt-connected');
  } else {
    btLabel.textContent = 'Connect Meter';
    btIcon.textContent = '⬡';
    document.getElementById('btn-bluetooth').classList.remove('bt-connected');
  }
}

document.getElementById('btn-bluetooth').addEventListener('click', async () => {
  if (!isBluetoothSupported()) {
    alert('Web Bluetooth is not supported on this browser. Use Chrome on Android or desktop.');
    return;
  }
  if (getConnectedDeviceName()) { disconnect(); updateBtButton(); return; }
  try {
    const name = await connectToMeter();
    setBluetoothDevice(name);
    updateBtButton();
    alert(`Connected to ${name}. New tokens will be pushed automatically.`);
  } catch (err) {
    if (err.name !== 'NotFoundError') alert(`Bluetooth error: ${err.message}`);
  }
});

document.addEventListener('meter:disconnected', updateBtButton);

// ── Theme toggle ──────────────────────────────────────────────────────────
document.getElementById('btn-theme').addEventListener('click', () => {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});

// ── Logout ────────────────────────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', () => {
  clearUser();
  location.href = 'index.html';
});

init();
