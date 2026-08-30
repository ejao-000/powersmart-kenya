import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  Wifi,
  CreditCard,
  Clock,
  Megaphone,
  ArrowRight,
} from 'lucide-react';
import { PortalLayout, PortalPage, AppNotification } from '../layouts/PortalLayout';
import { ManagementPage } from './ManagementPage';

interface AdminPortalProps {
  userName: string;
  onLogout?: () => void;
}

const card = 'bg-white rounded-2xl border border-slate-200 shadow-sm';

const STATUS_CARDS = [
  { icon: <Wifi size={18} />, label: 'KPLC API Status', value: 'Operational', sub: '99.99% uptime', dot: 'bg-emerald-500' },
  { icon: <CreditCard size={18} />, label: 'M-Pesa Integration', value: 'Stable', sub: '0 pending callbacks', dot: 'bg-emerald-500' },
  { icon: <Clock size={18} />, label: 'Token Latency', value: '1.2s', sub: 'average last 1hr', dot: 'bg-sky-500' },
];

const RETRY_QUEUE = [
  { id: 'PS-9F2A1C', meter: '1289403371', amount: '2,000', status: 'retrying', attempts: 3, next: '3:12 PM', manual: false },
  { id: 'PS-7B4E0D', meter: '2204481132', amount: '1,500', status: 'retrying', attempts: 2, next: '3:18 PM', manual: false },
  { id: 'PS-3D8F2A', meter: '0912837710', amount: '500', status: 'failed', attempts: 5, next: 'Manual', manual: true },
  { id: 'PS-6C1B9E', meter: '7733019228', amount: '3,000', status: 'retrying', attempts: 1, next: '3:26 PM', manual: false },
];

const ANOMALIES = [
  { icon: <AlertTriangle size={15} className="text-red-500" />, title: 'Spiking failures in Nairobi West', time: '2 mins ago', tone: 'border-red-200 bg-red-50' },
  { icon: <AlertTriangle size={15} className="text-amber-500" />, title: 'Multiple accounts using same meter', time: '14 mins ago', tone: 'border-amber-200 bg-amber-50' },
  { icon: <AlertTriangle size={15} className="text-sky-500" />, title: 'Token latency above 1s threshold', time: '38 mins ago', tone: 'border-sky-200 bg-sky-50' },
];

const HEAT_POINTS: [number, number][] = [
  [-1.27, 36.79],
  [-1.28, 36.81],
  [-1.26, 36.8],
  [-1.285, 36.795],
  [-1.275, 36.785],
];

export const AdminPortal: React.FC<AdminPortalProps> = ({ userName, onLogout }) => {
  const [page, setPage] = React.useState<PortalPage>('health');
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInst = useRef<L.Map | null>(null);

  useEffect(() => {
    if (page !== 'health' || !mapRef.current || mapInst.current) return;
    const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView([-1.273, 36.795], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    HEAT_POINTS.forEach(([lat, lng]) => {
      L.circleMarker([lat, lng], { radius: 9, color: '#1E3A5F', weight: 1.5, fillColor: '#ef4444', fillOpacity: 0.55 }).addTo(layer);
    });
    L.marker([-1.273, 36.795])
      .bindPopup('<b>Nairobi West Cluster</b><br/>12 reported outages')
      .addTo(layer);
    mapInst.current = map;
    return () => {
      map.remove();
      mapInst.current = null;
    };
  }, [page]);

  const renderHealth = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left column */}
      <div className="xl:col-span-2 space-y-6">
        {/* Status cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_CARDS.map((s) => (
            <div key={s.label} className={card + ' p-5'}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400">{s.icon}</span>
                <span className={'h-2.5 w-2.5 rounded-full ' + s.dot} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
              <p className="text-xl font-black text-slate-800 mt-1">{s.value}</p>
              <p className="text-[12px] text-slate-500 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Retry Queue */}
        <div className={card + ' p-5'}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-slate-800">Retry Queue</h3>
            <button className="text-[12px] font-semibold text-[#1E3A5F] flex items-center gap-1 hover:underline cursor-pointer">
              View All <ArrowRight size={13} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 pr-3 font-semibold">Transaction ID</th>
                  <th className="py-2.5 pr-3 font-semibold">Meter Number</th>
                  <th className="py-2.5 pr-3 font-semibold">Amount (KES)</th>
                  <th className="py-2.5 pr-3 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold">Next Attempt</th>
                </tr>
              </thead>
              <tbody>
                {RETRY_QUEUE.map((r) => (
                  <tr key={r.id} className={`border-b border-slate-50 ${r.manual ? 'bg-red-50' : ''}`}>
                    <td className={`py-3 pr-3 font-mono text-[12px] ${r.manual ? 'text-red-700 font-bold' : 'text-slate-600'}`}>{r.id}</td>
                    <td className="py-3 pr-3 font-mono text-slate-500">{r.meter}</td>
                    <td className="py-3 pr-3 font-semibold text-slate-700">{r.amount}</td>
                    <td className="py-3 pr-3">
                      {r.manual ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-1 rounded-md">
                          <AlertTriangle size={12} /> Manual Intervention Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md">
                          Retrying ({r.attempts})
                        </span>
                      )}
                    </td>
                    <td className={`py-3 text-[12px] ${r.manual ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>{r.next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-6">
        {/* Outage heatmap */}
        <div className={card + ' p-5'}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-slate-800">Outage Heatmap</h3>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Live</span>
          </div>
          <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-slate-200" style={{ height: 230 }} />
          <p className="text-[12px] text-slate-500 mt-3 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Nairobi West Cluster — 12 reports
          </p>
        </div>

        {/* Real-time anomalies */}
        <div className={card + ' p-5'}>
          <h3 className="text-[15px] font-bold text-slate-800 mb-3">Real-time Anomalies</h3>
          <div className="space-y-2.5">
            {ANOMALIES.map((a) => (
              <div key={a.title} className={`p-3 rounded-xl border ${a.tone}`}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">{a.icon}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800">{a.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{a.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlaceholder = () => (
    <ManagementPage page={page as 'meters' | 'transactions' | 'outages' | 'tariffs'} role="admin" />
  );

  const notifications: AppNotification[] = [
    { id: 'n1', title: 'Manual intervention required — PS-3D8F2A', time: '2 mins ago', tone: 'red' },
    { id: 'n2', title: 'Spiking failures in Nairobi West', time: '6 mins ago', tone: 'red' },
    { id: 'n3', title: 'Token latency above 1s threshold', time: '38 mins ago', tone: 'amber' },
  ];

  return (
    <PortalLayout
      userName={userName}
      roleLabel="System Admin"
      active={page}
      onNavigate={setPage}
      onLogout={onLogout}
      notifications={notifications}
    >
      {page === 'health' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Health Console</h1>
              <p className="text-[13px] text-slate-500 mt-1">Live monitoring and anomaly detection.</p>
            </div>
            <div className="flex items-center gap-2.5">
              <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-bold transition-colors cursor-pointer">
                <AlertTriangle size={15} /> Emergency Maintenance
              </button>
              <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#27496f] text-white text-[13px] font-bold transition-colors cursor-pointer">
                <Megaphone size={15} /> System Broadcast
              </button>
            </div>
          </div>
          {renderHealth()}
        </>
      ) : (
        renderPlaceholder()
      )}
    </PortalLayout>
  );
};

export default AdminPortal;
