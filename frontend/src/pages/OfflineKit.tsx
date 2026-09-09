import React, { useCallback, useEffect, useState } from 'react';
import {
  WifiOff,
  CloudOff,
  CloudDownload,
  Zap,
  CalendarClock,
  KeyRound,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { SectionCard } from './ui';
import {
  captureOfflineSnapshot,
  loadOfflineSnapshot,
  snapshotAgeLabel,
  OfflineSnapshot,
} from '../services/offline';
import { fmtKsh, fmtUnits } from '../services/api';

const useOnline = () => {
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
};

export const OfflineKit: React.FC = () => {
  const online = useOnline();
  const [snap, setSnap] = useState<OfflineSnapshot | null>(() => loadOfflineSnapshot());
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSaving(true);
    try {
      const s = await captureOfflineSnapshot();
      setSnap(s);
      setFlash('Offline copy updated with your latest state.');
      setTimeout(() => setFlash(null), 3500);
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    // Auto-refresh the copy the first time this page opens while online.
    if (online && !snap) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = (num: string) => {
    navigator.clipboard?.writeText(num).catch(() => {});
    setFlash('Token copied — save it somewhere safe.');
    setTimeout(() => setFlash(null), 2500);
  };

  const balance = snap?.meter?.units_remaining ?? 0;
  const daysLeft = snap?.prediction?.days_remaining;
  const lastTokens = snap?.tokens.slice(0, 5) ?? [];
  const lastTx = snap?.transactions.slice(0, 3) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Offline Kit</h1>
          <p className="ps-sub">Keep a snapshot of your power on this device — it works without internet.</p>
        </div>
        <button onClick={refresh} disabled={!online || saving} className="ps-btn disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={14} />}
          {saving ? 'Saving…' : 'Refresh offline copy'}
        </button>
      </div>

      {/* Connection status */}
      <div
        className={`flex items-start gap-2.5 px-4 py-3.5 rounded-xl border ${
          online ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
        }`}
      >
        {online ? (
          <ShieldCheck size={16} className="text-emerald-500 mt-0.5 shrink-0" />
        ) : (
          <WifiOff size={16} className="text-amber-500 mt-0.5 shrink-0" />
        )}
        <div>
          <p className={`text-[13px] font-bold ${online ? 'text-emerald-700' : 'text-amber-800'}`}>
            {online ? 'You are online' : 'You are offline'}
          </p>
          <p className={`text-[12px] ${online ? 'text-emerald-700/80' : 'text-amber-700/90'}`}>
            {online
              ? 'Update your offline copy whenever you want — it is stored safely on this device.'
              : `Showing the snapshot saved ${snapshotAgeLabel(snap)}. Data here was captured the last time you were online.`}
          </p>
        </div>
      </div>

      {flash && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
          <Check size={16} /> {flash}
        </div>
      )}

      {!snap ? (
        <div className="ps-card p-12 text-center">
          <CloudOff size={40} className="mx-auto text-gray-200" />
          <p className="mt-4 text-[14px] font-bold text-gray-700">No offline copy yet</p>
          <p className="mt-1 text-[13px] text-gray-500">Connect to the internet and tap “Refresh offline copy” once.</p>
        </div>
      ) : (
        <>
          {/* Balance hero */}
          <div className="ps-card p-6 md:p-8 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 border-navy-800 text-white relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gold-500/10" />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest text-gold-400 flex items-center gap-1.5">
                  <Zap size={14} /> Last known balance
                </p>
                <p className="mt-2 text-5xl font-black tracking-tight">
                  {balance.toFixed(1)} <span className="text-xl font-bold text-slate-300">kWh</span>
                </p>
                <p className="mt-2 text-[13px] text-slate-300">
                  {daysLeft !== undefined && daysLeft !== null && daysLeft > 0
                    ? `Estimated ${daysLeft.toFixed(1)} days of power remaining`
                    : 'Prediction unavailable in this snapshot'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Snapshot</p>
                  <p className="text-[13px] font-bold text-white mt-1">{snapshotAgeLabel(snap)}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Tokens kept</p>
                  <p className="text-[13px] font-bold text-white mt-1">{snap.tokens.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Saved tokens */}
            <div className="xl:col-span-2">
              <SectionCard title="Saved tokens (offline)">
                {lastTokens.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-gray-400">No tokens in this snapshot.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {lastTokens.map((t) => (
                      <div key={t.id} className="py-3 flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-500 grid place-items-center shrink-0">
                          <KeyRound size={16} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-gray-800">{fmtKsh(t.amount_ksh)} · {fmtUnits(t.units)}</p>
                          <p className="font-mono text-[12px] text-gray-400 truncate">
                            {(t.token_number.match(/.{1,4}/g) || []).join(' ')}
                          </p>
                        </div>
                        <button
                          onClick={() => copy(t.token_number)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[12px] font-bold text-gray-600 cursor-pointer"
                        >
                          <Copy size={13} /> Copy
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[12px] text-gray-400 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-500" /> Your real token history is also always backed
                  up in the cloud under Token History.
                </p>
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard title="Recent payments">
                {lastTx.length === 0 ? (
                  <p className="py-4 text-center text-[13px] text-gray-400">No payments in this snapshot.</p>
                ) : (
                  <div className="space-y-2.5">
                    {lastTx.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/60 border border-gray-100">
                        <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center shrink-0">
                          <Wallet size={14} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-gray-800">{fmtKsh(t.amount_ksh)}</p>
                          <p className="text-[11px] text-gray-400 uppercase">{t.channel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Usage snapshot">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">This week</span>
                    <span className="text-[13px] font-bold text-gray-800">
                      {snap.usage ? `${snap.usage.week_kwh} kWh` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">This month</span>
                    <span className="text-[13px] font-bold text-gray-800">
                      {snap.usage ? `${snap.usage.month_kwh} kWh` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">Daily average</span>
                    <span className="text-[13px] font-bold text-gray-800">
                      {snap.usage?.daily_avg_kwh ? `${snap.usage.daily_avg_kwh.toFixed(1)} kWh` : '—'}
                    </span>
                  </div>
                </div>
              </SectionCard>

              <div className="ps-card p-4 bg-sky-50 border-sky-100 flex items-start gap-2.5">
                <CalendarClock size={16} className="text-sky-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-sky-700">
                  Remember to refresh this snapshot whenever you top up, so it stays current for the next time you lose
                  connection.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OfflineKit;
