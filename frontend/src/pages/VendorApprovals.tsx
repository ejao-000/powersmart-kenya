import React, { useCallback, useEffect, useState } from 'react';
import {
  Store,
  RefreshCw,
  Check,
  X,
  UserX,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { SectionCard } from './ui';
import { adminApi, MerchantProfile, fmtDateTime } from '../services/api';

const STATUS_PILL: Record<string, string> = {
  active: 'ps-pill-green',
  pending: 'ps-pill-amber',
  suspended: 'ps-pill-red',
};

export const VendorApprovals: React.FC = () => {
  const [merchants, setMerchants] = useState<MerchantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMerchants(await adminApi.merchants());
    } catch {
      /* header handles */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (m: MerchantProfile, status: string) => {
    setBusy(m.id);
    try {
      await adminApi.setMerchantStatus(m.id, status);
      setFlash(`${m.business_name} ${status === 'active' ? 'activated' : status === 'suspended' ? 'suspended' : 'set to pending'}.`);
      setTimeout(() => setFlash(null), 3000);
      await load();
    } catch (e: any) {
      setFlash(e?.message || 'Could not update the vendor.');
      setTimeout(() => setFlash(null), 3000);
    } finally {
      setBusy(null);
    }
  };

  const active = merchants.filter((m) => m.status === 'active').length;
  const pending = merchants.filter((m) => m.status === 'pending').length;
  const suspended = merchants.filter((m) => m.status === 'suspended').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Vendor Approvals</h1>
          <p className="ps-sub">Approve, suspend or monitor merchant token vendors across the platform.</p>
        </div>
        <button onClick={load} className="ps-btn-outline !px-3 !py-2" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {flash && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
          <Check size={16} /> {flash}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ps-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Active vendors</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{active}</p>
        </div>
        <div className="ps-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Pending approval</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{pending}</p>
        </div>
        <div className="ps-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Suspended</p>
          <p className="text-2xl font-black text-red-500 mt-1">{suspended}</p>
        </div>
      </div>

      {loading ? (
        <div className="ps-card p-12 text-center text-gray-400 text-sm">Loading vendors…</div>
      ) : (
        <SectionCard title={`All vendors (${merchants.length})`}>
          {merchants.length === 0 ? (
            <div className="py-10 text-center">
              <Store size={28} className="mx-auto text-gray-200" />
              <p className="mt-3 text-[13px] text-gray-400">No vendor registrations yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="py-2.5 pr-3 font-semibold">Business</th>
                    <th className="py-2.5 pr-3 font-semibold">Owner</th>
                    <th className="py-2.5 pr-3 font-semibold">Status</th>
                    <th className="py-2.5 pr-3 font-semibold">Registered</th>
                    <th className="py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {merchants.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 grid place-items-center">
                            <Store size={15} />
                          </span>
                          <span className="font-bold text-gray-800">{m.business_name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-gray-600">{m.user_name || '—'}</td>
                      <td className="py-3 pr-3">
                        <span className={STATUS_PILL[m.status] || STATUS_PILL.pending}>
                          <span className={`h-1.5 w-1.5 rounded-full ${m.status === 'active' ? 'bg-emerald-500' : m.status === 'suspended' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-gray-500">{fmtDateTime(m.created_at)}</td>
                      <td className="py-3 text-right whitespace-nowrap">
                        {m.status !== 'active' && (
                          <button
                            onClick={() => setStatus(m, 'active')}
                            disabled={busy === m.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[12px] font-bold disabled:opacity-50 cursor-pointer"
                          >
                            {busy === m.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Activate
                          </button>
                        )}
                        {m.status === 'active' && (
                          <button
                            onClick={() => setStatus(m, 'suspended')}
                            disabled={busy === m.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[12px] font-bold disabled:opacity-50 cursor-pointer"
                          >
                            {busy === m.id ? <Loader2 size={13} className="animate-spin" /> : <UserX size={13} />} Suspend
                          </button>
                        )}
                        {m.status === 'suspended' && (
                          <button
                            onClick={() => setStatus(m, 'pending')}
                            disabled={busy === m.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-[12px] font-bold disabled:opacity-50 cursor-pointer"
                          >
                            {busy === m.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Set pending
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[11px] text-gray-400 flex items-center gap-1.5">
            <ShieldCheck size={13} /> Suspending a vendor immediately blocks them from topping up or vending.
          </p>
        </SectionCard>
      )}
    </div>
  );
};

export default VendorApprovals;
