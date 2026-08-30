import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Receipt,
  MapPin,
  Coins,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  adminApi,
  transactions as txApi,
  outages,
  AdminUser,
  AdminMeter,
  AdminTransaction,
  Transaction,
  Outage,
  fmtKsh,
  fmtDateTime,
} from '../services/api';

interface ManagementPageProps {
  page: 'meters' | 'transactions' | 'outages' | 'tariffs';
  role: string;
}

const card = 'bg-white rounded-2xl border border-slate-200 shadow-sm';

const statusBadge = (s: string) =>
  s === 'success'
    ? 'text-emerald-600 bg-emerald-50'
    : s === 'failed' || s === 'cancelled'
      ? 'text-red-600 bg-red-50'
      : 'text-amber-600 bg-amber-50';

const OUTAGE_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  reported: { label: 'Reported', cls: 'text-red-600 bg-red-50', dot: 'bg-red-500' },
  confirmed: { label: 'Confirmed', cls: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' },
  resolved: { label: 'Resolved', cls: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
};

const TARIFFS = [
  { band: 'Lifeline', range: '0 – 50 kWh / month', rate: 'KSh 2.50 / kWh', note: 'Protected rate for small users' },
  { band: 'Domestic', range: '51 – 1500 kWh / month', rate: 'KSh 15.18 / kWh', note: 'Standard home tariff' },
  { band: 'Commercial', range: 'Any usage (business)', rate: 'KSh 15.60 / kWh', note: 'Business / SME tariff' },
  { band: 'Service charge', range: 'Per connection', rate: 'KSh 150 / month', note: 'Applied monthly' },
];

export const ManagementPage: React.FC<ManagementPageProps> = ({ page, role }) => {
  const isAdmin = role === 'admin';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meters, setMeters] = useState<AdminMeter[]>([]);
  const [adminTx, setAdminTx] = useState<AdminTransaction[]>([]);
  const [ownTx, setOwnTx] = useState<Transaction[]>([]);
  const [outageList, setOutageList] = useState<Outage[]>([]);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (page === 'meters' && isAdmin) {
        const [u, m] = await Promise.all([adminApi.users(), adminApi.meters()]);
        setUsers(u);
        setMeters(m);
      } else if (page === 'transactions') {
        if (isAdmin) setAdminTx(await adminApi.transactions());
        else setOwnTx(await txApi.list());
      } else if (page === 'outages') {
        setOutageList(await outages.list());
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [page, isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const head = (title: string, icon: React.ReactNode) => (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
          {icon} {title}
        </h1>
      </div>
      <button
        onClick={() => { setLoading(true); refresh(); }}
        className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-600 hover:border-[#1E3A5F] hover:text-[#1E3A5F] text-[13px] font-bold flex items-center gap-2 transition-colors cursor-pointer"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
      </button>
    </div>
  );

  if (page === 'meters') {
    if (!isAdmin) {
      return (
        <div className={card + ' p-12 text-center'}>
          <ShieldAlert size={30} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-700">Restricted section</h3>
          <p className="text-sm text-slate-400 mt-1">Users &amp; Meters is available to System Admins only.</p>
        </div>
      );
    }
    return (
      <>
        {head('Users & Meters', <Users size={22} className="text-[#1E3A5F]" />)}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className={card + ' p-5'}>
            <h3 className="text-[15px] font-bold text-slate-800 mb-3">Registered Users ({users.length})</h3>
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-3 font-semibold">Name</th>
                    <th className="py-2 pr-3 font-semibold">Role</th>
                    <th className="py-2 font-semibold">Meter Account</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50">
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-slate-800">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.email} · {u.phone}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-[11px] font-bold capitalize text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{u.role}</span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-500">{u.meter_account}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={3} className="py-8 text-center text-slate-400">No users yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={card + ' p-5'}>
            <h3 className="text-[15px] font-bold text-slate-800 mb-3">All Meters ({meters.length})</h3>
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-3 font-semibold">Meter</th>
                    <th className="py-2 pr-3 font-semibold">Owner</th>
                    <th className="py-2 pr-3 font-semibold">Units</th>
                    <th className="py-2 font-semibold">Auto</th>
                  </tr>
                </thead>
                <tbody>
                  {meters.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50">
                      <td className="py-2.5 pr-3 font-mono text-slate-600">{m.meter_number}</td>
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-slate-800">{m.owner_name || '—'}</p>
                        <p className="text-[11px] text-slate-400">{m.owner_email}</p>
                      </td>
                      <td className="py-2.5 pr-3 font-mono font-bold text-slate-700">{m.units_remaining.toFixed(1)}</td>
                      <td className="py-2.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${m.auto_topup ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                          {m.auto_topup ? 'ON' : 'OFF'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {meters.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">No meters yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (page === 'transactions') {
    const rows: { id: string; ref: string; owner: string; channel: string; amount: number; status: string; created: string }[] = isAdmin
      ? adminTx.map((t) => ({ id: t.id, ref: t.reference, owner: t.owner_email, channel: t.channel, amount: t.amount_ksh, status: t.status, created: t.created_at }))
      : ownTx.map((t) => ({ id: t.id, ref: t.reference || '—', owner: 'You', channel: t.channel, amount: t.amount_ksh, status: t.status, created: t.created_at }));

    return (
      <>
        {head(isAdmin ? 'Transactions' : 'My Transactions', <Receipt size={22} className="text-[#1E3A5F]" />)}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        <div className={card + ' p-5'}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 pr-3 font-semibold">Reference</th>
                  {isAdmin && <th className="py-2.5 pr-3 font-semibold">Account</th>}
                  <th className="py-2.5 pr-3 font-semibold">Channel</th>
                  <th className="py-2.5 pr-3 font-semibold">Amount</th>
                  <th className="py-2.5 pr-3 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50">
                    <td className="py-3 pr-3 font-mono text-[12px] text-slate-600">{t.ref}</td>
                    {isAdmin && <td className="py-3 pr-3 text-slate-500">{t.owner}</td>}
                    <td className="py-3 pr-3"><span className="text-[11px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{t.channel}</span></td>
                    <td className="py-3 pr-3 font-bold text-slate-700">{fmtKsh(t.amount)}</td>
                    <td className="py-3 pr-3"><span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md ${statusBadge(t.status)}`}>{t.status}</span></td>
                    <td className="py-3 text-slate-500">{fmtDateTime(t.created)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400">No transactions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  if (page === 'outages') {
    return (
      <>
        {head('Outages', <MapPin size={22} className="text-[#1E3A5F]" />)}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className={card + ' p-5'}>
              <h3 className="text-[15px] font-bold text-slate-800 mb-3">Community Reports ({outageList.length})</h3>
              <div className="space-y-3">
                {outageList.map((o) => {
                  const st = OUTAGE_STATUS[o.status] || OUTAGE_STATUS.reported;
                  return (
                    <div key={o.id} className="p-3.5 rounded-xl border border-slate-200 flex items-start gap-3">
                      <span className={'h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ' + st.dot} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[14px] font-bold text-slate-800">{o.area}</p>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${st.cls}`}>{st.label}</span>
                        </div>
                        <p className="text-[12px] text-slate-500 mt-0.5">{o.description || 'No extra details'}</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {fmtDateTime(o.created_at)} · {o.reporter_name || 'a user'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {outageList.length === 0 && (
                  <p className="py-10 text-center text-slate-400">No outage reports yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className={card + ' p-5 self-start'}>
            <h3 className="text-[15px] font-bold text-slate-800 mb-3">By status</h3>
            {(['reported', 'confirmed', 'resolved'] as Outage['status'][]).map((s) => {
              const st = OUTAGE_STATUS[s];
              const n = outageList.filter((o) => o.status === s).length;
              return (
                <div key={s} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <span className="flex items-center gap-2 text-[13px] text-slate-600">
                    <span className={'h-2 w-2 rounded-full ' + st.dot} /> {st.label}
                  </span>
                  <span className="font-bold text-slate-800">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // Tariffs
  return (
    <>
      {head('Tariffs', <Coins size={22} className="text-[#1E3A5F]" />)}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className={card + ' p-5'}>
            <h3 className="text-[15px] font-bold text-slate-800 mb-1">KPLC Residential &amp; Commercial Tariffs</h3>
            <p className="text-[12px] text-slate-500 mb-4">
              Indicative EPRA-approved rates. Subject to review — pre-buy when a tariff change is announced.
            </p>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 pr-3 font-semibold">Band</th>
                  <th className="py-2.5 pr-3 font-semibold">Range</th>
                  <th className="py-2.5 pr-3 font-semibold">Rate</th>
                  <th className="py-2.5 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {TARIFFS.map((t) => (
                  <tr key={t.band} className="border-b border-slate-50">
                    <td className="py-3 pr-3 font-bold text-slate-800">{t.band}</td>
                    <td className="py-3 pr-3 text-slate-500">{t.range}</td>
                    <td className="py-3 pr-3 font-mono font-bold text-[#1E3A5F]">{t.rate}</td>
                    <td className="py-3 text-slate-500">{t.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-[12px] text-slate-400">
              Plus VAT (16%), ERC levy, fuel energy charge, forex &amp; inflation adjusters applied on your statement.
            </p>
          </div>
        </div>

        <div className={card + ' p-5 self-start'}>
          <h3 className="text-[15px] font-bold text-slate-800 mb-3">Smart tip</h3>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            When KPLC announces a tariff change, buy tokens <span className="font-bold">before</span> the effective
            date — prepaid tokens purchased now are priced at the current rate and hedge against the increase.
          </p>
        </div>
      </div>
    </>
  );
};

export default ManagementPage;
