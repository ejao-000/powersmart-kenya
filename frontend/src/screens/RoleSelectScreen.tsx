import React, { useState } from 'react';
import { Zap, Home, Building2, ShieldCheck, ArrowRight, Check } from 'lucide-react';

export type SelectedRole = 'tenant' | 'landlord' | 'admin';

interface RoleSelectScreenProps {
  onContinue: (role: SelectedRole) => void;
  onLogin: () => void;
}

const ROLES: {
  id: SelectedRole;
  icon: React.ReactNode;
  title: string;
  desc: string;
}[] = [
  {
    id: 'tenant',
    icon: <Home size={20} />,
    title: 'I am a Tenant',
    desc: 'Monitor usage, view bills and manage top-ups.',
  },
  {
    id: 'landlord',
    icon: <Building2 size={20} />,
    title: 'I am a Landlord',
    desc: 'Manage properties, tenant consumption and billing.',
  },
  {
    id: 'admin',
    icon: <ShieldCheck size={20} />,
    title: 'I am an Admin',
    desc: 'System oversight, technical config and network management.',
  },
];

export const RoleSelectScreen: React.FC<RoleSelectScreenProps> = ({ onContinue, onLogin }) => {
  const [selected, setSelected] = useState<SelectedRole | null>(null);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 font-sans">
      {/* ── Left: brand panel ───────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between bg-leaf-700 px-12 py-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_0%,rgba(15,157,110,0.35),transparent_60%),radial-gradient(50%_50%_at_100%_100%,rgba(6,54,38,0.5),transparent_60%)] pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white">
            <Zap size={21} fill="currentColor" />
          </span>
          <div className="leading-none">
            <span className="font-extrabold text-[17px] tracking-tight text-white">PowerSmart</span>
            <span className="font-extrabold text-[17px] tracking-tight text-leaf-300">-KE</span>
            <div className="text-[9px] font-bold tracking-[0.35em] text-leaf-200/70 mt-1">KENYA</div>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-md">
          <h1 className="text-[42px] leading-[1.1] font-black tracking-tight text-white">
            Empowering Kenya's
            <br />
            Energy Future.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-leaf-100/85">
            Manage your electricity with precision — from a single meter in your
            apartment to an entire portfolio of properties.
          </p>

          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {['A', 'K', 'M', 'S'].map((init, i) => (
                <span
                  key={init}
                  className="h-9 w-9 rounded-full ring-2 ring-leaf-700 flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: ['#0F9D6E', '#0891B2', '#F59E0B', '#8B5CF6'][i] }}
                >
                  {init}
                </span>
              ))}
            </div>
            <span className="text-[12.5px] text-leaf-100/80">Trusted by 10,000+ Kenyans</span>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11.5px] text-leaf-200/60">
          <span>© 2026 PowerSmart Kenya</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            All systems operational
          </span>
        </div>
      </div>

      {/* ── Right: selection panel ──────────────────────────────────────── */}
      <div className="bg-white flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-lg mx-auto">
          {/* Mobile brand */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <span className="h-10 w-10 rounded-xl bg-leaf-500 flex items-center justify-center text-white">
              <Zap size={21} fill="currentColor" />
            </span>
            <div className="leading-none">
              <span className="font-extrabold text-[16px] tracking-tight text-gray-900">PowerSmart</span>
              <span className="font-extrabold text-[16px] tracking-tight text-leaf-500">-KE</span>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-10">
            <span className="h-2 flex-1 rounded-full bg-leaf-500" />
            <span className="h-2 flex-1 rounded-full bg-gray-200" />
            <span className="text-[11px] font-bold text-gray-400 ml-1">Step 1 of 2</span>
          </div>

          <h1 className="text-[26px] lg:text-[30px] font-black tracking-tight text-gray-900">
            How will you use PowerSmart?
          </h1>
          <p className="mt-2 text-[14px] text-gray-500">
            Select your primary role to customize your experience.
          </p>

          <div className="mt-8 space-y-3.5">
            {ROLES.map((r) => {
              const active = selected === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 bg-white text-left transition-all cursor-pointer ${
                    active
                      ? 'border-leaf-500 bg-leaf-50/60 shadow-sm shadow-leaf-500/10'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                      active ? 'bg-leaf-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {r.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-extrabold text-gray-900">{r.title}</span>
                    <span className="block text-[12.5px] text-gray-500 mt-0.5">{r.desc}</span>
                  </span>
                  <span
                    className={`h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                      active ? 'border-leaf-500 bg-leaf-500 text-white' : 'border-gray-300 text-transparent'
                    }`}
                  >
                    <Check size={13} strokeWidth={3.5} />
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!selected}
            onClick={() => selected && onContinue(selected)}
            className="mt-8 w-full py-3.5 rounded-xl inline-flex items-center justify-center gap-2 text-[15px] font-extrabold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-leaf-500 enabled:hover:bg-leaf-600 text-white shadow-lg shadow-leaf-500/20"
          >
            Continue
            <ArrowRight size={17} />
          </button>

          <p className="mt-6 text-center text-[13px] text-gray-500">
            Already have an account?{' '}
            <button onClick={onLogin} className="font-bold text-leaf-600 hover:text-leaf-700 hover:underline cursor-pointer">
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectScreen;
