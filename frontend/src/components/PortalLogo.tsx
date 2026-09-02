import React from 'react';
import { Zap } from 'lucide-react';

// PowerSmart Kenya logo lockup: gold lightning mark on a rounded square, wordmark
// "PowerSmart Kenya" plus a small portal label underneath. Rendered on the navy sidebar.
export const PortalLogo: React.FC<{ portalLabel?: string; onDark?: boolean }> = ({
  portalLabel,
  onDark = true,
}) => {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-md shadow-gold-500/25 shrink-0">
        <Zap size={20} className="text-navy-950" fill="currentColor" />
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-navy-900" />
      </div>
      <div className="leading-tight min-w-0">
        <span className="block font-black text-[15px] tracking-tight text-white whitespace-nowrap">
          PowerSmart<span className="text-gold-400"> Kenya</span>
        </span>
        {portalLabel && (
          <span
            className={`mt-0.5 block text-[9px] font-bold uppercase tracking-[0.22em] ${
              onDark ? 'text-slate-400' : 'text-gray-500'
            }`}
          >
            {portalLabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default PortalLogo;
