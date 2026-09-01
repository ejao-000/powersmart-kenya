import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Coins,
  PieChart,
  Activity,
} from 'lucide-react';
import { PortalLayout, PortalPage, NavItem, AppNotification } from '../layouts/PortalLayout';
import { PortfolioOverview } from '../pages/PortfolioOverview';
import { PropertiesOverview } from '../pages/PropertiesOverview';
import { TenantsPage } from '../pages/TenantsPage';
import { BulkDistribution } from '../pages/BulkDistribution';
import { EnergyBudget } from '../pages/EnergyBudget';
import { SystemHealth } from '../pages/SystemHealth';
import { SettingsPage } from '../pages/SettingsPage';
import { meters, Meter, getSession } from '../services/api';

interface LandlordPortalProps {
  onLogout?: () => void;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'tokens', label: 'Tokens', icon: Coins },
  { id: 'usage', label: 'Usage', icon: PieChart },
  { id: 'system', label: 'System', icon: Activity },
];

const balanceKsh = (m: Meter) => Math.round(m.units_remaining * 5);

export const LandlordPortal: React.FC<LandlordPortalProps> = ({ onLogout }) => {
  const [page, setPage] = useState<PortalPage>('dashboard');
  const [meterList, setMeterList] = useState<Meter[]>([]);

  const user = getSession().user;
  const userName = user?.name || 'Owner';

  const refresh = useCallback(async () => {
    try {
      setMeterList(await meters.list());
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const notifications: AppNotification[] = [
    ...meterList
      .filter((m) => balanceKsh(m) <= 150)
      .map((m) => ({
        id: 'crit-' + m.id,
        title: `${m.name || 'Unit ' + m.meter_number} balance is critical`,
        time: 'Now',
        tone: 'red' as const,
      })),
    ...meterList
      .filter((m) => balanceKsh(m) > 150 && balanceKsh(m) <= 400)
      .map((m) => ({
        id: 'low-' + m.id,
        title: `${m.name || 'Unit ' + m.meter_number} balance is getting low`,
        time: 'Now',
        tone: 'amber' as const,
      })),
  ];

  const titles: Record<PortalPage, string> = {
    dashboard: 'Portfolio Overview',
    properties: 'Properties',
    tenants: 'Tenants',
    tokens: 'Bulk Distribution',
    usage: 'Energy Budget',
    system: 'System Health',
    settings: 'Settings',
    transactions: 'Transactions',
    users: 'Users',
    history: 'Token History',
    predictions: 'Predictions',
    budget: 'Budget',
  };

  return (
    <PortalLayout
      userName={userName}
      roleLabel="Landlord"
      title={titles[page]}
      active={page}
      onNavigate={setPage}
      onLogout={onLogout}
      onBuyTokens={() => setPage('tokens')}
      notifications={notifications}
      nav={NAV}
    >
      {page === 'dashboard' && (
        <PortfolioOverview
          onNavigateProperties={() => setPage('properties')}
          onNavigateTokens={() => setPage('tokens')}
        />
      )}
      {page === 'properties' && <PropertiesOverview />}
      {page === 'tenants' && <TenantsPage />}
      {page === 'tokens' && <BulkDistribution />}
      {page === 'usage' && <EnergyBudget />}
      {page === 'system' && <SystemHealth />}
      {page === 'settings' && <SettingsPage role="landlord" />}
    </PortalLayout>
  );
};

export default LandlordPortal;
