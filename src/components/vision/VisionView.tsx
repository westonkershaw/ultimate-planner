import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Plus, Trash2, ArrowLeft, Target, Quote, Sparkles, StickyNote } from 'lucide-react';
import { useVisionStore, useUIStore } from '@/store';
import type { VisionBoard, VisionCardType } from '@/types';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#c084fc', '#06b6d4'];

const TYPE_META: Record<VisionCardType, { label: string; Icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>; color: string }> = {
  goal:        { label: 'Goal',        Icon: Target,     color: '#22c55e' },
  quote:       { label: 'Quote',       Icon: Quote,      color: '#06b6d4' },
  affirmation: { label: 'Affirmation', Icon: Sparkles,   color: '#c084fc' },
  note:        { label: 'Note',        Icon: StickyNote, color: '#6366f1' },
};

const TYPES: VisionCardType[] = ['goal', 'quote', 'affirmation', 'note'];

function BoardCard({ board, onOpen, onDelete }: { board: VisionBoard; onOpen: () => void; onDelete: () => void }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="rounded-xl border border-slate-800/40 bg-slate-900/30 overflow-hidden"
    >
      <button onClick={onOpen} className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-900/50 transition-colors">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${board.color}25`, border: `1px solid ${board.color}55` }}
        >
          <ImageIcon size={16} style={{ color: board.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-100 truncate">{board.name}</div>
          <div className="text-[11px] text-slate-500">{board.cards.length} {board.cards.length === 1 ? 'card' : 'cards'}</div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label={`Delete ${board.name}`}
          className="text-slate-600 hover:text-rose-400 transition-colors p-1"
        >
          <Trash2 size={12} />
        </button>
      </button>
    </motion.li>
  );
}

function AddCardForm({ onAdd }: { onAdd: (type: VisionCardType, content: string) => void }) {
  const [type, setType] = useState<VisionCardType>('goal');
  const [content, setContent] = useState('');
  const submit = () => {
    if (!content.trim()) return;
    onAdd(type, content.trim());
    setContent('');
  };
  return (
    <div className="p-3 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 space-y-2">
      <div className="flex items-center gap-1.5">
        {TYPES.map((t) => {
          const { Icon, label, color } = TYPE_META[t];
          const active = type === t;
          return (
            <button
              key={t}
              onClick={() => setType(t)}
              aria-label={label}
              className={[
                'flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg border text-[11px] transition-colors',
                active ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300' : 'border-slate-800/40 text-slate-500 hover:text-slate-300',
              ].join(' ')}
              style={active ? { borderColor: color, color } : undefined}
            >
              <Icon size={11} /> {label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Write your ${TYPE_META[type].label.toLowerCase()}…`}
          className="flex-1 min-w-0 bg-slate-950/40 border border-slate-800/40 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/40"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button
          onClick={submit}
          disabled={!content.trim()}
          aria-label="Add card"
          className={[
            'p-1.5 rounded-md transition-colors',
            content.trim() ? 'text-indigo-300 hover:bg-indigo-500/15' : 'text-slate-700 cursor-not-allowed',
          ].join(' ')}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function BoardDetail({ board, onBack }: { board: VisionBoard; onBack: () => void }) {
  const renameBoard = useVisionStore((s) => s.renameBoard);
  const setBoardColor = useVisionStore((s) => s.setBoardColor);
  const addCard = useVisionStore((s) => s.addCard);
  const deleteCard = useVisionStore((s) => s.deleteCard);
  const addToast = useUIStore((s) => s.addToast);

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="space-y-4"
    >
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft size={12} /> All boards
      </button>

      <div className="flex items-center gap-3">
        <input
          value={board.name}
          onChange={(e) => renameBoard(board.id, e.target.value)}
          className="flex-1 bg-transparent font-syne text-lg font-bold text-slate-100 outline-none"
        />
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setBoardColor(board.id, c)}
              aria-label={`Color ${c}`}
              className={`w-5 h-5 rounded-full transition-transform ${board.color === c ? 'scale-125 ring-2 ring-white/30' : ''}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <AddCardForm onAdd={(type, content) => addCard(board.id, { type, content })} />

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <AnimatePresence initial={false}>
          {board.cards.map((c) => {
            const { Icon, label, color } = TYPE_META[c.type];
            return (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-3 rounded-xl border bg-slate-900/30 relative group"
                style={{ borderColor: `${color}33` }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon size={11} style={{ color }} />
                  <span className="text-[10px] uppercase tracking-wider" style={{ color }}>{label}</span>
                  <button
                    onClick={() => { deleteCard(board.id, c.id); addToast('Card removed', 'warning'); }}
                    aria-label="Delete card"
                    className="ml-auto text-slate-700 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                <p className={[
                  'text-sm text-slate-200 leading-relaxed whitespace-pre-wrap',
                  c.type === 'quote' || c.type === 'affirmation' ? 'italic' : '',
                ].join(' ')}>
                  {c.content}
                </p>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {board.cards.length === 0 && (
        <div className="text-center py-6 text-xs text-slate-500">No cards yet — add your first above.</div>
      )}
    </motion.div>
  );
}

export default function VisionView() {
  const boards = useVisionStore((s) => s.boards);
  const addBoard = useVisionStore((s) => s.addBoard);
  const deleteBoard = useVisionStore((s) => s.deleteBoard);
  const addToast = useUIStore((s) => s.addToast);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => boards.find((b) => b.id === selectedId) ?? null, [boards, selectedId]);

  const newBoard = () => {
    const id = addBoard({ name: 'New Vision Board' });
    setSelectedId(id);
  };

  const onDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete board "${name}" and all its cards?`)) return;
    deleteBoard(id);
    if (selectedId === id) setSelectedId(null);
    addToast('Board deleted', 'warning');
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <ImageIcon size={18} className="text-indigo-400" />
        <h1 className="font-syne text-lg font-bold text-slate-100">Vision Board</h1>
      </motion.div>

      <AnimatePresence mode="wait">
        {selected ? (
          <BoardDetail key={selected.id} board={selected} onBack={() => setSelectedId(null)} />
        ) : (
          <motion.div key="list" className="space-y-3">
            <button
              onClick={newBoard}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 text-slate-500 text-sm flex items-center justify-center gap-2 hover:border-indigo-500/30 hover:text-indigo-300 transition-colors"
            >
              <Plus size={14} /> New vision board
            </button>

            {boards.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-500">
                No boards yet — create your first above.
              </div>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {boards.map((b) => (
                    <BoardCard
                      key={b.id}
                      board={b}
                      onOpen={() => setSelectedId(b.id)}
                      onDelete={() => onDelete(b.id, b.name)}
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
