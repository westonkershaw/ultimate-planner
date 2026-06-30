import { motion } from 'framer-motion';

interface InboxFiltersProps {
  tags: string[];
  activeTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

export default function InboxFilters({ tags, activeTag, onTagSelect }: InboxFiltersProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onTagSelect(null)}
        className={[
          'px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors',
          activeTag === null
            ? 'bg-accent/20 text-accent-text border border-accent/30'
            : 'bg-surface-1 text-fg-muted border border-border hover:text-fg-secondary',
        ].join(' ')}
      >
        All
      </motion.button>
      {tags.map((tag) => (
        <motion.button
          key={tag}
          whileTap={{ scale: 0.95 }}
          onClick={() => onTagSelect(tag === activeTag ? null : tag)}
          className={[
            'px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors',
            activeTag === tag
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-surface-1 text-fg-muted border border-border hover:text-fg-secondary',
          ].join(' ')}
        >
          #{tag}
        </motion.button>
      ))}
    </div>
  );
}
