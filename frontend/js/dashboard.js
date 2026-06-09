// dashboard.js — Main dashboard page logic.

import { meter as meterApi, tokens as tokenApi } from './api.js';
import { requireAuth, attachLogoutButton } from './auth.js';
import { setMeter, setPrediction, setBluetoothDevice,
         getBluetoothDevice, getUser, applyTheme, getTheme } from './store.js';
import { fetchPrediction, estimateLocally, checkAlerts } from './predictor.js';
import { toast } from './notifications.js';

requireAuth('index.html');
attachLogoutButton('btn-logout', 'index.html');

// Apply stored theme
applyTheme(getTheme());

// ── DOM refs ──────────────────────────────────────────────────────────────────
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

const RING_CIRC = 2 * Math.PI * 80; // r=80
const MAX_UNITS = 100;

// ── Render helpers ────────────────────────────────────────────────────────────
function updateRing(units) {
  const pct    = Math.min(units / MAX_UNITS, 1);
  const offset = RING_CIRC * (1 - pct);
  ringArc.style.strokeDashoffset = offset;
  ringValue.textContent = units.toFixed(1);
  ringArc.classList.remove('ring-ok', 'ring-warn', 'ring-critical');
  if      (pct < 0.10) ringArc.classList.add('ring-critical');
  else if (pct < 0.25) ringArc.classList.add('ring-warn');
  else                 ringArc.classList.add('ring-ok');
}

function renderPrediction(pred) {
  if (!pred) return;
  valDays.textContent = pred.daysRemaining != null ? `${pred.daysRemaining} days` : '—';
  valAvg.textContent  = pred.dailyAvgUnits ? `${pred.dailyAvgUnits.toFixed(2)} kWh` : '—';
  if (pred.depletionDate) {
    valDepletion.textContent = new Date(pred.depletionDate).toLocaleDateString('en-KE',
      { weekday:'short', day:'numeric', month:'short' });
  }
  if (pred.alertLevel === 'critical') {
    alertBanner.classList.remove('hidden');
    alertBanner.dataset.level = 'critical';
    alertBannerText.textContent = '⚠ Power critically low — top up immediately!';
    alertBadge.classList.remove('hidden');
    alertBadge.textContent = 'Critical';
  } else if (pred.alertLevel === 'warning') {
    alertBanner.classList.remove('hidden');
    alertBanner.dataset.level = 'warning';
    alertBannerText.textContent = `Power running low — approximately ${pred.daysRemaining} days remaining.`;
    alertBadge.classList.remove('hidden');
    alertBadge.textContent = 'Low';
  } else {
    alertBanner.classList.add('hidden');
    alertBadge.classList.add('hidden');
  }
}

async function renderRecentTokens() {
  const listEl = document.getElementById('recent-tokens');
  try {
    const result = await tokenApi.listHistory();
    const data   = Array.isArray(result) ? result : (result.data || []);
    const recent = data.slice(0, 3);
    if (!recent.length) {
      listEl.innerHTML = `<p class="empty-state">No tokens yet. <a href="pages/tokens.html" style="color:var(--accent)">Buy your first →</a></p>`;
      return;
    }
    listEl.innerHTML = recent.map(t => `
      <div class="token-row">
        <span class="token-num-sm">${(t.token_number||'').replace(/(\d{4})(?=\d)/g,'$1-')}</span>
        <span class="token-units">${t.units} kWh</span>
        <span class="token-amount">Ksh ${(t.amount_ksh||0).toLocaleString()}</span>
        <span title="${t.push_status}">${t.push_status === 'success' ? '✓' : '○'}</span>
      </div>`).join('');
  } catch {
    listEl.innerHTML = '<p class="empty-state">Could not load history.</p>';
  }
}

// ── Meter account label ───────────────────────────────────────────────────────
const user = getUser();
if (user) {
  document.getElementById('meter-account-label').textContent =
    `Meter: ${user.meter_number} · Account: ${user.meter_account}`;
}

// ── Main load ─────────────────────────────────────────────────────────────────
async function init() {
  try {
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
      const display = pred || estimateLocally(meterData.units_remaining, meterData.daily_avg_units);
      renderPrediction(display);
      setPrediction(display);
      checkAlerts(meterData.units_remaining, display.daysRemaining).catch(() => {});
    } else {
      ringValue.textContent = '—';
      valUpdated.textContent = 'Connect meter to see readings';
    }
  } catch (err) {
    console.warn('Dashboard init error:', err);
  }
  await renderRecentTokens();
  updateBtButton();
}

// ── Manual reading ────────────────────────────────────────────────────────────
document.getElementById('btn-update-reading').addEventListener('click', async () => {
  const val = parseFloat(document.getElementById('input-units').value);
  const msgEl = document.getElementById('reading-msg');
  if (isNaN(val) || val < 0) {
    msgEl.textContent = 'Enter a valid unit reading (e.g. 42.5)';
    msgEl.style.color = 'var(--danger)';
    msgEl.classList.remove('hidden');
    return;
  }
  try {
    await meterApi.postTelemetry(val);
    msgEl.textContent = '✓ Reading updated';
    msgEl.style.color = 'var(--ok)';
    msgEl.classList.remove('hidden');
    setTimeout(() => msgEl.classList.add('hidden'), 3000);
    document.getElementById('input-units').value = '';
    await init();
  } catch (err) {
    toast.error('Failed to update reading: ' + err.message);
  }
});

// ── Bluetooth ─────────────────────────────────────────────────────────────────
function updateBtButton() {
  const name = getBluetoothDevice();
  btLabel.textContent = name || 'Connect Meter';
  btIcon.textContent  = name ? '●' : '⬡';
  document.getElementById('btn-bluetooth').classList.toggle('bt-connected', !!name);
}

document.getElementById('btn-bluetooth').addEventListener('click', async () => {
  // Lazy-import bluetooth so the page doesn't crash on browsers without BLE
  const bt = await import('./bluetooth.js').catch(() => null);
  if (!bt) { toast.error('Bluetooth is not available on this browser.'); return; }

  if (!bt.isBluetoothSupported()) {
    toast.warning('Web Bluetooth requires Chrome on Android or desktop.');
    return;
  }
  if (getBluetoothDevice()) {
    bt.disconnect();
    setBluetoothDevice(null);
    updateBtButton();
    return;
  }
  try {
    const name = await bt.connectToMeter();
    setBluetoothDevice(name);
    updateBtButton();
    toast.success(`Connected to ${name}`);
  } catch (e) {
    if (e.name !== 'NotFoundError') toast.error('Bluetooth: ' + e.message);
  }
});

document.addEventListener('meter:disconnected', () => {
  setBluetoothDevice(null);
  updateBtButton();
});

// ── Theme toggle ──────────────────────────────────────────────────────────────
document.getElementById('btn-theme').addEventListener('click', () => {
  applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
});

init();
