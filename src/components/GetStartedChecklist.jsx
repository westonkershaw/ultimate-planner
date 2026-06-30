import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// ── helpers ──────────────────────────────────────────────────────────────────

function hasAnyTask(data) {
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  const weekDays = data.weekDays || data.weekPlan;
  if (weekDays) {
    return Object.values(weekDays).some(
      (day) => Array.isArray(day?.tasks) && day.tasks.length > 0,
    );
  }
  return false;
}

function hasAnyTransaction(data) {
  return Array.isArray(data.transactions) && data.transactions.length > 0;
}

function buildItems(data, onNavigate) {
  return [
    {
      id: 'goal',
      icon: '🎯',
      label: 'Set your first yearly goal',
      done: Array.isArray(data.yearlyGoals) && data.yearlyGoals.length > 0,
      action: () => onNavigate('plan', 'goals'),
    },
    {
      id: 'task',
      icon: '✅',
      label: 'Add your first task',
      done: hasAnyTask(data),
      action: () => onNavigate('plan', 'tasks'),
    },
    {
      id: 'habit',
      icon: '📊',
      label: 'Log a daily habit',
      done: Array.isArray(data.kis) && data.kis.some((k) => Object.values(k.dailyLogs || {}).some((v) => parseFloat(v) > 0)),
      action: () => onNavigate('grow', 'habits'),
    },
    {
      id: 'finance',
      icon: '💰',
      label: 'Log your first expense',
      done: hasAnyTransaction(data),
      action: () => onNavigate('finance', null),
    },
    {
      id: 'profile',
      icon: '👤',
      label: 'Complete your profile',
      done: !!(data.profile?.firstName || data.profile?.city || data.profile?.bio),
      action: () => onNavigate('profile', null),
    },
    {
      id: 'explore_features',
      icon: '🧭',
      label: 'Explore a new feature',
      description: 'Try Journal, Vision Board, Sleep Calculator, or AI Coach',
      done: false,
      action: () => onNavigate('explore', null),
    },
  ];
}

// ── sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ value, total }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div style={{
      height: 4,
      borderRadius: 99,
      background: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
      flex: 1,
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ height: '100%', background: '#14b8a6', borderRadius: 99 }}
      />
    </div>
  );
}

function ChecklistItem({ item }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 0',
      borderBottom: '1px solid rgba(51,65,85,0.3)',
    }}>
      {/* Checkbox */}
      <div style={{
        width: 20,
        height: 20,
        borderRadius: 6,
        border: item.done ? 'none' : '2px solid rgba(100,116,139,0.5)',
        background: item.done ? '#22c55e' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.2s, border 0.2s',
      }}>
        {item.done && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4L4 7.5L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Icon + Label */}
      <span style={{ fontSize: 15 }}>{item.icon}</span>
      <span style={{
        flex: 1,
        fontSize: 13,
        fontWeight: 500,
        color: item.done ? 'rgba(148,163,184,0.55)' : '#cbd5e1',
        textDecoration: item.done ? 'line-through' : 'none',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'color 0.2s',
      }}>
        {item.label}
        {item.description && (
          <span style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 400,
            color: 'rgba(148,163,184,0.5)',
            marginTop: 2,
            lineHeight: 1.4,
          }}>
            {item.description}
          </span>
        )}
      </span>

      {/* Navigate arrow — hidden when done or item is informational (has description, no-op action) */}
      {!item.done && !item.description && (
        <button
          onClick={item.action}
          aria-label={'Go to: ' + item.label}
          style={{
            background: 'rgba(45, 212, 191,0.15)',
            border: '1px solid rgba(45, 212, 191,0.3)',
            borderRadius: 8,
            color: '#2dd4bf',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            padding: '3px 9px',
            fontFamily: "'DM Sans', sans-serif",
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(45, 212, 191,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(45, 212, 191,0.15)'; }}
        >
          →
        </button>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function GetStartedChecklist({ data, onNavigate, onDismiss }) {
  const prefersReduced = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);
  const autoDismissRef = useRef(null);

  const items = buildItems(data, onNavigate);
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const allDone = doneCount === total;
  // Derived — no extra state needed; allDone itself drives the celebration UI
  const allDoneVisible = allDone;

  // Determine responsive position — simple check: treat < 640px as mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const bottomOffset = isMobile ? 80 : 24;

  // Visibility gate: show only if user still has at least one incomplete item
  const shouldShow = (
    (Array.isArray(data.kis) && data.kis.length === 0) ||
    (Array.isArray(data.yearlyGoals) && data.yearlyGoals.length === 0) ||
    !hasAnyTask(data) ||
    !hasAnyTransaction(data)
  );

  // Auto-dismiss after all items done
  useEffect(() => {
    if (allDone) {
      autoDismissRef.current = setTimeout(() => { onDismiss(); }, 3000);
    }
    return () => { if (autoDismissRef.current) clearTimeout(autoDismissRef.current); };
  }, [allDone, onDismiss]);

  if (!shouldShow || data._checklistDismissed === true) return null;

  const widgetVariants = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 24, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 16, scale: 0.94 },
      };

  const listVariants = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 0, height: 0 },
      };

  return (
    <motion.div
      key="gsc-widget"
      variants={widgetVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        bottom: bottomOffset,
        left: 16,
        zIndex: 9000,
        width: (collapsed && !allDone) ? 'auto' : 280,
        maxWidth: 'calc(100vw - 32px)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{
        background: 'rgba(8,9,13,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(51,65,85,0.5)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      }}>
        {/* ── Header / pill ── */}
        {(collapsed && !allDone) ? (
          // Collapsed pill
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand get started checklist"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px 14px',
              width: '100%',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span style={{ fontSize: 16 }}>🚀</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc' }}>
              {doneCount}/{total} done
            </span>
            <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', marginLeft: 2 }}>▶</span>
          </button>
        ) : (
          // Expanded header
          <div style={{ padding: '12px 14px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>🚀</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', flex: 1 }}>Get Started</span>
              <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)', marginRight: 6, whiteSpace: 'nowrap' }}>
                {doneCount}/{total} done
              </span>
              {/* Collapse toggle */}
              <button
                onClick={() => setCollapsed(true)}
                aria-label="Collapse checklist"
                title="Collapse"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(148,163,184,0.55)', fontSize: 16, padding: '0 2px',
                  lineHeight: 1, fontFamily: "'DM Sans', sans-serif",
                }}
              >
                ▾
              </button>
              {/* Dismiss */}
              <button
                onClick={onDismiss}
                aria-label="Dismiss checklist"
                title="Dismiss"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(148,163,184,0.4)', fontSize: 16, padding: '0 2px',
                  lineHeight: 1, fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(248,113,113,0.8)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(148,163,184,0.4)'; }}
              >
                ×
              </button>
            </div>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ProgressBar value={doneCount} total={total} />
            </div>
          </div>
        )}

        {/* ── Expanded body ── */}
        <AnimatePresence initial={false}>
          {(!collapsed || allDone) && (
            <motion.div
              key="gsc-body"
              variants={listVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              {allDoneVisible ? (
                // All-done celebration
                <div style={{
                  padding: '16px 14px 18px',
                  textAlign: 'center',
                  borderTop: '1px solid rgba(51,65,85,0.3)',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                  <p style={{
                    fontSize: 14, fontWeight: 700, color: '#f1f5f9',
                    margin: '0 0 6px', fontFamily: "'DM Sans', sans-serif",
                    lineHeight: 1.4,
                  }}>
                    You're all set up! The app is yours — explore everything at your own pace.
                  </p>
                  <p style={{
                    fontSize: 12, color: 'rgba(148,163,184,0.6)',
                    margin: 0, fontFamily: "'DM Sans', sans-serif",
                  }}>
                    Closing in a moment…
                  </p>
                </div>
              ) : (
                // Checklist items
                <div style={{ padding: '0 14px 10px', borderTop: '1px solid rgba(51,65,85,0.3)' }}>
                  {items.map((item) => (
                    <ChecklistItem key={item.id} item={item} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
