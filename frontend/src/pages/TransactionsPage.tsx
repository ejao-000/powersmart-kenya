import React, { useEffect, useState, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  CreditCard,
  Smartphone,
  Building2,
} from 'lucide-react';
import { StatCard, SectionCard } from './ui';
import { adminApi, AdminTransaction, fmtKsh, fmtDateTime } from '../services/api';

const STATUS = {
  success: { label: 'Success', cls: 'text-emerald-600 bg-emerald-50' },
  pending: { label: 'Pending', cls: 'text-amber-600 bg-amber-50' },
  failed: { label: 'Failed', cls: 'text-red-600 bg-red-50' },
  cancelled: { label: 'Cancelled', cls: 'text-red-600 bg-red-50' },
};

const providerIcon = (ch: string) =>
  ch === 'mpesa' ? <Smartphone size={14} className="text-emerald-600" /> : ch === 'airtel' ? <Smartphone size={14} className="text-red-500" /> : <Building2 size={14} className="text-gray-500" />;

export const TransactionsPage: React.FC = () => {
  const [rows, setRows] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('all');
  const [range, setRange] = useState('7d');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const perPage = 8;

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setRows(await adminApi.transactions());
    } catch (e: any) {
      setError(e.message || 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = rows.filter((t) => (status === 'all' ? true : t.status === status));
  const volume = filtered.filter((t) => t.status === 'success').reduce((a, b) => a + b.amount_ksh, 0);
  const successRate = filtered.length
    ? Math.round((filtered.filter((t) => t.status === 'success').length / filtered.length) * 100)
    : 0;
  const pendingCount = filtered.filter((t) => t.status === 'pending').length;

  const pages = Math.max(Math.ceil(filtered.length / perPage), 1);
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Transactions</h1>
          <p className="ps-sub">Monitor payments, token delivery and success rates.</p>
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
        <StatCard icon={<Wallet size={19} />} label="Today's Volume" value={fmtKsh(volume)} change="+9.3%" up footer="successful payments" />
        <StatCard icon={<TrendingUp size={19} />} label="Success Rate (24h)" value={`${successRate}%`} progress={successRate} footer="across all channels" />
        <StatCard
          icon={<AlertTriangle size={19} />}
          label="Pending Token Delivery"
          value={pendingCount.toLocaleString()}
          badge={pendingCount > 0 ? 'Needs attention' : undefined}
          badgeTone={pendingCount > 0 ? 'amber' : 'green'}
          footer={pendingCount > 0 ? 'View affected meters →' : 'All tokens delivered'}
        />
      </div>

      <SectionCard
        title="All Transactions"
        action={
          <div className="flex items-center gap-2">
            <select value={range} onChange={(e) => setRange(e.target.value)} className="ps-input !w-auto !py-2 pr-8 cursor-pointer">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="ps-input !w-auto !py-2 pr-8 cursor-pointer">
              <option value="all">All statuses</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <button className="ps-btn-outline !py-2">More</button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="py-2.5 pr-3 font-semibold">Transaction ID</th>
                <th className="py-2.5 pr-3 font-semibold">User / Meter</th>
                <th className="py-2.5 pr-3 font-semibold">Amount</th>
                <th className="py-2.5 pr-3 font-semibold">Provider</th>
                <th className="py-2.5 pr-3 font-semibold">Status</th>
                <th className="py-2.5 pr-3 font-semibold">Date</th>
                <th className="py-2.5 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const st = STATUS[t.status as keyof typeof STATUS] || STATUS.pending;
                return (
                  <React.Fragment key={t.id}>
                    <tr className="border-b border-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                      <td className="py-3 pr-3 font-mono text-[12px] text-gray-600">{t.reference || t.id.slice(0, 10)}</td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 text-[10px] font-bold grid place-items-center">
                            {(t.owner_email || 'U').slice(0, 1).toUpperCase()}
                          </span>
                          <span className="text-gray-700 truncate max-w-[180px]">{t.owner_email || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-bold text-gray-900">{fmtKsh(t.amount_ksh)}</td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md">
                          {providerIcon(t.channel)} {t.channel}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="py-3 text-gray-500">{fmtDateTime(t.created_at)}</td>
                      <td className="py-3 text-right">
                        <button className="p-1.5 rounded-lg text-gray-300 hover:text-brand-500 hover:bg-gray-50 transition-colors cursor-pointer">
                          <MoreHorizontal size={15} />
                        </button>
                      </td>
                    </tr>
                    {expanded === t.id && (
                      <tr className="border-b border-gray-50 bg-gray-50/60">
                        <td colSpan={7} className="py-3 px-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
                            <div><p className="text-gray-400 font-semibold">Reference</p><p className="font-mono text-gray-700">{t.reference || '—'}</p></div>
                            <div><p className="text-gray-400 font-semibold">Account</p><p className="text-gray-700">{t.owner_email || '—'}</p></div>
                            <div><p className="text-gray-400 font-semibold">Status</p><p className="text-gray-700 capitalize">{t.status}</p></div>
                            <div><p className="text-gray-400 font-semibold">Amount</p><p className="font-bold text-gray-800">{fmtKsh(t.amount_ksh)}</p></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400">No transactions match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <p className="text-[12px] text-gray-400">
            Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: pages }).slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                  currentPage === i + 1 ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={currentPage === pages}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default TransactionsPage;
