import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Coins,
  RefreshCw,
  AlertTriangle,
  Server,
  Activity,
} from 'lucide-react';
import { SectionCard } from './ui';
import { outages, Outage, fmtDateTime } from '../services/api';

const TARIFFS = [
  { band: 'Lifeline', range: '0 – 50 kWh / month', rate: 'KSh 2.50 / kWh', note: 'Protected rate for small users' },
  { band: 'Domestic', range: '51 – 1500 kWh / month', rate: 'KSh 15.18 / kWh', note: 'Standard home tariff' },
  { band: 'Commercial', range: 'Any usage (business)', rate: 'KSh 15.60 / kWh', note: 'Business / SME tariff' },
  { band: 'Service charge', range: 'Per connection', rate: 'KSh 150 / month', note: 'Applied monthly' },
];

const STATUS = {
  reported: { label: 'Reported', cls: 'text-red-600 bg-red-50', dot: 'bg-red-500' },
  confirmed: { label: 'Confirmed', cls: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' },
  resolved: { label: 'Resolved', cls: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
};

const SERVICES = [
  { name: 'Payments API', value: 'Operational', cls: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
  { name: 'Token Service', value: 'Degraded', cls: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' },
  { name: 'M-Pesa Callbacks', value: 'Operational', cls: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
  { name: 'SMS Notifications', value: 'Operational', cls: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
];

export const SystemHealth: React.FC = () => {
  const [outageList, setOutageList] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setOutageList(await outages.list());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);

  const counts = (s: Outage['status']) => outageList.filter((o) => o.status === s).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">System Health</h1>
          <p className="ps-sub">Service status, outage reports and current tariffs.</p>
        </div>
        <button onClick={refresh} className="ps-btn-outline">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Service status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {SERVICES.map((s) => (
          <div key={s.name} className="ps-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Server size={16} className="text-brand-500" />
              <p className="text-[12px] font-semibold text-gray-600">{s.name}</p>
            </div>
            <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${s.cls}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot} mr-1`} /> {s.value}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Outage reports */}
        <div className="xl:col-span-2 space-y-6">
          <SectionCard
            title={`Community Outage Reports (${outageList.length})`}
            action={<span className="flex items-center gap-1 text-[11px] font-bold text-brand-500"><Activity size={12} /> Real-time</span>}
          >
            {outageList.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No outage reports right now.</p>
            ) : (
              <div className="space-y-2.5">
                {outageList.map((o) => {
                  const st = STATUS[o.status] || STATUS.reported;
                  return (
                    <div key={o.id} className="p-3.5 rounded-xl border border-gray-100 flex items-start gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${st.dot}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[14px] font-bold text-gray-800">{o.area}</p>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${st.cls}`}>{st.label}</span>
                        </div>
                        <p className="text-[12px] text-gray-500 mt-0.5">{o.description || 'No extra details'}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{fmtDateTime(o.created_at)} · {o.reporter_name || 'a user'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="KPLC Tariffs" action={<span className="ps-pill-amber">EPRA-approved</span>}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="py-2.5 pr-3 font-semibold">Band</th>
                    <th className="py-2.5 pr-3 font-semibold">Range</th>
                    <th className="py-2.5 pr-3 font-semibold">Rate</th>
                    <th className="py-2.5 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {TARIFFS.map((t) => (
                    <tr key={t.band} className="border-b border-gray-50">
                      <td className="py-3 pr-3 font-bold text-gray-800">{t.band}</td>
                      <td className="py-3 pr-3 text-gray-500">{t.range}</td>
                      <td className="py-3 pr-3 font-mono font-bold text-brand-500">{t.rate}</td>
                      <td className="py-3 text-gray-500">{t.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[12px] text-gray-400">
              Plus VAT (16%), ERC levy, fuel energy charge, forex &amp; inflation adjusters applied on your statement.
            </p>
          </SectionCard>
        </div>

        {/* Right: by status + tip */}
        <div className="space-y-6">
          <div className="ps-card p-5 self-start">
            <h3 className="text-[15px] font-bold text-gray-800 mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-brand-500" /> By status
            </h3>
            {(['reported', 'confirmed', 'resolved'] as Outage['status'][]).map((s) => {
              const st = STATUS[s];
              return (
                <div key={s} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                  <span className="flex items-center gap-2 text-[13px] text-gray-600">
                    <span className={`h-2 w-2 rounded-full ${st.dot}`} /> {st.label}
                  </span>
                  <span className="font-bold text-gray-800">{counts(s)}</span>
                </div>
              );
            })}
          </div>

          <div className="ps-card p-5 bg-amber-50/60 border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={15} className="text-amber-600" />
              <p className="text-[13px] font-bold text-amber-800">Token Service Degraded</p>
            </div>
            <p className="text-[12px] text-amber-700/90">
              Token latency has been above 1s for the last 38 minutes. Automatic retry is engaged — no tokens lost.
            </p>
          </div>

          <div className="ps-card p-5">
            <h3 className="text-[15px] font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Coins size={16} className="text-brand-500" /> Smart tip
            </h3>
            <p className="text-[13px] text-gray-600 leading-relaxed">
              When KPLC announces a tariff change, buy tokens <span className="font-bold">before</span> the effective date — prepaid tokens purchased now are priced at the current rate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
