import React, { useEffect, useState, useCallback } from 'react';
import { LiveGauge } from '../components/LiveGauge';
import { ApplianceSliders } from '../components/ApplianceSliders';
import { TokenVault } from '../components/TokenVault';
import { OutageMap } from '../components/OutageMap';
import { SmartInsights } from '../components/SmartInsights';
import { MultiMeter } from '../components/MultiMeter';
import { TokenBackup } from '../components/TokenBackup';
import { TransferToken } from '../components/TransferToken';
import {
  Zap,
  Smartphone,
  RefreshCw,
  LogOut,
  ShieldCheck,
  ArrowUpRight,
  Receipt,
  AlertTriangle,
  LayoutDashboard,
  ShoppingCart,
  KeyRound,
  Building2,
  PieChart,
  MapPin,
  Send,
  Save,
} from 'lucide-react';
import {
  meter,
  meters,
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

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000];

type TabId = 'overview' | 'buy' | 'tokens' | 'meters' | 'energy' | 'outages' | 'transfer';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; roles: string[] }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['tenant', 'landlord'] },
  { id: 'buy', label: 'Buy tokens', icon: ShoppingCart, roles: ['tenant', 'landlord'] },
  { id: 'tokens', label: 'My tokens', icon: KeyRound, roles: ['tenant', 'landlord'] },
  { id: 'meters', label: 'Meters', icon: Building2, roles: ['landlord'] },
  { id: 'energy', label: 'Energy', icon: PieChart, roles: ['tenant', 'landlord'] },
  { id: 'outages', label: 'Outage map', icon: MapPin, roles: ['tenant', 'landlord'] },
  { id: 'transfer', label: 'Transfer', icon: Send, roles: ['tenant', 'landlord'] },
];

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [meterData, setMeterData] = useState<Meter | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [tokenList, setTokenList] = useState<Token[]>([]);
  const [txnList, setTxnList] = useState<Transaction[]>([]);
  const [meterList, setMeterList] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buy-token form state
  const [topUpAmount, setTopUpAmount] = useState<number>(500);
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [channel, setChannel] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Auto top-up state (primary meter)
  const [autoOn, setAutoOn] = useState(false);
  const [autoThreshold, setAutoThreshold] = useState('5');
  const [autoAmount, setAutoAmount] = useState('200');
  const [savingAuto, setSavingAuto] = useState(false);

  // Tabs + selected meter
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedMeterId, setSelectedMeterId] = useState('');

  const user = getSession().user;
  const role: 'tenant' | 'landlord' | 'admin' = (user?.role as any) || 'tenant';
  const visibleTabs = TABS.filter((t) => t.roles.includes(role));

  const refresh = useCallback(async () => {
    setError(null);
    const errors: string[] = [];
    try {
      setMeterData(await meter.status());
    } catch (err: any) {
      errors.push(err.message || 'Meter status unavailable.');
    }
    try {
      setPrediction(await meter.prediction());
    } catch {
      /* optional */
    }
    try {
      setTokenList(await tokens.list());
    } catch (err: any) {
      errors.push(err.message || 'Token history unavailable.');
    }
    try {
      setTxnList(await txApi.list());
    } catch (err: any) {
      errors.push(err.message || 'Payment history unavailable.');
    }
    try {
      const list = await meters.list();
      setMeterList(list);
      if (list.length > 0) {
        setSelectedMeterId((prev) => (list.some((m) => m.id === prev) ? prev : list[0].id));
      }
    } catch (err: any) {
      errors.push(err.message || 'Meter list unavailable.');
    }
    if (errors.length) setError(errors.join(' · '));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep auto top-up form in sync with the primary meter.
  useEffect(() => {
    if (meterData) {
      setAutoOn(meterData.auto_topup);
      setAutoThreshold(String(meterData.topup_threshold));
      setAutoAmount(String(meterData.topup_amount_ksh));
    }
  }, [meterData]);

  // Keep active tab valid when the role hides it.
  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeTab)) setActiveTab('overview');
  }, [visibleTabs, activeTab]);

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
        meter_id: selectedMeterId || undefined,
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

  const handlePush = async (id: string, method: 'wifi' | 'bluetooth') => {
    try {
      await tokens.push(id, 'request', method);
      await new Promise((resolve) => setTimeout(resolve, 1600));
      await tokens.push(id, 'confirm', method);
    } catch (e) {
      try {
        await tokens.push(id, 'fail', method);
      } catch {
        /* ignore */
      }
      throw e;
    } finally {
      await refresh();
    }
  };

  const saveAutoTopup = async () => {
    if (!meterData) return;
    setSavingAuto(true);
    setError(null);
    try {
      await meters.settings(meterData.id, {
        auto_topup: autoOn,
        topup_threshold: parseFloat(autoThreshold) || 5,
        topup_amount_ksh: parseInt(autoAmount) || 200,
      });
      setNotice('Auto top-up settings saved.');
      setTimeout(() => setNotice(null), 4000);
      await refresh();
    } catch (e2: any) {
      setError(e2.message || 'Failed to save auto top-up.');
    } finally {
      setSavingAuto(false);
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

  const input =
    'w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all';
  const label = 'block text-xs font-semibold text-slate-400 mb-1.5';

  const renderBuyWidget = () => (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
      <h3 className="text-sm font-bold font-mono text-slate-100 mb-4 flex items-center gap-2">
        <Smartphone size={16} className="text-cyan-400" /> Buy Electricity Token
      </h3>

      {meterList.length > 1 && (
        <div className="mb-4">
          <label className={label}>Meter to top up</label>
          <select
            value={selectedMeterId}
            onChange={(e) => setSelectedMeterId(e.target.value)}
            className={input + ' appearance-none cursor-pointer'}
          >
            {meterList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || 'Meter #' + m.meter_number} · {fmtUnits(m.units_remaining)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        {PRESET_AMOUNTS.map((amt) => (
          <button
            key={amt}
            onClick={() => { setCustomOpen(false); setCustomAmount(''); setTopUpAmount(amt); }}
            className={`py-2.5 rounded-xl font-mono text-xs font-bold border transition-all ${
              !customOpen && topUpAmount === amt
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            {amt} KSh
          </button>
        ))}
        <button
          onClick={() => {
            setCustomOpen(true);
            if (customAmount) {
              const n = parseInt(customAmount);
              if (!isNaN(n)) setTopUpAmount(n);
            }
          }}
          className={`py-2.5 rounded-xl font-mono text-xs font-bold border transition-all ${
            customOpen
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10'
              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          Custom
        </button>
      </div>

      {customOpen && (
        <div className="mb-4">
          <label className={label}>Custom amount (KSh) — type any figure</label>
          <input
            type="number"
            min={50}
            step={10}
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              const n = parseInt(e.target.value);
              if (!isNaN(n)) setTopUpAmount(n);
            }}
            placeholder="e.g. 750"
            className={input}
          />
        </div>
      )}

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
          <label className={label}>M-Pesa / Airtel phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={CHANNELS.find((c) => c.id === channel)?.hint}
            className={input}
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
  );

  const renderAutoTopup = () => (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
      <h3 className="text-sm font-bold font-mono text-slate-100 mb-4 flex items-center gap-2">
        <RefreshCw size={16} className="text-cyan-400" /> Scheduled &amp; Auto Top-up
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        Top up automatically when the balance falls below a level — powered by M-Pesa STK push with
        your saved consent.
      </p>
      <div className="space-y-3">
        <button
          onClick={() => setAutoOn((v) => !v)}
          className={`w-full py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
            autoOn
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}
        >
          {autoOn ? 'Auto top-up is ON' : 'Auto top-up is OFF'}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Trigger below (kWh)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={autoThreshold}
              onChange={(e) => setAutoThreshold(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Top-up amount (KSh)</label>
            <input
              type="number"
              min={50}
              value={autoAmount}
              onChange={(e) => setAutoAmount(e.target.value)}
              className={input}
            />
          </div>
        </div>
        <button
          onClick={saveAutoTopup}
          disabled={savingAuto}
          className="w-full py-2.5 rounded-xl bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 text-sm font-bold border border-cyan-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
        >
          {savingAuto ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          Save auto top-up settings
        </button>
      </div>
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <LiveGauge
                remainingKwh={meterData?.units_remaining ?? 0}
                maxKwh={100}
                estimatedRunOut={depletion || 'Insufficient data'}
                meterNumber={meterData?.meter_number || '—'}
              />
              <SmartInsights meter={meterData} prediction={prediction} />
            </div>
            <div className="space-y-6">
              {/* Recent activity */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-2 mb-5">
                  <Receipt size={18} className="text-cyan-400" />
                  <h3 className="text-base font-bold text-slate-100 font-mono">Recent Activity</h3>
                </div>
                {txnList.length === 0 ? (
                  <p className="text-sm text-slate-500">No payments yet — buy your first token.</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {txnList.slice(0, 10).map((t) => (
                      <div key={t.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-slate-100">{fmtKsh(t.amount_ksh)}</span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{t.channel}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1">{fmtDateTime(t.created_at)}</p>
                        </div>
                        <span className={`text-[10px] font-mono uppercase px-2 py-1 rounded-md border ${
                          t.status === 'success'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                            : t.status === 'failed' || t.status === 'cancelled'
                              ? 'text-red-400 bg-red-500/10 border-red-500/30'
                              : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'buy':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">{renderBuyWidget()}</div>
            <div className="space-y-6">{renderAutoTopup()}</div>
          </div>
        );
      case 'tokens':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TokenVault
              tokens={tokenList}
              onPush={handlePush}
              onDelete={async (id) => {
                await tokens.remove(id);
                await refresh();
              }}
            />
            <TokenBackup tokens={tokenList} />
          </div>
        );
      case 'meters':
        return <MultiMeter metersList={meterList} onRefresh={refresh} />;
      case 'energy':
        return <ApplianceSliders />;
      case 'outages':
        return <OutageMap />;
      case 'transfer':
        return <TransferToken onDone={refresh} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-4 md:p-8 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {notice && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 shadow-2xl backdrop-blur-xl">
          <ShieldCheck size={18} />
          <span className="text-xs font-mono font-bold">{notice}</span>
        </div>
      )}

      {/* Header */}
      <header className="max-w-5xl flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Zap size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono tracking-tight text-slate-100">
              PowerSmart Kenya
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {user ? `${user.name} · ${role}` : 'Consumer Portal'}
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
        <div className="max-w-5xl flex items-center justify-center py-32">
          <div className="flex items-center gap-3 text-slate-400">
            <RefreshCw size={20} className="animate-spin" />
            <span className="font-mono text-sm">Connecting to PowerSmart API…</span>
          </div>
        </div>
      ) : (
        <main className="max-w-5xl relative z-10">
          {error && (
            <div className="mb-6 px-5 py-4 rounded-2xl bg-slate-900/70 border border-amber-500/30">
              <div className="flex items-center gap-3 text-amber-400 mb-1">
                <AlertTriangle size={18} />
                <h2 className="font-bold text-sm">Some data could not be loaded</h2>
              </div>
              <p className="text-xs text-slate-400">{error}</p>
              <button
                onClick={() => { setLoading(true); refresh(); }}
                className="mt-3 px-4 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Tab bar */}
          <nav className="flex gap-1.5 overflow-x-auto pb-3 mb-6">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold font-mono border transition-all cursor-pointer ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {renderTab()}
        </main>
      )}
    </div>
  );
};

export default Dashboard;
