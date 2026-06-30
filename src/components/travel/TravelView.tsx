import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Plus, Trash2, ArrowLeft, DollarSign } from 'lucide-react';
import { useTravelStore, useUIStore, spentOn, daysUntil } from '@/store';
import type { Trip, TripStatus } from '@/types';

const STATUSES: { id: TripStatus; label: string }[] = [
  { id: 'planning', label: 'Planning' },
  { id: 'active',   label: 'Active'   },
  { id: 'done',     label: 'Done'     },
];

function fmt$(n: number, ccy = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${n.toFixed(0)}`;
  }
}

function fmtDate(s?: string): string {
  if (!s) return '–';
  const d = new Date(s + 'T12:00:00');
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function TripCard({ trip, onSelect, onDelete }: { trip: Trip; onSelect: () => void; onDelete: () => void }) {
  const spent = useMemo(() => spentOn(trip), [trip]);
  const pct = trip.budget > 0 ? Math.min(100, Math.round((spent / trip.budget) * 100)) : 0;
  const days = daysUntil(trip.startDate);
  const cover = trip.coverColor ?? '#14b8a6';
  const over = spent > trip.budget && trip.budget > 0;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="rounded-xl border border-border bg-surface-1 overflow-hidden"
    >
      <button onClick={onSelect} className="w-full text-left p-4 flex items-start gap-3 hover:bg-surface-1 transition-colors">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: `${cover}25`, border: `1px solid ${cover}55` }}
        >
          {trip.emoji ?? '✈️'}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-sm font-semibold text-fg truncate">{trip.name}</div>
          <div className="text-[11px] text-fg-muted truncate">{trip.destination || '–'}</div>
          <div className="flex items-center gap-3 text-[10px] text-fg-muted pt-0.5">
            <span>{fmtDate(trip.startDate)} → {fmtDate(trip.endDate)}</span>
            {days !== null && days > 0 && <span className="text-accent-text">in {days}d</span>}
          </div>
        </div>
      </button>
      {trip.budget > 0 && (
        <div className="px-4 pb-3 space-y-1">
          <div className="relative h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <motion.div
              className={`absolute inset-y-0 left-0 ${over ? 'bg-rose-500' : 'bg-emerald-500'}`}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className={over ? 'text-rose-400' : 'text-fg-muted'}>
              {fmt$(spent, trip.currency)} of {fmt$(trip.budget, trip.currency)}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              aria-label={`Delete ${trip.name}`}
              className="text-fg-faint hover:text-rose-400 transition-colors p-0.5"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      )}
    </motion.li>
  );
}

function NewTripForm({ onClose }: { onClose: () => void }) {
  const addTrip = useTravelStore((s) => s.addTrip);
  const addToast = useUIStore((s) => s.addToast);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState<number | ''>('');

  const submit = () => {
    if (!name.trim()) return;
    addTrip({
      name: name.trim(),
      destination: destination.trim(),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      budget: budget === '' ? 0 : Number(budget),
    });
    addToast(`Trip "${name.trim()}" added`, 'success');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="p-4 rounded-xl border border-accent/25 bg-accent/[0.04] space-y-3">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Trip name"
          className="w-full bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none focus:border-accent/40"
        />
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Destination"
          className="w-full bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none focus:border-accent/40"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-fg-muted mb-1">Start</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-surface-0 border border-border rounded-lg px-2 py-1.5 text-xs text-fg outline-none focus:border-accent/40"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-fg-muted mb-1">End</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-surface-0 border border-border rounded-lg px-2 py-1.5 text-xs text-fg outline-none focus:border-accent/40"
            />
          </label>
        </div>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-fg-muted mb-1">Budget (optional)</span>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value === '' ? '' : parseFloat(e.target.value))}
            placeholder="0"
            className="w-full bg-surface-0 border border-border rounded-lg px-3 py-1.5 text-xs text-fg placeholder:text-fg-faint outline-none focus:border-accent/40"
          />
        </label>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-xs text-fg-muted hover:text-fg-secondary transition-colors">Cancel</button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className={[
              'flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
              name.trim() ? 'bg-accent hover:bg-accent-hover text-white' : 'bg-surface-2 text-fg-faint cursor-not-allowed',
            ].join(' ')}
          >Add trip</button>
        </div>
      </div>
    </motion.div>
  );
}

function TripDetail({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const addExpense = useTravelStore((s) => s.addExpense);
  const deleteExpense = useTravelStore((s) => s.deleteExpense);
  const updateTrip = useTravelStore((s) => s.updateTrip);
  const setStatus = useTravelStore((s) => s.setStatus);
  const addToast = useUIStore((s) => s.addToast);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<number | ''>('');

  const spent = useMemo(() => spentOn(trip), [trip]);
  const pct = trip.budget > 0 ? Math.min(100, Math.round((spent / trip.budget) * 100)) : 0;
  const over = spent > trip.budget && trip.budget > 0;

  const submitExpense = () => {
    if (!desc.trim() || amount === '' || isNaN(Number(amount))) return;
    addExpense(trip.id, {
      date: new Date().toLocaleDateString('en-CA'),
      description: desc.trim(),
      amount: Number(amount),
    });
    setDesc(''); setAmount('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="space-y-5"
    >
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg-secondary transition-colors">
        <ArrowLeft size={12} /> All trips
      </button>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{trip.emoji ?? '✈️'}</span>
          <div className="flex-1">
            <input
              value={trip.name}
              onChange={(e) => updateTrip(trip.id, { name: e.target.value })}
              className="w-full bg-transparent font-syne text-lg font-bold text-fg outline-none"
            />
            <input
              value={trip.destination}
              onChange={(e) => updateTrip(trip.id, { destination: e.target.value })}
              placeholder="Destination"
              className="w-full bg-transparent text-xs text-fg-muted outline-none mt-0.5"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatus(trip.id, s.id)}
              className={[
                'flex-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-colors',
                trip.status === s.id
                  ? 'border-accent/40 bg-accent/15 text-accent-text'
                  : 'border-border text-fg-muted hover:text-fg-secondary',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-surface-1 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-fg-muted">Budget</span>
          <input
            type="number"
            value={trip.budget || ''}
            onChange={(e) => updateTrip(trip.id, { budget: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="w-24 bg-transparent text-sm text-fg-secondary text-right outline-none"
          />
        </div>
        {trip.budget > 0 && (
          <>
            <div className="relative h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <motion.div
                className={`absolute inset-y-0 left-0 ${over ? 'bg-rose-500' : 'bg-emerald-500'}`}
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              />
            </div>
            <div className={`text-xs ${over ? 'text-rose-400' : 'text-fg-muted'}`}>
              {fmt$(spent, trip.currency)} of {fmt$(trip.budget, trip.currency)}{over ? ` (over by ${fmt$(spent - trip.budget, trip.currency)})` : ''}
            </div>
          </>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-fg-muted">Expenses</h2>

        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border-strong bg-surface-0">
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What did you spend on?"
            className="flex-1 min-w-0 bg-transparent text-sm text-fg-secondary placeholder:text-fg-faint outline-none"
            onKeyDown={(e) => e.key === 'Enter' && submitExpense()}
          />
          <div className="flex items-center text-sm text-emerald-400">
            <DollarSign size={12} className="text-fg-faint" />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="0"
              className="w-20 bg-transparent text-right placeholder:text-fg-faint outline-none"
              onKeyDown={(e) => e.key === 'Enter' && submitExpense()}
            />
          </div>
          <button
            onClick={submitExpense}
            disabled={!desc.trim() || amount === ''}
            aria-label="Add expense"
            className={[
              'p-1 rounded-md transition-colors',
              desc.trim() && amount !== '' ? 'text-accent-text hover:bg-accent/15' : 'text-fg-faint cursor-not-allowed',
            ].join(' ')}
          >
            <Plus size={14} />
          </button>
        </div>

        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {trip.expenses.length === 0 ? (
              <li className="text-center py-6 text-xs text-fg-muted">No expenses logged yet.</li>
            ) : (
              [...trip.expenses].reverse().map((e) => (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-surface-1"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-fg-secondary truncate">{e.description}</div>
                    <div className="text-[10px] text-fg-muted">{fmtDate(e.date)}</div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">{fmt$(e.amount, trip.currency)}</span>
                  <button
                    onClick={() => { deleteExpense(trip.id, e.id); addToast('Expense deleted', 'warning'); }}
                    aria-label={`Delete ${e.description}`}
                    className="text-fg-faint hover:text-rose-400 transition-colors p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </motion.li>
              ))
            )}
          </AnimatePresence>
        </ul>
      </section>
    </motion.div>
  );
}

export default function TravelView() {
  const trips = useTravelStore((s) => s.trips);
  const deleteTrip = useTravelStore((s) => s.deleteTrip);
  const addToast = useUIStore((s) => s.addToast);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const selected = useMemo(() => trips.find((t) => t.id === selectedId) ?? null, [trips, selectedId]);

  const onDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete trip "${name}"?`)) return;
    deleteTrip(id);
    if (selectedId === id) setSelectedId(null);
    addToast('Trip deleted', 'warning');
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Plane size={18} className="text-accent-text" />
        <h1 className="font-syne text-lg font-bold text-fg">Travel</h1>
      </motion.div>

      <AnimatePresence mode="wait">
        {selected ? (
          <TripDetail key={selected.id} trip={selected} onBack={() => setSelectedId(null)} />
        ) : (
          <motion.div key="list" className="space-y-4">
            <AnimatePresence initial={false}>
              {adding && <NewTripForm key="form" onClose={() => setAdding(false)} />}
            </AnimatePresence>

            {!adding && (
              <button
                onClick={() => setAdding(true)}
                className="w-full py-2.5 rounded-xl border border-dashed border-border-strong text-fg-muted text-sm flex items-center justify-center gap-2 hover:border-accent/30 hover:text-accent-text transition-colors"
              >
                <Plus size={14} /> Plan a new trip
              </button>
            )}

            {trips.length === 0 ? (
              <div className="text-center py-10 text-sm text-fg-muted">
                No trips yet — plan your first above.
              </div>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {trips.map((t) => (
                    <TripCard
                      key={t.id}
                      trip={t}
                      onSelect={() => setSelectedId(t.id)}
                      onDelete={() => onDelete(t.id, t.name)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
