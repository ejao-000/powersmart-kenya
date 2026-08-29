import React, { useEffect, useState } from 'react';
import { Dashboard } from './screens/Dashboard';
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
          window.location.replace('/admin-dashboard.html');
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
          if (res.user.role === 'admin') {
            window.location.replace('/admin-dashboard.html');
            return;
          }
          setStatus('authed');
        }}
      />
    );
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default App;
