import React from 'react';
import { Archive, Download, Printer, ShieldCheck } from 'lucide-react';
import { Token, fmtUnits, fmtKsh } from '../services/api';

interface TokenBackupProps {
  tokens: Token[];
}

export const TokenBackup: React.FC<TokenBackupProps> = ({ tokens }) => {
  const last50 = tokens.slice(0, 50);

  const downloadCSV = () => {
    const header = 'Token,Amount (KSh),Units (kWh),Pushed,Date';
    const rows = last50.map((t) =>
      [t.token_number, t.amount_ksh, t.units, t.push_status, t.purchased_at]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'powersmart-tokens.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printTokens = () => {
    const win = window.open('', '_blank', 'width=640,height=800');
    if (!win) return;
    const rows = last50
      .map(
        (t) => `<tr>
          <td style="font-family:monospace">${t.token_number}</td>
          <td style="text-align:right">${fmtKsh(t.amount_ksh)}</td>
          <td style="text-align:right">${fmtUnits(t.units)}</td>
          <td>${new Date(t.purchased_at).toLocaleString('en-KE')}</td>
        </tr>`
      )
      .join('');
    win.document.write(`
      <html><head><title>PowerSmart — Token Backup</title>
      <style>
        body{font-family:system-ui,Segoe UI,Roboto,sans-serif;padding:24px;color:#0f172a}
        h1{font-size:18px;margin:0 0 4px} p{color:#64748b;font-size:12px;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
        th{background:#f1f5f9}
      </style></head><body>
      <h1>PowerSmart Kenya — Token Backup</h1>
      <p>Last ${last50.length} token(s) · ${new Date().toLocaleString('en-KE')}</p>
      <table><thead><tr><th>20-digit token</th><th>Amount</th><th>Units</th><th>Purchased</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">No tokens yet.</td></tr>'}</tbody></table>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Archive className="text-cyan-400" size={20} />
        <h3 className="text-base font-bold text-slate-100 font-mono">Token Backup &amp; Recovery</h3>
      </div>

      <p className="text-sm text-slate-400 mb-5 leading-relaxed">
        Your token history is saved in the cloud and synced to this device — safe even if you lose your
        phone. Print a copy for elderly or non-smartphone users, or download the last{' '}
        {last50.length} token(s) as a file.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={printTokens}
          className="py-3 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-400 border border-slate-700 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Printer size={16} /> Print / Save PDF
        </button>
        <button
          onClick={downloadCSV}
          className="py-3 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-400 border border-slate-700 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Download size={16} /> Download CSV
        </button>
      </div>

      <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
        <ShieldCheck size={15} /> Cloud-backed: tokens stay available after a factory reset or phone change.
      </div>
    </div>
  );
};

export default TokenBackup;
