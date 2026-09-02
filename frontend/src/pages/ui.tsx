import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

export const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  up?: boolean;
  progress?: number;
  badge?: string;
  badgeTone?: 'green' | 'amber' | 'red';
  footer?: string;
}> = ({ icon, label, value, change, up = true, progress, badge, badgeTone = 'green', footer }) => {
  const badgeCls =
    badgeTone === 'amber'
      ? 'ps-pill-amber'
      : badgeTone === 'red'
        ? 'ps-pill-red'
        : 'ps-pill-green';
  return (
    <div className="ps-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 grid place-items-center">{icon}</span>
        {badge ? (
          <span className={badgeCls}>
            <span className={`h-1.5 w-1.5 rounded-full ${badgeTone === 'amber' ? 'bg-amber-500' : badgeTone === 'red' ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
            {badge}
          </span>
        ) : change ? (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {change}
          </span>
        ) : null}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">{label}</p>
      <p className="text-[28px] md:text-[32px] font-black text-gray-900 leading-none mt-2">{value}</p>
      {progress !== undefined && (
        <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
      {footer && <p className="text-[12px] text-gray-500 mt-1.5">{footer}</p>}
    </div>
  );
};

export const SectionCard: React.FC<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, action, children, className = '' }) => (
  <div className={`ps-card p-5 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[15px] font-bold text-gray-800">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);
