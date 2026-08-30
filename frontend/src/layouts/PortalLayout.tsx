import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Activity,
  Users,
  Receipt,
  MapPin,
  Coins,
  ArrowLeft,
  CheckCheck,
} from 'lucide-react';
import { PortalLogo } from '../components/PortalLogo';

export type PortalPage = 'health' | 'meters' | 'transactions' | 'outages' | 'tariffs';

export interface AppNotification {
  id: string;
  title: string;
  time: string;
  tone: 'red' | 'amber' | 'sky' | 'green';
}

interface PortalLayoutProps {
  userName: string;
  roleLabel: string;
  active: PortalPage;
  onNavigate: (page: PortalPage) => void;
  onLogout?: () => void;
  notifications?: AppNotification[];
  children: React.ReactNode;
}

const NAV: { id: PortalPage; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'health', label: 'System Health', icon: Activity },
  { id: 'meters', label: 'Users & Meters', icon: Users },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'outages', label: 'Outages', icon: MapPin },
  { id: 'tariffs', label: 'Tariffs', icon: Coins },
];

const AVATAR_INITIALS = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

export const PortalLayout: React.FC<PortalLayoutProps> = ({
  userName,
  roleLabel,
  active,
  onNavigate,
  onLogout,
  notifications = [],
  children,
}) => {
  const [bellOpen, setBellOpen] = useState(false);
  const [unread, setUnread] = useState(notifications.length);
  const bellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setUnread(notifications.length), [notifications.length]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toneCls: Record<AppNotification['tone'], string> = {
    red: 'border-red-200 bg-red-50',
    amber: 'border-amber-200 bg-amber-50',
    sky: 'border-sky-200 bg-sky-50',
    green: 'border-emerald-200 bg-emerald-50',
  };

  return (
    <div className="min-h-screen bg-[#E8EDF4] font-sans flex">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-[248px] shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <PortalLogo />
          </div>
          <a href="/" className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-[#1E3A5F] transition-colors">
            <ArrowLeft size={13} /> PowerSmart
          </a>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* SYSTEM STATUS */}
          <div className="rounded-xl bg-[#1E3A5F] text-white p-3.5 mb-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-2">
              System Status
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Synced 2m ago
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-100 mt-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              API Active
            </div>
          </div>

          {/* ADMINISTRATION */}
          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Administration
          </p>
          <nav className="space-y-0.5">
            {NAV.map((n) => {
              const Icon = n.icon;
              const isActive = active === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => onNavigate(n.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1E3A5F] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-[#1E3A5F]'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                  {n.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-5 py-4 border-t border-slate-100">
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-[12px] font-semibold text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="text-[13px] text-slate-400 font-medium">Console</div>
          <div className="flex items-center gap-4">
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Bell size={18} className="text-slate-500" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="text-[13px] font-bold text-slate-800">Notifications</p>
                    {unread > 0 && (
                      <button
                        onClick={() => setUnread(0)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#1E3A5F] hover:underline cursor-pointer"
                      >
                        <CheckCheck size={13} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <p className="py-6 text-center text-[13px] text-slate-400">You're all caught up.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-2.5 rounded-xl border mb-1.5 ${toneCls[n.tone]}`}>
                          <p className="text-[13px] font-semibold text-slate-800">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{n.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#1E3A5F] text-white text-[12px] font-bold grid place-items-center">
                {AVATAR_INITIALS(userName)}
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-bold text-slate-800">{userName}</p>
                <p className="text-[11px] text-slate-400">{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};

export default PortalLayout;
