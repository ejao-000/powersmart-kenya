import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Search,
  Settings,
  Zap,
  LifeBuoy,
  Activity,
  ArrowLeft,
  CheckCheck,
} from 'lucide-react';
import { PortalLogo } from '../components/PortalLogo';

export type PortalPage = 'dashboard' | 'properties' | 'tenants' | 'tokens' | 'usage' | 'system' | 'settings' | 'users' | 'transactions';

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
  roleLabel: string;
  title: string;
  active: PortalPage;
  onNavigate: (page: PortalPage) => void;
  onLogout?: () => void;
  onBuyTokens?: () => void;
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
  roleLabel,
  title,
  active,
  onNavigate,
  onLogout,
  onBuyTokens,
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

  const toneCls: Record<AppNotification['tone'], string> = {
    red: 'border-red-100 bg-red-50',
    amber: 'border-amber-100 bg-amber-50',
    sky: 'border-sky-100 bg-sky-50',
    green: 'border-emerald-100 bg-emerald-50',
  };

  const navWidth = collapsed ? 'w-[72px]' : 'w-[248px]';

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <div className="flex">
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside className={`${navWidth} sticky top-0 h-screen shrink-0 bg-white border-r border-gray-200 flex flex-col transition-[width] duration-200`}>
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <div className={`flex items-center justify-between ${collapsed ? 'justify-center' : ''}`}>
              {collapsed ? (
                <div className="flex items-center justify-center w-full">
                  <div className="relative w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20">
                    <Zap size={20} className="text-white" />
                  </div>
                </div>
              ) : (
                <PortalLogo />
              )}
            </div>
            {!collapsed && (
              <a href="/" className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-gray-400 hover:text-brand-500 transition-colors">
                <ArrowLeft size={13} /> Prepaid Management
              </a>
            )}
            {collapsed && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => setCollapsed(false)}
                  className="text-gray-300 hover:text-brand-500 cursor-pointer"
                  title="Expand sidebar"
                >
                  <ArrowLeft size={14} className="rotate-180" />
                </button>
              </div>
            )}
          </div>

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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-brand-50 hover:text-brand-600'
                    }`}
                  >
                    <Icon size={17} className={isActive ? 'text-white' : 'text-gray-400'} />
                    {!collapsed && n.label}
                  </button>
                );
              })}
            </nav>

            {onBuyTokens && (
              <button
                onClick={onBuyTokens}
                title={collapsed ? 'Buy Tokens' : undefined}
                className={`mt-5 w-full flex items-center gap-2 px-3 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-bold shadow-md shadow-brand-500/20 transition-colors cursor-pointer ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                <Zap size={17} />
                {!collapsed && 'Buy Tokens'}
              </button>
            )}
          </div>

          {/* Pinned footer links */}
          <div className={`px-4 py-4 border-t border-gray-100 space-y-1 ${collapsed ? 'px-3' : ''}`}>
            {[
              { label: 'Support', icon: LifeBuoy, id: 'support' as const },
              { label: 'App Status', icon: Activity, id: 'status' as const },
            ].map((l) => {
              const Icon = l.icon;
              return (
                <a
                  key={l.id}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  title={collapsed ? l.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-semibold text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer ${
                    collapsed ? 'justify-center' : ''
                  }`}
                >
                  <Icon size={16} />
                  {!collapsed && l.label}
                </a>
              );
            })}
            {onLogout && (
              <button
                onClick={onLogout}
                title={collapsed ? 'Sign out' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                <LifeBuoy size={16} />
                {!collapsed && 'Sign out'}
              </button>
            )}
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between gap-4 px-4 md:px-6 sticky top-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <ArrowLeft size={18} className="rotate-180" />
              </button>
              <div className="min-w-0">
                <h1 className="text-[15px] md:text-lg font-bold text-gray-900 truncate leading-tight">{title}</h1>
                <p className="hidden md:block text-[11px] text-gray-400">{roleLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Search */}
              <div className="relative hidden sm:block">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-44 lg:w-56 pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all"
                />
              </div>

              {/* Notifications */}
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => setBellOpen((v) => !v)}
                  className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <Bell size={18} className="text-gray-500" />
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
                className={`p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer ${
                  active === 'settings' ? 'text-brand-500 bg-brand-50' : 'text-gray-500'
                }`}
                title="Settings"
              >
                <Settings size={18} />
              </button>

              {/* Avatar */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-brand-500 text-white text-[12px] font-bold grid place-items-center">
                  {AVATAR_INITIALS(userName)}
                </div>
                <div className="leading-tight hidden md:block">
                  <p className="text-[13px] font-bold text-gray-800">{userName}</p>
                  <p className="text-[11px] text-gray-400">{roleLabel}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default PortalLayout;
