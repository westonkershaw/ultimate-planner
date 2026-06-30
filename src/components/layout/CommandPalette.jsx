import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store';

const ACTIONS = [
  { id: 'nav-dashboard', label: 'Go to Dashboard', icon: '⊹', view: 'dashboard', type: 'nav' },
  { id: 'nav-tasks', label: 'Go to Tasks', icon: '✓', view: 'tasks', type: 'nav' },
  { id: 'nav-workouts', label: 'Go to Workouts', icon: '◈', view: 'workouts', type: 'nav' },
  { id: 'nav-finance', label: 'Go to Finance', icon: '◎', view: 'finance', type: 'nav' },
  { id: 'new-task', label: 'New Task', icon: '+', type: 'action', action: 'new-task' },
  { id: 'new-workout', label: 'New Workout Routine', icon: '◈', type: 'action', action: 'new-workout' },
  { id: 'new-goal', label: 'New Financial Goal', icon: '◎', type: 'action', action: 'new-goal' },
];

const CommandPalette = React.memo(function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette, setActiveView } = useUIStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const filtered = query.trim()
    ? ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : ACTIONS;

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery(''); // eslint-disable-line react-hooks/set-state-in-effect
      setSelected(0);  
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  const execute = useCallback((action) => {
    closeCommandPalette();
    if (action.type === 'nav') {
      setActiveView(action.view);
    } else if (action.action === 'new-task') {
      setActiveView('tasks');
      setTimeout(() => {
        document.getElementById('quick-add-input')?.focus();
      }, 200);
    } else if (action.action === 'new-workout') {
      setActiveView('workouts');
    } else if (action.action === 'new-goal') {
      setActiveView('finance');
    }
  }, [closeCommandPalette, setActiveView]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selected]) execute(filtered[selected]);
    } else if (e.key === 'Escape') {
      closeCommandPalette();
    }
  }, [filtered, selected, execute, closeCommandPalette]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeCommandPalette(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1424] shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 0 60px rgba(45, 212, 191,0.15)' }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
              <span className="text-fg-muted text-lg">⌘</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search actions..."
                className="flex-1 bg-transparent text-fg-secondary text-sm placeholder:text-fg-faint outline-none"
              />
              <kbd className="text-[10px] text-fg-faint border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
            </div>

            {/* Results */}
            <div className="py-2 max-h-80 overflow-auto">
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-fg-faint text-sm">No actions found</div>
              )}
              {filtered.map((action, i) => (
                <motion.button
                  key={action.id}
                  onClick={() => execute(action)}
                  whileHover={{ x: 2 }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
                    ${i === selected
                      ? 'bg-accent/20 text-fg'
                      : 'text-fg-muted hover:bg-white/[0.04] hover:text-fg-secondary'
                    }
                  `}
                >
                  <span className={`text-lg w-6 text-center ${i === selected ? 'text-accent-text' : 'text-fg-faint'}`}>
                    {action.icon}
                  </span>
                  <span className="flex-1">{action.label}</span>
                  {action.type === 'nav' && (
                    <span className="text-[10px] text-fg-faint border border-white/10 rounded px-1.5 py-0.5">
                      ↵
                    </span>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/[0.06] flex gap-4 text-[10px] text-fg-faint">
              <span><kbd className="border border-white/10 rounded px-1">↑↓</kbd> navigate</span>
              <span><kbd className="border border-white/10 rounded px-1">↵</kbd> select</span>
              <span><kbd className="border border-white/10 rounded px-1">esc</kbd> close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default CommandPalette;
