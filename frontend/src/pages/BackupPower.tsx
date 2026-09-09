import React, { useCallback, useEffect, useState } from 'react';
import {
  BatteryCharging,
  Sun,
  Zap,
  Flame,
  PlugZap,
  Battery,
  Plus,
  Check,
  Trash2,
  Loader2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { SectionCard } from './ui';
import { backup, BackupSource, fmtKsh } from '../services/api';

const TYPES: { id: BackupSource['type']; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'solar', label: 'Solar', icon: <Sun size={15} />, hint: 'Solar panel + battery' },
  { id: 'inverter', label: 'Inverter', icon: <Zap size={15} />, hint: 'Inverter + battery bank' },
  { id: 'battery', label: 'Battery', icon: <Battery size={15} />, hint: 'Standalone battery / power station' },
  { id: 'power_station', label: 'Power station', icon: <BatteryCharging size={15} />, hint: 'Portable power station' },
  { id: 'generator', label: 'Generator', icon: <Flame size={15} />, hint: 'Fuel generator' },
];

const fmtDuration = (hours: number) => {
  if (hours >= 24) return `${(hours / 24).toFixed(1)} days`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

export const BackupPower: React.FC = () => {
  const [sources, setSources] = useState<BackupSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<BackupSource['type']>('battery');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('2');
  const [charge, setCharge] = useState('80');
  const [loadKwh, setLoadKwh] = useState('0.4');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSources(await backup.list());
    } catch {
      /* header handles */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const cap = parseFloat(capacity);
    const chg = parseFloat(charge);
    if (!cap || cap <= 0) {
      setFlash('Capacity must be greater than 0.');
      return;
    }
    setBusy(true);
    try {
      await backup.upsert({ type, name: name.trim() || undefined, capacity_kwh: cap, charge_pct: chg });
      setFlash('Backup source saved.');
      setTimeout(() => setFlash(null), 3000);
      setAdding(false);
      await load();
    } catch (e: any) {
      setFlash(e?.message || 'Could not save the backup source.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remove this backup source?')) return;
    setBusy(true);
    try {
      await backup.remove(id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const totalUsable = sources.reduce((s, x) => {
    if (x.type === 'generator') return s;
    return s + (x.capacity_kwh * x.charge_pct) / 100;
  }, 0);
  const runtimeH = totalUsable > 0 && parseFloat(loadKwh) > 0 ? totalUsable / parseFloat(loadKwh) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Backup Power Manager</h1>
          <p className="ps-sub">Know how long you can keep running when the grid goes dark.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={load} className="ps-btn-outline !px-3 !py-2" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setAdding(true)} className="ps-btn">
            <Plus size={14} /> Add source
          </button>
        </div>
      </div>

      {flash && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
          <Check size={16} /> {flash}
        </div>
      )}

      {loading ? (
        <div className="ps-card p-12 text-center text-gray-400 text-sm">Loading backup sources…</div>
      ) : (
        <>
          {/* Overview hero */}
          <div className="ps-card p-6 md:p-8 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 border-navy-800 text-white relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gold-500/10" />
            <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="lg:col-span-1">
                <p className="text-[12px] font-bold uppercase tracking-widest text-gold-400 flex items-center gap-1.5">
                  <BatteryCharging size={15} /> Estimated backup runtime
                </p>
                <p className="mt-2 text-4xl md:text-5xl font-black">
                  {runtimeH > 0 ? fmtDuration(runtimeH) : '—'}
                </p>
                <p className="mt-1 text-[13px] text-slate-300">at a load of {parseFloat(loadKwh) || 0} kW</p>
              </div>
              <div className="lg:col-span-1">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Total usable energy</p>
                <p className="text-2xl font-black mt-1">{totalUsable.toFixed(1)} kWh</p>
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-[11px] text-slate-400 shrink-0">Load</label>
                  <input
                    type="range"
                    min={0.1}
                    max={3}
                    step={0.1}
                    value={loadKwh}
                    onChange={(e) => setLoadKwh(e.target.value)}
                    className="w-full accent-gold-400 cursor-pointer"
                  />
                  <span className="text-[13px] font-bold text-white w-14 text-right">{loadKwh} kW</span>
                </div>
              </div>
              <div className="lg:col-span-1 text-[13px] text-slate-300 leading-relaxed">
                During an outage, keep essentials on: fridge, a few lights, phones and the router. Runtime depends on
                your load — slide it up to see what happens.
              </div>
            </div>
          </div>

          {adding && (
            <div className="ps-card p-5 border-brand-200 bg-brand-50/30">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[15px] font-bold text-gray-800">Add a backup source</p>
                <button onClick={() => setAdding(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer">
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`py-3 rounded-xl border text-center cursor-pointer ${type === t.id ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    <span className="mx-auto mb-1 flex justify-center">{t.icon}</span>
                    <span className="block text-[11px] font-bold">{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="ps-label">Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={TYPES.find((t) => t.id === type)?.hint} className="ps-input" />
                </div>
                <div>
                  <label className="ps-label">Capacity (kWh)</label>
                  <input type="number" min={0.1} step={0.1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="ps-input" />
                </div>
                <div>
                  <label className="ps-label">Charge (%)</label>
                  <input type="number" min={0} max={100} value={charge} onChange={(e) => setCharge(e.target.value)} className="ps-input" />
                </div>
                <div className="flex items-end">
                  <button onClick={save} disabled={busy} className="w-full ps-btn !py-2.5 disabled:opacity-50">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save source
                  </button>
                </div>
              </div>
              {type === 'generator' && (
                <p className="mt-2 text-[11px] text-gray-400">
                  Generators don't store charge — runtime depends on fuel. We show them here for reference.
                </p>
              )}
            </div>
          )}

          {sources.length === 0 ? (
            <div className="ps-card p-10 text-center">
              <PlugZap size={30} className="mx-auto text-gray-200" />
              <p className="mt-3 text-[13px] text-gray-400">
                No backup sources yet. Add your solar, battery or generator to see how long you can stay powered.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {sources.map((s) => {
                const meta = TYPES.find((t) => t.id === s.type);
                const usable = s.type === 'generator' ? 0 : (s.capacity_kwh * s.charge_pct) / 100;
                return (
                  <div key={s.id} className="ps-card p-5">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 grid place-items-center">{meta?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-gray-800">{s.name || meta?.label}</p>
                        <p className="text-[11px] text-gray-400 uppercase">{s.type}</p>
                      </div>
                      <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-black text-gray-900">{s.charge_pct}%</p>
                        <p className="text-[11px] text-gray-400">charge · {s.capacity_kwh} kWh</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-bold text-emerald-600">{usable > 0 ? fmtDuration(usable / 0.4) : '—'}</p>
                        <p className="text-[10px] text-gray-400">at 0.4 kW</p>
                      </div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${s.charge_pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="ps-card p-4 bg-sky-50 border-sky-100 flex items-start gap-2.5">
            <Info size={16} className="text-sky-500 mt-0.5 shrink-0" />
            <p className="text-[12px] text-sky-700 leading-relaxed">
              Keep your backup topped up and know exactly which appliances to run. PowerSmart's blackout risk card (on
              the Outages page) tells you when it's worth charging up beforehand.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default BackupPower;
