// tokens.js — Token purchase flow and history management.
// Handles payment channel selection, STK push initiation, polling,
// Bluetooth auto-push after purchase, and history display.

import { tokens as tokensApi, payments as paymentsApi } from './api.js';
import { autoPushIfConnected, getConnectedDeviceName } from './bluetooth.js';
import { toast, notifyTokenPurchased, notifyBluetoothPushSuccess, notifyBluetoothPushFailed } from './notifications.js';
import { getUser } from './store.js';
import { saveTokenToHistory as saveToHistoryStore } from './tokenHistory.js';

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
  const presets = document.querySelectorAll('.amount-preset');
  const amountInput = document.getElementById('inp-amount');
  const unitsPreview = document.getElementById('units-preview');
  
  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      presets.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (amountInput) {
        amountInput.value = btn.dataset.amount;
        updateUnitsPreview(parseInt(btn.dataset.amount, 10));
      }
    });
  });

  // Live preview as user types
  if (amountInput) {
    amountInput.addEventListener('input', () => {
      presets.forEach(b => b.classList.remove('selected'));
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
  const units = estimateUnits(amountKsh);
  preview.textContent = `≈ ${units} kWh`;
}

// ── Token Generation ──────────────────────────────────────────────────────────

/**
 * Generates a token after successful payment confirmation
 * @param {Object} paymentData - Payment confirmation data
 * @param {number} amountKsh - Purchase amount
 * @returns {Promise<Object>} Generated token record
 */
export async function generateToken(paymentData, amountKsh) {
  const user = getUser();
  
  if (!user || !user.meter_account) {
    throw new Error('User or meter account not found. Please log in again.');
  }
  
  try {
    // Attempt to generate token via API
    const tokenResult = await tokensApi.generate({
      payment_id: paymentData.payment_id || paymentData.transaction_id,
      amount_ksh: amountKsh,
      meter_account: user.meter_account,
      payment_method: selectedChannel
    });
    
    // Save to separate history storage
    const tokenRecord = {
      token_number: tokenResult.token_number,
      units: tokenResult.units || estimateUnits(amountKsh),
      amount_ksh: amountKsh,
      meter_account: user.meter_account,
      payment_method: selectedChannel,
      payment_ref: paymentData.payment_ref || paymentData.transaction_id,
      purchase_date: new Date().toISOString(),
      status: 'completed',
      id: tokenResult.id || Date.now()
    };
    
    saveToHistoryStore(tokenRecord);
    
    return tokenRecord;
    
  } catch (error) {
    // If API fails, generate a demo token for testing
    console.warn('API token generation failed, using demo:', error);
    return generateDemoToken(amountKsh, user.meter_account);
  }
}

/**
 * Generate a demo token (for testing without backend)
 * @param {number} amountKsh 
 * @param {string} meterAccount 
 * @returns {Object} Demo token record
 */
export function generateDemoToken(amountKsh, meterAccount) {
  const units = estimateUnits(amountKsh);
  const tokenNumber = generateRandomToken();
  
  const tokenRecord = {
    token_number: tokenNumber,
    units: units,
    amount_ksh: amountKsh,
    meter_account: meterAccount,
    payment_method: selectedChannel || 'demo',
    purchase_date: new Date().toISOString(),
    status: 'completed',
    id: Date.now(),
    is_demo: true
  };
  
  saveToHistoryStore(tokenRecord);
  
  return tokenRecord;
}

function generateRandomToken() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    parts.push(Math.floor(Math.random() * 10000).toString().padStart(4, '0'));
  }
  return parts.join('');
}

// ── Buy token (complete flow with token generation) ──────────────────────────

/**
 * Main purchase flow. Called by the buy token form submit handler.
 * @param {number} amountKsh
 * @param {string} phone - Safaricom/Airtel number (ignored for bank)
 * @param {Function} onStatusChange - called with status strings during the flow
 * @returns {Promise<Object>} the completed token record
 */
export async function buyToken(amountKsh, phone, onStatusChange = () => {}) {
  if (amountKsh < 50) throw new Error('Minimum purchase amount is Ksh 50');
  
  const user = getUser();
  if (!user || !user.meter_account) {
    throw new Error('User not logged in or meter account missing');
  }

  let txResponse;

  onStatusChange('initiating');

  try {
    if (selectedChannel === 'mpesa') {
      txResponse = await paymentsApi.initiateMpesa({ 
        amount_ksh: amountKsh, 
        phone,
        meter_account: user.meter_account 
      });
      onStatusChange('stk_sent');
      toast.info('Check your phone — M-Pesa prompt sent to ' + phone, 6000);
      return await pollForToken(txResponse.transaction_id, txResponse, amountKsh, onStatusChange);

    } else if (selectedChannel === 'airtel') {
      txResponse = await paymentsApi.initiateAirtel({ 
        amount_ksh: amountKsh, 
        phone,
        meter_account: user.meter_account 
      });
      onStatusChange('stk_sent');
      toast.info('Check your Airtel Money app to complete payment', 6000);
      return await pollForToken(txResponse.transaction_id, txResponse, amountKsh, onStatusChange);

    } else if (selectedChannel === 'bank') {
      txResponse = await paymentsApi.initiateBank({ 
        amount_ksh: amountKsh,
        meter_account: user.meter_account 
      });
      onStatusChange('bank_pending');
      
      // Save bank transaction to history as pending
      const pendingRecord = {
        token_number: null,
        units: null,
        amount_ksh: amountKsh,
        meter_account: user.meter_account,
        payment_method: 'bank',
        payment_ref: txResponse.reference,
        purchase_date: new Date().toISOString(),
        status: 'pending',
        bank_details: {
          bank_name: txResponse.bank_name,
          bank_account: txResponse.bank_account,
          reference: txResponse.reference
        }
      };
      saveToHistoryStore(pendingRecord);
      
      return txResponse;
    }

    throw new Error('Unknown payment channel: ' + selectedChannel);
    
  } catch (error) {
    console.error('Buy token error:', error);
    throw error;
  }
}

/**
 * Polls the payment status and generates token when complete
 * @param {string} txId - Transaction ID
 * @param {Object} initialResponse - Initial payment response
 * @param {number} amountKsh - Purchase amount
 * @param {Function} onStatusChange
 * @returns {Promise<Object>} the new token record
 */
async function pollForToken(txId, initialResponse, amountKsh, onStatusChange) {
  const MAX_WAIT_MS  = 3 * 60 * 1000; // 3 minutes
  const POLL_INTERVAL_MS = 3000;
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
        // Check payment status from API
        const paymentStatus = await paymentsApi.checkStatus(txId);
        
        if (paymentStatus.status === 'completed' || paymentStatus.status === 'success') {
          onStatusChange('processing');
          
          // GENERATE TOKEN AFTER SUCCESSFUL PAYMENT
          const tokenRecord = await generateToken(
            { 
              payment_id: txId, 
              payment_ref: paymentStatus.reference || initialResponse.reference,
              transaction_id: txId 
            }, 
            amountKsh
          );
          
          onStatusChange('success');
          
          // Handle post-purchase actions
          await afterTokenReceived(tokenRecord);
          
          resolve(tokenRecord);
          return;
          
        } else if (paymentStatus.status === 'failed' || paymentStatus.status === 'cancelled') {
          onStatusChange('failed');
          reject(new Error(paymentStatus.message || 'Payment failed or was cancelled'));
          return;
        }
        
      } catch (err) {
        // Non-fatal: keep polling
        console.debug('Polling attempt failed:', err);
      }

      pollTimer = setTimeout(attempt, POLL_INTERVAL_MS);
    }

    attempt();
  });
}

/**
 * Called once a token has been confirmed and generated.
 * Attempts Bluetooth push and fires notification.
 * @param {Object} token
 */
async function afterTokenReceived(token) {
  notifyTokenPurchased(token.units, token.amount_ksh);
  toast.success(`Token received: ${formatTokenNumber(token.token_number)}`, 8000);

  const deviceName = getConnectedDeviceName();
  if (deviceName) {
    try {
      await autoPushIfConnected(token.id, token.token_number);
      notifyBluetoothPushSuccess(deviceName);
      toast.success(`Token pushed to ${deviceName} via Bluetooth`, 5000);
      
      // Update token status to pushed
      updateTokenPushStatus(token.id, 'success');
    } catch (err) {
      notifyBluetoothPushFailed();
      toast.warning('Bluetooth push failed — enter token manually on your meter', 6000);
      updateTokenPushStatus(token.id, 'failed');
    }
  }
}

// ── Token History Management (Separate from login) ───────────────────────────

/**
 * Updates the push status of a token in history
 * @param {number|string} tokenId 
 * @param {string} status - 'pending'|'success'|'failed'|'manual'
 */
export function updateTokenPushStatus(tokenId, status) {
  const history = getTokenHistory();
  const index = history.findIndex(t => t.id == tokenId);
  if (index !== -1) {
    history[index].push_status = status;
    history[index].push_status_updated = new Date().toISOString();
    localStorage.setItem(TOKEN_HISTORY_KEY, JSON.stringify(history));
  }
}

// Token history storage key (completely separate from auth)
const TOKEN_HISTORY_KEY = 'ps_token_history';

export function saveTokenToHistory(tokenData) {
  const history = getTokenHistory();
  
  // Check for duplicate
  const exists = history.some(t => t.token_number === tokenData.token_number);
  if (exists) return history;
  
  history.unshift({
    ...tokenData,
    timestamp: new Date().toISOString(),
    push_status: tokenData.push_status || 'pending'
  });
  
  // Keep last 200 tokens
  if (history.length > 200) history.pop();
  
  localStorage.setItem(TOKEN_HISTORY_KEY, JSON.stringify(history));
  return history;
}

export function getTokenHistory() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearTokenHistory() {
  localStorage.removeItem(TOKEN_HISTORY_KEY);
}

export function getTokensByMeter(meterAccount) {
  const history = getTokenHistory();
  return history.filter(token => token.meter_account === meterAccount);
}

/**
 * Fetches token history from server and merges with local
 * @returns {Promise<Array>} Combined token history
 */
export async function fetchAndSyncTokenHistory() {
  const user = getUser();
  if (!user) return [];
  
  try {
    // Fetch from API if available
    const serverHistory = await tokensApi.listHistory();
    const serverTokens = Array.isArray(serverHistory) ? serverHistory : (serverHistory.data || []);
    
    // Merge with local history
    const localHistory = getTokenHistory();
    const merged = [...serverTokens, ...localHistory];
    
    // Remove duplicates by token_number
    const unique = merged.filter((token, index, self) => 
      index === self.findIndex(t => t.token_number === token.token_number)
    );
    
    // Sort by date (newest first)
    unique.sort((a, b) => new Date(b.purchase_date || b.timestamp) - new Date(a.purchase_date || a.timestamp));
    
    return unique;
  } catch (error) {
    console.warn('Could not fetch server history, using local only:', error);
    return getTokenHistory();
  }
}

/**
 * Soft-deletes a token from the user's history (server-side).
 * @param {string} tokenId
 */
export async function deleteFromHistory(tokenId) {
  try {
    await tokensApi.deleteHistory(tokenId);
  } catch (error) {
    console.warn('Server delete failed, removing from local only:', error);
  }
  
  // Also remove from local
  const history = getTokenHistory();
  const filtered = history.filter(t => t.id != tokenId && t.token_number != tokenId);
  localStorage.setItem(TOKEN_HISTORY_KEY, JSON.stringify(filtered));
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
  if (!tokenNumber) return '—';
  // Handle both 16-digit and 20-digit tokens
  return tokenNumber.replace(/(\d{4})(?=\d)/g, '$1-');
}

/**
 * Returns the estimated kWh for a given Ksh amount (for preview only).
 * @param {number} amountKsh
 */
export function estimateUnits(amountKsh) {
  // Kenya Power typical rate: ~20 kWh per 100 Ksh
  // This can be configured from server settings
  const ratePer100Ksh = 20;
  return parseFloat(((amountKsh / 100) * ratePer100Ksh).toFixed(1));
}

/**
 * Cancels any in-flight payment poll (e.g. when navigating away).
 */
export function cancelPoll() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}
