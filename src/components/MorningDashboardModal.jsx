/* eslint-disable */
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_COLORS = {
  intellectual: "#4f9cf9",
  social:       "#34c98a",
  physical:     "#f97b4f",
  spiritual:    "#c084fc",
  financial:    "#fbbf24",
  work:         "#8b5cf6",
  creative:     "#ec4899",
  health:       "#14b8a6",
};

const CAT_EMOJI = {
  intellectual: "🧠",
  physical:     "💪",
  financial:    "💰",
  social:       "🤝",
  spiritual:    "✨",
  work:         "💼",
  creative:     "🎨",
  health:       "🩺",
};

const QUOTES = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "Small daily improvements over time lead to stunning results.",
  "You don't have to be great to start, but you have to start to be great.",
  "Discipline is choosing between what you want now and what you want most.",
  "Act as if what you do makes a difference. It does. — William James",
  "It's not about perfect. It's about effort.",
  "Success is the sum of small efforts repeated day in and day out.",
  "The morning is wiser than the evening.",
  "Energy flows where intention goes.",
  "One day or day one — you decide.",
];

// Monday-indexed day names (used as weekDays keys in app state)
const WDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// Slide accent colors: amber, indigo, teal
const SLIDE_ACCENTS = ["#f59e0b", "#14b8a6", "#14b8a6"];
const SLIDE_ACCENT_DIMS = ["rgba(245,158,11,0.15)", "rgba(45, 212, 191,0.15)", "rgba(20,184,166,0.15)"];
const SLIDE_GRADIENT_STOPS = [
  ["rgba(245,158,11,0.12)", "rgba(251,191,36,0.04)"],
  ["rgba(45, 212, 191,0.12)", "rgba(129,140,248,0.04)"],
  ["rgba(20,184,166,0.12)", "rgba(45,212,191,0.04)"],
];

// ─── Style tokens ─────────────────────────────────────────────────────────────

const CARD = {
  background:   "rgba(15,23,42,0.6)",
  border:       "1px solid rgba(51,65,85,0.4)",
  borderRadius: 14,
  padding:      16,
};

const S = {
  overlay: {
    position:       "fixed",
    inset:          0,
    zIndex:         9998,
    background:     "rgba(8,9,13,0.97)",
    fontFamily:     "'DM Sans', sans-serif",
    display:        "flex",
    flexDirection:  "column",
    overflow:       "hidden",
  },
  slideWrap: {
    flex:           1,
    overflowY:      "auto",
    overflowX:      "hidden",
    scrollbarWidth: "thin",
  },
  inner: {
    maxWidth:  540,
    margin:    "0 auto",
    padding:   "28px 20px 32px",
    minHeight: "100%",
  },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color:         "rgba(100,116,139,0.7)",
    marginBottom:  10,
  },
  heading: {
    fontFamily: "'Syne', serif",
    fontSize:   28,
    fontWeight: 800,
    color:      "#f1f5f9",
    margin:     "0 0 4px",
    lineHeight: 1.15,
  },
  headingSub: {
    fontSize:   15,
    color:      "rgba(148,163,184,0.7)",
    margin:     0,
    lineHeight: 1.4,
  },
  mitInput: {
    background:   "rgba(15,23,42,0.7)",
    border:       "1.5px solid rgba(45, 212, 191,0.35)",
    borderRadius: 12,
    padding:      "12px 14px",
    color:        "#f1f5f9",
    fontSize:     14,
    fontFamily:   "'DM Sans', sans-serif",
    width:        "100%",
    boxSizing:    "border-box",
    outline:      "none",
    lineHeight:   1.5,
    transition:   "border-color 0.2s, box-shadow 0.2s",
  },
  intentionInput: {
    background:   "rgba(15,23,42,0.7)",
    border:       "1.5px solid rgba(20,184,166,0.35)",
    borderRadius: 12,
    padding:      "14px 16px",
    color:        "#f1f5f9",
    fontSize:     15,
    fontFamily:   "'DM Sans', sans-serif",
    width:        "100%",
    boxSizing:    "border-box",
    outline:      "none",
    resize:       "none",
    lineHeight:   1.5,
    transition:   "border-color 0.2s, box-shadow 0.2s",
  },
  taskRow: {
    display:      "flex",
    alignItems:   "center",
    gap:          10,
    padding:      "9px 14px",
    ...CARD,
    marginBottom: 8,
    cursor:       "pointer",
  },
  checkbox: {
    width:          18,
    height:         18,
    borderRadius:   5,
    border:         "1.5px solid rgba(45, 212, 191,0.4)",
    flexShrink:     0,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    cursor:         "pointer",
    transition:     "background 0.15s, border-color 0.15s",
  },
  emptyState: {
    textAlign:    "center",
    padding:      "20px 0",
    ...CARD,
    color:        "rgba(100,116,139,0.7)",
    fontSize:     13,
  },
  navLink: {
    background:          "transparent",
    border:              "none",
    color:               "#2dd4bf",
    fontFamily:          "'DM Sans', sans-serif",
    fontSize:            13,
    fontWeight:          600,
    cursor:              "pointer",
    padding:             "6px 0 0",
    display:             "block",
    margin:              "6px auto 0",
    textDecoration:      "underline",
    textDecorationColor: "rgba(129,140,248,0.4)",
  },
  quoteBox: {
    ...CARD,
    borderColor: "rgba(20,184,166,0.2)",
    padding:     "14px 18px",
  },
  quoteText: {
    fontSize:   13,
    color:      "rgba(148,163,184,0.8)",
    fontStyle:  "italic",
    lineHeight: 1.6,
    margin:     0,
  },
  dotsBar: {
    display:        "flex",
    justifyContent: "center",
    alignItems:     "center",
    gap:            8,
    padding:        "14px 0 10px",
    flexShrink:     0,
  },
  navBar: {
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "space-between",
    padding:         "12px 20px 16px",
    flexShrink:      0,
    borderTop:       "1px solid rgba(51,65,85,0.3)",
  },
  navBtn: {
    background:   "rgba(15,23,42,0.7)",
    border:       "1px solid rgba(51,65,85,0.5)",
    borderRadius: 10,
    color:        "#94a3b8",
    fontSize:     13,
    fontWeight:   600,
    fontFamily:   "'DM Sans', sans-serif",
    padding:      "10px 20px",
    cursor:       "pointer",
    transition:   "background 0.15s, border-color 0.15s",
  },
  primaryBtn: {
    background:   "#14b8a6",
    color:        "#fff",
    border:       "none",
    borderRadius: 12,
    padding:      "13px 28px",
    fontSize:     15,
    fontWeight:   700,
    fontFamily:   "'DM Sans', sans-serif",
    cursor:       "pointer",
    transition:   "background 0.15s, transform 0.1s",
  },
  closeBtn: {
    background:     "rgba(15,23,42,0.5)",
    border:         "1px solid rgba(51,65,85,0.4)",
    borderRadius:   8,
    color:          "rgba(100,116,139,0.7)",
    fontSize:       18,
    width:          32,
    height:         32,
    cursor:         "pointer",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
};

// ─── Animation variants ───────────────────────────────────────────────────────

function slideVariants(direction, reduced) {
  if (reduced) return { enter: {}, center: {}, exit: {} };
  return {
    enter:  { x: direction > 0 ? 320 : -320, opacity: 0 },
    center: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 380, damping: 34 } },
    exit:   { x: direction > 0 ? -320 : 320, opacity: 0, transition: { duration: 0.18 } },
  };
}

const itemV = (reduced) =>
  reduced
    ? {}
    : {
        hidden:  { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { type: "spring", stiffness: 400, damping: 30 },
        },
      };

const containerV = (reduced) =>
  reduced
    ? {}
    : {
        hidden:  { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
      };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayWdayName() {
  return WDAYS[(new Date().getDay() + 6) % 7];
}

function getYesterdayWdayName() {
  return WDAYS[(new Date().getDay() + 5) % 7];
}

function formatTodayDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });
}

function pickQuote() {
  const d   = new Date();
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  return QUOTES[doy % QUOTES.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children, accent }) {
  return (
    <p
      style={{
        ...S.sectionLabel,
        ...(accent ? { color: accent } : {}),
      }}
    >
      {children}
    </p>
  );
}

function ScoreChip({ label, value, accent }) {
  return (
    <div
      style={{
        flex:           1,
        background:     `${accent}18`,
        border:         `1px solid ${accent}33`,
        borderRadius:   12,
        padding:        "10px 12px",
        textAlign:      "center",
        minWidth:        0,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800, color: accent, fontFamily: "'Syne', serif" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", marginTop: 3, fontWeight: 600, letterSpacing: "0.05em" }}>
        {label}
      </div>
    </div>
  );
}

function StreakBadge({ streak }) {
  if (!streak || streak < 1) return null;
  return (
    <div
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:           7,
        background:   "rgba(245,158,11,0.12)",
        border:       "1px solid rgba(245,158,11,0.3)",
        borderRadius: 24,
        padding:      "6px 14px",
        marginTop:    14,
      }}
    >
      <span style={{ fontSize: 16 }}>🔥</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>
        {streak} day streak — don't break it today!
      </span>
    </div>
  );
}

function TaskRow({ task, todayName, onChange, reduced }) {
  const isDone = task.done === true;
  const color  = CAT_COLORS[task.category] || "#14b8a6";
  const iV     = itemV(reduced);

  function toggle() {
    onChange((prev) => ({
      ...prev,
      weekDays: {
        ...prev.weekDays,
        [todayName]: {
          ...(prev.weekDays?.[todayName] || {}),
          tasks: (prev.weekDays?.[todayName]?.tasks || []).map((t) =>
            t.id === task.id ? { ...t, done: !t.done } : t
          ),
        },
      },
    }));
  }

  return (
    <motion.div
      variants={iV}
      style={S.taskRow}
      onClick={toggle}
      role="checkbox"
      aria-checked={isDone}
      tabIndex={0}
      onKeyDown={(e) => e.key === " " && (e.preventDefault(), toggle())}
    >
      <div
        style={{
          ...S.checkbox,
          background:  isDone ? "#14b8a6" : "transparent",
          borderColor: isDone ? "#14b8a6" : "rgba(45, 212, 191,0.4)",
        }}
        aria-hidden="true"
      >
        {isDone && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div
        style={{
          width:        6,
          height:       6,
          borderRadius: 99,
          background:   color,
          flexShrink:   0,
        }}
      />
      <span
        style={{
          flex:           1,
          fontSize:       14,
          color:          isDone ? "rgba(100,116,139,0.5)" : "#e2e8f0",
          textDecoration: isDone ? "line-through" : "none",
          transition:     "color 0.2s",
        }}
      >
        {task.title}
      </span>
    </motion.div>
  );
}

function MITField({ index, value, accent, onChange }) {
  const [focused, setFocused] = useState(false);
  const labels = ["First priority", "Second priority", "Third priority"];

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(100,116,139,0.6)", marginBottom: 5, letterSpacing: "0.04em" }}>
        {labels[index] || `Priority ${index + 1}`}
      </div>
      <input
        type="text"
        placeholder={`What's priority #${index + 1} today?`}
        value={value || ""}
        onChange={(e) => onChange(index, e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...S.mitInput,
          borderColor: focused ? accent : "rgba(45, 212, 191,0.35)",
          boxShadow:   focused ? `0 0 0 3px ${accent}22` : "none",
        }}
        aria-label={`Top priority ${index + 1} for today`}
      />
    </div>
  );
}

// ─── Slide 1: Yesterday's recap ───────────────────────────────────────────────

function Slide1({ data, todayName, yesterdayName, displayName, reduced }) {
  const iV = itemV(reduced);
  const cV = containerV(reduced);
  const accent = SLIDE_ACCENTS[0];

  const yesterdayTasks = data?.weekDays?.[yesterdayName]?.tasks || [];
  const doneTasks      = yesterdayTasks.filter((t) => t.done);
  const totalTasks     = yesterdayTasks.length;
  const pct            = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

  // Count habits logged yesterday
  const allKIs       = data?.kis || [];
  const habitsHit    = allKIs.filter((ki) => (ki.dailyLogs?.[yesterdayName] || 0) > 0).length;
  const totalHabits  = allKIs.length;

  // Streak from data
  const streak = data?.currentStreak || 0;

  const performanceMsg = pct >= 80
    ? "You crushed it! Keep that energy going."
    : pct >= 50
    ? "Good effort yesterday — build on it today."
    : totalTasks === 0
    ? "No tasks logged — let's set some today."
    : "Every day is a fresh start. Let's go!";

  return (
    <motion.div variants={cV} initial="hidden" animate="visible">
      {/* Greeting */}
      <motion.div variants={iV} style={{ marginBottom: 20 }}>
        <div
          style={{
            display:        "inline-block",
            background:     SLIDE_ACCENT_DIMS[0],
            border:         `1px solid ${accent}33`,
            borderRadius:   20,
            padding:        "4px 12px",
            fontSize:       11,
            fontWeight:     700,
            color:          accent,
            letterSpacing:  "0.08em",
            textTransform:  "uppercase",
            marginBottom:   12,
          }}
        >
          Day Start
        </div>
        <h1 style={S.heading}>
          {(() => { const h = new Date().getHours(); return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good night"; })()}, {displayName}! {(() => { const h = new Date().getHours(); return h < 5 ? "\uD83C\uDF19" : h < 12 ? "\u2600\uFE0F" : h < 17 ? "\uD83C\uDF24" : "\uD83C\uDF19"; })()}
        </h1>
        <p style={S.headingSub}>{formatTodayDate()}</p>
      </motion.div>

      {/* Yesterday scorecard */}
      <motion.div variants={iV} style={{ marginBottom: 16 }}>
        <SectionLabel accent="rgba(245,158,11,0.7)">Yesterday's Recap</SectionLabel>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <ScoreChip label="Tasks Done" value={`${doneTasks.length}/${totalTasks}`} accent={accent} />
          {totalHabits > 0 && (
            <ScoreChip label="Habits Hit" value={`${habitsHit}/${totalHabits}`} accent="#34c98a" />
          )}
          <ScoreChip label="Completion" value={`${pct}%`} accent={pct >= 80 ? "#34c98a" : pct >= 50 ? "#f59e0b" : "#f87171"} />
        </div>
        <div
          style={{
            ...CARD,
            borderColor: `${accent}25`,
            background:  `${accent}08`,
            padding:     "12px 16px",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: "#e2e8f0", lineHeight: 1.5 }}>
            {performanceMsg}
          </p>
        </div>
      </motion.div>

      {/* Streak */}
      <motion.div variants={iV}>
        <StreakBadge streak={streak} />
      </motion.div>
    </motion.div>
  );
}

// ─── Slide 2: Today's agenda ──────────────────────────────────────────────────

function Slide2({ data, todayName, onChange, reduced, onNavigate, onClose }) {
  const iV = itemV(reduced);
  const cV = containerV(reduced);
  const accent = SLIDE_ACCENTS[1];

  const todayTasks    = useMemo(() => data?.weekDays?.[todayName]?.tasks || [], [data?.weekDays, todayName]);
  const visibleTasks  = todayTasks.slice(0, 5);
  const extraTasks    = Math.max(0, todayTasks.length - 5);
  const todayMITs     = data?.todayMITs || ["", "", ""];

  function handleMITChange(index, value) {
    onChange((prev) => {
      const mits = [...(prev.todayMITs || ["", "", ""])];
      mits[index] = value;
      return { ...prev, todayMITs: mits };
    });
  }

  return (
    <motion.div variants={cV} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={iV} style={{ marginBottom: 20 }}>
        <div
          style={{
            display:        "inline-block",
            background:     SLIDE_ACCENT_DIMS[1],
            border:         `1px solid ${accent}33`,
            borderRadius:   20,
            padding:        "4px 12px",
            fontSize:       11,
            fontWeight:     700,
            color:          accent,
            letterSpacing:  "0.08em",
            textTransform:  "uppercase",
            marginBottom:   12,
          }}
        >
          Today's Agenda
        </div>
        <h1 style={S.heading}>{formatTodayDate()}</h1>
        <p style={S.headingSub}>Here's what's on your plate.</p>
      </motion.div>

      {/* Top 3 priorities */}
      <motion.div variants={iV} style={{ marginBottom: 20 }}>
        <SectionLabel accent="rgba(45, 212, 191,0.7)">Top 3 Priorities</SectionLabel>
        <div style={CARD}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "rgba(100,116,139,0.7)" }}>
            Set your three most important tasks for today.
          </p>
          {[0, 1, 2].map((i) => (
            <MITField
              key={i}
              index={i}
              value={todayMITs[i]}
              accent={accent}
              onChange={handleMITChange}
            />
          ))}
        </div>
      </motion.div>

      {/* Today's tasks */}
      <motion.div variants={iV}>
        <SectionLabel accent="rgba(45, 212, 191,0.7)">Today's Tasks</SectionLabel>
        {todayTasks.length === 0 ? (
          <div style={S.emptyState}>
            <div>No tasks planned for today.</div>
            <button
              style={S.navLink}
              onClick={() => { onNavigate("weekly"); onClose(); }}
            >
              Plan your day →
            </button>
          </div>
        ) : (
          <motion.div variants={cV}>
            {visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                todayName={todayName}
                onChange={onChange}
                reduced={reduced}
              />
            ))}
            {extraTasks > 0 && (
              <button
                style={{
                  ...S.navLink,
                  display:        "block",
                  width:          "100%",
                  textAlign:      "left",
                  padding:        "4px 14px",
                  fontSize:       13,
                  textDecoration: "none",
                  color:          "rgba(100,116,139,0.6)",
                }}
                onClick={() => { onNavigate("weekly"); onClose(); }}
              >
                +{extraTasks} more task{extraTasks > 1 ? "s" : ""} — view all →
              </button>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Slide 3: Set your intention ──────────────────────────────────────────────

function Slide3({ data, onChange, onClose, reduced }) {
  const iV     = itemV(reduced);
  const cV     = containerV(reduced);
  const accent = SLIDE_ACCENTS[2];
  const quote  = useMemo(pickQuote, []);

  const [focused, setFocused] = useState(false);
  const intention = data?.todayIntention || "";

  function handleIntentionChange(e) {
    onChange((prev) => ({ ...prev, todayIntention: e.target.value }));
  }

  function handleStart() {
    onClose();
  }

  return (
    <motion.div variants={cV} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={iV} style={{ marginBottom: 24 }}>
        <div
          style={{
            display:        "inline-block",
            background:     SLIDE_ACCENT_DIMS[2],
            border:         `1px solid ${accent}33`,
            borderRadius:   20,
            padding:        "4px 12px",
            fontSize:       11,
            fontWeight:     700,
            color:          accent,
            letterSpacing:  "0.08em",
            textTransform:  "uppercase",
            marginBottom:   12,
          }}
        >
          Set Your Intention
        </div>
        <h1 style={S.heading}>What would make today a great day?</h1>
        <p style={S.headingSub}>One sentence is all it takes.</p>
      </motion.div>

      {/* Intention input */}
      <motion.div variants={iV} style={{ marginBottom: 24 }}>
        <textarea
          rows={3}
          placeholder="Today would be great if I..."
          value={intention}
          onChange={handleIntentionChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...S.intentionInput,
            borderColor: focused ? accent : "rgba(20,184,166,0.35)",
            boxShadow:   focused ? `0 0 0 3px ${accent}22` : "none",
          }}
          aria-label="Today's intention"
        />
      </motion.div>

      {/* Quote */}
      <motion.div variants={iV} style={{ marginBottom: 28 }}>
        <SectionLabel accent="rgba(20,184,166,0.7)">Today's Quote</SectionLabel>
        <div style={S.quoteBox}>
          <p style={S.quoteText}>"{quote}"</p>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div variants={iV}>
        <motion.button
          style={{
            ...S.primaryBtn,
            background: `linear-gradient(135deg, ${accent}, #2dd4bf)`,
            width:      "100%",
            fontSize:   16,
            padding:    "15px 24px",
          }}
          onClick={handleStart}
          whileHover={reduced ? {} : { scale: 1.02 }}
          whileTap={reduced ? {} : { scale: 0.97 }}
          aria-label="Start your day"
        >
          Start My Day 🚀
        </motion.button>
        <p
          style={{
            textAlign:  "center",
            fontSize:   12,
            color:      "rgba(100,116,139,0.5)",
            marginTop:  14,
          }}
        >
          Tip: Press ⌘K anywhere to add tasks, log meals, or track workouts
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ slide, total, onSelect, accents }) {
  return (
    <div style={S.dotsBar} role="tablist" aria-label="Slide navigation">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          role="tab"
          aria-selected={slide === i}
          aria-label={`Slide ${i + 1}`}
          onClick={() => onSelect(i)}
          style={{
            width:        slide === i ? 22 : 8,
            height:       8,
            borderRadius: 99,
            background:   slide === i ? accents[i] : "rgba(51,65,85,0.6)",
            border:       "none",
            cursor:       "pointer",
            padding:      0,
            transition:   "width 0.25s ease, background 0.25s ease",
            flexShrink:   0,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MorningDashboardModal({
  data,
  onChange,
  onClose,
  onNavigate,
  isPro,
}) {
  const reduced      = useReducedMotion();
  const todayName    = getTodayWdayName();
  const yesterdayName = getYesterdayWdayName();
  const displayName  = data?.userName || data?.firstName || "friend";

  const [slide, setSlide]         = useState(0);
  const [direction, setDirection] = useState(1);
  const prevSlide                 = useRef(slide);

  function goTo(next) {
    setDirection(next > slide ? 1 : -1);
    setSlide(next);
    prevSlide.current = next;
  }

  function handleNext() {
    if (slide < 2) goTo(slide + 1);
  }
  function handlePrev() {
    if (slide > 0) goTo(slide - 1);
  }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft")  handlePrev();
      if (e.key === "Escape")     onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slide]);

  const accentGrad = SLIDE_GRADIENT_STOPS[slide];
  const accent     = SLIDE_ACCENTS[slide];

  const overlayAnim = reduced
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  const sVars = slideVariants(direction, reduced);

  return (
    <motion.div
      style={{
        ...S.overlay,
        background: `radial-gradient(ellipse at 30% 0%, ${accentGrad[0]}, transparent 55%), radial-gradient(ellipse at 70% 100%, ${accentGrad[1]}, transparent 50%), rgba(8,9,13,0.97)`,
        transition: "background 0.5s ease",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Morning dashboard"
      {...overlayAnim}
      transition={{ duration: 0.22 }}
    >
      {/* Top bar: close + slide label */}
      <div
        style={{
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
          padding:         "16px 20px 0",
          flexShrink:      0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width:        28,
                height:       3,
                borderRadius: 99,
                background:   i <= slide ? accent : "rgba(51,65,85,0.4)",
                transition:   "background 0.3s ease",
              }}
            />
          ))}
        </div>
        <button
          onClick={onClose}
          aria-label="Close morning dashboard"
          style={S.closeBtn}
        >
          ×
        </button>
      </div>

      {/* Slide content */}
      <div style={S.slideWrap}>
        <div style={S.inner}>
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={slide}
              custom={direction}
              variants={sVars}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {slide === 0 && (
                <Slide1
                  data={data}
                  todayName={todayName}
                  yesterdayName={yesterdayName}
                  displayName={displayName}
                  reduced={reduced}
                />
              )}
              {slide === 1 && (
                <Slide2
                  data={data}
                  todayName={todayName}
                  onChange={onChange}
                  reduced={reduced}
                  onNavigate={onNavigate}
                  onClose={onClose}
                />
              )}
              {slide === 2 && (
                <Slide3
                  data={data}
                  onChange={onChange}
                  onClose={onClose}
                  reduced={reduced}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress dots */}
      <ProgressDots
        slide={slide}
        total={3}
        onSelect={goTo}
        accents={SLIDE_ACCENTS}
      />

      {/* Navigation bar */}
      <div style={S.navBar}>
        <button
          style={{
            ...S.navBtn,
            opacity: slide === 0 ? 0.3 : 1,
            cursor:  slide === 0 ? "default" : "pointer",
          }}
          onClick={handlePrev}
          disabled={slide === 0}
          aria-label="Previous slide"
        >
          ← Back
        </button>

        {slide < 2 ? (
          <motion.button
            style={{
              ...S.primaryBtn,
              background: accent,
              padding:    "10px 24px",
            }}
            onClick={handleNext}
            whileHover={reduced ? {} : { scale: 1.02 }}
            whileTap={reduced ? {} : { scale: 0.97 }}
            aria-label="Next slide"
          >
            Next →
          </motion.button>
        ) : (
          <motion.button
            style={{
              ...S.primaryBtn,
              background: `linear-gradient(135deg, ${SLIDE_ACCENTS[2]}, #2dd4bf)`,
              padding:    "10px 24px",
            }}
            onClick={onClose}
            whileHover={reduced ? {} : { scale: 1.02 }}
            whileTap={reduced ? {} : { scale: 0.97 }}
            aria-label="Start your day"
          >
            Start My Day 🚀
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
