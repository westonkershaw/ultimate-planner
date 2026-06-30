import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const uid = () => Math.random().toString(36).slice(2, 9);

// Map goal focus → tab to navigate to after onboarding
const GOAL_TAB_MAP = {
  fit: 'health',
  wealth: 'finance',
  productive: 'plan',
  habits: 'grow',
  all: 'dashboard',
};

const FOCUS_OPTIONS = [
  { id: 'fit',        icon: '💪', label: 'Get Fit',              desc: 'Track workouts & build fitness habits' },
  { id: 'wealth',     icon: '💰', label: 'Build Wealth',         desc: 'Budget, save, and grow net worth' },
  { id: 'productive', icon: '⚡', label: 'Be More Productive',   desc: 'Plan tasks and crush your goals' },
  { id: 'habits',     icon: '🌱', label: 'Better Habits',        desc: 'Build streaks and track growth' },
  { id: 'all',        icon: '🚀', label: 'All of the Above',     desc: 'Master every area of your life' },
];

const FEATURE_GRID = [
  { icon: '✅', label: 'Tasks & Goals' },
  { icon: '🌱', label: 'Habits & Streaks' },
  { icon: '💰', label: 'Finance Tracking' },
  { icon: '❤️', label: 'Health & Workouts' },
  { icon: '📓', label: 'Journal & Reflection' },
  { icon: '✨', label: 'Vision Board' },
];

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.70)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
    fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    background: '#0f172a',
    border: '1px solid rgba(51,65,85,0.8)',
    borderRadius: 20,
    padding: '40px 36px',
    maxWidth: 448,
    width: '100%',
    boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
  },
  title: {
    fontSize: 26, fontWeight: 800, color: '#f1f5f9',
    margin: '0 0 10px', lineHeight: 1.2,
    fontFamily: "'Syne', serif",
  },
  sub: {
    fontSize: 14, color: 'rgba(148,163,184,0.85)',
    margin: '0 0 28px', lineHeight: 1.6,
  },
  btn: {
    background: '#14b8a6', color: '#fff', border: 'none',
    borderRadius: 12, padding: '13px 28px',
    fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700,
    cursor: 'pointer', width: '100%', marginTop: 8,
    transition: 'opacity 0.15s',
  },
  btnDisabled: {
    background: '#14b8a6', color: '#fff', border: 'none',
    borderRadius: 12, padding: '13px 28px',
    fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700,
    cursor: 'not-allowed', width: '100%', marginTop: 8,
    opacity: 0.45,
  },
  input: {
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '11px 14px',
    color: '#f1f5f9', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
    width: '100%', boxSizing: 'border-box', outline: 'none',
    marginBottom: 14,
    transition: 'border-color 0.15s',
  },
  label: {
    fontSize: 12, fontWeight: 600,
    color: 'rgba(148,163,184,0.75)',
    marginBottom: 7, display: 'block',
    letterSpacing: '0.4px', textTransform: 'uppercase',
  },
  skip: {
    background: 'none', border: 'none',
    color: 'rgba(148,163,184,0.55)', cursor: 'pointer',
    fontSize: 13, marginTop: 12, width: '100%',
    fontFamily: "'DM Sans', sans-serif",
    padding: '4px 0',
  },
};

function Dots({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === step ? 22 : 8, height: 8, borderRadius: 99,
            background: i === step ? '#14b8a6' : 'rgba(255,255,255,0.1)',
            transition: 'width 0.25s ease, background 0.25s ease',
          }}
        />
      ))}
    </div>
  );
}

export default function OnboardingWizard({ onComplete }) {
  const prefersReduced = useReducedMotion();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');

  // Step 2 state
  const [quickTask, setQuickTask] = useState('');
  const [quickHabit, setQuickHabit] = useState('');

  const nameRef = useRef(null);

  const variants = prefersReduced ? {} : {
    initial: { opacity: 0, scale: 0.97, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit:    { opacity: 0, scale: 0.96, y: -8 },
  };
  const transition = { duration: 0.2, ease: 'easeOut' };

  function handleFinish() {
    const profile = {};
    if (name.trim()) profile.firstName = name.trim();
    if (goal)        profile.focusArea = goal;

    // Build quick-win task (seeded into today in App.jsx)
    if (quickTask.trim()) {
      profile.quickTask = {
        id: uid(),
        title: quickTask.trim(),
        done: false,
        category: 'intellectual',
        priority: 'normal',
        createdAt: Date.now(),
      };
    }

    // Build quick-win habit KI (seeded into data2.kis in App.jsx)
    if (quickHabit.trim()) {
      profile.quickHabit = {
        id: uid(),
        name: quickHabit.trim(),
        category: 'intellectual',
        unit: 'times',
        weeklyGoal: 5,
        dailyLogs: {},
      };
    }

    // Which tab to navigate to based on goal
    profile.targetTab = GOAL_TAB_MAP[goal] || 'dashboard';

    onComplete(profile);
  }

  const steps = [
    // ── Step 0 — Welcome ─────────────────────────────────────────────────────
    <motion.div key="s0" variants={variants} initial="initial" animate="animate" exit="exit" transition={transition}>
      <Dots step={0} total={3} />
      <h1 style={S.title}>Welcome to Ultimate Life Planner 🎯</h1>
      <p style={S.sub}>Your all-in-one life dashboard. Let's get you set up in 60 seconds.</p>

      {/* Value prop headline */}
      <div style={{ marginBottom: 20 }}>
        <p style={{
          fontFamily: "'Syne', serif",
          fontSize: 26,
          fontWeight: 900,
          color: '#f1f5f9',
          margin: '0 0 6px',
          lineHeight: 1.15,
        }}>
          Your life, optimized.
        </p>
        <p style={{
          fontSize: 13,
          color: 'rgba(148,163,184,0.7)',
          margin: 0,
          lineHeight: 1.55,
        }}>
          Track goals, build habits, manage money, and stay healthy — all in one place.
        </p>
      </div>

      {/* Feature grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
        {FEATURE_GRID.map(({ icon, label }) => (
          <div
            key={label}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(45, 212, 191,0.07)',
              border: '1px solid rgba(45, 212, 191,0.15)',
              borderRadius: 12, padding: '12px 14px',
            }}
          >
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{label}</span>
          </div>
        ))}
      </div>

      <button style={S.btn} onClick={() => { setStep(1); setTimeout(() => nameRef.current?.focus(), 120); }}>
        Get Started →
      </button>
      <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.55)', textAlign: 'center', marginTop: 14, lineHeight: 1.6 }}>
        By continuing, you agree to our{' '}
        <a href="https://ultimate-planner-alpha.vercel.app/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(45, 212, 191,0.7)', textDecoration: 'underline' }}>Terms of Service</a>
        {' '}and{' '}
        <a href="https://ultimate-planner-alpha.vercel.app/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(45, 212, 191,0.7)', textDecoration: 'underline' }}>Privacy Policy</a>.
      </p>
    </motion.div>,

    // ── Step 1 — Your Profile ─────────────────────────────────────────────────
    <motion.div key="s1" variants={variants} initial="initial" animate="animate" exit="exit" transition={transition}>
      <Dots step={1} total={3} />
      <h1 style={S.title}>Your Profile</h1>
      <p style={S.sub}>Tell us a bit about yourself so we can personalise your experience.</p>

      <label htmlFor="onboarding-name" style={S.label}>Your name</label>
      <input
        id="onboarding-name"
        ref={nameRef}
        style={S.input}
        type="text"
        placeholder="e.g. Alex"
        value={name}
        autoComplete="given-name"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) setStep(2); }}
        required
      />

      <label style={{ ...S.label, marginBottom: 10 }}>What's your #1 focus?</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: goal === 'all' ? 10 : 20 }}>
        {FOCUS_OPTIONS.map((opt) => {
          const selected = goal === opt.id;
          const selBorder = selected ? '#14b8a6' : 'rgba(255,255,255,0.08)';
          return (
            <button
              key={opt.id}
              onClick={() => setGoal(opt.id)}
              style={{
                background: selected ? 'rgba(45, 212, 191,0.15)' : 'rgba(15,23,42,0.6)',
                border: '1.5px solid ' + selBorder,
                borderRadius: 12, padding: '12px 10px', cursor: 'pointer',
                textAlign: 'left', fontFamily: "'DM Sans', sans-serif",
                transition: 'border-color 0.18s, background 0.18s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 5, lineHeight: 1 }}>{opt.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: selected ? '#a5b4fc' : '#f1f5f9', marginBottom: 3 }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.6)', lineHeight: 1.4 }}>{opt.desc}</div>
            </button>
          );
        })}
      </div>

      {goal === 'all' && (
        <p style={{
          fontSize: 12,
          color: 'rgba(148,163,184,0.65)',
          background: 'rgba(45, 212, 191,0.08)',
          border: '1px solid rgba(45, 212, 191,0.2)',
          borderRadius: 10,
          padding: '9px 12px',
          margin: '0 0 20px',
          lineHeight: 1.5,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          We'll start you with the most popular features. You can customize everything later.
        </p>
      )}

      <button
        style={name.trim() && goal ? S.btn : S.btnDisabled}
        onClick={() => { if (name.trim() && goal) setStep(2); }}
        disabled={!name.trim() || !goal}
      >
        Continue →
      </button>
    </motion.div>,

    // ── Step 2 — Quick Wins ───────────────────────────────────────────────────
    <motion.div key="s2" variants={variants} initial="initial" animate="animate" exit="exit" transition={transition}>
      <Dots step={2} total={3} />
      <h1 style={S.title}>Quick Wins 🚀</h1>
      <p style={S.sub}>Seed your planner with one task and one habit. Both are optional — you can always add more later.</p>

      <label htmlFor="onboarding-task" style={S.label}>Add your first task</label>
      <input
        id="onboarding-task"
        style={S.input}
        type="text"
        placeholder="e.g. Review project proposal"
        value={quickTask}
        autoComplete="off"
        onChange={(e) => setQuickTask(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleFinish(); }}
        autoFocus
      />

      <label htmlFor="onboarding-habit" style={S.label}>One habit to track daily (called a 'Key Indicator')</label>
      <input
        id="onboarding-habit"
        style={{ ...S.input, marginBottom: 6 }}
        type="text"
        placeholder="e.g. Exercise, Read, Meditate"
        value={quickHabit}
        autoComplete="off"
        onChange={(e) => setQuickHabit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleFinish(); }}
      />
      <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.55)', margin: '0 0 20px', lineHeight: 1.5 }}>
        Key Indicators are daily habits you track — like workouts, water intake, or reading.
      </p>

      <button style={S.btn} onClick={handleFinish}>
        Let's go! 🚀
      </button>
      <button style={S.skip} onClick={handleFinish}>
        Skip for now →
      </button>
    </motion.div>,
  ];

  return (
    <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Welcome — get started with Ultimate Life Planner">
      <div style={S.card}>
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(148,163,184,0.55)', cursor: 'pointer',
              fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              padding: '0 0 14px', display: 'flex', alignItems: 'center', gap: 4,
            }}
            aria-label="Go back"
          >
            ← Back
          </button>
        )}
        <AnimatePresence mode="wait">
          {steps[step]}
        </AnimatePresence>
      </div>
    </div>
  );
}
