import React, { useState } from 'react';
import { Zap, User, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { CitySkyline } from '../components/CitySkyline';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onBack: () => void;
  onForgot?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onBack, onForgot }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0B1120] flex items-center justify-center px-5 py-10 font-sans overflow-hidden">
      {/* Cityscape backdrop */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1b3d] via-[#0B1120] to-[#060a14]" />
        <CitySkyline className="absolute bottom-0 left-0 right-0 w-full h-[38%] opacity-40" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-[#0B1120]/30" />
      </div>

      <div className="relative w-full max-w-[420px]">
        {/* Back */}
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          ← Back to home
        </button>

        <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-2xl shadow-black/30">
          <div className="flex flex-col items-center text-center">
            <span className="h-12 w-12 rounded-2xl bg-leaf-500 flex items-center justify-center text-white shadow-lg shadow-leaf-500/30">
              <Zap size={24} fill="currentColor" />
            </span>
            <h1 className="mt-5 text-[24px] font-black tracking-tight text-gray-900">Welcome Back</h1>
            <p className="mt-1.5 text-[13.5px] text-gray-500">
              Sign in to manage your power with PowerSmart.
            </p>
          </div>

          {error && (
            <div className="mt-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Email or Phone Number</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <User size={17} />
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com or 07XX XXX XXX"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-leaf-500/20 focus:border-leaf-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={17} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-white border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-leaf-500/20 focus:border-leaf-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[12.5px]">
              <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-leaf-500 focus:ring-leaf-500/30"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={onForgot}
                className="font-bold text-leaf-600 hover:text-leaf-700 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-leaf-700 hover:bg-leaf-800 text-white text-[15px] font-extrabold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer shadow-lg shadow-leaf-700/20"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : 'Login'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            <span className="flex-1 border-t border-gray-200" />
            Or continue with
            <span className="flex-1 border-t border-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-[13.5px] font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <GoogleIcon />
              Google
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-[13.5px] font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <AppleIcon />
              Apple
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-[12.5px] text-gray-400">
          New to PowerSmart?{' '}
          <button onClick={onBack} className="font-bold text-white hover:underline cursor-pointer">
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
};

const GoogleIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" style={{ width: 17, height: 17 }} aria-hidden>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
    />
  </svg>
);

const AppleIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" style={{ width: 17, height: 17 }} fill="currentColor" aria-hidden>
    <path d="M16.36 12.94c-.03-2.18 1.78-3.23 1.86-3.28-1.02-1.49-2.6-1.69-3.16-1.71-1.35-.14-2.63.79-3.31.79-.69 0-1.75-.77-2.88-.75-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.59 1.1 8.75.73 1.06 1.6 2.25 2.74 2.21 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.18-.02 1.93-1.08 2.65-2.15.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.29-.88-2.31-3.06zM13.93 6.3c.6-.73 1.01-1.74.9-2.75-.87.03-1.92.58-2.54 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.56-1.23z" />
  </svg>
);

export default LoginScreen;
