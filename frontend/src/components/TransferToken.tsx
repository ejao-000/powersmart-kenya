import React, { useState } from 'react';
import { Send, RefreshCw, ShieldCheck, AlertTriangle, KeyRound } from 'lucide-react';
import { tokens, fmtUnits, fmtKsh } from '../services/api';

interface TransferTokenProps {
  onDone: () => Promise<void>;
}

export const TransferToken: React.FC<TransferTokenProps> = ({ onDone }) => {
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(amount) || 0;
    if (!account.trim()) {
      setError('Enter the recipient meter account number.');
      return;
    }
    if (amt < 50) {
      setError('Minimum transfer is KSh 50.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const t = await tokens.transfer({ meter_account: account.trim(), amount_ksh: amt });
      setNotice(
        `Sent ${fmtKsh(t.amount_ksh)} → a ${fmtUnits(t.units)} token was issued to that meter (token ${t.token_number}).`
      );
      setTimeout(() => setNotice(null), 8000);
      setAccount('');
      setAmount('');
      await onDone();
    } catch (e2: any) {
      setError(e2.message || 'Transfer failed.');
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all';

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Send className="text-cyan-400" size={20} />
        <h3 className="text-base font-bold text-slate-100 font-mono">Emergency Token Transfer</h3>
      </div>

      <p className="text-sm text-slate-400 mb-5 leading-relaxed">
        Send token value straight to another registered meter — help a neighbour whose power has run
        out. The token is issued on their meter instantly.
      </p>

      {notice && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-start gap-2">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" /> {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Recipient meter account number
          </label>
          <input
            className={input}
            placeholder="e.g. 1234567890"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Amount to send (KSh)
          </label>
          <input
            type="number"
            min={50}
            className={input}
            placeholder="e.g. 100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
        >
          {busy ? <RefreshCw size={15} className="animate-spin" /> : <KeyRound size={15} />}
          {busy ? 'Sending…' : 'Send token to meter'}
        </button>
      </form>
    </div>
  );
};

export default TransferToken;
