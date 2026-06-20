import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useNetWorthStore, useUIStore, sumAssets, sumLiabilities, calcNetWorth } from '@/store';
import type { NetWorthAsset, NetWorthLiability, NetWorthSnapshot } from '@/types';

function fmt$(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

function Hero({ netWorth, assets, liabilities, snapshots }: {
  netWorth: number; assets: number; liabilities: number; snapshots: NetWorthSnapshot[];
}) {
  const last = snapshots[snapshots.length - 1];
  const monthAgo = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 1);
    const key = cutoff.toLocaleDateString('en-CA');
    return snapshots.filter((s) => s.date <= key).pop() ?? null;
  }, [snapshots]);
  const delta = last && monthAgo ? last.netWorth - monthAgo.netWorth : 0;
  const isUp = delta >= 0;
  return (
    <div className="p-5 rounded-2xl border border-slate-800/40 bg-gradient-to-br from-emerald-500/[0.06] to-indigo-500/[0.04] space-y-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">Net Worth</div>
      <div className="flex items-baseline gap-3">
        <span className="font-syne text-3xl font-bold text-slate-100">{fmt$(netWorth)}</span>
        {monthAgo && (
          <span className={`flex items-center gap-1 text-xs font-medium ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {fmt$(Math.abs(delta))} 30d
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 pt-1 text-xs">
        <span className="text-slate-400">Assets <span className="text-emerald-400 font-semibold">{fmt$(assets)}</span></span>
        <span className="text-slate-400">Liabilities <span className="text-rose-400 font-semibold">{fmt$(liabilities)}</span></span>
      </div>
    </div>
  );
}

function Sparkline({ snapshots }: { snapshots: NetWorthSnapshot[] }) {
  if (snapshots.length < 2) return null;
  const recent = snapshots.slice(-30);
  const values = recent.map((s) => s.netWorth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 280, H = 60, padY = 6;
  const points = recent
    .map((s, i) => {
      const x = (i / (recent.length - 1)) * W;
      const y = H - padY - ((s.netWorth - min) / range) * (H - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <div className="p-3 rounded-xl border border-slate-800/40 bg-slate-900/30">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Last {recent.length} snapshots</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none" aria-hidden>
        <polyline points={points} fill="none" stroke="#22c55e" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function AssetRow({ asset, onChange, onDelete }: {
  asset: NetWorthAsset; onChange: (patch: Partial<NetWorthAsset>) => void; onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800/40 bg-slate-900/20">
      <input
        value={asset.name}
        onChange={(e) => onChange({ name: e.target.value })}
        aria-label="Asset name"
        className="flex-1 min-w-0 bg-transparent text-sm text-slate-200 outline-none"
      />
      <div className="flex items-center text-emerald-400 text-sm">
        <span className="text-slate-600">$</span>
        <input
          type="number"
          value={asset.value}
          onChange={(e) => onChange({ value: parseFloat(e.target.value) || 0 })}
          aria-label="Asset value"
          className="w-24 bg-transparent text-right outline-none"
        />
      </div>
      <button onClick={onDelete} aria-label={`Delete ${asset.name}`} className="text-slate-600 hover:text-rose-400 transition-colors p-1">
        <Trash2 size={12} />
      </button>
    </li>
  );
}

function LiabilityRow({ liability, onChange, onDelete }: {
  liability: NetWorthLiability; onChange: (patch: Partial<NetWorthLiability>) => void; onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800/40 bg-slate-900/20">
      <input
        value={liability.name}
        onChange={(e) => onChange({ name: e.target.value })}
        aria-label="Liability name"
        className="flex-1 min-w-0 bg-transparent text-sm text-slate-200 outline-none"
      />
      <div className="flex items-center text-rose-400 text-sm">
        <span className="text-slate-600">$</span>
        <input
          type="number"
          value={liability.balance}
          onChange={(e) => onChange({ balance: parseFloat(e.target.value) || 0 })}
          aria-label="Liability balance"
          className="w-24 bg-transparent text-right outline-none"
        />
      </div>
      <button onClick={onDelete} aria-label={`Delete ${liability.name}`} className="text-slate-600 hover:text-rose-400 transition-colors p-1">
        <Trash2 size={12} />
      </button>
    </li>
  );
}

function AddRow({ onAdd, label, color }: { onAdd: (name: string, value: number) => void; label: string; color: string }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState<number | ''>('');
  const submit = () => {
    if (!name.trim() || value === '' || isNaN(Number(value))) return;
    onAdd(name.trim(), Number(value));
    setName(''); setValue('');
  };
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-700 bg-slate-950/40">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={label}
        className="flex-1 min-w-0 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <div className="flex items-center text-sm" style={{ color }}>
        <span className="text-slate-600">$</span>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
          placeholder="0"
          className="w-24 bg-transparent text-right placeholder-slate-700 outline-none"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      <button
        onClick={submit}
        disabled={!name.trim() || value === ''}
        aria-label="Add"
        className={[
          'p-1 rounded-md transition-colors',
          name.trim() && value !== '' ? 'text-indigo-300 hover:bg-indigo-500/15' : 'text-slate-700 cursor-not-allowed',
        ].join(' ')}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export default function NetWorthView() {
  const assets = useNetWorthStore((s) => s.assets);
  const liabilities = useNetWorthStore((s) => s.liabilities);
  const snapshots = useNetWorthStore((s) => s.snapshots);
  const addAsset = useNetWorthStore((s) => s.addAsset);
  const updateAsset = useNetWorthStore((s) => s.updateAsset);
  const deleteAsset = useNetWorthStore((s) => s.deleteAsset);
  const addLiability = useNetWorthStore((s) => s.addLiability);
  const updateLiability = useNetWorthStore((s) => s.updateLiability);
  const deleteLiability = useNetWorthStore((s) => s.deleteLiability);
  const addToast = useUIStore((s) => s.addToast);

  const totalA = useMemo(() => sumAssets(assets), [assets]);
  const totalL = useMemo(() => sumLiabilities(liabilities), [liabilities]);
  const nw = useMemo(() => calcNetWorth(assets, liabilities), [assets, liabilities]);

  const onDel = (kind: 'asset' | 'liability', id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    if (kind === 'asset') deleteAsset(id); else deleteLiability(id);
    addToast('Deleted', 'warning');
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Coins size={18} className="text-emerald-400" />
        <h1 className="font-syne text-lg font-bold text-slate-100">Net Worth</h1>
      </motion.div>

      <Hero netWorth={nw} assets={totalA} liabilities={totalL} snapshots={snapshots} />

      {snapshots.length > 1 && <Sparkline snapshots={snapshots} />}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Assets</h2>
          <span className="text-xs text-emerald-400 font-semibold">{fmt$(totalA)}</span>
        </div>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {assets.map((a) => (
              <AssetRow
                key={a.id}
                asset={a}
                onChange={(patch) => updateAsset(a.id, patch)}
                onDelete={() => onDel('asset', a.id, a.name)}
              />
            ))}
          </AnimatePresence>
        </ul>
        <AddRow onAdd={(name, value) => addAsset({ name, value })} label="New asset" color="#22c55e" />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Liabilities</h2>
          <span className="text-xs text-rose-400 font-semibold">{fmt$(totalL)}</span>
        </div>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {liabilities.map((l) => (
              <LiabilityRow
                key={l.id}
                liability={l}
                onChange={(patch) => updateLiability(l.id, patch)}
                onDelete={() => onDel('liability', l.id, l.name)}
              />
            ))}
          </AnimatePresence>
        </ul>
        <AddRow onAdd={(name, balance) => addLiability({ name, balance })} label="New liability" color="#ef4444" />
      </section>
    </div>
  );
}
