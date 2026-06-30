import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, Plus, Star, Trash2, Target } from 'lucide-react';
import { useReadingStore, useUIStore, booksThisYear, goalProgressPct } from '@/store';
import type { Book, ReadingStatus } from '@/types';

const SHELVES: { id: ReadingStatus; label: string }[] = [
  { id: 'reading', label: 'Reading' },
  { id: 'want',    label: 'Want'    },
  { id: 'done',    label: 'Done'    },
];

function BookCard({ book, onStatus, onDelete, onProgress }: {
  book: Book;
  onStatus: (id: string, s: ReadingStatus) => void;
  onDelete: (id: string) => void;
  onProgress: (id: string, pct: number) => void;
}) {
  const pct = Math.max(0, Math.min(100, book.progress ?? 0));
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="p-3 rounded-xl border border-border bg-surface-1 space-y-2"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{book.emoji ?? '📚'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-fg-secondary truncate">{book.title}</div>
          {book.author && <div className="text-[11px] text-fg-muted truncate">{book.author}</div>}
        </div>
        {book.status === 'done' && book.rating > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: book.rating }).map((_, i) => (
              <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
            ))}
          </div>
        )}
        <button
          onClick={() => onDelete(book.id)}
          aria-label={`Delete ${book.title}`}
          className="text-fg-faint hover:text-rose-400 transition-colors p-1"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {book.status === 'reading' && (
        <>
          <div className="relative h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-accent"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-fg-muted">
            <input
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => onProgress(book.id, parseInt(e.target.value))}
              aria-label={`${book.title} progress`}
              className="flex-1 mr-2 accent-accent"
            />
            <span className="w-10 text-right">{pct}%</span>
          </div>
        </>
      )}

      <div className="flex items-center gap-1">
        {SHELVES.map((s) => (
          <button
            key={s.id}
            onClick={() => onStatus(book.id, s.id)}
            className={[
              'flex-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors',
              book.status === s.id
                ? 'border-accent/40 bg-accent/15 text-accent-text'
                : 'border-border text-fg-faint hover:text-fg-muted',
            ].join(' ')}
          >
            {s.label}
          </button>
        ))}
      </div>
    </motion.li>
  );
}

function NewBookForm({ onClose }: { onClose: () => void }) {
  const addBook = useReadingStore((s) => s.addBook);
  const addToast = useUIStore((s) => s.addToast);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<ReadingStatus>('want');

  const submit = () => {
    if (!title.trim()) return;
    addBook({ title: title.trim(), author: author.trim(), status });
    addToast(`Added "${title.trim()}"`, 'success');
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Book title"
          className="w-full bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none focus:border-accent/40"
        />
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Author (optional)"
          className="w-full bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none focus:border-accent/40"
        />
        <div className="flex items-center gap-1.5">
          {SHELVES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              className={[
                'flex-1 px-2 py-1.5 rounded-lg border text-xs transition-colors',
                status === s.id
                  ? 'border-accent/40 bg-accent/15 text-accent-text'
                  : 'border-border text-fg-muted hover:text-fg-secondary',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-xs text-fg-muted hover:text-fg-secondary transition-colors">Cancel</button>
          <button
            onClick={submit}
            disabled={!title.trim()}
            className={[
              'flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
              title.trim() ? 'bg-accent hover:bg-accent-hover text-white' : 'bg-surface-2 text-fg-faint cursor-not-allowed',
            ].join(' ')}
          >Add book</button>
        </div>
      </div>
    </motion.div>
  );
}

function GoalCard() {
  const goal = useReadingStore((s) => s.goal);
  const books = useReadingStore((s) => s.books);
  const setGoal = useReadingStore((s) => s.setGoal);
  const doneThisYear = useMemo(() => booksThisYear(books, goal.year).length, [books, goal.year]);
  const pct = useMemo(() => goalProgressPct(books, goal), [books, goal]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal.target);

  return (
    <div className="p-4 rounded-xl border border-border bg-surface-1 space-y-2">
      <div className="flex items-center gap-2">
        <Target size={14} className="text-emerald-400" />
        <span className="text-[10px] uppercase tracking-wider text-fg-muted">{goal.year} reading goal</span>
        <button onClick={() => { setDraft(goal.target); setEditing((v) => !v); }} className="ml-auto text-[10px] text-fg-muted hover:text-fg-secondary transition-colors">
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      <div className="text-sm text-fg-secondary">
        <span className="font-semibold text-emerald-400">{doneThisYear}</span>
        <span className="text-fg-muted"> / </span>
        <span>{goal.target} books</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-emerald-500"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        />
      </div>
      {editing && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="number"
            min={1}
            value={draft}
            onChange={(e) => setDraft(parseInt(e.target.value) || 1)}
            className="w-20 bg-surface-0 border border-border rounded-lg px-2 py-1 text-xs text-fg outline-none focus:border-accent/40"
          />
          <button
            onClick={() => { setGoal(draft); setEditing(false); }}
            className="px-3 py-1 rounded-lg bg-accent/15 border border-accent/30 text-xs text-accent-text hover:bg-accent/25"
          >Save</button>
        </div>
      )}
    </div>
  );
}

export default function ReadingView() {
  const books = useReadingStore((s) => s.books);
  const setStatus = useReadingStore((s) => s.setStatus);
  const updateBook = useReadingStore((s) => s.updateBook);
  const deleteBook = useReadingStore((s) => s.deleteBook);
  const addToast = useUIStore((s) => s.addToast);

  const [adding, setAdding] = useState(false);
  const [shelf, setShelf] = useState<ReadingStatus>('reading');

  const shelfBooks = useMemo(() => books.filter((b) => b.status === shelf), [books, shelf]);
  const counts = useMemo(
    () => SHELVES.reduce((acc, s) => ({ ...acc, [s.id]: books.filter((b) => b.status === s.id).length }), {} as Record<ReadingStatus, number>),
    [books],
  );

  const onDelete = (id: string) => {
    if (!window.confirm('Delete this book?')) return;
    deleteBook(id);
    addToast('Book deleted', 'warning');
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Library size={18} className="text-accent-text" />
        <h1 className="font-syne text-lg font-bold text-fg">Reading</h1>
      </motion.div>

      <GoalCard />

      <AnimatePresence initial={false}>
        {adding && <NewBookForm key="form" onClose={() => setAdding(false)} />}
      </AnimatePresence>

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-border-strong text-fg-muted text-sm flex items-center justify-center gap-2 hover:border-accent/30 hover:text-accent-text transition-colors"
        >
          <Plus size={14} /> Add a book
        </button>
      )}

      <div className="flex items-center gap-1.5">
        {SHELVES.map((s) => (
          <button
            key={s.id}
            onClick={() => setShelf(s.id)}
            className={[
              'flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-2',
              shelf === s.id
                ? 'border-accent/40 bg-accent/15 text-accent-text'
                : 'border-border text-fg-muted hover:text-fg-secondary',
            ].join(' ')}
          >
            {s.label}
            <span className="text-[10px] text-fg-muted">{counts[s.id]}</span>
          </button>
        ))}
      </div>

      {shelfBooks.length === 0 ? (
        <div className="text-center py-10 text-sm text-fg-muted">
          Nothing on this shelf yet.
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {shelfBooks.map((b) => (
              <BookCard
                key={b.id}
                book={b}
                onStatus={setStatus}
                onDelete={onDelete}
                onProgress={(id, pct) => updateBook(id, { progress: pct })}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
