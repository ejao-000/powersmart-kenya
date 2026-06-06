const BASE = '/api';

function getToken() {
  return localStorage.getItem('ps_token') || '';
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data });
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────
export const auth = {
  register: (payload) => request('POST', '/auth/register', payload),
  login:    (payload) => request('POST', '/auth/login', payload),
  me:       ()        => request('GET',  '/auth/me'),
  logout:   ()        => request('POST', '/auth/logout'),
};

// ── Meter ─────────────────────────────────────────────────────────────────
export const meter = {
  getStatus:      ()        => request('GET',  '/meter'),
  postTelemetry:  (units)   => request('POST', '/meter/telemetry', { units_remaining: units }),
  getPrediction:  ()        => request('GET',  '/meter/prediction'),
  updateSettings: (settings)=> request('PUT',  '/meter/settings', settings),
};

// ── Tokens ────────────────────────────────────────────────────────────────
export const tokens = {
  listHistory:    ()                    => request('GET',    '/tokens'),
  buy:            (payload)             => request('POST',   '/tokens/buy', payload),
  pushBluetooth:  (id, action='request')=> request('POST',   `/tokens/${id}/push-bluetooth?action=${action}`),
  deleteHistory:  (id)                  => request('DELETE', `/tokens/${id}`),
};

// ── Payments ──────────────────────────────────────────────────────────────
export const payments = {
  initiateMpesa:  (payload) => request('POST', '/payments/mpesa/initiate', payload),
  initiateAirtel: (payload) => request('POST', '/payments/airtel/initiate', payload),
  initiateBank:   (payload) => request('POST', '/payments/bank/initiate', payload),
};

// ── Alerts ────────────────────────────────────────────────────────────────
export const alerts = {
  list:   ()               => request('GET',    '/alerts'),
  create: (payload)        => request('POST',   '/alerts', payload),
  update: (id, payload)    => request('PUT',    `/alerts/${id}`, payload),
  delete: (id)             => request('DELETE', `/alerts/${id}`),
};