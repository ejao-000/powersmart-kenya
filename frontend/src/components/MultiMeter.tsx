import React, { useState } from 'react';
import { Building2, Plus, RefreshCw, Save, Gauge, Zap } from 'lucide-react';
import { meters, Meter, fmtUnits, fmtKsh } from '../services/api';

interface MultiMeterProps {
  metersList: Meter[];
  onRefresh: () => Promise<void>;
}

export const MultiMeter: React.FC<MultiMeterProps> = ({ metersList, onRefresh }) => {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [units, setUnits] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [settings, setSettings] = useState<Record<string, { auto_topup: boolean; topup_threshold: string; topup_amount_ksh: string }>>({});

  const getSettings = (m: Meter) =>
    settings[m.id] || {
      auto_topup: m.auto_topup,
      topup_threshold: String(m.topup_threshold),
      topup_amount_ksh: String(m.topup_amount_ksh),
    };

  const addMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !meterNumber.trim()) {
      setError('Enter both a label and the meter number.');
      return;
    }
    setError(null);
    setBusy('add');
    try {
      await meters.add({
        name: name.trim(),
        meter_number: meterNumber.trim(),
        units_remaining: units ? parseFloat(units) : 0,
      });
      setNotice(`Meter "${name.trim()}" added.`);
      setTimeout(() => setNotice(null), 5000);
      setName('');
      setMeterNumber('');
      setUnits('');
      await onRefresh();
    } catch (e2: any) {
      setError(e2.message || 'Failed to add meter.');
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = async (id: string) => {
    const s = getSettings(metersList.find((m) => m.id === id)!);
    setBusy(id);
    setError(null);
    try {
      await meters.settings(id, {
        auto_topup: s.auto_topup,
        topup_threshold: parseFloat(s.topup_threshold) || 5,
        topup_amount_ksh: parseInt(s.topup_amount_ksh) || 200,
      });
      setNotice('Auto top-up settings saved.');
      setTimeout(() => setNotice(null), 4000);
      await onRefresh();
    } catch (e2: any) {
      setError(e2.message || 'Failed to save settings.');
    } finally {
      setBusy(null);
    }
  };

  const input =
    'w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-sm';

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Building2 className="text-cyan-400" size={20} />
          <h3 className="text-base font-bold text-slate-100 font-mono">My Meters</h3>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-400">
          {metersList.length} unit{metersList.length === 1 ? '' : 's'}
        </span>
      </div>

      {notice && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {metersList.map((m) => {
          const s = getSettings(m);
          return (
            <div key={m.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <Gauge size={17} className="text-cyan-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-100">{m.name || 'Unnamed unit'}</p>
                    <p className="text-[11px] font-mono text-slate-500">Meter #{m.meter_number}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold text-amber-400">{fmtUnits(m.units_remaining)}</p>
                  <p className="text-[10px] text-slate-500">remaining</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Auto top-up</label>
                  <button
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        [m.id]: { ...s, auto_topup: !s.auto_topup },
                      }))
                    }
                    className={`w-full py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      s.auto_topup
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {s.auto_topup ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Top-up amount</label>
                  <input
                    type="number"
                    min={50}
                    value={s.topup_amount_ksh}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        [m.id]: { ...s, topup_amount_ksh: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Trigger when below (kWh)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={s.topup_threshold}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      [m.id]: { ...s, topup_threshold: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <button
                onClick={() => saveSettings(m.id)}
                disabled={busy === m.id}
                className="w-full py-2 rounded-lg bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {busy === m.id ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                Save auto top-up (KSh {s.topup_amount_ksh} below {s.topup_threshold} kWh)
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setAdding((v) => !v)}
        className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-400 border border-slate-700 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <Plus size={15} /> {adding ? 'Cancel' : 'Add another meter'}
      </button>

      {adding && (
        <form onSubmit={addMeter} className="mt-3 space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Unit label</label>
            <input className={input} placeholder="e.g. Unit 2 — Dorm, Kid's room" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Meter number</label>
              <input className={input} placeholder="e.g. 9990000002" value={meterNumber} onChange={(e) => setMeterNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Current units (kWh)</label>
              <input className={input} placeholder="e.g. 120.5" value={units} onChange={(e) => setUnits(e.target.value)} />
            </div>
          </div>
          <button
            type="submit"
            disabled={busy === 'add'}
            className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {busy === 'add' ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            Add meter
          </button>
        </form>
      )}
    </div>
  );
};

export default MultiMeter;
