// Offline mode — snapshots the last-known meter state so users can still see
// their balance, tokens and recent activity without an internet connection.

import {
  meter,
  tokens,
  transactions,
  Meter,
  Prediction,
  Token,
  Transaction,
  UsageSummary,
} from './api';

const SNAPSHOT_KEY = 'powersmart_offline_snapshot';

export interface OfflineSnapshot {
  saved_at: string;
  meter?: Meter | null;
  prediction?: Prediction | null;
  usage?: UsageSummary | null;
  tokens: Token[];
  transactions: Transaction[];
}

// captureOfflineSnapshot fetches the key dashboard data and stores it locally.
export async function captureOfflineSnapshot(): Promise<OfflineSnapshot> {
  const snap: OfflineSnapshot = { saved_at: new Date().toISOString(), tokens: [], transactions: [] };
  try {
    snap.meter = await meter.status();
  } catch { /* optional */ }
  try {
    snap.prediction = await meter.prediction();
  } catch { /* optional */ }
  try {
    snap.usage = await meter.usage();
  } catch { /* optional */ }
  try {
    snap.tokens = await tokens.list();
  } catch { /* optional */ }
  try {
    snap.transactions = await transactions.list();
  } catch { /* optional */ }

  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {
    /* storage full — ignore */
  }
  return snap;
}

export function loadOfflineSnapshot(): OfflineSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.saved_at) return null;
    return parsed as OfflineSnapshot;
  } catch {
    return null;
  }
}

export function snapshotAgeLabel(snap: OfflineSnapshot | null): string {
  if (!snap?.saved_at) return 'never';
  const d = new Date(snap.saved_at);
  if (isNaN(d.getTime())) return 'unknown';
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
}
