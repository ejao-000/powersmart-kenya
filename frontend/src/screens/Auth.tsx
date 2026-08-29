import React, { useState } from 'react';
import { Zap, Home, Building2, ShieldCheck, Loader2 } from 'lucide-react';
import { auth, saveSession, AuthResponse } from '../services/api';

interface AuthProps {
  onAuthenticated: (res: AuthResponse) => void;
}

type View = 'login' | 'register';

export const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [view, setView] = useState<View>('login');
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regMeter, setRegMeter] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const run = async (fn: () => Promise<AuthResponse>) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fn();
      saveSession(res.token, res.user);
      onAuthenticated(res);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please enter your email and password.');
      return;
    }
    run(() => auth.login({ email: loginEmail, password: loginPassword }));
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPhone || !regMeter || !regPassword) {
      setError('Please fill in every field to create your account.');
      return;
    }
    run(() =>
      auth.register({
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        meter_account: regMeter,
        role,
      })
    );
  };

  const input =
    'w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all';
  const label = 'block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide';

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#0B0F19] text-slate-100">
      {/* Brand panel */}
      <aside className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden border-r border-slate-800/80 bg-[radial-gradient(60%_50%_at_80%_0%,rgba(245,158,11,0.16),transparent_60%),radial-gradient(60%_50%_at_0%_100%,rgba(56,189,248,0.10),transparent_60%),linear-gradient(180deg,#0d1626,#0a1120)]">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(56,189,248,0.05)_1px,transparent_1px)] [background-size:44px_44px] pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Zap size={22} />
          </div>
          <div>
            <div className="font-bold tracking-tight text-white">PowerSmart</div>
            <div className="text-xs text-slate-400">Kenya Utility Engine</div>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Secure Client Portal
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            Power, planned.
            <br />
            <span className="text-cyan-400">Never in the dark again.</span>
          </h1>
          <p className="text-slate-400 mt-4 text-sm leading-relaxed">
            Monitor your prepaid meter in real time, buy tokens in seconds and
            forecast your usage with confidence.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-400">
            {[
              'Real-time meter telemetry & depletion forecasts',
              'Instant M-Pesa & Airtel token vending',
              'Landlord multi-meter fleet management',
              'Bank-grade security & privacy protection',
            ].map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 grid place-items-center text-xs">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 text-xs text-slate-500 flex justify-between">
          <span>© 2026 PowerSmart Kenya</span>
          <a href="/landing.html" className="text-slate-400 hover:text-slate-200 transition-colors">
            Explore website →
          </a>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap size={22} />
            </div>
            <div>
              <div className="font-bold tracking-tight text-white">PowerSmart</div>
              <div className="text-xs text-slate-400">Kenya Utility Engine</div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-8 backdrop-blur-xl shadow-2xl">
            <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-950 border border-slate-800 rounded-xl mb-8">
              <button
                type="button"
                onClick={() => { setView('login'); setError(null); }}
                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'login' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setView('register'); setError(null); }}
                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'register' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Create account
              </button>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {view === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-white">Welcome back</h2>
                  <p className="text-sm text-slate-400 mt-1">Sign in to your portal.</p>
                </div>
                <div>
                  <label className={label}>Email address</label>
                  <input
                    type="email"
                    className={input}
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className={label}>Password</label>
                  <input
                    type="password"
                    className={input}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Signing in…' : 'Sign in securely'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Create your account</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Verify your meter and get started in under a minute.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('tenant')}
                    className={`p-3 rounded-xl border text-left transition-all ${role === 'tenant' ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-800 bg-slate-950'}`}
                  >
                    <Home size={18} className="text-cyan-400 mb-2" />
                    <div className="font-bold text-sm text-slate-100">Tenant / Consumer</div>
                    <div className="text-[11px] text-slate-500">Track & buy tokens</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('landlord')}
                    className={`p-3 rounded-xl border text-left transition-all ${role === 'landlord' ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-800 bg-slate-950'}`}
                  >
                    <Building2 size={18} className="text-cyan-400 mb-2" />
                    <div className="font-bold text-sm text-slate-100">Landlord</div>
                    <div className="text-[11px] text-slate-500">Manage many meters</div>
                  </button>
                </div>

                <div>
                  <label className={label}>Full name</label>
                  <input className={input} placeholder="Emma Jane" value={regName} onChange={(e) => setRegName(e.target.value)} />
                </div>
                <div>
                  <label className={label}>Email address</label>
                  <input type="email" className={input} placeholder="you@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Phone</label>
                    <input type="tel" className={input} placeholder="0712 345 678" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>Meter account no.</label>
                    <input type="text" inputMode="numeric" className={input} placeholder="8–12 digit KP account" value={regMeter} onChange={(e) => setRegMeter(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={label}>Password</label>
                  <input type="password" className={input} placeholder="8+ chars, A-Z, 0-9" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Creating account…' : 'Create my account'}
                </button>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-slate-400">
              {view === 'login' ? (
                <span>New to PowerSmart?{' '}
                  <button type="button" onClick={() => { setView('register'); setError(null); }} className="text-cyan-400 font-bold hover:underline cursor-pointer">Create an account</button>
                </span>
              ) : (
                <span>Already have an account?{' '}
                  <button type="button" onClick={() => { setView('login'); setError(null); }} className="text-cyan-400 font-bold hover:underline cursor-pointer">Sign in</button>
                </span>
              )}
            </div>
          </div>

          <p className="text-center mt-6 text-xs text-slate-500 flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            System secure · TLS · Encrypted
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
