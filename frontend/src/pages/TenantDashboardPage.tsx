import React, { useEffect, useState, useCallback } from 'react';
import {
  Zap,
  RefreshCw,
  Check,
  Copy,
  AlertTriangle,
  CalendarClock,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Gauge,
  Target,
  Sparkles,
  KeyRound,
  Radio,
} from 'lucide-react';
import { SectionCard } from './ui';
import { TokenPushControls } from '../components/TokenPushControls';
import {
  meter,
  tokens,
  outages,
  Meter,
  Prediction,
  UsageSummary,
  Token,
  Outage,
  fmtKsh,
  fmtUnits,
  fmtDateTime,
} from '../services/api';

interface TenantDashboardPageProps {
  onNavigate?: (page: string) => void;
}

const mask = (n: string) => (n.length > 6 ? `${n.slice(0, 3)}••••••${n.slice(-3)}` : n);
const formatToken = (t: string) => (t.match(/.{1,4}/g) || []).join(' ');

export const TenantDashboardPage: React.FC<TenantDashboardPageProps> = ({ onNavigate }) => {
  const [meterData, setMeterData] = useState<Meter | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [tokenList, setTokenList] = useState<Token[]>([]);
  const [outageList, setOutageList] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setMeterData(await meter.status());
      try {
        setPrediction(await meter.prediction());
      } catch { /* optional */ }
      try {
        setUsage(await meter.usage());
      } catch { /* optional */ }
      setTokenList(await tokens.list());
      try {
        setOutageList(await outages.list());
      } catch { /* optional */ }
    } catch { /* portal header handles errors */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remaining = meterData?.units_remaining ?? 0;
  const daysLeft =
    prediction && typeof prediction.days_remaining === 'number' ? prediction.days_remaining : null;
  const dailyAvg = usage?.daily_avg_kwh ?? meterData?.daily_avg_units ?? 0;

  const balanceKsh = Math.round(remaining * (usage?.tariff_ksh ?? 15.18));
  const maxKwh = 100;
  const pct = Math.min(Math.max((remaining / maxKwh) * 100, 0), 100);

  // Weekly budget: local preference with a sensible default.
  const [weeklyBudget, setWeeklyBudget] = useState<number>(
    () => Number(localStorage.getItem('ps_weekly_budget')) || 1000
  );
  const weeklySpend = usage?.week_cost_ksh ?? 0;
  const budgetPct = Math.min((weeklySpend / weeklyBudget) * 100, 100);

  const depletionText =
    prediction?.depletion_date
      ? new Date(prediction.depletion_date).toLocaleString('en-KE', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })
      : null;

  const latest = tokenList[0] || null;
  const activeOutage = outageList.find((o) => o.status !== 'resolved') || null;
  const lowBalance = remaining <= 15;
  const criticalBalance = remaining <= 5;

  const copyLatest = () => {
    if (!latest) return;
    navigator.clipboard?.writeText(latest.token_number).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const buy = () => onNavigate && onNavigate('tokens');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">My Electricity</h1>
          <p className="ps-sub">Your prepaid balance, forecast and quick actions — all in one place.</p>
        </div>
        <button onClick={refresh} className="ps-btn-outline !px-3 !py-2" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Balance hero ─────────────────────────────────────────────── */}
      <div className="ps-card p-6 md:p-8 bg-brand-500 text-white border-brand-500 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-white/5" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <p className="text-[12px] font-bold uppercase tracking-widest text-emerald-100 flex items-center gap-1.5">
              <Zap size={14} /> My Electricity
            </p>
            <p className="mt-3 text-5xl md:text-6xl font-black tracking-tight">
              {loading ? '—' : remaining.toFixed(1)}
              <span className="text-xl md:text-2xl font-bold text-emerald-100 ml-2">kWh</span>
            </p>
            <div className="mt-4 h-2.5 rounded-full bg-white/15 overflow-hidden max-w-md">
              <div
                className={`h-full rounded-full transition-all ${criticalBalance ? 'bg-red-400' : lowBalance ? 'bg-amber-400' : 'bg-emerald-300'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-emerald-50/90">
              <span className="flex items-center gap-1.5">
                <CalendarClock size={15} />
                {daysLeft !== null ? `Approximately ${daysLeft.toFixed(1)} days remaining` : 'Insufficient data for forecast'}
              </span>
              <span className="flex items-center gap-1.5">
                <Wallet size={15} />
                ≈ {fmtKsh(balanceKsh)} of power
              </span>
            </div>
          </div>

          <button
            onClick={buy}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-brand-600 text-[15px] font-black shadow-lg shadow-brand-900/20 hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            <Zap size={18} /> BUY TOKENS
          </button>
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────── */}
      {criticalBalance && (
        <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-red-50 border border-red-100">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-[13px] text-red-700">
            <span className="font-bold">Critical balance.</span> You have {remaining.toFixed(1)} kWh left — buy a token now to avoid an outage.
          </p>
        </div>
      )}
      {lowBalance && !criticalBalance && (
        <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-100">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[13px] text-amber-700">
            <span className="font-bold">Low balance.</span> Consider topping up soon — your power is estimated to last {daysLeft !== null ? `~${daysLeft.toFixed(1)} days` : 'a few days'}.
          </p>
        </div>
      )}

      {/* Send power to meter */}
      <div className="ps-card p-5 bg-gradient-to-r from-sky-50 to-emerald-50 border border-sky-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl bg-sky-500 text-white grid place-items-center shrink-0 shadow-md shadow-sky-500/20">
            <Radio size={20} />
          </span>
          <div>
            <p className="text-[14px] font-bold text-sky-800">Send power to your meter</p>
            <p className="text-[12px] text-sky-700/90 mt-0.5 leading-relaxed">
              Load any unapplied token straight onto your prepaid meter via{' '}
              <span className="font-bold">WiFi</span> or <span className="font-bold">Bluetooth</span> — no more typing 20-digit codes.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate && onNavigate('history')}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-[12px] font-bold transition-colors cursor-pointer"
        >
          <Radio size={14} /> Send token now
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left column: usage + budget + recommendation ────────────── */}
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="ps-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 grid place-items-center">
                  <Gauge size={15} />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Today's usage</p>
              </div>
              <p className="text-2xl font-black text-gray-900">{usage ? `${usage.today_kwh} kWh` : '—'}</p>
              <p className="text-[12px] text-gray-500 mt-1">≈ {fmtKsh(usage?.today_cost_ksh)}</p>
            </div>
            <div className="ps-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 grid place-items-center">
                  <TrendingUp size={15} />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Weekly spend</p>
              </div>
              <p className="text-2xl font-black text-gray-900">{fmtKsh(weeklySpend)}</p>
              <p className="text-[12px] text-gray-500 mt-1">{dailyAvg > 0 ? `${dailyAvg.toFixed(1)} kWh/day avg` : 'No usage data yet'}</p>
            </div>
            <div className="ps-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 grid place-items-center">
                  <KeyRound size={15} />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Tokens purchased</p>
              </div>
              <p className="text-2xl font-black text-gray-900">{tokenList.length}</p>
              <p className="text-[12px] text-gray-500 mt-1">
                {tokenList.filter((t) => t.push_status === 'success').length} applied to meter
              </p>
            </div>
            <div className="ps-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 grid place-items-center">
                  <Target size={15} />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Predicted run-out</p>
              </div>
              <p className="text-lg font-black text-gray-900 leading-snug">
                {depletionText ?? (daysLeft !== null ? `~${daysLeft.toFixed(1)} days` : '—')}
              </p>
              <p className="text-[12px] text-gray-500 mt-1">
                Confidence:{' '}
                <span className={`font-bold ${prediction?.confidence_level === 'high' ? 'text-emerald-600' : prediction?.confidence_level === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>
                  {prediction?.confidence_level ?? '—'}
                </span>
              </p>
            </div>
          </div>

          {/* Weekly budget progress */}
          <SectionCard
            title="Weekly Budget"
            action={
              <label className="flex items-center gap-2 text-[12px] font-semibold text-gray-500">
                <Wallet size={13} className="text-gray-400" />
                <input
                  type="number"
                  min={100}
                  value={weeklyBudget}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    setWeeklyBudget(v);
                    localStorage.setItem('ps_weekly_budget', String(v));
                  }}
                  className="w-24 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[12px] font-bold text-gray-700 text-right focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </label>
            }
          >
            <div className="flex items-end justify-between mb-2">
              <p className="text-2xl font-black text-gray-900">
                {fmtKsh(weeklySpend)} <span className="text-base font-bold text-gray-400">/ {fmtKsh(weeklyBudget)}</span>
              </p>
              <span className="text-[13px] font-bold text-gray-500">{budgetPct.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${budgetPct >= 100 ? 'bg-red-500' : budgetPct >= 75 ? 'bg-amber-500' : 'bg-brand-500'}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <p className="text-[12px] text-gray-500 mt-2">
              {weeklySpend > weeklyBudget
                ? `${fmtKsh(weeklySpend - weeklyBudget)} over budget this week.`
                : `${fmtKsh(weeklyBudget - weeklySpend)} remaining this week.`}
            </p>
          </SectionCard>

          {/* Energy-saving recommendation */}
          <div className="ps-card p-5 bg-sky-50 border-sky-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 grid place-items-center">
                <Sparkles size={18} />
              </span>
              <p className="text-[14px] font-bold text-sky-800">Energy-saving tip</p>
            </div>
            <p className="text-[13px] text-sky-800/90 leading-relaxed">
              {dailyAvg >= 15
                ? 'Your usage is high. Check whether a geyser or water heater was left on — reducing it by 20 minutes a day could save roughly 1–2 kWh/day.'
                : dailyAvg > 0
                  ? 'Your average usage is healthy. Moving high-power appliances (iron, kettle) to off-peak hours can trim your weekly bill.'
                  : 'Add a meter reading to unlock personalised energy-saving recommendations.'}
            </p>
          </div>
        </div>

        {/* ── Right column: meter + latest token + outage ─────────────── */}
        <div className="space-y-6">
          <SectionCard title="My Meter">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-12 h-12 rounded-xl bg-brand-500 text-white grid place-items-center">
                <Zap size={22} />
              </span>
              <div>
                <p className="text-[15px] font-bold text-gray-800">{meterData?.name || 'Apartment 4B, Westlands'}</p>
                <span className="ps-pill-green"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active</span>
              </div>
            </div>
            <div className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Meter Number</span>
                <span className="font-mono font-bold text-gray-800">{mask(meterData?.meter_number || '—')}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Estimated Tariff</span>
                <span className="font-bold text-gray-800">{fmtKsh(usage?.tariff_ksh ?? 15.18)}/kWh</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Last Synchronized</span>
                <span className="font-bold text-gray-800">{fmtDateTime(meterData?.last_reading_at)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">Units Remaining</span>
                <span className="font-black text-brand-600">{fmtUnits(remaining)}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Latest Token">
            {latest ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-bold text-gray-800">{fmtKsh(latest.amount_ksh)} · {fmtUnits(latest.units)}</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                    latest.push_status === 'success' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                  }`}>
                    {latest.push_status === 'success' ? 'Applied' : 'Unapplied'}
                  </span>
                </div>
                <p className="font-mono text-[13px] font-semibold text-gray-700 tracking-wider break-all">
                  {formatToken(latest.token_number)}
                </p>
                <p className="text-[11px] text-gray-400 mt-1.5">{fmtDateTime(latest.purchased_at)}</p>
                <button
                  onClick={copyLatest}
                  className="mt-3 w-full py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[12px] font-bold text-gray-600 hover:border-brand-500 hover:text-brand-500 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy token'}
                </button>
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-[11px] font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                    <Radio size={12} /> Send to meter
                  </p>
                  <TokenPushControls token={latest} onDone={refresh} />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-[13px] text-gray-400">No tokens yet — buy your first token.</p>
                <button onClick={buy} className="mt-3 ps-btn-primary !text-[12px]">
                  <ArrowUpRight size={14} /> Buy Tokens
                </button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Outage Status">
            {activeOutage ? (
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-red-50 text-red-500 grid place-items-center shrink-0">
                  <MapPin size={17} />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-gray-800">Outage reported near you</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{activeOutage.area} · {activeOutage.status}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{fmtDateTime(activeOutage.created_at)}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 grid place-items-center shrink-0">
                  <ShieldCheck size={17} />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-gray-800">No active outages near you</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">Community reports show power is stable in your area.</p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default TenantDashboardPage;
