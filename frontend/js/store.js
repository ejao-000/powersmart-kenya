// store.js — Global state engine.
// Holds the in-memory application state and manages localStorage persistence.
// Central in-browser data store — all pages import from here.
// No page ever reads localStorage directly.

const STORAGE_KEY = 'ps_state';

// Storage keys for different data types (completely separate)
const KEYS = {
  TOKEN:   'ps_token',           // Auth token
  USER:    'ps_user',            // User profile
  TOKENS:  'ps_token_history',   // Token PURCHASE history (not login sessions)
  LOGINS:  'ps_login_history',   // Login/sign-in history (completely separate key)
  SETTINGS:'ps_settings',
};

const defaultState = {
  user: null,
  meter: null,
  prediction: null,
  theme: 'system', // 'light' | 'dark' | 'system'
  bluetoothDeviceName: null,
};

let state = { ...defaultState };

// ── Persistence for theme & user (legacy) ─────────────────────────────────

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Merge only safe fields (never restore meter data from cache)
      state.theme = saved.theme || 'system';
      state.user  = saved.user  || null;
    }
  } catch {}
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: state.theme,
      user:  state.user,
    }));
  } catch {}
}

load();

// ── Theme ─────────────────────────────────────────────────────────────────

export function applyTheme(theme) {
  state.theme = theme;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // system: follow OS preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
  save();
}

export function getTheme() { return state.theme; }

// Apply stored theme immediately on load
applyTheme(state.theme);

// ── Session (Auth) ─────────────────────────────────────────────────────────

export function isLoggedIn() { 
  return !!localStorage.getItem(KEYS.TOKEN) && !!getUser();
}

export function getAuthToken() { 
  return localStorage.getItem(KEYS.TOKEN) || ''; 
}

export function setAuthToken(token) { 
  localStorage.setItem(KEYS.TOKEN, token); 
}

export function clearAuth() { 
  localStorage.removeItem(KEYS.TOKEN); 
  localStorage.removeItem(KEYS.USER);
}

// ── User profile ───────────────────────────────────────────────────────────

export function setUser(user) {
  state.user = user;
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
  save();
}

export function getUser() {
  try { 
    return JSON.parse(localStorage.getItem(KEYS.USER) || 'null');
  } catch { 
    return null; 
  }
}

export function clearUser() {
  state.user = null;
  localStorage.removeItem(KEYS.USER);
  localStorage.removeItem(KEYS.TOKEN);
  save();
}

// ── Token purchase history (SEPARATE from login history) ───────────────────
// Each entry: { id, date, amount, units, token, method, loaded, meterNumber, status, push_status }

export function getTokenHistory() {
  try { 
    return JSON.parse(localStorage.getItem(KEYS.TOKENS) || '[]'); 
  } catch { 
    return []; 
  }
}

export function addTokenPurchase(entry) {
  const history = getTokenHistory();
  const newEntry = { 
    ...entry, 
    id: entry.id || Date.now().toString(),
    timestamp: new Date().toISOString()
  };
  
  // Avoid duplicates
  const exists = history.some(t => t.token === entry.token || t.id === newEntry.id);
  if (!exists) {
    history.unshift(newEntry);
    // Keep last 200 tokens
    if (history.length > 200) history.pop();
    localStorage.setItem(KEYS.TOKENS, JSON.stringify(history));
  }
  return history;
}

export function updateTokenPushStatus(tokenId, status) {
  const history = getTokenHistory();
  const index = history.findIndex(t => t.id === tokenId || t.token === tokenId);
  if (index !== -1) {
    history[index].push_status = status;
    history[index].push_status_updated = new Date().toISOString();
    localStorage.setItem(KEYS.TOKENS, JSON.stringify(history));
  }
}

export function clearTokenHistory() {
  localStorage.removeItem(KEYS.TOKENS);
}

export function getTokensByMeter(meterAccount) {
  const history = getTokenHistory();
  return history.filter(token => token.meterNumber === meterAccount || token.meter_account === meterAccount);
}

export function deleteToken(tokenId) {
  const history = getTokenHistory();
  const filtered = history.filter(t => t.id !== tokenId && t.token !== tokenId);
  localStorage.setItem(KEYS.TOKENS, JSON.stringify(filtered));
  return filtered;
}

// ── Login / sign-in history (SEPARATE from token history) ─────────────────
// Each entry: { id, date, ip, device, success, email, timestamp }

export function getLoginHistory() {
  try { 
    return JSON.parse(localStorage.getItem(KEYS.LOGINS) || '[]'); 
  } catch { 
    return []; 
  }
}

export function recordLogin(entry) {
  const history = getLoginHistory();
  const newEntry = { 
    ...entry, 
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleString()
  };
  history.unshift(newEntry);
  // Keep last 50 login events only
  localStorage.setItem(KEYS.LOGINS, JSON.stringify(history.slice(0, 50)));
}

export function clearLoginHistory() {
  localStorage.removeItem(KEYS.LOGINS);
}

// ── Alert / notification settings ─────────────────────────────────────────

export function getSettings() {
  const defaults = {
    notificationsEnabled: true,
    outageAlertsEnabled:  true,
    autoLoadEnabled:      true,
    autoTopupEnabled:     false,
    autoTopupAmount:      500,
    autoTopupPhone:       '',
    limitUnits:           20,
    pushEnabled:          true,
    emailEnabled:         true,
    smsEnabled:           false,
    lowUnitsThreshold:    50,      // Alert when units below this
    dailyAverageEnabled:  true,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
    return { ...defaults, ...saved };
  } catch { 
    return defaults; 
  }
}

export function saveSettings(partial) {
  const current = getSettings();
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...partial }));
}

export function resetSettings() {
  localStorage.removeItem(KEYS.SETTINGS);
  return getSettings();
}

// ── Meter + Prediction (session-only) ─────────────────────────────────────

export function setMeter(meter) { 
  state.meter = meter; 
}

export function getMeter() { 
  return state.meter; 
}

export function setPrediction(prediction) { 
  state.prediction = prediction; 
}

export function getPrediction() { 
  return state.prediction; 
}

export function clearMeterData() {
  state.meter = null;
  state.prediction = null;
}

// ── Bluetooth ─────────────────────────────────────────────────────────────

export function setBluetoothDevice(name) {
  state.bluetoothDeviceName = name;
  document.dispatchEvent(new CustomEvent('bluetooth:connected', { detail: name }));
}

export function getBluetoothDevice() { 
  return state.bluetoothDeviceName; 
}

export function clearBluetoothDevice() {
  state.bluetoothDeviceName = null;
  document.dispatchEvent(new CustomEvent('bluetooth:disconnected'));
}

// ── Demo data seed — called once on first load ───────────────────────────
// Seeds realistic token purchase history so the history page
// is never empty for new users.

export function seedDemoDataIfNeeded() {
  const existing = getTokenHistory();
  if (existing.length > 0) return; // already seeded

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentMonth = months[now.getMonth()];
  const lastMonth = months[now.getMonth() === 0 ? 11 : now.getMonth() - 1];
  const twoMonthsAgo = months[now.getMonth() < 2 ? 11 + (now.getMonth() - 2) : now.getMonth() - 2];
  
  const demos = [
    { 
      date: currentMonth + ' ' + now.getDate(), 
      amount: 500,  
      units: 43.2, 
      token: '4821-6739-2910-5847', 
      method: 'M-Pesa',   
      loaded: true,
      status: 'completed',
      push_status: 'success'
    },
    { 
      date: lastMonth + ' 24', 
      amount: 1000, 
      units: 86.4, 
      token: '3914-5820-1039-4821', 
      method: 'Manual', 
      loaded: true,
      status: 'completed',
      push_status: 'manual'
    },
    { 
      date: lastMonth + ' 15', 
      amount: 500,  
      units: 43.2, 
      token: '2843-9104-5837-2948', 
      method: 'Airtel Money',   
      loaded: true,
      status: 'completed',
      push_status: 'success'
    },
    { 
      date: lastMonth + ' 8',  
      amount: 1000, 
      units: 86.4, 
      token: '1948-3820-4910-3847', 
      method: 'M-Pesa', 
      loaded: true,
      status: 'completed',
      push_status: 'success'
    },
    { 
      date: twoMonthsAgo + ' 29', 
      amount: 500,  
      units: 43.2, 
      token: '0948-2910-3847-1029', 
      method: 'Bank Transfer',   
      loaded: true,
      status: 'completed',
      push_status: 'pending'
    },
  ];

  demos.forEach(d => addTokenPurchase(d));
}

// ── Utility ───────────────────────────────────────────────────────────────

export function clearAllData() {
  clearAuth();
  clearTokenHistory();
  clearLoginHistory();
  clearMeterData();
  clearBluetoothDevice();
  resetSettings();
  localStorage.removeItem(STORAGE_KEY);
  state = { ...defaultState };
  load();
}

// Auto-seed demo data on first load (only if no existing data)
seedDemoDataIfNeeded();
