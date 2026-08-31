import React, { useState } from 'react';
import {
  Wallet,
  CalendarDays,
  AlertTriangle,
  Lightbulb,
  Plus,
  Trash2,
  Refrigerator,
  Tv,
  Fan,
  WashingMachine,
  Computer,
  Coffee,
  Flame,
  Lightbulb as BulbIcon,
  Save,
  Check,
} from 'lucide-react';
import { SectionCard } from './ui';
import { fmtKsh } from '../services/api';

interface Appliance {
  id: string;
  name: string;
  icon: React.ReactNode;
  watts: number;
  hours: number;
}

const APPLIANCE_ICONS: Record<string, React.ReactNode> = {
  Refrigerator: <Refrigerator size={16} />,
  'Flat-screen TV': <Tv size={16} />,
  'Ceiling Fan': <Fan size={16} />,
  'Washing Machine': <WashingMachine size={16} />,
  Laptop: <Computer size={16} />,
  'Coffee Maker': <Coffee size={16} />,
  Cooker: <Flame size={16} />,
  Lights: <BulbIcon size={16} />,
};

const RATE = 15.18; // KSh / kWh

const INITIAL_APPLIANCES: Appliance[] = [
  { id: 'a1', name: 'Refrigerator', icon: APPLIANCE_ICONS['Refrigerator'], watts: 150, hours: 24 },
  { id: 'a2', name: 'Flat-screen TV', icon: APPLIANCE_ICONS['Flat-screen TV'], watts: 120, hours: 6 },
  { id: 'a3', name: 'Ceiling Fan', icon: APPLIANCE_ICONS['Ceiling Fan'], watts: 75, hours: 8 },
  { id: 'a4', name: 'Lights', icon: APPLIANCE_ICONS['Lights'], watts: 60, hours: 5 },
];

const dailyCost = (a: Appliance) => (a.watts * a.hours) / 1000 * RATE;

export const EnergyBudget: React.FC = () => {
  const [budget, setBudget] = useState(2000);
  const [appliances, setAppliances] = useState<Appliance[]>(INITIAL_APPLIANCES);
  const [saved, setSaved] = useState(false);

  const monthlyCost = appliances.reduce((a, b) => a + dailyCost(b) * 30, 0);
  const projected = monthlyCost;
  const overrun = projected - budget;
  const budgetPct = Math.min((projected / budget) * 100, 100);

  const setField = (id: string, field: 'watts' | 'hours', value: number) =>
    setAppliances((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));

  const addAppliance = () => {
    const names = Object.keys(APPLIANCE_ICONS);
    const name = names[appliances.length % names.length];
    setAppliances((prev) => [
      ...prev,
      { id: 'a' + Date.now(), name, icon: APPLIANCE_ICONS[name], watts: 100, hours: 4 },
    ]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ps-heading">Energy Budget</h1>
        <p className="ps-sub">Set a monthly budget and see how your appliances compare.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: budget + AI insight */}
        <div className="xl:col-span-1 space-y-6">
          <SectionCard title="Monthly Budget">
            <label className="ps-label">Budget (KSh / month)</label>
            <div className="relative mb-4">
              <Wallet size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                min={100}
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value) || 0)}
                className="ps-input !pl-9 font-bold"
              />
            </div>

            <p className="text-3xl font-black text-gray-900">{fmtKsh(projected)}</p>
            <p className="text-[12px] text-gray-500 mt-1 flex items-center gap-1">
              <CalendarDays size={13} /> Projected spend for this month
            </p>

            <div className="mt-4 h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${overrun > 0 ? 'bg-red-500' : 'bg-brand-500'}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <p className="text-[12px] text-gray-500 mt-2">
              {overrun > 0
                ? `${budgetPct.toFixed(0)}% of budget used — projected overrun ${fmtKsh(overrun)}`
                : `${budgetPct.toFixed(0)}% of budget used — ${fmtKsh(Math.abs(overrun))} to spare`}
            </p>

            {overrun > 0 && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-red-700">Projected Overrun</p>
                  <p className="text-[12px] text-red-600/90">
                    You're set to exceed your budget by {fmtKsh(overrun)}. Consider lowering the TV &amp; fan hours.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>

          <div className="ps-card p-5 bg-sky-50 border-sky-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 grid place-items-center">
                <Lightbulb size={18} />
              </span>
              <p className="text-[14px] font-bold text-sky-800">Volt AI Insight</p>
            </div>
            <p className="text-[13px] text-sky-800/90 leading-relaxed">
              Moving the washing machine to off-peak hours (9pm–6am) could save you
              <span className="font-bold"> KSh 310/month</span> on the time-of-use tariff.
            </p>
            <button className="mt-3 text-[12px] font-bold text-sky-600 hover:underline cursor-pointer">
              Apply automation rule →
            </button>
          </div>
        </div>

        {/* Right: appliance calculator */}
        <div className="xl:col-span-2">
          <SectionCard
            title="Appliance Calculator"
            action={
              <button onClick={addAppliance} className="ps-btn-outline !px-3 !py-1.5">
                <Plus size={14} /> Add Appliance
              </button>
            }
          >
            {overrun > 0 && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-[13px] text-red-700">
                  <span className="font-bold">Warning:</span> projected appliance cost exceeds your monthly budget by {fmtKsh(overrun)}.
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="py-2.5 pr-3 font-semibold">Appliance</th>
                    <th className="py-2.5 pr-3 font-semibold">Power (W)</th>
                    <th className="py-2.5 pr-3 font-semibold">Daily Hrs</th>
                    <th className="py-2.5 pr-3 font-semibold">Daily Cost</th>
                    <th className="py-2.5 pr-3 font-semibold">Monthly Cost</th>
                    <th className="py-2.5 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {appliances.map((a) => {
                    const dc = dailyCost(a);
                    return (
                      <tr key={a.id} className="border-b border-gray-50">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 grid place-items-center">{a.icon}</span>
                            <span className="font-semibold text-gray-800">{a.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            type="number"
                            min={0}
                            value={a.watts}
                            onChange={(e) => setField(a.id, 'watts', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[13px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40"
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            type="number"
                            min={0}
                            max={24}
                            value={a.hours}
                            onChange={(e) => setField(a.id, 'hours', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[13px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40"
                          />
                        </td>
                        <td className="py-3 pr-3 text-gray-600">{fmtKsh(dc)}</td>
                        <td className="py-3 pr-3 font-bold text-gray-800">{fmtKsh(dc * 30)}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => setAppliances((p) => p.filter((x) => x.id !== a.id))}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-100">
                    <td colSpan={4} className="py-3 font-bold text-gray-800">Total</td>
                    <td className="py-3 font-black text-brand-600">{fmtKsh(monthlyCost)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-[12px] text-gray-400">
                Estimated at KSh {RATE}/kWh (domestic tariff, excl. VAT &amp; levies).
              </p>
              <button
                onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
                className="ps-btn-outline !px-3 !py-1.5"
              >
                {saved ? <><Check /> Saved</> : <><Save size={14} /> Save</>}
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default EnergyBudget;
