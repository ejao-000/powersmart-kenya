/* PowerSmart Kenya — shared API client, session manager and route guards.
 * Loaded by every portal page. All backend calls go through apiRequest(),
 * which attaches the JWT and redirects to the login page when the session is
 * invalid or expired.
 */
(function () {
  "use strict";

  // API base URL. Override at runtime by setting on each page BEFORE app.js loads:
  //   window.POWERSMART_API = "https://your-backend.onrender.com/api";
  // Falls back to a same-origin "/api" when not set (single-server deploys).
  const API_BASE = (window.POWERSMART_API || "/api").replace(/\/+$/, "");
  const TOKEN_KEY = "powersmart_token";
  const USER_KEY = "powersmart_user";
  const ROLE_KEY = "powersmart_role";
  const LOGIN_PAGE = "index.html";

  /* ── Session helpers ─────────────────────────────────────────────────── */
  function getSession() {
    return {
      token: localStorage.getItem(TOKEN_KEY),
      user: (function () {
        try {
          return JSON.parse(localStorage.getItem(USER_KEY) || "null");
        } catch (_) {
          return null;
        }
      })(),
      role: localStorage.getItem(ROLE_KEY) || "",
    };
  }

  function saveSession(token, user, role) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(ROLE_KEY, role || (user && user.role) || "");
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
  }

  function toLoginPage() {
    clearSession();
    window.location.replace(LOGIN_PAGE);
  }

  /* ── HTTP client ────────────────────────────────────────────────────── */
  async function apiRequest(path, options) {
    options = options || {};
    const skipAuthRedirect = !!options.skipAuthRedirect;
    delete options.skipAuthRedirect;
    const session = getSession();
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );
    if (session.token) {
      headers.Authorization = "Bearer " + session.token;
    }

    let response;
    try {
      response = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    } catch (_) {
      const err = new Error("Network error — please check your connection and try again.");
      err.status = 0;
      throw err;
    }

    if (response.status === 401 && !skipAuthRedirect) {
      toLoginPage();
      const err = new Error("Your session has expired. Please sign in again.");
      err.status = 401;
      throw err;
    }

    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    if (!response.ok) {
      const message =
        (data && (data.error || data.message)) ||
        "Something went wrong (HTTP " + response.status + ").";
      const err = new Error(message);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    // A 2xx response that is not JSON means the request did not hit the API —
    // e.g. a static host or SPA fallback served index.html instead. Fail loudly.
    if (data === null) {
      const err = new Error(
        "Unexpected server response. Check that the backend API is reachable " +
        "(see the POWERSMART_API setting in app.js)."
      );
      err.status = response.status;
      throw err;
    }
    return data;
  }

  /* ── Route guards ───────────────────────────────────────────────────── */
  async function verifySession() {
    // Confirm the stored token is still valid against the server.
    const session = getSession();
    if (!session.token) return null;
    try {
      const res = await apiRequest("/auth/me");
      const user = res && res.data ? res.data : session.user;
      const role = (user && user.role) || session.role;
      saveSession(session.token, user, role);
      return { user: user, role: role, token: session.token };
    } catch (_) {
      return null;
    }
  }

  // requireAuth enforces login + role. expectedRoles may be an array or string.
  // Called as the very first thing on protected pages.
  async function requireAuth(expectedRoles) {
    const session = getSession();
    if (!session.token) {
      toLoginPage();
      return null;
    }

    let current = null;
    try {
      current = await verifySession();
    } catch (_) {
      toLoginPage();
      return null;
    }

    if (!current) {
      toLoginPage();
      return null;
    }

    const allowed = Array.isArray(expectedRoles)
      ? expectedRoles
      : expectedRoles
        ? [expectedRoles]
        : [];
    if (allowed.length > 0 && !allowed.includes(current.role)) {
      // Authenticated but wrong portal — bounce to the right dashboard.
      redirectToDashboard(current.role);
      return null;
    }
    return current;
  }

  function redirectToDashboard(role) {
    if (role === "landlord") window.location.replace("landlord.html");
    else if (role === "admin") window.location.replace("admin-dashboard.html");
    else window.location.replace("tenant-dashboard.html");
  }

  // bounceIfAuthenticated redirects signed-in users away from the login page.
  function bounceIfAuthenticated() {
    const session = getSession();
    if (!session.token) return;
    // Async validation: if token is invalid, we silently ignore and show login.
    verifySession().then(function (current) {
      if (current) redirectToDashboard(current.role);
    });
  }

  function logout() {
    clearSession();
    window.location.replace(LOGIN_PAGE);
  }

  /* ── Formatting helpers (shared by dashboards) ──────────────────────── */
  function fmtKsh(n) {
    return "KSh " + (Number(n) || 0).toLocaleString("en-KE");
  }

  function fmtUnits(n) {
    const v = Number(n) || 0;
    return v.toLocaleString("en-KE", { maximumFractionDigits: 1 }) + " kWh";
  }

  function fmtDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.PowerSmart = {
    API_BASE: API_BASE,
    apiRequest: apiRequest,
    getSession: getSession,
    saveSession: saveSession,
    clearSession: clearSession,
    verifySession: verifySession,
    requireAuth: requireAuth,
    redirectToDashboard: redirectToDashboard,
    bounceIfAuthenticated: bounceIfAuthenticated,
    logout: logout,
    fmtKsh: fmtKsh,
    fmtUnits: fmtUnits,
    fmtDateTime: fmtDateTime,
    fmtDate: fmtDate,
    escapeHtml: escapeHtml,
  };
})();
