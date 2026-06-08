// auth.js — Registration, login, logout, and session guard logic.
// Imported by pages that need to handle authentication actions or guard routes.

import { auth as authApi } from './api.js';
import { isLoggedIn, setUser, clearUser, applyTheme } from './store.js';

// ── Route guard ───────────────────────────────────────────────────────────────
// Call this at the top of every protected page script.
export function requireAuth(redirectTo = '../index.html') {
  if (!isLoggedIn()) {
    location.href = redirectTo;
    return false;
  }
  return true;
}

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Submits the registration form.
 * @param {Object} fields - { name, email, phone, password, meter_account }
 * @returns {Promise<{token: string, user: Object}>}
 * @throws {Error} with .message set to the server error string
 */
export async function register(fields) {
  const res = await authApi.register(fields);
  localStorage.setItem('ps_token', res.token);
  setUser(res.user);
  return res;
}

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * Authenticates the user and stores the JWT.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user: Object}>}
 * @throws {Error} with .message set to the server error string
 */
export async function login(email, password) {
  const res = await authApi.login({ email, password });
  localStorage.setItem('ps_token', res.token);
  setUser(res.user);
  return res;
}

// ── Logout ────────────────────────────────────────────────────────────────────

/**
 * Signs the user out: calls the server (which acks), then wipes local state
 * and redirects to the sign-in page.
 */
export async function logout(redirectTo = '../index.html') {
  try {
    await authApi.logout();
  } catch {
    // Server logout is best-effort; always clear locally
  }
  clearUser();
  applyTheme('system'); // reset theme to system default on logout
  location.href = redirectTo;
}

// ── Password validation helpers ───────────────────────────────────────────────

/**
 * Returns an array of error strings for a candidate password.
 * Empty array means the password is acceptable.
 */
export function validatePassword(password) {
  const errors = [];
  if (password.length < 8)          errors.push('At least 8 characters required');
  if (!/[A-Z]/.test(password))      errors.push('At least one uppercase letter');
  if (!/[0-9]/.test(password))      errors.push('At least one number');
  return errors;
}

/**
 * Returns true when the KP meter account number format is valid (8–12 digits).
 */
export function validateMeterAccount(account) {
  return /^\d{8,12}$/.test(account.trim());
}

/**
 * Returns true when the Kenyan phone number format is valid.
 * Accepts: 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
 */
export function validatePhone(phone) {
  return /^(\+?254|0)[17]\d{8}$/.test(phone.replace(/\s|-/g, ''));
}

// ── Password strength meter ───────────────────────────────────────────────────

/**
 * Returns { score: 0-4, label, color } for a password.
 * score 0-1 = weak, 2 = fair, 3 = good, 4 = strong
 */
export function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  score = Math.min(score, 4);

  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#c0392b', '#e67e22', '#f1c40f', '#2ecc71', '#27ae60'];
  return { score, label: labels[score], color: colors[score] };
}

// ── Attach logout to any element with id="btn-logout" ────────────────────────
// Pages can call this once to wire up the standard sidebar logout button.
export function attachLogoutButton(btnId = 'btn-logout', redirectTo = '../index.html') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('click', () => logout(redirectTo));
}
