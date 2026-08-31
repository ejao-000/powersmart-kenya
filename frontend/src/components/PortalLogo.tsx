import React from 'react';
import { Zap } from 'lucide-react';

// PowerSmart logo lockup: forest-green lightning bolt with a "PS" mark, wordmark
// "POWER" in deep green and "SMART" in green.
export const PortalLogo: React.FC<{ dark?: boolean }> = ({ dark }) => {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20">
        <Zap size={20} className="text-white" />
        <span className="absolute -bottom-0.5 right-0.5 text-[7px] font-black text-brand-700 bg-emerald-100 rounded px-0.5 leading-tight">
          PS
        </span>
      </div>
      <div className="leading-none">
        <span className="font-black text-[15px] tracking-tight text-gray-900">POWER</span>
        <span className="font-black text-[15px] tracking-tight text-brand-500">SMART</span>
        <div className="text-[8px] font-bold tracking-[0.35em] text-gray-400 mt-0.5">KENYA</div>
      </div>
    </div>
  );
};

export default PortalLogo;
