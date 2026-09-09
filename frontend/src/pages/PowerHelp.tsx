import React, { useCallback, useEffect, useState } from 'react';
import {
  HandCoins,
  Send,
  Check,
  X,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Clock,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { SectionCard } from './ui';
import { powerRequests, PowerRequest, PowerRequestBundle, fmtKsh, fmtDateTime } from '../services/api';

const AMOUNTS = [100, 200, 500, 1000];

const STATUS_PILL: Record<string, string> = {
  open: 'ps-pill-amber',
  fulfilled: 'ps-pill-green',
  cancelled: 'ps-pill-red',
};

export const PowerHelp: React.FC = () => {
  const [data, setData] = useState<PowerRequestBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(200);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);

  const flashMsg = useCallback((msg: string, ok = true) => {
    setFlash({ msg, ok });
    setTimeout(() => setFlash(null), 3500);
  }, []);

  const load = useCallback(async () => {
    try {
      setData(await powerRequests.list());
    } catch {
      /* header handles */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ask = async () => {
    if (amount < 50) {
      flashMsg('Requests must be at least KSh 50.', false);
      return;
    }
    setBusy(true);
    try {
      await powerRequests.create({ amount_ksh: amount, note: note.trim() || undefined });
      setNote('');
      flashMsg(`Your request for ${fmtKsh(amount)} is now open — someone nearby can send it.`);
      await load();
    } catch (e: any) {
      flashMsg(e?.message || 'Could not place your request.', false);
    } finally {
      setBusy(false);
    }
  };

  const help = async (req: PowerRequest) => {
    if (!window.confirm(`Send ${fmtKsh(req.amount_ksh)} of power to ${req.requester_name || req.meter_account}?`)) return;
    setBusy(true);
    setBusyId(req.id);
    try {
      await powerRequests.fulfil(req.id);
      flashMsg(`Power sent — ${fmtKsh(req.amount_ksh)} issued on ${req.requester_name || 'their'} meter.`);
      await load();
    } catch (e: any) {
      flashMsg(e?.message || 'Could not send power.', false);
    } finally {
      setBusy(false);
      setBusyId('');
    }
  };

  const cancel = async (req: PowerRequest) => {
    setBusy(true);
    try {
      await powerRequests.cancel(req.id);
      await load();
    } catch (e: any) {
      flashMsg(e?.message || 'Could not cancel the request.', false);
    } finally {
      setBusy(false);
    }
  };

  const openRequests = (data?.open ?? []).filter((r) => r.status === 'open');
  const myRequests = data?.mine ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Power Help</h1>
          <p className="ps-sub">Ask the community for emergency power — or be the person who sends it.</p>
        </div>
        <button onClick={load} className="ps-btn-outline !px-3 !py-2" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {flash && (
        <div
          className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border ${
            flash.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
          }`}
        >
          {flash.ok ? <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />}
          <p className={`text-[13px] ${flash.ok ? 'text-emerald-700' : 'text-red-700'}`}>{flash.msg}</p>
        </div>
      )}

      {loading ? (
        <div className="ps-card p-12 text-center text-gray-400 text-sm">Loading power requests…</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Ask for power */}
          <div>
            <SectionCard title="I need power">
              <p className="text-[12px] text-gray-500 leading-relaxed">
                Ran out and can't top up right now? Ask for a small amount — it is issued straight onto your meter.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(a)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border cursor-pointer ${
                      amount === a ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {fmtKsh(a)}
                  </button>
                ))}
              </div>
              <label className="ps-label mt-4">Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. 2-year-old at home, need to keep the fridge on"
                className="ps-input"
              />
              <button onClick={ask} disabled={busy} className="mt-3 w-full ps-btn !py-2.5 disabled:opacity-50">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <HandCoins size={14} />} Ask for power
              </button>
              <p className="mt-2 text-[11px] text-gray-400 flex items-start gap-1.5">
                <ShieldCheck size={12} className="mt-0.5 shrink-0" /> Your request shows your meter account so helpers
                can send directly to it.
              </p>
            </SectionCard>

            {/* My requests */}
            <div className="mt-6">
              <SectionCard title="My requests">
                {myRequests.length === 0 ? (
                  <p className="py-4 text-center text-[13px] text-gray-400">No requests yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {myRequests.map((r) => (
                      <div key={r.id} className="rounded-xl border border-gray-100 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-bold text-gray-800">{fmtKsh(r.amount_ksh)}</p>
                          <span className={STATUS_PILL[r.status] || STATUS_PILL.open}>{r.status}</span>
                        </div>
                        {r.note && <p className="text-[12px] text-gray-500 mt-1">{r.note}</p>}
                        <div className="mt-1.5 flex items-center justify-between">
                          <p className="text-[11px] text-gray-400">
                            {fmtDateTime(r.created_at)}
                            {r.helper_name ? ` · helped by ${r.helper_name}` : ''}
                          </p>
                          {r.status === 'open' && (
                            <button
                              onClick={() => cancel(r)}
                              className="text-[11px] font-bold text-gray-400 hover:text-red-500 cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>

          {/* Help others */}
          <div className="xl:col-span-2">
            <SectionCard
              title="Open requests near you"
              action={
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                  <Users size={12} /> {openRequests.length} open
                </span>
              }
            >
              {openRequests.length === 0 ? (
                <div className="py-10 text-center">
                  <Check size={30} className="mx-auto text-emerald-300" />
                  <p className="mt-3 text-[13px] text-gray-400">
                    No one needs power right now. When someone runs out, their request will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openRequests.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <span className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 grid place-items-center shrink-0">
                        <AlertTriangle size={19} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-gray-900">
                          {r.requester_name || 'Someone'} needs {fmtKsh(r.amount_ksh)} of power
                        </p>
                        <p className="text-[12px] text-gray-500 mt-0.5">
                          Meter {r.meter_account}
                          {r.note ? ` · “${r.note}”` : ''} · {fmtDateTime(r.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => help(r)}
                        disabled={busy}
                        className="shrink-0 ps-btn !px-4 !py-2 disabled:opacity-50"
                      >
                        {busy && busyId === r.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                        {busy && busyId === r.id ? 'Sending…' : 'Send power'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 p-3.5 rounded-xl bg-sky-50 border-sky-100 flex items-start gap-2.5">
                <Clock size={15} className="text-sky-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-sky-700 leading-relaxed">
                  When you send power, PowerSmart issues a token on the requester's meter instantly and closes the
                  request. This is the community way to beat a blackout.
                </p>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default PowerHelp;
