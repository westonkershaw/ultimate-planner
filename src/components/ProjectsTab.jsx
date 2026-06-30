import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Constants ───────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'todo',       label: 'To Do',       color: '#4f9cf9', emptyMsg: 'No tasks yet' },
  { id: 'inprogress', label: 'In Progress',  color: '#f59e0b', emptyMsg: 'Nothing in flight' },
  { id: 'done',       label: 'Done',         color: '#22c55e', emptyMsg: 'Nothing completed yet' },
];

const EMOJI_OPTIONS = ['🚀', '💡', '🎯', '🏗️', '📱', '💼', '🎨', '🔬', '📚', '🏋️', '🌱', '⭐'];

const COLOR_OPTIONS = [
  '#14b8a6', '#4f9cf9', '#c084fc', '#f97316',
  '#22c55e', '#f59e0b', '#ef4444', '#ec4899',
];

const PRIORITY_META = {
  high:   { label: 'High',   dot: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)' },
  medium: { label: 'Medium', dot: '🟡', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)' },
  low:    { label: 'Low',    dot: '🟢', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)' },
};

const BLANK_PROJECT = {
  title: '',
  description: '',
  color: '#14b8a6',
  emoji: '🚀',
  status: 'todo',
  priority: 'medium',
  deadline: '',
  tasks: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  if (!hex) return '99,102,241';
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r},${g},${b}`;
}

function deadlineInfo(deadline, status) {
  if (!deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(deadline + "T12:00:00");
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - now) / (1000 * 60 * 60 * 24));

  if (status === 'done') return null;

  if (diff < 0) {
    return { label: `⚠️ ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`, color: '#ef4444' };
  }
  if (diff === 0) {
    return { label: 'Due today!', color: '#f97316' };
  }
  if (diff <= 7) {
    return { label: `${diff} day${diff === 1 ? '' : 's'} left`, color: '#f59e0b' };
  }
  const formatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return { label: formatted, color: '#64748b' };
}

function isOverdue(project) {
  if (!project.deadline || project.status === 'done') return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(project.deadline + "T12:00:00");
  due.setHours(0, 0, 0, 0);
  return due < now;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatPill({ value, label, color }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      background: 'rgba(17,24,39,0.7)',
      border: '1px solid rgba(51,65,85,0.5)',
      borderRadius: 999,
      backdropFilter: 'blur(12px)',
    }}>
      <span style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'Syne', serif" }}>{value}</span>
      <span style={{ fontSize: 12, color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
    </div>
  );
}

function ProgressBar({ done, total, color }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}>
          {done}/{total} tasks
        </span>
        <span style={{ fontSize: 10, color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}>
          {pct}%
        </span>
      </div>
      <div style={{
        height: 4,
        background: 'rgba(51,65,85,0.5)',
        borderRadius: 999,
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: color || '#14b8a6',
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function ProjectCard({ project, onDragStart, onDragEnd, onClick, isDragging, onMoveToColumn }) {
  const priority = PRIORITY_META[project.priority] || PRIORITY_META.medium;
  const dl = deadlineInfo(project.deadline, project.status);
  const tasks = project.tasks || [];
  const doneTasks = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;
  const [showMoveMenu, setShowMoveMenu] = React.useState(false);
  const longPressTimer = React.useRef(null);

  function handleTouchStart() {
    longPressTimer.current = setTimeout(() => {
      setShowMoveMenu(true);
    }, 600);
  }

  function handleTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0, scale: isDragging ? 0.97 : 1 }}
      exit={{ opacity: 0, x: -16, height: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => { if (!showMoveMenu) onClick(); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      style={{
        background: `rgba(${hexToRgb(project.color)}, 0.03)`,
        border: '1px solid rgba(51,65,85,0.5)',
        borderLeft: `4px solid ${project.color || '#14b8a6'}`,
        borderRadius: 12,
        padding: '14px',
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        marginBottom: 10,
        position: 'relative',
      }}
    >
      {/* Mobile move menu */}
      {showMoveMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(17,24,39,0.97)',
            border: '1px solid rgba(51,65,85,0.6)',
            borderRadius: 10,
            padding: '8px',
            zIndex: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
            Move to:
          </div>
          {COLUMNS.filter((c) => c.id !== project.status).map((col) => (
            <button
              key={col.id}
              onClick={() => { onMoveToColumn(col.id); setShowMoveMenu(false); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 10px',
                marginBottom: 4,
                borderRadius: 7,
                border: 'none',
                background: `${col.color}22`,
                color: col.color,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                textAlign: 'left',
              }}
            >
              {col.label}
            </button>
          ))}
          <button
            onClick={() => setShowMoveMenu(false)}
            style={{
              display: 'block',
              width: '100%',
              padding: '5px 10px',
              borderRadius: 7,
              border: '1px solid rgba(51,65,85,0.5)',
              background: 'transparent',
              color: '#64748b',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              textAlign: 'center',
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        {project.emoji && (
          <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>{project.emoji}</span>
        )}
        <span style={{
          fontFamily: "'Syne', serif",
          fontWeight: 700,
          fontSize: 14,
          color: '#e2e8f0',
          flex: 1,
          lineHeight: 1.3,
        }}>
          {project.title}
        </span>
        {/* Priority badge */}
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 7px',
          borderRadius: 999,
          color: priority.color,
          background: priority.bg,
          border: `1px solid ${priority.border}`,
          flexShrink: 0,
          fontFamily: "'DM Sans', sans-serif",
          whiteSpace: 'nowrap',
        }}>
          {priority.dot} {priority.label}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p style={{
          fontSize: 12,
          color: '#64748b',
          margin: '0 0 8px 0',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {project.description}
        </p>
      )}

      {/* Deadline */}
      {dl && (
        <div style={{
          fontSize: 11,
          color: dl.color,
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <span>⏰</span>
          <span>{dl.label}</span>
        </div>
      )}

      {/* Task progress */}
      {totalTasks > 0 && (
        <ProgressBar done={doneTasks} total={totalTasks} color={project.color} />
      )}
    </motion.div>
  );
}


function EmptyColumn() {
  return (
    <div style={{
      border: `1.5px dashed rgba(51,65,85,0.6)`,
      borderRadius: 10,
      padding: '20px 16px',
      textAlign: 'center',
      color: '#334155',
      fontSize: 12,
      fontFamily: "'DM Sans', sans-serif",
      lineHeight: 1.6,
    }}>
      Drop cards here<br />or tap + to add
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function Modal({ project, defaultStatus, onSave, onDelete, onClose }) {
  const isNew = !project;
  const [form, setForm] = useState(
    isNew
      ? { ...BLANK_PROJECT, status: defaultStatus || 'todo', createdAt: new Date().toISOString() }
      : { ...project }
  );
  const [newTaskText, setNewTaskText] = useState('');

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const addTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    set('tasks', [...form.tasks, { id: uid(), text, done: false }]);
    setNewTaskText('');
  };

  const toggleTask = (id) => {
    set('tasks', form.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  };

  const removeTask = (id) => {
    set('tasks', form.tasks.filter((t) => t.id !== id));
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, id: form.id || uid() });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addTask();
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(8,9,13,0.7)',
    border: '1px solid rgba(51,65,85,0.6)',
    borderRadius: 8,
    padding: '9px 12px',
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 6,
    fontFamily: "'DM Sans', sans-serif",
  };

  const sectionStyle = { marginBottom: 16 };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(17,24,39,0.97)',
          border: '1px solid rgba(51,65,85,0.6)',
          borderRadius: 16,
          padding: '24px',
          width: '100%',
          maxWidth: 480,
          maxHeight: '88vh',
          overflowY: 'auto',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{
            fontFamily: "'Syne', serif",
            fontWeight: 700,
            fontSize: 17,
            color: '#e2e8f0',
            margin: 0,
          }}>
            {isNew ? 'New Project' : 'Edit Project'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Title *</label>
          <input
            style={inputStyle}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Project title…"
            autoFocus
          />
        </div>

        {/* Description */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Description</label>
          <textarea
            style={{ ...inputStyle, height: 72, resize: 'vertical' }}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Optional description…"
          />
        </div>

        {/* Emoji picker */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Emoji</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOJI_OPTIONS.map((em) => (
              <button
                key={em}
                onClick={() => set('emoji', em)}
                style={{
                  fontSize: 20,
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: `2px solid ${form.emoji === em ? '#14b8a6' : 'rgba(51,65,85,0.5)'}`,
                  background: form.emoji === em ? 'rgba(45, 212, 191,0.15)' : 'rgba(8,9,13,0.5)',
                  cursor: 'pointer',
                  lineHeight: 1,
                  transition: 'border-color 0.15s',
                }}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => set('color', c)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: c,
                  border: `3px solid ${form.color === c ? '#e2e8f0' : 'transparent'}`,
                  cursor: 'pointer',
                  outline: form.color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: 2,
                  transition: 'border-color 0.15s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Priority + Status row */}
        <div style={{ ...sectionStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Priority</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.priority}
              onChange={(e) => set('priority', e.target.value)}
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              <option value="todo">To Do</option>
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        {/* Deadline */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Deadline</label>
          <input
            type="date"
            style={{ ...inputStyle, colorScheme: 'dark' }}
            value={form.deadline}
            onChange={(e) => set('deadline', e.target.value)}
          />
        </div>

        {/* Sub-tasks */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Sub-tasks</label>
          <div style={{ marginBottom: 8 }}>
            {form.tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(51,65,85,0.3)',
                }}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${task.done ? '#22c55e' : 'rgba(51,65,85,0.8)'}`,
                    background: task.done ? '#22c55e' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 10,
                    color: '#0f172a',
                    fontWeight: 700,
                  }}
                >
                  {task.done ? '✓' : ''}
                </button>
                <span style={{
                  flex: 1,
                  fontSize: 13,
                  color: task.done ? '#475569' : '#cbd5e1',
                  textDecoration: task.done ? 'line-through' : 'none',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {task.text}
                </span>
                <button
                  onClick={() => removeTask(task.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#475569',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: '0 2px',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a task…"
            />
            <button
              onClick={addTask}
              style={{
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid rgba(45, 212, 191,0.4)',
                background: 'rgba(45, 212, 191,0.15)',
                color: '#14b8a6',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'nowrap',
              }}
            >
              + Add
            </button>
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {!isNew && (
            <button
              onClick={() => onDelete(project.id)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 10,
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 10,
              border: '1px solid rgba(51,65,85,0.5)',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.title.trim()}
            style={{
              flex: 2,
              padding: '10px',
              borderRadius: 10,
              border: 'none',
              background: form.title.trim() ? '#14b8a6' : 'rgba(45, 212, 191,0.3)',
              color: form.title.trim() ? '#fff' : '#475569',
              cursor: form.title.trim() ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {isNew ? 'Create Project' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProjectsTab({ projects: projectsProp = [], onChange }) {
  const projects = projectsProp || [];
  const [modal, setModal] = useState(null); // null | { mode: 'new'|'edit', project?, defaultStatus? }
  const [dragId, setDragId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const dragIdRef = useRef(null);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalCount = projects.length;
  const inProgressCount = projects.filter((p) => p.status === 'inprogress').length;
  const overdueCount = projects.filter(isOverdue).length;

  // ── CRUD helpers ───────────────────────────────────────────────────────────

  const handleSave = useCallback((updated) => {
    const safeProjects = projectsProp || [];
    const exists = safeProjects.find((p) => p.id === updated.id);
    if (exists) {
      onChange(prev => ({ ...prev, projects: (prev.projects || []).map((p) => (p.id === updated.id ? updated : p)) }));
    } else {
      onChange(prev => ({ ...prev, projects: [...(prev.projects || []), updated] }));
    }
    setModal(null);
  }, [projectsProp, onChange]);

  const handleDelete = useCallback((id) => {
    onChange(prev => ({ ...prev, projects: (prev.projects || []).filter((p) => p.id !== id) }));
    setModal(null);
  }, [onChange]);

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e, id) => {
    dragIdRef.current = id;
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverCol(null);
    dragIdRef.current = null;
  }, []);

  const handleDragOver = useCallback((e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCol(null);
  }, []);

  const handleDrop = useCallback((e, colId) => {
    e.preventDefault();
    const id = dragIdRef.current;
    if (!id) return;
    onChange(prev => ({ ...prev, projects: (prev.projects || []).map((p) => (p.id === id ? { ...p, status: colId } : p)) }));
    setDragId(null);
    setDragOverCol(null);
    dragIdRef.current = null;
  }, [onChange]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      minHeight: '100%',
      padding: '0 0 40px',
    }}>
      {/* Stats bar */}
      <div style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        marginBottom: 24,
      }}>
        <StatPill value={totalCount} label="Total Projects" color="#14b8a6" />
        <StatPill value={inProgressCount} label="In Progress" color="#f59e0b" />
        <StatPill value={overdueCount} label="Overdue" color={overdueCount > 0 ? '#ef4444' : '#64748b'} />
      </div>

      {/* Kanban board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
        alignItems: 'start',
      }}>
        {COLUMNS.map((col) => {
          const colProjects = projects.filter((p) => p.status === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              style={{
                background: 'rgba(8,9,13,0.6)',
                borderRadius: 16,
                padding: 16,
                borderTop: `3px solid ${col.color}`,
                border: `1px solid ${isOver ? col.color : 'rgba(51,65,85,0.4)'}`,
                borderTopWidth: 3,
                borderTopColor: col.color,
                transition: 'border-color 0.18s, box-shadow 0.18s',
                boxShadow: isOver ? `0 0 0 1px ${col.color}40` : 'none',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                minHeight: 200,
              }}
            >
              {/* Column header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: "'Syne', serif",
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#e2e8f0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {col.label}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: col.color,
                    background: `${col.color}1a`,
                    border: `1px solid ${col.color}40`,
                    borderRadius: 999,
                    padding: '1px 7px',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {colProjects.length}
                  </span>
                </div>
                <button
                  onClick={() => setModal({ mode: 'new', defaultStatus: col.id })}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    border: `1px solid rgba(51,65,85,0.6)`,
                    background: 'rgba(17,24,39,0.6)',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: 16,
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${col.color}22`;
                    e.currentTarget.style.color = col.color;
                    e.currentTarget.style.borderColor = `${col.color}55`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(17,24,39,0.6)';
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.borderColor = 'rgba(51,65,85,0.6)';
                  }}
                >
                  +
                </button>
              </div>

              {/* Cards */}
              <AnimatePresence mode="popLayout">
                {colProjects.length === 0 ? (
                  <EmptyColumn color={col.color} />
                ) : (
                  colProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isDragging={dragId === project.id}
                      onDragStart={(e) => handleDragStart(e, project.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setModal({ mode: 'edit', project })}
                      onMoveToColumn={(colId) => onChange(prev => ({ ...prev, projects: (prev.projects || []).map((p) => p.id === project.id ? { ...p, status: colId } : p) }))}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <Modal
            project={modal.mode === 'edit' ? modal.project : null}
            defaultStatus={modal.defaultStatus}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
