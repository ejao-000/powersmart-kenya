import React, { useState } from 'react';
import {
  Brain,
  Target,
  AlertTriangle,
  Trophy,
  TrendingUp,
  Check,
  Sparkles,
} from 'lucide-react';
import { Prediction, Meter, fmtUnits } from '../services/api';

interface SmartInsightsProps {
  meter: Meter | null;
  prediction: Prediction | null;
}

const GOAL_KEY = 'ps_savings_goal';
const STREAK_KEY = 'ps_streak';

const today = () => new Date().toISOString().slice(0, 10);

function loadStreak(): { count: number; lastDate: string } {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"count":0,"lastDate":""}');
  } catch {
    return { count: 0, lastDate: '' };
  }
}

export const SmartInsights: React.FC<SmartInsightsProps> = ({ meter, prediction }) => {
  const [goal, setGoal] = useState<number>(() => Number(localStorage.getItem(GOAL_KEY)) || 200);
  const [streak, setStreak] = useState(loadStreak);

  const setGoalValue = (v: number) => {
    setGoal(v);
    localStorage.setItem(GOAL_KEY, String(v));
  };

  const logUnderBudget = () => {
    const t = today();
    const prev = loadStreak();
    let count = 1;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (prev.lastDate === t) count = prev.count;
    else if (prev.lastDate === yesterday) count = prev.count + 1;
    setStreak({ count, lastDate: t });
    localStorage.setItem(STREAK_KEY, JSON.stringify({ count, lastDate: t }));
  };

  const days = prediction?.days_remaining;
  const dailyAvg = meter?.daily_avg_units || prediction?.daily_avg_units || 0;

  const insights: { icon: React.ReactNode; text: string; tone: 'ok' | 'warn' | 'info' }[] = [];

  if (prediction && typeof days === 'number') {
    if (days <= 2) {
      insights.push({
        icon: <AlertTriangle size={15} className="text-rose-400" />,
        tone: 'warn',
        text: `Your power runs out in about ${days.toFixed(1)} days. Buy now to beat the queues and avoid being in the dark.`,
      });
    } else if (days <= 5) {
      insights.push({
        icon: <Sparkles size={15} className="text-amber-400" />,
        tone: 'info',
        text: `About ${days.toFixed(1)} days of power left — a top-up soon keeps you covered through the weekend.`,
      });
    } else {
      insights.push({
        icon: <TrendingUp size={15} className="text-emerald-400" />,
        tone: 'ok',
        text: `Healthy balance — roughly ${days.toFixed(1)} days of power remaining (${fmtUnits(prediction.units_remaining)}).`,
      });
    }
  }

  if (dailyAvg > 0) {
    const d500 = (100 / dailyAvg).toFixed(1);
    const d1000 = (200 / dailyAvg).toFixed(1);
    insights.push({
      icon: <Sparkles size={15} className="text-cyan-400" />,
      tone: 'info',
      text: `At ${dailyAvg.toFixed(1)} kWh/day, a KSh 500 token lasts ~${d500} days; a KSh 1,000 token ~${d1000} days (fewer trips, no price penalty).`,
    });
  }

  if (dailyAvg >= 15) {
    insights.push({
      icon: <AlertTriangle size={15} className="text-rose-400" />,
      tone: 'warn',
      text: `Your usage is high (~${dailyAvg.toFixed(1)} kWh/day). Check whether a geyser or water heater was left on.`,
    });
  }

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center gap-2 mb-5">
        <Brain className="text-cyan-400" size={20} />
        <h3 className="text-base font-bold text-slate-100 font-mono">Smart Insights</h3>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-slate-500">Add a meter reading to unlock personalised insights.</p>
      ) : (
        <div className="space-y-3">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-xl flex items-start gap-3 text-sm border ${
                ins.tone === 'warn'
                  ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  : ins.tone === 'info'
                    ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200'
                    : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              }`}
            >
              <span className="mt-0.5 shrink-0">{ins.icon}</span>
              <span className="text-[13px] leading-relaxed">{ins.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Economy mode */}
      <div className="mt-5 pt-5 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-amber-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Economy mode</h4>
          <span className="ml-auto flex items-center gap-1 text-[11px] font-mono text-amber-400">
            <Trophy size={13} /> {streak.count} day{streak.count === 1 ? '' : 's'} streak
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Weekly savings goal (KSh)
            </label>
            <input
              type="number"
              min={50}
              value={goal}
              onChange={(e) => setGoalValue(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 flex flex-col justify-center">
            <span className="text-[11px] text-slate-500">Savings tip</span>
            <span className="text-[12px] text-slate-200 mt-0.5">
              Cut the geyser from 60 → 20 min to save ~KSh 45/day.
            </span>
          </div>
        </div>

        <button
          onClick={logUnderBudget}
          className="w-full py-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Check size={14} /> I stayed under budget today
        </button>
      </div>
    </div>
  );
};

export default SmartInsights;
