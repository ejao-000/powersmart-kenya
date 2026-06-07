// store.js — Global state engine.
// Holds the in-memory application state and manages localStorage persistence.

const STORAGE_KEY = 'ps_state';

const defaultState = {
  user: null,
  meter: null,
  prediction: null,
  theme: 'system', // 'light' | 'dark' | 'system'
  bluetoothDeviceName: null,
};

let state = { ...defaultState };

// ── Persistence ───────────────────────────────────────────────────────────

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

// ── User ──────────────────────────────────────────────────────────────────

export function setUser(user) {
  state.user = user;
  save();
}

export function getUser() { return state.user; }

export function clearUser() {
  state.user = null;
  localStorage.removeItem('ps_token');
  save();
}

export function isLoggedIn() {
  return !!localStorage.getItem('ps_token');
}

// ── Meter + Prediction (session-only) ────────────────────────────────────

export function setMeter(meter) { state.meter = meter; }
export function getMeter() { return state.meter; }

export function setPrediction(prediction) { state.prediction = prediction; }
export function getPrediction() { return state.prediction; }

export function setBluetoothDevice(name) {
  state.bluetoothDeviceName = name;
  document.dispatchEvent(new CustomEvent('bluetooth:connected', { detail: name }));
}

export function getBluetoothDevice() { return state.bluetoothDeviceName; }
