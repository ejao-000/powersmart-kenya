import React from 'react';
import { Search, UserPlus, Mail, Phone, Zap } from 'lucide-react';
import { SectionCard, initials } from './ui';

const TENANTS = [
  { name: 'Grace Wanjiru', email: 'grace.w@example.com', phone: '0712 345 678', unit: 'Riverside · Unit A1', meter: '1289403371', balance: 'KSh 2,340', active: true },
  { name: 'Peter Ochieng', email: 'peter.o@example.com', phone: '0723 456 789', unit: 'Riverside · Unit A2', meter: '2204481132', balance: 'KSh 860', active: true },
  { name: 'Faith Njeri', email: 'faith.n@example.com', phone: '0734 567 890', unit: 'Riverside · Unit A3', meter: '0912837710', balance: 'KSh 120', active: false },
  { name: 'David Mwangi', email: 'david.m@example.com', phone: '0745 678 901', unit: 'Kilimani · Unit 1B', meter: '7733019228', balance: 'KSh 4,120', active: true },
  { name: 'Lucy Kamau', email: 'lucy.k@example.com', phone: '0756 789 012', unit: 'Kilimani · Unit 2B', meter: '8841002215', balance: 'KSh 2,005', active: true },
];

export const TenantsPage: React.FC = () => {
  const [query, setQuery] = React.useState('');

  const filtered = TENANTS.filter((t) =>
    (t.name + t.email + t.unit + t.meter).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Tenants</h1>
          <p className="ps-sub">Everyone renting across your properties.</p>
        </div>
        <button className="ps-btn-primary">
          <UserPlus size={15} /> Invite Tenant
        </button>
      </div>

      <SectionCard
        title={`All Tenants (${filtered.length})`}
        action={
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tenants…"
              className="pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all"
            />
          </div>
        }
      >
        <div className="divide-y divide-gray-100">
          {filtered.map((t) => (
            <div key={t.email} className="py-3.5 flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-500 text-white text-[12px] font-bold grid place-items-center shrink-0">
                {initials(t.name)}
              </div>
              <div className="flex-1 min-w-[160px]">
                <p className="text-[13px] font-bold text-gray-800">{t.name}</p>
                <p className="text-[11px] text-gray-400 flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1"><Mail size={11} /> {t.email}</span>
                  <span className="flex items-center gap-1"><Phone size={11} /> {t.phone}</span>
                </p>
              </div>
              <div className="w-40 text-[12px] text-gray-600">
                <p className="font-semibold">{t.unit}</p>
                <p className="text-[11px] font-mono text-gray-400">Meter {t.meter}</p>
              </div>
              <div className="w-24 text-right">
                <p className="text-[13px] font-bold text-gray-900">{t.balance}</p>
                <p className="text-[10px] flex items-center justify-end gap-1 text-gray-400"><Zap size={10} /> prepaid</p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                t.active ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
              }`}>
                {t.active ? 'Active' : 'Low Balance'}
              </span>
              <button className="ps-btn-outline !px-3 !py-1.5">View</button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">No tenants match "{query}".</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

export default TenantsPage;
