import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Search,
  Settings,
  Zap,
  ArrowLeftRight,
  LogOut,
  ArrowLeft,
  CheckCheck,
} from 'lucide-react';
import { PortalLogo } from '../components/PortalLogo';

export type PortalPage = 'dashboard' | 'properties' | 'tenants' | 'tokens' | 'usage' | 'system' | 'settings' | 'users' | 'transactions' | 'history' | 'predictions' | 'budget' | 'meter' | 'support' | 'alerts';

export interface NavItem {
  id: PortalPage;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface AppNotification {
  id: string;
  title: string;
  time: string;
  tone: 'red' | 'amber' | 'sky' | 'green';
}

interface PortalLayoutProps {
  userName: string;
  portalLabel: string;
  title: string;
  active: PortalPage;
  onNavigate: (page: PortalPage) => void;
  onLogout?: () => void;
  onSwitchPortal?: () => void;
  onTopup?: () => void;
  topupLabel?: string;
  accent?: 'gold' | 'blue';
  notifications?: AppNotification[];
  nav: NavItem[];
  children: React.ReactNode;
}

const AVATAR_INITIALS = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

export const PortalLayout: React.FC<PortalLayoutProps> = ({
  userName,
  portalLabel,
  title,
  active,
  onNavigate,
  onLogout,
  onSwitchPortal,
  onTopup,
  topupLabel = 'Top-up Now',
  accent = 'blue',
  notifications = [],
  nav,
  children,
}) => {
  const [bellOpen, setBellOpen] = useState(false);
  const [unread, setUnread] = useState(notifications.length);
  const [query, setQuery] = useState('');
  const bellRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => setUnread(notifications.length), [notifications.length]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const accentGold = accent === 'gold';
  const ctaCls = accentGold
    ? 'bg-gold-500 hover:bg-gold-600 text-navy-950 shadow-lg shadow-gold-500/20'
    : 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20';
  const activeBar = accentGold ? 'bg-gold-400' : 'bg-brand-400';
  const activeIconCls = accentGold ? 'text-navy-950' : 'text-white';

  const toneCls: Record<AppNotification['tone'], string> = {
    red: 'border-red-100 bg-red-50',
    amber: 'border-amber-100 bg-amber-50',
    sky: 'border-sky-100 bg-sky-50',
    green: 'border-emerald-100 bg-emerald-50',
  };

  const navWidth = collapsed ? 'w-[76px]' : 'w-[256px]';

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <div className="flex">
        {/* ── Sidebar (dark navy) ────────────────────────────────────── */}
        <aside
          className={`${navWidth} sticky top-0 h-screen shrink-0 bg-gradient-to-b from-navy-950 via-navy-950 to-navy-900 border-r border-white/5 flex flex-col transition-[width] duration-200`}
        >
          {/* Logo block */}
          <div className={`px-5 pt-6 pb-5 ${collapsed ? 'px-3 flex justify-center' : ''}`}>
            {collapsed ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-md shadow-gold-500/25">
                <Zap size={19} className="text-navy-950" fill="currentColor" />
              </div>
            ) : (
              <PortalLogo portalLabel={portalLabel} />
            )}
          </div>

          {/* Primary nav */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-1">
              {nav.map((n) => {
                const Icon = n.icon;
                const isActive = active === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => onNavigate(n.id)}
                    title={collapsed ? n.label : undefined}
                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full ${activeBar}`}
                      />
                    )}
                    <Icon
                      size={17}
                      className={isActive ? activeIconCls : 'text-slate-400'}
                    />
                    {!collapsed && n.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom: CTA + portal switch + logout */}
          <div className="px-4 pb-5 pt-3 border-t border-white/5 space-y-3">
            {onTopup && (
              <button
                onClick={onTopup}
                title={collapsed ? topupLabel : undefined}
                className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-[13px] font-black transition-colors cursor-pointer ${ctaCls} ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                <Zap size={17} />
                {!collapsed && topupLabel}
              </button>
            )}
            <div className={`space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
              {onSwitchPortal && (
                <button
                  onClick={onSwitchPortal}
                  title="Switch Portal"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer ${
                    collapsed ? 'justify-center' : 'w-full'
                  }`}
                >
                  <ArrowLeftRight size={15} />
                  {!collapsed && 'Switch Portal'}
                </button>
              )}
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Logout"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer ${
                    collapsed ? 'justify-center' : 'w-full'
                  }`}
                >
                  <LogOut size={15} />
                  {!collapsed && 'Logout'}
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-16 shrink-0 bg-canvas/80 backdrop-blur flex items-center justify-between gap-4 px-4 md:px-6 sticky top-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-brand-500 cursor-pointer"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <ArrowLeft size={16} className={collapsed ? 'rotate-180' : ''} />
              </button>
              <h1 className="text-lg md:text-[22px] font-black text-gray-900 tracking-tight truncate">{title}</h1>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Search */}
              <div className="relative hidden sm:block">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search meters…"
                  className="w-48 lg:w-64 pl-10 pr-4 py-2 rounded-full bg-white border border-gray-200 text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all shadow-card"
                />
              </div>

              {/* Notifications */}
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => setBellOpen((v) => !v)}
                  className="relative p-2.5 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Bell size={17} className="text-gray-500" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </button>
                {bellOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <p className="text-[13px] font-bold text-gray-800">Notifications</p>
                      {unread > 0 && (
                        <button
                          onClick={() => setUnread(0)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-brand-500 hover:underline cursor-pointer"
                        >
                          <CheckCheck size={13} /> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto p-2">
                      {notifications.length === 0 ? (
                        <p className="py-6 text-center text-[13px] text-gray-400">You're all caught up.</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-2.5 rounded-xl border mb-1.5 ${toneCls[n.tone]}`}>
                            <p className="text-[13px] font-semibold text-gray-800">{n.title}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{n.time}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings */}
              <button
                onClick={() => onNavigate('settings')}
                className={`p-2.5 rounded-full bg-white border border-gray-200 transition-colors cursor-pointer ${
                  active === 'settings' ? 'text-brand-500 border-brand-200' : 'hover:bg-gray-50 text-gray-500'
                }`}
                title="Settings"
              >
                <Settings size={17} />
              </button>

              {/* Avatar */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-navy-800 text-white text-[12px] font-bold grid place-items-center ring-2 ring-white">
                  {AVATAR_INITIALS(userName)}
                </div>
                <div className="leading-tight hidden md:block">
                  <p className="text-[13px] font-bold text-gray-800">{userName}</p>
                  <p className="text-[11px] text-gray-400">{portalLabel}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-7">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default PortalLayout;
