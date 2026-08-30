import React, { useEffect, useState } from 'react';
import { AdminPortal } from './screens/AdminPortal';
import { TenantPortal } from './screens/TenantPortal';
import { LandlordPortal } from './screens/LandlordPortal';
import { Auth } from './screens/Auth';
import { getSession, auth, clearSession } from './services/api';

export function App() {
  const [status, setStatus] = useState<'loading' | 'authed' | 'guest'>('loading');

  useEffect(() => {
    const session = getSession();
    if (!session.token) {
      setStatus('guest');
      return;
    }
    auth
      .me()
      .then((res) => {
        const user = res.data;
        if (user.role === 'admin') {
          setStatus('authed');
          return;
        }
        setStatus('authed');
      })
      .catch(() => {
        clearSession();
        setStatus('guest');
      });
  }, []);

  const handleLogout = () => {
    clearSession();
    setStatus('guest');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse">
          ⚡
        </div>
      </div>
    );
  }

  if (status === 'guest') {
    return (
      <Auth
        onAuthenticated={(res) => {
          setStatus('authed');
        }}
      />
    );
  }

  const user = getSession().user;
  if (user?.role === 'admin') {
    return <AdminPortal userName={user.name} onLogout={handleLogout} />;
  }
  if (user?.role === 'landlord') {
    return <LandlordPortal onLogout={handleLogout} />;
  }
  return <TenantPortal onLogout={handleLogout} />;
}

export default App;
