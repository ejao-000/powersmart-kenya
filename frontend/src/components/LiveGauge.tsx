import React from 'react';
import { Zap, Clock, AlertTriangle } from 'lucide-react';

interface LiveGaugeProps {
  remainingKwh: number;
  maxKwh?: number;
  estimatedRunOut: string;
  meterNumber: string;
}

export const LiveGauge: React.FC<LiveGaugeProps> = ({
  remainingKwh,
  maxKwh = 100,
  estimatedRunOut,
  meterNumber,
}) => {
  const percentage = Math.min(Math.max((remainingKwh / maxKwh) * 100, 0), 100);
  const isLow = remainingKwh < 10;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Active Meter</span>
          <h3 className="text-lg font-mono font-bold text-slate-100">{meterNumber}</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-mono flex items-center gap-1.5 ${
          isLow ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
        }`}>
          {isLow ? <AlertTriangle size={14} /> : <Zap size={14} />}
          {isLow ? 'LOW BALANCE' : 'STABLE'}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center my-4">
        <div className="relative flex items-center justify-center">
          <div className="text-center">
            <span className="text-4xl font-extrabold font-mono text-cyan-400 tracking-tight">{remainingKwh.toFixed(1)}</span>
            <span className="block text-xs uppercase tracking-widest text-slate-400 mt-1">kWh Remaining</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-slate-800 h-2.5 rounded-full mt-6 overflow-hidden">
          <div 
            className={`h-full transition-all duration-700 ${isLow ? 'bg-amber-500' : 'bg-cyan-400'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-mono">
          <Clock size={14} className="text-cyan-400" />
          Est. Depletion:
        </span>
        <span className="font-semibold text-slate-200 font-mono">{estimatedRunOut}</span>
      </div>
    </div>
  );
};