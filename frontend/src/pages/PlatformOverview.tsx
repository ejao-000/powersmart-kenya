import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Zap,
  CreditCard,
  Activity,
  Database,
  BellRing,
  Timer,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { StatCard, SectionCard } from './ui';
import { adminApi, AdminUser, AdminMeter, AdminTransaction, fmtKsh, fmtDateTime } from '../services/api';

interface PlatformOverviewProps {
  onNavigateTransactions: () => void;
}

const SYSTEM_HEALTH = [
  { name: 'Payments', icon: CreditCard, status: 'Operational', tone: 'green' as const },
  { name: 'Database', icon: Database, status: 'Operational', tone: 'green' as const },
  { name: 'Notifications', icon: BellRing, status: 'Operational', tone: 'green' as const },
  { name: 'Token Service', icon: Timer, status: 'Degraded', tone: 'amber' as const },
];

const statusTone = {
  green: 'ps-pill-green',
  amber: 'ps-pill-amber',
  red: 'ps-pill-red',
};

export const PlatformOverview: React.FC<PlatformOverviewProps> = ({ onNavigateTransactions }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meters, setMeters] = useState<AdminMeter[]>([]);
  const [txns, setTxns] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [u, m, t] = await Promise.all([
        adminApi.users(),
        adminApi.meters(),
        adminApi.transactions(),
      ]);
      setUsers(u);
      setMeters(m);
      setTxns(t);
    } catch (e: any) {
      setError(e.message || 'Failed to load platform data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalPurchases = txns.filter((t) => t.status === 'success').reduce((a, b) => a + b.amount_ksh, 0);
  const activeMeters = meters.filter((m) => m.units_remaining > 0 || m.auto_topup).length;
  const onlinePct = meters.length ? Math.round((activeMeters / meters.length) * 100) : 0;
  const recent = txns.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Platform Overview</h1>
          <p className="ps-sub">Live status across users, meters and token sales.</p>
        </div>
        <button onClick={() => { setLoading(true); refresh(); }} className="ps-btn-outline">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Users size={19} />}
          label="Total Users"
          value={users.length.toLocaleString()}
          change="+12.4%"
          footer="vs last month"
        />
        <StatCard
          icon={<Zap size={19} />}
          label="Active Meters"
          value={meters.length.toLocaleString()}
          badge="Live"
          progress={onlinePct}
          footer={`${onlinePct}% of meters online`}
        />
        <StatCard
          icon={<CreditCard size={19} />}
          label="Token Purchases"
          value={fmtKsh(totalPurchases)}
          change="+8.1%"
          up
          footer={`${txns.length} transactions this period`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: System health + live monitoring */}
        <div className="xl:col-span-2 space-y-6">
          <SectionCard title="System Health">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SYSTEM_HEALTH.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.name} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={15} className="text-brand-500" />
                      <p className="text-[12px] font-semibold text-gray-600">{s.name}</p>
                    </div>
                    <span className={statusTone[s.tone]}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.tone === 'green' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {s.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Live monitoring map panel */}
          <SectionCard title="Live Monitoring" action={<span className="ps-pill-green"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live</span>}>
            <div className="rounded-xl overflow-hidden border border-gray-200 relative h-64 bg-gradient-to-br from-brand-50 via-emerald-50 to-white">
              <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(15,81,50,0.12)_1px,transparent_1px)] [background-size:22px_22px]" />
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0 opacity-30">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-brand-500/10" />
                ))}
              </div>
              {/* Pseudo heat markers */}
              <div className="absolute left-[22%] top-[38%] h-3 w-3 rounded-full bg-red-500 ring-4 ring-red-500/20 animate-pulse" />
              <div className="absolute left-[58%] top-[26%] h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
              <div className="absolute left-[46%] top-[62%] h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              <div className="absolute right-[18%] top-[58%] h-2 w-2 rounded-full bg-brand-500 ring-4 ring-brand-500/20" />
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-semibold text-gray-600 shadow-sm">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Nairobi West Cluster — 12 reports</span>
                <span className="flex items-center gap-1.5 mt-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> 3 minor disruptions</span>
              </div>
              <div className="absolute bottom-4 right-4 bg-white/90 rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-brand-500 shadow-sm flex items-center gap-1">
                <ShieldCheck size={13} /> 99.9% delivery
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right: Recent transactions */}
        <div className="space-y-6">
          <SectionCard
            title="Recent Transactions"
            action={
              <button onClick={onNavigateTransactions} className="text-[12px] font-semibold text-brand-500 flex items-center gap-1 hover:underline cursor-pointer">
                View All <ArrowRight size={13} />
              </button>
            }
          >
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No transactions yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recent.map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{t.owner_email}</p>
                      <p className="text-[11px] text-gray-400">{fmtDateTime(t.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-gray-900">{fmtKsh(t.amount_ksh)}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        t.status === 'success'
                          ? 'text-emerald-600 bg-emerald-50'
                          : t.status === 'failed' || t.status === 'cancelled'
                            ? 'text-red-600 bg-red-50'
                            : 'text-amber-600 bg-amber-50'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <div className="ps-card p-5 bg-brand-500 text-white border-brand-500">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} />
              <p className="text-[13px] font-bold">All systems nominal</p>
            </div>
            <p className="text-[12px] text-emerald-50/80">
              Token delivery latency is 1.2s average. No manual interventions queued.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformOverview;
