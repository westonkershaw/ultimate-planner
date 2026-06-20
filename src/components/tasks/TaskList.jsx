import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import TaskItem from './TaskItem';

// ── Mock data for standalone testing ──────────────────────────────────────

const MOCK_TASKS = [
  { id: '1', title: 'Review Q2 financial goals',         done: false, priority: 'high',   category: 'financial',   time: '9:00 AM' },
  { id: '2', title: 'Morning workout — push day',        done: true,  priority: 'normal', category: 'physical' },
  { id: '3', title: 'Read 30 pages of Deep Work',        done: false, priority: 'normal', category: 'intellectual' },
  { id: '4', title: 'Call with accountability partner',  done: false, priority: 'high',   category: 'social',      time: '2:00 PM' },
  { id: '5', title: 'Track macros for dinner',           done: false, priority: 'low',    category: 'physical' },
];

// ── uid helper (mirrors pattern from useTaskStore) ─────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Chevron SVG ────────────────────────────────────────────────────────────
function Chevron({ open, prefersReduced }) {
  return (
    <motion.svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      animate={{ rotate: open ? 180 : 0 }}
      transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
    >
      <path
        d="M3.5 5.25L7 8.75L10.5 5.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

// ── LockedItem — recurring tasks pro gate ─────────────────────────────────
function LockedItem() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '12px 14px',
        cursor: 'not-allowed',
        opacity: 0.6,
      }}
      aria-label="Recurring Tasks — Pro feature"
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 6,
          border: '2px solid rgba(100,116,139,0.3)',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 14, color: 'rgba(148,163,184,0.5)', flex: 1 }}>
        Recurring Tasks
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: '#818cf8',
          background: 'rgba(99,102,241,0.15)',
          borderRadius: 6,
          padding: '2px 7px',
        }}
      >
        PRO
      </span>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────
function EmptyState({ prefersReduced }) {
  return (
    <motion.div
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0.15 } : { type: 'spring', stiffness: 300, damping: 28, delay: 0.05 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: 8,
      }}
    >
      <span
        style={{
          fontSize: 28,
          color: 'rgba(148,163,184,0.2)',
          lineHeight: 1,
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        ✦
      </span>
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'rgba(148,163,184,0.5)',
          margin: 0,
        }}
      >
        All clear for today
      </p>
      <p
        style={{
          fontSize: 13,
          color: 'rgba(100,116,139,0.5)',
          margin: 0,
        }}
      >
        Add a task above to get started
      </p>
    </motion.div>
  );
}

// ── TaskList ───────────────────────────────────────────────────────────────

/**
 * TaskList
 *
 * Props:
 *   tasks?     — if omitted, uses MOCK_TASKS via internal useState
 *   onToggle?(id: string)
 *   onDelete?(id: string)
 *   onAdd?(title: string)
 *   isPro?     — if false (default false), shows locked "Recurring Tasks" item
 */
const TaskList = React.memo(function TaskList({
  tasks: tasksProp,
  onToggle: onToggleProp,
  onDelete: onDeleteProp,
  onAdd: onAddProp,
  isPro = false,
}) {
  const prefersReduced = useReducedMotion();

  // ── Internal mock state (used when no tasks prop provided) ───────────────
  const isControlled = tasksProp !== undefined;
  const [internalTasks, setInternalTasks] = useState(MOCK_TASKS);
  const tasks = isControlled ? tasksProp : internalTasks;

  // ── Quick-add state ──────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef(null);
  const listEndRef = useRef(null);

  // ── Completed section collapse state ────────────────────────────────────
  const [completedOpen, setCompletedOpen] = useState(false);

  // ── Derived lists ────────────────────────────────────────────────────────
  const { active, completed } = useMemo(() => {
    const active = tasks.filter((t) => !t.done);
    const completed = tasks.filter((t) => t.done);
    return { active, completed };
  }, [tasks]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggle = useCallback((id) => {
    if (onToggleProp) {
      onToggleProp(id);
    } else {
      setInternalTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      );
    }
  }, [onToggleProp]);

  const handleDelete = useCallback((id) => {
    if (onDeleteProp) {
      onDeleteProp(id);
    } else {
      setInternalTasks((prev) => prev.filter((t) => t.id !== id));
    }
  }, [onDeleteProp]);

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      // Trigger shake
      setShakeKey((k) => k + 1);
      return;
    }

    if (onAddProp) {
      onAddProp(trimmed);
    } else {
      const newTask = {
        id: uid(),
        title: trimmed,
        done: false,
        priority: 'normal',
        category: '',
        time: '',
        notes: '',
      };
      setInternalTasks((prev) => [newTask, ...prev]);
    }

    setInputValue('');

    // Scroll to list top after paint
    requestAnimationFrame(() => {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [inputValue, onAddProp]);

  const handleInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }, [handleAdd]);

  // ── Shake animation variants ──────────────────────────────────────────────
  const shakeVariants = {
    idle: { x: 0 },
    shake: {
      x: prefersReduced ? 0 : [0, -6, 6, -4, 4, -2, 2, 0],
      transition: { duration: 0.4, ease: 'easeInOut' },
    },
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(8,9,13,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '12px 0 12px 0',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {/* Title + count */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#e2e8f0',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Today's Tasks
            </h2>
            <span
              style={{
                fontSize: 12,
                color: 'rgba(100,116,139,0.7)',
                fontWeight: 400,
              }}
            >
              ({active.length} active)
            </span>
          </div>

          {/* Quick-add input */}
          <motion.div
            key={shakeKey}
            variants={shakeVariants}
            animate={shakeKey > 0 ? 'shake' : 'idle'}
            style={{ flex: '1 1 auto', maxWidth: 240 }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Add a task…"
              aria-label="Add a new task"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '7px 12px',
                fontSize: 13,
                color: '#e2e8f0',
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* ── Scroll anchor for new items ───────────────────────────────── */}
      <div ref={listEndRef} />

      {/* ── Active task list ──────────────────────────────────────────── */}
      <div
        role="list"
        aria-label="Active tasks"
        aria-live="polite"
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <AnimatePresence mode="popLayout">
          {active.length === 0 && completed.length === 0 ? (
            <EmptyState key="empty" prefersReduced={prefersReduced} />
          ) : active.length === 0 ? null : (
            active.map((task, i) => (
              <TaskItem
                key={task.id}
                task={task}
                index={i}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* ── Completed collapsible section ─────────────────────────────── */}
      {completed.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {/* Section toggle */}
          <button
            type="button"
            onClick={() => setCompletedOpen((o) => !o)}
            aria-expanded={completedOpen}
            aria-controls="completed-task-list"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              color: 'rgba(100,116,139,0.6)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              outline: 'none',
              marginBottom: 6,
            }}
            onFocus={(e) => {
              e.currentTarget.style.color = 'rgba(148,163,184,0.8)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.color = 'rgba(100,116,139,0.6)';
            }}
          >
            <Chevron open={completedOpen} prefersReduced={prefersReduced} />
            Completed ({completed.length})
          </button>

          {/* Collapsed/expanded list */}
          <AnimatePresence initial={false}>
            {completedOpen && (
              <motion.div
                id="completed-task-list"
                role="list"
                aria-label="Completed tasks"
                initial={prefersReduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                animate={prefersReduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                exit={prefersReduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={
                  prefersReduced
                    ? { duration: 0.15 }
                    : { type: 'spring', stiffness: 300, damping: 30 }
                }
                style={{ overflow: 'hidden' }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    paddingBottom: 4,
                  }}
                >
                  <AnimatePresence mode="popLayout">
                    {completed.map((task, i) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        index={i}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Pro gate: locked recurring tasks ─────────────────────────── */}
      {!isPro && (
        <div style={{ marginTop: 16 }}>
          <LockedItem />
        </div>
      )}
    </div>
  );
});

export default TaskList;
