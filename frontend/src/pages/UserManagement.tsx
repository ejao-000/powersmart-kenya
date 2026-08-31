import React, { useEffect, useState, useCallback } from 'react';
import {
  Download,
  Megaphone,
  Search,
  MoreHorizontal,
  RefreshCw,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { SectionCard, initials } from './ui';
import { adminApi, AdminUser } from '../services/api';

type Tab = 'all' | 'admin' | 'landlord' | 'tenant';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All Users' },
  { id: 'admin', label: 'Admins' },
  { id: 'landlord', label: 'Landlords' },
  { id: 'tenant', label: 'Tenants' },
];

const roleCls: Record<string, string> = {
  admin: 'text-brand-600 bg-brand-50',
  landlord: 'text-sky-600 bg-sky-50',
  tenant: 'text-amber-600 bg-amber-50',
};

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setUsers(await adminApi.users());
    } catch (e: any) {
      setError(e.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = users.filter((u) => {
    const matchTab = tab === 'all' ? true : u.role === tab;
    const matchQ = (u.name + u.email + u.phone).toLowerCase().includes(query.toLowerCase());
    return matchTab && matchQ;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">User Management</h1>
          <p className="ps-sub">Manage admins, landlords and tenants across the platform.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="ps-btn-outline">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={() => { setNotice('Broadcast drafted — send a message to all selected users.'); setTimeout(() => setNotice(null), 4000); }} className="ps-btn-primary">
            <Megaphone size={15} /> Broadcast
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
          <Check size={16} /> {notice}
        </div>
      )}

      <SectionCard
        title={`Users (${filtered.length})`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-gray-100 rounded-xl p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                    tab === t.id ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users…"
                className="pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all"
              />
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="py-2.5 pr-3 font-semibold">User</th>
                <th className="py-2.5 pr-3 font-semibold">Role</th>
                <th className="py-2.5 pr-3 font-semibold">Status</th>
                <th className="py-2.5 pr-3 font-semibold">Last Activity</th>
                <th className="py-2.5 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-500 text-white text-[12px] font-bold grid place-items-center">
                        {initials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 truncate">{u.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{u.email} · {u.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`text-[11px] font-bold capitalize px-2 py-0.5 rounded-md ${roleCls[u.role] || 'text-gray-600 bg-gray-100'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md text-emerald-600 bg-emerald-50">
                      Active
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</td>
                  <td className="py-3 text-right">
                    <button className="p-1.5 rounded-lg text-gray-300 hover:text-brand-500 hover:bg-gray-50 transition-colors cursor-pointer">
                      <MoreHorizontal size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};

export default UserManagement;
