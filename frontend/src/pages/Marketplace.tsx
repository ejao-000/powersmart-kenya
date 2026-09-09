import React, { useCallback, useEffect, useState } from 'react';
import {
  ShoppingBag,
  Sun,
  Flame,
  Lightbulb,
  Plug,
  Refrigerator,
  Wrench,
  Sparkles,
  Zap,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import { SectionCard } from './ui';
import { marketplace, MarketplaceBrowse, fmtKsh } from '../services/api';

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  solar: <Sun size={18} />,
  water: <Flame size={18} />,
  lighting: <Lightbulb size={18} />,
  smart: <Plug size={18} />,
  appliances: <Refrigerator size={18} />,
  services: <Wrench size={18} />,
};

const CATEGORIES = ['All', 'solar', 'water', 'lighting', 'smart', 'appliances', 'services'];

export const Marketplace: React.FC = () => {
  const [data, setData] = useState<MarketplaceBrowse | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await marketplace.browse());
    } catch {
      /* header handles */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const request = () => {
    setFlash('Demo: contact your PowerSmart agent or energy partner to order.');
    setTimeout(() => setFlash(null), 3000);
  };

  const products = (data?.products ?? []).filter((p) => category === 'All' || p.category === category);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ps-heading">Energy Marketplace</h1>
        <p className="ps-sub">Products and services that pay for themselves by cutting your electricity bill.</p>
      </div>

      {flash && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
          <Check size={16} /> {flash}
        </div>
      )}

      {loading ? (
        <div className="ps-card p-12 text-center text-gray-400 text-sm">Loading marketplace…</div>
      ) : (
        <>
          {/* AI recommendations */}
          {(data?.recommendations?.length ?? 0) > 0 && (
            <SectionCard
              title="Recommended for your home"
              action={
                <span className="ps-pill-green">
                  <Sparkles size={12} /> Based on your usage
                </span>
              }
            >
              <div className="space-y-4">
                {data?.recommendations.map((rec, i) => (
                  <div key={rec.product.id} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4 flex flex-col sm:flex-row gap-4">
                    <span className="w-12 h-12 rounded-xl bg-brand-500 text-white grid place-items-center shrink-0">
                      {CATEGORY_ICON[rec.product.category] || <Zap size={20} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-bold text-gray-900">{rec.product.name}</p>
                        <span className="ps-pill-amber">{fmtKsh(Math.round(rec.product.est_savings_ksh_month))}/mo saved est.</span>
                      </div>
                      <p className="mt-1.5 text-[13px] text-gray-600 leading-relaxed">
                        <span className="font-bold text-brand-600">Why:</span> {rec.reason}
                      </p>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
                      <p className="text-[15px] font-black text-gray-900">{fmtKsh(rec.product.price_ksh)}</p>
                      <button onClick={request} className="ps-btn-primary !px-3 !py-1.5 !text-[12px]">
                        <ArrowUpRight size={13} /> Enquire
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Catalogue */}
          <SectionCard
            title="All products & services"
            action={
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize cursor-pointer ${
                      category === c ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((p) => (
                <div key={p.id} className="rounded-2xl border border-gray-100 bg-white p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-10 h-10 rounded-xl bg-gray-50 text-gray-500 grid place-items-center">
                      {CATEGORY_ICON[p.category] || <ShoppingBag size={18} />}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{p.category}</span>
                  </div>
                  <p className="text-[14px] font-bold text-gray-900">{p.name}</p>
                  <p className="mt-1 text-[12px] text-gray-500 leading-relaxed flex-1">{p.description}</p>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-[15px] font-black text-gray-900">{fmtKsh(p.price_ksh)}</p>
                      <p className="text-[11px] text-emerald-600 font-semibold">
                        saves ~{fmtKsh(Math.round(p.est_savings_ksh_month))}/mo
                      </p>
                    </div>
                    <button onClick={request} className="ps-btn-outline !px-3 !py-1.5">
                      Enquire
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {products.length === 0 && (
              <p className="py-6 text-center text-[13px] text-gray-400">No products in this category yet.</p>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default Marketplace;
