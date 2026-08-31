import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  KeyRound,
  PieChart,
  Activity,
} from 'lucide-react';
import { PortalLayout, PortalPage, NavItem, AppNotification } from '../layouts/PortalLayout';
import { MeterDetailsPage } from '../pages/MeterDetailsPage';
import { BuyTokensPage } from '../pages/BuyTokensPage';
import { EnergyBudget } from '../pages/EnergyBudget';
import { OutagesPage } from '../pages/OutagesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { meter, Meter, Prediction, getSession } from '../services/api';

interface TenantPortalProps {
  onLogout?: () => void;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tokens', label: 'Tokens', icon: KeyRound },
  { id: 'usage', label: 'Usage', icon: PieChart },
  { id: 'system', label: 'System', icon: Activity },
];

export const TenantPortal: React.FC<TenantPortalProps> = ({ onLogout }) => {
  const [page, setPage] = useState<PortalPage>('dashboard');
  const [meterData, setMeterData] = useState<Meter | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  const user = getSession().user;
  const userName = user?.name || 'W. Kamau';

  const refresh = useCallback(async () => {
    try {
      const m = await meter.status();
      setMeterData(m);
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

  const remaining = meterData?.units_remaining ?? 0;
  const daysLeft =
    prediction && typeof prediction.days_remaining === 'number' ? prediction.days_remaining : null;

  const notifications: AppNotification[] = [];
  if (daysLeft !== null && daysLeft <= 5) {
    notifications.push({
      id: 'runout',
      title: `Power runs out in ~${daysLeft.toFixed(1)} days`,
      time: 'Now',
      tone: 'amber',
    });
  }
  if (remaining <= 15) {
    notifications.push({ id: 'low', title: 'Balance critically low — top up soon', time: 'Now', tone: 'red' });
  }

  const titles: Record<PortalPage, string> = {
    dashboard: 'Meter Details',
    tokens: 'Buy Tokens',
    usage: 'Energy Budget',
    system: 'Outages',
    settings: 'Settings',
    properties: 'Properties',
    tenants: 'Tenants',
    transactions: 'Transactions',
    users: 'Users',
  };

  return (
    <PortalLayout
      userName={userName}
      roleLabel="Tenant"
      title={titles[page]}
      active={page}
      onNavigate={setPage}
      onLogout={onLogout}
      onBuyTokens={() => setPage('tokens')}
      notifications={notifications}
      nav={NAV}
    >
      {page === 'dashboard' && <MeterDetailsPage />}
      {page === 'tokens' && <BuyTokensPage />}
      {page === 'usage' && <EnergyBudget />}
      {page === 'system' && <OutagesPage />}
      {page === 'settings' && <SettingsPage role="tenant" />}
    </PortalLayout>
  );
};

export default TenantPortal;
