import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Flame, TrendingUp, Trash2 } from 'lucide-react';
import { useMoodStore, useUIStore, calcMoodStreak, calcMoodAvg } from '@/store';
import { todayKey } from '@/store/useMoodStore';
import type { MoodEntry, MoodScore } from '@/types';

const MOODS: { score: MoodScore; emoji: string; label: string; color: string }[] = [
  { score: 1, emoji: '😔', label: 'Rough',   color: '#ef4444' },
  { score: 2, emoji: '😕', label: 'Meh',     color: '#f97316' },
  { score: 3, emoji: '😐', label: 'Okay',    color: '#eab308' },
  { score: 4, emoji: '😊', label: 'Good',    color: '#22c55e' },
  { score: 5, emoji: '😄', label: 'Great',   color: '#6366f1' },
];

function moodFor(score: MoodScore) {
  return MOODS.find((m) => m.score === score);
}

function fmtDate(s: string): string {
  const d = new Date(s + 'T12:00:00');
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function StatPill({ Icon, label, value }: { Icon: React.FC<{ size?: number }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-800/40 bg-slate-900/30">
      <Icon size={14} />
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-200 ml-auto">{value}</span>
    </div>
  );
}

function TodayComposer() {
  const entries = useMoodStore((s) => s.entries);
  const logMood = useMoodStore((s) => s.logMood);
  const addToast = useUIStore((s) => s.addToast);

  const today = todayKey();
  const existing = useMemo(() => entries.find((e) => e.date === today), [entries, today]);

  const [selected, setSelected] = useState<MoodScore | null>(existing?.score ?? null);
  const [note, setNote] = useState(existing?.note ?? '');

  useEffect(() => {
    if (existing) {
      setSelected(existing.score);
      setNote(existing.note ?? '');
    }
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!selected) return;
    logMood(selected, note);
    addToast(existing ? 'Mood updated' : 'Mood logged', 'success');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4 rounded-2xl border border-slate-800/40 bg-slate-900/30"
    >
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          How are you feeling? · {fmtDate(today)}
        </h2>
      </div>

      <div className="flex items-center justify-between gap-1">
        {MOODS.map((m) => {
          const isSelected = selected === m.score;
          return (
            <button
              key={m.score}
              onClick={() => setSelected(m.score)}
              aria-label={`${m.label} mood`}
              aria-pressed={isSelected}
              className={[
                'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all',
                isSelected
                  ? 'border-indigo-500/40 bg-indigo-500/15 scale-105'
                  : 'border-slate-800/40 bg-slate-950/40 hover:border-slate-700',
              ].join(' ')}
              style={isSelected ? { borderColor: m.color, boxShadow: `0 0 0 1px ${m.color}55` } : undefined}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[10px] text-slate-400">{m.label}</span>
            </button>
          );
        })}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What's behind it? (optional)"
        rows={2}
        className="w-full resize-none bg-slate-950/40 border border-slate-800/40 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/40"
      />

      <button
        onClick={save}
        disabled={!selected}
        className={[
          'w-full py-2.5 rounded-xl text-sm font-semibold transition-colors',
          selected ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-slate-800/40 text-slate-600 cursor-not-allowed',
        ].join(' ')}
      >
        {existing ? 'Update mood' : 'Log mood'}
      </button>
    </motion.section>
  );
}

function EntryItem({ entry, onDelete }: { entry: MoodEntry; onDelete: (id: string) => void }) {
  const m = moodFor(entry.score);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-start gap-3 p-3 rounded-xl border border-slate-800/40 bg-slate-900/20"
    >
      <span className="text-2xl flex-shrink-0">{m?.emoji ?? '·'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">{fmtDate(entry.date)}</span>
          {m && <span className="text-[10px] text-slate-500">{m.label}</span>}
        </div>
        {entry.note && <p className="text-xs text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap">{entry.note}</p>}
      </div>
      <button
        onClick={() => onDelete(entry.id)}
        aria-label={`Delete mood entry from ${entry.date}`}
        className="text-slate-600 hover:text-rose-400 transition-colors p-1"
      >
        <Trash2 size={12} />
      </button>
    </motion.li>
  );
}

export default function MoodView() {
  const entries = useMoodStore((s) => s.entries);
  const deleteEntry = useMoodStore((s) => s.deleteEntry);
  const addToast = useUIStore((s) => s.addToast);

  const streak = useMemo(() => calcMoodStreak(entries), [entries]);
  const avg7 = useMemo(() => calcMoodAvg(entries, 7), [entries]);

  const today = todayKey();
  const history = useMemo(() => entries.filter((e) => e.date !== today), [entries, today]);

  const onDelete = (id: string) => {
    if (!window.confirm('Delete this mood entry?')) return;
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
        <Smile size={18} className="text-indigo-400" />
        <h1 className="font-syne text-lg font-bold text-slate-100">Mood</h1>
      </motion.div>

      <div className="grid grid-cols-3 gap-2">
        <StatPill Icon={({ size }) => <Flame size={size} className="text-amber-400" />} label="Streak" value={`${streak}d`} />
        <StatPill Icon={({ size }) => <TrendingUp size={size} className="text-emerald-400" />} label="7d avg" value={avg7 > 0 ? `${avg7}/5` : '–'} />
        <StatPill Icon={({ size }) => <Smile size={size} className="text-violet-400" />} label="Entries" value={String(entries.length)} />
      </div>

      <TodayComposer />

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">History</h2>
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
