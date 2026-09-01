import React, { useEffect, useState } from 'react';
import {
  Smartphone,
  RefreshCw,
  Check,
  ShieldCheck,
  ArrowUpRight,
  Wallet,
  KeyRound,
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

export const BuyTokensPage: React.FC = () => {
  const [amount, setAmount] = useState(500);
  const [custom, setCustom] = useState(false);
  const [channel, setChannel] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenList, setTokenList] = useState<Token[]>([]);

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
                      ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-brand-500'
                  }`}
                >
                  {amt} KSh
                </button>
              ))}
              <button
                onClick={() => { setCustom(true); }}
                className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  custom ? 'bg-brand-500 border-brand-500 text-white shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-brand-500'
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
                      ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-brand-500'
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
              className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {buying ? <RefreshCw size={15} className="animate-spin" /> : <ArrowUpRight size={15} />}
              {buying ? 'Purchasing…' : `Buy KSh ${amount} token`}
            </button>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <div className="ps-card p-5 bg-brand-500 text-white border-brand-500">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} />
              <p className="text-[13px] font-bold">How it works</p>
            </div>
            <ol className="text-[12px] text-emerald-50/90 space-y-2 mt-2">
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
