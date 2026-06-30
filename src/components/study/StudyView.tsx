import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Plus, Trash2, ArrowLeft, Play, Check, X, Flame } from 'lucide-react';
import { useStudyStore, useUIStore, calcStudyStreak } from '@/store';
import type { FlashcardDeck, Flashcard } from '@/types';

function DeckListItem({ deck, onOpen, onDelete, onStudy }: {
  deck: FlashcardDeck; onOpen: () => void; onDelete: () => void; onStudy: () => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="rounded-xl border border-border bg-surface-1 p-3 flex items-center gap-3"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: `${deck.color}25`, border: `1px solid ${deck.color}55` }}
      >
        {deck.emoji}
      </div>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className="text-sm font-semibold text-fg truncate">{deck.name}</div>
        <div className="text-[11px] text-fg-muted">
          {deck.cards.length} cards · {deck.totalReviews} reviews
        </div>
      </button>
      {deck.cards.length > 0 && (
        <button
          onClick={onStudy}
          aria-label={`Study ${deck.name}`}
          className="px-2.5 py-1.5 rounded-lg border border-accent/30 bg-accent/10 text-xs font-medium text-accent-text hover:bg-accent/20 transition-colors flex items-center gap-1"
        >
          <Play size={11} /> Study
        </button>
      )}
      <button onClick={onDelete} aria-label={`Delete ${deck.name}`} className="text-fg-faint hover:text-rose-400 transition-colors p-1">
        <Trash2 size={12} />
      </button>
    </motion.li>
  );
}

function AddCardRow({ onAdd }: { onAdd: (front: string, back: string) => void }) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const submit = () => {
    if (!front.trim() || !back.trim()) return;
    onAdd(front.trim(), back.trim());
    setFront(''); setBack('');
  };
  return (
    <div className="p-3 rounded-xl border border-dashed border-border-strong bg-surface-0 space-y-2">
      <input
        value={front}
        onChange={(e) => setFront(e.target.value)}
        placeholder="Front (question)"
        className="w-full bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm text-fg-secondary placeholder:text-fg-faint outline-none focus:border-accent/40"
      />
      <div className="flex items-center gap-2">
        <input
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Back (answer)"
          className="flex-1 bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm text-fg-secondary placeholder:text-fg-faint outline-none focus:border-accent/40"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button
          onClick={submit}
          disabled={!front.trim() || !back.trim()}
          aria-label="Add card"
          className={[
            'p-1.5 rounded-md transition-colors',
            front.trim() && back.trim() ? 'text-accent-text hover:bg-accent/15' : 'text-fg-faint cursor-not-allowed',
          ].join(' ')}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function DeckDetail({ deck, onBack, onStudy }: { deck: FlashcardDeck; onBack: () => void; onStudy: () => void }) {
  const updateDeck = useStudyStore((s) => s.updateDeck);
  const addCard = useStudyStore((s) => s.addCard);
  const deleteCard = useStudyStore((s) => s.deleteCard);
  const addToast = useUIStore((s) => s.addToast);

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="space-y-4"
    >
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg-secondary transition-colors">
        <ArrowLeft size={12} /> All decks
      </button>

      <div className="flex items-center gap-3">
        <span className="text-3xl">{deck.emoji}</span>
        <input
          value={deck.name}
          onChange={(e) => updateDeck(deck.id, { name: e.target.value })}
          className="flex-1 bg-transparent font-syne text-lg font-bold text-fg outline-none"
        />
        {deck.cards.length > 0 && (
          <button
            onClick={onStudy}
            className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center gap-1"
          >
            <Play size={12} /> Study
          </button>
        )}
      </div>

      <AddCardRow onAdd={(front, back) => addCard(deck.id, { front, back })} />

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {deck.cards.map((c) => (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="p-3 rounded-lg border border-border bg-surface-1 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="text-sm text-fg leading-snug">{c.front}</div>
                <div className="text-xs text-fg-muted leading-snug">{c.back}</div>
                {c.reviews > 0 && (
                  <div className="text-[10px] text-fg-faint">
                    {c.reviews} review{c.reviews === 1 ? '' : 's'}{c.lastGrade > 0 ? ` · last grade ${c.lastGrade}/5` : ''}
                  </div>
                )}
              </div>
              <button
                onClick={() => { deleteCard(deck.id, c.id); addToast('Card removed', 'warning'); }}
                aria-label="Delete card"
                className="text-fg-faint hover:text-rose-400 transition-colors p-1"
              >
                <Trash2 size={12} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {deck.cards.length === 0 && (
        <div className="text-center py-6 text-xs text-fg-muted">No cards yet — add some above.</div>
      )}
    </motion.div>
  );
}

function StudySession({ deck, onDone }: { deck: FlashcardDeck; onDone: () => void }) {
  const updateCard = useStudyStore((s) => s.updateCard);
  const recordSession = useStudyStore((s) => s.recordSession);
  const addToast = useUIStore((s) => s.addToast);
  const [queue] = useState<Flashcard[]>(() => [...deck.cards].sort(() => Math.random() - 0.5));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const card = queue[index];
  const finish = (reviewed: number) => {
    const dur = Math.round((Date.now() - startedAt) / 1000);
    recordSession(deck.id, reviewed, dur);
    addToast(`Reviewed ${reviewed} card${reviewed === 1 ? '' : 's'} in ${dur}s`, 'success');
    onDone();
  };

  if (!card) {
    finish(queue.length);
    return null;
  }

  const grade = (g: 1 | 5) => {
    updateCard(deck.id, card.id, { reviews: card.reviews + 1, lastGrade: g });
    if (index + 1 >= queue.length) finish(queue.length);
    else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <button onClick={onDone} className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg-secondary transition-colors">
          <ArrowLeft size={12} /> End session
        </button>
        <span className="text-xs text-fg-muted">{index + 1} of {queue.length}</span>
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full min-h-[200px] p-6 rounded-panel border border-border bg-surface-1 flex items-center justify-center text-center text-fg hover:bg-surface-1 transition-colors"
      >
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-fg-muted">{flipped ? 'Answer' : 'Question'}</div>
          <div className="text-lg leading-relaxed">{flipped ? card.back : card.front}</div>
          {!flipped && <div className="text-[11px] text-fg-faint pt-2">tap to reveal</div>}
        </div>
      </button>

      {flipped && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => grade(1)}
            className="flex-1 py-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-medium hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <X size={14} /> Forgot
          </button>
          <button
            onClick={() => grade(5)}
            className="flex-1 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <Check size={14} /> Got it
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function StudyView() {
  const decks = useStudyStore((s) => s.decks);
  const sessions = useStudyStore((s) => s.sessions);
  const addDeck = useStudyStore((s) => s.addDeck);
  const deleteDeck = useStudyStore((s) => s.deleteDeck);
  const addToast = useUIStore((s) => s.addToast);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [studyingId, setStudyingId] = useState<string | null>(null);

  const selected = useMemo(() => decks.find((d) => d.id === selectedId) ?? null, [decks, selectedId]);
  const studying = useMemo(() => decks.find((d) => d.id === studyingId) ?? null, [decks, studyingId]);
  const streak = useMemo(() => calcStudyStreak(sessions), [sessions]);

  const newDeck = () => {
    const id = addDeck({ name: 'New Deck' });
    setSelectedId(id);
  };

  const onDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete deck "${name}" and all its cards?`)) return;
    deleteDeck(id);
    if (selectedId === id) setSelectedId(null);
    addToast('Deck deleted', 'warning');
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <GraduationCap size={18} className="text-accent-text" />
        <h1 className="font-syne text-lg font-bold text-fg">Study</h1>
        {streak > 0 && (
          <span className="ml-auto flex items-center gap-1 text-xs text-amber-400">
            <Flame size={12} className="fill-amber-400" /> {streak}d
          </span>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {studying ? (
          <StudySession key={`session-${studying.id}`} deck={studying} onDone={() => setStudyingId(null)} />
        ) : selected ? (
          <DeckDetail
            key={selected.id}
            deck={selected}
            onBack={() => setSelectedId(null)}
            onStudy={() => setStudyingId(selected.id)}
          />
        ) : (
          <motion.div key="list" className="space-y-3">
            <button
              onClick={newDeck}
              className="w-full py-2.5 rounded-xl border border-dashed border-border-strong text-fg-muted text-sm flex items-center justify-center gap-2 hover:border-accent/30 hover:text-accent-text transition-colors"
            >
              <Plus size={14} /> New deck
            </button>

            {decks.length === 0 ? (
              <div className="text-center py-10 text-sm text-fg-muted">
                No decks yet — create your first above.
              </div>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {decks.map((d) => (
                    <DeckListItem
                      key={d.id}
                      deck={d}
                      onOpen={() => setSelectedId(d.id)}
                      onDelete={() => onDelete(d.id, d.name)}
                      onStudy={() => setStudyingId(d.id)}
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
