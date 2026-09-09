import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Coins,
  Brain,
  Gauge,
  Trophy,
  Store,
  Activity,
} from 'lucide-react';
import { PortalLayout, PortalPage, NavItem, AppNotification } from '../layouts/PortalLayout';
import { PortfolioOverview } from '../pages/PortfolioOverview';
import { PropertiesOverview } from '../pages/PropertiesOverview';
import { TenantsPage } from '../pages/TenantsPage';
import { BulkDistribution } from '../pages/BulkDistribution';
import { EnergyIntel } from '../pages/EnergyIntel';
import { PowerPools } from '../pages/PowerPools';
import { UnitInsights } from '../pages/UnitInsights';
import { SavingsHub } from '../pages/SavingsHub';
import { MerchantMode } from '../pages/MerchantMode';
import { SystemHealth } from '../pages/SystemHealth';
import { SettingsPage } from '../pages/SettingsPage';
import { meters, Meter, getSession } from '../services/api';

interface LandlordPortalProps {
  onLogout?: () => void;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'properties', label: 'Property Management', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'tokens', label: 'Bulk Tokens', icon: Coins },
  { id: 'insights', label: 'Unit Insights', icon: Gauge },
  { id: 'usage', label: 'Energy Intelligence', icon: Brain },
  { id: 'pools', label: 'Power Pools', icon: Users },
  { id: 'savings', label: 'Savings Hub', icon: Trophy },
  { id: 'merchant', label: 'Vendor Mode', icon: Store },
  { id: 'system', label: 'System Health', icon: Activity },
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
    properties: 'Property Management',
    tenants: 'Tenants',
    tokens: 'Bulk Token Purchase',
    insights: 'Unit Insights',
    usage: 'Energy Intelligence',
    pools: 'Power Pools',
    savings: 'Savings Hub',
    merchant: 'Vendor Mode',
    system: 'System Health',
    settings: 'Alerts & Configuration',
    transactions: 'Transactions',
    users: 'Users',
    history: 'Token History',
    predictions: 'Predictions',
    budget: 'Budget',
    intelligence: 'Energy Intelligence',
    meter: 'Meter Management',
    alerts: 'Alerts',
    support: 'Support',
  };

  return (
    <PortalLayout
      userName={userName}
      portalLabel="Landlord Portal"
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
      {page === 'dashboard' && (
        <PortfolioOverview
          onNavigateProperties={() => setPage('properties')}
          onNavigateTokens={() => setPage('tokens')}
        />
      )}
      {page === 'properties' && <PropertiesOverview />}
      {page === 'tenants' && <TenantsPage />}
      {page === 'tokens' && <BulkDistribution />}
      {page === 'insights' && <UnitInsights />}
      {page === 'usage' && <EnergyIntel />}
      {page === 'pools' && <PowerPools />}
      {page === 'savings' && <SavingsHub />}
      {page === 'merchant' && <MerchantMode />}
      {page === 'system' && <SystemHealth />}
      {page === 'settings' && <SettingsPage role="landlord" />}
    </PortalLayout>
  );
};

export default LandlordPortal;
