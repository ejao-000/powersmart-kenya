import React, { useEffect, useState, useCallback } from 'react';
import { LiveGauge } from '../components/LiveGauge';
import { ApplianceSliders } from '../components/ApplianceSliders';
import { TokenVault } from '../components/TokenVault';
import {
  Zap,
  Smartphone,
  RefreshCw,
  LogOut,
  ShieldCheck,
  ArrowUpRight,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import {
  meter,
  tokens,
  transactions as txApi,
  Meter,
  Prediction,
  Token,
  Transaction,
  fmtKsh,
  fmtUnits,
  fmtDateTime,
  getSession,
} from '../services/api';

interface DashboardProps {
  onLogout?: () => void;
}

const CHANNELS = [
  { id: 'mpesa', label: 'M-Pesa', hint: '0712 345 678' },
  { id: 'airtel', label: 'Airtel', hint: '0733 000 000' },
  { id: 'bank', label: 'Bank', hint: 'no phone needed' },
];

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [meterData, setMeterData] = useState<Meter | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [tokenList, setTokenList] = useState<Token[]>([]);
  const [txnList, setTxnList] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buy-token form state
  const [topUpAmount, setTopUpAmount] = useState<number>(500);
  const [channel, setChannel] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const user = getSession().user;

  const refresh = useCallback(async () => {
    try {
      const [m, p, t, tx] = await Promise.all([
        meter.status(),
        meter.prediction(),
        tokens.list(),
        txApi.list(),
      ]);
      setMeterData(m);
      setPrediction(p);
      setTokenList(t);
      setTxnList(tx);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load your meter data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleBuy = async () => {
    if (topUpAmount < 50) {
      setError('Minimum top-up is KSh 50.');
      return;
    }
    if ((channel === 'mpesa' || channel === 'airtel') && !phone) {
      setError(`Phone number is required for ${channel} payments.`);
      return;
    }
    setError(null);
    setBuying(true);
    try {
      const token = await tokens.buy({
        amount_ksh: topUpAmount,
        payment_channel: channel,
        phone: phone || undefined,
      });
      setNotice(
        `Token issued! ${fmtUnits(token.units)} credited — token number ${token.token_number}.`
      );
      setTimeout(() => setNotice(null), 6000);
      await refresh();
      setPhone('');
    } catch (err: any) {
      setError(err.message || 'Token purchase failed.');
    } finally {
      setBuying(false);
    }
  };

  const depletion =
    prediction && prediction.depletion_date
      ? new Date(prediction.depletion_date).toLocaleString('en-KE', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })
      : null;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-4 md:p-8 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Notice banner */}
      {notice && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 shadow-2xl backdrop-blur-xl">
          <ShieldCheck size={18} />
          <span className="text-xs font-mono font-bold">{notice}</span>
        </div>
      )}

      {/* Header */}
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Zap size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono tracking-tight text-slate-100">
              PowerSmart Kenya
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {user ? `${user.name} · ${user.role}` : 'Consumer Portal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {meterData && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Meter #{meterData.meter_number}
            </div>
          )}
          <button
            onClick={() => refresh()}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 transition-all"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 transition-all"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="max-w-5xl mx-auto flex items-center justify-center py-32">
          <div className="flex items-center gap-3 text-slate-400">
            <RefreshCw size={20} className="animate-spin" />
            <span className="font-mono text-sm">Connecting to PowerSmart API…</span>
          </div>
        </div>
      ) : error ? (
        <div className="max-w-5xl mx-auto px-6 py-16 rounded-2xl bg-slate-900/60 border border-red-500/30">
          <div className="flex items-center gap-3 text-red-400 mb-3">
            <AlertTriangle size={20} />
            <h2 className="font-bold">Unable to load your data</h2>
          </div>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={() => { setLoading(true); refresh(); }}
            className="mt-4 px-4 py-2 rounded-xl bg-cyan-400 text-slate-950 text-sm font-bold hover:bg-cyan-300 transition-all cursor-pointer"
          >
            Try again
          </button>
        </div>
      ) : (
        <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {/* Left column */}
          <div className="space-y-6">
            <LiveGauge
              remainingKwh={meterData?.units_remaining ?? 0}
              maxKwh={100}
              estimatedRunOut={depletion || 'Insufficient data'}
              meterNumber={meterData?.meter_number || '—'}
            />

            {/* Top-up widget */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-bold font-mono text-slate-100 mb-4 flex items-center gap-2">
                <Smartphone size={16} className="text-cyan-400" /> Buy Electricity Token
              </h3>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[100, 200, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTopUpAmount(amt)}
                    className={`py-2.5 rounded-xl font-mono text-xs font-bold border transition-all ${
                      topUpAmount === amt
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {amt} KSh
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {CHANNELS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChannel(c.id)}
                    className={`py-2 rounded-xl font-mono text-xs font-bold border transition-all ${
                      channel === c.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {(channel === 'mpesa' || channel === 'airtel') && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    M-Pesa / Airtel phone number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={CHANNELS.find((c) => c.id === channel)?.hint}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  />
                </div>
              )}

              <button
                onClick={handleBuy}
                disabled={buying}
                className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-400/20 disabled:opacity-50 cursor-pointer"
              >
                {buying ? <RefreshCw size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
                {buying ? 'Purchasing…' : `Buy KSh ${topUpAmount} token`}
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <ApplianceSliders />
            <TokenVault
              tokens={tokenList}
              onDelete={async (id) => {
                await tokens.remove(id);
                await refresh();
              }}
            />

            {/* Transactions */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-2 mb-5">
                <Receipt size={18} className="text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100 font-mono">Payment History</h3>
              </div>
              {txnList.length === 0 ? (
                <p className="text-sm text-slate-500">No payments yet — buy your first token above.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {txnList.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold text-slate-100">{fmtKsh(t.amount_ksh)}</span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {t.channel}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-500 mt-1">Ref: {t.reference}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{fmtDateTime(t.created_at)}</p>
                      </div>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-1 rounded-md border ${
                          t.status === 'success'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                            : t.status === 'failed' || t.status === 'cancelled'
                              ? 'text-red-400 bg-red-500/10 border-red-500/30'
                              : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default Dashboard;
