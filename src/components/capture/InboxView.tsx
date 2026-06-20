import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, CheckCheck } from 'lucide-react';
import { useCaptureStore } from '@/store/useCaptureStore';
import InboxItem from './InboxItem';
import InboxFilters from './InboxFilters';
import CaptureInput from './CaptureInput';

export default function InboxView() {
  const { items, addCapture, convertToTask, archiveCapture, removeCapture, bulkConvert } = useCaptureStore();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const activeItems = useMemo(
    () => items.filter((i) => !i.archived && !i.convertedToTask),
    [items],
  );

  const filteredItems = useMemo(
    () => activeTag ? activeItems.filter((i) => i.tags.includes(activeTag)) : activeItems,
    [activeItems, activeTag],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    activeItems.forEach((i) => i.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [activeItems]);

  const handleBulkConvert = () => {
    bulkConvert(filteredItems.map((i) => i.id));
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox size={18} className="text-indigo-400" />
          <h1 className="font-syne text-lg font-bold text-slate-100">Inbox</h1>
          {activeItems.length > 0 && (
            <span className="text-xs text-slate-600 bg-slate-900/60 px-2 py-0.5 rounded-full">
              {activeItems.length}
            </span>
          )}
        </div>
        {filteredItems.length > 1 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBulkConvert}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs hover:bg-indigo-500/20 transition-colors"
          >
            <CheckCheck size={13} />
            Convert all
          </motion.button>
        )}
      </div>

      <CaptureInput onSubmit={addCapture} autoFocus={false} />

      <InboxFilters tags={allTags} activeTag={activeTag} onTagSelect={setActiveTag} />

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => (
            <InboxItem
              key={item.id}
              item={item}
              onConvert={() => convertToTask(item.id)}
              onArchive={() => archiveCapture(item.id)}
              onDelete={() => removeCapture(item.id)}
            />
          ))}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-slate-600"
          >
            <Inbox size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Inbox zero! Capture something with the input above.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
