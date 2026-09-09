import React, { useEffect, useRef, useState } from 'react';
import {
  Smartphone,
  RefreshCw,
  Check,
  ShieldCheck,
  ArrowUpRight,
  Wallet,
  KeyRound,
  Calculator,
  Copy,
  Clock,
} from 'lucide-react';
import { SectionCard } from './ui';
import { TokenPushControls } from '../components/TokenPushControls';
import {
  tokens,
  transactions,
  payments,
  Token,
  fmtKsh,
  fmtUnits,
  fmtDateTime,
} from '../services/api';

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
  const [copied, setCopied] = useState(false);

  // Live payment capability + async (STK) purchase state.
  const [cfg, setCfg] = useState<{ mpesa_configured: boolean; airtel_configured: boolean } | null>(null);
  const [pending, setPending] = useState<{ id: string; ref: string; amount: number; channel: string } | null>(null);
  const [issuedToken, setIssuedToken] = useState<Token | null>(null);
  const pollAttempts = useRef(0);

  const load = async () => {
    try {
      setTokenList(await tokens.list());
    } catch {
      /* optional */
    }
  };
  useEffect(() => {
    load();
    payments.config().then(setCfg).catch(() => setCfg({ mpesa_configured: false, airtel_configured: false }));
  }, []);

  // Poll the pending transaction until the async callback issues the token.
  useEffect(() => {
    if (!pending) return;
    pollAttempts.current = 0;
    const iv = window.setInterval(async () => {
      pollAttempts.current += 1;
      if (pollAttempts.current > 45) {
        window.clearInterval(iv);
        setPending(null);
        setError('The payment is taking unusually long. Check your transaction history, then try again.');
        return;
      }
      try {
        const txs = await transactions.list();
        const tx = txs.find((t) => t.id === pending.id);
        if (tx && (tx.status === 'failed' || tx.status === 'cancelled')) {
          window.clearInterval(iv);
          setPending(null);
          setError(`Payment ${tx.status}. No token was issued — please try again.`);
          return;
        }
        if (tx && tx.status === 'success') {
          const tks = await tokens.list();
          const tok = tks.find((t) => t.payment_ref === pending.ref && t.amount_ksh === pending.amount);
          if (tok) {
            window.clearInterval(iv);
            setPending(null);
            setIssuedToken(tok);
            setTokenList(tks);
            return;
          }
          // Payment confirmed — token issuance follows moments later; keep polling.
        }
      } catch {
        /* transient network error — retry */
      }
    }, 4000);
    return () => window.clearInterval(iv);
  }, [pending]);

  // Simulated / development purchase (also the fallback when a channel is off).
  const instantBuy = async () => {
    const t = await tokens.buy({ amount_ksh: amount, payment_channel: channel, phone: phone || undefined });
    setIssuedToken(t);
    setPhone('');
    await load();
  };

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
    setIssuedToken(null);

    const live =
      (channel === 'mpesa' && cfg?.mpesa_configured) || (channel === 'airtel' && cfg?.airtel_configured);

    if (!live) {
      setBuying(true);
      try {
        await instantBuy();
        setNotice('Token issued (simulated purchase — live mobile money is not configured on this server).');
        setTimeout(() => setNotice(null), 8000);
      } catch (e: any) {
        setError(e.message || 'Purchase failed.');
      } finally {
        setBuying(false);
      }
      return;
    }

    setBuying(true);
    try {
      const p =
        channel === 'mpesa'
          ? await payments.mpesa({ amount_ksh: amount, phone })
          : await payments.airtel({ amount_ksh: amount, phone });
      setPending({ id: p.transaction_id, ref: p.reference, amount, channel });
      setNotice(p.message || 'Approve the push on your phone — we will issue the token as soon as payment confirms.');
      setTimeout(() => setNotice(null), 9000);
      setPhone('');
    } catch (e: any) {
      setError(e.message || 'Payment initiation failed. Try again.');
    } finally {
      setBuying(false);
    }
  };

  const copyToken = () => {
    if (!issuedToken) return;
    navigator.clipboard?.writeText(issuedToken.token_number).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formatToken = (num: string) => (num.match(/.{1,4}/g) || []).join(' ');

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

      {/* Awaiting async payment confirmation */}
      {pending && (
        <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-amber-50 border border-amber-100">
          <RefreshCw size={18} className="text-amber-500 mt-0.5 shrink-0 animate-spin" />
          <div className="flex-1">
            <p className="text-[13px] font-bold text-amber-800">
              {pending.channel === 'mpesa' ? 'M-Pesa' : 'Airtel'} payment pending
            </p>
            <p className="text-[12px] text-amber-700/90 mt-0.5">
              Approve the STK push on your phone for {fmtKsh(pending.amount)}. PowerSmart is watching for confirmation
              and will issue the token automatically — keep this page open.
            </p>
            <p className="text-[11px] text-amber-600/80 mt-1.5 flex items-center gap-1.5">
              <Clock size={12} /> Ref: {pending.ref} · can take up to a minute
            </p>
          </div>
          <button
            onClick={() => { setPending(null); setError('Payment session cancelled — nothing was charged unless you approved it on your phone.'); }}
            className="text-[11px] font-bold text-amber-600 hover:underline shrink-0 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Freshly issued token */}
      {issuedToken && (
        <div className="ps-card p-5 bg-emerald-50 border-emerald-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[14px] font-bold text-emerald-800 flex items-center gap-1.5">
              <Check size={16} /> Token issued · {fmtUnits(issuedToken.units)}
            </p>
            <span className="ps-pill-green">{fmtKsh(issuedToken.amount_ksh)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="font-mono text-[15px] font-bold text-gray-800 bg-white border border-emerald-200 rounded-lg px-3 py-2 tracking-wider">
              {formatToken(issuedToken.token_number)}
            </code>
            <button
              onClick={copyToken}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-emerald-200 text-[12px] font-bold text-emerald-700 cursor-pointer"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-[12px] text-emerald-700/80">
            Send it straight to your meter below, or type it in when the meter asks for a token.
          </p>
          <div className="mt-3">
            <TokenPushControls token={issuedToken} onDone={() => load()} />
          </div>
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
              disabled={buying || !!pending}
              className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-gold-500/30 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {buying ? <RefreshCw size={15} className="animate-spin" /> : <ArrowUpRight size={15} />}
              {buying ? 'Initiating payment…' : `Buy KSh ${amount} token`}
            </button>
            {cfg && !cfg.mpesa_configured && channel === 'mpesa' && (
              <p className="mt-2 text-[11px] text-gray-400 flex items-center gap-1.5">
                <Smartphone size={12} /> Live M-Pesa is not configured on this server — a simulated token will be issued.
              </p>
            )}
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
