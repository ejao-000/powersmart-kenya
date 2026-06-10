// js/nav.js
// ─────────────────────────────────────────────────────────────
// Injects the shared sidebar + mobile topbar into every page.
// Call initNav() once at the top of each page's script.
//
// Usage:
//   import { initNav } from '../js/nav.js';   (from pages/)
//   import { initNav } from './js/nav.js';    (from root)
//   initNav('alerts');   // pass the active page key
// ─────────────────────────────────────────────────────────────

import { isLoggedIn, clearAuth, getUser, getAuthToken } from './store.js';

// Navigation items — single source of truth for every page
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard',     icon: '🏠', href: 'dashboard.html',      rootHref: 'dashboard.html'      },
  { key: 'tokens',    label: 'Buy Tokens',    icon: '⚡', href: 'pages/tokens.html',   rootHref: 'pages/tokens.html'   },
  { key: 'history',   label: 'Token History', icon: '📋', href: 'pages/history.html',  rootHref: 'pages/history.html'  },
  { key: 'alerts',    label: 'Alerts',        icon: '🔔', href: 'pages/alerts.html',   rootHref: 'pages/alerts.html',  badge: true },
  { key: 'payments',  label: 'Payments',      icon: '💳', href: 'pages/payments.html', rootHref: 'pages/payments.html' },
  { key: 'settings',  label: 'Settings',      icon: '⚙️', href: 'pages/settings.html', rootHref: 'pages/settings.html' },
];

// ── Backend API Configuration ──────────────────────────────────────────────
const API_BASE_URL = import.meta.env?.VITE_API_URL || '';
const API_ENDPOINTS = {
  health: '/api/health',
  data: '/api/data',
  user: '/api/user',
  tokens: '/api/tokens',
  payments: '/api/payments',
};

// ── Backend API Service ────────────────────────────────────────────────────

/**
 * Generic API fetch wrapper with authentication
 * @param {string} endpoint - API endpoint (e.g., '/api/data')
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<any>} - Response data
 */
export async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Check if backend is reachable
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.health}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch (error) {
    console.warn('Backend health check failed:', error);
    return false;
  }
}

/**
 * Get data from Go backend
 * @returns {Promise<Object>}
 */
export async function getBackendData() {
  try {
    const data = await apiFetch(API_ENDPOINTS.data);
    console.log("Data from Go:", data.message);
    return data;
  } catch (error) {
    console.error("Error connecting to backend:", error);
    return null;
  }
}

/**
 * Get user data from backend
 * @returns {Promise<Object>}
 */
export async function fetchUserFromBackend() {
  try {
    const userData = await apiFetch(API_ENDPOINTS.user);
    return userData;
  } catch (error) {
    console.error("Failed to fetch user from backend:", error);
    return null;
  }
}

/**
 * Sync local user data with backend
 * @returns {Promise<boolean>}
 */
export async function syncUserWithBackend() {
  const localUser = getUser();
  if (!localUser) return false;

  try {
    const backendUser = await fetchUserFromBackend();
    if (backendUser && backendUser.id !== localUser.id) {
      console.warn('User data mismatch between local and backend');
      // Optionally refresh local user from backend
      // setUser(backendUser);
    }
    return true;
  } catch (error) {
    return false;
  }
}

// ── Auto-backend check on page load ───────────────────────────────────────
let backendChecked = false;
let backendAvailable = false;

/**
 * Initialize backend connection check
 * Call this once when the app starts
 */
export async function initBackendCheck() {
  if (backendChecked) return backendAvailable;
  
  backendAvailable = await checkBackendHealth();
  backendChecked = true;
  
  if (!backendAvailable) {
    console.warn('Backend service is not available. Running in offline/demo mode.');
  } else {
    console.log('Backend service is available.');
    // Sync user data if logged in
    if (isLoggedIn()) {
      await syncUserWithBackend();
    }
  }
  
  return backendAvailable;
}

/**
 * Check if backend is available
 * @returns {boolean}
 */
export function isBackendAvailable() {
  return backendAvailable;
}

// ── Navigation Initialization ─────────────────────────────────────────────

/**
 * initNav(activeKey)
 *
 * @param {string} activeKey - one of the NAV_ITEMS keys above
 *
 * Detects whether we are in the root or pages/ folder automatically
 * by looking at window.location.pathname — no manual "../" needed.
 */
export async function initNav(activeKey) {
  // Guard: redirect to login if not authenticated
  if (!isLoggedIn()) {
    const loginPath = isInPagesFolder() ? '../index.html' : 'index.html';
    location.replace(loginPath);
    return;
  }

  // Initialize backend connection (non-blocking)
  initBackendCheck().catch(console.warn);

  renderSidebar(activeKey);
  renderTopbar(activeKey);
  attachLogout();
  
  // Optional: Fetch fresh data from backend on navigation
  if (isBackendAvailable()) {
    await fetchBackendDataForPage(activeKey);
  }
}

/**
 * Fetch page-specific data from backend
 * @param {string} pageKey - Current page key
 */
async function fetchBackendDataForPage(pageKey) {
  try {
    switch (pageKey) {
      case 'dashboard':
        // Fetch dashboard stats, meter reading, etc.
        const dashboardData = await apiFetch('/api/dashboard/stats').catch(() => null);
        if (dashboardData) {
          // Dispatch event for dashboard to consume
          window.dispatchEvent(new CustomEvent('backend:dashboard-data', { detail: dashboardData }));
        }
        break;
        
      case 'tokens':
        // Fetch token rates, etc.
        const rates = await apiFetch('/api/rates').catch(() => null);
        if (rates) {
          window.dispatchEvent(new CustomEvent('backend:rates-data', { detail: rates }));
        }
        break;
        
      case 'history':
        // Fetch token purchase history from backend
        const history = await apiFetch('/api/tokens/history').catch(() => null);
        if (history) {
          window.dispatchEvent(new CustomEvent('backend:history-data', { detail: history }));
        }
        break;
        
      case 'alerts':
        // Fetch alert settings
        const alerts = await apiFetch('/api/alerts').catch(() => null);
        if (alerts) {
          window.dispatchEvent(new CustomEvent('backend:alerts-data', { detail: alerts }));
        }
        break;
        
      case 'settings':
        // Fetch user settings
        const settings = await apiFetch('/api/settings').catch(() => null);
        if (settings) {
          window.dispatchEvent(new CustomEvent('backend:settings-data', { detail: settings }));
        }
        break;
        
      default:
        break;
    }
  } catch (error) {
    console.debug(`No backend data for page: ${pageKey}`);
  }
}

// ── Sidebar ───────────────────────────────────────────────────
function renderSidebar(activeKey) {
  const user     = getUser();
  const initials = user ? (user.fullName || user.name || 'U').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : '?';
  const inPages  = isInPagesFolder();

  const navLinks = NAV_ITEMS.map(item => {
    const href   = inPages ? item.href.replace('pages/', '') : item.href;
    const active = item.key === activeKey;
    const badge  = item.badge ? `<span class="notif-dot"></span>` : '';
    return `
      <a href="${href}" class="nav-link ${active ? 'active' : ''}" data-page="${item.key}">
        <span class="nav-link-icon">${item.icon}</span>
        ${item.label}${badge}
      </a>`;
  }).join('');

  const rootPrefix = inPages ? '../' : '';
  
  // Show backend status indicator
  const backendStatusIcon = backendAvailable ? '●' : '○';
  const backendStatusText = backendAvailable ? 'Online' : 'Offline';

  const html = `
    <div class="sidebar" id="sidebar">
      <a href="${rootPrefix}dashboard.html" class="sidebar-brand">
        <div class="sidebar-brand-icon">⚡</div>
        <div>
          <div class="sidebar-brand-name">PowerSmart</div>
          <div class="sidebar-brand-sub">Kenya Smart Power</div>
        </div>
      </a>

      <div class="sidebar-section-label">Menu</div>
      <nav class="sidebar-nav">
        ${navLinks}
        <div class="sidebar-spacer"></div>
      </nav>

      <!-- Backend Status -->
      <div style="padding:8px 16px;margin:4px 0;border-top:1px solid rgba(255,255,255,.1)">
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;opacity:0.7">
          <span style="color:${backendAvailable ? '#4caf50' : '#f44336'}">${backendStatusIcon}</span>
          <span>Backend: ${backendStatusText}</span>
        </div>
      </div>

      <!-- User chip at bottom -->
      <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,.1)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0">
            ${initials}
          </div>
          <div>
            <div style="font-size:12px;font-weight:700;color:#fff">${user ? (user.fullName || user.name || 'User') : 'User'}</div>
            <div style="font-size:10px;opacity:.6;color:#fff">${user ? (user.username || user.email || '') : ''}</div>
          </div>
        </div>
        <button class="sidebar-logout" id="btn-logout">
          <span>↩</span> Sign Out
        </button>
      </div>
    </div>`;

  // Insert sidebar before the first child of body
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const existingSidebar = document.getElementById('sidebar');
  if (existingSidebar) {
    existingSidebar.remove();
  }
  document.body.insertBefore(wrapper.firstElementChild, document.body.firstChild);
}

// ── Mobile topbar ─────────────────────────────────────────────
function renderTopbar(activeKey) {
  const labels = NAV_ITEMS.find(i => i.key === activeKey)?.label || 'PowerSmart';
  const inPages = isInPagesFolder();
  const rootPrefix = inPages ? '../' : '';

  const html = `
    <div class="topbar" id="topbar">
      <a href="${rootPrefix}dashboard.html" class="topbar-brand">
        <span>⚡</span> PowerSmart
      </a>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;opacity:.8">${labels}</span>
        <button class="topbar-hamburger" id="btn-hamburger" aria-label="Open menu">☰</button>
      </div>
    </div>`;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  // Topbar goes before .app-shell
  const shell = document.getElementById('app-shell') || document.querySelector('.app-shell');
  if (shell) {
    document.body.insertBefore(wrapper.firstElementChild, shell);
  } else {
    document.body.insertBefore(wrapper.firstElementChild, document.body.firstChild);
  }

  // Hamburger toggle
  setTimeout(() => {
    const btn = document.getElementById('btn-hamburger');
    const sidebar = document.getElementById('sidebar');
    if (btn && sidebar) {
      // Remove existing listeners to avoid duplicates
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
      });
      // Close sidebar when clicking outside
      document.addEventListener('click', (e) => {
        if (sidebar && !sidebar.contains(e.target) && e.target !== newBtn) {
          sidebar.classList.remove('open');
        }
      });
    }
  }, 0);
}

// ── Logout ────────────────────────────────────────────────────
function attachLogout() {
  setTimeout(() => {
    const btn = document.getElementById('btn-logout');
    if (btn) {
      // Remove existing listeners
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', async () => {
        // Optional: Call backend logout endpoint
        if (backendAvailable) {
          try {
            await apiFetch('/api/logout', { method: 'POST' });
          } catch (error) {
            console.warn('Backend logout failed:', error);
          }
        }
        clearAuth();
        const loginPath = isInPagesFolder() ? '../index.html' : 'index.html';
        location.replace(loginPath);
      });
    }
  }, 0);
}

// ── Helper ────────────────────────────────────────────────────
function isInPagesFolder() {
  return window.location.pathname.includes('/pages/');
}

// ── Auto-initialize backend check on module load ─────────────────────────
// This runs once when the module is imported
initBackendCheck().catch(console.warn);

// Export additional utilities
export { API_BASE_URL, API_ENDPOINTS };
