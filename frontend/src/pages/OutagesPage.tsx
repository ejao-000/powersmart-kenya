import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ZapOff,
  Send,
  MapPin,
  AlertTriangle,
  Check,
  MessageSquare,
  Calendar,
  Info,
} from 'lucide-react';
import { SectionCard } from './ui';
import { outages, Outage, fmtDateTime } from '../services/api';

const MAINTENANCE = [
  { area: 'Westlands Substation', date: 'Tue 3 Sep', time: '22:00 – 05:00' },
  { area: 'Kilimani Feeder', date: 'Thu 5 Sep', time: '09:00 – 12:00' },
  { area: 'Riverside Drive', date: 'Sat 7 Sep', time: '08:00 – 16:00' },
];

const REPORT_HISTORY = [
  { area: 'Riverside Drive, Westlands', status: 'confirmed' as const, time: '2 days ago' },
  { area: 'Muthangari Rd', status: 'resolved' as const, time: '1 week ago' },
];

export const OutagesPage: React.FC = () => {
  const [outageList, setOutageList] = useState<Outage[]>([]);
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [sms, setSms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInst = useRef<L.Map | null>(null);

  useEffect(() => {
    outages.list().then(setOutageList).catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView([-1.273, 36.795], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    [[-1.27, 36.79], [-1.285, 36.795], [-1.26, 36.81]].forEach(([lat, lng]) => {
      L.circleMarker([lat, lng], { radius: 9, color: '#0F5132', weight: 1.5, fillColor: '#ef4444', fillOpacity: 0.6 }).addTo(layer);
    });
    [[-1.275, 36.8], [-1.265, 36.8]].forEach(([lat, lng]) => {
      L.circleMarker([lat, lng], { radius: 7, color: '#0F5132', weight: 1.5, fillColor: '#f59e0b', fillOpacity: 0.6 }).addTo(layer);
    });
    mapInst.current = map;
    return () => {
      map.remove();
      mapInst.current = null;
    };
  }, []);

  const submit = async () => {
    if (!area) {
      setNotice('Please tell us your area / location.');
      return;
    }
    setSubmitting(true);
    try {
      await outages.report({
        area,
        latitude: -1.273,
        longitude: 36.795,
        description: description || 'Power outage',
      });
      setNotice(`Report submitted${sms ? ' — SMS notifications enabled' : ''}. Utilities have been notified.`);
      setTimeout(() => setNotice(null), 5000);
      setArea('');
      setDescription('');
      const list = await outages.list();
      setOutageList(list);
    } catch (e: any) {
      setNotice(e.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ps-heading">System Health &amp; Outages</h1>
        <p className="ps-sub">Check outages near you and report a loss of power.</p>
      </div>

      {notice && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
          <Check size={16} /> {notice}
        </div>
      )}

      {/* Area outage banner */}
      <div className="ps-card p-5 bg-red-50 border-red-100">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-red-500 text-white grid place-items-center shrink-0 animate-pulse">
            <ZapOff size={20} />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-bold text-red-700">Area Outage Detected</p>
            <p className="text-[12px] text-red-600/90 mt-0.5">
              14 neighbours reported an outage in Nairobi West within the last hour.
            </p>
          </div>
          <span className="ps-pill-red hidden md:inline-flex">Reported</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: recent reports + report form */}
        <div className="xl:col-span-2 space-y-6">
          <SectionCard title="Your Recent Reports" action={<span className="text-[11px] font-semibold text-gray-400">{outageList.length} total</span>}>
            {outageList.length === 0 && REPORT_HISTORY.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No reports yet.</p>
            ) : (
              <div className="space-y-2.5">
                {outageList.map((o) => (
                  <div key={o.id} className="p-3.5 rounded-xl border border-gray-100 flex items-start gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                      o.status === 'resolved' ? 'bg-emerald-500' : o.status === 'confirmed' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-gray-800">{o.area}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{o.description} · {fmtDateTime(o.created_at)}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                      o.status === 'resolved' ? 'text-emerald-600 bg-emerald-50' : o.status === 'confirmed' ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
                    }`}>
                      {o.status}
                    </span>
                  </div>
                ))}
                {outageList.length === 0 &&
                  REPORT_HISTORY.map((r, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-gray-100 flex items-start gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${r.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-gray-800">{r.area}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{r.time}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${r.status === 'resolved' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Report an Outage" action={<span className="ps-pill-amber"><Info size={12} /> Help us map it</span>}>
            <button
              onClick={() => { setArea('My current location'); }}
              className="w-full py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[15px] font-black flex items-center justify-center gap-2 shadow-md shadow-red-500/20 transition-colors cursor-pointer"
            >
              <ZapOff size={18} /> I HAVE NO POWER
            </button>
            <div className="mt-4 space-y-3">
              <div>
                <label className="ps-label">What happened?</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. A crack sound then everything went dark…"
                  rows={3}
                  className="ps-input resize-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="ps-label">Location / area</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Riverside Drive" className="ps-input !pl-9" />
                  </div>
                </div>
                <div>
                  <label className="ps-label">Meter number</label>
                  <input placeholder="e.g. 1289403371" className="ps-input font-mono" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-600 cursor-pointer">
                <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} className="accent-brand-500" />
                <MessageSquare size={14} className="text-gray-400" /> Notify me via SMS when power is restored
              </label>
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send size={15} /> {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </SectionCard>
        </div>

        {/* Right: map + maintenance */}
        <div className="space-y-6">
          <SectionCard title="Live Outage Map" action={<span className="ps-pill-green"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live</span>}>
            <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-gray-200" style={{ height: 240 }} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Active Outages</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Minor Disruptions</span>
            </div>
          </SectionCard>

          <SectionCard title="KPLC Scheduled Maintenance">
            <div className="space-y-2.5">
              {MAINTENANCE.map((m) => (
                <div key={m.area} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100">
                  <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 grid place-items-center shrink-0">
                    <Calendar size={16} />
                  </span>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-gray-800">{m.area}</p>
                    <p className="text-[11px] text-gray-400">{m.date}</p>
                  </div>
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md shrink-0">{m.time}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="ps-card p-5 bg-brand-500 text-white border-brand-500">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} />
              <p className="text-[13px] font-bold">Stay prepared</p>
            </div>
            <p className="text-[12px] text-emerald-50/80">
              Keep a token balance above KSh 200 — outages and tariff changes won't leave you in the dark.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutagesPage;
