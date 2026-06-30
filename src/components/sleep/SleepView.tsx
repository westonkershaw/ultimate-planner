import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Star, Trash2, Clock, Gauge } from 'lucide-react';
import { useSleepStore, useUIStore, durationHours, calcAvgHours, calcAvgQuality } from '@/store';
import { todayKey } from '@/store/useSleepStore';
import type { SleepEntry, SleepQuality } from '@/types';

function fmtDate(s: string): string {
  const d = new Date(s + 'T12:00:00');
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtHours(h: number): string {
  if (h <= 0) return '–';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h ${mm}m`;
}

function StarRow({ value, onChange }: { value: SleepQuality; onChange: (n: SleepQuality) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Sleep quality">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            size={20}
            className={value >= n ? 'fill-amber-400 text-amber-400' : 'text-fg-faint'}
          />
        </button>
      ))}
    </div>
  );
}

function StatPill({ Icon, label, value }: { Icon: React.FC<{ size?: number }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-surface-1">
      <Icon size={14} />
      <span className="text-[10px] uppercase tracking-wider text-fg-muted">{label}</span>
      <span className="text-sm font-semibold text-fg-secondary ml-auto">{value}</span>
    </div>
  );
}

function TodayComposer() {
  const entries = useSleepStore((s) => s.entries);
  const upsert = useSleepStore((s) => s.upsertEntry);
  const addToast = useUIStore((s) => s.addToast);

  const today = todayKey();
  const existing = useMemo(() => entries.find((e) => e.date === today), [entries, today]);

  const [bedTime, setBedTime] = useState(existing?.bedTime ?? '22:30');
  const [wakeTime, setWakeTime] = useState(existing?.wakeTime ?? '06:30');
  const [quality, setQuality] = useState<SleepQuality>(existing?.quality ?? 0);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const hours = durationHours(bedTime, wakeTime);
  const canSave = quality > 0 && bedTime && wakeTime && hours > 0;

  const save = () => {
    if (!canSave) return;
    upsert({ date: today, bedTime, wakeTime, quality, notes });
    addToast(existing ? 'Sleep updated' : 'Sleep logged', 'success');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4 rounded-panel border border-border bg-surface-1"
    >
      <h2 className="text-xs font-medium uppercase tracking-wider text-fg-muted">
        Last night · {fmtDate(today)}
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-fg-muted mb-1">Bed</span>
          <input
            type="time"
            value={bedTime}
            onChange={(e) => setBedTime(e.target.value)}
            className="w-full bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-accent/40"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-fg-muted mb-1">Wake</span>
          <input
            type="time"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            className="w-full bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-accent/40"
          />
        </label>
      </div>

      <div className="text-center text-sm text-accent-text font-semibold">
        {fmtHours(hours)} of sleep
      </div>

      <div className="flex items-center justify-center">
        <StarRow value={quality} onChange={setQuality} />
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full resize-none bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none focus:border-accent/40"
      />

      <button
        onClick={save}
        disabled={!canSave}
        className={[
          'w-full py-2.5 rounded-xl text-sm font-semibold transition-colors',
          canSave ? 'bg-accent hover:bg-accent-hover text-white' : 'bg-surface-2 text-fg-faint cursor-not-allowed',
        ].join(' ')}
      >
        {existing ? 'Update sleep' : 'Log sleep'}
      </button>
    </motion.section>
  );
}

function EntryItem({ entry, onDelete }: { entry: SleepEntry; onDelete: (id: string) => void }) {
  const hours = durationHours(entry.bedTime, entry.wakeTime);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-1"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-fg-secondary">{fmtDate(entry.date)}</span>
          <span className="text-[10px] text-fg-muted">{entry.bedTime} → {entry.wakeTime}</span>
        </div>
        <div className="text-[11px] text-fg-muted mt-0.5">{fmtHours(hours)}</div>
        {entry.notes && <div className="text-xs text-fg-muted mt-1 line-clamp-2">{entry.notes}</div>}
      </div>
      {entry.quality > 0 && (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: entry.quality }).map((_, i) => (
            <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
          ))}
        </div>
      )}
      <button
        onClick={() => onDelete(entry.id)}
        aria-label={`Delete sleep entry from ${entry.date}`}
        className="text-fg-faint hover:text-rose-400 transition-colors p-1"
      >
        <Trash2 size={12} />
      </button>
    </motion.li>
  );
}

export default function SleepView() {
  const entries = useSleepStore((s) => s.entries);
  const deleteEntry = useSleepStore((s) => s.deleteEntry);
  const addToast = useUIStore((s) => s.addToast);

  const avg7 = useMemo(() => calcAvgHours(entries, 7), [entries]);
  const avgQ = useMemo(() => calcAvgQuality(entries, 7), [entries]);

  const today = todayKey();
  const history = useMemo(() => entries.filter((e) => e.date !== today), [entries, today]);

  const onDelete = (id: string) => {
    if (!window.confirm('Delete this sleep entry?')) return;
    deleteEntry(id);
    addToast('Entry deleted', 'warning');
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Moon size={18} className="text-accent-text" />
        <h1 className="font-syne text-lg font-bold text-fg">Sleep</h1>
      </motion.div>

      <div className="grid grid-cols-3 gap-2">
        <StatPill Icon={({ size }) => <Clock size={size} className="text-accent-text" />} label="7d avg" value={fmtHours(avg7)} />
        <StatPill Icon={({ size }) => <Gauge size={size} className="text-emerald-400" />} label="Quality" value={avgQ > 0 ? `${avgQ}/5` : '–'} />
        <StatPill Icon={({ size }) => <Moon size={size} className="text-accent-text" />} label="Entries" value={String(entries.length)} />
      </div>

      <TodayComposer />

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-fg-muted">History</h2>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {history.map((e) => (
                <EntryItem key={e.id} entry={e} onDelete={onDelete} />
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}
    </div>
  );
}
