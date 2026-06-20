/* eslint-disable */
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  calcSvgRingProps,
  formatTimerDisplay,
  nextPomodoroPhase,
  POMODORO_DURATIONS,
  calcStudyTimeForDate,
  calcStudyTimeForWeek,
  calc7DayRetentionRate,
  calcBestStudyDay,
  calcStudyConsistency7Days,
} from "../utils/math";

// ─── Utilities ───────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function todayStr() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

function fmtDate(dateStr) {
  if (!dateStr) return "Never";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function fmtSeconds(secs) {
  if (secs < 60) return secs + "s";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return h + "h " + m + "m";
  return m + "m";
}

// ─── SM-2 Algorithm ──────────────────────────────────────────────────────────

function sm2(card, grade) {
  const c = { ...card };
  if (grade < 3) {
    c.interval = 1;
  } else if (c.reviews === 0) {
    c.interval = 1;
  } else if (c.reviews === 1) {
    c.interval = 6;
  } else {
    c.interval = Math.round(c.interval * c.easeFactor);
  }
  c.easeFactor = Math.max(
    1.3,
    c.easeFactor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)
  );
  c.reviews += 1;
  c.dueDate = new Date(Date.now() + c.interval * 86400000)
    .toLocaleDateString("en-CA");
  c.lastGrade = grade;
  c.lastReview = new Date().toISOString();
  return c;
}

// ─── Default data factory ────────────────────────────────────────────────────

function defaultCard(front, back) {
  front = front || "";
  back = back || "";
  return {
    id: uid(),
    front,
    back,
    interval: 1,
    dueDate: todayStr(),
    easeFactor: 2.5,
    reviews: 0,
    lastReview: null,
    lastGrade: null,
  };
}

function defaultDeck(name) {
  name = name || "New Deck";
  return {
    id: uid(),
    name,
    emoji: "📚",
    color: "#6366f1",
    description: "",
    cards: [],
    createdAt: new Date().toISOString(),
    totalReviews: 0,
    lastStudied: null,
  };
}

function ensureDefaults(data) {
  return {
    flashcardDecks: [],
    studySessions: [],
    ...data,
  };
}

// ─── Study streak helper ──────────────────────────────────────────────────────

function calcStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => s.date));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toLocaleDateString("en-CA");
    if (days.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (key === todayStr()) {
      d.setDate(d.getDate() - 1);
      continue;
    } else {
      break;
    }
    if (streak > 3650) break;
  }
  return streak;
}

// ─── Colors & emojis ─────────────────────────────────────────────────────────

const EMOJI_OPTIONS = [
  "📚", "🇪🇸", "🧮", "🔬", "🎸", "💻", "✈️", "🎨",
  "🏛️", "🧠", "💡", "🌍", "🎯", "📖", "🔭", "⚗️",
];

const COLOR_OPTIONS = [
  "#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
];

// ─── Shared styles ────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  modal: {
    background: "#0f1117",
    border: "1px solid #1e2030",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    maxWidth: "480px",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  input: {
    width: "100%",
    background: "#08090d",
    border: "1px solid #1e2030",
    borderRadius: "8px",
    padding: "8px 12px",
    color: "#e2e8f0",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  label: {
    display: "block",
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: 600,
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  btn: (variant) => {
    variant = variant || "primary";
    return {
      padding: "8px 16px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: 600,
      background:
        variant === "primary"
          ? "#06b6d4"
          : variant === "danger"
          ? "#ef4444"
          : variant === "ghost"
          ? "transparent"
          : "#1e2030",
      color: variant === "ghost" ? "#94a3b8" : "#fff",
      transition: "opacity 0.15s",
    };
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
};

// ─── Pomodoro SVG Ring Timer ──────────────────────────────────────────────────

const PHASE_COLORS = {
  work:       "#6366f1",
  shortBreak: "#10b981",
  longBreak:  "#06b6d4",
};

const PHASE_LABELS = {
  work:       "Focus",
  shortBreak: "Short Break",
  longBreak:  "Long Break",
};

function PomodoroTimer({ onSessionComplete }) {
  const [phase, setPhase] = useState("work"); // work | shortBreak | longBreak
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(POMODORO_DURATIONS.work);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [deepFocus, setDeepFocus] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const durationRef = useRef(POMODORO_DURATIONS.work);

  const total = POMODORO_DURATIONS[phase];
  const elapsed = total - remaining;
  const progress = total > 0 ? elapsed / total : 0;
  const ringSize = 200;
  const ringThickness = 14;
  const ring = useMemo(
    () => calcSvgRingProps(progress, ringSize, ringThickness),
    [progress]
  );
  const color = PHASE_COLORS[phase];
  const glowColor = color + "66";
  const viewBoxStr = "0 0 " + ringSize + " " + ringSize;

  function startTimer() {
    if (running) return;
    startTimeRef.current = Date.now() - (total - remaining) * 1000;
    setRunning(true);
  }

  function pauseTimer() {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function resetTimer() {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(POMODORO_DURATIONS[phase]);
  }

  function switchPhase(newPhase) {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase(newPhase);
    setRemaining(POMODORO_DURATIONS[newPhase]);
    durationRef.current = POMODORO_DURATIONS[newPhase];
  }

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const newRemaining = Math.max(0, durationRef.current - elapsed);
      setRemaining(newRemaining);
      if (newRemaining <= 0) {
        clearInterval(intervalRef.current);
        setRunning(false);
        if (phase === "work") {
          const newCount = completedSessions + 1;
          setCompletedSessions(newCount);
          if (onSessionComplete) onSessionComplete();
          const next = nextPomodoroPhase(newCount);
          setTimeout(() => switchPhase(next), 800);
        } else {
          setTimeout(() => switchPhase("work"), 800);
        }
      }
    }, 250);
    return () => clearInterval(intervalRef.current);
  }, [running, phase]);

  // Keep durationRef in sync with remaining when not running
  useEffect(() => {
    if (!running) durationRef.current = remaining;
  }, [remaining, running]);

  const timerDisplay = formatTimerDisplay(remaining);

  const timerInner = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}
      role="timer"
      aria-live="polite"
      aria-label={PHASE_LABELS[phase] + ": " + timerDisplay}
    >
      {/* Phase selector pills */}
      <div style={{ display: "flex", gap: 6 }}>
        {(["work", "shortBreak", "longBreak"]).map((p) => (
          <button
            key={p}
            onClick={() => switchPhase(p)}
            style={{
              background: phase === p ? PHASE_COLORS[p] + "33" : "rgba(255,255,255,0.04)",
              border: "1px solid " + (phase === p ? PHASE_COLORS[p] : "rgba(255,255,255,0.1)"),
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 700,
              color: phase === p ? PHASE_COLORS[p] : "rgba(255,255,255,0.4)",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {PHASE_LABELS[p]}
          </button>
        ))}
      </div>

      {/* SVG Ring */}
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg
          width={ringSize}
          height={ringSize}
          viewBox={viewBoxStr}
          style={{ filter: "drop-shadow(0 0 16px " + glowColor + ")" }}
        >
          {/* Track */}
          <circle
            cx={ring.center}
            cy={ring.center}
            r={ring.radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={ringThickness}
          />
          {/* Progress */}
          <motion.circle
            cx={ring.center}
            cy={ring.center}
            r={ring.radius}
            fill="none"
            stroke={color}
            strokeWidth={ringThickness}
            strokeLinecap="round"
            strokeDasharray={ring.circumference}
            animate={{ strokeDashoffset: ring.strokeDashoffset }}
            transition={{ duration: 0.25, ease: "linear" }}
            style={{
              transformOrigin: ring.center + "px " + ring.center + "px",
              transform: "rotate(-90deg)",
            }}
          />
        </svg>

        {/* Center display */}
        <div
          style={{
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: "clamp(32px, 6vw, 44px)",
              fontWeight: 800,
              fontFamily: "monospace",
              color: "#f1f5f9",
              lineHeight: 1,
            }}
          >
            {timerDisplay}
          </div>
          <div style={{ fontSize: 11, color: color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {PHASE_LABELS[phase]}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10 }}>
        {!running ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={startTimer}
            style={{
              background: color,
              border: "none",
              borderRadius: 12,
              padding: "10px 32px",
              fontSize: 15,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Start
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={pauseTimer}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              padding: "10px 32px",
              fontSize: 15,
              fontWeight: 700,
              color: "#f1f5f9",
              cursor: "pointer",
            }}
          >
            Pause
          </motion.button>
        )}
        <button
          onClick={resetTimer}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: "10px 20px",
            fontSize: 14,
            color: "#94a3b8",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      {/* Session count + deep focus toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: (completedSessions % 4) >= i ? color : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginLeft: 4 }}>
            {completedSessions} session{completedSessions !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={() => setDeepFocus((v) => !v)}
          style={{
            background: deepFocus ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)",
            border: "1px solid " + (deepFocus ? "#6366f1" : "rgba(255,255,255,0.1)"),
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            color: deepFocus ? "#a5b4fc" : "#94a3b8",
            cursor: "pointer",
            fontWeight: deepFocus ? 700 : 400,
          }}
        >
          {deepFocus ? "Exit Deep Focus" : "Deep Focus"}
        </button>
      </div>
    </div>
  );

  if (deepFocus) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#08090d",
          zIndex: 9000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        {timerInner}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#0f1117",
        border: "1px solid #1e2030",
        borderRadius: 20,
        padding: "28px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {timerInner}
    </div>
  );
}

// ─── Study Stats Dashboard ────────────────────────────────────────────────────

function StudyStatsDashboard({ decks, sessions }) {
  const today = todayStr();

  // Use math.ts utilities
  const todaySeconds = useMemo(
    () => calcStudyTimeForDate(sessions, today),
    [sessions, today]
  );
  const weekSeconds = useMemo(
    () => calcStudyTimeForWeek(sessions, today),
    [sessions, today]
  );
  const weekGoalSecs = 5 * 3600; // 5h/week default
  const weekPct = Math.min(100, Math.round((weekSeconds / weekGoalSecs) * 100));

  const retention7 = useMemo(() => calc7DayRetentionRate(sessions), [sessions]);
  const streak = useMemo(() => calcStreak(sessions), [sessions]);
  const bestDay = useMemo(() => calcBestStudyDay(sessions), [sessions]);
  const consistency = useMemo(() => calcStudyConsistency7Days(sessions), [sessions]);

  const totalCards = decks.reduce((s, d) => s + d.cards.length, 0);
  const totalReviews = decks.reduce((s, d) => s + (d.totalReviews || 0), 0);

  const statCard = (label, value, sub, accent, ringPct) => {
    const ringColor = accent || "#06b6d4";
    const rProps = ringPct !== undefined ? calcSvgRingProps(ringPct / 100, 44, 4) : null;
    const viewBoxStr = "0 0 44 44";

    return (
      <div
        style={{
          background: "#0f1117",
          border: "1px solid #1e2030",
          borderRadius: 14,
          padding: "14px 16px",
          flex: "1 1 140px",
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {rProps && (
          <div style={{ flexShrink: 0 }}>
            <svg width={44} height={44} viewBox={viewBoxStr}>
              <circle cx={22} cy={22} r={rProps.radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
              <motion.circle
                cx={22}
                cy={22}
                r={rProps.radius}
                fill="none"
                stroke={ringColor}
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={rProps.circumference}
                initial={{ strokeDashoffset: rProps.circumference }}
                animate={{ strokeDashoffset: rProps.strokeDashoffset }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                style={{ transformOrigin: "22px 22px", transform: "rotate(-90deg)" }}
              />
            </svg>
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: accent || "#06b6d4", fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
            {value}
          </div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>{label}</div>
          {sub && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Today + streak hero row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        {statCard(
          "Study time today",
          fmtSeconds(todaySeconds),
          todaySeconds === 0 ? "No sessions yet" : null,
          "#a78bfa",
          undefined
        )}
        {statCard(
          "Weekly progress",
          fmtSeconds(weekSeconds),
          weekPct + "% of 5h goal",
          "#06b6d4",
          weekPct
        )}
        {statCard(
          "Study streak",
          streak + "d",
          streak > 0 ? "Keep it up!" : "Start today",
          "#f59e0b",
          undefined
        )}
        {statCard(
          "7-day retention",
          retention7 !== null ? retention7 + "%" : "—",
          retention7 !== null ? (retention7 >= 75 ? "Great recall" : "Keep reviewing") : "No reviews yet",
          retention7 !== null && retention7 >= 75 ? "#10b981" : "#f59e0b",
          retention7 !== null ? retention7 : undefined
        )}
      </div>

      {/* Secondary stats row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {statCard("Total cards", totalCards, totalReviews + " total reviews", "#6366f1")}
        {statCard("Consistency", consistency + "/7 days", "this week", "#ec4899")}
        {bestDay
          ? statCard("Best study day", fmtSeconds(bestDay.seconds), fmtDate(bestDay.dateStr), "#34d399")
          : statCard("Best study day", "—", "No sessions yet", "#475569")
        }
      </div>
    </div>
  );
}

// ─── Focus Leaderboard (solo) ─────────────────────────────────────────────────

function FocusLeaderboard({ sessions }) {
  const today = todayStr();
  const thisWeekSecs = useMemo(() => calcStudyTimeForWeek(sessions, today), [sessions, today]);

  // Last week — go back 7 days from start of this week
  const lastWeekRef = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toLocaleDateString("en-CA");
  }, []);
  const lastWeekSecs = useMemo(
    () => calcStudyTimeForWeek(sessions, lastWeekRef),
    [sessions, lastWeekRef]
  );

  const bestDay = useMemo(() => calcBestStudyDay(sessions), [sessions]);
  const consistency = useMemo(() => calcStudyConsistency7Days(sessions), [sessions]);

  if (sessions.length === 0) return null;

  const weekDelta = thisWeekSecs - lastWeekSecs;
  const deltaLabel = weekDelta > 0
    ? "+" + fmtSeconds(weekDelta) + " vs last week"
    : weekDelta < 0
    ? fmtSeconds(Math.abs(weekDelta)) + " less than last week"
    : "Same as last week";
  const deltaColor = weekDelta >= 0 ? "#10b981" : "#f87171";

  return (
    <div
      style={{
        background: "#0f1117",
        border: "1px solid #1e2030",
        borderRadius: 14,
        padding: "16px",
        marginBottom: 24,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
        Personal Records
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {bestDay && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Best study day</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fde68a" }}>
              {fmtSeconds(bestDay.seconds)} on {fmtDate(bestDay.dateStr)}
            </span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>This week vs last week</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: deltaColor }}>{deltaLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>Consistency</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
            {consistency}/7 days this week
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>This week total</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#06b6d4" }}>{fmtSeconds(thisWeekSecs)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Deck Progress Ring ───────────────────────────────────────────────────────

function DeckProgressRing({ deck, sessions }) {
  const today = todayStr();
  const dueCount = deck.cards.filter((c) => !c.dueDate || c.dueDate <= today).length;
  const totalCards = deck.cards.length;
  const masteredCards = deck.cards.filter((c) => c.reviews >= 3 && (c.lastGrade || 0) >= 4).length;
  const masterPct = totalCards > 0 ? masteredCards / totalCards : 0;

  const deckSessions = sessions.filter((s) => s.deckId === deck.id);
  const weekSeconds = useMemo(
    () => calcStudyTimeForWeek(deckSessions, today),
    [deckSessions, today]
  );

  const ring = useMemo(
    () => calcSvgRingProps(masterPct, 48, 5),
    [masterPct]
  );
  const viewBoxStr = "0 0 48 48";
  const ringColor = deck.color || "#6366f1";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={48} height={48} viewBox={viewBoxStr}>
          <circle cx={24} cy={24} r={ring.radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
          <motion.circle
            cx={24}
            cy={24}
            r={ring.radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={ring.circumference}
            initial={{ strokeDashoffset: ring.circumference }}
            animate={{ strokeDashoffset: ring.strokeDashoffset }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{ transformOrigin: "24px 24px", transform: "rotate(-90deg)" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            color: ringColor,
          }}
        >
          {Math.round(masterPct * 100)}%
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {deck.emoji} {deck.name}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
          {masteredCards}/{totalCards} mastered
          {dueCount > 0 && (
            <span style={{ color: "#ef4444", marginLeft: 6, fontWeight: 700 }}>{dueCount} due</span>
          )}
        </div>
        {weekSeconds > 0 && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
            {fmtSeconds(weekSeconds)} this week
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Subject Progress Panel ───────────────────────────────────────────────────

function SubjectProgress({ decks, sessions }) {
  if (decks.length === 0) return null;

  return (
    <div
      style={{
        background: "#0f1117",
        border: "1px solid #1e2030",
        borderRadius: 14,
        padding: "16px",
        marginBottom: 24,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
        Subject Progress
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {decks.map((deck) => (
          <DeckProgressRing key={deck.id} deck={deck} sessions={sessions} />
        ))}
      </div>
    </div>
  );
}

// ─── Deck Card ────────────────────────────────────────────────────────────────

function DeckCard({ deck, onStudy, onManage }) {
  const today = todayStr();
  const dueCount = deck.cards.filter((c) => !c.dueDate || c.dueDate <= today).length;
  const nextDue = useMemo(() => {
    const future = deck.cards
      .filter((c) => c.dueDate && c.dueDate > today)
      .map((c) => c.dueDate)
      .sort((a, b) => a.localeCompare(b));
    return future[0] || null;
  }, [deck.cards, today]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: "#0f1117",
        border: "1px solid " + deck.color + "44",
        borderRadius: "14px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* color bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: deck.color,
        }}
      />
      <div style={{ ...S.row, justifyContent: "space-between" }}>
        <span style={{ fontSize: "28px" }}>{deck.emoji}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {dueCount > 0 && (
            <span
              style={{
                background: "#ef4444",
                color: "#fff",
                borderRadius: "20px",
                padding: "2px 8px",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              {dueCount} due
            </span>
          )}
        </div>
      </div>
      <div>
        <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "15px" }}>
          {deck.name}
        </div>
        {deck.description && (
          <div
            style={{
              color: "#64748b",
              fontSize: "12px",
              marginTop: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {deck.description}
          </div>
        )}
      </div>
      <div style={{ color: "#64748b", fontSize: "12px" }}>
        {deck.cards.length === 0
          ? "No cards yet — add some!"
          : deck.cards.length + " card" + (deck.cards.length !== 1 ? "s" : "") + " · " + (deck.lastStudied ? "Last: " + fmtDate(deck.lastStudied) : "Not studied yet")}
      </div>
      {/* Next review hint */}
      {dueCount === 0 && nextDue && (
        <div style={{ fontSize: 11, color: "#475569" }}>
          Next review: {fmtDate(nextDue)}
        </div>
      )}
      <div style={{ ...S.row, gap: "6px", marginTop: "4px" }}>
        <button
          onClick={() => deck.cards.length > 0 && onStudy(deck)}
          disabled={deck.cards.length === 0}
          title={deck.cards.length === 0 ? "Add cards to this deck before studying" : undefined}
          style={{
            ...S.btn("primary"),
            flex: 1,
            opacity: deck.cards.length === 0 ? 0.4 : 1,
            cursor: deck.cards.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Study Now
        </button>
        <button
          onClick={() => onManage(deck)}
          style={{ ...S.btn("secondary"), padding: "8px 12px" }}
        >
          ⚙️
        </button>
      </div>
    </motion.div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatsRow({ decks, sessions }) {
  const today = todayStr();
  const totalCards = decks.reduce((sum, d) => sum + d.cards.length, 0);
  const dueToday = decks.reduce(
    (sum, d) => sum + d.cards.filter((c) => !c.dueDate || c.dueDate <= today).length,
    0
  );
  const streak = calcStreak(sessions);

  const stat = (label, value, accent) => (
    <div
      style={{
        background: "#0f1117",
        border: "1px solid #1e2030",
        borderRadius: "10px",
        padding: "12px 16px",
        flex: 1,
        minWidth: "0",
      }}
    >
      <div
        style={{
          color: accent || "#06b6d4",
          fontSize: "22px",
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
        {label}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {stat("Decks", decks.length)}
      {stat("Cards", totalCards)}
      {stat("Due Today", dueToday, dueToday > 0 ? "#ef4444" : "#06b6d4")}
      {stat("Streak", streak + "d", "#f59e0b")}
    </div>
  );
}

// ─── Deck Modal ───────────────────────────────────────────────────────────────

function DeckModal({ deck, onSave, onDelete, onClose }) {
  const [name, setName] = useState(deck.name);
  const [emoji, setEmoji] = useState(deck.emoji);
  const [color, setColor] = useState(deck.color);
  const [desc, setDesc] = useState(deck.description || "");

  function handleSave() {
    if (!name.trim()) return;
    onSave({ ...deck, name: name.trim(), emoji, color, description: desc });
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <motion.div
        style={S.modal}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: "#e2e8f0", margin: "0 0 20px", fontSize: "18px" }}>
          {deck.id ? "Edit Deck" : "New Deck"}
        </h2>

        <div style={{ marginBottom: "16px" }}>
          <label style={S.label}>Name</label>
          <input
            style={S.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spanish Vocabulary"
            autoFocus
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={S.label}>Description (optional)</label>
          <input
            style={S.input}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Short description..."
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={S.label}>Emoji</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                style={{
                  width: "36px",
                  height: "36px",
                  fontSize: "18px",
                  borderRadius: "8px",
                  border: emoji === e ? "2px solid #06b6d4" : "2px solid #1e2030",
                  background: emoji === e ? "#06b6d422" : "#08090d",
                  cursor: "pointer",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={S.label}>Color</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: c,
                  border: color === c ? "3px solid #fff" : "3px solid transparent",
                  cursor: "pointer",
                  outline: color === c ? "2px solid " + c : "none",
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ ...S.row, justifyContent: "space-between" }}>
          <div style={S.row}>
            {deck.id && (
              <button style={S.btn("danger")} onClick={() => onDelete(deck.id)}>
                Delete
              </button>
            )}
          </div>
          <div style={S.row}>
            <button style={S.btn("ghost")} onClick={onClose}>
              Cancel
            </button>
            <button style={S.btn("primary")} onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Card Editor ──────────────────────────────────────────────────────────────

function CardEditor({ deck, onUpdate, onBack }) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [bulk, setBulk] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const backRef = useRef(null);

  function addCard() {
    if (!front.trim() || !back.trim()) return;
    const card = defaultCard(front.trim(), back.trim());
    onUpdate({ ...deck, cards: [...deck.cards, card] });
    setFront("");
    setBack("");
  }

  function deleteCard(id) {
    onUpdate({ ...deck, cards: deck.cards.filter((c) => c.id !== id) });
  }

  function importBulk() {
    const lines = bulk.split("\n").filter((l) => l.includes("|"));
    const newCards = lines.map((line) => {
      const [f, b] = line.split("|");
      return defaultCard(f.trim(), b.trim());
    });
    if (newCards.length === 0) return;
    onUpdate({ ...deck, cards: [...deck.cards, ...newCards] });
    setBulk("");
    setShowBulk(false);
  }

  return (
    <div>
      <div style={{ ...S.row, marginBottom: "20px" }}>
        <button style={S.btn("ghost")} onClick={onBack}>
          Back
        </button>
        <h2 style={{ color: "#e2e8f0", margin: 0, fontSize: "18px", flex: 1 }}>
          {deck.emoji} {deck.name} — Cards
        </h2>
        <span style={{ color: "#64748b", fontSize: "13px" }}>
          {deck.cards.length} cards
        </span>
      </div>

      {/* Add card inline */}
      <div
        style={{
          background: "#0f1117",
          border: "1px solid #1e2030",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 600, marginBottom: "10px" }}>
          + ADD CARD
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            style={{ ...S.input, flex: 1, minWidth: "140px" }}
            placeholder="Front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Tab") { e.preventDefault(); backRef.current?.focus(); }
              if (e.key === "Enter") backRef.current?.focus();
            }}
          />
          <input
            ref={backRef}
            style={{ ...S.input, flex: 1, minWidth: "140px" }}
            placeholder="Back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCard(); }}
          />
          <button style={S.btn("primary")} onClick={addCard}>
            Add
          </button>
        </div>
      </div>

      {/* Bulk import toggle */}
      <div style={{ marginBottom: "16px" }}>
        <button
          style={{ ...S.btn("ghost"), fontSize: "12px", padding: "6px 10px" }}
          onClick={() => setShowBulk(!showBulk)}
        >
          {showBulk ? "Hide Bulk Import" : "Bulk Import"}
        </button>
        <AnimatePresence>
          {showBulk && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  background: "#0f1117",
                  border: "1px solid #1e2030",
                  borderRadius: "12px",
                  padding: "16px",
                  marginTop: "8px",
                }}
              >
                <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "8px" }}>
                  One card per line: <code style={{ color: "#06b6d4" }}>front | back</code>
                </div>
                <textarea
                  style={{ ...S.input, minHeight: "100px", resize: "vertical", fontFamily: "monospace" }}
                  placeholder={"hola | hello\nadiós | goodbye\ngracias | thank you"}
                  value={bulk}
                  onChange={(e) => setBulk(e.target.value)}
                />
                <button
                  style={{ ...S.btn("primary"), marginTop: "10px" }}
                  onClick={importBulk}
                >
                  Import Cards
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card list */}
      {deck.cards.length === 0 ? (
        <div
          style={{
            color: "#475569",
            textAlign: "center",
            padding: "32px",
            border: "1px dashed #1e2030",
            borderRadius: "12px",
          }}
        >
          No cards yet. Add some above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {deck.cards.map((card) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              style={{
                background: "#0f1117",
                border: "1px solid #1e2030",
                borderRadius: "10px",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div style={{ flex: 1, color: "#e2e8f0", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {card.front}
              </div>
              <div style={{ color: "#475569", fontSize: "12px" }}>|</div>
              <div style={{ flex: 1, color: "#94a3b8", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {card.back}
              </div>
              <div style={{ color: "#475569", fontSize: "11px", minWidth: "60px", textAlign: "right" }}>
                {!card.dueDate || card.dueDate <= todayStr() ? (
                  <span style={{ color: "#f59e0b" }}>Due</span>
                ) : (
                  fmtDate(card.dueDate)
                )}
              </div>
              <button
                onClick={() => deleteCard(card.id)}
                style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "14px", padding: "2px 4px", borderRadius: "4px" }}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Flashcard flip view ──────────────────────────────────────────────────────

function FlashCard({ card, flipped, onFlip }) {
  return (
    <div
      style={{
        perspective: "1000px",
        width: "100%",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      <motion.div
        style={{
          position: "relative",
          width: "100%",
          minHeight: "220px",
          transformStyle: "preserve-3d",
        }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
      >
        {/* Front */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(99,102,241,0.10))",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(6,182,212,0.3)",
            borderRadius: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            minHeight: "220px",
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "16px",
            }}
          >
            Front
          </div>
          <div
            style={{
              color: "#f1f5f9",
              fontSize: "clamp(24px, 5vw, 48px)",
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {card.front}
          </div>
          <div style={{ color: "#475569", fontSize: "12px", marginTop: "20px" }}>
            Tap to flip
          </div>
        </div>

        {/* Back */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.10))",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(99,102,241,0.35)",
            borderRadius: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            minHeight: "220px",
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "16px",
            }}
          >
            Back
          </div>
          <div
            style={{
              color: "#f1f5f9",
              fontSize: "clamp(24px, 5vw, 48px)",
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {card.back}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Grade Buttons ────────────────────────────────────────────────────────────

const GRADES = [
  { grade: 0, label: "Again", emoji: "😫", color: "#ef4444", desc: "Forgot" },
  { grade: 3, label: "Hard",  emoji: "😐", color: "#64748b", desc: "Recalled with effort" },
  { grade: 4, label: "Good",  emoji: "🙂", color: "#10b981", desc: "Recalled" },
  { grade: 5, label: "Easy",  emoji: "😄", color: "#06b6d4", desc: "Perfect recall" },
];

function GradeButtons({ onGrade }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "20px" }}>
      {GRADES.map(({ grade, label, emoji, color, desc }) => (
        <motion.button
          key={grade}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onGrade(grade)}
          style={{
            background: color + "22",
            border: "1px solid " + color + "66",
            borderRadius: "10px",
            color: color,
            fontWeight: 700,
            fontSize: "12px",
            padding: "10px 4px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
          }}
        >
          <span style={{ fontSize: "18px" }}>{emoji}</span>
          <span>{label}</span>
          <span style={{ opacity: 0.6, fontSize: "10px" }}>{desc}</span>
        </motion.button>
      ))}
    </div>
  );
}

// ─── Session Timer ────────────────────────────────────────────────────────────

function useSessionTimer() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const pausedRef = useRef(0);
  const pauseStartRef = useRef(null);

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        pauseStartRef.current = Date.now();
      } else {
        if (pauseStartRef.current) {
          pausedRef.current += Date.now() - pauseStartRef.current;
          pauseStartRef.current = null;
        }
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(() => {
      if (!document.hidden) {
        const activeMs = Date.now() - startRef.current - pausedRef.current;
        setElapsed(Math.floor(activeMs / 1000));
      }
    }, 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, []);

  return elapsed;
}

// ─── Study Session View ───────────────────────────────────────────────────────

function StudySession({ deck, onFinish, onBack }) {
  const today = todayStr();
  const dueCards = useMemo(
    () => deck.cards.filter((c) => !c.dueDate || c.dueDate <= today),
    []
  );

  const nextDueDate = useMemo(() => {
    if (dueCards.length > 0) return null;
    const future = deck.cards
      .filter((c) => c.dueDate && c.dueDate > today)
      .map((c) => c.dueDate)
      .sort((a, b) => a.localeCompare(b));
    return future.length > 0 ? future[0] : null;
  }, [dueCards.length, deck.cards, today]);

  const [queue, setQueue] = useState(() => [...dueCards]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const elapsed = useSessionTimer();

  // Due count banner
  const dueCountDisplay = dueCards.length;

  if (dueCards.length === 0) {
    return (
      <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center", padding: "48px 16px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
        <h2 style={{ color: "#e2e8f0", margin: "0 0 8px", fontSize: "20px" }}>No cards due today!</h2>
        {nextDueDate && (
          <p style={{ color: "#64748b", margin: "0 0 24px", fontSize: "14px" }}>
            Next cards due: {fmtDate(nextDueDate)}
          </p>
        )}
        <button style={S.btn("ghost")} onClick={onBack}>Back to Decks</button>
      </div>
    );
  }

  function handleGrade(grade) {
    if (graded) return;
    setGraded(true);
    const card = queue[current];
    const updated = sm2(card, grade);
    setResults((prev) => [...prev, { grade, cardId: card.id }]);

    const newQueue = [...queue];
    newQueue[current] = updated;
    setQueue(newQueue);

    if (current + 1 >= queue.length) {
      setDone(true);
      const cardMap = {};
      newQueue.forEach((c) => (cardMap[c.id] = c));
      const updatedCards = deck.cards.map((c) => cardMap[c.id] || c);
      const updatedDeck = {
        ...deck,
        cards: updatedCards,
        totalReviews: (deck.totalReviews || 0) + newQueue.length,
        lastStudied: today,
      };
      const session = {
        id: uid(),
        deckId: deck.id,
        deckName: deck.name,
        date: today,
        cardsReviewed: newQueue.length,
        correct: [...results, { grade }].filter((r) => r.grade >= 3).length,
        duration: Math.max(1, elapsed),
      };
      onFinish(updatedDeck, session);
    } else {
      setTimeout(() => {
        setCurrent((c) => c + 1);
        setFlipped(false);
        setGraded(false);
      }, 400);
    }
  }

  if (done) return null;

  const card = queue[current];
  const progress = current / queue.length;

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ ...S.row, marginBottom: "20px", justifyContent: "space-between" }}>
        <button style={S.btn("ghost")} onClick={onBack}>
          Exit
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ color: "#94a3b8", fontSize: "13px", fontWeight: 600 }}>
            {deck.emoji} {deck.name}
          </div>
          {/* Due count display */}
          <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginTop: 2 }}>
            {dueCountDisplay} card{dueCountDisplay !== 1 ? "s" : ""} due today
          </div>
        </div>
        <div style={{ color: "#06b6d4", fontSize: "13px", fontFamily: "monospace", fontWeight: 700 }}>
          {fmtDuration(elapsed)}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "#1e2030", borderRadius: "4px", height: "6px", marginBottom: "24px", overflow: "hidden" }}>
        <motion.div
          style={{ height: "100%", background: "#06b6d4", borderRadius: "4px" }}
          animate={{ width: (progress * 100) + "%" }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div style={{ color: "#64748b", fontSize: "13px", textAlign: "center", marginBottom: "16px" }}>
        Card {current + 1} of {queue.length}
      </div>

      {/* Flashcard */}
      <div onClick={() => !flipped && setFlipped(true)}>
        <FlashCard card={card} flipped={flipped} onFlip={() => setFlipped(true)} />
      </div>

      {/* Grade buttons */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <GradeButtons onGrade={handleGrade} />
          </motion.div>
        )}
      </AnimatePresence>

      {!flipped && (
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <button
            style={{ ...S.btn("primary"), padding: "12px 32px", fontSize: "15px" }}
            onClick={(e) => { e.stopPropagation(); setFlipped(true); }}
          >
            Flip Card
          </button>
        </div>
      )}

      {flipped && graded && (
        <div style={{ textAlign: "center", marginTop: "16px", color: "#10b981", fontWeight: 600, fontSize: "14px" }}>
          Graded
        </div>
      )}
    </div>
  );
}

// ─── Session Summary ──────────────────────────────────────────────────────────

function SessionSummary({ session, onBack }) {
  const pct = session.cardsReviewed > 0
    ? Math.round((session.correct / session.cardsReviewed) * 100)
    : 0;
  const minutes = Math.max(1, Math.round(session.duration / 60));

  // "Next review in X days" hint (simple SRS scoring)
  const avgInterval = session.cardsReviewed > 0
    ? Math.max(1, Math.round(pct / 20)) // rough SRS estimate: 0% = 1 day, 100% = 5 days
    : 1;

  function motivational() {
    if (pct >= 90) return "Outstanding! You're crushing it!";
    if (pct >= 75) return "Great work! Keep up the momentum!";
    if (pct >= 50) return "Good effort! Review the tricky ones again.";
    return "Keep practicing — repetition builds mastery!";
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ maxWidth: "440px", margin: "0 auto", textAlign: "center" }}
    >
      <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
      <h2 style={{ color: "#e2e8f0", margin: "0 0 8px", fontSize: "22px" }}>
        Session Complete!
      </h2>
      <p style={{ color: "#64748b", margin: "0 0 28px" }}>{motivational()}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Cards Reviewed", value: session.cardsReviewed, color: "#06b6d4" },
          { label: "Correct", value: pct + "%", color: pct >= 75 ? "#10b981" : "#f59e0b" },
          { label: "Time", value: minutes + "m", color: "#8b5cf6" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: "#0f1117",
              border: "1px solid #1e2030",
              borderRadius: "12px",
              padding: "16px 8px",
            }}
          >
            <div style={{ color, fontSize: "26px", fontWeight: 800 }}>{value}</div>
            <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Next review hint */}
      <div
        style={{
          background: "rgba(6,182,212,0.08)",
          border: "1px solid rgba(6,182,212,0.2)",
          borderRadius: 10,
          padding: "10px 16px",
          marginBottom: 24,
          fontSize: 13,
          color: "#94a3b8",
        }}
      >
        Next review in approximately{" "}
        <span style={{ color: "#06b6d4", fontWeight: 700 }}>{avgInterval} day{avgInterval !== 1 ? "s" : ""}</span>
      </div>

      <button style={{ ...S.btn("primary"), padding: "12px 32px", fontSize: "15px" }} onClick={onBack}>
        Back to Decks
      </button>
    </motion.div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export default function StudyModeTab({ data, onChange }) {
  const d = ensureDefaults(data || {});
  const [view, setView] = useState("home"); // home | cards | study | summary | timer
  const [activeDeck, setActiveDeck] = useState(null);
  const [deckModal, setDeckModal] = useState(null);
  const [lastSession, setLastSession] = useState(null);

  function save(updates) {
    onChange(prev => ({ ...ensureDefaults(prev || {}), ...updates }));
  }

  // ── Deck CRUD ──

  function openNewDeck() {
    setDeckModal(defaultDeck());
  }

  function openEditDeck(deck) {
    setDeckModal({ ...deck });
  }

  function saveDeck(deck) {
    const exists = d.flashcardDecks.find((x) => x.id === deck.id);
    const newDecks = exists
      ? d.flashcardDecks.map((x) => (x.id === deck.id ? deck : x))
      : [...d.flashcardDecks, deck];
    save({ flashcardDecks: newDecks });
    setDeckModal(null);
  }

  function deleteDeck(id) {
    save({ flashcardDecks: d.flashcardDecks.filter((x) => x.id !== id) });
    setDeckModal(null);
  }

  // ── Card management ──

  function openManage(deck) {
    setActiveDeck(deck);
    setView("cards");
  }

  function updateDeckCards(updated) {
    const newDecks = d.flashcardDecks.map((x) => x.id === updated.id ? updated : x);
    save({ flashcardDecks: newDecks });
    setActiveDeck(updated);
  }

  // ── Study session ──

  function startStudy(deck) {
    setActiveDeck(deck);
    setView("study");
  }

  function finishSession(updatedDeck, session) {
    const newDecks = d.flashcardDecks.map((x) => x.id === updatedDeck.id ? updatedDeck : x);
    save({
      flashcardDecks: newDecks,
      studySessions: [...d.studySessions, session],
    });
    setLastSession(session);
    setView("summary");
  }

  function backToDecks() {
    setView("home");
    setActiveDeck(null);
    setLastSession(null);
  }

  // Total due across all decks
  const today = todayStr();
  const totalDue = d.flashcardDecks.reduce(
    (sum, deck) => sum + deck.cards.filter((c) => !c.dueDate || c.dueDate <= today).length,
    0
  );

  // ── Render ──

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <AnimatePresence mode="wait">
        {/* HOME */}
        {view === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Title row */}
            <div style={{ ...S.row, justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h1 style={{ color: "#e2e8f0", margin: 0, fontSize: "22px", fontWeight: 800 }}>
                  Study Mode
                </h1>
                <div style={{ color: "#64748b", fontSize: "13px", marginTop: "2px" }}>
                  Spaced repetition · Pomodoro focus · Progress tracking
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{ ...S.btn("secondary"), fontSize: 13 }}
                  onClick={() => setView("timer")}
                >
                  Pomodoro Timer
                </button>
                <button style={S.btn("primary")} onClick={openNewDeck}>
                  + New Deck
                </button>
              </div>
            </div>

            {/* Due today banner */}
            {totalDue > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <span style={{ color: "#f87171", fontWeight: 700, fontSize: 15 }}>
                    {totalDue} card{totalDue !== 1 ? "s" : ""} due today
                  </span>
                  <span style={{ color: "#64748b", fontSize: 13, marginLeft: 8 }}>
                    across {d.flashcardDecks.filter((dk) => dk.cards.some((c) => !c.dueDate || c.dueDate <= today)).length} deck{d.flashcardDecks.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const firstDue = d.flashcardDecks.find((dk) => dk.cards.some((c) => !c.dueDate || c.dueDate <= today));
                    if (firstDue) startStudy(firstDue);
                  }}
                  style={{ ...S.btn("primary"), fontSize: 13, whiteSpace: "nowrap" }}
                >
                  Start Reviewing
                </button>
              </motion.div>
            )}

            {/* Study Stats Dashboard */}
            <StudyStatsDashboard decks={d.flashcardDecks} sessions={d.studySessions} />

            {/* Deck grid */}
            {d.flashcardDecks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  border: "1px dashed #1e2030",
                  borderRadius: "16px",
                  padding: "48px",
                  textAlign: "center",
                  color: "#475569",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📚</div>
                <div style={{ fontSize: "16px", marginBottom: "6px" }}>No decks yet</div>
                <div style={{ fontSize: "13px", marginBottom: "20px" }}>
                  Create your first flashcard deck to get started
                </div>
                <button style={S.btn("primary")} onClick={openNewDeck}>
                  + New Deck
                </button>
              </motion.div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                  Decks
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: "14px",
                    marginBottom: 24,
                  }}
                >
                  {d.flashcardDecks.map((deck) => (
                    <DeckCard
                      key={deck.id}
                      deck={deck}
                      onStudy={startStudy}
                      onManage={openManage}
                    />
                  ))}
                </div>

                {/* Subject Progress */}
                <SubjectProgress decks={d.flashcardDecks} sessions={d.studySessions} />

                {/* Focus Leaderboard */}
                <FocusLeaderboard sessions={d.studySessions} />
              </>
            )}
          </motion.div>
        )}

        {/* POMODORO TIMER */}
        {view === "timer" && (
          <motion.div
            key="timer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div style={{ ...S.row, marginBottom: 24 }}>
              <button style={S.btn("ghost")} onClick={backToDecks}>
                Back
              </button>
              <h2 style={{ color: "#e2e8f0", margin: 0, fontSize: 20, fontWeight: 800, flex: 1 }}>
                Pomodoro Timer
              </h2>
            </div>
            <PomodoroTimer onSessionComplete={() => {}} />
          </motion.div>
        )}

        {/* CARD EDITOR */}
        {view === "cards" && activeDeck && (
          <motion.div
            key="cards"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CardEditor
              deck={d.flashcardDecks.find((x) => x.id === activeDeck.id) || activeDeck}
              onUpdate={updateDeckCards}
              onBack={backToDecks}
            />
          </motion.div>
        )}

        {/* STUDY SESSION */}
        {view === "study" && activeDeck && (
          <motion.div
            key="study"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <StudySession
              deck={d.flashcardDecks.find((x) => x.id === activeDeck.id) || activeDeck}
              onFinish={finishSession}
              onBack={backToDecks}
            />
          </motion.div>
        )}

        {/* SESSION SUMMARY */}
        {view === "summary" && lastSession && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <SessionSummary session={lastSession} onBack={backToDecks} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deck modal */}
      <AnimatePresence>
        {deckModal && (
          <DeckModal
            deck={deckModal}
            onSave={saveDeck}
            onDelete={deleteDeck}
            onClose={() => setDeckModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Dashboard Widget ─────────────────────────────────────────────────────────

export function StudyDashWidget({ data, onNavigate }) {
  const d = ensureDefaults(data || {});
  const today = todayStr();

  const dueToday = d.flashcardDecks.reduce(
    (sum, deck) => sum + deck.cards.filter((c) => !c.dueDate || c.dueDate <= today).length,
    0
  );

  const lastSession = d.studySessions.length > 0
    ? d.studySessions[d.studySessions.length - 1]
    : null;

  const lastPct = lastSession && lastSession.cardsReviewed > 0
    ? Math.round((lastSession.correct / lastSession.cardsReviewed) * 100)
    : null;

  return (
    <div
      style={{
        background: "#0f1117",
        border: "1px solid #1e2030",
        borderRadius: "14px",
        padding: "16px",
        cursor: "pointer",
      }}
      onClick={onNavigate}
    >
      <div style={{ ...S.row, justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Study
        </div>
        <div style={{ color: "#06b6d4", fontSize: "11px", fontWeight: 600 }}>
          Study Now
        </div>
      </div>

      {d.flashcardDecks.length === 0 ? (
        <div style={{ color: "rgba(148,163,184,0.6)", fontSize: "13px", lineHeight: 1.5 }}>
          Build flashcard decks and study with spaced repetition.
        </div>
      ) : (
        <>
          <div
            style={{
              color: dueToday > 0 ? "#ef4444" : "#06b6d4",
              fontSize: "36px",
              fontWeight: 800,
              lineHeight: 1,
              marginBottom: "4px",
            }}
          >
            {dueToday}
          </div>
          <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "12px" }}>
            cards due today
          </div>

          {lastSession && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#08090d",
                borderRadius: "8px",
                padding: "8px 10px",
              }}
            >
              <div style={{ color: "#475569", fontSize: "11px" }}>
                Last session: {lastSession.deckName}
              </div>
              {lastPct !== null && (
                <div style={{ color: lastPct >= 75 ? "#10b981" : "#f59e0b", fontSize: "12px", fontWeight: 700 }}>
                  {lastPct}%
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
