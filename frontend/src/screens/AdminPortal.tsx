import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Coins,
  Activity,
} from 'lucide-react';
import { PortalLayout, PortalPage, NavItem, AppNotification } from '../layouts/PortalLayout';
import { PlatformOverview } from '../pages/PlatformOverview';
import { TransactionsPage } from '../pages/TransactionsPage';
import { UserManagement } from '../pages/UserManagement';
import { BulkDistribution } from '../pages/BulkDistribution';
import { SystemHealth } from '../pages/SystemHealth';
import { SettingsPage } from '../pages/SettingsPage';

interface AdminPortalProps {
  userName: string;
  onLogout?: () => void;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'tokens', label: 'Bulk Tokens', icon: Coins },
  { id: 'system', label: 'System Config', icon: Activity },
];

export const AdminPortal: React.FC<AdminPortalProps> = ({ userName, onLogout }) => {
  const [page, setPage] = useState<PortalPage>('dashboard');

  const notifications: AppNotification[] = [
    { id: 'n1', title: 'Manual intervention required — PS-3D8F2A', time: '2 mins ago', tone: 'red' },
    { id: 'n2', title: 'Spiking failures in Nairobi West', time: '6 mins ago', tone: 'red' },
    { id: 'n3', title: 'Token latency above 1s threshold', time: '38 mins ago', tone: 'amber' },
  ];

  const titles: Record<PortalPage, string> = {
    dashboard: 'Platform Overview',
    users: 'User Management',
    transactions: 'Token Ledger & Payments',
    tokens: 'Bulk Token Purchase',
    system: 'System Config & Telemetry',
    settings: 'Settings',
    properties: 'Properties',
    tenants: 'Tenants',
    usage: 'Usage',
    history: 'Token History',
    predictions: 'Predictions',
    budget: 'Budget',
    meter: 'Meter Management',
    alerts: 'Alerts',
    support: 'Support',
  };

  return (
    <PortalLayout
      userName={userName}
      portalLabel="Admin Portal"
      title={titles[page]}
      active={page}
      onNavigate={setPage}
      onLogout={onLogout}
      onSwitchPortal={onLogout}
      onTopup={() => setPage('tokens')}
      topupLabel="Bulk Tokens"
      accent="blue"
      notifications={notifications}
      nav={NAV}
    >
      {page === 'dashboard' && <PlatformOverview onNavigateTransactions={() => setPage('transactions')} />}
      {page === 'users' && <UserManagement />}
      {page === 'transactions' && <TransactionsPage />}
      {page === 'tokens' && <BulkDistribution />}
      {page === 'system' && <SystemHealth />}
      {page === 'settings' && <SettingsPage role="admin" />}
    </PortalLayout>
  );
};

export default AdminPortal;
