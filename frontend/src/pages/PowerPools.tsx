import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Coins,
  Wallet,
  Zap,
  Plus,
  Check,
  Copy,
  X,
  ChevronDown,
  Trash2,
  Mail,
  UserPlus,
  Sparkles,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  TrendingUp,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { SectionCard, initials } from './ui';
import {
  pools,
  meters,
  Meter,
  PowerPoolSummary,
  PowerPoolDetail,
  PoolMember,
  PoolActivity,
  PoolPurchaseResult,
  fmtKsh,
} from '../services/api';

const ROLES: Record<string, { label: string; cls: string }> = {
  owner: { label: 'Owner', cls: 'ps-pill-green' },
  admin: { label: 'Admin', cls: 'ps-pill-amber' },
  member: {
    label: 'Member',
    cls: 'inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full',
  },
};

const AVATAR_COLORS = ['bg-brand-500', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500'];

const colorFor = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

const quickAmounts = [100, 200, 500, 1000];

export const PowerPools: React.FC = () => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [poolsList, setPoolsList] = useState<PowerPoolSummary[]>([]);
  const [detail, setDetail] = useState<PowerPoolDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [myMeters, setMyMeters] = useState<Meter[]>([]);
  const [createName, setCreateName] = useState('');
  const [createMeter, setCreateMeter] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const [contribOpen, setContribOpen] = useState(false);
  const [contribAmount, setContribAmount] = useState(500);
  const [contribChannel, setContribChannel] = useState('mpesa');
  const [purchaseAmount, setPurchaseAmount] = useState(200);

  const [addEmail, setAddEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);
  const [lastToken, setLastToken] = useState<PoolPurchaseResult | null>(null);
  const [copied, setCopied] = useState(false);

  const flashMsg = useCallback((msg: string, ok = true) => {
    setFlash({ msg, ok });
    setTimeout(() => setFlash(null), 3200);
  }, []);

  const refreshList = useCallback(async () => {
    try {
      const list = await pools.list();
      setPoolsList(list);
    } catch (e: any) {
      flashMsg(e?.message || 'Could not load your power pools.', false);
    } finally {
      setLoading(false);
    }
  }, [flashMsg]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const openPool = async (id: string) => {
    setLoading(true);
    try {
      const d = await pools.get(id);
      setDetail(d);
      setLastToken(null);
      setContribOpen(false);
      setView('detail');
    } catch (e: any) {
      flashMsg(e?.message || 'Could not open that pool.', false);
    } finally {
      setLoading(false);
    }
  };

  const goList = () => {
    setView('list');
    setDetail(null);
    refreshList();
  };

  const openCreate = async () => {
    if (myMeters.length === 0) {
      try {
        const list = await meters.list();
        setMyMeters(list);
        if (list[0]) setCreateMeter(list[0].id);
      } catch (e: any) {
        flashMsg(e?.message || 'Could not load your meters.', false);
        return;
      }
    }
    setCreateName('');
    setCreating(true);
    setJoining(false);
  };

  const createPool = async () => {
    if (!createName.trim() || !createMeter) return;
    setBusy(true);
    setBusyLabel('Creating pool…');
    try {
      const created = await pools.create({ meter_id: createMeter, name: createName.trim() });
      setCreating(false);
      await refreshList();
      await openPool(created.id);
      flashMsg('Power pool created — share your invite code with housemates.');
    } catch (e: any) {
      flashMsg(e?.message || 'Could not create the pool.', false);
    } finally {
      setBusy(false);
    }
  };

  const joinPool = async () => {
    if (!joinCode.trim()) return;
    setBusy(true);
    setBusyLabel('Joining pool…');
    try {
      const d = await pools.join({ invite_code: joinCode.trim().toUpperCase() });
      setJoining(false);
      setJoinCode('');
      await refreshList();
      setDetail(d);
      setView('detail');
      flashMsg(`Joined ${d.name}. Welcome aboard!`);
    } catch (e: any) {
      flashMsg(e?.message || 'That invite code did not work.', false);
    } finally {
      setBusy(false);
    }
  };

  const contribute = async () => {
    if (!detail || contribAmount < 20) return;
    setBusy(true);
    setBusyLabel('Adding contribution…');
    try {
      await pools.contribute(detail.id, { amount_ksh: contribAmount, channel: contribChannel });
      const d = await pools.get(detail.id);
      setDetail(d);
      await refreshList();
      flashMsg(`KSh ${contribAmount} added to the pool.`);
    } catch (e: any) {
      flashMsg(e?.message || 'Contribution failed.', false);
    } finally {
      setBusy(false);
    }
  };

  const buyTokens = async () => {
    if (!detail || purchaseAmount < 50) return;
    setBusy(true);
    setBusyLabel('Buying token…');
    try {
      const res = await pools.purchase(detail.id, { amount_ksh: purchaseAmount });
      const d = await pools.get(detail.id);
      setDetail(d);
      setLastToken(res);
      await refreshList();
      flashMsg(`Token of KSh ${purchaseAmount} bought with the pool.`);
    } catch (e: any) {
      flashMsg(e?.message || 'Purchase failed.', false);
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const addMember = async () => {
    if (!detail || !addEmail.trim()) return;
    setBusy(true);
    setBusyLabel('Adding member…');
    try {
      await pools.addMember(detail.id, { email: addEmail.trim() });
      setAddEmail('');
      const d = await pools.get(detail.id);
      setDetail(d);
      await refreshList();
      flashMsg('Member added — they can now contribute to the pool.');
    } catch (e: any) {
      flashMsg(e?.message || 'Could not add that member.', false);
    } finally {
      setBusy(false);
    }
  };

  const patchMember = async (m: PoolMember, patch: { role?: string; can_buy?: boolean }) => {
    if (!detail) return;
    try {
      await pools.updateMember(detail.id, m.id, patch as any);
      const d = await pools.get(detail.id);
      setDetail(d);
      await refreshList();
      flashMsg('Permissions updated.');
    } catch (e: any) {
      flashMsg(e?.message || 'Could not update permissions.', false);
    }
  };

  const removeMember = async (m: PoolMember) => {
    if (!detail) return;
    const self = m.user_id === meId;
    if (!window.confirm(self ? 'Leave this power pool?' : `Remove ${m.name || 'member'} from the pool?`)) return;
    setBusy(true);
    try {
      await pools.removeMember(detail.id, m.id);
      if (self) {
        goList();
        flashMsg('You left the power pool.');
      } else {
        const d = await pools.get(detail.id);
        setDetail(d);
        await refreshList();
        flashMsg('Member removed.');
      }
    } catch (e: any) {
      flashMsg(e?.message || 'Could not remove the member.', false);
    } finally {
      setBusy(false);
    }
  };

  const meId = useCurrentUserId();

  const pool = detail;

  if (loading && view === 'list' && poolsList.length === 0) {
    return <div className="ps-card p-12 text-center text-gray-400 text-sm">Loading your power pools…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {view === 'detail' && pool ? (
          <div>
            <button
              onClick={goList}
              className="flex items-center gap-1 text-[12px] font-bold text-brand-500 hover:underline mb-1 cursor-pointer"
            >
              <ArrowLeft size={13} /> All power pools
            </button>
            <h1 className="ps-heading">{pool.name}</h1>
            <p className="ps-sub">{pool.meter_name}</p>
          </div>
        ) : (
          <div>
            <h1 className="ps-heading">Power Pools</h1>
            <p className="ps-sub">A shared electricity wallet for families, housemates and small groups.</p>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {view === 'list' && (
            <>
              <button onClick={() => { setJoining(true); setCreating(false); }} className="ps-btn-outline !px-3 !py-2">
                <Sparkles size={14} /> Join a pool
              </button>
              <button onClick={openCreate} className="ps-btn-primary !px-3 !py-2">
                <Plus size={14} /> Create a pool
              </button>
            </>
          )}
        </div>
      </div>

      {/* Create / join inline forms */}
      {creating && (
        <div className="ps-card p-5 border-brand-200 bg-brand-50/30">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[15px] font-bold text-gray-800">Create a Power Pool</p>
            <button onClick={() => setCreating(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer">
              <X size={15} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="ps-label">Pool name</label>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Campus House Power Pool"
                className="ps-input"
              />
            </div>
            <div className="md:col-span-1">
              <label className="ps-label">Shared meter</label>
              <div className="relative">
                <select
                  value={createMeter}
                  onChange={(e) => setCreateMeter(e.target.value)}
                  className="appearance-none w-full pl-3 pr-9 py-2.5 rounded-xl bg-white border border-gray-200 text-[13px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                >
                  {myMeters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.meter_number}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="md:col-span-1 flex items-end">
              <button
                onClick={createPool}
                disabled={busy || !createName.trim() || !createMeter}
                className="w-full ps-btn-primary !py-2.5 disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {busy ? busyLabel : 'Create pool'}
              </button>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-gray-500 flex items-center gap-1.5">
            <Info size={13} /> You can create a pool around any meter you own. Members will need your invite code to join.
          </p>
        </div>
      )}

      {joining && (
        <div className="ps-card p-5 border-brand-200 bg-brand-50/30">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[15px] font-bold text-gray-800">Join a Power Pool</p>
            <button onClick={() => setJoining(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer">
              <X size={15} />
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="ps-label">Invite code</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. X7K2M9PQ"
                className="ps-input font-mono font-bold uppercase tracking-widest"
              />
            </div>
            <button
              onClick={joinPool}
              disabled={busy || !joinCode.trim()}
              className="ps-btn-primary !py-2.5 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Join pool
            </button>
          </div>
          <p className="mt-3 text-[12px] text-gray-500 flex items-center gap-1.5">
            <Info size={13} /> Ask the pool owner or an admin for the invite code — anyone with it can join.
          </p>
        </div>
      )}

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

      {view === 'list' ? (
        poolsList.length === 0 ? (
          <div className="ps-card p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-500 grid place-items-center">
              <Users size={24} />
            </div>
            <p className="mt-4 text-[15px] font-bold text-gray-700">No power pools yet</p>
            <p className="mt-1 text-[13px] text-gray-500 max-w-md mx-auto leading-relaxed">
              Pool money with family or housemates, buy tokens together and watch everyone's share — one wallet, one meter.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={openCreate} className="ps-btn-primary">Create a pool</button>
              <button onClick={() => { setJoining(true); setCreating(false); }} className="ps-btn-outline">
                <Sparkles size={14} /> Join with a code
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {poolsList.map((p) => (
              <button
                key={p.id}
                onClick={() => openPool(p.id)}
                className="ps-card p-5 text-left hover:border-brand-200 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-black text-gray-900">{p.name}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">{p.meter_name}</p>
                  </div>
                  <span className={ROLES[p.my_role].cls}>{ROLES[p.my_role].label}</span>
                </div>

                <div className="mt-4 rounded-xl bg-navy-950 text-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 flex items-center gap-1">
                    <Wallet size={12} /> Pool balance
                  </p>
                  <p className="mt-1 text-2xl font-black">{fmtKsh(p.balance_ksh)}</p>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-300">
                    <TrendingUp size={11} className="text-emerald-400" />
                    {fmtKsh(p.contributions_ksh)} in · <Zap size={11} className="text-amber-300" />
                    {fmtKsh(p.spent_ksh)} spent
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {Array.from({ length: Math.min(p.member_count, 4) }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-7 h-7 rounded-full ${colorFor(i)} ring-2 ring-white text-[10px] font-bold text-white grid place-items-center`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                    ))}
                  </div>
                  <span className="text-[12px] text-gray-500">
                    {p.member_count} member{p.member_count === 1 ? '' : 's'}
                  </span>
                  <span className="ml-auto text-[12px] font-bold text-brand-500 group-hover:underline">Open →</span>
                </div>
              </button>
            ))}
          </div>
        )
      ) : pool ? (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Wallet + actions */}
            <div className="xl:col-span-2 space-y-6">
              <div className="ps-card p-6 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 border-navy-800 text-white relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gold-500/10" />
                <div className="relative">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[12px] font-bold uppercase tracking-widest text-gold-400 flex items-center gap-1.5">
                      <Wallet size={14} /> Shared wallet
                    </p>
                    <span className="ps-pill-green">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> {pool.members.length} members
                    </span>
                  </div>
                  <p className="mt-2 text-4xl md:text-5xl font-black tracking-tight">{fmtKsh(pool.balance_ksh)}</p>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-slate-300">
                    <span>
                      Contributed {fmtKsh(pool.contributions_ksh)}
                    </span>
                    <span>·</span>
                    <span>
                      Spent on tokens {fmtKsh(pool.spent_ksh)}
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck size={13} /> Funds buy tokens for {pool.meter_name}.
                  </p>
                </div>
              </div>

              {/* Actions grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard
                  title="Contribute to the pool"
                  action={
                    !contribOpen ? (
                      <button onClick={() => setContribOpen(true)} className="ps-btn-outline !px-3 !py-1.5">
                        <Plus size={14} /> Add money
                      </button>
                    ) : (
                      <button onClick={() => setContribOpen(false)} className="ps-btn-outline !px-3 !py-1.5">
                        <X size={14} /> Close
                      </button>
                    )
                  }
                >
                  {contribOpen ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {quickAmounts.map((a) => (
                          <button
                            key={a}
                            onClick={() => setContribAmount(a)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors cursor-pointer ${
                              contribAmount === a ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600 hover:border-brand-300'
                            }`}
                          >
                            {fmtKsh(a)}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <Wallet size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          min={20}
                          value={contribAmount}
                          onChange={(e) => setContribAmount(parseInt(e.target.value) || 0)}
                          className="ps-input !pl-9 font-bold"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[140px]">
                          <select
                            value={contribChannel}
                            onChange={(e) => setContribChannel(e.target.value)}
                            className="appearance-none w-full pl-3 pr-9 py-2.5 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                          >
                            <option value="mpesa">M-Pesa</option>
                            <option value="airtel">Airtel Money</option>
                            <option value="bank">Bank transfer</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <button onClick={contribute} disabled={busy} className="ps-btn-primary !py-2.5 disabled:opacity-50 flex-1">
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <Coins size={14} />} Contribute
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Records a {contribChannel === 'mpesa' ? 'M-Pesa' : contribChannel === 'airtel' ? 'Airtel Money' : 'bank'} contribution to the shared wallet.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[13px] text-gray-500 leading-relaxed">
                      Everyone chips in — {fmtKsh(pool.balance_ksh)} is in the pot right now.
                    </p>
                  )}
                </SectionCard>

                <SectionCard title="Buy tokens with the pool">
                  {!pool.my_can_buy ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2">
                      <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-[12px] text-amber-700">
                        You don't have permission to buy tokens from this pool. Ask an admin to enable it.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {quickAmounts.map((a) => (
                          <button
                            key={a}
                            onClick={() => setPurchaseAmount(a)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors cursor-pointer ${
                              purchaseAmount === a ? 'bg-gold-500 text-navy-950 border-gold-500' : 'border-gray-200 text-gray-600 hover:border-gold-400'
                            }`}
                          >
                            {fmtKsh(a)}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <Zap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          min={50}
                          value={purchaseAmount}
                          onChange={(e) => setPurchaseAmount(parseInt(e.target.value) || 0)}
                          className="ps-input !pl-9 font-bold"
                        />
                      </div>
                      {purchaseAmount > pool.balance_ksh && (
                        <p className="text-[12px] text-red-600 flex items-center gap-1.5">
                          <AlertTriangle size={13} /> Not enough pool balance — contribute first.
                        </p>
                      )}
                      <button
                        onClick={buyTokens}
                        disabled={busy || purchaseAmount < 50 || purchaseAmount > pool.balance_ksh}
                        className="ps-btn-gold !py-2.5 w-full disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Buy token
                      </button>
                      <p className="text-[11px] text-gray-400">
                        Deducts {fmtKsh(purchaseAmount)} from the pool and issues a token for {pool.meter_name}.
                      </p>
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Last issued token */}
              {lastToken && (
                <div className="ps-card p-5 bg-emerald-50 border-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-bold text-emerald-800 flex items-center gap-1.5">
                      <Check size={15} /> Token issued from the pool
                    </p>
                    <span className="ps-pill-green">KSh {lastToken.token.amount_ksh}</span>
                  </div>
                  <p className="text-[12px] text-emerald-700">
                    {fmtKsh(lastToken.expense.amount_ksh)} deducted — new balance {fmtKsh(lastToken.balance_ksh)}.
                    ~{lastToken.token.units} kWh issued for {pool.meter_name}.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="font-mono text-[13px] font-bold text-gray-800 bg-white border border-emerald-200 rounded-lg px-3 py-2 tracking-wider break-all">
                      {(lastToken.token.token_number.match(/.{1,4}/g) || []).join(' ')}
                    </code>
                    <button
                      onClick={() => copyText(lastToken.token.token_number)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-emerald-200 text-[12px] font-bold text-emerald-700 cursor-pointer"
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-emerald-700/80">
                    Load it on the meter via WiFi/Bluetooth or type it in when the meter asks for it.
                  </p>
                </div>
              )}

              {/* Activity */}
              <SectionCard title="Activity">
                {pool.activity.length === 0 ? (
                  <p className="py-4 text-center text-[13px] text-gray-400">
                    No activity yet — make the first contribution.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {pool.activity.map((a) => (
                      <ActivityRow key={a.kind + a.id} item={a} />
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Right column: about / members */}
            <div className="space-y-6">
              <SectionCard title="Share this pool">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="ps-label">Invite code</label>
                    <div className="font-mono text-[18px] font-black tracking-[0.2em] text-brand-600 bg-brand-50 rounded-xl px-3 py-2 text-center">
                      {pool.invite_code}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => copyText(pool.invite_code)}
                  className="mt-3 w-full ps-btn-outline !py-2"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy invite code'}
                </button>
                <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                  Anyone with a PowerSmart account and this code can join and contribute. Members you don't manage can be removed from the members list.
                </p>
              </SectionCard>

              <SectionCard
                title="Members"
                action={
                  <span className="text-[12px] font-bold text-gray-400">{pool.members.length}</span>
                }
              >
                {pool.my_can_invite && (
                  <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
                      <UserPlus size={12} /> Add by email
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={addEmail}
                          onChange={(e) => setAddEmail(e.target.value)}
                          placeholder="member@email.com"
                          className="ps-input !pl-8 !py-2 text-[12px]"
                        />
                      </div>
                      <button onClick={addMember} disabled={busy} className="ps-btn-primary !px-3 !py-2 disabled:opacity-50">
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {pool.members.map((m) => {
                    const isSelf = m.user_id === meId;
                    const role = ROLES[m.role] || ROLES.member;
                    return (
                      <div key={m.id} className="rounded-xl border border-gray-100 p-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-8 h-8 rounded-full ${colorFor(Math.abs(m.user_id.charCodeAt(0)))} text-white text-[11px] font-bold grid place-items-center`}>
                            {initials(m.name || 'U')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-gray-800 truncate">
                              {m.name} {isSelf && <span className="text-gray-400 font-semibold">(you)</span>}
                            </p>
                            <p className="text-[11px] text-gray-400">Contributed {fmtKsh(m.contributed_ksh || 0)}</p>
                          </div>
                          <span className={role.cls}>{role.label}</span>
                        </div>

                        {pool.my_can_invite && m.role !== 'owner' && (
                          <div className="mt-2.5 pt-2.5 border-t border-gray-50 flex flex-wrap items-center gap-2">
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={m.can_buy}
                                onChange={(e) => patchMember(m, { can_buy: e.target.checked })}
                                className="accent-brand-500"
                              />
                              Can buy
                            </label>
                            <button
                              onClick={() => patchMember(m, { role: m.role === 'admin' ? 'member' : 'admin' })}
                              className="text-[11px] font-bold text-brand-500 hover:underline cursor-pointer"
                            >
                              {m.role === 'admin' ? 'Make member' : 'Make admin'}
                            </button>
                            <button
                              onClick={() => removeMember(m)}
                              className="ml-auto p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                              title={isSelf ? 'Leave pool' : 'Remove member'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!pool.my_can_invite && (
                  <p className="mt-3 text-[11px] text-gray-400">Only the owner and admins can manage members.</p>
                )}
              </SectionCard>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

const ActivityRow: React.FC<{ item: PoolActivity }> = ({ item }) => {
  const isIn = item.kind === 'contribution';
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' });
  };
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/60 border border-gray-100">
      <span
        className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
          isIn ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'
        }`}
      >
        {isIn ? <TrendingUp size={16} /> : <Zap size={16} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-800">
          {item.user_name || 'Someone'} {isIn ? 'contributed' : 'bought a token'}
        </p>
        <p className="text-[11px] text-gray-400">
          {isIn
            ? `via ${(item.channel || 'mpesa').toUpperCase()}`
            : item.token_number
              ? `≈ ${item.token_units ?? ''} kWh issued`
              : 'token purchase'}{' '}
          · {fmtDate(item.created_at)}
        </p>
      </div>
      <span className={`text-[13px] font-black ${isIn ? 'text-emerald-600' : 'text-brand-600'}`}>
        {isIn ? '+' : '−'}
        {fmtKsh(item.amount_ksh)}
      </span>
    </div>
  );
};

// Small helper to read the logged-in user id from session storage.
const useCurrentUserId = () => {
  const [id, setId] = useState('');
  useEffect(() => {
    try {
      const raw = localStorage.getItem('powersmart_user');
      if (raw) setId((JSON.parse(raw).id as string) || '');
    } catch {
      /* ignore */
    }
  }, []);
  return id;
};

export default PowerPools;
