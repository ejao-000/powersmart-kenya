import React, { useState } from 'react';
import { Zap, Loader2, ArrowRight, Eye, EyeOff, User, Lock, Mail, Phone, Hash } from 'lucide-react';
import { auth, saveSession, AuthResponse } from '../services/api';
import { LandingPage } from './LandingPage';
import { LoginScreen } from './LoginScreen';
import { RoleSelectScreen, SelectedRole } from './RoleSelectScreen';

interface AuthProps {
  onAuthenticated: (res: AuthResponse) => void;
}

type Stage = 'landing' | 'login' | 'roleselect' | 'register';

const getInitialStage = (): Stage => {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view === 'register') return 'roleselect';
  if (view === 'login') return 'login';
  return 'landing';
};

export const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [stage, setStage] = useState<Stage>(getInitialStage);
  const [role, setRole] = useState<SelectedRole>('tenant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regMeter, setRegMeter] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  const handleLogin = (email: string, password: string) =>
    run(() => auth.login({ email, password }));

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

  if (stage === 'landing') {
    return (
      <LandingPage
        onJoin={() => {
          setError(null);
          setStage('roleselect');
        }}
        onLogin={() => {
          setError(null);
          setStage('login');
        }}
      />
    );
  }

  if (stage === 'login') {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onBack={() => {
          setError(null);
          setStage('landing');
        }}
      />
    );
  }

  if (stage === 'roleselect') {
    return (
      <RoleSelectScreen
        onContinue={(r) => {
          setRole(r);
          setError(null);
          setStage('register');
        }}
        onLogin={() => {
          setError(null);
          setStage('login');
        }}
      />
    );
  }

  // ── Registration (continuation of the role-selection onboarding) ─────────
  const input =
    'w-full px-3.5 py-3 rounded-xl bg-white border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-leaf-500/20 focus:border-leaf-500/50 transition-all';
  const label = 'block text-[12px] font-bold text-gray-700 mb-1.5';

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-5 py-10 font-sans">
      <div className="w-full max-w-md">
        <button
          onClick={() => {
            setError(null);
            setStage('roleselect');
          }}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
        >
          ← Back
        </button>

        <div className="rounded-2xl bg-white border border-gray-200 p-8">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            <span className="h-2 flex-1 rounded-full bg-leaf-500" />
            <span className="h-2 flex-1 rounded-full bg-leaf-500" />
            <span className="text-[11px] font-bold text-gray-400 ml-1">Step 2 of 2</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="h-12 w-12 rounded-2xl bg-leaf-500 flex items-center justify-center text-white shadow-lg shadow-leaf-500/30">
              <Zap size={24} fill="currentColor" />
            </span>
            <h1 className="mt-5 text-[24px] font-black tracking-tight text-gray-900">Create your account</h1>
            <p className="mt-1.5 text-[13.5px] text-gray-500">
              {role === 'tenant' && 'Track your meter, buy tokens and stay powered.'}
              {role === 'landlord' && 'Manage your properties and tenant billing.'}
            </p>
          </div>

          {error && (
            <div className="mt-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="mt-7 space-y-4">
            <div>
              <label className={label}>Full name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><User size={16} /></span>
                <input className={`${input} pl-10`} placeholder="Emma Jane" value={regName} onChange={(e) => setRegName(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={label}>Email address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><Mail size={16} /></span>
                <input type="email" className={`${input} pl-10`} placeholder="you@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Phone</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><Phone size={16} /></span>
                  <input type="tel" className={`${input} pl-10`} placeholder="0712 345 678" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={label}>Meter account no.</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><Hash size={16} /></span>
                  <input type="text" inputMode="numeric" className={`${input} pl-10`} placeholder="8–12 digit KP no." value={regMeter} onChange={(e) => setRegMeter(e.target.value)} />
                </div>
              </div>
            </div>
            <div>
              <label className={label}>Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><Lock size={16} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`${input} pl-10 pr-11`}
                  placeholder="8+ chars, A-Z, 0-9"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-leaf-700 hover:bg-leaf-800 text-white text-[15px] font-extrabold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer shadow-lg shadow-leaf-700/20"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : 'Create my account'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[13px] text-gray-500">
          Already have an account?{' '}
          <button
            onClick={() => {
              setError(null);
              setStage('login');
            }}
            className="font-bold text-leaf-600 hover:text-leaf-700 hover:underline cursor-pointer"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
