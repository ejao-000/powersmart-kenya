import React from 'react';
import {
  Zap,
  Home,
  Building2,
  Play,
  Users,
  ArrowRight,
  Wallet,
  AlertTriangle,
  Activity,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface LandingPageProps {
  onJoin: () => void;
  onLogin: () => void;
}

const usageData = [
  { day: 'Mon', kwh: 2.1 },
  { day: 'Tue', kwh: 3.4 },
  { day: 'Wed', kwh: 2.8 },
  { day: 'Thu', kwh: 4.1 },
  { day: 'Fri', kwh: 3.6 },
  { day: 'Sat', kwh: 5.2 },
  { day: 'Sun', kwh: 4.4 },
];

const portfolioData = [
  { m: 'Jan', ksh: 38 },
  { m: 'Feb', ksh: 42 },
  { m: 'Mar', ksh: 40 },
  { m: 'Apr', ksh: 47 },
  { m: 'May', ksh: 45 },
  { m: 'Jun', ksh: 52 },
  { m: 'Jul', ksh: 56 },
];

const avatars = [
  { init: 'A', bg: '#0F9D6E' },
  { init: 'K', bg: '#0891B2' },
  { init: 'M', bg: '#F59E0B' },
  { init: 'S', bg: '#8B5CF6' },
  { init: 'W', bg: '#EF4444' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onJoin, onLogin }) => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#F9FAFB]/85 backdrop-blur-md border-b border-gray-200/70">
        <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-2.5 select-none">
            <span className="h-9 w-9 rounded-xl bg-leaf-500 flex items-center justify-center text-white shadow-sm shadow-leaf-500/30">
              <Zap size={19} fill="currentColor" />
            </span>
            <span className="text-[17px] font-extrabold tracking-tight">
              PowerSmart<span className="text-leaf-500">-KE</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-[14px] font-semibold text-gray-500">
            <a href="#features" className="hover:text-leaf-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-leaf-600 transition-colors">Pricing</a>
            <a href="#about" className="hover:text-leaf-600 transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="px-5 py-2.5 rounded-full border border-gray-300 bg-white text-[13px] font-bold text-gray-700 hover:border-leaf-500 hover:text-leaf-600 transition-colors cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={onJoin}
              className="px-5 py-2.5 rounded-full bg-leaf-500 hover:bg-leaf-600 text-[13px] font-bold text-white transition-colors cursor-pointer shadow-sm shadow-leaf-500/25"
            >
              Join Now
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-leaf-50 border border-leaf-200 text-leaf-700 text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-leaf-500 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-leaf-500" />
              </span>
              Live in Nairobi, Mombasa &amp; Kisumu
            </span>

            <h1 className="mt-6 text-[42px] leading-[1.08] lg:text-[56px] font-black tracking-tight">
              Smart Electricity Management
              <br />
              <span className="text-leaf-500">for Kenya.</span>
            </h1>

            <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-gray-500">
              Monitor your KPLC prepaid meter, buy tokens instantly, and get smart
              analytics — all from one beautiful dashboard. No more blackouts,
              no more queues.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                onClick={onJoin}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-leaf-500 hover:bg-leaf-600 text-white text-[15px] font-bold transition-colors cursor-pointer shadow-lg shadow-leaf-500/25"
              >
                Get Started Free
                <ArrowRight size={17} />
              </button>
              <button
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full border border-gray-300 bg-white text-gray-700 text-[15px] font-bold hover:border-leaf-500 hover:text-leaf-600 transition-colors cursor-pointer"
              >
                <span className="h-8 w-8 rounded-full bg-leaf-50 text-leaf-600 flex items-center justify-center">
                  <Play size={14} fill="currentColor" />
                </span>
                Watch Demo
              </button>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-3">
                {avatars.map((a) => (
                  <span
                    key={a.init}
                    className="h-10 w-10 rounded-full ring-2 ring-[#F9FAFB] flex items-center justify-center text-[12px] font-bold text-white"
                    style={{ background: a.bg }}
                  >
                    {a.init}
                  </span>
                ))}
                <span className="h-10 w-10 rounded-full ring-2 ring-[#F9FAFB] bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                  10K+
                </span>
              </div>
              <div className="text-[13px] text-gray-500 leading-tight">
                <span className="font-bold text-gray-800">Joined by 10,000+</span>
                <br />
                happy Kenyans
              </div>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ── Section heading ─────────────────────────────────────────────── */}
      <section className="pt-10 pb-4">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight">
            Built for everyone, designed for clarity.
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-[15px] text-gray-500">
            Whether you rent a bedsitter in Nairobi or manage twenty meters in
            Mombasa, PowerSmart keeps your power simple.
          </p>
        </div>
      </section>

      {/* ── Feature cards ───────────────────────────────────────────────── */}
      <section id="features" className="py-12 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-6">
          <FeatureCard
            icon={<Home size={22} />}
            title="For Tenants"
            tagline="Renting? We've got your power sorted."
            items={['Smart usage predictions', 'Low balance alerts', 'One-tap M-Pesa top-ups']}
          />
          <div className="rounded-2xl border border-gray-200 bg-white p-8 flex flex-col">
            <div className="flex items-start gap-4">
              <span className="h-11 w-11 shrink-0 rounded-xl bg-leaf-100 text-leaf-700 flex items-center justify-center">
                <Building2 size={22} />
              </span>
              <div>
                <h3 className="text-[19px] font-extrabold tracking-tight">For Landlords</h3>
                <p className="text-[13px] text-gray-500 mt-0.5">Manage your whole portfolio in one view.</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {['Bulk token purchases', 'Tenant billing automation', 'Multi-meter dashboard'].map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5"
                >
                  <Check size={13} className="text-leaf-500" />
                  {f}
                </span>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-gray-100 bg-[#F9FAFB] p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Portfolio Performance Overview
                </span>
                <span className="text-[12px] font-extrabold text-leaf-600">+18%</span>
              </div>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0F9D6E" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#0F9D6E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="m" hide />
                    <YAxis hide />
                    <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
                    <Tooltip cursor={{ stroke: '#0F9D6E' }} contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="ksh"
                      stroke="#0F9D6E"
                      strokeWidth={2.5}
                      fill="url(#portfolioFill)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 steps ─────────────────────────────────────────────────────── */}
      <section id="about" className="py-16 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight">3 Simple Steps to Power Smart</h2>
          <p className="mt-3 max-w-md mx-auto text-[15px] text-gray-500">
            From signing up to staying powered takes less than a minute.
          </p>

          <div className="mt-12 grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
            {[
              { n: '1', t: 'Connect Meter', d: 'Link your KPLC prepaid meter account securely in seconds.' },
              { n: '2', t: 'Buy Tokens', d: 'Top up via M-Pesa, Airtel Money or bank transfer instantly.' },
              { n: '3', t: 'Monitor Usage', d: 'Track consumption, get forecasts and never run out again.' },
            ].map((s, i) => (
              <div key={s.n} className="relative">
                <div className="mx-auto h-14 w-14 rounded-full bg-leaf-500 text-white flex items-center justify-center text-[20px] font-black shadow-lg shadow-leaf-500/30">
                  {s.n}
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+44px)] right-[calc(-50%+44px)] border-t-2 border-dashed border-gray-200" />
                )}
                <h3 className="mt-5 text-[17px] font-extrabold tracking-tight">{s.t}</h3>
                <p className="mt-2 text-[13.5px] text-gray-500 leading-relaxed max-w-[240px] mx-auto">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ────────────────────────────────────────────────────── */}
      <section id="pricing" className="px-6 pb-20 scroll-mt-24">
        <div className="max-w-6xl mx-auto rounded-3xl bg-leaf-700 px-8 py-16 lg:py-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(15,157,110,0.35),transparent_60%)] pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl lg:text-[42px] font-black tracking-tight text-white max-w-2xl mx-auto">
              Join thousands of Kenyans saving on power today.
            </h2>
            <p className="mt-4 text-[15px] text-leaf-100/90 max-w-lg mx-auto">
              Free for tenants, powerful for landlords. Start managing your
              electricity the smart way.
            </p>
            <button
              onClick={onJoin}
              className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-leaf-300 hover:bg-leaf-200 text-leaf-900 text-[15px] font-extrabold transition-colors cursor-pointer shadow-xl shadow-black/10"
            >
              Get Started Free
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#0B1120] text-gray-400">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-xl bg-leaf-500 flex items-center justify-center text-white">
                  <Zap size={19} fill="currentColor" />
                </span>
                <span className="text-[16px] font-extrabold text-white tracking-tight">
                  PowerSmart<span className="text-leaf-400">-KE</span>
                </span>
              </div>
              <p className="mt-4 text-[13.5px] leading-relaxed text-gray-500">
                Smart electricity management for Kenya — monitor, buy and forecast
                your power with confidence.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-12">
              <div>
                <div className="text-[12px] font-extrabold uppercase tracking-widest text-gray-300 mb-4">Platform</div>
                <ul className="space-y-3 text-[13.5px]">
                  <li><a href="#features" className="hover:text-white transition-colors">Tenant Portal</a></li>
                  <li><a href="#features" className="hover:text-white transition-colors">Landlord Dashboard</a></li>
                  <li><a href="#about" className="hover:text-white transition-colors">Help Center</a></li>
                </ul>
              </div>
              <div>
                <div className="text-[12px] font-extrabold uppercase tracking-widest text-gray-300 mb-4">Legal</div>
                <ul className="space-y-3 text-[13.5px]">
                  <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 text-center text-[12.5px] text-gray-500">
            © 2026 PowerSmart Kenya. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

const PhoneMockup: React.FC = () => {
  return (
    <div className="relative">
      <div className="absolute -inset-8 rounded-[48px] bg-gradient-to-tr from-leaf-100 via-emerald-50 to-cyan-50 blur-2xl opacity-70" />
      <div className="relative w-[300px] rounded-[40px] border-[10px] border-gray-900 bg-white shadow-2xl shadow-gray-900/10 overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl z-10" />

        <div className="pt-9 px-5 pb-5">
          {/* status row */}
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-4">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <Activity size={11} />
              <Zap size={11} className="text-leaf-500" />
            </span>
          </div>

          {/* Balance card */}
          <div className="rounded-2xl bg-gradient-to-br from-leaf-600 to-leaf-800 p-4 text-white shadow-lg shadow-leaf-700/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-leaf-100/80">Remaining Balance</span>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-white/15 rounded-full px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Live
              </span>
            </div>
            <div className="mt-2 text-[28px] font-black tracking-tight">
              24.5 <span className="text-[13px] font-bold text-leaf-100/90">kWh</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-leaf-100/80">≈ KSh 320</span>
              <span className="text-[10px] font-semibold text-leaf-100/90">Runs out in ~7 days</span>
            </div>
          </div>

          {/* Low balance toast */}
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <span className="h-7 w-7 shrink-0 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={14} />
            </span>
            <div className="min-w-0">
              <div className="text-[10.5px] font-extrabold text-amber-800">Low balance</div>
              <div className="text-[9.5px] text-amber-700/80 truncate">Only 5% left — top up before Friday</div>
            </div>
          </div>

          {/* Chart */}
          <div className="mt-3 rounded-xl border border-gray-100 bg-[#F9FAFB] p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-gray-500">Usage · This week</span>
              <span className="text-[10px] font-extrabold text-leaf-600">-12%</span>
            </div>
            <div className="h-[92px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usageData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="usageStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0F9D6E" />
                      <stop offset="100%" stopColor="#0B5E3E" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 8, fill: '#9CA3AF' }} />
                  <YAxis hide domain={[0, 6]} />
                  <Tooltip cursor={{ stroke: '#0F9D6E' }} contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="kwh"
                    stroke="url(#usageStroke)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 3, fill: '#0F9D6E' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Buy button */}
          <div className="mt-3 flex items-center gap-2.5">
            <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-leaf-500 hover:bg-leaf-600 py-2.5 text-[12px] font-bold text-white transition-colors">
              <Wallet size={13} />
              Buy Token
            </button>
            <button className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 hover:text-leaf-600 hover:border-leaf-400 transition-colors">
              <Users size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  tagline: string;
  items: string[];
}> = ({ icon, title, tagline, items }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-8 flex flex-col">
    <div className="flex items-start gap-4">
      <span className="h-11 w-11 shrink-0 rounded-xl bg-leaf-100 text-leaf-700 flex items-center justify-center">
        {icon}
      </span>
      <div>
        <h3 className="text-[19px] font-extrabold tracking-tight">{title}</h3>
        <p className="text-[13px] text-gray-500 mt-0.5">{tagline}</p>
      </div>
    </div>

    <ul className="mt-6 space-y-3">
      {items.map((f) => (
        <li key={f} className="flex items-center gap-3 text-[14px] text-gray-600 font-medium">
          <span className="h-6 w-6 shrink-0 rounded-full bg-leaf-50 text-leaf-600 flex items-center justify-center">
            <Check size={14} />
          </span>
          {f}
        </li>
      ))}
    </ul>
  </div>
);

export default LandingPage;
