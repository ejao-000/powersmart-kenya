import React, { useState } from 'react';
import {
  Zap,
  LayoutGrid,
  ShoppingCart,
  KeyRound,
  LineChart,
  CalendarClock,
  Wallet,
  ZapOff,
  Settings,
  Headset,
  Cloud,
  Search,
  Bell,
  LogOut,
} from 'lucide-react';
import { getSession } from '../services/api';
import { TenantDashboardPage } from '../pages/TenantDashboardPage';
import { BuyTokensPage } from '../pages/BuyTokensPage';
import { TokenHistoryPage } from '../pages/TokenHistoryPage';
import { UsagePage } from '../pages/UsagePage';
import { PredictionsPage } from '../pages/PredictionsPage';
import { EnergyBudget } from '../pages/EnergyBudget';
import { OutagesPage } from '../pages/OutagesPage';
import { SettingsPage } from '../pages/SettingsPage';

interface DashboardHomeProps {
  userName?: string;
  onLogout?: () => void;
}

type NavId = 'dashboard' | 'tokens' | 'history' | 'usage' | 'predictions' | 'budget' | 'system' | 'settings';

const NAV_ITEMS: { id: NavId; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'dashboard', label: 'Balance', icon: LayoutGrid },
  { id: 'tokens', label: 'Buy Tokens', icon: ShoppingCart },
  { id: 'history', label: 'Token History', icon: KeyRound },
  { id: 'usage', label: 'Usage', icon: LineChart },
  { id: 'predictions', label: 'Predictions', icon: CalendarClock },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'system', label: 'Outages', icon: ZapOff },
];

const AVATAR_INITIALS = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onLogout }) => {
  const [active, setActive] = useState<NavId>('dashboard');
  const [query, setQuery] = useState('');

  const user = getSession().user;
  const userName = user?.name || 'W. Kamau';

  const renderContent = () => {
    switch (active) {
      case 'dashboard':
        return <TenantDashboardPage onNavigate={(p) => setActive(p as NavId)} />;
      case 'tokens':
        return <BuyTokensPage />;
      case 'history':
        return <TokenHistoryPage />;
      case 'usage':
        return <UsagePage />;
      case 'predictions':
        return <PredictionsPage />;
      case 'budget':
        return <EnergyBudget />;
      case 'system':
        return <OutagesPage />;
      case 'settings':
        return <SettingsPage role="tenant" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans">
      <div className="flex min-h-screen">
        {/* ── Sidebar (230px, light gray) ─────────────────────────────────── */}
        <aside className="w-[230px] shrink-0 bg-[#F9FAFB] border-r border-gray-200 flex flex-col fixed inset-y-0 left-0">
          {/* Wordmark */}
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center gap-2.5 select-none">
              <span className="h-9 w-9 rounded-xl bg-leaf-500 flex items-center justify-center text-white shadow-sm shadow-leaf-500/30">
                <Zap size={18} fill="currentColor" />
              </span>
              <span className="text-[16px] font-extrabold tracking-tight text-leaf-600">
                PowerSmart<span className="text-leaf-500">-KE</span>
              </span>
            </div>
          </div>

          {/* Primary nav */}
          <nav className="px-3 flex-1 pt-2 space-y-1">
            {NAV_ITEMS.map((n) => {
              const Icon = n.icon;
              const isActive = active === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setActive(n.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-leaf-500 text-white shadow-sm shadow-leaf-500/20'
                      : 'text-gray-600 hover:bg-white hover:text-leaf-600'
                  }`}
                >
                  <Icon size={17} className={isActive ? 'text-white' : 'text-gray-400'} />
                  {n.label}
                </button>
              );
            })}
          </nav>

          {/* Divider + secondary */}
          <div className="px-3 pb-4 pt-1">
            <div className="border-t border-gray-200 mx-3 mb-3" />
            {[
              { label: 'Support', icon: Headset },
              { label: 'App Status', icon: Cloud },
            ].map((l) => {
              const Icon = l.icon;
              return (
                <a
                  key={l.label}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="flex items-center gap-3 px-3 py-2 rounded-[10px] text-[12.5px] font-semibold text-gray-400 hover:text-leaf-600 hover:bg-white transition-colors cursor-pointer"
                >
                  <Icon size={16} />
                  {l.label}
                </a>
              );
            })}
          </div>

          {/* Pinned Log Out */}
          <div className="px-3 pb-5">
            <button
              onClick={onLogout}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-[13px] font-extrabold transition-colors cursor-pointer"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </aside>

        {/* ── Main area ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 ml-[230px] flex flex-col">
          {/* Top bar */}
          <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between gap-4 px-5 md:px-6 sticky top-0 z-20">
            <div className="relative hidden sm:block">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-56 lg:w-72 pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-leaf-500/20 focus:border-leaf-500/40 transition-all"
              />
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell size={19} className="text-gray-500" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>
              <button
                onClick={() => setActive('settings')}
                className={`p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer ${
                  active === 'settings' ? 'text-leaf-600 bg-leaf-50' : 'text-gray-500'
                }`}
                aria-label="Settings"
              >
                <Settings size={19} />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-leaf-400 to-leaf-700 text-white text-[12px] font-bold grid place-items-center ring-2 ring-white ml-1">
                {AVATAR_INITIALS(userName)}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-5 md:p-7 overflow-y-auto">
            {renderContent()}
          </main>

          {/* Footer */}
          <footer className="shrink-0 h-12 bg-white border-t border-gray-200 flex items-center justify-between gap-4 px-5 md:px-6 text-[11.5px] text-gray-400">
            <span className="font-extrabold text-gray-500">PowerSmart-KE</span>
            <span className="hidden md:block">© 2026 PowerSmart-KE. All rights reserved.</span>
            <span className="flex items-center gap-3">
              <a href="#" className="hover:text-leaf-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-leaf-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-leaf-600 transition-colors">Contact Support</a>
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
