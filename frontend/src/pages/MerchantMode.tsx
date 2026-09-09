import React, { useCallback, useEffect, useState } from 'react';
import {
  Store,
  Wallet,
  HandCoins,
  Zap,
  Check,
  Loader2,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  BadgeCheck,
  Copy,
} from 'lucide-react';
import { SectionCard } from './ui';
import {
  merchant,
  MerchantStatus,
  VendResult,
  fmtKsh,
  fmtUnits,
} from '../services/api';

const STATUS_PILL: Record<string, string> = {
  active: 'ps-pill-green',
  pending: 'ps-pill-amber',
  suspended: 'ps-pill-red',
};

const QUICK_TOPS = [500, 1000, 2000, 5000];

export const MerchantMode: React.FC = () => {
  const [data, setData] = useState<MerchantStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [applyOpen, setApplyOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);

  const [topOpen, setTopOpen] = useState(false);
  const [topAmount, setTopAmount] = useState(1000);
  const [topChannel, setTopChannel] = useState('mpesa');

  const [vendAccount, setVendAccount] = useState('');
  const [vendAmount, setVendAmount] = useState('');
  const [lastSale, setLastSale] = useState<VendResult | null>(null);
  const [copied, setCopied] = useState(false);

  const flashMsg = useCallback((msg: string, ok = true) => {
    setFlash({ msg, ok });
    setTimeout(() => setFlash(null), 3500);
  }, []);

  const load = useCallback(async () => {
    try {
      const s = await merchant.me();
      setData(s);
    } catch {
      /* header handles errors */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const apply = async () => {
    if (!businessName.trim()) {
      flashMsg('Enter your shop or business name.', false);
      return;
    }
    setBusy(true);
    try {
      await merchant.apply({ business_name: businessName.trim() });
      setApplyOpen(false);
      flashMsg('You are now a PowerSmart vendor. Top up your float to start selling.');
      await load();
    } catch (e: any) {
      flashMsg(e?.message || 'Could not register as a vendor.', false);
    } finally {
      setBusy(false);
    }
  };

  const topup = async () => {
    setBusy(true);
    try {
      const s = await merchant.topup({ amount_ksh: topAmount, channel: topChannel });
      setData(s);
      flashMsg(`Float topped up by ${fmtKsh(topAmount)}.`);
    } catch (e: any) {
      flashMsg(e?.message || 'Top-up failed.', false);
    } finally {
      setBusy(false);
    }
  };

  const vend = async () => {
    const amt = parseInt(vendAmount) || 0;
    if (!vendAccount.trim()) {
      flashMsg('Enter the customer meter account number.', false);
      return;
    }
    if (amt < 50) {
      flashMsg('Minimum sale is KSh 50.', false);
      return;
    }
    setBusy(true);
    try {
      const res = await merchant.vend({ meter_account: vendAccount.trim(), amount_ksh: amt });
      const s = await merchant.me();
      setData(s);
      setLastSale(res);
      setVendAccount('');
      setVendAmount('');
      flashMsg(`Sold ${fmtKsh(amt)} of power to ${res.customer_name || 'customer'}.`);
    } catch (e: any) {
      flashMsg(e?.message || 'Sale failed.', false);
    } finally {
      setBusy(false);
    }
  };

  const copyToken = (num: string) => {
    navigator.clipboard?.writeText(num).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const profile = data?.profile;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Vendor Mode</h1>
          <p className="ps-sub">Sell electricity tokens to walk-in customers — from your shop or phone.</p>
        </div>
        <button onClick={load} className="ps-btn-outline !px-3 !py-2" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {flash && (
        <div
          className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border ${
            flash.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
          }`}
        >
          {flash.ok ? <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />}
          <p className={`text-[13px] ${flash.ok ? 'text-emerald-700' : 'text-red-700'}`}>{flash.msg}</p>
        </div>
      )}

      {loading ? (
        <div className="ps-card p-12 text-center text-gray-400 text-sm">Loading vendor mode…</div>
      ) : !profile ? (
        /* ── Not a merchant yet ── */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 ps-card p-8">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-500 grid place-items-center mb-4">
              <Store size={26} />
            </div>
            <h2 className="text-xl font-black text-gray-900">Become a PowerSmart vendor</h2>
            <p className="mt-2 text-[14px] text-gray-500 max-w-xl leading-relaxed">
              Agents, kiosks and shops can sell electricity tokens to their community. Top up a float, then vend
              tokens straight onto any customer's meter account in seconds — and earn on every sale.
            </p>
            <div className="mt-5 grid sm:grid-cols-3 gap-3 text-[13px]">
              <div className="rounded-xl bg-gray-50 p-4">
                <HandCoins size={18} className="text-brand-500 mb-2" />
                <p className="font-bold text-gray-800">1. Top up your float</p>
                <p className="text-[12px] text-gray-500 mt-1">via M-Pesa, Airtel Money or bank.</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <Zap size={18} className="text-brand-500 mb-2" />
                <p className="font-bold text-gray-800">2. Enter the meter</p>
                <p className="text-[12px] text-gray-500 mt-1">the customer's KP meter account number.</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <BadgeCheck size={18} className="text-brand-500 mb-2" />
                <p className="font-bold text-gray-800">3. Token issued</p>
                <p className="text-[12px] text-gray-500 mt-1">the token is created on their meter instantly.</p>
              </div>
            </div>
            {applyOpen && (
              <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200 max-w-lg">
                <label className="ps-label">Business / shop name</label>
                <div className="flex gap-2">
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Mama Njeri's Shop"
                    className="ps-input flex-1"
                  />
                  <button onClick={apply} disabled={busy} className="ps-btn-primary !px-4 !py-2 disabled:opacity-50 shrink-0">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Store size={14} />} Register
                  </button>
                </div>
              </div>
            )}
            {!applyOpen && (
              <button onClick={() => setApplyOpen(true)} className="mt-6 ps-btn">
                <Store size={15} /> Register my business
              </button>
            )}
          </div>
          <div className="ps-card p-6 bg-navy-950 text-white border-navy-800">
            <p className="text-[12px] font-bold uppercase tracking-widest text-gold-400">Why vendors love it</p>
            <ul className="mt-4 space-y-3 text-[13px] text-slate-300">
              <li>• No stock of physical vouchers — tokens are digital.</li>
              <li>• Serve customers even when Kenya Power is offline.</li>
              <li>• Full sales ledger for your records.</li>
              <li>• Community-powered power — no queues.</li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          {applyOpen && (
            <div className="ps-card p-5 border-brand-200 bg-brand-50/30">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[15px] font-bold text-gray-800">Register your business</p>
                <button onClick={() => setApplyOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer">✕</button>
              </div>
              <label className="ps-label">Business / shop name</label>
              <div className="flex gap-2">
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Mama Njeri's Shop"
                  className="ps-input flex-1"
                />
                <button onClick={apply} disabled={busy} className="ps-btn-primary disabled:opacity-50">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Store size={14} />} Register
                </button>
              </div>
            </div>
          )}

          {/* Merchant hero */}
          <div className="ps-card p-6 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 border-navy-800 text-white relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gold-500/10" />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-xl bg-gold-500 text-navy-950 grid place-items-center">
                  <Store size={22} />
                </span>
                <div>
                  <p className="text-[17px] font-black">{profile.business_name}</p>
                  <span className={profile.status === 'active' ? 'ps-pill-green' : STATUS_PILL[profile.status]}>
                    <span className={`h-1.5 w-1.5 rounded-full ${profile.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {profile.status}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gold-400 flex items-center justify-end gap-1">
                  <Wallet size={13} /> Vending float
                </p>
                <p className="text-4xl font-black tracking-tight">{fmtKsh(data?.float_ksh ?? 0)}</p>
                <p className="text-[12px] text-slate-300">
                  {data?.sales_count ?? 0} sales · {fmtKsh(data?.total_sales_ksh ?? 0)} vended
                </p>
              </div>
            </div>
          </div>

          {profile.status === 'suspended' && (
            <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-red-50 border border-red-100">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-[13px] text-red-700">
                <span className="font-bold">Suspended.</span> Your vendor account has been suspended by an administrator.
              </p>
            </div>
          )}

          {profile.status === 'active' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Top up + vend */}
              <div className="xl:col-span-2 space-y-6">
                <SectionCard
                  title="Top up your float"
                  action={
                    <button onClick={() => setTopOpen((v) => !v)} className="ps-btn-outline !px-3 !py-1.5">
                      {topOpen ? 'Close' : 'Top up'} <ChevronDown size={14} className={`transition-transform ${topOpen ? 'rotate-180' : ''}`} />
                    </button>
                  }
                >
                  {topOpen ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {QUICK_TOPS.map((a) => (
                          <button
                            key={a}
                            onClick={() => setTopAmount(a)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border cursor-pointer ${
                              topAmount === a ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600'
                            }`}
                          >
                            {fmtKsh(a)}
                          </button>
                        ))}
                      </div>
                      <input type="number" min={100} value={topAmount} onChange={(e) => setTopAmount(parseInt(e.target.value) || 0)} className="ps-input font-bold" />
                      <div className="flex flex-wrap items-center gap-2">
                        <select value={topChannel} onChange={(e) => setTopChannel(e.target.value)} className="ps-input !w-auto flex-1 !py-2 cursor-pointer">
                          <option value="mpesa">M-Pesa</option>
                          <option value="airtel">Airtel Money</option>
                          <option value="bank">Bank transfer</option>
                        </select>
                        <button onClick={topup} disabled={busy} className="ps-btn !px-4 !py-2 disabled:opacity-50">
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <HandCoins size={14} />} Top up float
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400">Credits your float instantly (demo payment confirmation).</p>
                    </div>
                  ) : (
                    <p className="text-[13px] text-gray-500">
                      Keep enough float to serve customers all day. Top-ups are recorded in your sales ledger.
                    </p>
                  )}
                </SectionCard>

                <SectionCard title="Vend a token">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="ps-label">Customer meter account</label>
                      <input value={vendAccount} onChange={(e) => setVendAccount(e.target.value)} placeholder="e.g. 1234567890" className="ps-input !py-2" />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="ps-label">Amount (KSh)</label>
                      <input type="number" min={50} value={vendAmount} onChange={(e) => setVendAmount(e.target.value)} placeholder="e.g. 200" className="ps-input !py-2" />
                    </div>
                    <div className="sm:col-span-1 flex items-end">
                      <button
                        onClick={vend}
                        disabled={busy || (data?.float_ksh ?? 0) < (parseInt(vendAmount) || 0)}
                        className="w-full ps-btn-gold !py-2 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Sell power
                      </button>
                    </div>
                  </div>
                  {(data?.float_ksh ?? 0) < (parseInt(vendAmount) || 0) && vendAmount && (
                    <p className="mt-2 text-[12px] text-red-600 flex items-center gap-1.5">
                      <AlertTriangle size={13} /> Not enough float — top up first.
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-gray-400">
                    The customer needs a PowerSmart account on that meter. The token is issued on their meter and your
                    float is deducted.
                  </p>
                </SectionCard>

                {lastSale && (
                  <div className="ps-card p-5 bg-emerald-50 border-emerald-100">
                    <p className="text-[13px] font-bold text-emerald-800 flex items-center gap-1.5">
                      <Check size={15} /> Sale complete — {fmtKsh(lastSale.token.amount_ksh)} to {lastSale.customer_name}
                    </p>
                    <p className="mt-1 text-[12px] text-emerald-700">
                      {fmtUnits(lastSale.token.units)} issued · float now {fmtKsh(lastSale.balance_ksh)}. Share the token with your customer:
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <code className="font-mono text-[13px] font-bold text-gray-800 bg-white border border-emerald-200 rounded-lg px-3 py-2 tracking-wider break-all">
                        {(lastSale.token.token_number.match(/.{1,4}/g) || []).join(' ')}
                      </code>
                      <button onClick={() => copyToken(lastSale.token.token_number)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-emerald-200 text-[12px] font-bold text-emerald-700 cursor-pointer">
                        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent sales */}
              <div>
                <SectionCard title="Recent sales">
                  {(data?.recent_sales ?? []).length === 0 ? (
                    <p className="py-5 text-center text-[13px] text-gray-400">No sales yet — vend your first token.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {data?.recent_sales.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/60 border border-gray-100">
                          <span className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 grid place-items-center shrink-0">
                            <Zap size={14} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-gray-800">{fmtKsh(s.amount_ksh)}</p>
                            <p className="text-[11px] text-gray-400 truncate">
                              → {s.customer_account || '—'} · {new Date(s.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                          <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MerchantMode;
