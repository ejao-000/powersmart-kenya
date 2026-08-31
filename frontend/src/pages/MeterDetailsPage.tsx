import React, { useEffect, useState, useCallback } from 'react';
import {
  Download,
  Search,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Zap,
  CalendarClock,
  Target,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { SectionCard } from './ui';
import { meter, tokens, Meter, Prediction, Token, fmtKsh, fmtUnits, fmtDateTime } from '../services/api';

const mask = (n: string) => (n.length > 6 ? `${n.slice(0, 3)}••••••${n.slice(-3)}` : n);
const formatToken = (t: string) => (t.match(/.{1,4}/g) || []).join(' ');

export const MeterDetailsPage: React.FC = () => {
  const [meterData, setMeterData] = useState<Meter | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [tokenList, setTokenList] = useState<Token[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setMeterData(await meter.status());
      try {
        setPrediction(await meter.prediction());
      } catch {
        /* optional */
      }
      setTokenList(await tokens.list());
    } catch {
      /* errors handled by portal header */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remaining = meterData?.units_remaining ?? 0;
  const maxKwh = 100;
  const pct = Math.min(Math.max((remaining / maxKwh) * 100, 0), 100);
  const daysLeft = prediction && typeof prediction.days_remaining === 'number' ? prediction.days_remaining : null;
  const confidence = prediction?.confidence_level ?? 'medium';

  const filtered = tokenList.filter(
    (t) => (t.token_number + fmtKsh(t.amount_ksh)).toLowerCase().includes(query.toLowerCase())
  );

  const copy = (id: string, num: string) => {
    navigator.clipboard?.writeText(num).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Meter Details</h1>
          <p className="ps-sub">Your prepaid meter balance and token history.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={refresh} className="ps-btn-outline !px-3 !py-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="ps-btn-primary">
            <Download size={15} /> Download PDF History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Meter identity + run-out forecast */}
        <div className="xl:col-span-1 space-y-6">
          <SectionCard title="Meter Identity">
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
                <span className="text-gray-500">Current Tariff</span>
                <span className="font-bold text-gray-800">KSh 15.18/kWh</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Auto Top-Up</span>
                <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md ${meterData?.auto_topup ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 bg-gray-100'}`}>
                  {meterData?.auto_topup ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">Units Remaining</span>
                <span className="font-black text-brand-600">{fmtUnits(remaining)}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Run-out Forecast">
            <div className="flex items-start gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 grid place-items-center shrink-0">
                <CalendarClock size={17} />
              </span>
              <div>
                <p className="text-2xl font-black text-gray-900">{daysLeft !== null ? `~${daysLeft.toFixed(1)} days` : '—'}</p>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  {prediction?.depletion_date
                    ? new Date(prediction.depletion_date).toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
                    : 'Insufficient data'}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct <= 15 ? 'bg-red-500' : pct <= 30 ? 'bg-amber-500' : 'bg-brand-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] text-gray-500 flex items-center gap-1"><Target size={12} /> Confidence</span>
              <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md ${
                confidence === 'high' ? 'text-emerald-600 bg-emerald-50' : confidence === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
              }`}>
                {confidence}
              </span>
            </div>
            {pct <= 15 && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-red-700">Balance critically low — top up soon to avoid an outage.</p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Recent tokens */}
        <div className="xl:col-span-2">
          <SectionCard
            title="Recent Tokens"
            action={
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tokens…"
                  className="pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all"
                />
              </div>
            }
          >
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">No tokens yet — buy your first token.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                      <th className="py-2.5 pr-3 font-semibold">Date</th>
                      <th className="py-2.5 pr-3 font-semibold">Amount</th>
                      <th className="py-2.5 pr-3 font-semibold">Units</th>
                      <th className="py-2.5 pr-3 font-semibold">Token Number</th>
                      <th className="py-2.5 pr-3 font-semibold">Status</th>
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
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            t.push_status === 'success' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                          }`}>
                            {t.push_status === 'success' ? 'Applied' : 'Unapplied'}
                          </span>
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

          <div className="ps-card p-5 mt-6 bg-brand-500 text-white border-brand-500 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-emerald-100" />
              <div>
                <p className="text-[13px] font-bold">Tokens are stored securely</p>
                <p className="text-[12px] text-emerald-50/80">Sync to your meter via Bluetooth or Wi-Fi anytime.</p>
              </div>
            </div>
            <KeyRound size={20} className="text-emerald-100" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeterDetailsPage;
