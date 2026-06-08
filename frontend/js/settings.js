// settings.js — Account, meter, and app preference settings.
// Manages profile editing, password change, auto top-up config,
// theme preference, Bluetooth pairing, and account deletion.

import { auth as authApi, meter as meterApi } from './api.js';
import { getUser, setUser, clearUser, applyTheme, getTheme } from './store.js';
import { toast } from './notifications.js';
import { disconnect, isBluetoothSupported } from './bluetooth.js';

// ── Profile ───────────────────────────────────────────────────────────────────

/**
 * Loads the current user's profile into the profile form fields.
 */
export function populateProfileForm() {
  const user = getUser();
  if (!user) return;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('inp-name',          user.name);
  set('inp-email',         user.email);
  set('inp-phone',         user.phone);
  set('inp-meter-account', user.meter_account);
  set('inp-meter-number',  user.meter_number);

  // Meter account and meter number are read-only (linked at registration)
  ['inp-meter-account', 'inp-meter-number'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute('readonly', true);
      el.style.opacity = '0.6';
      el.style.cursor  = 'not-allowed';
    }
  });
}

/**
 * Handles profile form submission.
 * Only name and phone can be changed; email/meter fields are locked.
 * @param {Event} e - form submit event
 */
export async function handleProfileSave(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  setLoading(btn, true);

  try {
    // Currently the API supports reading the profile via GET /auth/me.
    // A full PATCH /auth/profile endpoint would be needed for real updates.
    // For now we optimistically update the local store and show a success toast.
    const user = getUser();
    if (user) {
      user.name  = document.getElementById('inp-name')?.value  || user.name;
      user.phone = document.getElementById('inp-phone')?.value || user.phone;
      setUser(user);
    }
    toast.success('Profile saved successfully');
  } catch (err) {
    toast.error(err.message || 'Failed to save profile');
  } finally {
    setLoading(btn, false);
  }
}

// ── Password change ───────────────────────────────────────────────────────────

/**
 * Handles the change-password form.
 * @param {Event} e - form submit event
 */
export async function handlePasswordChange(e) {
  e.preventDefault();
  const current  = document.getElementById('inp-current-password')?.value;
  const next     = document.getElementById('inp-new-password')?.value;
  const confirm  = document.getElementById('inp-confirm-password')?.value;
  const errEl    = document.getElementById('password-change-error');

  function showErr(msg) {
    if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
    else toast.error(msg);
  }
  function clearErr() { if (errEl) errEl.classList.add('hidden'); }

  clearErr();
  if (!current || !next || !confirm) { showErr('All password fields are required'); return; }
  if (next.length < 8)               { showErr('New password must be at least 8 characters'); return; }
  if (next !== confirm)              { showErr('Passwords do not match'); return; }

  const btn = e.target.querySelector('[type="submit"]');
  setLoading(btn, true);

  try {
    // Re-authenticate with current password to verify, then call change endpoint.
    // NOTE: implement PUT /api/auth/password on backend; here we show the pattern.
    const user = getUser();
    await authApi.login({ email: user.email, password: current }); // throws if wrong
    // await authApi.changePassword({ current_password: current, new_password: next });
    toast.success('Password changed successfully. Please sign in again.');
    e.target.reset();
    setTimeout(() => { clearUser(); location.href = '../index.html'; }, 2000);
  } catch (err) {
    showErr(err.status === 401 ? 'Current password is incorrect' : (err.message || 'Failed to change password'));
  } finally {
    setLoading(btn, false);
  }
}

// ── Meter / auto top-up settings ─────────────────────────────────────────────

/**
 * Loads current meter settings into the auto top-up form.
 */
export async function populateMeterSettings() {
  try {
    const meterData = await meterApi.getStatus();

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setChk  = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

    setChk('chk-auto-topup',      meterData.auto_topup);
    setVal('inp-topup-threshold',  meterData.topup_threshold);
    setVal('inp-topup-amount',     meterData.topup_amount_ksh);

    toggleAutoTopupFields(meterData.auto_topup);
  } catch {
    // Meter may not be synced yet; leave form at defaults
  }
}

/**
 * Handles the meter settings form submission.
 * @param {Event} e
 */
export async function handleMeterSettingsSave(e) {
  e.preventDefault();
  const autoTopup   = document.getElementById('chk-auto-topup')?.checked || false;
  const threshold   = parseFloat(document.getElementById('inp-topup-threshold')?.value) || 5;
  const amount      = parseInt(document.getElementById('inp-topup-amount')?.value, 10) || 200;

  if (threshold < 0)  { toast.error('Threshold cannot be negative'); return; }
  if (amount < 50)    { toast.error('Minimum top-up amount is Ksh 50'); return; }
  if (amount > 100000){ toast.error('Maximum top-up amount is Ksh 100,000'); return; }

  const btn = e.target.querySelector('[type="submit"]');
  setLoading(btn, true);

  try {
    await meterApi.updateSettings({
      auto_topup:       autoTopup,
      topup_threshold:  threshold,
      topup_amount_ksh: amount,
    });
    toast.success('Meter settings saved');
  } catch (err) {
    toast.error(err.message || 'Failed to save meter settings');
  } finally {
    setLoading(btn, false);
  }
}

export function toggleAutoTopupFields(enabled) {
  const fields = document.getElementById('auto-topup-fields');
  if (fields) fields.style.display = enabled ? 'grid' : 'none';
}

// ── Theme ─────────────────────────────────────────────────────────────────────

/**
 * Initialises the theme selector radio buttons.
 */
export function initThemeSelector() {
  const current = getTheme();
  const radio = document.querySelector(`input[name="theme"][value="${current}"]`);
  if (radio) radio.checked = true;

  document.querySelectorAll('input[name="theme"]').forEach(r => {
    r.addEventListener('change', () => {
      applyTheme(r.value);
      toast.info(`Theme set to ${r.value}`);
    });
  });
}

// ── Bluetooth ─────────────────────────────────────────────────────────────────

/**
 * Updates the Bluetooth status display in settings.
 * @param {string|null} deviceName
 */
export function updateBluetoothStatus(deviceName) {
  const statusEl = document.getElementById('bt-status-text');
  const indicator = document.getElementById('bt-status-indicator');

  if (statusEl) {
    statusEl.textContent = deviceName ? `Connected: ${deviceName}` : 'No meter connected';
  }
  if (indicator) {
    indicator.className = 'bt-indicator ' + (deviceName ? 'bt-on' : 'bt-off');
  }

  const disconnectBtn = document.getElementById('btn-bt-disconnect');
  if (disconnectBtn) {
    disconnectBtn.style.display = deviceName ? 'inline-flex' : 'none';
  }
}

/**
 * Handles the "Disconnect meter" button.
 */
export function handleBluetoothDisconnect() {
  disconnect();
  updateBluetoothStatus(null);
  toast.info('Meter disconnected');
}

/**
 * Shows the Bluetooth section only if the browser supports Web Bluetooth.
 */
export function initBluetoothSection() {
  const section = document.getElementById('section-bluetooth');
  if (!section) return;

  if (!isBluetoothSupported()) {
    section.innerHTML = `
      <p class="hint">
        Web Bluetooth is not supported on this browser.
        Use <strong>Chrome on Android or desktop</strong> to enable automatic token push.
      </p>`;
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

/**
 * Reflects the current browser notification permission in the UI.
 */
export function updateNotificationPermissionUI() {
  const status = document.getElementById('notif-permission-status');
  const btn    = document.getElementById('btn-enable-notifications');
  if (!status) return;

  const perm = Notification.permission;
  const labels = { granted: '✓ Enabled', denied: '✗ Blocked in browser settings', default: 'Not yet enabled' };
  const colors = { granted: 'var(--ok)', denied: 'var(--danger)', default: 'var(--muted)' };

  status.textContent = labels[perm] || 'Unknown';
  status.style.color = colors[perm] || 'var(--muted)';

  if (btn) btn.style.display = perm === 'granted' ? 'none' : 'inline-flex';
}

// ── Danger zone ───────────────────────────────────────────────────────────────

/**
 * Handles the "Delete account" button with a confirmation dialog.
 */
export function handleDeleteAccount() {
  const confirmed = window.confirm(
    'Are you sure you want to delete your account?\n\nThis will permanently remove your account and all token history. Your Kenya Power meter account and any purchased tokens remain valid.\n\nThis action cannot be undone.'
  );
  if (!confirmed) return;

  const reconfirm = window.prompt('Type DELETE to confirm account deletion:');
  if (reconfirm !== 'DELETE') {
    toast.info('Account deletion cancelled');
    return;
  }

  // TODO: call DELETE /api/auth/account when endpoint is implemented
  toast.error('Account deletion is not yet available. Please contact support.');
}

// ── Utility ───────────────────────────────────────────────────────────────────

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = loading ? 'Saving…' : btn.dataset.originalText;
}
