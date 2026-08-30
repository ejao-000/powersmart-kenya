import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinned, Locate, RefreshCw, AlertTriangle, ShieldCheck, Send } from 'lucide-react';
import { outages, Outage, fmtDateTime } from '../services/api';

const DEFAULT_CENTER: [number, number] = [-1.2921, 36.8219]; // Nairobi
const STATUS_COLOR: Record<Outage['status'], string> = {
  reported: '#ef4444',
  confirmed: '#f59e0b',
  resolved: '#10b981',
};
const STATUS_LABEL: Record<Outage['status'], string> = {
  reported: 'Reported',
  confirmed: 'Confirmed',
  resolved: 'Resolved',
};

export const OutageMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInst = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const [list, setList] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await outages.list();
      setList(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load outage map.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Initialise the Leaflet map once.
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    const map = L.map(mapRef.current).setView(DEFAULT_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapInst.current = map;
    return () => {
      map.remove();
      mapInst.current = null;
      layerRef.current = null;
    };
  }, []);

  // Sync markers with the outage list.
  useEffect(() => {
    const map = mapInst.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    list.forEach((o) => {
      const color = STATUS_COLOR[o.status] || STATUS_COLOR.reported;
      L.circleMarker([o.latitude, o.longitude], {
        radius: 8,
        color: '#0B0F19',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      })
        .bindPopup(
          `<b>${o.area}</b><br/>${STATUS_LABEL[o.status] || o.status} · ${fmtDateTime(o.created_at)}` +
            `<br/>${o.description || 'No extra details'}` +
            `<br/><i>Reported by ${o.reporter_name || 'a user'}</i>`
        )
        .addTo(layer);
    });
    if (list.length > 0) {
      const first = list[0];
      map.setView([first.latitude, first.longitude], 13, { animate: true });
    }
  }, [list]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        mapInst.current?.setView([pos.coords.latitude, pos.coords.longitude], 13);
        setLocating(false);
      },
      (err) => {
        setError('Could not get your location: ' + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!area.trim()) {
      setError('Enter the area / estate that has no power.');
      return;
    }
    if (lat === null || lng === null) {
      setError('Use "Use my location" to pin the outage on the map.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await outages.report({
        area: area.trim(),
        latitude: lat,
        longitude: lng,
        description: description.trim(),
      });
      setNotice('Outage reported — neighbours in your area can now see it.');
      setTimeout(() => setNotice(null), 6000);
      setArea('');
      setDescription('');
      setLat(null);
      setLng(null);
      await refresh();
    } catch (e2: any) {
      setError(e2.message || 'Failed to report the outage.');
    } finally {
      setSubmitting(false);
    }
  };

  const input =
    'w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-sm';

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MapPinned className="text-cyan-400" size={20} />
          <h3 className="text-base font-bold text-slate-100 font-mono">Outage Map</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-400">
            {list.length} report{list.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => { setLoading(true); refresh(); }}
            className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 transition-all"
            title="Refresh map"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <ShieldCheck size={16} /> {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div
        ref={mapRef}
        className="w-full rounded-xl overflow-hidden border border-slate-800"
        style={{ height: 260, zIndex: 0 }}
      />

      <div className="mt-4">
        <p className="text-xs text-slate-400 mb-3">
          See where your neighbours are in the dark. Report an outage to pin it on the map.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <input
              className={input}
              placeholder="Area / estate (e.g. Westlands, Nairobi)"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-400 border border-slate-700 text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Locate size={15} className={locating ? 'animate-spin' : ''} />
              {lat !== null ? 'Location set' : 'Use my location'}
            </button>
          </div>
          <input
            className={input}
            placeholder="Details (optional) — how long has it been out?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
            {submitting ? 'Reporting…' : 'Report power outage'}
          </button>
        </form>
      </div>

      {list.length > 0 && (
        <div className="mt-5 space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {list.map((o) => (
            <div
              key={o.id}
              className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono font-bold text-slate-100">{o.area}</span>
                  <span
                    className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border"
                    style={{
                      color: STATUS_COLOR[o.status],
                      borderColor: STATUS_COLOR[o.status] + '55',
                      background: STATUS_COLOR[o.status] + '11',
                    }}
                  >
                    {STATUS_LABEL[o.status] || o.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{o.description || 'No extra details'}</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  {fmtDateTime(o.created_at)} · {o.reporter_name || 'a user'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OutageMap;
