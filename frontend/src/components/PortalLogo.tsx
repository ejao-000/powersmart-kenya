import React from 'react';
import { Zap } from 'lucide-react';

// PowerSmart logo lockup: navy lightning bolt with a "PS" mark, wordmark
// "POWER" in navy and "SMART" in green.
export const PortalLogo: React.FC<{ dark?: boolean }> = ({ dark }) => {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative w-10 h-10 rounded-xl bg-[#1E3A5F] flex items-center justify-center shadow-md shadow-[#1E3A5F]/20">
        <Zap size={20} className="text-white" />
        <span className="absolute -bottom-0.5 right-0.5 text-[7px] font-black text-[#1E3A5F] bg-[#A7F3D0] rounded px-0.5 leading-tight">
          PS
        </span>
      </div>
      <div className="leading-none">
        <span className="font-black text-[15px] tracking-tight text-[#1E3A5F]">POWER</span>
        <span className="font-black text-[15px] tracking-tight text-[#16A34A]">SMART</span>
        <div className="text-[8px] font-bold tracking-[0.35em] text-slate-400 mt-0.5">KENYA</div>
      </div>
    </div>
  );
};

export default PortalLogo;
