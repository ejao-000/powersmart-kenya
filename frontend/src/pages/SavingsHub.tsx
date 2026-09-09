import React, { useCallback, useEffect, useState } from 'react';
import {
  Trophy,
  Target,
  Leaf,
  Zap,
  Check,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { SectionCard } from './ui';
import {
  savings,
  Challenge,
  CarbonSummary,
  LeaderboardResponse,
  SavingsGoal,
  fmtKsh,
} from '../services/api';

const CHALLENGE_ICONS: Record<string, React.ReactNode> = {
  cut_10: <TrendingDown size={18} />,
  budget_safe: <Zap size={18} />,
  off_peak: <Sparkles size={18} />,
};

export const SavingsHub: React.FC = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [carbon, setCarbon] = useState<CarbonSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [target, setTarget] = useState('');
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);

  const flashMsg = useCallback((msg: string, ok = true) => {
    setFlash({ msg, ok });
    setTimeout(() => setFlash(null), 3200);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [ch, g, b, c] = await Promise.all([
        savings.challenges(),
        savings.goals(),
        savings.leaderboard().catch(() => null),
        savings.carbon().catch(() => null),
      ]);
      setChallenges(ch);
      setGoals(g);
      setBoard(b);
      setCarbon(c);
    } catch {
      /* header handles errors */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const claim = async (key: string) => {
    setBusy(true);
    setBusyKey(key);
    try {
      const res = await savings.claimChallenge(key);
      if (res.achieved) {
        flashMsg(`${res.title} complete — ${res.points} points earned!`);
      } else if (res.message) {
        flashMsg(res.message, false);
      }
      await loadAll();
    } catch (e: any) {
      flashMsg(e?.message || 'Could not claim that challenge.', false);
    } finally {
      setBusy(false);
      setBusyKey('');
    }
  };

  const createGoal = async () => {
    const t = parseInt(target) || 0;
    if (t < 100) {
      flashMsg('Enter a monthly target of at least KSh 100.', false);
      return;
    }
    setBusy(true);
    try {
      const goal = await savings.createGoal({ target_ksh: t });
      setTarget('');
      setCreatingGoal(false);
      flashMsg(`Goal set — cut your monthly spend towards ${fmtKsh(Math.round(goal.target_ksh))}.`);
      await loadAll();
    } catch (e: any) {
      flashMsg(e?.message || 'Could not create the goal.', false);
    } finally {
      setBusy(false);
    }
  };

  const completeGoal = async (id: string) => {
    setBusy(true);
    try {
      await savings.completeGoal(id);
      flashMsg('Goal completed — congratulations!');
      await loadAll();
    } catch (e: any) {
      flashMsg(e?.message || 'Could not complete the goal.', false);
    } finally {
      setBusy(false);
    }
  };

  const removeGoal = async (g: SavingsGoal) => {
    if (!window.confirm('Remove this savings goal?')) return;
    setBusy(true);
    try {
      await savings.removeGoal(g.id);
      await loadAll();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const myPoints = board?.my_points ?? 0;
  const monthKg = carbon?.month_kg ?? 0;
  const activeGoals = goals.filter((g) => g.active && !g.achieved);
  const visibleGoals = goals.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Savings Hub</h1>
          <p className="ps-sub">Set a reduction goal, win weekly challenges and track your footprint.</p>
        </div>
        {!loading && myPoints > 0 && (
          <span className="ps-pill-amber">
            <Trophy size={13} className="text-amber-600" /> {myPoints} points · rank #{board?.my_rank}
          </span>
        )}
      </div>

      {flash && (
        <div
          className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border ${
            flash.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
          }`}
        >
          {flash.ok ? <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />}
          <p className={`text-[13px] ${flash.ok ? 'text-emerald-700' : 'text-red-700'}`}>{flash.msg}</p>
        </div>
      )}

      {loading ? (
        <div className="ps-card p-12 text-center text-gray-400 text-sm">Loading your savings hub…</div>
      ) : (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickStat icon={<Trophy size={16} />} label="My points" value={String(myPoints)} foot={`${board?.my_claims ?? 0} challenge claims`} />
            <QuickStat icon={<Target size={16} />} label="Active goals" value={String(activeGoals.length)} foot={activeGoals.length ? 'reduction target set' : 'no goal yet'} />
            <QuickStat icon={<TrendingUp size={16} />} label="Challenges done" value={String(challenges.filter((c) => c.achieved).length)} foot="this week" />
            <QuickStat icon={<Leaf size={16} />} label="Monthly footprint" value={monthKg > 0 ? `${monthKg} kg` : '—'} foot="CO₂ from your power" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Challenges */}
            <div className="xl:col-span-2 space-y-6">
              <SectionCard
                title="This week's challenges"
                action={<span className="text-[11px] font-bold text-gray-400">Weekly · Mon–Sun</span>}
              >
                <div className="space-y-3">
                  {challenges.map((c) => {
                    const done = c.status === 'done';
                    const blocked = c.status === 'no_data' || c.status === 'no_budget';
                    return (
                      <div
                        key={c.key}
                        className={`rounded-xl border p-4 flex items-start gap-3 ${
                          done ? 'bg-emerald-50/60 border-emerald-100' : blocked ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
                        }`}
                      >
                        <span
                          className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                            done ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-50 text-brand-500'
                          }`}
                        >
                          {CHALLENGE_ICONS[c.key] || <Sparkles size={18} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[14px] font-bold text-gray-800">{c.title}</p>
                            <span className="ps-pill-amber">
                              <Trophy size={11} /> {c.points} pts
                            </span>
                            {done && (
                              <span className="ps-pill-green">
                                <Check size={12} /> Done
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">{c.description}</p>
                          {c.message && <p className="mt-1 text-[12px] text-gray-400">{c.message}</p>}
                        </div>
                        <div className="shrink-0">
                          {done ? (
                            <span className="text-[12px] font-black text-emerald-600 flex items-center gap-1">
                              <Check size={14} /> Claimed
                            </span>
                          ) : blocked ? (
                            <span className="text-[11px] text-gray-400">Needs data</span>
                          ) : (
                            <button
                              onClick={() => claim(c.key)}
                              disabled={busy}
                              className="ps-btn-primary !px-3 !py-2 disabled:opacity-50"
                            >
                              {busy && busyKey === c.key ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                              Claim
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              {/* Leaderboard */}
              <SectionCard
                title="Savings leaderboard"
                action={<span className="text-[11px] font-bold text-gray-400">All PowerSmart users</span>}
              >
                {board && board.rows.length === 0 ? (
                  <p className="py-5 text-center text-[13px] text-gray-400">
                    No points yet — complete a challenge above to be the first on the board.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {board?.rows.slice(0, 10).map((row, i) => (
                      <div
                        key={row.user_name + i}
                        className={`flex items-center gap-3 p-2.5 rounded-xl ${
                          row.user_name === board?.my_name ? 'bg-brand-50/60 border border-brand-100' : 'bg-gray-50/60 border border-gray-100'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg grid place-items-center text-[12px] font-black ${
                          i === 0 ? 'bg-amber-400 text-navy-950' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-amber-700 text-white' : 'bg-white text-gray-500 border border-gray-200'
                        }`}>
                          {i + 1}
                        </span>
                        <p className="flex-1 text-[13px] font-bold text-gray-800 truncate">
                          {row.user_name} {row.user_name === board?.my_name && <span className="text-brand-500">(you)</span>}
                        </p>
                        <span className="text-[11px] text-gray-400">{row.claims} claim{row.claims === 1 ? '' : 's'}</span>
                        <span className="text-[13px] font-black text-brand-600">{row.points} pts</span>
                      </div>
                    ))}
                    {board && board.my_rank > 10 && (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-brand-50/60 border border-brand-100">
                        <span className="w-7 h-7 rounded-lg grid place-items-center text-[12px] font-black bg-white border border-gray-200 text-gray-600">
                          {board.my_rank}
                        </span>
                        <p className="flex-1 text-[13px] font-bold text-gray-800 truncate">{board.my_name} (you)</p>
                        <span className="text-[13px] font-black text-brand-600">{board.my_points} pts</span>
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Right column: goals + carbon */}
            <div className="space-y-6">
              <SectionCard
                title="Savings goal"
                action={
                  <button
                    onClick={() => setCreatingGoal((v) => !v)}
                    className="ps-btn-outline !px-3 !py-1.5"
                  >
                    <Plus size={14} /> New goal
                  </button>
                }
              >
                {creatingGoal && (
                  <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">
                      I want to spend at most (KSh / month)
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={100}
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        placeholder="2500"
                        className="ps-input !py-2 font-bold"
                      />
                      <button
                        onClick={createGoal}
                        disabled={busy}
                        className="ps-btn-primary !px-3 !py-2 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />} Set
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400">
                      Goals start from your current monthly spend and must be below it.
                    </p>
                  </div>
                )}

                {visibleGoals.length === 0 && !creatingGoal ? (
                  <div className="py-6 text-center">
                    <Target size={28} className="mx-auto text-brand-200" />
                    <p className="mt-3 text-[13px] text-gray-400">
                      Set a goal like “cut my bill from KSh 3,000 to KSh 2,500” and we'll track your progress.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleGoals.map((g) => {
                      const pct = Math.min(g.progress_pct ?? 0, 100);
                      const complete = g.achieved || (g.progress_pct ?? 0) >= 100;
                      return (
                        <div key={g.id} className="rounded-xl border border-gray-100 p-3.5">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-[13px] font-bold text-gray-800 leading-snug">{g.label}</p>
                            <button
                              onClick={() => removeGoal(g)}
                              className="p-1 rounded-md text-gray-300 hover:text-red-500 cursor-pointer"
                              title="Remove goal"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div className="flex items-end justify-between mb-1.5">
                            <p className="text-[12px] text-gray-500">
                              {fmtKsh(Math.round(g.baseline_ksh))} →{' '}
                              <span className="font-bold text-gray-800">{fmtKsh(Math.round(g.target_ksh))}</span>
                            </p>
                            <span className="text-[11px] font-bold text-gray-400">
                              {g.current_ksh !== undefined && g.current_ksh > 0 ? `now ${fmtKsh(Math.round(g.current_ksh))}` : ''}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${complete ? 'bg-emerald-500' : 'bg-brand-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className={`text-[11px] font-bold ${complete ? 'text-emerald-600' : 'text-brand-600'}`}>
                              {Math.round(pct)}% there
                            </span>
                            {complete && !g.achieved && (
                              <button
                                onClick={() => completeGoal(g.id)}
                                disabled={busy}
                                className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                              >
                                Mark achieved
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              {/* Carbon */}
              <SectionCard
                title="Carbon footprint"
                action={<Leaf size={15} className="text-emerald-500" />}
              >
                {!carbon || monthKg <= 0 ? (
                  <p className="py-4 text-[13px] text-gray-400 leading-relaxed">
                    Record a meter reading or buy a token and we'll estimate your electricity footprint at{' '}
                    {carbon?.factor_kg_per_kwh ?? 0.44} kg CO₂/kWh (Kenya grid estimate).
                  </p>
                ) : (
                  <div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">This month</p>
                        <p className="text-3xl font-black text-emerald-600 mt-1">{monthKg} kg</p>
                        <p className="text-[12px] text-gray-500 mt-1">CO₂ from electricity</p>
                      </div>
                      <Leaf size={40} className="text-emerald-200" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-lg font-black text-gray-800">{carbon.week_kg} kg</p>
                        <p className="text-[11px] text-gray-400">This week</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-lg font-black text-gray-800">{carbon.today_kg} kg</p>
                        <p className="text-[11px] text-gray-400">Today</p>
                      </div>
                    </div>
                    <p className="mt-3 text-[12px] text-gray-500 flex items-start gap-1.5">
                      <Sparkles size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span>
                        Roughly {Math.round(carbon.trees_monthly)} mature trees would need a full year to absorb this
                        month's footprint. Cutting usage also cuts this.
                      </span>
                    </p>
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const QuickStat: React.FC<{ icon: React.ReactNode; label: string; value: string; foot?: string }> = ({
  icon,
  label,
  value,
  foot,
}) => (
  <div className="ps-card p-5">
    <div className="flex items-center gap-2 mb-2">
      <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 grid place-items-center">{icon}</span>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    </div>
    <p className="text-2xl font-black text-gray-900">{value}</p>
    {foot && <p className="text-[12px] text-gray-500 mt-1">{foot}</p>}
  </div>
);

export default SavingsHub;
