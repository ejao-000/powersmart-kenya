import React, { useEffect, useState, useCallback } from 'react';
import {
  CalendarClock,
  RefreshCw,
  Target,
  AlertTriangle,
  Sparkles,
  Zap,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { SectionCard } from './ui';
import { meter, Prediction, UsageSummary, fmtKsh, fmtUnits } from '../services/api';

const PRESET_TOKENS = [200, 500, 1000, 2000];

export const PredictionsPage: React.FC = () => {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      try {
        setPrediction(await meter.prediction());
      } catch { /* optional */ }
      try {
        setUsage(await meter.usage());
      } catch { /* optional */ }
    } catch {
      /* portal header handles errors */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const dailyAvg = usage?.daily_avg_kwh ?? prediction?.daily_avg_units ?? 0;
  const daysLeft =
    prediction && typeof prediction.days_remaining === 'number' ? prediction.days_remaining : null;
  const confidence = prediction?.confidence_level ?? 'low';

  const confidenceTone =
    confidence === 'high' ? 'text-emerald-600 bg-emerald-50' : confidence === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';

  const depletionText = prediction?.depletion_date
    ? new Date(prediction.depletion_date).toLocaleString('en-KE', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  // Token value prediction: how long each purchase lasts at current usage.
  const kwhPerToken = (amount: number) => (amount / 100) * 20; // ~20 kWh per KSh 100 (mock tariff)
  const daysForToken = (amount: number) => (dailyAvg > 0 ? kwhPerToken(amount) / dailyAvg : 0);
  const costPerDay = dailyAvg > 0 ? dailyAvg * (usage?.tariff_ksh ?? 15.18) : 0;

  const textHint = loading
    ? 'Analysing your usage…'
    : dailyAvg <= 0
      ? 'Not enough data to predict run-out yet. Record a meter reading or buy your first token.'
      : `Based on your recent usage (${dailyAvg.toFixed(1)} kWh/day), your electricity is likely to run out ${depletionText ? `on ${depletionText}` : 'soon'}.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Predictions</h1>
          <p className="ps-sub">When will you run out — and how long will each top-up last?</p>
        </div>
        <button onClick={refresh} className="ps-btn-outline !px-3 !py-2" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Run-out prediction */}
      <div className="ps-card p-6 md:p-8 bg-brand-500 text-white border-brand-500 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center">
              <CalendarClock size={18} />
            </span>
            <p className="text-[13px] font-bold uppercase tracking-wide text-emerald-100">Predicted Run-Out</p>
          </div>
          <p className="text-2xl md:text-3xl font-black tracking-tight leading-snug">
            {daysLeft !== null ? `~${daysLeft.toFixed(1)} days of power left` : 'Insufficient data'}
          </p>
          {depletionText && (
            <p className="mt-1 text-emerald-50/90 text-[14px]">Expected to run out {depletionText}</p>
          )}
          <p className="mt-4 text-[13px] text-emerald-50/85 leading-relaxed max-w-2xl">{textHint}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Confidence + balance */}
        <div className="space-y-6">
          <SectionCard title="Prediction Confidence">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-bold text-gray-800">Current balance</span>
              <span className="font-black text-brand-600">{fmtUnits(prediction?.units_remaining ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] text-gray-500">Average daily usage</span>
              <span className="font-bold text-gray-800">{dailyAvg > 0 ? `${dailyAvg.toFixed(1)} kWh/day` : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-gray-500">Confidence</span>
              <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md ${confidenceTone}`}>{confidence}</span>
            </div>
            {confidence === 'low' && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2">
                <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-amber-700">
                  This prediction is based on limited data. It will improve as more readings are recorded.
                </p>
              </div>
            )}
          </SectionCard>

          <div className="ps-card p-5 bg-sky-50 border-sky-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 grid place-items-center">
                <Sparkles size={18} />
              </span>
              <p className="text-[14px] font-bold text-sky-800">Volt AI Insight</p>
            </div>
            <p className="text-[13px] text-sky-800/90 leading-relaxed">
              {dailyAvg > 0
                ? `At your current usage you spend about ${fmtKsh(costPerDay)} per day. A KSh ${PRESET_TOKENS[2]} top-up covers roughly ${daysForToken(PRESET_TOKENS[2]).toFixed(1)} days.`
                : 'Buy a token or record a reading to unlock AI usage insights.'}
            </p>
          </div>
        </div>

        {/* Token value prediction */}
        <div className="xl:col-span-2">
          <SectionCard title="Token Value Prediction" action={<span className="text-[11px] font-semibold text-gray-400">Estimates</span>}>
            <p className="text-[12px] text-gray-500 mb-4">
              How long each purchase is estimated to last at your current usage of{' '}
              <span className="font-bold text-gray-700">{dailyAvg > 0 ? `${dailyAvg.toFixed(1)} kWh/day` : '—'}</span>.
              Estimates assume {fmtKsh(usage?.tariff_ksh ?? 15.18)}/kWh and may change with usage and applicable tariffs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PRESET_TOKENS.map((amount) => {
                const days = daysForToken(amount);
                const kwh = kwhPerToken(amount);
                return (
                  <div key={amount} className="ps-card !bg-gray-50 border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[15px] font-black text-gray-900">{fmtKsh(amount)}</p>
                      <span className="w-8 h-8 rounded-lg bg-brand-500 text-white grid place-items-center">
                        <Zap size={15} />
                      </span>
                    </div>
                    <p className="text-2xl font-black text-brand-600">
                      {dailyAvg > 0 ? `~${days.toFixed(1)} days` : '—'}
                    </p>
                    <p className="text-[12px] text-gray-500 mt-1">≈ {kwh.toFixed(1)} kWh of power</p>
                    <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.min((days / 30) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[12px] text-amber-700">
                <span className="font-bold">Please note:</span> these are estimates. Actual token value depends on the
                prevailing Kenya Power tariff, levies and your appliance usage.
              </p>
            </div>

            <div className="mt-5 ps-card !bg-brand-500 !border-brand-500 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-emerald-100" />
                <div>
                  <p className="text-[13px] font-bold">Recommended top-up</p>
                  <p className="text-[12px] text-emerald-50/80">
                    Based on your forecast, consider {fmtKsh(prediction?.recommended_topup_ksh ?? 1000)} to cover the next month.
                  </p>
                </div>
              </div>
              <Target size={20} className="text-emerald-100" />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default PredictionsPage;
