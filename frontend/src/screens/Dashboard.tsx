import React, { useState } from 'react';
import { LiveGauge } from '../components/LiveGauge';
import { ApplianceSliders } from '../components/ApplianceSliders';
import { TokenVault } from '../components/TokenVault';
import { Zap, Smartphone, RefreshCw, ArrowUpRight, LogOut, ShieldCheck, Bell } from 'lucide-react';

interface DashboardProps {
  onLogout?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [topUpAmount, setTopUpAmount] = useState<number>(500);
  const [loading, setLoading] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  const handleMpesaTopUp = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setNotificationSent(true);
      setTimeout(() => setNotificationSent(false), 4000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Toast Notification Banner */}
      {notificationSent && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-400 shadow-2xl backdrop-blur-xl animate-bounce">
          <ShieldCheck size={18} />
          <span className="text-xs font-mono font-bold">M-Pesa STK Push Sent! Enter PIN on phone.</span>
        </div>
      )}

      {/* Top Header */}
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Zap size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono tracking-tight text-slate-100">KPLC Smart Engine</h1>
            <p className="text-xs text-slate-400 font-mono">Consumer & Tenant Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Meter #37128945610
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 transition-all"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {/* Left Column: Live Gauge & M-Pesa Top Up */}
        <div className="space-y-6">
          <LiveGauge 
            remainingKwh={8.4} 
            estimatedRunOut="Tomorrow, 4:30 PM" 
            meterNumber="37128945610" 
          />

          {/* Quick M-Pesa STK Top Up Widget */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
            <h3 className="text-sm font-bold font-mono text-slate-100 mb-4 flex items-center gap-2">
              <Smartphone size={16} className="text-cyan-400" /> Instant M-Pesa STK Top-Up
            </h3>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[200, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTopUpAmount(amt)}
                  className={`py-2.5 rounded-xl font-mono text-xs font-bold border transition-all ${
                    topUpAmount === amt 
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10' 
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {amt} KSh
                </button>
              ))}
            </div>

            <button
              onClick={handleMpesaTopUp}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-400/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
              {loading ? 'Processing STK Push...' : `Pay KSh ${topUpAmount} via M-Pesa`}
            </button>
          </div>
        </div>

        {/* Right Column: Appliance Estimator & Token Vault */}
        <div className="space-y-6">
          <ApplianceSliders />
          <TokenVault />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
