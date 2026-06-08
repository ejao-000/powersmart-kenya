// tokens.js — Token purchase flow and history management.
// Handles payment channel selection, STK push initiation, polling,
// Bluetooth auto-push after purchase, and history display.

import { tokens as tokensApi, payments as paymentsApi } from './api.js';
import { autoPushIfConnected, getConnectedDeviceName } from './bluetooth.js';
import { toast, notifyTokenPurchased, notifyBluetoothPushSuccess, notifyBluetoothPushFailed } from './notifications.js';

// ── State ─────────────────────────────────────────────────────────────────────
let selectedChannel = 'mpesa'; // 'mpesa' | 'airtel' | 'bank'
let pollTimer       = null;

// ── Payment channel selection ─────────────────────────────────────────────────

/**
 * Initialises the payment method selector cards.
 * Call once after the DOM is ready.
 */
export function initChannelSelector() {
  document.querySelectorAll('.payment-method').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.payment-method').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedChannel = card.dataset.channel;
      updatePhoneFieldVisibility();
    });
  });
  // Select mpesa by default
  const defaultCard = document.querySelector('.payment-method[data-channel="mpesa"]');
  if (defaultCard) defaultCard.classList.add('selected');
  updatePhoneFieldVisibility();
}

function updatePhoneFieldVisibility() {
  const phoneGroup = document.getElementById('phone-group');
  if (!phoneGroup) return;
  const needsPhone = selectedChannel === 'mpesa' || selectedChannel === 'airtel';
  phoneGroup.style.display = needsPhone ? 'flex' : 'none';
}

// ── Amount presets ────────────────────────────────────────────────────────────

/**
 * Wires up preset amount buttons (e.g. Ksh 100, 200, 500, 1000).
 * Each button should have data-amount="200" attribute.
 */
export function initAmountPresets() {
  document.querySelectorAll('.amount-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.amount-preset').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const input = document.getElementById('inp-amount');
      if (input) {
        input.value = btn.dataset.amount;
        updateUnitsPreview(parseInt(btn.dataset.amount, 10));
      }
    });
  });

  // Live preview as user types
  const amountInput = document.getElementById('inp-amount');
  if (amountInput) {
    amountInput.addEventListener('input', () => {
      document.querySelectorAll('.amount-preset').forEach(b => b.classList.remove('selected'));
      updateUnitsPreview(parseInt(amountInput.value, 10) || 0);
    });
  }
}

/**
 * Updates the "you will receive approximately X kWh" preview.
 * @param {number} amountKsh
 */
function updateUnitsPreview(amountKsh) {
  const preview = document.getElementById('units-preview');
  if (!preview) return;
  if (!amountKsh || amountKsh < 50) {
    preview.textContent = '';
    return;
  }
  const kwhPerKsh = 0.20; // ~20 kWh per Ksh 100 at current KP tariff
  const units = (amountKsh * kwhPerKsh).toFixed(1);
  preview.textContent = `≈ ${units} kWh`;
}

// ── Buy token ─────────────────────────────────────────────────────────────────

/**
 * Main purchase flow. Called by the buy token form submit handler.
 * @param {number} amountKsh
 * @param {string} phone     - Safaricom/Airtel number (ignored for bank)
 * @param {Function} onStatusChange - called with status strings during the flow
 * @returns {Promise<Object>} the completed token record
 */
export async function buyToken(amountKsh, phone, onStatusChange = () => {}) {
  if (amountKsh < 50) throw new Error('Minimum purchase amount is Ksh 50');

  let txResponse;

  onStatusChange('initiating');

  if (selectedChannel === 'mpesa') {
    txResponse = await paymentsApi.initiateMpesa({ amount_ksh: amountKsh, phone });
    onStatusChange('stk_sent');
    toast.info('Check your phone — M-Pesa prompt sent to ' + phone, 6000);
    return pollForToken(txResponse.transaction_id, onStatusChange);

  } else if (selectedChannel === 'airtel') {
    txResponse = await paymentsApi.initiateAirtel({ amount_ksh: amountKsh, phone });
    onStatusChange('stk_sent');
    toast.info('Check your Airtel Money app to complete payment', 6000);
    return pollForToken(txResponse.transaction_id, onStatusChange);

  } else if (selectedChannel === 'bank') {
    txResponse = await paymentsApi.initiateBank({ amount_ksh: amountKsh });
    onStatusChange('bank_pending');
    return txResponse;
  }

  throw new Error('Unknown payment channel: ' + selectedChannel);
}

/**
 * Polls the token list until a new token matching the transaction ID appears,
 * or until timeout (3 minutes).
 * @param {string} txId
 * @param {Function} onStatusChange
 * @returns {Promise<Object>} the new token record
 */
async function pollForToken(txId, onStatusChange) {
  const MAX_WAIT_MS  = 3 * 60 * 1000; // 3 minutes
  const POLL_INTERVAL_MS = 5000;
  const startTime = Date.now();

  onStatusChange('waiting_payment');

  return new Promise((resolve, reject) => {
    clearTimeout(pollTimer);

    async function attempt() {
      if (Date.now() - startTime > MAX_WAIT_MS) {
        onStatusChange('timeout');
        reject(new Error('Payment confirmation timed out. Check your token history in a few minutes.'));
        return;
      }

      try {
        const historyResult = await tokensApi.listHistory();
        // Check if data is wrapped in a success envelope or is a plain array
        const history = Array.isArray(historyResult)
          ? historyResult
          : (historyResult.data || []);

        // A new token is considered "ours" if it was purchased in the last 10 minutes
        const cutoff = Date.now() - 10 * 60 * 1000;
        const newToken = history.find(t =>
          new Date(t.purchased_at).getTime() > cutoff &&
          t.payment_ref && t.payment_ref.length > 0
        );

        if (newToken) {
          onStatusChange('success');
          await afterTokenReceived(newToken);
          resolve(newToken);
          return;
        }
      } catch (err) {
        // Non-fatal: keep polling
      }

      pollTimer = setTimeout(attempt, POLL_INTERVAL_MS);
    }

    attempt();
  });
}

/**
 * Called once a token has been confirmed.
 * Attempts Bluetooth push and fires notification.
 * @param {Object} token
 */
async function afterTokenReceived(token) {
  notifyTokenPurchased(token.units, token.amount_ksh);
  toast.success(`Token received: ${token.token_number}`, 8000);

  const deviceName = getConnectedDeviceName();
  if (deviceName) {
    try {
      await autoPushIfConnected(token.id, token.token_number);
      notifyBluetoothPushSuccess(deviceName);
      toast.success(`Token pushed to ${deviceName} via Bluetooth`, 5000);
    } catch (err) {
      notifyBluetoothPushFailed();
      toast.warning('Bluetooth push failed — enter token manually on your meter', 6000);
    }
  }
}

// ── Token history ─────────────────────────────────────────────────────────────

/**
 * Fetches the full token history list.
 * Returns an array of token objects, newest first.
 */
export async function fetchHistory() {
  const result = await tokensApi.listHistory();
  return Array.isArray(result) ? result : (result.data || []);
}

/**
 * Soft-deletes a token from the user's history (server-side).
 * @param {string} tokenId
 */
export async function deleteFromHistory(tokenId) {
  await tokensApi.deleteHistory(tokenId);
}

// ── Display helpers ───────────────────────────────────────────────────────────

/**
 * Returns the HTML for a push status badge.
 * @param {'pending'|'success'|'failed'|'manual'} status
 */
export function pushStatusBadge(status) {
  const map = {
    success: ['✓ Pushed',   'badge-success'],
    pending: ['⏳ Pending', 'badge-warn'],
    failed:  ['✗ Failed',   'badge-danger'],
    manual:  ['Manual',     'badge-neutral'],
  };
  const [label, cls] = map[status] || ['Unknown', 'badge-neutral'];
  return `<span class="badge ${cls}">${label}</span>`;
}

/**
 * Formats a token number as groups of 4 for readability: XXXX-XXXX-XXXX-XXXX-XXXX
 * @param {string} tokenNumber - 20-digit string
 */
export function formatTokenNumber(tokenNumber) {
  return tokenNumber.replace(/(\d{4})(?=\d)/g, '$1-');
}

/**
 * Returns the estimated kWh for a given Ksh amount (for preview only).
 * @param {number} amountKsh
 */
export function estimateUnits(amountKsh) {
  return +(amountKsh * 0.20).toFixed(1);
}

/**
 * Cancels any in-flight payment poll (e.g. when navigating away).
 */
export function cancelPoll() {
  clearTimeout(pollTimer);
}
