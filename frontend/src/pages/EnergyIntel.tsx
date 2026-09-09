import React, { useCallback, useEffect, useState } from 'react';
import {
  Brain,
  Sparkles,
  Wallet,
  AlertTriangle,
  Check,
  RefreshCw,
  Info,
  Lightbulb,
  Target,
  ShieldCheck,
  Trash2,
  Plus,
  Save,
  X,
  Zap,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Refrigerator,
  Tv,
  Fan,
  WashingMachine,
  Computer,
  Coffee,
  Flame,
  ChevronDown,
  Loader2,
  Gauge,
} from 'lucide-react';
import { SectionCard } from './ui';
import {
  energy,
  meters,
  getSession,
  EnergyIntel as EnergyIntelPayload,
  EnergyAppliance,
  CoachInsight,
  Meter,
  fmtKsh,
  fmtUnits,
} from '../services/api';

const tariffOf = (i: EnergyIntelPayload | null) => i?.tariff_ksh ?? 15.18;
const roundKsh = (n: number) => (Number(n) || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 });

const applianceIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('refrigerator') || n.includes('fridge') || n.includes('freezer')) return <Refrigerator size={15} />;
  if (n.includes('tv') || n.includes('television')) return <Tv size={15} />;
  if (n.includes('fan')) return <Fan size={15} />;
  if (n.includes('washing') || n.includes('washer')) return <WashingMachine size={15} />;
  if (n.includes('laptop') || n.includes('computer') || n.includes('pc')) return <Computer size={15} />;
  if (n.includes('coffee') || n.includes('kettle')) return <Coffee size={15} />;
  if (n.includes('cooker') || n.includes('oven') || n.includes('heater') || n.includes('geyser') || n.includes('iron')) return <Flame size={15} />;
  if (n.includes('light')) return <Lightbulb size={15} />;
  return <Zap size={15} />;
};

const SEVERITY_STYLES: Record<CoachInsight['severity'], { box: string; icon: React.ReactNode }> = {
  critical: { box: 'bg-red-50 border-red-100 text-red-700', icon: <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" /> },
  warning: { box: 'bg-amber-50 border-amber-100 text-amber-800', icon: <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" /> },
  info: { box: 'bg-sky-50 border-sky-100 text-sky-800', icon: <Sparkles size={16} className="text-sky-500 mt-0.5 shrink-0" /> },
  success: { box: 'bg-emerald-50 border-emerald-100 text-emerald-800', icon: <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" /> },
};

const meterLabel = (m: Meter) => m.name || `Unit ${m.meter_number}`;

export const EnergyIntel: React.FC = () => {
  const role = getSession().role;
  const isLandlord = role === 'landlord';

  const [metersList, setMetersList] = useState<Meter[]>([]);
  const [meterId, setMeterId] = useState<string | undefined>(undefined);
  const [intel, setIntel] = useState<EnergyIntelPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Budget planner editor state.
  const [budgetInput, setBudgetInput] = useState<number>(2000);
  const [budgetTouched, setBudgetTouched] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetSaved, setBudgetSaved] = useState(false);

  // Appliance editor state.
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<{ name: string; watts: string; hours: string }>({ name: '', watts: '', hours: '' });
  const [draftError, setDraftError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const load = useCallback(async (mId: string | undefined) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await energy.intel(mId);
      setIntel(data);
    } catch {
      setLoadError('We could not load your energy intelligence. Check your connection and try again.');
      setIntel(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // First load: landlords pick their first owned meter, tenants use the primary.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (isLandlord) {
          const list = await meters.list();
          if (!alive) return;
          setMetersList(list);
          const first = list[0]?.id;
          if (first) {
            setMeterId(first);
            load(first);
          } else {
            setLoading(false);
          }
        } else {
          load(undefined);
        }
      } catch {
        setLoading(false);
        setLoadError('Could not fetch your meters. Check your connection and try again.');
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the budget input in sync unless the user is mid-edit.
  useEffect(() => {
    if (intel && !budgetTouched) {
      const b = intel.budget;
      setBudgetInput(b.configured ? b.monthly_budget_ksh : b.suggested_ksh);
    }
  }, [intel, budgetTouched]);

  const switchMeter = (id: string) => {
    if (id === meterId) return;
    setBudgetTouched(false);
    setEditingId(null);
    setDraftError(null);
    setMeterId(id);
    load(id);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      if (isLandlord) {
        const list = await meters.list();
        setMetersList(list);
      }
      await load(meterId);
    } finally {
      setRefreshing(false);
    }
  };

  const saveBudget = async () => {
    if (!budgetInput || budgetInput < 100) return;
    setBudgetSaving(true);
    try {
      await energy.saveBudget({ meter_id: meterId, monthly_budget_ksh: budgetInput });
      setBudgetTouched(false);
      setBudgetSaved(true);
      setTimeout(() => setBudgetSaved(false), 2000);
      await load(meterId);
    } finally {
      setBudgetSaving(false);
    }
  };

  const beginAdd = () => {
    setEditingId('new');
    setDraft({ name: '', watts: '', hours: '' });
    setDraftError(null);
  };

  const beginEdit = (a: EnergyAppliance) => {
    setEditingId(a.id);
    setDraft({ name: a.name, watts: String(a.watts), hours: String(a.hours_per_day) });
    setDraftError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftError(null);
  };

  const saveAppliance = async () => {
    const name = draft.name.trim();
    const watts = parseFloat(draft.watts);
    const hours = parseFloat(draft.hours);
    if (!name) {
      setDraftError('Give the appliance a name.');
      return;
    }
    if (!watts || watts <= 0 || watts > 20000) {
      setDraftError('Power rating must be between 1 and 20,000 watts.');
      return;
    }
    if (isNaN(hours) || hours < 0 || hours > 24) {
      setDraftError('Daily hours must be between 0 and 24.');
      return;
    }

    setMutating(true);
    setDraftError(null);
    try {
      if (editingId === 'new') {
        await energy.addAppliance({ meter_id: meterId, name, watts, hours_per_day: hours });
      } else if (editingId) {
        await energy.updateAppliance(editingId, { name, watts, hours_per_day: hours });
      }
      setEditingId(null);
      await load(meterId);
    } finally {
      setMutating(false);
    }
  };

  const removeAppliance = async (a: EnergyAppliance) => {
    if (!window.confirm(`Remove ${a.name} from your appliance list?`)) return;
    setMutating(true);
    try {
      await energy.removeAppliance(a.id);
      await load(meterId);
    } finally {
      setMutating(false);
    }
  };

  // ── Derived numbers ───────────────────────────────────────────────────────
  const tariff = tariffOf(intel);
  const forecast = intel?.forecast;
  const projected = forecast?.projected_month_cost_ksh ?? 0;
  const lastPeriod = forecast?.last_period_cost_ksh ?? 0;
  const delta = forecast?.delta_ksh ?? 0;

  const activeBudget = budgetInput || 2000;
  const budgetPct = projected > 0 ? Math.round((projected / activeBudget) * 100) : 0;
  const overrun = projected > 0 ? projected - activeBudget : 0;
  const budgetStatus: 'ok' | 'warning' | 'critical' =
    projected <= 0 ? 'ok' : budgetPct > 100 ? 'critical' : budgetPct >= 85 ? 'warning' : 'ok';

  const modeledTotal = (intel?.appliances ?? []).reduce((s, a) => s + a.monthly_cost_ksh, 0);
  const coverage = intel?.model_coverage_pct ?? 0;
  const usageMonthKwh = intel?.usage?.month_kwh ?? 0;

  const budgetMsg =
    lastPeriod > 0 && projected > 0
      ? delta >= 0
        ? `At your current usage you are likely to spend ${fmtKsh(Math.round(projected))} this month — about ${fmtKsh(Math.round(delta))} more than the last 30 days.`
        : `At your current usage you are likely to spend ${fmtKsh(Math.round(projected))} this month — about ${fmtKsh(Math.round(Math.abs(delta)))} less than the last 30 days.`
      : projected > 0
        ? `At your current usage you are likely to spend ${fmtKsh(Math.round(projected))} this month.`
        : 'Buy a token or record a reading and we will forecast your monthly spend.';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Energy Intelligence</h1>
          <p className="ps-sub">See where your power goes, why it changed and what to do next.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {isLandlord && metersList.length > 1 && (
            <div className="relative">
              <select
                value={meterId ?? ''}
                onChange={(e) => switchMeter(e.target.value)}
                className="appearance-none pl-3 pr-9 py-2 rounded-xl bg-white border border-gray-200 text-[13px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                {metersList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {meterLabel(m)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
          <button onClick={refresh} className="ps-btn-outline !px-3 !py-2" title="Refresh">
            <RefreshCw size={14} className={refreshing || loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-red-50 border border-red-100">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-[13px] text-red-700">{loadError}</p>
        </div>
      )}

      {/* Spend forecast hero */}
      <div className="ps-card p-6 md:p-8 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 border-navy-800 text-white relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gold-500/10" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-brand-500/10" />
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-gold-400 flex items-center gap-1.5">
              <Wallet size={14} /> Projected spend this month
            </p>
            <p className="mt-3 text-4xl md:text-5xl font-black tracking-tight">
              {loading ? '—' : projected > 0 ? fmtKsh(Math.round(projected)) : 'KSh —'}
            </p>
            {!loading && lastPeriod > 0 && projected > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold ${
                    delta >= 0 ? 'bg-red-400/15 text-red-300' : 'bg-emerald-400/15 text-emerald-300'
                  }`}
                >
                  {delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {fmtKsh(Math.abs(Math.round(delta)))} {delta >= 0 ? 'vs' : 'under'}
                </span>
                <span className="text-slate-300">your last 30 days spend of {fmtKsh(Math.round(lastPeriod))}</span>
              </div>
            )}
            <p className="mt-4 text-[13px] text-slate-200/85 leading-relaxed max-w-lg">{budgetMsg}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:self-center">
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Balance</p>
              <p className="mt-1.5 text-lg font-black text-white">
                {loading ? '—' : fmtUnits(intel?.units_remaining)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">still on meter</p>
            </div>
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Run-out</p>
              <p className="mt-1.5 text-lg font-black text-white">
                {loading || !intel || intel.days_remaining <= 0 ? '—' : `~${intel.days_remaining.toFixed(1)}d`}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">of power left</p>
            </div>
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Top-up</p>
              <p className="mt-1.5 text-lg font-black text-white">
                {loading || !intel || !intel.recommended_topup_ksh ? '—' : fmtKsh(intel.recommended_topup_ksh)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">recommended</p>
            </div>
          </div>
        </div>
      </div>

      {loading && !intel ? (
        <div className="ps-card p-10 text-center text-gray-400 text-sm">Analysing your energy…</div>
      ) : intel ? (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* ── AI Energy Coach ─────────────────────────────────────── */}
            <div className="xl:col-span-2">
              <SectionCard
                title="AI Energy Coach"
                action={
                  <span className="ps-pill-green">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                  </span>
                }
              >
                {intel.coach.length === 0 ? (
                  <div className="py-6 text-center">
                    <Brain size={28} className="mx-auto text-brand-200" />
                    <p className="mt-3 text-[13px] text-gray-400">
                      Buy a token or record a meter reading to unlock your personalised energy coach.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {intel.coach.map((c, i) => {
                      const s = SEVERITY_STYLES[c.severity];
                      return (
                        <div key={i} className={`p-3.5 rounded-xl border flex items-start gap-3 ${s.box}`}>
                          {s.icon}
                          <div>
                            <p className="text-[13px] font-bold">{c.title}</p>
                            <p className="text-[12px] mt-1 leading-relaxed opacity-90">{c.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              {/* Forecast strip */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="ps-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 grid place-items-center">
                      <TrendingUp size={15} />
                    </span>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Usage (30d)</p>
                  </div>
                  <p className="text-2xl font-black text-gray-900">{usageMonthKwh > 0 ? `${usageMonthKwh} kWh` : '—'}</p>
                  <p className="text-[12px] text-gray-500 mt-1">≈ {fmtKsh(lastPeriod)}</p>
                </div>
                <div className="ps-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 grid place-items-center">
                      <Gauge size={15} />
                    </span>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Daily average</p>
                  </div>
                  <p className="text-2xl font-black text-gray-900">
                    {intel.usage?.daily_avg_kwh ? `${intel.usage.daily_avg_kwh.toFixed(1)} kWh` : '—'}
                  </p>
                  <p className="text-[12px] text-gray-500 mt-1">per day at {fmtKsh(tariff)}/kWh</p>
                </div>
                <div className="ps-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 grid place-items-center">
                      <Target size={15} />
                    </span>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Model coverage</p>
                  </div>
                  <p className="text-2xl font-black text-gray-900">{coverage > 0 ? `${Math.round(coverage)}%` : '—'}</p>
                  <p className="text-[12px] text-gray-500 mt-1">of usage explained by appliances</p>
                </div>
              </div>
            </div>

            {/* ── Budget Planner ──────────────────────────────────────── */}
            <div>
              <SectionCard title="Budget Planner">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-9 h-9 rounded-xl bg-brand-500 text-white grid place-items-center">
                    <Wallet size={17} />
                  </span>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-gray-800">Monthly budget</p>
                    {intel.budget.configured ? (
                      <span className="ps-pill-green">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Configured
                      </span>
                    ) : (
                      <span className="ps-pill-amber">Suggested estimate</span>
                    )}
                  </div>
                </div>

                <label className="ps-label">I can spend (KSh / month)</label>
                <div className="relative mb-1">
                  <Wallet size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={budgetInput}
                    onChange={(e) => {
                      setBudgetTouched(true);
                      setBudgetInput(parseInt(e.target.value) || 0);
                    }}
                    className="ps-input !pl-9 font-bold"
                  />
                </div>
                {!intel.budget.configured && lastPeriod > 0 && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Suggested from your recent spend: {fmtKsh(Math.round(intel.budget.suggested_ksh))}/month.
                  </p>
                )}

                <button
                  onClick={saveBudget}
                  disabled={budgetSaving || budgetInput < 100}
                  className="mt-4 w-full ps-btn-gold !py-2.5 disabled:opacity-50"
                >
                  {budgetSaving ? <Loader2 size={14} className="animate-spin" /> : budgetSaved ? <Check size={14} /> : <Save size={14} />}
                  {budgetSaved ? 'Budget saved' : 'Save budget'}
                </button>

                <div className="mt-5 pt-5 border-t border-gray-100">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Projected vs budget</p>
                      <p className="text-xl font-black text-gray-900 mt-1">
                        {projected > 0 ? `${Math.round(budgetPct)}%` : '—'}
                      </p>
                    </div>
                    <p className="text-[12px] font-bold text-gray-500">
                      {projected > 0 ? fmtKsh(Math.round(projected)) : '—'}
                      <span className="font-semibold text-gray-400"> / {fmtKsh(activeBudget)}</span>
                    </p>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budgetStatus === 'critical' ? 'bg-red-500' : budgetStatus === 'warning' ? 'bg-amber-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${Math.min(budgetPct, 100)}%` }}
                    />
                  </div>
                  <p className="text-[12px] text-gray-500 mt-2">
                    {projected <= 0
                      ? 'Not enough data to compare against your budget yet.'
                      : overrun > 0
                        ? `${fmtKsh(Math.round(overrun))} over budget at the current pace.`
                        : `${fmtKsh(Math.round(Math.abs(overrun)))} to spare at the current pace.`}
                  </p>
                  {overrun > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2">
                      <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-[12px] text-red-700">
                        <span className="font-bold">Likely to exceed your budget.</span> Try trimming the biggest
                        appliances below.
                      </p>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </div>

          {/* ── Where your power goes (appliances) ───────────────────── */}
          <SectionCard
            title="Where your power goes"
            action={
              <button onClick={beginAdd} className="ps-btn-outline !px-3 !py-1.5">
                <Plus size={14} /> Add Appliance
              </button>
            }
          >
            {(intel.appliances.length === 0) && editingId !== 'new' ? (
              <div className="py-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-500 grid place-items-center">
                  <Lightbulb size={24} />
                </div>
                <p className="mt-4 text-[14px] font-bold text-gray-700">We cannot see inside your house — yet.</p>
                <p className="mt-1 text-[13px] text-gray-500 max-w-md mx-auto leading-relaxed">
                  Register your fridge, TV, heater and lights and PowerSmart will estimate each one's share of your bill,
                  flag the biggest loads and coach you on what to trim first.
                </p>
                <button onClick={beginAdd} className="mt-4 ps-btn-outline !px-4 !py-2">
                  <Plus size={14} /> Add your first appliance
                </button>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                        <th className="py-2.5 pr-3 font-semibold">Appliance</th>
                        <th className="py-2.5 pr-3 font-semibold">Power (W)</th>
                        <th className="py-2.5 pr-3 font-semibold">Hrs/day</th>
                        <th className="py-2.5 pr-3 font-semibold">kWh/day</th>
                        <th className="py-2.5 pr-3 font-semibold">Est. /month</th>
                        <th className="py-2.5 pr-3 font-semibold min-w-[140px]">Share of usage</th>
                        <th className="py-2.5 font-semibold text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingId === 'new' && (
                        <tr className="border-b border-brand-100 bg-brand-50/40">
                          <td className="py-3 pr-3">
                            <input
                              value={draft.name}
                              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                              placeholder="e.g. Water heater"
                              className="w-36 px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                          </td>
                          <td className="py-3 pr-3">
                            <input
                              type="number"
                              min={1}
                              value={draft.watts}
                              onChange={(e) => setDraft((d) => ({ ...d, watts: e.target.value }))}
                              placeholder="1500"
                              className="w-24 px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                          </td>
                          <td className="py-3 pr-3">
                            <input
                              type="number"
                              min={0}
                              max={24}
                              value={draft.hours}
                              onChange={(e) => setDraft((d) => ({ ...d, hours: e.target.value }))}
                              placeholder="2"
                              className="w-20 px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                          </td>
                          <td className="py-3 pr-3 text-gray-400">—</td>
                          <td className="py-3 pr-3 text-gray-400">—</td>
                          <td className="py-3 pr-3 text-gray-400">—</td>
                          <td className="py-3 text-right whitespace-nowrap">
                            <button
                              onClick={saveAppliance}
                              disabled={mutating}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[12px] font-bold disabled:opacity-50 cursor-pointer"
                            >
                              {mutating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Add
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="ml-2 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      )}

                      {intel.appliances.map((a) =>
                        editingId === a.id ? (
                          <tr key={a.id} className="border-b border-brand-100 bg-brand-50/40">
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-white text-brand-500 grid place-items-center">
                                  {applianceIcon(a.name)}
                                </span>
                                <input
                                  value={draft.name}
                                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                                  className="w-28 px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                />
                              </div>
                            </td>
                            <td className="py-3 pr-3">
                              <input
                                type="number"
                                min={1}
                                value={draft.watts}
                                onChange={(e) => setDraft((d) => ({ ...d, watts: e.target.value }))}
                                className="w-24 px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                              />
                            </td>
                            <td className="py-3 pr-3">
                              <input
                                type="number"
                                min={0}
                                max={24}
                                value={draft.hours}
                                onChange={(e) => setDraft((d) => ({ ...d, hours: e.target.value }))}
                                className="w-20 px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                              />
                            </td>
                            <td className="py-3 pr-3 text-gray-500">—</td>
                            <td className="py-3 pr-3 text-gray-500">—</td>
                            <td className="py-3 pr-3 text-gray-500">—</td>
                            <td className="py-3 text-right whitespace-nowrap">
                              <button
                                onClick={saveAppliance}
                                disabled={mutating}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[12px] font-bold disabled:opacity-50 cursor-pointer"
                              >
                                {mutating ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="ml-2 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ) : (
                          <tr key={a.id} className="border-b border-gray-50">
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 grid place-items-center">
                                  {applianceIcon(a.name)}
                                </span>
                                <span className="font-semibold text-gray-800">{a.name}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-3 text-gray-600">{Math.round(a.watts)} W</td>
                            <td className="py-3 pr-3 text-gray-600">{a.hours_per_day}h</td>
                            <td className="py-3 pr-3 text-gray-600">{a.daily_kwh.toFixed(1)} kWh</td>
                            <td className="py-3 pr-3 font-bold text-gray-800">{fmtKsh(Math.round(a.monthly_cost_ksh))}</td>
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(a.share_pct, 100)}%` }} />
                                </div>
                                <span className="text-[11px] font-bold text-gray-500 w-9 text-right">
                                  {a.share_pct > 0 ? `${Math.round(a.share_pct)}%` : '—'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => beginEdit(a)}
                                className="text-[12px] font-bold text-brand-500 hover:underline px-1.5 py-1 cursor-pointer"
                                title="Edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => removeAppliance(a)}
                                disabled={mutating}
                                className="ml-1 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                    {intel.appliances.length > 0 && editingId !== 'new' && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-100">
                          <td colSpan={4} className="py-3 font-bold text-gray-800">Total estimated</td>
                          <td className="py-3 font-black text-brand-600">{fmtKsh(Math.round(modeledTotal))}</td>
                          <td className="py-3 text-[11px] text-gray-400">{coverage > 0 ? `covers ${Math.round(coverage)}% of measured usage` : ''}</td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {draftError && (
                  <div className="mt-3 flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100">
                    <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-[12px] text-red-700">{draftError}</p>
                  </div>
                )}

                <div className="mt-4 flex items-start gap-2 text-[12px] text-gray-400">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <p>
                    Estimates use {fmtKsh(tariff)}/kWh and hours per day × 30 days. {coverage < 60 && coverage > 0
                      ? 'Your appliances explain less than 60% of measured usage — add the remaining ones for more accurate coaching.'
                      : 'Values are estimates based on your settings and the domestic tariff.'}
                  </p>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Sync tip */}
          {intel.usage?.data_quality === 'low' && (
            <div className="ps-card p-5 bg-sky-50 border-sky-100 flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 grid place-items-center shrink-0">
                <ShieldCheck size={18} />
              </span>
              <div>
                <p className="text-[14px] font-bold text-sky-800">Sharpen your forecast</p>
                <p className="text-[13px] text-sky-800/90 mt-0.5 leading-relaxed">
                  We only have limited readings for {intel.meter_name}. Send your meter reading via{' '}
                  <span className="font-bold">WiFi or Bluetooth</span> (or enter the kWh reading manually) and your
                  run-out date, spend forecast and coaching all become more accurate.
                </p>
              </div>
            </div>
          )}
        </>
      ) : !loadError ? (
        <div className="ps-card p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-500 grid place-items-center">
            <Lightbulb size={24} />
          </div>
          <p className="mt-4 text-[15px] font-bold text-gray-700">No meters linked to this account yet</p>
          <p className="mt-1 text-[13px] text-gray-500 max-w-md mx-auto leading-relaxed">
            Add your Kenya Power meter to unlock Energy Intelligence — a personal coach, appliance insights and a
            monthly budget planner for every unit you manage.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default EnergyIntel;
