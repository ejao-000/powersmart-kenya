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

import { isLoggedIn, clearAuth, getUser } from './store.js';

// Navigation items — single source of truth for every page
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard',     icon: '🏠', href: 'dashboard.html',      rootHref: 'dashboard.html'      },
  { key: 'tokens',    label: 'Buy Tokens',    icon: '⚡', href: 'pages/tokens.html',   rootHref: 'pages/tokens.html'   },
  { key: 'history',   label: 'Token History', icon: '📋', href: 'pages/history.html',  rootHref: 'pages/history.html'  },
  { key: 'alerts',    label: 'Alerts',        icon: '🔔', href: 'pages/alerts.html',   rootHref: 'pages/alerts.html',  badge: true },
  { key: 'payments',  label: 'Payments',      icon: '💳', href: 'pages/payments.html', rootHref: 'pages/payments.html' },
  { key: 'settings',  label: 'Settings',      icon: '⚙️', href: 'pages/settings.html', rootHref: 'pages/settings.html' },
];

/**
 * initNav(activeKey)
 *
 * @param {string} activeKey - one of the NAV_ITEMS keys above
 *
 * Detects whether we are in the root or pages/ folder automatically
 * by looking at window.location.pathname — no manual "../" needed.
 */
export function initNav(activeKey) {
  // Guard: redirect to login if not authenticated
  if (!isLoggedIn()) {
    const loginPath = isInPagesFolder() ? '../index.html' : 'index.html';
    location.replace(loginPath);
    return;
  }

  renderSidebar(activeKey);
  renderTopbar(activeKey);
  attachLogout();
}

// ── Sidebar ───────────────────────────────────────────────────
function renderSidebar(activeKey) {
  const user     = getUser();
  const initials = user ? user.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : '?';
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

      <!-- User chip at bottom -->
      <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,.1)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0">
            ${initials}
          </div>
          <div>
            <div style="font-size:12px;font-weight:700;color:#fff">${user ? user.fullName : 'User'}</div>
            <div style="font-size:10px;opacity:.6;color:#fff">${user ? user.username : ''}</div>
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
      btn.addEventListener('click', () => sidebar.classList.toggle('open'));
      // Close sidebar when clicking outside
      document.addEventListener('click', e => {
        if (!sidebar.contains(e.target) && e.target !== btn) {
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
      btn.addEventListener('click', () => {
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
