import React, { useCallback, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// ── Category → accent color map ────────────────────────────────────────────
const CATEGORY_COLORS = {
  financial:   '#0e9488',
  physical:    '#41b27a',
  intellectual:'#3b82f6',
  social:      '#d9a441',
  creative:    '#ec4899',
  health:      '#2dd4bf',
  work:        '#8b5cf6',
};

const FALLBACK_COLOR = '#5b626d';

function getCategoryColor(category) {
  return CATEGORY_COLORS[category] ?? FALLBACK_COLOR;
}

// ── Priority dot config ────────────────────────────────────────────────────
const PRIORITY_DOT = {
  high:   { color: '#e2685f', show: true },
  low:    { color: '#41b27a', show: true },
  normal: { color: 'transparent', show: false },
};

// ── Spring config matching project standard ────────────────────────────────
const SPRING_FAST = { type: 'spring', stiffness: 600, damping: 30 };
const SPRING_ENTRY = { type: 'spring', bounce: 0.2, duration: 0.6 };

// ── TaskItem ───────────────────────────────────────────────────────────────

/**
 * TaskItem
 *
 * Props:
 *   task    — { id, title, done, priority, category, time, notes }
 *   onToggle(id)
 *   onDelete(id)
 *   index   — stagger delay index
 */
const TaskItem = React.memo(function TaskItem({ task, onToggle, onDelete, index = 0 }) {
  const prefersReduced = useReducedMotion();

  const accentColor = useMemo(() => getCategoryColor(task.category), [task.category]);
  const priorityDot = PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.normal;

  const handleToggle = useCallback(() => {
    onToggle?.(task.id);
  }, [task.id, onToggle]);

  const handleDelete = useCallback(() => {
    onDelete?.(task.id);
  }, [task.id, onDelete]);

  // Entry/exit animation — static fallback for reduced motion
  const cardInitial = prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10 };
  const cardAnimate = {
    opacity: task.done ? 0.6 : 1,
    y: 0,
  };
  const cardExit = prefersReduced
    ? { opacity: 0 }
    : { opacity: 0, x: -20, scale: 0.95 };
  const cardTransition = prefersReduced
    ? { duration: 0.15 }
    : { ...SPRING_ENTRY, delay: index * 0.03 };

  return (
    <motion.div
      layout
      role="listitem"
      initial={cardInitial}
      animate={cardAnimate}
      exit={cardExit}
      transition={cardTransition}
      whileHover={{ y: prefersReduced ? 0 : -1 }}
      whileTap={{ scale: prefersReduced ? 1 : 0.98 }}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '12px 14px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.15s ease',
      }}
      onHoverStart={(e) => {
        if (e.currentTarget) {
          e.currentTarget.style.borderColor = 'var(--color-border-strong)';
        }
      }}
      onHoverEnd={(e) => {
        if (e.currentTarget) {
          e.currentTarget.style.borderColor = 'var(--color-border)';
        }
      }}
    >
      {/* Checkbox */}
      <motion.button
        type="button"
        onClick={handleToggle}
        whileTap={{ scale: prefersReduced ? 1 : 0.85 }}
        transition={SPRING_FAST}
        aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
        aria-pressed={task.done}
        style={{
          flexShrink: 0,
          marginTop: 1,
          width: 18,
          height: 18,
          borderRadius: 6,
          border: task.done ? 'none' : '2px solid var(--color-border-strong)',
          background: task.done ? accentColor : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          outline: 'none',
          transition: 'background 0.18s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}60`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Animated SVG checkmark */}
        <svg
          width="10"
          height="8"
          viewBox="0 0 10 8"
          fill="none"
          aria-hidden="true"
          style={{ overflow: 'visible' }}
        >
          <motion.path
            d="M1 3.5L3.8 6.5L9 1"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: task.done ? 1 : 0,
              opacity: task.done ? 1 : 0,
            }}
            transition={
              prefersReduced
                ? { duration: 0.1 }
                : { pathLength: { type: 'spring', stiffness: 300, damping: 25 }, opacity: { duration: 0.1 } }
            }
          />
        </svg>
      </motion.button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        <motion.div
          animate={{
            color: task.done ? '#8b929e' : '#eceef2',
            textDecoration: task.done ? 'line-through' : 'none',
          }}
          transition={{ duration: 0.2 }}
          style={{
            fontSize: 14,
            fontWeight: 500,
            lineHeight: '1.4',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {task.title}
        </motion.div>

        {/* Meta row: time + category */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            flexWrap: 'wrap',
          }}
        >
          {/* Time badge */}
          {task.time && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--color-accent-text)',
                background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                borderRadius: 6,
                padding: '1px 6px',
                lineHeight: '1.6',
              }}
            >
              {task.time}
            </span>
          )}

          {/* Category label */}
          {task.category && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--color-fg-muted)',
                lineHeight: '1.6',
              }}
            >
              {task.category}
            </span>
          )}
        </div>
      </div>

      {/* Right cluster: priority dot + delete */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Priority dot */}
        {priorityDot.show && (
          <div
            aria-label={`Priority: ${task.priority}`}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: priorityDot.color,
              marginTop: 2,
            }}
          />
        )}

        {/* Delete button — visible on parent hover via CSS group trick using motion */}
        <DeleteButton onDelete={handleDelete} prefersReduced={prefersReduced} />
      </div>
    </motion.div>
  );
});

// ── Delete button sub-component (isolated hover state) ─────────────────────

function DeleteButton({ onDelete, prefersReduced }) {
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      initial={{ opacity: 0 }}
      whileHover={{ opacity: 1 }}
      whileTap={{ scale: prefersReduced ? 1 : 0.8 }}
      aria-label="Delete task"
      style={{
        fontSize: 14,
        lineHeight: 1,
        color: 'var(--color-fg-faint)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: 4,
        transition: 'color 0.15s ease',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--color-danger)';
        e.currentTarget.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--color-fg-faint)';
      }}
      onFocus={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--color-danger) 40%, transparent)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.opacity = '0';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      ×
    </motion.button>
  );
}

export default TaskItem;
