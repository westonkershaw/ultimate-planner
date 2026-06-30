import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore } from '../../store';

const PRIORITIES = ['high', 'medium', 'low'];
const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Task title is required';
  return errors;
}

const QuickAdd = React.memo(function QuickAdd({ onClose }) {
  const { addTask } = useTaskStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [errors, setErrors] = useState({});
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (tag && !tags.includes(tag)) {
      setTags((t) => [...t, tag]);
    }
    setTagInput('');
  }, [tagInput, tags]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    const errs = validate({ title });
    if (Object.keys(errs).length) { setErrors(errs); return; }

    addTask({ title: title.trim(), description: description.trim(), priority, dueDate, tags });
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setTags([]);
    setErrors({});
    setExpanded(false);
    onClose?.();
  }, [title, description, priority, dueDate, tags, addTask, onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose?.();
    }
  }, [handleSubmit, onClose]);

  return (
    <motion.form
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-accent/30 bg-[#0f1829] p-4 shadow-xl"
      style={{ boxShadow: '0 0 30px rgba(45, 212, 191,0.1)' }}
    >
      {/* Title input */}
      <input
        id="quick-add-input"
        ref={inputRef}
        value={title}
        onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors({}); }}
        onKeyDown={handleKeyDown}
        onFocus={() => setExpanded(true)}
        placeholder="Add a task... (Enter to save)"
        autoFocus
        className="w-full bg-transparent text-fg-secondary text-sm placeholder:text-fg-faint outline-none"
      />
      {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}

      {/* Expanded options */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-t border-white/[0.06] pt-3">
              {/* Description */}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full bg-[#0a1120]/80 rounded-lg border border-white/10 px-3 py-2 text-xs text-fg-secondary placeholder:text-fg-faint outline-none focus:border-accent/60 resize-none"
              />

              {/* Priority & Due date row */}
              <div className="flex gap-3 items-center flex-wrap">
                {/* Priority */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-fg-faint uppercase tracking-wider">Priority</span>
                  <div className="flex gap-1">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`px-2 py-0.5 rounded-md text-[10px] capitalize transition-colors border ${
                          priority === p
                            ? 'text-slate-900'
                            : 'bg-transparent text-fg-faint border-white/10 hover:text-fg-muted'
                        }`}
                        style={priority === p ? {
                          backgroundColor: PRIORITY_COLORS[p],
                          borderColor: PRIORITY_COLORS[p],
                        } : {}}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due date */}
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-[#0a1120]/80 rounded-lg border border-white/10 px-2 py-1 text-xs text-fg-muted outline-none focus:border-accent/60"
                />
              </div>

              {/* Tags */}
              <div className="flex items-center gap-2 flex-wrap">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] text-accent-text bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded-md flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((t) => t.filter((t2) => t2 !== tag))}
                      className="text-accent-text hover:text-red-400 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddTag(); }
                  }}
                  placeholder="+ tag"
                  className="bg-transparent text-[10px] text-accent-text placeholder:text-fg-faint outline-none w-14"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setExpanded(false); onClose?.(); }}
                  className="text-xs text-fg-faint hover:text-fg-muted transition-colors px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-medium px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
                >
                  Add Task
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.form>
  );
});

export default QuickAdd;
