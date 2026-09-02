import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Home,
  Zap,
  Wallet,
  Download,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  XCircle,
  TrendingDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { StatCard, SectionCard, initials } from './ui';
import { meters, tokens, Meter, fmtKsh, fmtUnits, fmtDateTime } from '../services/api';

interface PortfolioOverviewProps {
  onNavigateProperties: () => void;
  onNavigateTokens: () => void;
}

const PORTFOLIO_CHART = [
  { week: 'W1', 'Riverside Court': 420, 'Kilimani Apartments': 310, 'Kileleshwa Studio': 180 },
  { week: 'W2', 'Riverside Court': 460, 'Kilimani Apartments': 340, 'Kileleshwa Studio': 210 },
  { week: 'W3', 'Riverside Court': 390, 'Kilimani Apartments': 380, 'Kileleshwa Studio': 195 },
  { week: 'W4', 'Riverside Court': 510, 'Kilimani Apartments': 360, 'Kileleshwa Studio': 240 },
];

const balanceKsh = (m: Meter) => Math.round(m.units_remaining * 5);

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ onNavigateProperties, onNavigateTokens }) => {
  const [meterList, setMeterList] = useState<Meter[]>([]);
  const [tokenList, setTokenList] = useState<{ id: string; meter: string; amount_ksh: number; units: number; status: string; created: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const list = await meters.list();
      setMeterList(list);
      const tks = await tokens.list();
      setTokenList(
        tks.map((t) => ({
          id: t.id,
          meter: t.token_number,
          amount_ksh: t.amount_ksh,
          units: t.units,
          status: t.push_status,
          created: t.purchased_at,
        }))
      );
    } catch (e: any) {
      setError(e.message || 'Failed to load portfolio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalUnits = meterList.length;
  const totalKwh = meterList.reduce((a, m) => a + (m.units_remaining || 0), 0);
  const totalValue = meterList.reduce((a, m) => a + balanceKsh(m), 0);
  const needing = meterList.filter((m) => balanceKsh(m) <= 400);
  const critical = meterList.filter((m) => balanceKsh(m) <= 150);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Portfolio Overview</h1>
          <p className="ps-sub">Your properties and tenant energy usage at a glance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={onNavigateTokens} className="ps-btn-gold">
            <Zap size={15} /> Bulk Purchase Tokens
          </button>
          <button className="ps-btn-outline">
            <Download size={15} /> Export Report
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* 4 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<Building2 size={19} />} label="Total Properties" value="3" change="+1" footer="Riverside, Kilimani, Kileleshwa" />
        <StatCard icon={<Home size={19} />} label="Total Units" value={totalUnits.toLocaleString()} change="+2.1%" footer="across all properties" />
        <StatCard icon={<Zap size={19} />} label="Active Meters" value={totalUnits.toLocaleString()} badge="100% Online" progress={100} />
        <StatCard icon={<Wallet size={19} />} label="Electricity Value" value={fmtKsh(totalValue)} change="+4.2%" up footer={`${totalKwh.toFixed(1)} kWh stored`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: attention list + chart */}
        <div className="xl:col-span-2 space-y-6">
          <SectionCard
            title="Meters Needing Attention"
            action={<span className="ps-pill-red">{needing.length} alert{needing.length === 1 ? '' : 's'}</span>}
          >
            {needing.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">All meters are healthy. Great job!</p>
            ) : (
              <div className="space-y-2.5">
                {needing.map((m) => {
                  const c = critical.some((x) => x.id === m.id);
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${c ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-800 truncate">{m.name || 'Unnamed unit'}</p>
                        <p className="text-[11px] font-mono text-gray-400">Meter {m.meter_number}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${c ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {c ? 'Critical' : 'Low balance'}
                      </span>
                      <p className="text-[13px] font-bold text-gray-900 w-20 text-right">{fmtKsh(balanceKsh(m))}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Portfolio Consumption (Last 30 Days)" action={<span className="text-[11px] font-semibold text-gray-400">kWh</span>}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PORTFOLIO_CHART} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip cursor={{ fill: '#F5F4FA' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Riverside Court" stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Kilimani Apartments" stackId="a" fill="#60A5FA" />
                  <Bar dataKey="Kileleshwa Studio" stackId="a" fill="#BFDBFE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Right: recent purchases */}
        <div className="space-y-6">
          <SectionCard
            title="Recent Purchases"
            action={
              <button onClick={onNavigateTokens} className="text-[12px] font-semibold text-brand-500 flex items-center gap-1 hover:underline cursor-pointer">
                Buy More <ArrowUpRight size={13} />
              </button>
            }
          >
            {tokenList.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No purchases yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {tokenList.slice(0, 8).map((t) => (
                  <div key={t.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-bold text-gray-800">{fmtKsh(t.amount_ksh)}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        t.status === 'success' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{fmtUnits(t.units)} · {fmtDateTime(t.created)}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <div className="ps-card p-5">
            <h3 className="text-[15px] font-bold text-gray-800 mb-3">Health Summary</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Healthy meters', value: meterList.length - needing.length, color: 'bg-emerald-500' },
                { label: 'Low balance', value: needing.length - critical.length, color: 'bg-amber-500' },
                { label: 'Critical', value: critical.length, color: 'bg-red-500' },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${r.color}`} /> {r.label}
                  </span>
                  <span className="font-bold text-gray-800">{r.value}</span>
                </div>
              ))}
            </div>
            <button onClick={onNavigateProperties} className="mt-4 w-full py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-600 text-[13px] font-bold transition-colors cursor-pointer">
              Manage Properties
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-lg text-sm text-gray-500">
          <RefreshCw size={15} className="animate-spin" /> Syncing portfolio…
        </div>
      )}
    </div>
  );
};

export default PortfolioOverview;
