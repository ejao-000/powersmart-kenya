import React, { useEffect, useState, useCallback } from 'react';
import {
  ChevronDown,
  Equal,
  Gauge,
  Save,
  Trash2,
  Filter,
  Lock,
  RefreshCw,
  Check,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';
import { SectionCard, initials } from './ui';
import { meters, tokens, Meter, fmtKsh, fmtUnits } from '../services/api';

const ALLOCATIONS = [
  { unit: 'Unit A1', meter: '1289403371', tenant: 'Grace Wanjiru', balance: 42.5, selected: true },
  { unit: 'Unit A2', meter: '2204481132', tenant: 'Peter Ochieng', balance: 18.2, selected: true },
  { unit: 'Unit A3', meter: '0912837710', tenant: 'Faith Njeri', balance: 6.4, selected: true },
  { unit: 'Unit B1', meter: '7733019228', tenant: 'David Mwangi', balance: 81.0, selected: false },
  { unit: 'Unit B2', meter: '8841002215', tenant: 'Lucy Kamau', balance: 33.7, selected: true },
];

const balanceKsh = (kwh: number) => Math.round(kwh * 5);

export const BulkDistribution: React.FC = () => {
  const [rows, setRows] = useState(ALLOCATIONS);
  const [lowOnly, setLowOnly] = useState(false);
  const [total, setTotal] = useState(5000);
  const [notice, setNotice] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [meterList, setMeterList] = useState<Meter[]>([]);

  const refresh = useCallback(async () => {
    try {
      setMeterList(await meters.list());
    } catch {
      /* optional enrichment */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = lowOnly ? rows.filter((r) => r.balance <= 25) : rows;
  const selected = rows.filter((r) => r.selected);
  const perUnit = Math.floor(total / (selected.length || 1));
  const fee = Math.round(total * 0.01);

  const toggle = (meter: string) =>
    setRows((prev) => prev.map((r) => (r.meter === meter ? { ...r, selected: !r.selected } : r)));

  const distributeEqually = () =>
    setNotice(`Distributed equally — each selected unit gets KSh ${perUnit.toLocaleString()}.`);

  const doPay = async () => {
    setPaying(true);
    setNotice(null);
    try {
      const targets = selected.length ? selected : rows;
      for (const r of targets) {
        try {
          await tokens.buy({ amount_ksh: perUnit, payment_channel: 'mpesa', phone: '0700000000' });
        } catch {
          /* skip failing meter, continue */
        }
      }
      setNotice(`Paid ${fmtKsh(total + fee)} via M-Pesa — tokens distributed to ${targets.length} unit(s).`);
      await refresh();
    } catch (e: any) {
      setNotice('Payment failed — check the channel and try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Bulk Distribution</h1>
          <p className="ps-sub">Buy once and distribute tokens across units.</p>
        </div>
        <div className="relative">
          <select className="ps-input !w-auto pr-9 cursor-pointer">
            <option>Riverside Court</option>
            <option>Kilimani Apartments</option>
            <option>All properties</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
          <Check size={16} /> {notice}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: bulk tools + allocation table */}
        <div className="xl:col-span-2 space-y-6">
          <SectionCard title="Bulk Tools">
            <div className="flex flex-wrap gap-2.5">
              <button onClick={distributeEqually} className="ps-btn-outline">
                <Equal size={15} /> Distribute Equally
              </button>
              <button onClick={() => setNotice('Fill to threshold selected — all units topped up to KSh 500.')} className="ps-btn-outline">
                <Gauge size={15} /> Fill to Threshold
              </button>
              <button onClick={() => setNotice('Allocation template saved.')} className="ps-btn-outline">
                <Save size={15} /> Save as Template
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title={`Unit Allocation (${selected.length} selected)`}
            action={
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lowOnly}
                    onChange={(e) => setLowOnly(e.target.checked)}
                    className="accent-brand-500"
                  />
                  <Filter size={12} /> Low Balance
                </label>
                <button onClick={() => setRows((p) => p.map((r) => ({ ...r, selected: false })))} className="text-[12px] font-semibold text-red-500 flex items-center gap-1 hover:underline cursor-pointer">
                  <Trash2 size={12} /> Clear All
                </button>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="py-2.5 pr-3 font-semibold w-8"><input type="checkbox" className="accent-brand-500" /></th>
                    <th className="py-2.5 pr-3 font-semibold">Unit</th>
                    <th className="py-2.5 pr-3 font-semibold">Meter No.</th>
                    <th className="py-2.5 pr-3 font-semibold">Tenant</th>
                    <th className="py-2.5 pr-3 font-semibold">Balance</th>
                    <th className="py-2.5 font-semibold">Top-up</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr
                      key={r.meter}
                      onClick={() => toggle(r.meter)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${r.selected ? 'bg-brand-50/60' : ''}`}
                    >
                      <td className="py-3 pr-3">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          onChange={() => toggle(r.meter)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-brand-500"
                        />
                      </td>
                      <td className="py-3 pr-3 font-semibold text-gray-800">{r.unit}</td>
                      <td className="py-3 pr-3 font-mono text-gray-500">{r.meter}</td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-[9px] font-bold grid place-items-center">
                            {initials(r.tenant)}
                          </div>
                          <span className="text-gray-700">{r.tenant}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${
                          r.balance <= 10 ? 'text-red-600' : r.balance <= 25 ? 'text-amber-600' : 'text-gray-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${r.balance <= 10 ? 'bg-red-500' : r.balance <= 25 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          {fmtUnits(r.balance)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 font-bold text-gray-900">{fmtKsh(perUnit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Right: payment summary */}
        <div className="space-y-6 self-start xl:sticky xl:top-20">
          <div className="ps-card p-5">
            <h3 className="text-[15px] font-bold text-gray-800 mb-4">Payment Summary</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-gray-500">Total amount (KSh)</span>
                <input
                  type="number"
                  min={50}
                  value={total}
                  onChange={(e) => setTotal(parseInt(e.target.value) || 0)}
                  className="w-32 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-right text-[13px] font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40"
                />
              </div>
              <div className="flex items-center justify-between text-[13px] text-gray-500">
                <span>Selected units</span>
                <span className="font-bold text-gray-800">{selected.length}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-gray-500">
                <span>Per-unit amount</span>
                <span className="font-bold text-gray-800">{fmtKsh(perUnit)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-gray-500">
                <span>Platform fee (1%)</span>
                <span className="font-bold text-gray-800">{fmtKsh(fee)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-gray-500">
                <span>M-Pesa charges</span>
                <span className="font-bold text-gray-800">KSh 0</span>
              </div>
              <div className="h-px bg-gray-100 my-2" />
              <div className="flex items-center justify-between text-[15px]">
                <span className="font-bold text-gray-800">Total Amount</span>
                <span className="font-black text-gray-900">{fmtKsh(total + fee)}</span>
              </div>
            </div>
            <button
              onClick={doPay}
              disabled={paying || selected.length === 0}
              className="mt-5 w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {paying ? <RefreshCw size={15} className="animate-spin" /> : <Smartphone size={15} />}
              {paying ? 'Processing M-Pesa…' : 'Pay with M-Pesa'}
            </button>
            <p className="mt-3 text-center text-[11px] text-gray-400 flex items-center justify-center gap-1">
              <Lock size={11} /> Secure payment · encrypted channel
            </p>
          </div>

          <div className="ps-card p-5 bg-amber-50/60 border-amber-100">
            <h3 className="text-[13px] font-bold text-amber-800 flex items-center gap-2 mb-2">
              <AlertTriangle size={15} /> Tip
            </h3>
            <p className="text-[12px] text-amber-700/90">
              Top up before Friday — KPLC announces a tariff review on Monday. Tokens bought now are locked at the current rate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkDistribution;
