import React, { useState } from 'react';
import { Calculator, Flame, Zap, X, ChevronDown, ChevronUp, Plus } from 'lucide-react';

interface Appliance {
  id: string;
  name: string;
  watts: number;
  group: 'low' | 'high';
  hoursPerDay: number;
}

// Curated catalogue of common household appliances. High-power appliances
// (microwave, kettle, geyser, etc.) are flagged so heavy users stand out.
const CATALOG: Appliance[] = [
  // ── Little power ───────────────────────────────────────────────
  { id: 'led', name: 'LED Bulb', watts: 10, group: 'low', hoursPerDay: 6 },
  { id: 'charger', name: 'Phone Charger', watts: 15, group: 'low', hoursPerDay: 4 },
  { id: 'router', name: 'WiFi Router', watts: 10, group: 'low', hoursPerDay: 24 },
  { id: 'laptop', name: 'Laptop', watts: 60, group: 'low', hoursPerDay: 6 },
  { id: 'tv', name: 'Smart TV', watts: 120, group: 'low', hoursPerDay: 6 },
  { id: 'radio', name: 'Radio / Speaker', watts: 30, group: 'low', hoursPerDay: 4 },
  { id: 'fridge', name: 'Fridge / Freezer', watts: 150, group: 'low', hoursPerDay: 24 },
  { id: 'fan', name: 'Ceiling / Standing Fan', watts: 60, group: 'low', hoursPerDay: 6 },
  // ── High power ─────────────────────────────────────────────────
  { id: 'kettle', name: 'Electric Kettle', watts: 2000, group: 'high', hoursPerDay: 0.3 },
  { id: 'microwave', name: 'Microwave Oven', watts: 1200, group: 'high', hoursPerDay: 0.4 },
  { id: 'iron', name: 'Electric Iron Box', watts: 1000, group: 'high', hoursPerDay: 0.5 },
  { id: 'geyser', name: 'Water Heater / Geyser', watts: 2000, group: 'high', hoursPerDay: 1 },
  { id: 'ac', name: 'Air Conditioner', watts: 1500, group: 'high', hoursPerDay: 3 },
  { id: 'washer', name: 'Washing Machine', watts: 900, group: 'high', hoursPerDay: 0.5 },
  { id: 'hotplate', name: 'Hotplate / Electric Cooker', watts: 1500, group: 'high', hoursPerDay: 1 },
  { id: 'fryer', name: 'Deep Fryer', watts: 1200, group: 'high', hoursPerDay: 0.3 },
];

const LOW_PREVIEW_LIMIT = 4;

export const ApplianceSliders: React.FC = () => {
  const [appliances, setAppliances] = useState<Appliance[]>([
    { id: 'fridge', name: 'Fridge / Freezer', watts: 150, group: 'low', hoursPerDay: 24 },
    { id: 'tv', name: 'Smart TV', watts: 120, group: 'low', hoursPerDay: 6 },
    { id: 'iron', name: 'Electric Iron Box', watts: 1000, group: 'high', hoursPerDay: 0.5 },
  ]);
  const [pick, setPick] = useState('');
  const [showAllLow, setShowAllLow] = useState(false);

  const costPerKwh = 24.5; // Approximate blended KPLC tariff including levies & VAT (KES)

  const addAppliance = (id: string) => {
    const cat = CATALOG.find((c) => c.id === id);
    if (!cat) return;
    setAppliances((prev) =>
      prev.some((a) => a.id === cat.id) ? prev : [...prev, { ...cat }]
    );
  };

  const removeAppliance = (id: string) => {
    setAppliances((prev) => prev.filter((a) => a.id !== id));
  };

  const updateHours = (id: string, hours: number) => {
    setAppliances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, hoursPerDay: hours } : a))
    );
  };

  const totalDailyKwh = appliances.reduce(
    (acc, curr) => acc + (curr.watts * curr.hoursPerDay) / 1000,
    0
  );
  const totalDailyCost = totalDailyKwh * costPerKwh;

  const high = appliances.filter((a) => a.group === 'high');
  const low = appliances.filter((a) => a.group === 'low');
  const shownLow = showAllLow ? low : low.slice(0, LOW_PREVIEW_LIMIT);
  const hiddenLow = low.length - shownLow.length;

  const renderAppliance = (app: Appliance) => {
    const dailyKwh = (app.watts * app.hoursPerDay) / 1000;
    const dailyCost = dailyKwh * costPerKwh;
    const percentage = totalDailyCost > 0 ? (dailyCost / totalDailyCost) * 100 : 0;
    const isHigh = app.group === 'high';

    return (
      <div
        key={app.id}
        className={`p-3.5 rounded-xl border ${
          isHigh
            ? 'bg-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-500/5'
            : 'bg-slate-950/60 border-slate-800/60'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {isHigh ? (
              <Flame size={18} className="text-rose-400 shrink-0" />
            ) : (
              <Zap size={18} className="text-cyan-400 shrink-0" />
            )}
            <span className="text-sm font-medium text-slate-200 truncate">{app.name}</span>
            <span className="text-xs text-slate-400 font-mono">({app.watts}W)</span>
            {isHigh && (
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-400 shrink-0">
                High power
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-slate-300">KSh {dailyCost.toFixed(1)}/day</span>
            <button
              onClick={() => removeAppliance(app.id)}
              className="p-1 rounded-md bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
              title="Remove appliance"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="24"
            step="0.5"
            value={app.hoursPerDay}
            onChange={(e) => updateHours(app.id, parseFloat(e.target.value))}
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono text-cyan-400 w-16 text-right">{app.hoursPerDay} hrs</span>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>{percentage.toFixed(0)}% of daily budget</span>
          <span className="text-slate-500">{dailyKwh.toFixed(2)} kWh</span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calculator className="text-cyan-400" size={20} />
          <h3 className="text-base font-bold text-slate-100 font-mono">Appliance Cost Estimator</h3>
        </div>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-md">
          Est. KSh {totalDailyCost.toFixed(1)} / day
        </span>
      </div>

      {/* Add-appliance selector */}
      <div className="relative mb-5">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <Plus size={16} />
        </div>
        <select
          value={pick}
          onChange={(e) => {
            setPick(e.target.value);
            if (e.target.value) addAppliance(e.target.value);
            setPick('');
          }}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all appearance-none cursor-pointer"
        >
          <option value="" disabled>
            Add an appliance…
          </option>
          <optgroup label="⚡ Low power · little usage">
            {CATALOG.filter((c) => c.group === 'low').map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.watts}W
              </option>
            ))}
          </optgroup>
          <optgroup label="🔥 High power · heavy usage">
            {CATALOG.filter((c) => c.group === 'high').map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.watts}W
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="space-y-4">
        {high.length > 0 && (
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
              <Flame size={13} /> High power appliances
            </p>
            <div className="space-y-4">{high.map(renderAppliance)}</div>
          </div>
        )}

        {low.length > 0 && (
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Zap size={13} /> Low power appliances
            </p>
            <div className="space-y-4">{shownLow.map(renderAppliance)}</div>

            {hiddenLow > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowAllLow((v) => !v)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-400 text-xs font-bold transition-all cursor-pointer"
                >
                  {showAllLow ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showAllLow ? 'Hide' : `Others (${hiddenLow} more)`}
                </button>
                {showAllLow && (
                  <div className="space-y-4 mt-3">
                    {low.slice(LOW_PREVIEW_LIMIT).map(renderAppliance)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {appliances.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-6">
            No appliances added yet — pick some above to estimate your daily power cost.
          </p>
        )}
      </div>
    </div>
  );
};

export default ApplianceSliders;
