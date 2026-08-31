import React, { useEffect, useState, useCallback } from 'react';
import {
  Zap,
  LayoutGrid,
  Building2,
  Users,
  LineChart,
  Settings,
  Headset,
  Cloud,
  Search,
  Bell,
  Clock,
  AlertTriangle,
  Wallet,
  LifeBuoy,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { meter, Meter, Prediction, getSession } from '../services/api';
import { BuyTokensPage } from '../pages/BuyTokensPage';
import { EnergyBudget } from '../pages/EnergyBudget';
import { OutagesPage } from '../pages/OutagesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { PropertiesOverview } from '../pages/PropertiesOverview';
import { TenantsPage } from '../pages/TenantsPage';

interface DashboardHomeProps {
  userName?: string;
  onLogout?: () => void;
}

type NavId = 'dashboard' | 'properties' | 'tenants' | 'tokens' | 'usage' | 'system' | 'settings';

const NAV_ITEMS: { id: NavId; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'tokens', label: 'Tokens', icon: Zap },
  { id: 'usage', label: 'Usage', icon: LineChart },
  { id: 'system', label: 'System', icon: Settings },
];

const usageTrend = [
  { day: 'Mon', kwh: 2.8 },
  { day: 'Tue', kwh: 3.4 },
  { day: 'Wed', kwh: 3.1 },
  { day: 'Thu', kwh: 4.2 },
  { day: 'Fri', kwh: 3.8 },
  { day: 'Sat', kwh: 5.2 },
  { day: 'Sun', kwh: 4.4 },
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
  const [meterData, setMeterData] = useState<Meter | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [query, setQuery] = useState('');

  const user = getSession().user;
  const userName = user?.name || 'W. Kamau';

  const refresh = useCallback(async () => {
    try {
      setMeterData(await meter.status());
      try {
        setPrediction(await meter.prediction());
      } catch {
        /* optional */
      }
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const balance = meterData?.units_remaining ?? 18.4;
  const daysLeft = prediction?.days_remaining ?? 3.2;
  const meterNumber = meterData?.meter_number || '4590-1234-8821';
  const todayUsage = meterData?.daily_avg_units || 5.2;
  const todayCost = Math.round(todayUsage * 5);
  const weeklyUsed = 780;

  const renderDashboard = () => (
    <div className="space-y-5">
      {/* Header + alert */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] lg:text-[30px] font-extrabold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Meter {meterNumber}</p>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 md:max-w-[340px]">
          <span className="h-8 w-8 shrink-0 rounded-lg bg-red-100 text-red-500 flex items-center justify-center">
            <AlertTriangle size={16} />
          </span>
          <div>
            <p className="text-[13px] font-extrabold text-red-600 leading-tight">Low Balance Alert</p>
            <p className="text-[11.5px] text-red-500 mt-0.5">Run-out predicted in ~{daysLeft.toFixed(1)} days.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Featured balance card */}
          <div className="rounded-2xl border-2 border-leaf-500 bg-white p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-leaf-50/70 pointer-events-none" />
            <div className="flex items-start justify-between relative">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                Current Balance
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-100 text-[11px] font-extrabold text-red-500">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Low
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5 relative">
              <span className="text-[52px] font-black tracking-tight text-gray-900 leading-none">
                {balance.toFixed(1)}
              </span>
              <span className="text-[18px] font-bold text-gray-500">kWh</span>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 relative">
              <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-gray-500">
                <Clock size={15} className="text-gray-400" />
                ~{daysLeft.toFixed(1)} days remaining based on current usage
              </span>
              <button
                onClick={() => setActive('tokens')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-leaf-700 hover:bg-leaf-800 text-white text-[13.5px] font-extrabold transition-colors cursor-pointer shadow-lg shadow-leaf-700/20"
              >
                <Zap size={16} fill="currentColor" /> Buy Tokens
              </button>
            </div>
          </div>

          {/* Usage trends */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-extrabold text-gray-900">Usage Trends</h3>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-[12px] font-semibold text-gray-600 hover:border-leaf-400 hover:text-leaf-600 transition-colors cursor-pointer">
                Last 7 Days
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageTrend} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F9D6E" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#0F9D6E" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#D1D5DB' }} />
                  <Tooltip
                    cursor={{ stroke: '#0F9D6E', strokeDasharray: '3 3' }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 600 }}
                    formatter={(value: any) => [`${value} kWh`, 'Usage']}
                  />
                  <Area
                    type="monotone"
                    dataKey="kwh"
                    stroke="#0F9D6E"
                    strokeWidth={2.5}
                    fill="url(#trendFill)"
                    dot={{ r: 3.5, fill: '#fff', stroke: '#0F9D6E', strokeWidth: 2.5 }}
                    activeDot={{ r: 5, fill: '#0F9D6E', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-gray-500">Today's Usage</p>
              <p className="mt-1 text-[22px] font-extrabold tracking-tight text-gray-900">
                {todayUsage.toFixed(1)} <span className="text-[13px] font-bold text-gray-400">kWh</span>
              </p>
            </div>
            <span className="h-10 w-10 rounded-full bg-leaf-50 text-leaf-600 flex items-center justify-center">
              <Zap size={18} />
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-gray-500">Today's Cost</p>
              <p className="mt-1 text-[22px] font-extrabold tracking-tight text-gray-900">
                KES {todayCost}
              </p>
            </div>
            <span className="h-10 w-10 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center">
              <Wallet size={18} />
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-gray-500">Weekly Budget</p>
              <span className="text-[13px] font-extrabold text-gray-900">
                780 / <span className="text-gray-400">1000</span> <span className="text-gray-400 font-bold">KES</span>
              </span>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-leaf-500" style={{ width: '78%' }} />
            </div>
            <p className="mt-2 text-[11.5px] font-bold text-gray-500 text-right">78% used</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-[15px] font-extrabold text-gray-900">Support &amp; Actions</h3>
            <p className="mt-1 text-[12.5px] text-gray-500 leading-relaxed">
              Need help? Review your transactions or report a power outage in your area.
            </p>
            <div className="mt-4 space-y-2.5">
              <button
                onClick={() => setActive('system')}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 bg-white text-[13px] font-bold text-gray-700 hover:border-leaf-500 hover:text-leaf-600 transition-colors cursor-pointer"
              >
                ⟲ View Transaction History
              </button>
              <button
                onClick={() => setActive('system')}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 bg-white text-[13px] font-bold text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer"
              >
                <AlertTriangle size={15} /> Report Outage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (active) {
      case 'dashboard':
        return renderDashboard();
      case 'properties':
        return <PropertiesOverview />;
      case 'tenants':
        return <TenantsPage />;
      case 'tokens':
        return <BuyTokensPage />;
      case 'usage':
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

          {/* Pinned Buy Tokens */}
          <div className="px-3 pb-5">
            <button
              onClick={() => setActive('tokens')}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-leaf-500 hover:bg-leaf-600 text-white text-[13px] font-extrabold shadow-md shadow-leaf-500/20 transition-colors cursor-pointer"
            >
              <Zap size={16} fill="currentColor" /> Buy Tokens
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
            <span className="hidden md:block">© 2024 PowerSmart-KE. All rights reserved.</span>
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
