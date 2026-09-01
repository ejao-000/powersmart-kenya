import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Copy,
  Check,
  Download,
  Printer,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Filter,
  Wifi,
  Bluetooth,
  Radio,
} from 'lucide-react';
import { SectionCard } from './ui';
import { TokenPushControls } from '../components/TokenPushControls';
import { tokens, Token, fmtKsh, fmtUnits, fmtDateTime } from '../services/api';

const formatToken = (t: string) => (t.match(/.{1,4}/g) || []).join(' ');

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'success', label: 'Applied' },
  { id: 'pending', label: 'Unapplied' },
];

export const TokenHistoryPage: React.FC = () => {
  const [tokenList, setTokenList] = useState<Token[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTokenList(await tokens.list());
    } catch {
      /* portal header handles errors */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = tokenList.filter((t) => {
    const text = `${t.token_number} ${fmtKsh(t.amount_ksh)} ${fmtUnits(t.units)} ${t.push_status}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesStatus =
      status === 'all' ||
      (status === 'success' && t.push_status === 'success') ||
      (status === 'pending' && t.push_status !== 'success');
    return matchesQuery && matchesStatus;
  });

  const copy = (id: string, num: string) => {
    navigator.clipboard?.writeText(num).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const downloadCSV = () => {
    const header = 'Date,Amount (KSh),Units (kWh),Token,Status';
    const rows = filtered.map((t) =>
      [t.purchased_at, t.amount_ksh, t.units, t.token_number, t.push_status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'powersmart-token-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printTokens = () => {
    const win = window.open('', '_blank', 'width=720,height=820');
    if (!win) return;
    const rows = filtered
      .map(
        (t) => `<tr>
          <td>${fmtDateTime(t.purchased_at)}</td>
          <td style="text-align:right">${fmtKsh(t.amount_ksh)}</td>
          <td style="text-align:right">${fmtUnits(t.units)}</td>
          <td style="font-family:monospace">${t.token_number}</td>
          <td>${t.push_status === 'success' ? 'Applied' : 'Unapplied'}</td>
        </tr>`
      )
      .join('');
    win.document.write(`
      <html><head><title>PowerSmart — Token History</title>
      <style>
        body{font-family:system-ui,Segoe UI,Roboto,sans-serif;padding:24px;color:#0f172a}
        h1{font-size:18px;margin:0 0 4px} p{color:#64748b;font-size:12px;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
        th{background:#f1f5f9}
      </style></head><body>
      <h1>PowerSmart Kenya — Token History</h1>
      <p>${filtered.length} token(s) · Generated ${new Date().toLocaleString('en-KE')}</p>
      <table><thead><tr><th>Date</th><th>Amount</th><th>Units</th><th>Token</th><th>Status</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">No tokens yet.</td></tr>'}</tbody></table>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Token History</h1>
          <p className="ps-sub">Every token you've purchased — search, copy, or send to your meter via WiFi / Bluetooth.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={refresh} className="ps-btn-outline !px-3 !py-2" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={downloadCSV} className="ps-btn-outline !px-3 !py-2">
            <Download size={14} /> CSV
          </button>
          <button onClick={printTokens} className="ps-btn-primary">
            <Printer size={15} /> Print / PDF
          </button>
        </div>
      </div>

      <SectionCard
        title="Your Tokens"
        action={
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tokens…"
                className="pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1">
              <Filter size={13} className="ml-1.5 text-gray-400" />
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    status === s.id ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <span className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 grid place-items-center mx-auto mb-3">
              <KeyRound size={22} />
            </span>
            <p className="text-[14px] font-bold text-gray-700">No token purchases yet</p>
            <p className="text-[12px] text-gray-400 mt-1">Buy your first electricity token to see your history here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="py-2.5 pr-3 font-semibold">Date</th>
                  <th className="py-2.5 pr-3 font-semibold">Amount</th>
                  <th className="py-2.5 pr-3 font-semibold">Units</th>
                  <th className="py-2.5 pr-3 font-semibold">Token Number</th>
                  <th className="py-2.5 pr-3 font-semibold">Sync to Meter</th>
                  <th className="py-2.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{fmtDateTime(t.purchased_at)}</td>
                    <td className="py-3 pr-3 font-bold text-gray-900">{fmtKsh(t.amount_ksh)}</td>
                    <td className="py-3 pr-3 text-gray-600">{fmtUnits(t.units)}</td>
                    <td className="py-3 pr-3">
                      <span className="font-mono text-[12px] font-semibold text-gray-700">{formatToken(t.token_number)}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <TokenPushControls token={t} onDone={refresh} />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => copy(t.id, t.token_number)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-brand-500 hover:bg-gray-50 transition-colors cursor-pointer"
                        title="Copy token"
                      >
                        {copied === t.id ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Share power to meter */}
      <div className="ps-card p-5 bg-sky-50 border-sky-100">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 grid place-items-center shrink-0">
            <Radio size={19} />
          </span>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-sky-800">Share your power — send tokens to your meter</p>
            <p className="text-[12px] text-sky-700/90 mt-0.5 leading-relaxed">
              Bought a token? Load it straight onto your prepaid meter without typing the 20 digits. Tap{' '}
              <span className="inline-flex items-center gap-0.5 align-middle"><Wifi size={12} /> WiFi</span> or{' '}
              <span className="inline-flex items-center gap-0.5 align-middle"><Bluetooth size={12} /> Bluetooth</span>{' '}
              next to any unapplied token below and keep your phone close to the meter.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-sky-200 text-sky-600">
                <Wifi size={12} /> WiFi — smart meters with network module
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-sky-200 text-sky-600">
                <Bluetooth size={12} /> Bluetooth — BLE-equipped prepaid meters
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="ps-card p-5 bg-brand-500 text-white border-brand-500 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-emerald-100" />
          <div>
            <p className="text-[13px] font-bold">Tokens are stored securely</p>
            <p className="text-[12px] text-emerald-50/80">Re-download or print any token at any time — even after losing your phone.</p>
          </div>
        </div>
        <KeyRound size={20} className="text-emerald-100" />
      </div>
    </div>
  );
};

export default TokenHistoryPage;
