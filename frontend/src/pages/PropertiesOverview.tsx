import React, { useState } from 'react';
import {
  Plus,
  UserPlus,
  Building2,
  Home,
  Zap,
  Wrench,
  X,
  RefreshCw,
  Check,
} from 'lucide-react';
import { SectionCard, initials } from './ui';

interface Property {
  id: string;
  name: string;
  address: string;
  units: number;
  occupancy: number;
  balance: string;
  selected?: boolean;
  unitsList: {
    id: string;
    label: string;
    meter: string;
    tenant?: { name: string; active: boolean };
  }[];
}

const PROPERTIES: Property[] = [
  {
    id: 'p1',
    name: 'Riverside Court',
    address: 'Riverside Drive, Westlands',
    units: 8,
    occupancy: 75,
    balance: 'KSh 12,400',
    unitsList: [
      { id: 'u1', label: 'Unit A1', meter: '1289403371', tenant: { name: 'Grace Wanjiru', active: true } },
      { id: 'u2', label: 'Unit A2', meter: '2204481132', tenant: { name: 'Peter Ochieng', active: true } },
      { id: 'u3', label: 'Unit A3', meter: '0912837710', tenant: { name: 'Faith Njeri', active: false } },
      { id: 'u4', label: 'Unit B1', meter: '', tenant: undefined },
    ],
  },
  {
    id: 'p2',
    name: 'Kilimani Apartments',
    address: 'Argwings Kodhek, Kilimani',
    units: 6,
    occupancy: 67,
    balance: 'KSh 8,900',
    unitsList: [
      { id: 'u5', label: 'Unit 1B', meter: '7733019228', tenant: { name: 'David Mwangi', active: true } },
      { id: 'u6', label: 'Unit 2B', meter: '8841002215', tenant: { name: 'Lucy Kamau', active: true } },
      { id: 'u7', label: 'Unit 3B', meter: '', tenant: undefined },
    ],
  },
];

const unitBadge = (u: Property['unitsList'][number]) => {
  if (!u.meter) return { label: 'Vacant', cls: 'text-gray-500 bg-gray-100', dot: 'bg-gray-400' };
  if (!u.tenant || !u.tenant.active) return { label: 'Low Balance', cls: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' };
  return { label: 'Active', cls: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' };
};

export const PropertiesOverview: React.FC = () => {
  const [selected, setSelected] = useState<string>('p1');
  const [notice, setNotice] = useState<string | null>(null);
  const [modal, setModal] = useState<null | 'property' | 'tenant'>(null);

  const active = PROPERTIES.find((p) => p.id === selected) || PROPERTIES[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ps-heading">Properties</h1>
          <p className="ps-sub">Manage your buildings, units and occupancy.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => setModal('tenant')} className="ps-btn-outline">
            <UserPlus size={15} /> Invite Tenant
          </button>
          <button onClick={() => setModal('property')} className="ps-btn-primary">
            <Plus size={15} /> Add Property
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
          <Check size={16} /> {notice}
        </div>
      )}

      {/* Property summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PROPERTIES.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`ps-card p-5 text-left transition-all cursor-pointer ${
              selected === p.id ? 'ring-2 ring-brand-500' : 'hover:shadow-cardHover'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 rounded-xl grid place-items-center ${selected === p.id ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-500'}`}>
                <Building2 size={19} />
              </span>
              <span className="text-[11px] font-semibold text-gray-400">{p.address}</span>
            </div>
            <p className="text-[15px] font-bold text-gray-800">{p.name}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-black text-gray-900">{p.units}</p>
                <p className="text-[10px] font-semibold uppercase text-gray-400">Units</p>
              </div>
              <div>
                <p className="text-sm font-black text-gray-900">{p.occupancy}%</p>
                <p className="text-[10px] font-semibold uppercase text-gray-400">Occupancy</p>
              </div>
              <div>
                <p className="text-sm font-black text-brand-500">{p.balance}</p>
                <p className="text-[10px] font-semibold uppercase text-gray-400">Balance</p>
              </div>
            </div>
          </button>
        ))}

        {/* Add property tile */}
        <button onClick={() => setModal('property')} className="ps-card p-5 flex flex-col items-center justify-center text-gray-400 hover:text-brand-500 hover:border-brand-300 transition-all cursor-pointer border-dashed">
          <Plus size={22} />
          <p className="text-[13px] font-bold mt-2">Add a new property</p>
        </button>
      </div>

      {/* Per-property unit grid */}
      <SectionCard title={`${active.name} — Units`} action={<span className="text-[11px] font-semibold text-gray-400">{active.address}</span>}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {active.unitsList.map((u) => {
            const badge = unitBadge(u);
            return (
              <div key={u.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-bold text-gray-800">{u.label}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${badge.cls}`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${badge.dot} mr-1`} />
                    {badge.label}
                  </span>
                </div>
                {u.tenant ? (
                  <>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500 text-white text-[10px] font-bold grid place-items-center">
                        {initials(u.tenant.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-gray-700 truncate">{u.tenant.name}</p>
                        <p className="text-[10px] font-mono text-gray-400">{u.meter}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[12px] text-gray-500">
                      <span className="flex items-center gap-1"><Zap size={12} /> 42.5 kWh</span>
                      <span className="font-semibold text-gray-700">KSh 212</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] text-gray-400 mb-3">No tenant assigned to this unit.</p>
                    {u.meter ? (
                      <button onClick={() => setModal('tenant')} className="w-full py-2 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 text-[12px] font-bold transition-colors cursor-pointer">
                        Assign Tenant
                      </button>
                    ) : (
                      <button onClick={() => setNotice('Meter assignment flow opened — connect a KPLC meter number.')} className="w-full py-2 rounded-lg bg-white border border-gray-300 hover:border-brand-500 hover:text-brand-500 text-gray-600 text-[12px] font-bold transition-colors cursor-pointer">
                        Assign Meter
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                {modal === 'property' ? <Building2 size={18} className="text-brand-500" /> : <UserPlus size={18} className="text-brand-500" />}
                {modal === 'property' ? 'Add Property' : 'Invite Tenant'}
              </h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              {modal === 'property' ? (
                <>
                  <div><label className="ps-label">Property name</label><input className="ps-input" placeholder="e.g. Riverside Court" /></div>
                  <div><label className="ps-label">Address</label><input className="ps-input" placeholder="Street, estate" /></div>
                  <div><label className="ps-label">Number of units</label><input className="ps-input" type="number" placeholder="e.g. 8" /></div>
                </>
              ) : (
                <>
                  <div><label className="ps-label">Tenant name</label><input className="ps-input" placeholder="Full name" /></div>
                  <div><label className="ps-label">Phone number</label><input className="ps-input" placeholder="0712 345 678" /></div>
                  <div><label className="ps-label">Email</label><input className="ps-input" placeholder="tenant@example.com" /></div>
                </>
              )}
              <button
                onClick={() => {
                  setNotice(modal === 'property' ? 'Property added.' : 'Invitation sent to tenant.');
                  setTimeout(() => setNotice(null), 4000);
                  setModal(null);
                }}
                className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {modal === 'property' ? <Plus size={15} /> : <UserPlus size={15} />}
                {modal === 'property' ? 'Create property' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesOverview;
