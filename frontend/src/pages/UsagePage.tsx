import React, { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays,
  RefreshCw,
  TrendingUp,
  Wallet,
  Gauge,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { SectionCard } from './ui';
import { meter, UsageSummary, fmtKsh } from '../services/api';

type Range = '14d' | '30d';

export const UsagePage: React.FC = () => {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('30d');

  const refresh = useCallback(async () => {
    try {
      setUsage(await meter.usage());
    } catch {
      /* portal header handles errors */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const data = range === '14d' ? (usage?.daily ?? []).slice(-14) : usage?.daily ?? [];
  const chartData = data.map((d) => ({
    date: new Date(d.date + 'T00:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }),
    kwh: d.kwh,
    cost: d.cost_ksh,
  }));

  const todayKwh = usage?.today_kwh ?? 0;
  const todayCost = usage?.today_cost_ksh ?? 0;
  const weekKwh = usage?.week_kwh ?? 0;
  const weekCost = usage?.week_cost_ksh ?? 0;
  const monthKwh = usage?.month_kwh ?? 0;
  const monthCost = usage?.month_cost_ksh ?? 0;

  const cards = [
    {
      label: 'Today',
      kwh: todayKwh,
      cost: todayCost,
      icon: <Gauge size={16} />,
      footer: `${usage?.daily_avg_kwh?.toFixed(1) ?? '—'} kWh/day average`,
    },
    { label: 'This Week', kwh: weekKwh, cost: weekCost, icon: <CalendarDays size={16} />, footer: 'Last 7 days' },
    { label: 'This Month', kwh: monthKwh, cost: monthCost, icon: <TrendingUp size={16} />, footer: 'Last 30 days' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Usage</h1>
          <p className="ps-sub">Track your consumption and estimated cost over time.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {usage?.data_quality === 'low' && (
            <span className="ps-pill-amber">
              <Info size={12} /> Limited data — estimates
            </span>
          )}
          <button onClick={refresh} className="ps-btn-outline !px-3 !py-2" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="ps-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 grid place-items-center">{c.icon}</span>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{c.label}</p>
            </div>
            <p className="text-2xl font-black text-gray-900">
              {loading ? '—' : `${c.kwh} kWh`}
            </p>
            <p className="text-[12px] text-gray-500 mt-1">≈ {fmtKsh(c.cost)}</p>
            <p className="text-[11px] text-gray-400 mt-1.5">{c.footer}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Consumption chart */}
        <div className="xl:col-span-2">
          <SectionCard
            title="Daily Consumption"
            action={
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1">
                {(['14d', '30d'] as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      range === r ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {r === '14d' ? '14 days' : '30 days'}
                  </button>
                ))}
              </div>
            }
          >
            <div className="h-72 w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading usage…</div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  No usage data yet — record a meter reading to unlock charts.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} unit=" kWh" />
                    <Tooltip
                      formatter={(value) => [`${Number(value)} kWh`, 'Usage']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    <Bar dataKey="kwh" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Estimated cost chart */}
        <div>
          <SectionCard title="Estimated Cost">
            <div className="h-72 w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading…</div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value) => [fmtKsh(Number(value)), 'Cost']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="cost" stroke="#2563EB" strokeWidth={2} fill="url(#costFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <div className="mt-6 ps-card p-5 bg-brand-500 text-white border-brand-500">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} />
              <p className="text-[13px] font-bold">Monthly estimate</p>
            </div>
            <p className="text-2xl font-black">{fmtKsh(monthCost)}</p>
            <p className="text-[12px] text-emerald-50/80 mt-1">
              {monthKwh} kWh · estimated at {fmtKsh(usage?.tariff_ksh ?? 15.18)}/kWh (incl. levies).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsagePage;
