import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Flame, Hash, Star, Trash2 } from 'lucide-react';
import { useJournalStore, calcWritingStreak, calcLifetimeWords, todayKey } from '@/store';
import { useUIStore } from '@/store';
import type { JournalEntry, JournalRating } from '@/types';

const MOODS = ['😄', '😊', '😐', '😕', '😔'] as const;
const QUICK_TAGS = ['#grateful', '#productive', '#stressed', '#reflective', '#motivated'];

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function StarRow({ value, onChange }: { value: JournalRating; onChange: (n: JournalRating) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Day rating">
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
            size={18}
            className={value >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}
          />
        </button>
      ))}
    </div>
  );
}

function StatPill({ Icon, label, value }: { Icon: React.FC<{ size?: number }>; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-800/40 bg-slate-900/30">
      <Icon size={14} />
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-200 ml-auto">{value}</span>
    </div>
  );
}

function TodayComposer() {
  const entries = useJournalStore((s) => s.entries);
  const upsertToday = useJournalStore((s) => s.upsertToday);
  const addToast = useUIStore((s) => s.addToast);

  const today = todayKey();
  const existing = useMemo(() => entries.find((e) => e.date === today), [entries, today]);

  const [text, setText] = useState(existing?.text ?? '');
  const [rating, setRating] = useState<JournalRating>(existing?.rating ?? 0);
  const [mood, setMood] = useState(existing?.mood ?? '');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);

  const wc = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const save = () => {
    if (!text.trim()) return;
    upsertToday({ text, rating, mood, tags });
    addToast(existing ? 'Entry updated' : 'Entry saved', 'success');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 p-4 rounded-2xl border border-slate-800/40 bg-slate-900/30"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Today · {fmtDate(today)}
        </h2>
        <StarRow value={rating} onChange={setRating} />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's on your mind?"
        rows={6}
        className="w-full resize-none bg-slate-950/40 border border-slate-800/40 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-colors leading-relaxed"
      />

      <div className="flex items-center gap-2 flex-wrap">
        {MOODS.map((m) => (
          <button
            key={m}
            onClick={() => setMood(mood === m ? '' : m)}
            aria-label={`Mood: ${m}`}
            className={[
              'w-9 h-9 rounded-xl border text-lg transition-colors flex items-center justify-center',
              mood === m
                ? 'border-indigo-500/40 bg-indigo-500/15'
                : 'border-slate-800/40 bg-slate-950/40 hover:border-slate-700',
            ].join(' ')}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {QUICK_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => toggleTag(t)}
            className={[
              'text-[11px] px-2 py-1 rounded-full border transition-colors',
              tags.includes(t)
                ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                : 'border-slate-800/40 text-slate-500 hover:text-slate-300',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/40">
        <span className="text-[11px] text-slate-500">{wc} {wc === 1 ? 'word' : 'words'}</span>
        <button
          onClick={save}
          disabled={!text.trim()}
          className={[
            'px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors',
            text.trim()
              ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
              : 'bg-slate-800/40 text-slate-600 cursor-not-allowed',
          ].join(' ')}
        >
          {existing ? 'Update' : 'Save entry'}
        </button>
      </div>
    </motion.section>
  );
}

function EntryItem({ entry, onDelete }: { entry: JournalEntry; onDelete: (id: string) => void }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="p-4 rounded-xl border border-slate-800/40 bg-slate-900/20 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">{fmtDate(entry.date)}</span>
          {entry.mood && <span className="text-sm">{entry.mood}</span>}
        </div>
        <div className="flex items-center gap-2">
          {entry.rating > 0 && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: entry.rating }).map((_, i) => (
                <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
          )}
          <button
            onClick={() => onDelete(entry.id)}
            aria-label={`Delete entry from ${entry.date}`}
            className="text-slate-600 hover:text-rose-400 transition-colors p-1"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{entry.text}</p>
      {entry.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {entry.tags.map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800/60 text-slate-500">
              {t}
            </span>
          ))}
        </div>
      )}
    </motion.li>
  );
}

export default function JournalView() {
  const entries = useJournalStore((s) => s.entries);
  const deleteEntry = useJournalStore((s) => s.deleteEntry);
  const addToast = useUIStore((s) => s.addToast);

  const streak = useMemo(() => calcWritingStreak(entries), [entries]);
  const totalWords = useMemo(() => calcLifetimeWords(entries), [entries]);
  const today = todayKey();
  const history = useMemo(() => entries.filter((e) => e.date !== today), [entries, today]);

  const onDelete = (id: string) => {
    if (!window.confirm('Delete this entry?')) return;
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
        <BookOpen size={18} className="text-indigo-400" />
        <h1 className="font-syne text-lg font-bold text-slate-100">Journal</h1>
      </motion.div>

      <div className="grid grid-cols-3 gap-2">
        <StatPill Icon={({ size }) => <Flame size={size} className="text-amber-400" />} label="Streak" value={`${streak}d`} />
        <StatPill Icon={({ size }) => <BookOpen size={size} className="text-indigo-400" />} label="Entries" value={entries.length} />
        <StatPill Icon={({ size }) => <Hash size={size} className="text-emerald-400" />} label="Words" value={totalWords.toLocaleString()} />
      </div>

      <TodayComposer />

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Past entries</h2>
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
