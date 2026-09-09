import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Gauge,
  Wallet,
  Zap,
  AlertTriangle,
  ShieldCheck,
  Download,
  RefreshCw,
  Info,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import { SectionCard } from './ui';
import {
  insights,
  downloadCsv,
  InsightsBundle,
  MonthlyReport,
  UnitInsight,
  fmtKsh,
  fmtUnits,
} from '../services/api';

const nowMonth = () => new Date().toISOString().slice(0, 7);

const ANOMALY_TONE: Record<string, string> = {
  critical: 'text-red-600 bg-red-50 border-red-100',
  warning: 'text-amber-600 bg-amber-50 border-amber-100',
  info: 'text-sky-600 bg-sky-50 border-sky-100',
};

const ANOMALY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
};

export const UnitInsights: React.FC = () => {
  const [data, setData] = useState<InsightsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(nowMonth());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState(nowMonth());

  const refresh = useCallback(async () => {
    try {
      const d = await insights.bundle();
      setData(d);
    } catch {
      /* header handles */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadReport = useCallback(async (m: string) => {
    setReportLoading(true);
    try {
      const rep = await insights.report(m);
      setReport(rep);
    } catch {
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    loadReport(nowMonth());
  }, [loadReport]);

  const downloadReport = async () => {
    const rep = report && report.period === reportMonth ? report : await insights.report(reportMonth);
    setReport(rep);
    const rows = rep.rows.map((r) => [
      r.meter_name,
      r.meter_number,
      r.tokens,
      r.units_kwh.toFixed(1),
      Math.round(r.spend_ksh),
      r.avg_rate_ksh ? r.avg_rate_ksh.toFixed(1) : '',
    ]);
    rows.push([
      'TOTAL',
      '',
      rep.totals.tokens,
      rep.totals.units_kwh.toFixed(1),
      Math.round(rep.totals.spend_ksh),
      '',
    ]);
    downloadCsv(`powersmart-statement-${rep.period}.csv`,
      ['Meter / Unit', 'Meter number', 'Tokens', 'Units (kWh)', 'Spend (KSh)', 'Avg rate (KSh/kWh)'],
      rows);
  };

  const units = data?.units ?? [];
  const flagged = units.filter((u) => u.anomaly);
  const totalKwh = data?.total_month_kwh ?? 0;
  const totalCost = data?.total_month_cost_ksh ?? 0;

  const fmtChange = (u: UnitInsight) => {
    if (u.prev_7_kwh <= 0) return '—';
    return `${u.change_pct > 0 ? '+' : ''}${u.change_pct.toFixed(0)}%`;
  };

  const cards = [
    { icon: <Building2 size={16} />, label: 'Units monitored', value: String(units.length), foot: 'meter(s) on your account' },
    { icon: <Wallet size={16} />, label: 'Portfolio spend (30d)', value: fmtKsh(Math.round(totalCost)), foot: 'across all units' },
    { icon: <Gauge size={16} />, label: 'Total usage (30d)', value: `${Math.round(totalKwh)} kWh`, foot: 'estimated consumption' },
    {
      icon: <ShieldCheck size={16} />,
      label: 'Flags raised',
      value: String(data?.flagged_count ?? 0),
      foot: 'unusual usage patterns',
      warn: (data?.flagged_count ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Unit Insights</h1>
          <p className="ps-sub">Compare consumption across units and spot unusual usage early.</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); refresh(); }}
          className="ps-btn-outline !px-3 !py-2"
          title="Refresh"
        >
          <RefreshCw size={14} className={refreshing || loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !data ? (
        <div className="ps-card p-12 text-center text-gray-400 text-sm">Analysing your portfolio…</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
              <div key={c.label} className="ps-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-8 h-8 rounded-lg grid place-items-center ${
                      c.warn ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand-500'
                    }`}
                  >
                    {c.icon}
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{c.label}</p>
                </div>
                <p className="text-2xl font-black text-gray-900">{c.value}</p>
                <p className="text-[12px] text-gray-500 mt-1">{c.foot}</p>
              </div>
            ))}
          </div>

          {flagged.length > 0 && (
            <div className="space-y-3">
              {flagged.map((u) =>
                u.anomaly ? (
                  <div
                    key={u.meter_id}
                    className={`ps-card p-4 border-l-4 flex flex-col sm:flex-row sm:items-start gap-3 ${
                      u.anomaly.severity === 'critical'
                        ? '!border-l-red-500'
                        : u.anomaly.severity === 'warning'
                          ? '!border-l-amber-500'
                          : '!border-l-sky-500'
                    }`}
                  >
                    <span
                      className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                        u.anomaly.severity === 'critical'
                          ? 'bg-red-50 text-red-500'
                          : u.anomaly.severity === 'warning'
                            ? 'bg-amber-50 text-amber-500'
                            : 'bg-sky-50 text-sky-500'
                      }`}
                    >
                      <AlertTriangle size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-bold text-gray-900">{u.meter_name}</p>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${ANOMALY_TONE[u.anomaly.severity]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ANOMALY_DOT[u.anomaly.severity]}`} />
                          {u.anomaly.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] font-bold text-gray-800">{u.anomaly.title}</p>
                      <p className="mt-0.5 text-[13px] text-gray-600 leading-relaxed">{u.anomaly.reason}</p>
                      <p className="mt-1.5 text-[12px] text-brand-600 flex items-start gap-1.5">
                        <Info size={13} className="mt-0.5 shrink-0" />
                        <span><span className="font-bold">Suggested:</span> {u.anomaly.action}</span>
                      </p>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Unit comparison table */}
          <SectionCard
            title="Unit comparison"
            action={
              <span className="text-[11px] font-semibold text-gray-400">Last 30 days</span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="py-2.5 pr-3 font-semibold">Unit / Meter</th>
                    <th className="py-2.5 pr-3 font-semibold">Usage</th>
                    <th className="py-2.5 pr-3 font-semibold">Est. spend</th>
                    <th className="py-2.5 pr-3 font-semibold">Daily avg</th>
                    <th className="py-2.5 pr-3 font-semibold">WoW trend</th>
                    <th className="py-2.5 pr-3 font-semibold">Balance</th>
                    <th className="py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.meter_id} className={`border-b border-gray-50 ${u.anomaly ? 'bg-red-50/30' : ''}`}>
                      <td className="py-3 pr-3">
                        <p className="font-bold text-gray-800">{u.meter_name}</p>
                        <p className="text-[11px] font-mono text-gray-400">{u.meter_number || '—'}</p>
                      </td>
                      <td className="py-3 pr-3 font-semibold text-gray-700">{u.month_kwh > 0 ? `${u.month_kwh} kWh` : '—'}</td>
                      <td className="py-3 pr-3 font-bold text-gray-800">{fmtKsh(Math.round(u.month_cost_ksh))}</td>
                      <td className="py-3 pr-3 text-gray-600">{u.daily_avg_kwh > 0 ? `${u.daily_avg_kwh.toFixed(1)} kWh` : '—'}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            u.change_pct > 20 ? 'text-red-500' : u.change_pct < -20 ? 'text-emerald-600' : 'text-gray-500'
                          }`}
                        >
                          {u.change_pct > 20 ? <TrendingUp size={13} /> : null}
                          {fmtChange(u)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-gray-600">{fmtUnits(u.units_remaining)}</td>
                      <td className="py-3">
                        {u.anomaly ? (
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${ANOMALY_TONE[u.anomaly.severity]}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${ANOMALY_DOT[u.anomaly.severity]}`} />
                            {u.anomaly.severity}
                          </span>
                        ) : (
                          <span className="ps-pill-green">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {units.length === 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 text-[13px]">
                        No meters on this account yet — add a unit under Property Management to start comparing.
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <p className="mt-3 text-[11px] text-gray-400 flex items-start gap-1.5">
              <Info size={13} className="mt-0.5 shrink-0" />
              Flags are heuristic and compare the last 7 days with the week before. They are advisory — a spike is often a
              geyser left on, not theft. Pair with your Energy Intelligence page for each unit for deeper detail.
            </p>
          </SectionCard>

          {/* Monthly expense report */}
          <SectionCard
            title="Monthly expense report"
            action={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => {
                      setReportMonth(e.target.value);
                      loadReport(e.target.value);
                    }}
                    className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-white border border-gray-200 text-[13px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                  />
                  <CalendarDays size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <button onClick={downloadReport} className="ps-btn !px-3 !py-2" title="Download CSV">
                  <Download size={14} /> CSV
                </button>
              </div>
            }
          >
            {reportLoading && !report ? (
              <p className="py-4 text-center text-gray-400 text-sm">Building statement…</p>
            ) : report ? (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                        <th className="py-2.5 pr-3 font-semibold">Unit / Meter</th>
                        <th className="py-2.5 pr-3 font-semibold">Tokens</th>
                        <th className="py-2.5 pr-3 font-semibold">Units bought</th>
                        <th className="py-2.5 pr-3 font-semibold">Spend</th>
                        <th className="py-2.5 font-semibold">Avg rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r) => (
                        <tr key={r.meter_id} className="border-b border-gray-50">
                          <td className="py-3 pr-3">
                            <p className="font-bold text-gray-800">{r.meter_name}</p>
                            <p className="text-[11px] font-mono text-gray-400">{r.meter_number || '—'}</p>
                          </td>
                          <td className="py-3 pr-3 text-gray-700">{r.tokens}</td>
                          <td className="py-3 pr-3 text-gray-700">{r.units_kwh > 0 ? `${r.units_kwh} kWh` : '—'}</td>
                          <td className="py-3 pr-3 font-bold text-gray-800">{r.spend_ksh > 0 ? fmtKsh(Math.round(r.spend_ksh)) : '—'}</td>
                          <td className="py-3 text-gray-600">{r.avg_rate_ksh ? `${fmtKsh(Math.round(r.avg_rate_ksh))}/kWh` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-100">
                        <td colSpan={2} className="py-3 font-bold text-gray-800">Totals · {report.period}</td>
                        <td className="py-3 font-bold text-gray-800">{report.totals.units_kwh > 0 ? `${report.totals.units_kwh.toFixed(1)} kWh` : '—'}</td>
                        <td className="py-3 font-black text-brand-600">{fmtKsh(Math.round(report.totals.spend_ksh))}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="mt-3 text-[11px] text-gray-400 flex items-center gap-1.5">
                  <Zap size={12} /> Spend is actual token purchases recorded in {report.period} — great for tenant billing and your records.
                </p>
              </div>
            ) : (
              <p className="py-4 text-center text-gray-400 text-sm">No statement available for this month.</p>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default UnitInsights;
