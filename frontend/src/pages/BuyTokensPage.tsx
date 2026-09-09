import React, { useEffect, useState } from 'react';
import {
  Smartphone,
  RefreshCw,
  Check,
  ShieldCheck,
  ArrowUpRight,
  Wallet,
  KeyRound,
  Calculator,
} from 'lucide-react';
import { SectionCard } from './ui';
import { TokenPushControls } from '../components/TokenPushControls';
import { tokens, Token, fmtKsh, fmtUnits, fmtDateTime } from '../services/api';

const CHANNELS = [
  { id: 'mpesa', label: 'M-Pesa', hint: '0712 345 678' },
  { id: 'airtel', label: 'Airtel', hint: '0733 000 000' },
  { id: 'bank', label: 'Bank', hint: 'no phone needed' },
];

const PRESETS = [100, 200, 500, 1000, 2000];
const RATE_KS_PER_KWH = 15.18; // estimated all-in domestic tariff
const KWH_PER_KSH = 0.2; // ~20 kWh per KSh 100

export const BuyTokensPage: React.FC = () => {
  const [amount, setAmount] = useState(500);
  const [custom, setCustom] = useState(false);
  const [channel, setChannel] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenList, setTokenList] = useState<Token[]>([]);
  const [simDaily, setSimDaily] = useState(6);

  const load = async () => {
    try {
      setTokenList(await tokens.list());
    } catch {
      /* optional */
    }
  };
  useEffect(() => {
    load();
  }, []);

  const buy = async () => {
    if (amount < 50) {
      setError('Minimum top-up is KSh 50.');
      return;
    }
    if ((channel === 'mpesa' || channel === 'airtel') && !phone) {
      setError('Phone number is required for mobile money.');
      return;
    }
    setError(null);
    setBuying(true);
    try {
      const t = await tokens.buy({ amount_ksh: amount, payment_channel: channel, phone: phone || undefined });
      setNotice(`Token issued! ${fmtUnits(t.units)} — ${t.token_number}.`);
      setTimeout(() => setNotice(null), 6000);
      setPhone('');
      await load();
    } catch (e: any) {
      setError(e.message || 'Purchase failed.');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ps-heading">Buy Tokens</h1>
        <p className="ps-sub">Top up your meter instantly via M-Pesa, Airtel or bank.</p>
      </div>

      {notice && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
          <Check size={16} /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          <ShieldCheck size={16} className="shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <SectionCard title="Buy Electricity Token" action={<span className="ps-pill-green"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Secure</span>}>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
              {PRESETS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => { setCustom(false); setAmount(amt); }}
                  className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    !custom && amount === amt
                      ? 'bg-gold-500 border-gold-500 text-navy-950 shadow-sm shadow-gold-500/30'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gold-500'
                  }`}
                >
                  {amt} KSh
                </button>
              ))}
              <button
                onClick={() => { setCustom(true); }}
                className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  custom ? 'bg-gold-500 border-gold-500 text-navy-950 shadow-sm shadow-gold-500/30' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gold-500'
                }`}
              >
                Custom
              </button>
            </div>
            {custom && (
              <div className="mb-4">
                <label className="ps-label">Custom amount (KSh)</label>
                <input type="number" min={50} value={amount} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} className="ps-input" placeholder="e.g. 750" />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-4">
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChannel(c.id)}
                  className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    channel === c.id
                      ? 'bg-gold-500 border-gold-500 text-navy-950 shadow-sm shadow-gold-500/30'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gold-500'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {(channel === 'mpesa' || channel === 'airtel') && (
              <div className="mb-4">
                <label className="ps-label">{channel === 'mpesa' ? 'M-Pesa' : 'Airtel'} phone number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={CHANNELS.find((c) => c.id === channel)?.hint} className="ps-input" />
              </div>
            )}

            <button
              onClick={buy}
              disabled={buying}
              className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-gold-500/30 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {buying ? <RefreshCw size={15} className="animate-spin" /> : <ArrowUpRight size={15} />}
              {buying ? 'Purchasing…' : `Buy KSh ${amount} token`}
            </button>
          </SectionCard>
        </div>

        <div className="space-y-6">
          {/* Cost simulator */}
          <SectionCard
            title="Cost Simulator"
            action={<Calculator size={15} className="text-gray-400" />}
          >
            <p className="text-[12px] text-gray-500 leading-relaxed">
              Move the slider to your expected usage and PowerSmart estimates your costs before you buy.
            </p>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  Expected usage
                </label>
                <span className="text-[13px] font-black text-gray-800">{simDaily} kWh/day</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={simDaily}
                onChange={(e) => setSimDaily(parseInt(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>1 kWh/day</span>
                <span>30 kWh/day</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] text-gray-400">Monthly cost</p>
                <p className="text-[15px] font-black text-gray-900 mt-1">
                  {fmtKsh(Math.round(simDaily * 30 * RATE_KS_PER_KWH))}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] text-gray-400">Token power</p>
                <p className="text-[15px] font-black text-gray-900 mt-1">
                  ≈ {(amount * KWH_PER_KSH).toFixed(1)} kWh
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] text-gray-400">Lasts about</p>
                <p className="text-[15px] font-black text-gray-900 mt-1">
                  {simDaily > 0 ? `${(amount * KWH_PER_KSH / simDaily).toFixed(1)} days` : '—'}
                </p>
              </div>
            </div>

            <p className="mt-3 text-[12px] text-gray-500 leading-relaxed">
              {simDaily > 0 && amount * KWH_PER_KSH / simDaily < 5
                ? `A ${fmtKsh(amount)} token covers less than 5 days at ${simDaily} kWh/day — consider a larger amount to buy less often.`
                : `At ${simDaily} kWh/day you spend about ${fmtKsh(Math.round(simDaily * RATE_KS_PER_KWH))} per day. Estimates at ${fmtKsh(RATE_KS_PER_KWH)}/kWh.`}
            </p>
          </SectionCard>

          <div className="ps-card p-5 bg-gradient-to-br from-navy-900 to-navy-800 border-navy-800 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="text-gold-400" />
              <p className="text-[13px] font-bold">How it works</p>
            </div>
            <ol className="text-[12px] text-slate-300 space-y-2 mt-2">
              <li>1. Pick your amount &amp; payment channel.</li>
              <li>2. Approve the STK push on your phone.</li>
              <li>3. Your 20-digit token is issued instantly.</li>
            </ol>
          </div>

          <SectionCard title="Your Latest Tokens">
            {tokenList.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No tokens yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {tokenList.slice(0, 5).map((t) => (
                  <div key={t.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-bold text-gray-800">{fmtKsh(t.amount_ksh)}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        t.push_status === 'success' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                      }`}>
                        {t.push_status === 'success' ? 'Applied' : 'Unapplied'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{fmtUnits(t.units)} · {fmtDateTime(t.purchased_at)}</p>
                    <div className="mt-2">
                      <TokenPushControls token={t} onDone={load} compact />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default BuyTokensPage;
