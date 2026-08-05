import React, { useState } from 'react';
import { Calculator, Flame, Tv, Refrigerator, Zap } from 'lucide-react';

interface Appliance {
  id: string;
  name: string;
  powerWatts: number;
  icon: React.ReactNode;
  hoursPerDay: number;
}

export const ApplianceSliders: React.FC = () => {
  const [appliances, setAppliances] = useState<Appliance[]>([
    { id: '1', name: 'Fridge / Freezer', powerWatts: 150, icon: <Refrigerator size={18} className="text-cyan-400" />, hoursPerDay: 24 },
    { id: '2', name: 'Smart TV & Console', powerWatts: 120, icon: <Tv size={18} className="text-cyan-400" />, hoursPerDay: 6 },
    { id: '3', name: 'Electric Iron Box', powerWatts: 1000, icon: <Flame size={18} className="text-amber-400" />, hoursPerDay: 0.5 },
  ]);

  const costPerKwh = 24.50; // Approximate blended KPLC tariff including levies & VAT (KES)

  const updateHours = (id: string, hours: number) => {
    setAppliances(prev => prev.map(app => app.id === id ? { ...app, hoursPerDay: hours } : app));
  };

  const totalDailyKwh = appliances.reduce((acc, curr) => acc + (curr.powerWatts * curr.hoursPerDay) / 1000, 0);
  const totalDailyCost = totalDailyKwh * costPerKwh;

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

      <div className="space-y-4">
        {appliances.map(app => {
          const dailyKwh = (app.powerWatts * app.hoursPerDay) / 1000;
          const dailyCost = dailyKwh * costPerKwh;
          const percentage = totalDailyCost > 0 ? (dailyCost / totalDailyCost) * 100 : 0;

          return (
            <div key={app.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  {app.icon}
                  <span className="text-sm font-medium text-slate-200">{app.name}</span>
                  <span className="text-xs text-slate-400 font-mono">({app.powerWatts}W)</span>
                </div>
                <span className="text-xs font-mono text-slate-300">KSh {dailyCost.toFixed(1)}/day</span>
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

              {/* Impact badge */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>{percentage.toFixed(0)}% of daily budget</span>
                <span className="text-slate-500">{(dailyKwh).toFixed(2)} kWh</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};