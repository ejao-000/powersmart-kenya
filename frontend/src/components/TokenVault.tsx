import React, { useEffect, useState } from 'react';
import { getCachedTokens, TokenRecord, saveTokenLocal } from '../services/localDb';
import { KeyRound, Copy, Check, ShieldCheck, Plus } from 'lucide-react';

export const TokenVault: React.FC = () => {
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    getCachedTokens().then(data => {
      if (data.length === 0) {
        // Seed mock demo token if vault is empty
        const mock: TokenRecord = {
          id: '1',
          meterNumber: '37128945610',
          tokenCode: '4829-1092-8374-5610-9281',
          amountKes: 1000,
          unitsKwh: 40.8,
          source: 'MPESA',
          createdAt: new Date().toISOString(),
        };
        saveTokenLocal(mock).then(() => setTokens([mock]));
      } else {
        setTokens(data);
      }
    });
  }, []);

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
          <h3 className="text-base font-bold text-slate-100 font-mono">Offline Token Vault</h3>
        </div>
        <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
          <ShieldCheck size={14} /> Vault Secured
        </span>
      </div>

      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {tokens.map((t) => (
          <div key={t.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-semibold text-cyan-400">{t.amountKes} KSh</span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs font-mono text-slate-300">{t.unitsKwh} kWh</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{t.source}</span>
              </div>
              <p className="text-sm font-mono font-bold text-slate-100 tracking-wider">{t.tokenCode}</p>
            </div>
            <button
              onClick={() => handleCopy(t.tokenCode, t.id)}
              className="p-2.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 border border-slate-700 transition-all"
              title="Copy 20-Digit Token"
            >
              {copiedId === t.id ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
