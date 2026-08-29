// PowerSmart Kenya — API client.
//
// Talks to the Go backend over HTTP. In development the Vite dev server proxies
// every /api request to the backend (see vite.config.ts), so no CORS is needed.
// In production set window.POWERSMART_API (via frontend/public/config.js or the
// VITE_API_URL build variable) to the backend base URL, e.g.
// "https://api.powersmart.ke/api".

const TOKEN_KEY = 'powersmart_token';
const USER_KEY = 'powersmart_user';
const ROLE_KEY = 'powersmart_role';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  meter_account: string;
  meter_number: string;
  role: 'tenant' | 'landlord' | 'admin';
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Meter {
  id: string;
  user_id: string;
  meter_number: string;
  units_remaining: number;
  daily_avg_units: number;
  last_reading_at: string | null;
  auto_topup: boolean;
  topup_threshold: number;
  topup_amount_ksh: number;
  updated_at: string;
}

export interface Prediction {
  units_remaining: number;
  daily_avg_units: number;
  days_remaining: number;
  depletion_date: string | null;
  confidence_level: 'high' | 'medium' | 'low';
  alert_level: 'ok' | 'warning' | 'critical';
  recommended_topup_ksh: number;
}

export interface Token {
  id: string;
  user_id: string;
  meter_id: string;
  token_number: string;
  units: number;
  amount_ksh: number;
  payment_ref: string;
  pushed_at: string | null;
  push_status: 'pending' | 'success' | 'failed' | 'manual';
  purchased_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  token_id?: string;
  channel: 'mpesa' | 'airtel' | 'bank';
  phone?: string;
  amount_ksh: number;
  reference: string;
  provider_ref: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  type: 'low_units' | 'days_left' | 'auto_topup';
  threshold: number;
  channel: 'push' | 'sms' | 'email';
  enabled: boolean;
  last_fired_at: string | null;
  created_at: string;
}

export interface PaymentInitResponse {
  transaction_id: string;
  reference: string;
  channel: string;
  status: string;
  message: string;
  bank_account?: string;
  bank_name?: string;
  bank_reference?: string;
}

function apiBase(): string {
  const viteUrl = (import.meta.env.VITE_API_URL as string | undefined) || '';
  const winUrl = (window as any).POWERSMART_API || '';
  const base = viteUrl || winUrl || '/api';
  return String(base).replace(/\/+$/, '');
}

class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T = any>(
  path: string,
  options: {
    method?: string;
    body?: any;
    skipAuthRedirect?: boolean;
  } = {}
): Promise<T> {
  const { skipAuthRedirect } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getSession().token;
  if (token) headers.Authorization = 'Bearer ' + token;

  let response: Response;
  try {
    response = await fetch(apiBase() + path, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Network error — cannot reach the PowerSmart API.', 0);
  }

  if (response.status === 401 && !skipAuthRedirect) {
    clearSession();
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(
      (data && (data.error || data.message)) ||
        'Something went wrong (HTTP ' + response.status + ').',
      response.status,
      data
    );
  }

  if (data === null) {
    throw new ApiError(
      'Unexpected server response from ' + apiBase() + path +
        '. This usually means the frontend cannot reach the Go backend.',
      response.status
    );
  }

  return data as T;
}

// ── Session ───────────────────────────────────────────────────────────────────

export function getSession(): { token: string | null; user: User | null; role: string } {
  let user: User | null = null;
  try {
    user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    user = null;
  }
  return {
    token: localStorage.getItem(TOKEN_KEY),
    user,
    role: localStorage.getItem(ROLE_KEY) || (user && user.role) || '',
  };
}

export function saveSession(token: string, user: User, role?: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ROLE_KEY, role || user.role || '');
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  register: (body: {
    name: string;
    email: string;
    phone: string;
    password: string;
    meter_account: string;
    role?: string;
  }) => request<AuthResponse>('/auth/register', { method: 'POST', body, skipAuthRedirect: true }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body, skipAuthRedirect: true }),

  adminLogin: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/admin-login', { method: 'POST', body, skipAuthRedirect: true }),

  me: () => request<{ success: boolean; data: User }>('/auth/me'),

  logout: () => request('/auth/logout', { method: 'POST' }),
};

// ── Meter ────────────────────────────────────────────────────────────────────

export const meter = {
  status: () => request<Meter>('/meter'),
  prediction: () => request<Prediction>('/meter/prediction'),
  telemetry: (units_remaining: number) =>
    request('/meter/telemetry', { method: 'POST', body: { units_remaining } }),
  settings: (body: { auto_topup?: boolean; topup_threshold?: number; topup_amount_ksh?: number }) =>
    request('/meter/settings', { method: 'PUT', body }),
};

// ── Tokens ───────────────────────────────────────────────────────────────────

export const tokens = {
  list: () => request<Token[]>('/tokens'),
  buy: (body: { amount_ksh: number; payment_channel: string; phone?: string }) =>
    request<Token>('/tokens/buy', { method: 'POST', body }),
  push: (id: string, action: 'confirm' | 'fail' | 'request') =>
    request(`/tokens/${id}/push-bluetooth?action=${action}`, { method: 'POST' }),
  remove: (id: string) => request(`/tokens/${id}`, { method: 'DELETE' }),
};

// ── Transactions ─────────────────────────────────────────────────────────────

export const transactions = {
  list: () => request<Transaction[]>('/transactions'),
};

// ── Payments ─────────────────────────────────────────────────────────────────

export const payments = {
  mpesa: (body: { amount_ksh: number; phone: string }) =>
    request<PaymentInitResponse>('/payments/mpesa/initiate', { method: 'POST', body }),
  airtel: (body: { amount_ksh: number; phone: string }) =>
    request<PaymentInitResponse>('/payments/airtel/initiate', { method: 'POST', body }),
  bank: (body: { amount_ksh: number }) =>
    request<PaymentInitResponse>('/payments/bank/initiate', { method: 'POST', body }),
};

// ── Alerts ───────────────────────────────────────────────────────────────────

export const alerts = {
  list: () => request<{ success: boolean; data: Alert[] }>('/alerts'),
  create: (body: { type: string; threshold: number; channel: string }) =>
    request<Alert>('/alerts', { method: 'POST', body }),
  update: (id: string, body: { threshold?: number; channel?: string; enabled?: boolean }) =>
    request<Alert>(`/alerts/${id}`, { method: 'PUT', body }),
  remove: (id: string) => request(`/alerts/${id}`, { method: 'DELETE' }),
};

// ── Formatting helpers ───────────────────────────────────────────────────────

export const fmtKsh = (n: number | undefined | null) =>
  'KSh ' + (Number(n) || 0).toLocaleString('en-KE');

export const fmtUnits = (n: number | undefined | null) =>
  (Number(n) || 0).toLocaleString('en-KE', { maximumFractionDigits: 1 }) + ' kWh';

export const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
