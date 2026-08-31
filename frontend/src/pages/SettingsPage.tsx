import React, { useState } from 'react';
import {
  User,
  Building2,
  Users,
  CreditCard,
  Bell,
  Lock,
  ShieldCheck,
  Moon,
  Sun,
  Globe,
  Save,
  Check,
  Upload,
} from 'lucide-react';
import { SectionCard, initials } from './ui';

type Role = 'tenant' | 'landlord' | 'admin';
type Tab = 'profile' | 'properties' | 'tenants' | 'payments' | 'notifications' | 'app';

const TABS: { id: Tab; label: string; icon: React.ReactNode; roles: Role[] }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={15} />, roles: ['tenant', 'landlord', 'admin'] },
  { id: 'properties', label: 'Properties / Meter', icon: <Building2 size={15} />, roles: ['tenant', 'landlord', 'admin'] },
  { id: 'tenants', label: 'Tenants / Payments', icon: <Users size={15} />, roles: ['landlord', 'admin'] },
  { id: 'payments', label: 'Payments', icon: <CreditCard size={15} />, roles: ['tenant', 'landlord', 'admin'] },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={15} />, roles: ['tenant', 'landlord', 'admin'] },
  { id: 'app', label: 'App / Privacy', icon: <Lock size={15} />, roles: ['tenant', 'landlord', 'admin'] },
];

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void }> = ({ on, onChange }) => (
  <button
    onClick={() => onChange(!on)}
    className={`relative w-10 h-[22px] rounded-full transition-colors cursor-pointer ${on ? 'bg-brand-500' : 'bg-gray-300'}`}
  >
    <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${on ? 'left-[20px]' : 'left-0.5'}`} />
  </button>
);

export const SettingsPage: React.FC<{ role: Role }> = ({ role }) => {
  const [tab, setTab] = useState<Tab>('profile');
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState('English (Kenya)');
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    sms: true,
    outages: true,
    ai: false,
    critical: true,
    marketing: false,
    autoDisconnect: false,
    overdraft: true,
  });

  const setT = (k: string) => (v: boolean) => setToggles((p) => ({ ...p, [k]: v }));
  const visible = TABS.filter((t) => t.roles.includes(role));

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="ps-heading">Settings</h1>
        <p className="ps-sub">Manage your profile, preferences and security.</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
          <Check size={16} /> Settings saved.
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white border border-gray-200 rounded-xl p-1.5 overflow-x-auto">
        {visible.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
              tab === t.id ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-6">
          <SectionCard title="Profile">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-brand-500 text-white text-xl font-black grid place-items-center">
                {initials('Emma Akinyi')}
              </div>
              <button className="ps-btn-outline !px-3 !py-2">
                <Upload size={14} /> Upload avatar
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="ps-label">Full Name</label><input className="ps-input" defaultValue="Emma Akinyi" /></div>
              <div><label className="ps-label">Phone Number</label><input className="ps-input" defaultValue="+254 712 345 678" /></div>
              <div><label className="ps-label">Email</label><input className="ps-input !bg-gray-50 !text-gray-400 cursor-not-allowed" defaultValue="emma@example.com" readOnly /></div>
            </div>
          </SectionCard>

          <SectionCard title="Security">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="ps-label">Current Password</label><input type="password" className="ps-input" placeholder="••••••••" /></div>
              <div><label className="ps-label">New Password</label><input type="password" className="ps-input" placeholder="8+ chars, A-Z, 0-9" /></div>
            </div>
            <button onClick={save} className="mt-4 ps-btn-outline">
              <Lock size={14} /> Change Password
            </button>
          </SectionCard>

          <div className="flex justify-end gap-2.5">
            <button className="ps-btn-outline">Cancel</button>
            <button onClick={save} className="ps-btn-primary"><Save size={15} /> Save Changes</button>
          </div>
        </div>
      )}

      {tab === 'properties' && (
        <div className="space-y-6">
          <SectionCard title="Meter Configuration">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="ps-label">Meter nickname</label><input className="ps-input" defaultValue="Apartment 4B — Westlands" /></div>
              <div><label className="ps-label">Low balance threshold (kWh)</label><input className="ps-input" type="number" defaultValue={10} /></div>
            </div>
          </SectionCard>

          <SectionCard title="Alerts">
            <div className="space-y-3">
              {[
                { key: 'sms', label: 'Token Purchases SMS' },
                { key: 'outages', label: 'Outages in your area' },
                { key: 'ai', label: 'AI Recommendations' },
              ].map((a) => (
                <div key={a.key} className="flex items-center justify-between py-2">
                  <span className="text-[13px] font-semibold text-gray-700">{a.label}</span>
                  <Toggle on={toggles[a.key]} onChange={setT(a.key)} />
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="flex justify-end gap-2.5">
            <button className="ps-btn-outline">Cancel</button>
            <button onClick={save} className="ps-btn-primary"><Save size={15} /> Save Changes</button>
          </div>
        </div>
      )}

      {tab === 'tenants' && role !== 'tenant' && (
        <SectionCard title="Tenant Invitation Template">
          <p className="text-[12px] text-gray-400 mb-3">Email template sent to new tenants when they join a property.</p>
          <textarea
            className="ps-input resize-none font-mono text-[12px]"
            rows={5}
            defaultValue={`Dear {name},

Welcome to {property}! Your prepaid meter account is ready.

Meter number: {meter}
Move-in date: {date}

Download the app to buy tokens instantly via M-Pesa.
— {landlord}`}
          />
          <button onClick={save} className="mt-4 ps-btn-primary"><Save size={15} /> Save Template</button>
        </SectionCard>
      )}

      {tab === 'payments' && (
        <div className="space-y-6">
          <SectionCard title="Payment Configuration">
            {role === 'admin' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="ps-label">M-Pesa Paybill / Shortcode</label><input className="ps-input" defaultValue="247247" /></div>
                <div><label className="ps-label">Auto-purchase limit (KSh)</label><input className="ps-input" type="number" defaultValue={2000} /></div>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { key: 'overdraft', label: 'Allow emergency overdraft (KSh 50 credit)' },
                  { key: 'autoDisconnect', label: 'Auto-purchase on threshold' },
                ].map((a) => (
                  <div key={a.key} className="flex items-center justify-between py-2">
                    <span className="text-[13px] font-semibold text-gray-700">{a.label}</span>
                    <Toggle on={toggles[a.key]} onChange={setT(a.key)} />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {role === 'admin' && (
            <SectionCard title="Global Property Settings">
              <div className="space-y-3">
                {[
                  { key: 'autoDisconnect', label: 'Auto-disconnect at zero balance' },
                  { key: 'overdraft', label: 'Allow tenant overdraft' },
                ].map((a) => (
                  <div key={a.key} className="flex items-center justify-between py-2">
                    <span className="text-[13px] font-semibold text-gray-700">{a.label}</span>
                    <Toggle on={toggles[a.key]} onChange={setT(a.key)} />
                  </div>
                ))}
                <div>
                  <label className="ps-label mt-3">Default monthly budget (KSh)</label>
                  <input className="ps-input" type="number" defaultValue={2000} />
                </div>
              </div>
            </SectionCard>
          )}

          <div className="flex justify-end gap-2.5">
            <button className="ps-btn-outline">Cancel</button>
            <button onClick={save} className="ps-btn-primary"><Save size={15} /> Save Changes</button>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <SectionCard title="Notification Preferences">
          <div className="space-y-3">
            {(role === 'admin'
              ? [
                  { key: 'critical', label: 'Critical balance alerts' },
                  { key: 'outages', label: 'Outage reports' },
                  { key: 'marketing', label: 'Marketing & product updates' },
                ]
              : [
                  { key: 'sms', label: 'Token purchase SMS' },
                  { key: 'outages', label: 'Outage alerts' },
                  { key: 'ai', label: 'AI recommendations' },
                ]
            ).map((a) => (
              <div key={a.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-[13px] font-semibold text-gray-700">{a.label}</span>
                <Toggle on={toggles[a.key]} onChange={setT(a.key)} />
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={save} className="ps-btn-primary"><Save size={15} /> Save Preferences</button>
          </div>
        </SectionCard>
      )}

      {tab === 'app' && (
        <div className="space-y-6">
          <SectionCard title="Preferences">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="ps-label">Theme</label>
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${theme === 'light' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}
                  >
                    <Sun size={14} /> Light
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${theme === 'dark' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}
                  >
                    <Moon size={14} /> Dark
                  </button>
                </div>
              </div>
              <div>
                <label className="ps-label">Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="ps-input cursor-pointer">
                  <option>English (Kenya)</option>
                  <option>Kiswahili</option>
                </select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Privacy & Security">
            <div className="flex items-center gap-3 text-[13px] text-gray-600">
              <ShieldCheck size={18} className="text-brand-500" />
              Your data is encrypted at rest and in transit. Tokens are only ever delivered to your own meter.
            </div>
            <button onClick={save} className="mt-4 ps-btn-outline !text-red-500 !border-red-200 hover:!border-red-300 hover:!text-red-600">
              Log out of all devices
            </button>
          </SectionCard>

          <div className="flex justify-end gap-2.5">
            <button className="ps-btn-outline">Cancel</button>
            <button onClick={save} className="ps-btn-primary"><Save size={15} /> Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
