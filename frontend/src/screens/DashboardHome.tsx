import React, { useState } from 'react';
import {
  Zap,
  LayoutGrid,
  ShoppingCart,
  KeyRound,
  LineChart,
  Brain,
  Users,
  Trophy,
  Store,
  WifiOff,
  ShoppingBag,
  HandCoins,
  Mic,
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
import { EnergyIntel } from '../pages/EnergyIntel';
import { PowerPools } from '../pages/PowerPools';
import { SavingsHub } from '../pages/SavingsHub';
import { MerchantMode } from '../pages/MerchantMode';
import { OfflineKit } from '../pages/OfflineKit';
import { Marketplace } from '../pages/Marketplace';
import { PowerHelp } from '../pages/PowerHelp';
import { VoiceAssistant } from '../pages/VoiceAssistant';
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
  { id: 'intelligence', label: 'Energy Intelligence', icon: Brain },
  { id: 'pools', label: 'Power Pools', icon: Users },
  { id: 'savings', label: 'Savings Hub', icon: Trophy },
  { id: 'merchant', label: 'Vendor Mode', icon: Store },
  { id: 'offline', label: 'Offline Kit', icon: WifiOff },
  { id: 'market', label: 'Marketplace', icon: ShoppingBag },
  { id: 'help', label: 'Power Help', icon: HandCoins },
  { id: 'voice', label: 'Voice Assistant', icon: Mic },
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
    intelligence: 'Energy Intelligence',
    pools: 'Power Pools',
    savings: 'Savings Hub',
    merchant: 'Vendor Mode',
    offline: 'Offline Kit',
    market: 'Marketplace',
    help: 'Power Help',
    voice: 'Voice Assistant',
    insights: 'Unit Insights',
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
      case 'intelligence':
        return <EnergyIntel />;
      case 'pools':
        return <PowerPools />;
      case 'savings':
        return <SavingsHub />;
      case 'merchant':
        return <MerchantMode />;
      case 'offline':
        return <OfflineKit />;
      case 'market':
        return <Marketplace />;
      case 'help':
        return <PowerHelp />;
      case 'voice':
        return <VoiceAssistant />;
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
