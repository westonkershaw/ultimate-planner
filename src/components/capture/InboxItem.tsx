import { motion } from 'framer-motion';
import { ArrowRight, Archive, Trash2, Flag, Calendar, Tag } from 'lucide-react';
import type { CaptureItem } from '@/types/capture.types';

interface InboxItemProps {
  item: CaptureItem;
  onConvert: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export default function InboxItem({ item, onConvert, onArchive, onDelete }: InboxItemProps) {
  const timeAgo = getTimeAgo(item.capturedAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="group p-3.5 rounded-xl border border-slate-800/60 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 leading-snug">{item.text}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {item.priority && (
              <span className="inline-flex items-center gap-1 text-[10px] text-red-400">
                <Flag size={10} /> {item.priority}
              </span>
            )}
            {item.dueDate && (
              <span className="inline-flex items-center gap-1 text-[10px] text-blue-400">
                <Calendar size={10} /> {item.dueDate}
              </span>
            )}
            {item.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                <Tag size={10} /> {tag}
              </span>
            ))}
            <span className="text-[10px] text-slate-600">{timeAgo}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onConvert} className="p-1.5 rounded-md hover:bg-indigo-500/20 text-indigo-400 transition-colors" title="Convert to task">
            <ArrowRight size={14} />
          </button>
          <button onClick={onArchive} className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-500 transition-colors" title="Archive">
            <Archive size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition-colors" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function getTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
