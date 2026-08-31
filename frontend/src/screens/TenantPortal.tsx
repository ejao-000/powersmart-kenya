import React from 'react';
import { getSession } from '../services/api';
import { DashboardHome } from './DashboardHome';

interface TenantPortalProps {
  onLogout?: () => void;
}

export const TenantPortal: React.FC<TenantPortalProps> = ({ onLogout }) => {
  const user = getSession().user;
  const userName = user?.name || 'W. Kamau';

  return <DashboardHome userName={userName} onLogout={onLogout} />;
};

export default TenantPortal;
