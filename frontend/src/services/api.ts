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
  name: string;
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

export interface UsageDay {
  date: string;
  kwh: number;
  cost_ksh: number;
}

export interface UsageSummary {
  today_kwh: number;
  today_cost_ksh: number;
  week_kwh: number;
  week_cost_ksh: number;
  month_kwh: number;
  month_cost_ksh: number;
  daily_avg_kwh: number;
  tariff_ksh: number;
  daily: UsageDay[];
  data_quality: 'high' | 'low';
  generated_at: string;
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
  push_method?: 'wifi' | 'bluetooth' | '';
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

export type OutageStatus = 'reported' | 'confirmed' | 'resolved';

export interface Outage {
  id: string;
  user_id: string;
  reporter_name: string;
  area: string;
  latitude: number;
  longitude: number;
  description: string;
  status: OutageStatus;
  created_at: string;
}

export type CoachSeverity = 'success' | 'info' | 'warning' | 'critical';

export interface EnergyBudget {
  id: string;
  meter_id: string;
  monthly_budget_ksh: number;
  created_at: string;
  updated_at: string;
}

export interface EnergyAppliance {
  id: string;
  meter_id: string;
  name: string;
  watts: number;
  hours_per_day: number;
  created_at: string;
  updated_at: string;
  daily_kwh: number;
  monthly_kwh: number;
  daily_cost_ksh: number;
  monthly_cost_ksh: number;
  share_pct: number;
}

export interface EnergyBudgetConfig {
  monthly_budget_ksh: number;
  configured: boolean;
  suggested_ksh: number;
}

export interface SpendForecast {
  projected_month_kwh: number;
  projected_month_cost_ksh: number;
  last_period_cost_ksh: number;
  delta_ksh: number;
  delta_pct: number;
  overrun_ksh: number;
  budget_used_pct: number;
  status: 'ok' | 'warning' | 'critical';
}

export interface CoachInsight {
  severity: CoachSeverity;
  title: string;
  message: string;
}

export interface EnergyIntel {
  meter_id: string;
  meter_name: string;
  tariff_ksh: number;
  units_remaining: number;
  days_remaining: number;
  depletion_date: string | null;
  confidence_level: string;
  recommended_topup_ksh: number;
  budget: EnergyBudgetConfig;
  forecast: SpendForecast;
  usage: UsageSummary;
  appliances: EnergyAppliance[];
  model_coverage_pct: number;
  coach: CoachInsight[];
  generated_at: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  meter_account: string;
  created_at: string;
}

export interface AdminMeter {
  id: string;
  meter_number: string;
  units_remaining: number;
  auto_topup: boolean;
  owner_name: string;
  owner_email: string;
  updated_at: string | null;
}

export interface AdminTransaction {
  id: string;
  channel: string;
  amount_ksh: number;
  reference: string;
  status: string;
  owner_email: string;
  created_at: string;
}

// ── Admin (role-restricted) ─────────────────────────────────────────────────

export const adminApi = {
  users: () => request<AdminUser[]>('/admin/users'),
  meters: () => request<AdminMeter[]>('/admin/meters'),
  transactions: () => request<AdminTransaction[]>('/admin/transactions'),
  merchants: () => request<MerchantProfile[]>('/admin/merchants'),
  setMerchantStatus: (id: string, status: string) =>
    request<MerchantProfile>(`/admin/merchants/${id}/status`, { method: 'POST', body: { status } }),
};

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
  usage: () => request<UsageSummary>('/meter/usage'),
  telemetry: (units_remaining: number) =>
    request('/meter/telemetry', { method: 'POST', body: { units_remaining } }),
  settings: (body: { auto_topup?: boolean; topup_threshold?: number; topup_amount_ksh?: number }) =>
    request('/meter/settings', { method: 'PUT', body }),
  reserve: () => request<ReserveView>('/meter/reserve'),
  setReserve: (reserved_kwh: number) =>
    request<ReserveView>('/meter/reserve', { method: 'PUT', body: { reserved_kwh } }),
  releaseReserve: () => request<ReserveView>('/meter/reserve/release', { method: 'POST' }),
};

// ── Meters (multi-meter / landlord) ───────────────────────────────────────────

export const meters = {
  list: () => request<Meter[]>('/meters'),
  add: (body: { name: string; meter_number: string; units_remaining?: number }) =>
    request<Meter>('/meters', { method: 'POST', body }),
  settings: (id: string, body: { auto_topup?: boolean; topup_threshold?: number; topup_amount_ksh?: number }) =>
    request(`/meters/${id}/settings`, { method: 'PUT', body }),
};

// ── Tokens ───────────────────────────────────────────────────────────────────

export const tokens = {
  list: () => request<Token[]>('/tokens'),
  buy: (body: { amount_ksh: number; payment_channel: string; phone?: string; meter_id?: string }) =>
    request<Token>('/tokens/buy', { method: 'POST', body }),
  importToken: (body: {
    token_number: string;
    amount_ksh?: number;
    units?: number;
    purchased_at?: string;
  }) => request<Token>('/tokens/import', { method: 'POST', body }),
  transfer: (body: { meter_account: string; amount_ksh: number }) =>
    request<Token>('/tokens/transfer', { method: 'POST', body }),
  push: (id: string, action: 'request' | 'confirm' | 'fail', method: 'wifi' | 'bluetooth') =>
    request(`/tokens/${id}/push-bluetooth?action=${action}&method=${method}`, { method: 'POST' }),
  remove: (id: string) => request(`/tokens/${id}`, { method: 'DELETE' }),
};

// ── Transactions ─────────────────────────────────────────────────────────────

export const transactions = {
  list: () => request<Transaction[]>('/transactions'),
};

// ── Payments ─────────────────────────────────────────────────────────────────

export const payments = {
  config: () =>
    request<{
      mpesa_configured: boolean;
      mpesa_env: string;
      mpesa_callback_url: string;
      airtel_configured: boolean;
      bank_configured: boolean;
    }>('/payments/config'),
  mpesa: (body: { amount_ksh: number; phone: string }) =>
    request<PaymentInitResponse>('/payments/mpesa/initiate', { method: 'POST', body }),
  airtel: (body: { amount_ksh: number; phone: string }) =>
    request<PaymentInitResponse>('/payments/airtel/initiate', { method: 'POST', body }),
  bank: (body: { amount_ksh: number }) =>
    request<PaymentInitResponse>('/payments/bank/initiate', { method: 'POST', body }),
};

// ── Outages (community power-outage reports + map) ───────────────────────────

export const outages = {
  list: () => request<Outage[]>('/outages'),
  report: (body: { area: string; latitude: number; longitude: number; description: string }) =>
    request<Outage>('/outages', { method: 'POST', body }),
  risk: () => request<OutageRisk>('/outages/risk'),
};

export interface OutageRisk {
  risk_pct: number;
  level: 'low' | 'moderate' | 'high' | 'very_high';
  reasons: string[];
  tips: string[];
}

// ── Backup power manager ─────────────────────────────────────────────────────

export interface BackupSource {
  id: string;
  user_id: string;
  type: 'solar' | 'inverter' | 'battery' | 'generator' | 'power_station';
  name: string;
  capacity_kwh: number;
  charge_pct: number;
  created_at: string;
  updated_at: string;
}

export const backup = {
  list: () => request<BackupSource[]>('/backup'),
  upsert: (body: { type: string; name?: string; capacity_kwh: number; charge_pct?: number }) =>
    request<BackupSource>('/backup', { method: 'PUT', body }),
  remove: (id: string) => request(`/backup/${id}`, { method: 'DELETE' }),
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

// ── Power reserve + emergency requests + green score ─────────────────────────

export interface ReserveView {
  meter_id: string;
  units_remaining: number;
  reserved_kwh: number;
  available_kwh: number;
  updated_at: string;
}

export interface PowerRequest {
  id: string;
  user_id: string;
  requester_name?: string;
  meter_account: string;
  amount_ksh: number;
  note?: string;
  status: 'open' | 'fulfilled' | 'cancelled';
  fulfilled_by?: string;
  helper_name?: string;
  created_at: string;
  fulfilled_at?: string | null;
}

export interface PowerRequestBundle {
  open: PowerRequest[];
  mine: PowerRequest[];
}

export interface PowerRequestFulfillment {
  request: PowerRequest;
  token: Token;
}

export const powerRequests = {
  create: (body: { amount_ksh: number; note?: string }) =>
    request<PowerRequest>('/power-requests', { method: 'POST', body }),
  list: () => request<PowerRequestBundle>('/power-requests'),
  fulfil: (id: string) => request<PowerRequestFulfillment>(`/power-requests/${id}/fulfill`, { method: 'POST' }),
  cancel: (id: string) => request(`/power-requests/${id}/cancel`, { method: 'POST' }),
};

// ── Energy Intelligence (budget planner + appliance insights + AI coach) ─────

export const energy = {
  intel: (meterId?: string) =>
    request<EnergyIntel>(
      '/energy/intel' + (meterId ? `?meter_id=${encodeURIComponent(meterId)}` : '')
    ),
  saveBudget: (body: { meter_id?: string; monthly_budget_ksh: number }) =>
    request<EnergyBudget>('/energy/budget', { method: 'PUT', body }),
  addAppliance: (body: {
    meter_id?: string;
    name: string;
    watts: number;
    hours_per_day: number;
  }) => request<EnergyAppliance>('/energy/appliances', { method: 'POST', body }),
  updateAppliance: (
    id: string,
    body: { name?: string; watts?: number; hours_per_day?: number }
  ) => request<EnergyAppliance>(`/energy/appliances/${id}`, { method: 'PUT', body }),
  removeAppliance: (id: string) =>
    request(`/energy/appliances/${id}`, { method: 'DELETE' }),
};

// ── Power Pools (shared electricity wallet) ──────────────────────────────────

export type PoolRole = 'owner' | 'admin' | 'member';

export interface PowerPoolSummary {
  id: string;
  name: string;
  meter_id: string;
  meter_name: string;
  invite_code: string;
  my_role: PoolRole;
  my_can_buy: boolean;
  my_can_invite: boolean;
  balance_ksh: number;
  contributions_ksh: number;
  spent_ksh: number;
  member_count: number;
  created_at: string;
}

export interface PoolMember {
  id: string;
  pool_id: string;
  user_id: string;
  role: PoolRole;
  can_buy: boolean;
  can_invite: boolean;
  joined_at: string;
  name?: string;
  contributed_ksh?: number;
}

export interface PoolActivity {
  kind: 'contribution' | 'expense';
  id: string;
  user_name?: string;
  amount_ksh: number;
  channel?: string;
  note?: string;
  token_number?: string;
  token_units?: number;
  created_at: string;
}

export interface PowerPoolDetail {
  id: string;
  name: string;
  meter_id: string;
  meter_name: string;
  invite_code: string;
  my_role: PoolRole;
  my_can_buy: boolean;
  my_can_invite: boolean;
  balance_ksh: number;
  contributions_ksh: number;
  spent_ksh: number;
  members: PoolMember[];
  activity: PoolActivity[];
  created_at: string;
}

export interface PoolContribution {
  id: string;
  pool_id: string;
  user_id: string;
  user_name?: string;
  amount_ksh: number;
  channel: string;
  note?: string;
  created_at: string;
}

export interface PoolPurchaseResult {
  expense: {
    id: string;
    amount_ksh: number;
    user_name?: string;
    token_number?: string;
    token_units?: number;
    created_at: string;
  };
  token: Token;
  balance_ksh: number;
}

export const pools = {
  create: (body: { meter_id: string; name: string }) =>
    request<PowerPoolSummary>('/pools', { method: 'POST', body }),
  list: () => request<PowerPoolSummary[]>('/pools'),
  get: (id: string) => request<PowerPoolDetail>(`/pools/${id}`),
  join: (body: { invite_code: string }) =>
    request<PowerPoolDetail>('/pools/join', { method: 'POST', body }),
  contribute: (id: string, body: { amount_ksh: number; channel: string; note?: string }) =>
    request<PoolContribution>(`/pools/${id}/contributions`, { method: 'POST', body }),
  purchase: (id: string, body: { amount_ksh: number }) =>
    request<PoolPurchaseResult>(`/pools/${id}/purchase`, { method: 'POST', body }),
  addMember: (id: string, body: { email: string; can_buy?: boolean; can_invite?: boolean }) =>
    request<PoolMember>(`/pools/${id}/members`, { method: 'POST', body }),
  updateMember: (
    id: string,
    memberId: string,
    body: { role?: PoolRole; can_buy?: boolean; can_invite?: boolean }
  ) => request<PoolMember>(`/pools/${id}/members/${memberId}`, { method: 'PATCH', body }),
  removeMember: (id: string, memberId: string) =>
    request(`/pools/${id}/members/${memberId}`, { method: 'DELETE' }),
};

// ── Landlord intelligence (unit comparison + anomaly detection + reports) ────

export type AnomalySeverity = 'critical' | 'warning' | 'info';

export interface MeterAnomaly {
  severity: AnomalySeverity;
  title: string;
  reason: string;
  action: string;
}

export interface UnitInsight {
  meter_id: string;
  meter_name: string;
  meter_number: string;
  units_remaining: number;
  daily_avg_kwh: number;
  month_kwh: number;
  month_cost_ksh: number;
  last_7_kwh: number;
  prev_7_kwh: number;
  change_pct: number;
  anomaly: MeterAnomaly | null;
}

export interface InsightsBundle {
  units: UnitInsight[];
  flagged_count: number;
  total_month_cost_ksh: number;
  total_month_kwh: number;
  generated_at: string;
}

export interface MonthlyReportRow {
  meter_id: string;
  meter_name: string;
  meter_number: string;
  tokens: number;
  units_kwh: number;
  spend_ksh: number;
  avg_rate_ksh: number;
}

export interface MonthlyReport {
  period: string;
  generated_at: string;
  rows: MonthlyReportRow[];
  totals: { tokens: number; units_kwh: number; spend_ksh: number };
}

export const insights = {
  bundle: () => request<InsightsBundle>('/insights'),
  report: (month?: string) =>
    request<MonthlyReport>(
      '/reports/monthly' + (month ? `?month=${encodeURIComponent(month)}` : '')
    ),
};

// ── Savings Hub (goals, challenges, leaderboard, carbon) ─────────────────────

export interface SavingsGoal {
  id: string;
  meter_id: string;
  meter_name?: string;
  label: string;
  baseline_ksh: number;
  target_ksh: number;
  current_ksh?: number;
  progress_pct?: number;
  active: boolean;
  achieved: boolean;
  created_at: string;
  achieved_at?: string | null;
}

export type ChallengeStatus = 'done' | 'open' | 'no_data' | 'no_budget';

export interface Challenge {
  key: string;
  title: string;
  description: string;
  points: number;
  achieved: boolean;
  status: ChallengeStatus;
  message?: string;
}

export interface LeaderboardRow {
  user_name: string;
  points: number;
  claims: number;
}

export interface LeaderboardResponse {
  rows: LeaderboardRow[];
  my_name: string;
  my_points: number;
  my_rank: number;
  my_claims: number;
}

export interface NeighborhoodRow {
  name: string;
  points: number;
  members: number;
}

export interface NeighborhoodLeaderboard {
  rows: NeighborhoodRow[];
  my_hood: string;
  my_rank: number;
}

export interface CarbonSummary {
  factor_kg_per_kwh: number;
  today_kg: number;
  week_kg: number;
  month_kg: number;
  trees_monthly: number;
}

export interface GreenScore {
  score: number;
  grade: string;
  usage_change_pct: number;
  points: number;
  carbon_kg_month: number;
}

export const savings = {
  goals: () => request<SavingsGoal[]>('/goals'),
  createGoal: (body: { target_ksh: number; meter_id?: string; label?: string }) =>
    request<SavingsGoal>('/goals', { method: 'POST', body }),
  completeGoal: (id: string) => request(`/goals/${id}/complete`, { method: 'POST' }),
  removeGoal: (id: string) => request(`/goals/${id}`, { method: 'DELETE' }),
  challenges: () => request<Challenge[]>('/challenges'),
  claimChallenge: (key: string) => request<Challenge>(`/challenges/${key}/claim`, { method: 'POST' }),
  leaderboard: () => request<LeaderboardResponse>('/challenges/leaderboard'),
  neighborhoods: () => request<NeighborhoodLeaderboard>('/challenges/neighborhoods'),
  setNeighborhood: (body: { neighborhood: string }) =>
    request<{ status: string }>('/profile/neighborhood', { method: 'PUT', body }),
  carbon: () => request<CarbonSummary>('/impact/carbon'),
  score: () => request<GreenScore>('/impact/score'),
};

// ── Merchant / vendor mode ───────────────────────────────────────────────────

export interface MerchantProfile {
  id: string;
  user_id: string;
  user_name?: string;
  business_name: string;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface MerchantLedger {
  id: string;
  type: 'topup' | 'sale';
  amount_ksh: number;
  reference?: string;
  customer_account?: string;
  created_at: string;
}

export interface MerchantStatus {
  profile: MerchantProfile | null;
  float_ksh: number;
  total_topups_ksh: number;
  total_sales_ksh: number;
  sales_count: number;
  recent_sales: MerchantLedger[];
}

export interface VendResult {
  token: Token;
  balance_ksh: number;
  customer_name?: string;
}

export const merchant = {
  apply: (body: { business_name: string }) => request<MerchantProfile>('/merchant/apply', { method: 'POST', body }),
  me: () => request<MerchantStatus>('/merchant/me'),
  topup: (body: { amount_ksh: number; channel: string }) =>
    request<MerchantStatus>('/merchant/float', { method: 'POST', body }),
  vend: (body: { meter_account: string; amount_ksh: number }) =>
    request<VendResult>('/merchant/vend', { method: 'POST', body }),
};

// ── Energy marketplace ───────────────────────────────────────────────────────

export interface MarketplaceProduct {
  id: string;
  category: string;
  name: string;
  description: string;
  price_ksh: number;
  est_savings_ksh_month: number;
  created_at: string;
}

export interface MarketplaceRecommendation {
  product: MarketplaceProduct;
  basis: string;
  reason: string;
}

export interface MarketplaceBrowse {
  products: MarketplaceProduct[];
  recommendations: MarketplaceRecommendation[];
  generated_at: string;
}

export const marketplace = {
  browse: () => request<MarketplaceBrowse>('/marketplace'),
};

// Builds and triggers a client-side CSV download.
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

// Human "smart notification" phrasing for a predicted run-out, e.g.
// "Thursday at 7:00 PM" or "in about 2.3 days".
export const describeDepletion = (
  days: number | null | undefined,
  iso: string | null | undefined
): string | null => {
  if (iso) {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-KE', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
    }
  }
  if (typeof days === 'number' && days > 0) {
    return `in about ${days.toFixed(1)} days`;
  }
  return null;
};
