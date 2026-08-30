import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  TrendingUp,
  Wallet,
  Plus,
  X,
  RefreshCw,
  LineChart as LineIcon,
  AlertTriangle,
  Check,
  Send,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { PortalLayout, PortalPage } from '../layouts/PortalLayout';
import { meters, tokens, Meter, fmtUnits, getSession } from '../services/api';

interface LandlordPortalProps {
  onLogout?: () => void;
}

const MONTHLY_COST = [
  { m: 'Jan', ksh: 8200 },
  { m: 'Feb', ksh: 9100 },
  { m: 'Mar', ksh: 7800 },
  { m: 'Apr', ksh: 8600 },
  { m: 'May', ksh: 9400 },
  { m: 'Jun', ksh: 8800 },
];

const TENANTS = [
  { name: 'Grace Wanjiru', unit: 'Unit A1', active: true },
  { name: 'Peter Ochieng', unit: 'Unit A2', active: true },
  { name: 'Faith Njeri', unit: 'Unit A3', active: false },
  { name: 'David Mwangi', unit: 'Unit B1', active: true },
];

const INITIALS = (n: string) =>
  n.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U';

const balanceKsh = (m: Meter) => Math.round(m.units_remaining * 5);

export const LandlordPortal: React.FC<LandlordPortalProps> = ({ onLogout }) => {
  const [page, setPage] = useState<PortalPage>('health');
  const [meterList, setMeterList] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addMeterNo, setAddMeterNo] = useState('');
  const [addUnits, setAddUnits] = useState('');
  const [adding, setAdding] = useState(false);

  const [bulkAmount, setBulkAmount] = useState('10000');
  const [bulking, setBulking] = useState(false);

  const user = getSession().user;
  const userName = user?.name || 'Owner';

  const refresh = useCallback(async () => {
    try {
      setMeterList(await meters.list());
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load portfolio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const units = meterList.length;
  const totalUsage = meterList.reduce((a, m) => a + (m.units_remaining || 0), 0);
  const avgBalance = units ? Math.round(meterList.reduce((a, m) => a + balanceKsh(m), 0) / units) : 0;
  const avgUnits = units ? totalUsage / units : 0;
  const avgPct = Math.min((avgUnits / 100) * 100, 100);

  const unitStatus = (m: Meter) => {
    const b = balanceKsh(m);
    if (b <= 150) return { color: 'bg-red-500', label: 'Critical' };
    if (b <= 400) return { color: 'bg-amber-500', label: 'Low' };
    return { color: 'bg-emerald-500', label: 'Healthy' };
  };

  const addUnit = async () => {
    setAdding(true);
    setError(null);
    try {
      await meters.add({
        name: addName.trim(),
        meter_number: addMeterNo.trim(),
        units_remaining: addUnits ? parseFloat(addUnits) : 0,
      });
      setNotice(`Unit "${addName.trim()}" added.`);
      setTimeout(() => setNotice(null), 5000);
      setAddOpen(false);
      setAddName('');
      setAddMeterNo('');
      setAddUnits('');
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Failed to add unit.');
    } finally {
      setAdding(false);
    }
  };

  const doBulkBuy = async () => {
    if (meterList.length === 0) return;
    const total = parseInt(bulkAmount) || 0;
    const per = Math.floor(total / meterList.length);
    if (per < 50) {
      setError('Split amount per unit is below the KSh 50 minimum.');
      return;
    }
    setBulking(true);
    setError(null);
    try {
      for (const m of meterList) {
        await tokens.buy({ amount_ksh: per, payment_channel: 'bank', meter_id: m.id });
      }
      setNotice(`Purchased KSh ${per.toLocaleString()} for each of ${meterList.length} unit(s).`);
      setTimeout(() => setNotice(null), 6000);
      await refresh();
    } catch (e2: any) {
      setError(e2.message || 'Bulk purchase failed.');
    } finally {
      setBulking(false);
    }
  };

  const input =
    'w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F]/40 text-sm';
  const card = 'bg-white rounded-2xl border border-slate-200 shadow-sm';

  return (
    <PortalLayout userName={userName} roleLabel="Landlord" active={page} onNavigate={setPage} onLogout={onLogout}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Portfolio Dashboard</h1>
          <p className="text-[13px] text-slate-500 mt-1">Overview of your properties and tenant usage.</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#27496f] text-white text-[13px] font-bold transition-colors cursor-pointer"
        >
          <Plus size={15} /> Add Unit
        </button>
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
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={card + ' p-5'}>
              <div className="flex items-center gap-2 text-slate-400 mb-2"><Building2 size={17} /></div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total Units</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{units}</p>
              <p className="text-[12px] text-slate-500 mt-0.5">Active across {Math.max(units, 1)} propert{units === 1 ? 'y' : 'ies'}</p>
            </div>
            <div className={card + ' p-5'}>
              <div className="flex items-center justify-between mb-2">
                <TrendingUp size={17} className="text-slate-400" />
                <span className="text-[11px] font-bold text-emerald-600">+4.2% vs last month</span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total Portfolio Usage</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalUsage.toFixed(1)}<span className="text-sm font-bold text-slate-400"> kWh</span></p>
              <p className="text-[12px] text-slate-500 mt-0.5">Across all units</p>
            </div>
            <div className={card + ' p-5'}>
              <div className="flex items-center gap-2 text-slate-400 mb-2"><Wallet size={17} /></div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Average Balance</p>
              <p className="text-2xl font-black text-slate-800 mt-1">KSh {avgBalance.toLocaleString()}</p>
              <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${avgPct}%` }} />
              </div>
            </div>
          </div>

          {/* Unit health grid */}
          <div className={card + ' p-5'}>
            <h3 className="text-[15px] font-bold text-slate-800 mb-4">Unit Health</h3>
            {meterList.length === 0 ? (
              <p className="text-sm text-slate-400">No units yet — add one to start tracking.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {meterList.map((m) => {
                  const st = unitStatus(m);
                  return (
                    <div key={m.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                      <div className="flex items-center justify-between mb-2">
                        <span className={'h-2.5 w-2.5 rounded-full ' + st.color} />
                        <span className="text-[10px] font-bold uppercase text-slate-400">{st.label}</span>
                      </div>
                      <p className="text-[13px] font-bold text-slate-800">{m.name || 'Unnamed unit'}</p>
                      <p className="text-[11px] font-mono text-slate-500">Unit ID: {m.meter_number}</p>
                      <p className="text-[15px] font-black text-[#1E3A5F] mt-1.5">
                        KSh {balanceKsh(m).toLocaleString()}
                        <span className="text-[11px] font-semibold text-slate-400"> · {fmtUnits(m.units_remaining)}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly cost analysis */}
          <div className={card + ' p-5'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-slate-800">Monthly Cost Analysis</h3>
              <button className="text-[12px] font-semibold text-[#1E3A5F] flex items-center gap-1 hover:underline cursor-pointer">
                View Reports
              </button>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MONTHLY_COST} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF4" />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip cursor={{ stroke: '#cbd5e1' }} />
                  <Line type="monotone" dataKey="ksh" stroke="#1E3A5F" strokeWidth={2.5} dot={{ r: 3, fill: '#1E3A5F' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Bulk buy & split */}
          <div className={card + ' p-5'}>
            <h3 className="text-[15px] font-bold text-slate-800 mb-1">Bulk Buy &amp; Split</h3>
            <p className="text-[12px] text-slate-500 mb-4">Buy once, split automatically across units.</p>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Total amount (KSh)</label>
            <input
              type="number"
              min={50}
              className={input}
              value={bulkAmount}
              onChange={(e) => setBulkAmount(e.target.value)}
            />
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[12px] font-semibold text-slate-500 mb-2">Per-unit split</p>
              {meterList.length === 0 ? (
                <p className="text-[12px] text-slate-400">No units to split across.</p>
              ) : (
                meterList.map((m) => {
                  const per = Math.floor((parseInt(bulkAmount) || 0) / meterList.length);
                  return (
                    <div key={m.id} className="flex items-center justify-between py-1.5 text-[13px]">
                      <span className="text-slate-600">{m.name || m.meter_number}</span>
                      <span className="font-bold text-slate-800">KSh {per.toLocaleString()}</span>
                    </div>
                  );
                })
              )}
            </div>
            <button
              onClick={doBulkBuy}
              disabled={bulking || meterList.length === 0}
              className="mt-4 w-full py-3 rounded-xl bg-[#1E3A5F] hover:bg-[#27496f] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {bulking ? <RefreshCw size={15} className="animate-spin" /> : <LineIcon size={15} />}
              {bulking ? 'Purchasing…' : 'Purchase'}
            </button>
          </div>

          {/* Tenant overview */}
          <div className={card + ' p-5'}>
            <h3 className="text-[15px] font-bold text-slate-800 mb-3">Tenant Overview</h3>
            <div className="space-y-2.5">
              {TENANTS.map((t) => (
                <div key={t.unit} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#1E3A5F] text-white text-[12px] font-bold grid place-items-center shrink-0">
                    {INITIALS(t.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 truncate">{t.name}</p>
                    <p className="text-[11px] text-slate-500">{t.unit}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${t.active ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                    {t.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full py-2 rounded-xl text-[13px] font-bold text-[#1E3A5F] hover:bg-slate-50 transition-colors cursor-pointer">
              View All Tenants
            </button>
          </div>
        </div>
      </div>

      {/* Add unit modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800">Add Unit</h3>
              <button onClick={() => setAddOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Unit / property label</label>
                <input className={input} placeholder="e.g. Unit A4 — Studio" value={addName} onChange={(e) => setAddName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Meter number</label>
                  <input className={input} placeholder="Meter no." value={addMeterNo} onChange={(e) => setAddMeterNo(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Current units (kWh)</label>
                  <input className={input} placeholder="e.g. 42" value={addUnits} onChange={(e) => setAddUnits(e.target.value)} />
                </div>
              </div>
              <button
                onClick={addUnit}
                disabled={adding}
                className="w-full py-3 rounded-xl bg-[#1E3A5F] hover:bg-[#27496f] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {adding ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                {adding ? 'Adding…' : 'Add unit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
};

export default LandlordPortal;
