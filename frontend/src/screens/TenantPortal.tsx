import React, { useEffect, useState, useCallback } from 'react';
import {
  Zap,
  RefreshCw,
  ArrowUpRight,
  Repeat,
  Share2,
  AlertTriangle,
  Wifi,
  Check,
  X,
  Send,
  ShoppingCart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { PortalLayout, PortalPage } from '../layouts/PortalLayout';
import { meter, meters, tokens, Meter, Prediction, fmtUnits, getSession } from '../services/api';

interface TenantPortalProps {
  onLogout?: () => void;
}

const USAGE_7D = [
  { day: 'Mon', kwh: 4.2 },
  { day: 'Tue', kwh: 3.8 },
  { day: 'Wed', kwh: 5.1 },
  { day: 'Thu', kwh: 4.6 },
  { day: 'Fri', kwh: 6.2 },
  { day: 'Sat', kwh: 7.4 },
  { day: 'Sun', kwh: 5.9 },
];

const AVATAR_INITIALS = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U';

export const TenantPortal: React.FC<TenantPortalProps> = ({ onLogout }) => {
  const [page, setPage] = useState<PortalPage>('health');
  const [meterData, setMeterData] = useState<Meter | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [autoOn, setAutoOn] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // buy form
  const [buyAmount, setBuyAmount] = useState(500);
  const [buyChannel, setBuyChannel] = useState('mpesa');
  const [buyPhone, setBuyPhone] = useState('');
  const [buying, setBuying] = useState(false);
  // transfer form
  const [tfAccount, setTfAccount] = useState('');
  const [tfAmount, setTfAmount] = useState('');
  const [transferring, setTransferring] = useState(false);

  const user = getSession().user;
  const userName = user?.name || 'W. Kamau';

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const m = await meter.status();
      setMeterData(m);
      setAutoOn(m.auto_topup);
      setPrediction(await meter.prediction());
    } catch (e: any) {
      setError(e.message || 'Failed to load meter data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remaining = meterData?.units_remaining ?? 0;
  const maxKwh = 100;
  const R = 74;
  const C = 2 * Math.PI * R;
  const pct = Math.min(Math.max(remaining / maxKwh, 0), 1);
  const daysLeft =
    prediction && typeof prediction.days_remaining === 'number'
      ? prediction.days_remaining.toFixed(1)
      : '—';

  const toggleAuto = async () => {
    if (!meterData) return;
    const next = !autoOn;
    setAutoOn(next);
    try {
      await meters.settings(meterData.id, {
        auto_topup: next,
        topup_threshold: 10,
        topup_amount_ksh: 500,
      });
      setNotice(next ? 'Auto top-up enabled (threshold < 10 kWh).' : 'Auto top-up disabled.');
      setTimeout(() => setNotice(null), 4000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doBuy = async () => {
    setBuying(true);
    setError(null);
    try {
      const t = await tokens.buy({
        amount_ksh: buyAmount,
        payment_channel: buyChannel,
        phone: buyPhone || undefined,
      });
      setNotice(`Token issued! ${fmtUnits(t.units)} — ${t.token_number}.`);
      setTimeout(() => setNotice(null), 6000);
      setBuyOpen(false);
      await refresh();
    } catch (e2: any) {
      setError(e2.message || 'Purchase failed.');
    } finally {
      setBuying(false);
    }
  };

  const doTransfer = async () => {
    setTransferring(true);
    setError(null);
    try {
      await tokens.transfer({ meter_account: tfAccount.trim(), amount_ksh: parseInt(tfAmount) || 0 });
      setNotice('Token sent to that meter.');
      setTimeout(() => setNotice(null), 6000);
      setTransferOpen(false);
      setTfAccount('');
      setTfAmount('');
    } catch (e2: any) {
      setError(e2.message || 'Transfer failed.');
    } finally {
      setTransferring(false);
    }
  };

  const input =
    'w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F]/40 text-sm';
  const card = 'bg-white rounded-2xl border border-slate-200 shadow-sm';

  return (
    <PortalLayout userName={userName} roleLabel="Tenant" active={page} onNavigate={setPage} onLogout={onLogout}>
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Energy Balance</h1>
          <p className="text-[13px] text-slate-500 mt-1">Your prepaid meter at a glance.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => setBuyOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#27496f] text-white text-[13px] font-bold transition-colors cursor-pointer">
            <Zap size={15} /> Buy Token
          </button>
          <button onClick={() => setTransferOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-[#1E3A5F] text-[#1E3A5F] text-[13px] font-bold transition-colors cursor-pointer">
            <Repeat size={15} /> Emergency Transfer
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {notice && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <Check size={16} /> {notice}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Energy balance card */}
          <div className={card + ' p-6'}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[15px] font-bold text-slate-800">Energy Balance</h2>
              <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 cursor-pointer">
                Auto Top-Up
                <span className="text-slate-400">(Threshold &lt; 10 kWh)</span>
                <button
                  onClick={toggleAuto}
                  className={`relative w-10 h-[22px] rounded-full transition-colors cursor-pointer ${autoOn ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${autoOn ? 'left-[20px]' : 'left-0.5'}`} />
                </button>
              </label>
            </div>
            <p className="text-[12px] text-slate-500 mb-5">
              Estimated depletion:{' '}
              <span className="font-semibold text-slate-700">
                {prediction?.depletion_date
                  ? new Date(prediction.depletion_date).toLocaleString('en-KE', {
                      weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                    })
                  : 'Insufficient data'}
              </span>
            </p>

            <div className="flex flex-col items-center py-2">
              <div className="relative w-[190px] h-[190px]">
                <svg width="190" height="190" viewBox="0 0 190 190" className="-rotate-90">
                  <circle cx="95" cy="95" r={R} fill="none" stroke="#E8EDF4" strokeWidth="16" />
                  <circle
                    cx="95" cy="95" r={R} fill="none"
                    stroke={pct > 0.3 ? '#16A34A' : '#F59E0B'}
                    strokeWidth="16" strokeLinecap="round"
                    strokeDasharray={`${C * pct} ${C}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-[#1E3A5F]">{remaining.toFixed(0)}</span>
                  <span className="text-[12px] font-semibold text-slate-400">kWh remaining</span>
                </div>
              </div>
              <p className="mt-3 text-[13px] font-semibold text-slate-600">
                ~{daysLeft} days left
              </p>
            </div>

            {/* Predictive nudge */}
            <div className="mt-5 p-4 rounded-xl bg-[#F0F7FF] border border-[#1E3A5F]/10 flex items-start gap-3">
              <Zap size={17} className="text-[#1E3A5F] mt-0.5 shrink-0" />
              <p className="text-[13px] text-[#1E3A5F]">
                <span className="font-bold">Predictive Nudge:</span> You usually top up on Wednesday
                nights. That's 2 days away — topping up today keeps your streak and saves a rush.
              </p>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Active meter */}
          <div className={card + ' p-5'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-slate-800">Active Meter</h3>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                <Wifi size={12} /> Smart Meter Connected
              </span>
            </div>
            <p className="text-[13px] text-slate-500">Meter Number</p>
            <p className="text-[15px] font-mono font-bold text-slate-800">{meterData?.meter_number || '—'}</p>
            <p className="text-[13px] text-slate-500 mt-2">Unit / Property</p>
            <p className="text-[14px] font-semibold text-slate-700">{meterData?.name || 'Apartment 4B, Westlands'}</p>

            <div className="mt-5">
              <div className="flex items-end justify-between mb-2">
                <p className="text-[12px] font-semibold text-slate-500">7-day usage</p>
                <span className="text-[11px] font-bold text-emerald-600">-8% vs last week</span>
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={USAGE_7D} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="kwh" radius={[4, 4, 0, 0]} fill="#1E3A5F">
                      {USAGE_7D.map((d, i) => (
                        <Cell key={i} fill={d.day === 'Sat' || d.day === 'Sun' ? '#16A34A' : '#1E3A5F'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className={card + ' p-5'}>
            <h3 className="text-[15px] font-bold text-slate-800 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => setTransferOpen(true)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-[#1E3A5F] hover:text-white text-[13px] font-semibold text-slate-700 border border-slate-200 transition-colors cursor-pointer">
                <Share2 size={15} /> Share Token
              </button>
              <button onClick={() => setPage('outages')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-[#1E3A5F] hover:text-white text-[13px] font-semibold text-slate-700 border border-slate-200 transition-colors cursor-pointer">
                <AlertTriangle size={15} /> Report Outage
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Buy modal */}
      {buyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ShoppingCart size={18} className="text-[#1E3A5F]" /> Buy Token
              </h3>
              <button onClick={() => setBuyOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[100, 200, 500, 1000].map((a) => (
                <button
                  key={a}
                  onClick={() => setBuyAmount(a)}
                  className={`py-2 rounded-xl text-[12px] font-bold border transition-colors cursor-pointer ${
                    buyAmount === a ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['mpesa', 'airtel', 'bank'].map((c) => (
                <button
                  key={c}
                  onClick={() => setBuyChannel(c)}
                  className={`py-2 rounded-xl text-[12px] font-bold border capitalize transition-colors cursor-pointer ${
                    buyChannel === c ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            {buyChannel !== 'bank' && (
              <input className={input + ' mb-4'} placeholder="M-Pesa / Airtel number" value={buyPhone} onChange={(e) => setBuyPhone(e.target.value)} />
            )}
            <button onClick={doBuy} disabled={buying} className="w-full py-3 rounded-xl bg-[#1E3A5F] hover:bg-[#27496f] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer">
              {buying ? <RefreshCw size={15} className="animate-spin" /> : <ArrowUpRight size={15} />}
              {buying ? 'Purchasing…' : `Buy KSh ${buyAmount}`}
            </button>
          </div>
        </div>
      )}

      {/* Transfer modal */}
      {transferOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Send size={18} className="text-[#1E3A5F]" /> Emergency Transfer
              </h3>
              <button onClick={() => setTransferOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <input className={input} placeholder="Recipient meter account" value={tfAccount} onChange={(e) => setTfAccount(e.target.value)} />
              <input className={input} type="number" placeholder="Amount (KSh)" value={tfAmount} onChange={(e) => setTfAmount(e.target.value)} />
              <button onClick={doTransfer} disabled={transferring} className="w-full py-3 rounded-xl bg-white border border-[#1E3A5F] text-[#1E3A5F] text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer">
                {transferring ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                {transferring ? 'Sending…' : 'Send token'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
};

export default TenantPortal;
