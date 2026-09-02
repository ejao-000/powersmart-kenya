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
  Cable,
  SlidersHorizontal,
} from 'lucide-react';
import { getSession } from '../services/api';
import { PortalLayout, PortalPage, NavItem } from '../layouts/PortalLayout';
import { TenantDashboardPage } from '../pages/TenantDashboardPage';
import { MeterDetailsPage } from '../pages/MeterDetailsPage';
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

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'meter', label: 'Meter Management', icon: Cable },
  { id: 'tokens', label: 'Purchase Tokens', icon: ShoppingCart },
  { id: 'history', label: 'Token History', icon: KeyRound },
  { id: 'usage', label: 'Analytics', icon: LineChart },
  { id: 'predictions', label: 'AI Predictions', icon: CalendarClock },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'system', label: 'Outages', icon: ZapOff },
  { id: 'settings', label: 'Alerts & Settings', icon: SlidersHorizontal },
];

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onLogout }) => {
  const [page, setPage] = useState<PortalPage>('dashboard');

  const user = getSession().user;
  const userName = user?.name || 'W. Kamau';

  const titles: Record<PortalPage, string> = {
    dashboard: 'Overview',
    meter: 'Meter Management',
    tokens: 'Purchase Tokens',
    history: 'Token History',
    usage: 'Analytics',
    predictions: 'AI Predictions',
    budget: 'Energy Budget',
    system: 'Outages & Status',
    settings: 'Alerts & Settings',
    properties: 'Properties',
    tenants: 'Tenants',
    alerts: 'Alerts',
    support: 'Support',
    users: 'Users',
    transactions: 'Transactions',
  };

  const notifications = [
    { id: 't-low', title: 'Reminder: your balance may run out soon.', time: 'Today · 09:40', tone: 'amber' as const },
    { id: 't-ok', title: 'Token KSh 500 applied to your meter.', time: 'Yesterday', tone: 'green' as const },
  ];

  const renderContent = () => {
    switch (page) {
      case 'dashboard':
        return <TenantDashboardPage onNavigate={(p) => setPage(p as PortalPage)} />;
      case 'meter':
        return <MeterDetailsPage />;
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
    <PortalLayout
      userName={userName}
      portalLabel="Tenant Portal"
      title={titles[page]}
      active={page}
      onNavigate={setPage}
      onLogout={onLogout}
      onSwitchPortal={onLogout}
      onTopup={() => setPage('tokens')}
      topupLabel="Top-up Now"
      accent="gold"
      notifications={notifications}
      nav={NAV_ITEMS}
    >
      {renderContent()}
    </PortalLayout>
  );
};

export default DashboardHome;
