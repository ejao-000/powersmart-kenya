// notifications.js — Browser push notification management.
// Handles permission requests, in-app toast notifications, and
// the notification queue so multiple alerts don't stack on top of each other.

// ── Permission ────────────────────────────────────────────────────────────────

/**
 * Returns the current browser notification permission status.
 * @returns {'granted'|'denied'|'default'|'unsupported'}
 */
export function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Requests notification permission from the browser.
 * Must be called from a user gesture (button click).
 * @returns {Promise<boolean>} true if granted
 */
export async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// ── Browser push notifications ────────────────────────────────────────────────

/**
 * Sends a native browser notification.
 * Falls back silently if permission is not granted.
 *
 * @param {string} title
 * @param {string} body
 * @param {Object} [opts]  - Additional Notification options (icon, tag, etc.)
 * @returns {Notification|null}
 */
export function pushNotification(title, body, opts = {}) {
  if (Notification.permission !== 'granted') return null;

  const defaults = {
    icon:   '/assets/icon-192.png',
    badge:  '/assets/badge-72.png',
    tag:    opts.tag || 'powersmart-alert',
    renotify: true,
  };

  return new Notification(title, { body, ...defaults, ...opts });
}

// ── Specialised alert notifications ──────────────────────────────────────────

/**
 * Fires a "low power" browser notification.
 * @param {number} unitsRemaining - kWh left
 * @param {number} threshold      - the user's configured threshold
 */
export function notifyLowUnits(unitsRemaining, threshold) {
  return pushNotification(
    '⚡ Power Running Low',
    `Your meter has ${unitsRemaining.toFixed(1)} kWh remaining — below your ${threshold} kWh alert. Top up now to stay connected.`,
    { tag: 'low-units', requireInteraction: true },
  );
}

/**
 * Fires a "few days left" browser notification.
 * @param {number} daysRemaining
 */
export function notifyDaysLeft(daysRemaining) {
  const rounded = Math.round(daysRemaining * 10) / 10;
  return pushNotification(
    '⏰ Power Expiring Soon',
    `Your power will last approximately ${rounded} more day${rounded !== 1 ? 's' : ''}. Buy a token before you run out.`,
    { tag: 'days-left', requireInteraction: true },
  );
}

/**
 * Fires a "token purchased" browser notification.
 * @param {number} units   - kWh purchased
 * @param {number} amount  - Ksh paid
 */
export function notifyTokenPurchased(units, amount) {
  return pushNotification(
    '✅ Token Purchased',
    `You bought ${units.toFixed(1)} kWh for Ksh ${amount}. Your meter will be updated automatically if Bluetooth is on.`,
    { tag: 'token-purchased' },
  );
}

/**
 * Fires a "Bluetooth push succeeded" notification.
 * @param {string} meterName
 */
export function notifyBluetoothPushSuccess(meterName) {
  return pushNotification(
    '📶 Token Delivered',
    `Your token was successfully pushed to ${meterName || 'your meter'} via Bluetooth.`,
    { tag: 'bt-push' },
  );
}

/**
 * Fires a "Bluetooth push failed" notification.
 */
export function notifyBluetoothPushFailed() {
  return pushNotification(
    '⚠ Bluetooth Push Failed',
    'Could not push the token to your meter automatically. Please enter it manually.',
    { tag: 'bt-push-fail', requireInteraction: true },
  );
}

// ── In-app toast system ───────────────────────────────────────────────────────
// Shows styled in-app toasts that do not require notification permission.
// The toast container is created once and reused.

let toastContainer = null;
const toastQueue = [];
let toastActive = false;

function ensureContainer() {
  if (toastContainer) return;
  toastContainer = document.createElement('div');
  toastContainer.id = 'ps-toast-container';
  toastContainer.style.cssText = `
    position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
    display: flex; flex-direction: column; gap: 10px;
    pointer-events: none;
  `;
  document.body.appendChild(toastContainer);
}

/**
 * Queues and displays a toast message.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {number} [duration=4000] - ms before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 4000) {
  toastQueue.push({ message, type, duration });
  if (!toastActive) processQueue();
}

function processQueue() {
  if (!toastQueue.length) { toastActive = false; return; }
  toastActive = true;
  const { message, type, duration } = toastQueue.shift();
  renderToast(message, type, duration);
}

function renderToast(message, type, duration) {
  ensureContainer();

  const colors = {
    success: { bg: '#d4f5dd', border: '#27ae60', text: '#1a4a25' },
    error:   { bg: '#fde8e8', border: '#c0392b', text: '#7a1010' },
    warning: { bg: '#fef3cd', border: '#e67e22', text: '#7a5200' },
    info:    { bg: '#e8f4fd', border: '#2980b9', text: '#1a3a5c' },
  };
  const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${c.bg}; border: 1.5px solid ${c.border}; color: ${c.text};
    padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.875rem;
    font-weight: 500; max-width: 320px; pointer-events: all;
    display: flex; align-items: flex-start; gap: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    opacity: 0; transform: translateY(8px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  `;
  toast.innerHTML = `<span style="font-size:1rem;flex-shrink:0">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Auto-dismiss
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => {
      toast.remove();
      processQueue();
    }, 220);
  }, duration);
}

// ── Convenience shortcuts ─────────────────────────────────────────────────────
export const toast = {
  success: (msg, ms) => showToast(msg, 'success', ms),
  error:   (msg, ms) => showToast(msg, 'error',   ms),
  warning: (msg, ms) => showToast(msg, 'warning',  ms),
  info:    (msg, ms) => showToast(msg, 'info',     ms),
};
