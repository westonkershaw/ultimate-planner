import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Plus, Trash2, Check, Archive, ArchiveRestore } from 'lucide-react';
import { useHabitStore, calcHabitStreak, isScheduledToday, todayKey, useUIStore } from '@/store';
import type { Habit, HabitFrequency } from '@/types';

const COLORS = ['#14b8a6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const EMOJI = ['🔥', '💧', '📚', '🏃', '🧘', '☀️', '🥗', '😴', '💪', '✍️'];
const FREQS: { id: HabitFrequency; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekends', label: 'Weekends' },
];

function HabitRow({ habit, onTick, onArchive, onDelete }: {
  habit: Habit;
  onTick: (id: string, neg?: boolean) => void;
  onArchive: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const today = todayKey();
  const count = habit.logs[today] ?? 0;
  const target = habit.target || 1;
  const done = count >= target;
  const scheduled = isScheduledToday(habit);
  const streak = useMemo(() => calcHabitStreak(habit), [habit]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={[
        'flex items-center gap-3 p-3 rounded-xl border bg-surface-1 transition-colors',
        done ? 'border-emerald-500/30' : 'border-border',
        habit.archived ? 'opacity-50' : '',
      ].join(' ')}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: `${habit.color}1f`, border: `1px solid ${habit.color}55` }}
      >
        {habit.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-fg-secondary truncate">{habit.name}</span>
          {streak > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
              <Flame size={10} className="fill-amber-400" />{streak}d
            </span>
          )}
        </div>
        <div className="text-[10px] text-fg-muted mt-0.5 capitalize">
          {habit.frequency}{scheduled ? '' : ' · not today'}
          {target > 1 ? ` · ${count}/${target}` : ''}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onTick(habit.id, done && target === 1)}
          disabled={habit.archived || !scheduled}
          aria-label={done ? `Mark ${habit.name} undone` : `Mark ${habit.name} done`}
          className={[
            'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
            done
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              : 'bg-surface-2 border border-border-strong text-fg-muted hover:text-fg-secondary',
            (habit.archived || !scheduled) ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <Check size={14} strokeWidth={done ? 3 : 2} />
        </button>
        <button
          onClick={() => onArchive(habit.id, !habit.archived)}
          aria-label={habit.archived ? 'Unarchive' : 'Archive'}
          className="w-7 h-7 rounded-lg text-fg-faint hover:text-fg-secondary transition-colors flex items-center justify-center"
        >
          {habit.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
        </button>
        <button
          onClick={() => onDelete(habit.id)}
          aria-label={`Delete ${habit.name}`}
          className="w-7 h-7 rounded-lg text-fg-faint hover:text-rose-400 transition-colors flex items-center justify-center"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.li>
  );
}

function NewHabitForm({ onClose }: { onClose: () => void }) {
  const addHabit = useHabitStore((s) => s.addHabit);
  const addToast = useUIStore((s) => s.addToast);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI[0]!);
  const [color, setColor] = useState(COLORS[0]!);
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');

  const submit = () => {
    if (!name.trim()) return;
    addHabit({ name: name.trim(), emoji, color, frequency });
    addToast(`Added "${name.trim()}"`, 'success');
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
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="New habit name"
          className="w-full bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none focus:border-accent/40"
        />

        <div className="flex items-center gap-1.5 flex-wrap">
          {EMOJI.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`w-8 h-8 rounded-lg text-base ${emoji === e ? 'bg-accent/20 border border-accent/40' : 'border border-border'}`}
            >{e}</button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white/30' : ''}`}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {FREQS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFrequency(f.id)}
              className={[
                'flex-1 px-2 py-1.5 rounded-lg border text-xs transition-colors',
                frequency === f.id
                  ? 'border-accent/40 bg-accent/15 text-accent-text'
                  : 'border-border text-fg-muted hover:text-fg-secondary',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-border text-xs text-fg-muted hover:text-fg-secondary transition-colors"
          >Cancel</button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className={[
              'flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
              name.trim() ? 'bg-accent hover:bg-accent-hover text-white' : 'bg-surface-2 text-fg-faint cursor-not-allowed',
            ].join(' ')}
          >Add habit</button>
        </div>
      </div>
    </motion.div>
  );
}

export default function HabitsView() {
  const habits = useHabitStore((s) => s.habits);
  const tick = useHabitStore((s) => s.tick);
  const archive = useHabitStore((s) => s.archiveHabit);
  const del = useHabitStore((s) => s.deleteHabit);
  const addToast = useUIStore((s) => s.addToast);
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const today = todayKey();
  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  const scheduledToday = active.filter((h) => isScheduledToday(h));
  const doneToday = scheduledToday.filter((h) => (h.logs[today] ?? 0) >= (h.target || 1)).length;

  const onDelete = (id: string) => {
    if (!window.confirm('Delete this habit and all its history?')) return;
    del(id);
    addToast('Habit deleted', 'warning');
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-amber-400" />
          <h1 className="font-syne text-lg font-bold text-fg">Habits</h1>
        </div>
        <span className="text-xs text-fg-muted">
          {doneToday}/{scheduledToday.length} today
        </span>
      </motion.div>

      <AnimatePresence initial={false}>
        {adding && <NewHabitForm key="form" onClose={() => setAdding(false)} />}
      </AnimatePresence>

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-border-strong text-fg-muted text-sm flex items-center justify-center gap-2 hover:border-accent/30 hover:text-accent-text transition-colors"
        >
          <Plus size={14} /> New habit
        </button>
      )}

      {active.length === 0 ? (
        <div className="text-center py-10 text-sm text-fg-muted">
          No habits yet — add your first one above.
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {active.map((h) => (
              <HabitRow key={h.id} habit={h} onTick={tick} onArchive={archive} onDelete={onDelete} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {archived.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs text-fg-muted hover:text-fg-secondary transition-colors"
          >
            {showArchived ? '− Hide' : '+ Show'} {archived.length} archived
          </button>
          <AnimatePresence initial={false}>
            {showArchived && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {archived.map((h) => (
                  <HabitRow key={h.id} habit={h} onTick={tick} onArchive={archive} onDelete={onDelete} />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
