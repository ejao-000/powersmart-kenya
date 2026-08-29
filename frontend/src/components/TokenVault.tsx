import React, { useState } from 'react';
import { Token, fmtUnits } from '../services/api';
import { KeyRound, Copy, Check, ShieldCheck, Trash2 } from 'lucide-react';

interface TokenVaultProps {
  tokens: Token[];
  onDelete: (id: string) => Promise<void>;
}

export const TokenVault: React.FC<TokenVaultProps> = ({ tokens, onDelete }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <KeyRound className="text-cyan-400" size={20} />
          <h3 className="text-base font-bold text-slate-100 font-mono">My Tokens</h3>
        </div>
        <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
          <ShieldCheck size={14} /> {tokens.length} issued
        </span>
      </div>

      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {tokens.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tokens yet — buy one above and your 20-digit token will appear here.
          </p>
        ) : (
          tokens.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-semibold text-cyan-400">{t.amount_ksh} KSh</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs font-mono text-slate-300">{fmtUnits(t.units)}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      t.push_status === 'success'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : t.push_status === 'failed'
                          ? 'text-red-400 bg-red-500/10 border-red-500/30'
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                    }`}
                  >
                    {t.push_status}
                  </span>
                </div>
                <p className="text-sm font-mono font-bold text-slate-100 tracking-wider truncate">
                  {t.token_number}
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  {new Date(t.purchased_at).toLocaleString('en-KE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(t.token_number, t.id)}
                  className="p-2.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 border border-slate-700 transition-all"
                  title="Copy 20-Digit Token"
                >
                  {copiedId === t.id ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  className="p-2.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-all"
                  title="Remove from history"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TokenVault;
