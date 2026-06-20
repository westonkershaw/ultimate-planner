/* eslint-disable */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  calcHabitHeatmapCells,
  calcHabitWeeklyBars,
  calcHabitBestStreak,
  calcDailyChallengeScore,
  calcMaxDailyScore,
  calcPerfectDays,
  calcStrongestDay,
  calcLongestStreakHabit,
  calcHabitStreakMilestone,
} from "../utils/math";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);
const localDate = (d = new Date()) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD local
const todayKey = () => localDate();

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(localDate(d));
  }
  return days;
}

function getScheduledDaysThisWeek(habit) {
  const days7 = getLast7Days();
  return days7.filter((dateStr) => isScheduledDay(habit, dateStr));
}

function isScheduledDay(habit, dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d.getDay()];
  const weekday = d.getDay(); // 0=Sun
  switch (habit.frequency) {
    case "daily": return true;
    case "weekdays": return weekday >= 1 && weekday <= 5;
    case "weekends": return weekday === 0 || weekday === 6;
    case "weekly": {
      // only the most recent Monday of the rolling 7-day window counts
      const today = todayKey();
      if (dateStr !== today) return false;
      return true;
    }
    case "custom":
      return habit.customDays.includes(dayName);
    default: return true;
  }
}

function calcStreak(habit) {
  const logs = habit.logs || {};
  if (Object.keys(logs).length === 0) return 0;
  let streak = 0;
  const d = new Date();
  const today = todayKey();
  // If today is not logged, start walking from yesterday
  if (!logs[today]) {
    d.setDate(d.getDate() - 1);
  }
  let safety = 0;
  while (safety < 3650) {
    safety++;
    const key = localDate(d);
    if (isScheduledDay(habit, key)) {
      if (logs[key]) {
        streak++;
      } else {
        break;
      }
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function completionRateToday(habits) {
  const today = todayKey();
  const scheduled = habits.filter((h) => !h.archived && isScheduledDay(h, today));
  if (scheduled.length === 0) return { done: 0, total: 0 };
  const done = scheduled.filter((h) => (h.logs || {})[today]).length;
  return { done, total: scheduled.length };
}

function habitScoreThisWeek(habits) {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) return 0;
  let scheduled = 0, completed = 0;
  active.forEach((h) => {
    const days = getScheduledDaysThisWeek(h);
    scheduled += days.length;
    completed += days.filter((d) => (h.logs || {})[d]).length;
  });
  if (scheduled === 0) return 0;
  return Math.round((completed / scheduled) * 100);
}

function totalCompletionsThisWeek(habits) {
  const days7 = getLast7Days();
  let count = 0;
  habits.filter((h) => !h.archived).forEach((h) => {
    days7.forEach((d) => { if ((h.logs || {})[d]) count++; });
  });
  return count;
}

function bestCurrentStreak(habits) {
  return habits
    .filter((h) => !h.archived)
    .reduce((max, h) => Math.max(max, calcStreak(h)), 0);
}

// Returns the length of the most recent consecutive run that ended before today
function getLastStreak(habit) {
  const logs = habit.logs || {};
  const today = new Date();
  let count = 0;
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDate(d);
    if ((logs[key] || 0) > 0 || logs[key] === true) count++;
    else if (count > 0) break;
  }
  return count;
}

// Returns true if the habit was logged yesterday but not today
function isStreakAtRisk(habit) {
  const logs = habit.logs || {};
  const today = todayKey();
  if (logs[today]) return false; // already logged today — not at risk
  const yesterday = localDate(new Date(new Date().setDate(new Date().getDate() - 1)));
  return !!(logs[yesterday] || 0) || logs[yesterday] === true;
}

// Returns true if any log entry in the last 14 days has a truthy value
function hadRecentActivity(habit) {
  const logs = habit.logs || {};
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDate(d);
    if (logs[key]) return true;
  }
  return false;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EMOJI_OPTIONS = ["📚","🏃","🧘","💧","✍️","🎸","🥗","🏋️","😴","🌱","🧠","💊","📵","🚶","🎯","💬","🎨","🍎","☕","🙏"];

const COLOR_OPTIONS = [
  "#6366f1","#f97316","#22c55e","#ef4444",
  "#ec4899","#14b8a6","#f59e0b","#8b5cf6",
];

const CATEGORIES = [
  "health","intellectual","mindset","productivity","social","other",
];

const FREQUENCY_OPTIONS = ["daily","weekdays","weekends","weekly","custom"];
const FREQ_LABELS = { daily:"Daily", weekdays:"Weekdays", weekends:"Weekends", weekly:"Weekly", custom:"Custom" };
const WEEKDAYS_LIST = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const UNIT_OPTIONS = ["times","minutes","pages","oz","steps"];

const TEMPLATES = [
  { name:"Read 30 min",           emoji:"📚", color:"#6366f1", frequency:"daily",    category:"intellectual", target:30, unit:"minutes" },
  { name:"Exercise",              emoji:"🏃", color:"#f97316", frequency:"daily",    category:"health",       target:1,  unit:"times"   },
  { name:"Meditate 10 min",       emoji:"🧘", color:"#8b5cf6", frequency:"daily",    category:"mindset",      target:10, unit:"minutes" },
  { name:"Drink 8 glasses water", emoji:"💧", color:"#14b8a6", frequency:"daily",    category:"health",       target:8,  unit:"times"   },
  { name:"Journal",               emoji:"✍️", color:"#f59e0b", frequency:"daily",    category:"mindset",      target:1,  unit:"times"   },
  { name:"Sleep by 10pm",         emoji:"😴", color:"#8b5cf6", frequency:"daily",    category:"health",       target:1,  unit:"times"   },
  { name:"No phone before 9am",   emoji:"📵", color:"#ef4444", frequency:"weekdays", category:"mindset",      target:1,  unit:"times"   },
  { name:"Eat vegetables",        emoji:"🥗", color:"#22c55e", frequency:"daily",    category:"health",       target:1,  unit:"times"   },
  { name:"Call family/friend",    emoji:"💬", color:"#ec4899", frequency:"weekly",   category:"social",       target:1,  unit:"times"   },
  { name:"Review goals",          emoji:"🎯", color:"#6366f1", frequency:"weekly",   category:"productivity", target:1,  unit:"times"   },
  { name:"Take vitamins",         emoji:"💊", color:"#22c55e", frequency:"daily",    category:"health",       target:1,  unit:"times"   },
  { name:"Learn something new",   emoji:"🌱", color:"#14b8a6", frequency:"daily",    category:"intellectual", target:1,  unit:"times"   },
];

const HABIT_TEMPLATES = [
  // Health
  { name: "Morning Workout", category: "physical", unit: "times", weeklyGoal: 4, emoji: "💪" },
  { name: "Steps (10k)", category: "physical", unit: "steps", weeklyGoal: 7, emoji: "👟" },
  { name: "Water Intake", category: "physical", unit: "glasses", weeklyGoal: 7, emoji: "💧" },
  { name: "Meditation", category: "spiritual", unit: "mins", weeklyGoal: 7, emoji: "🧘" },
  { name: "Sleep 8 hrs", category: "physical", unit: "nights", weeklyGoal: 7, emoji: "😴" },
  { name: "No alcohol", category: "physical", unit: "days", weeklyGoal: 7, emoji: "🚫" },
  // Mind
  { name: "Read 20 pages", category: "intellectual", unit: "times", weeklyGoal: 5, emoji: "📚" },
  { name: "Journal entry", category: "intellectual", unit: "times", weeklyGoal: 5, emoji: "✍️" },
  { name: "Learn something new", category: "intellectual", unit: "times", weeklyGoal: 3, emoji: "🧠" },
  { name: "No social media", category: "intellectual", unit: "days", weeklyGoal: 5, emoji: "📵" },
  // Finance
  { name: "Track expenses", category: "financial", unit: "times", weeklyGoal: 7, emoji: "💰" },
  { name: "No impulse buys", category: "financial", unit: "days", weeklyGoal: 7, emoji: "🛑" },
  { name: "Review budget", category: "financial", unit: "times", weeklyGoal: 1, emoji: "📊" },
  // Social
  { name: "Connect with someone", category: "social", unit: "times", weeklyGoal: 3, emoji: "🤝" },
  { name: "Gratitude practice", category: "social", unit: "times", weeklyGoal: 7, emoji: "🙏" },
  { name: "Family time", category: "social", unit: "times", weeklyGoal: 3, emoji: "❤️" },
  // Spiritual
  { name: "Prayer / reflection", category: "spiritual", unit: "times", weeklyGoal: 7, emoji: "🌟" },
  { name: "Nature walk", category: "spiritual", unit: "times", weeklyGoal: 3, emoji: "🌿" },
  { name: "Cold shower", category: "spiritual", unit: "times", weeklyGoal: 5, emoji: "🚿" },
  { name: "Digital detox hour", category: "spiritual", unit: "times", weeklyGoal: 3, emoji: "🔕" },
];

const HABIT_TEMPLATE_CATEGORIES = ["All", "physical", "intellectual", "financial", "social", "spiritual"];

const HABIT_TEMPLATE_COLORS = {
  physical:     "#f97316",
  intellectual: "#6366f1",
  financial:    "#22c55e",
  social:       "#ec4899",
  spiritual:    "#8b5cf6",
};

function weeklyGoalToFrequency(weeklyGoal) {
  if (weeklyGoal >= 7) return "daily";
  if (weeklyGoal >= 5) return "weekdays";
  if (weeklyGoal === 1) return "weekly";
  return "daily";
}

const BLANK_HABIT = {
  name: "",
  emoji: "📚",
  color: "#6366f1",
  frequency: "daily",
  customDays: [],
  category: "health",
  target: 1,
  unit: "times",
  reminderTime: "",
};

// ─── Difficulty system ────────────────────────────────────────────────────────

const DIFFICULTY_LEVELS = [
  { value: "easy",   label: "Easy",   color: "#22c55e", dot: "🟢", points: 1 },
  { value: "medium", label: "Medium", color: "#f59e0b", dot: "🟡", points: 2 },
  { value: "hard",   label: "Hard",   color: "#ef4444", dot: "🔴", points: 3 },
];

const DIFFICULTY_MAP = Object.fromEntries(DIFFICULTY_LEVELS.map((d) => [d.value, d]));

// ─── Quick-start stacks ───────────────────────────────────────────────────────

const QUICK_START_STACKS = [
  {
    id: "morning",
    name: "Morning Routine",
    icon: "🌅",
    color: "#f59e0b",
    description: "Start every day with intention and energy",
    habits: [
      { name: "Wake up early",   emoji: "⏰", color: "#f59e0b", frequency: "daily", category: "health",       target: 1, unit: "times", difficulty: "medium" },
      { name: "Hydrate",         emoji: "💧", color: "#14b8a6", frequency: "daily", category: "health",       target: 1, unit: "times", difficulty: "easy"   },
      { name: "Meditate",        emoji: "🧘", color: "#8b5cf6", frequency: "daily", category: "mindset",      target: 10, unit: "minutes", difficulty: "medium" },
      { name: "Exercise",        emoji: "🏃", color: "#f97316", frequency: "daily", category: "health",       target: 1, unit: "times", difficulty: "hard"   },
    ],
  },
  {
    id: "evening",
    name: "Evening Wind-down",
    icon: "🌙",
    color: "#8b5cf6",
    description: "Protect your sleep and end the day calm",
    habits: [
      { name: "No screens 1hr before bed", emoji: "📵", color: "#ef4444", frequency: "daily", category: "mindset",      target: 1, unit: "times", difficulty: "hard"   },
      { name: "Read",                      emoji: "📚", color: "#6366f1", frequency: "daily", category: "intellectual", target: 20, unit: "minutes", difficulty: "easy" },
      { name: "Gratitude journal",         emoji: "✍️", color: "#f59e0b", frequency: "daily", category: "mindset",      target: 1, unit: "times", difficulty: "easy"   },
      { name: "Sleep by 11pm",             emoji: "😴", color: "#8b5cf6", frequency: "daily", category: "health",       target: 1, unit: "times", difficulty: "medium" },
    ],
  },
  {
    id: "productivity",
    name: "Productivity Stack",
    icon: "⚡",
    color: "#6366f1",
    description: "Deep work, clear priorities, and no distractions",
    habits: [
      { name: "Deep work block",      emoji: "🎯", color: "#6366f1", frequency: "weekdays", category: "productivity", target: 90, unit: "minutes", difficulty: "hard"   },
      { name: "Review priorities",    emoji: "📋", color: "#22c55e", frequency: "daily",    category: "productivity", target: 1,  unit: "times",   difficulty: "easy"   },
      { name: "Exercise",             emoji: "🏋️", color: "#f97316", frequency: "daily",    category: "health",       target: 1,  unit: "times",   difficulty: "hard"   },
      { name: "No social media AM",   emoji: "🚫", color: "#ef4444", frequency: "weekdays", category: "mindset",      target: 1,  unit: "times",   difficulty: "medium" },
    ],
  },
  {
    id: "health",
    name: "Health Focus",
    icon: "💪",
    color: "#22c55e",
    description: "Build a rock-solid physical foundation every day",
    habits: [
      { name: "Exercise",       emoji: "🏃", color: "#f97316", frequency: "daily", category: "health", target: 1,  unit: "times",   difficulty: "hard"   },
      { name: "Healthy eating", emoji: "🥗", color: "#22c55e", frequency: "daily", category: "health", target: 1,  unit: "times",   difficulty: "medium" },
      { name: "Hydrate",        emoji: "💧", color: "#14b8a6", frequency: "daily", category: "health", target: 8,  unit: "times",   difficulty: "easy"   },
      { name: "Sleep 8 hours",  emoji: "😴", color: "#8b5cf6", frequency: "daily", category: "health", target: 1,  unit: "times",   difficulty: "medium" },
    ],
  },
];

// ─── Habit co-occurrence suggestions (for post-log "Stack it!" card) ─────────

const HABIT_PAIRINGS = [
  { triggerPattern: /medit|mindful|breath/i,       suggestion: "Journaling",          reason: "Users who meditate also journal right after" },
  { triggerPattern: /journal|write|diary/i,         suggestion: "Read",               reason: "Writing and reading reinforce each other" },
  { triggerPattern: /workout|exercise|run|gym|lift/i, suggestion: "Hydrate",          reason: "Hydration after exercise accelerates recovery" },
  { triggerPattern: /read|book|pages/i,             suggestion: "Review priorities",  reason: "Reading and planning compound your growth" },
  { triggerPattern: /wake|morning|early/i,          suggestion: "Meditate",           reason: "A calm mind sets the tone for the whole day" },
  { triggerPattern: /hydrat|water|drink/i,          suggestion: "Exercise",           reason: "Hydration and movement are a natural pair" },
  { triggerPattern: /gratitud|reflect/i,            suggestion: "Read",               reason: "Reflection followed by reading deepens insight" },
  { triggerPattern: /deep work|focus|block/i,       suggestion: "Review priorities",  reason: "Deep work is most effective with clear priorities" },
];

function getSuggestionForHabit(habit, existingHabits) {
  const pair = HABIT_PAIRINGS.find((p) => p.triggerPattern.test(habit.name));
  if (!pair) return null;
  // Don't suggest a habit the user already has
  const already = existingHabits.some(
    (h) => !h.archived && h.name.toLowerCase().includes(pair.suggestion.toLowerCase()),
  );
  if (already) return null;
  return { habitName: habit.name, suggestion: pair.suggestion, reason: pair.reason };
}

const STACK_TEMPLATES = [
  { trigger: "wake up",     action: "review your goals for 2 minutes", icon: "🌅" },
  { trigger: "morning coffee", action: "journal for 5 minutes",        icon: "☕" },
  { trigger: "lunch break", action: "take a 10-min walk",              icon: "🚶" },
  { trigger: "finish work", action: "review tomorrow's tasks",         icon: "📋" },
  { trigger: "dinner",      action: "log your habits for the day",     icon: "✅" },
  { trigger: "bedtime",     action: "reflect on 3 wins from today",    icon: "🌙" },
];

// ─── Shared styles ────────────────────────────────────────────────────────────

const S = {
  card: {
    background: "rgba(17,24,39,0.75)",
    borderRadius: 16,
    padding: "16px 20px",
    backdropFilter: "blur(12px)",
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "9px 12px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  pillBtn: (active, color) => ({
    padding: "6px 14px",
    borderRadius: 99,
    fontSize: 13,
    fontWeight: 600,
    border: active ? `1.5px solid ${color || "#6366f1"}` : "1.5px solid rgba(255,255,255,0.12)",
    background: active ? `${color || "#6366f1"}22` : "transparent",
    color: active ? color || "#6366f1" : "rgba(255,255,255,0.55)",
    cursor: "pointer",
    transition: "all 0.15s",
  }),
};

// ─── CSS keyframes injected once ──────────────────────────────────────────────

const PULSE_STYLE_ID = "habit-pulse-keyframes";
if (typeof document !== "undefined" && !document.getElementById(PULSE_STYLE_ID)) {
  const style = document.createElement("style");
  style.id = PULSE_STYLE_ID;
  style.textContent = `
    @keyframes habitPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.55); }
      50%       { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
    }
    @keyframes habitConfettiFall {
      0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(80px) rotate(720deg); opacity: 0; }
    }
    @keyframes habitConfettiWobble {
      0%, 100% { transform: translateX(0); }
      50%       { transform: translateX(6px); }
    }
    @keyframes habitInsightSlide {
      0%   { opacity: 0; transform: translateY(6px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .habit-pulse, .habit-confetti { animation: none !important; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Heat-map cell color helper ────────────────────────────────────────────────

function heatmapCellColor(pct) {
  if (pct <= 0)       return "rgba(255,255,255,0.06)";
  if (pct < 0.5)      return "rgba(99,102,241,0.3)";
  if (pct < 1)        return "rgba(99,102,241,0.6)";
  return "#34c98a"; // 100% hit — bright green
}

// ─── HabitHeatMap ─────────────────────────────────────────────────────────────

function HabitHeatMap({ habit }) {
  const logs  = habit.logs  || {};
  const target = habit.target || 1;

  const cells = useMemo(
    () => calcHabitHeatmapCells(logs, target),
    [JSON.stringify(logs), target],
  );

  // cells is row-major: 84 cells = 7 rows × 12 cols
  // Reformat into cols[12][7] for display convenience
  const cols = useMemo(() => {
    const result = [];
    for (let c = 0; c < 12; c++) {
      result.push(cells.slice(c * 7, c * 7 + 7));
    }
    return result;
  }, [cells]);

  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div
      style={{ marginTop: 12 }}
      role="img"
      aria-label={`${habit.name} 12-week contribution grid`}
    >
      <div style={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        {/* Day-of-week label column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 2 }}>
          {DAY_LABELS.map((d, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                fontSize: 7,
                color: "rgba(255,255,255,0.25)",
                lineHeight: "8px",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              {i % 2 === 0 ? d : ""}
            </div>
          ))}
        </div>

        {/* Grid columns */}
        {cols.map((col, colIdx) => (
          <div key={colIdx} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {col.map((cell, rowIdx) => (
              <div
                key={rowIdx}
                title={`${cell.dateStr}${cell.logged ? ` · ${Math.round(cell.pct * 100)}%` : ""}`}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: heatmapCellColor(cell.pct),
                  transition: "background 0.15s",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        marginTop: 5,
        fontSize: 9,
        color: "rgba(255,255,255,0.28)",
      }}>
        <span>Less</span>
        {[0, 0.3, 0.65, 1].map((p, i) => (
          <div
            key={i}
            style={{
              width: 8, height: 8,
              borderRadius: 2,
              background: heatmapCellColor(p),
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ─── HabitMonthlyBars ─────────────────────────────────────────────────────────

function HabitMonthlyBars({ habit }) {
  const logs = habit.logs || {};

  const bars = useMemo(
    () => calcHabitWeeklyBars(logs),
    [JSON.stringify(logs)],
  );

  function barColor(pct) {
    if (pct >= 0.86) return "#22c55e"; // green  (6–7 / 7)
    if (pct >= 0.57) return "#f59e0b"; // yellow (4–5 / 7)
    return "#ef4444";                   // red    (0–3 / 7)
  }

  const MAX_H = 28; // max bar height in px

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        color: "rgba(255,255,255,0.28)",
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        marginBottom: 5,
      }}>
        Last 4 weeks
      </div>
      <div
        style={{ display: "flex", gap: 5, alignItems: "flex-end" }}
        role="img"
        aria-label={`${habit.name} weekly completion bars`}
      >
        {bars.map((bar, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div
              title={`Week of ${bar.weekLabel}: ${bar.daysHit}/7 days`}
              style={{
                width: 14,
                height: Math.max(2, Math.round(bar.pct * MAX_H)),
                borderRadius: 3,
                background: barColor(bar.pct),
                transition: "height 0.3s",
              }}
            />
            <div style={{
              fontSize: 8,
              color: "rgba(255,255,255,0.3)",
              whiteSpace: "nowrap",
            }}>
              {bar.daysHit}/7
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HabitStreakStats ─────────────────────────────────────────────────────────

function HabitStreakStats({ habit }) {
  const logs = habit.logs || {};
  const today = todayKey();
  const last7 = getLast7Days();

  const currentStreak = useMemo(() => calcStreak(habit), [habit]);
  const bestStreak = useMemo(
    () => calcHabitBestStreak(logs),
    [JSON.stringify(logs)],
  );
  const thisWeekHit = useMemo(
    () => last7.filter((d) => !!logs[d]).length,
    [JSON.stringify(logs)],
  );
  const allTimeLogs = useMemo(
    () => Object.keys(logs).filter((k) => !!logs[k]).length,
    [JSON.stringify(logs)],
  );

  const stat = (icon, value, label) => (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 2, minWidth: 0,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
        <span style={{ marginRight: 2 }}>{icon}</span>{value}
      </div>
      <div style={{
        fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap",
      }}>
        {label}
      </div>
    </div>
  );

  return (
    <div style={{
      display: "flex", gap: 12, marginTop: 10,
      paddingTop: 10,
      borderTop: "1px solid rgba(255,255,255,0.07)",
    }}>
      {stat("🔥", currentStreak, "Current")}
      {stat("⭐", bestStreak,   "Best")}
      {stat("📅", `${thisWeekHit}/7`, "This wk")}
      {stat("∑",  allTimeLogs,  "All-time")}
    </div>
  );
}

// ─── LogTodayButton ───────────────────────────────────────────────────────────

function LogTodayButton({ habit, onToggle }) {
  const today = todayKey();
  const logs = habit.logs || {};
  const doneToday = !!logs[today];
  const [showInput, setShowInput] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const isBoolean = habit.target === 1 && habit.unit === "times";

  const handleClick = () => {
    if (doneToday) {
      // Toggle off — no input needed
      onToggle(habit.id, null);
      return;
    }
    if (isBoolean) {
      onToggle(habit.id, 1);
    } else {
      setShowInput(true);
    }
  };

  const handleSubmit = () => {
    const val = parseFloat(inputVal);
    if (!isNaN(val) && val > 0) {
      onToggle(habit.id, val);
    }
    setShowInput(false);
    setInputVal("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") { setShowInput(false); setInputVal(""); }
  };

  return (
    <div>
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 8 }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                autoFocus
                type="number"
                min={0}
                step="any"
                placeholder={`Enter ${habit.unit}…`}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(99,102,241,0.5)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  color: "#fff",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                onClick={handleSubmit}
                style={{
                  background: "#6366f1",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Log
              </button>
              <button
                onClick={() => { setShowInput(false); setInputVal(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "0 4px",
                }}
              >×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={handleClick}
        className={doneToday ? undefined : "habit-pulse"}
        aria-label={doneToday ? `${habit.name} logged today` : `Log ${habit.name} today`}
        style={{
          width: "100%",
          padding: "8px 0",
          borderRadius: 10,
          border: doneToday
            ? `1.5px solid ${habit.color}`
            : "1.5px solid rgba(99,102,241,0.7)",
          background: doneToday
            ? `${habit.color}22`
            : "rgba(99,102,241,0.12)",
          color: doneToday ? habit.color : "#a5b4fc",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          transition: "background 0.2s, border-color 0.2s, color 0.2s",
          animation: doneToday ? "none" : "habitPulse 2s ease-in-out infinite",
        }}
      >
        {doneToday ? (
          <>
            <span style={{ fontSize: 14 }}>✓</span>
            Done today
          </>
        ) : (
          <>
            <span style={{ fontSize: 14 }}>+</span>
            Log Today
          </>
        )}
      </motion.button>
    </div>
  );
}

// ─── HabitFormModal ───────────────────────────────────────────────────────────

function HabitFormModal({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...BLANK_HABIT, ...initial });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleCustomDay = (day) => {
    setForm((f) => ({
      ...f,
      customDays: f.customDays.includes(day)
        ? f.customDays.filter((d) => d !== day)
        : [...f.customDays, day],
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          background: "#0f111a",
          borderRadius: 20,
          padding: 28,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 20 }}>
          {initial.id ? "Edit Habit" : "New Habit"}
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <div style={S.label}>Name</div>
          <input
            style={S.input}
            placeholder="e.g. Read 30 minutes"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        {/* Emoji */}
        <div style={{ marginBottom: 16 }}>
          <div style={S.label}>Emoji</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EMOJI_OPTIONS.map((em) => (
              <button
                key={em}
                onClick={() => set("emoji", em)}
                style={{
                  fontSize: 22,
                  width: 40, height: 40,
                  borderRadius: 10,
                  border: form.emoji === em ? `2px solid ${form.color}` : "2px solid transparent",
                  background: form.emoji === em ? `${form.color}22` : "rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div style={{ marginBottom: 16 }}>
          <div style={S.label}>Color</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => set("color", c)}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: c,
                  border: form.color === c ? "3px solid #fff" : "3px solid transparent",
                  cursor: "pointer",
                  outline: form.color === c ? `2px solid ${c}` : "none",
                  transition: "all 0.15s",
                }}
              />
            ))}
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom: 16 }}>
          <div style={S.label}>Category</div>
          <select
            style={{ ...S.input, appearance: "none" }}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} style={{ background: "#0f111a" }}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Frequency */}
        <div style={{ marginBottom: 16 }}>
          <div style={S.label}>Frequency</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FREQUENCY_OPTIONS.map((f) => (
              <button key={f} onClick={() => set("frequency", f)} style={S.pillBtn(form.frequency === f, form.color)}>
                {FREQ_LABELS[f]}
              </button>
            ))}
          </div>
          {form.frequency === "custom" && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {WEEKDAYS_LIST.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleCustomDay(day)}
                  style={S.pillBtn(form.customDays.includes(day), form.color)}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Target + Unit */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={S.label}>Target</div>
            <input
              type="number"
              min={1}
              style={S.input}
              value={form.target}
              onChange={(e) => set("target", parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.label}>Unit</div>
            <select
              style={{ ...S.input, appearance: "none" }}
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u} style={{ background: "#0f111a" }}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Difficulty */}
        <div style={{ marginBottom: 16 }}>
          <div style={S.label}>Difficulty</div>
          <div style={{ display: "flex", gap: 8 }}>
            {DIFFICULTY_LEVELS.map((level) => {
              const active = (form.difficulty || "easy") === level.value;
              return (
                <button
                  key={level.value}
                  onClick={() => set("difficulty", level.value)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 10,
                    border: active ? `1.5px solid ${level.color}` : "1.5px solid rgba(255,255,255,0.1)",
                    background: active ? `${level.color}20` : "rgba(255,255,255,0.03)",
                    color: active ? level.color : "rgba(255,255,255,0.45)",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  {level.dot} {level.label}
                  <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.7 }}>({level.points}pt)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reminder */}
        <div style={{ marginBottom: 24 }}>
          <div style={S.label}>Reminder (optional)</div>
          <input
            type="time"
            style={S.input}
            value={form.reminderTime}
            onChange={(e) => set("reminderTime", e.target.value)}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent", color: "rgba(255,255,255,0.6)", fontWeight: 600,
              fontSize: 14, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            style={{
              padding: "9px 22px", borderRadius: 10, border: "none",
              background: form.name.trim() ? form.color : "rgba(255,255,255,0.1)",
              color: form.name.trim() ? "#fff" : "rgba(255,255,255,0.3)",
              fontWeight: 700, fontSize: 14, cursor: form.name.trim() ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── DifficultyTag ────────────────────────────────────────────────────────────

function DifficultyTag({ difficulty }) {
  const level = DIFFICULTY_MAP[difficulty] || DIFFICULTY_MAP.easy;
  return (
    <span
      title={`Difficulty: ${level.label} (${level.points} pt${level.points > 1 ? "s" : ""})`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        fontWeight: 700,
        color: level.color,
        background: `${level.color}18`,
        border: `1px solid ${level.color}44`,
        borderRadius: 99,
        padding: "1px 7px",
        letterSpacing: "0.3px",
        flexShrink: 0,
      }}
    >
      {level.dot} {level.label}
    </span>
  );
}

// ─── HabitInsightCard ─────────────────────────────────────────────────────────

function HabitInsightCard({ habits }) {
  const today = todayKey();
  const [idx, setIdx] = useState(0);

  const insights = useMemo(() => {
    const list = [];
    const active = habits.filter((h) => !h.archived);
    if (active.length === 0) return list;

    // 1. Strongest day
    const strongestDay = calcStrongestDay(active);
    if (strongestDay) {
      list.push({ icon: "📅", text: `Your strongest habit day is ${strongestDay} — use that momentum!` });
    }

    // 2. Longest streak habit
    const streakHabit = calcLongestStreakHabit(active);
    if (streakHabit && streakHabit.streak >= 2) {
      list.push({ icon: "🔥", text: `You've maintained "${streakHabit.name}" for ${streakHabit.streak} days — your longest active streak!` });
    }

    // 3. Perfect days count
    const perfectDays = calcPerfectDays(active);
    if (perfectDays >= 1) {
      const daysInMonth = new Date().getDate();
      const perfectThisMonth = Math.min(perfectDays, daysInMonth);
      list.push({ icon: "🌟", text: `You're on track for ${perfectThisMonth} perfect day${perfectThisMonth > 1 ? "s" : ""} this month — keep it up!` });
    }

    // 4. Co-occurrence tip: find two habits that co-occur most
    const logs7 = getLast7Days();
    const pairs = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const bothDone = logs7.filter(
          (d) => !!(active[i].logs || {})[d] && !!(active[j].logs || {})[d],
        ).length;
        if (bothDone >= 3) {
          pairs.push({ a: active[i].name, b: active[j].name, count: bothDone });
        }
      }
    }
    if (pairs.length > 0) {
      const best = pairs.reduce((a, b) => (a.count > b.count ? a : b));
      const pct = Math.round((best.count / 7) * 100);
      list.push({ icon: "🔗", text: `You're ${pct}% more likely to complete "${best.b}" when you do "${best.a}" first.` });
    }

    // 5. Completion rate today — remaining to hit streak goal
    const { done, total } = completionRateToday(active);
    if (total > 0 && done < total) {
      const remaining = total - done;
      list.push({ icon: "✨", text: `Complete ${remaining} more habit${remaining > 1 ? "s" : ""} today to hit your streak goal!` });
    }

    return list;
  }, [habits, today]);

  // Auto-advance every 10 seconds
  useEffect(() => {
    if (insights.length <= 1) return;
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % insights.length);
    }, 10_000);
    return () => clearInterval(timer);
  }, [insights.length]);

  // Reset index when insight list changes length
  useEffect(() => {
    setIdx(0);
  }, [insights.length]);

  const advance = useCallback(() => {
    if (insights.length <= 1) return;
    setIdx((prev) => (prev + 1) % insights.length);
  }, [insights.length]);

  if (insights.length === 0) return null;
  const insight = insights[idx];

  return (
    <div style={{ marginBottom: 16 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28 }}
          onClick={advance}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: 14,
            padding: "12px 16px",
            cursor: insights.length > 1 ? "pointer" : "default",
          }}
          role="status"
          aria-live="polite"
          aria-label="Habit insight"
        >
          <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{insight.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 3 }}>
              Insight
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.45, fontStyle: "italic" }}>
              {insight.text}
            </div>
          </div>
          {insights.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, marginTop: 2 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{idx + 1}/{insights.length}</span>
              <span style={{ fontSize: 12, color: "rgba(99,102,241,0.6)" }}>›</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {insights.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 6 }}>
          {insights.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={"Go to insight " + (i + 1)}
              style={{
                width: i === idx ? 16 : 6,
                height: 6,
                borderRadius: 99,
                background: i === idx ? "#6366f1" : "rgba(255,255,255,0.2)",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PerfectDayBanner ─────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#ec4899", "#14b8a6", "#f97316"];

function PerfectDayBanner({ habits }) {
  const today = todayKey();
  const active = habits.filter((h) => !h.archived);
  const scheduled = active.filter((h) => isScheduledDay(h, today));
  const allDone = scheduled.length > 0 && scheduled.every((h) => !!(h.logs || {})[today]);
  const [dismissed, setDismissed] = useState(false);

  const perfectCount = useMemo(() => calcPerfectDays(active), [habits]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!allDone || dismissed) return;
    const timer = setTimeout(() => setDismissed(true), 5000);
    return () => clearTimeout(timer);
  }, [allDone, dismissed]);

  // Generate stable confetti particles (won't re-randomise on re-render)
  const particles = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${(i / 18) * 100}%`,
      delay: `${(i * 0.08).toFixed(2)}s`,
      duration: `${0.9 + (i % 4) * 0.15}s`,
      size: 6 + (i % 3) * 2,
    }));
  }, []);

  if (!allDone || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, rgba(99,102,241,0.28), rgba(139,92,246,0.22))",
          border: "1px solid rgba(139,92,246,0.5)",
          borderRadius: 16,
          padding: "16px 20px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
        }}
        onClick={() => setDismissed(true)}
        role="alert"
        aria-live="assertive"
        aria-label="Perfect day achieved"
      >
        {/* Confetti particles */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
        >
          {particles.map((p) => (
            <div
              key={p.id}
              className="habit-confetti"
              style={{
                position: "absolute",
                top: 0,
                left: p.left,
                width: p.size,
                height: p.size,
                borderRadius: 2,
                background: p.color,
                animation: `habitConfettiFall ${p.duration} ${p.delay} ease-out forwards, habitConfettiWobble ${p.duration} ${p.delay} ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>🌟</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 2 }}>
              Perfect Day! {perfectCount > 0 ? `#${perfectCount}` : ""}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
              {perfectCount > 1
                ? `Perfect Day #${perfectCount}! Keep the streak!`
                : "Every habit completed — incredible discipline!"}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
          aria-label="Dismiss perfect day banner"
          style={{
            background: "none", border: "none",
            color: "rgba(255,255,255,0.4)", fontSize: 18,
            cursor: "pointer", padding: "2px 6px", flexShrink: 0,
          }}
        >×</button>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── StackSuggestionToast ─────────────────────────────────────────────────────

function StackSuggestionToast({ suggestion, onAccept, onDismiss }) {
  if (!suggestion) return null;
  return (
    <AnimatePresence>
      <motion.div
        key="stack-suggestion"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          position: "fixed",
          bottom: 88,
          right: 16,
          zIndex: 1200,
          maxWidth: 320,
          background: "rgba(15,17,30,0.96)",
          border: "1px solid rgba(99,102,241,0.35)",
          borderRadius: 14,
          padding: "14px 16px",
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
        role="dialog"
        aria-modal="false"
        aria-label="Habit stack suggestion"
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
          Stack it!
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 4, lineHeight: 1.45 }}>
          <span style={{ fontWeight: 700, color: "#fff" }}>You just logged {suggestion.habitName}.</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 12 }}>
          {suggestion.reason} — add <span style={{ color: "#a5b4fc", fontWeight: 600 }}>{suggestion.suggestion}</span>?
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onAccept}
            style={{
              flex: 1, padding: "7px 0",
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.45)",
              borderRadius: 8, color: "#a5b4fc",
              fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}
          >
            Add {suggestion.suggestion}
          </motion.button>
          <button
            onClick={onDismiss}
            style={{
              padding: "7px 12px",
              background: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "rgba(255,255,255,0.45)",
              fontSize: 12, cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── StreakMilestoneToast ─────────────────────────────────────────────────────

function StreakMilestoneToast({ toast, onDismiss }) {
  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            position: "fixed",
            bottom: 96,
            right: 16,
            zIndex: 1300,
            maxWidth: 320,
            background: "rgba(15,17,30,0.97)",
            border: "1px solid rgba(99,102,241,0.45)",
            borderRadius: 14,
            padding: "14px 16px",
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
          onClick={onDismiss}
          role="status"
          aria-live="polite"
          aria-label={"Streak milestone: " + toast.habitName + " " + toast.days + " days"}
        >
          <span style={{ fontSize: 26, flexShrink: 0 }}>🔥</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {toast.habitName}
            </div>
            <div style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 600, marginTop: 1 }}>
              {toast.days}-Day Streak! {toast.days >= 100 ? "Legendary!" : toast.days >= 60 ? "Incredible!" : toast.days >= 30 ? "Incredible!" : toast.days >= 14 ? "Amazing!" : "Keep going!"}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            style={{
              background: "none", border: "none",
              color: "rgba(255,255,255,0.35)", fontSize: 16,
              cursor: "pointer", padding: "2px 4px", flexShrink: 0,
            }}
            aria-label="Dismiss milestone toast"
          >×</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── QuickStartModal ──────────────────────────────────────────────────────────

function QuickStartModal({ habits, onAddAll, onClose }) {
  const [selected, setSelected] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          background: "#0f111a",
          borderRadius: 20,
          padding: 28,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Quick Start Stacks</div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", padding: "0 4px" }}
            aria-label="Close quick start modal"
          >×</button>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>
          One-click habit bundles curated for real results
        </div>

        {/* Stack cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {QUICK_START_STACKS.map((stack) => {
            const isOpen = selected === stack.id;
            // A stack is "complete" when every one of its habits already exists
            const stackComplete = stack.habits.every((sh) =>
              habits.some((ex) => !ex.archived && ex.name.toLowerCase() === sh.name.toLowerCase())
            );
            // A stack is "partial" when at least one habit already exists but not all
            const stackPartial = !stackComplete && stack.habits.some((sh) =>
              habits.some((ex) => !ex.archived && ex.name.toLowerCase() === sh.name.toLowerCase())
            );
            return (
              <div
                key={stack.id}
                style={{
                  border: isOpen ? `1.5px solid ${stack.color}66` : stackComplete ? "1.5px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 14,
                  overflow: "hidden",
                  background: isOpen ? `${stack.color}0a` : stackComplete ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.03)",
                  transition: "all 0.15s",
                }}
              >
                {/* Stack header */}
                <button
                  onClick={() => setSelected(isOpen ? null : stack.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    gap: 12, padding: "14px 16px",
                    background: "none", border: "none", cursor: "pointer", textAlign: "left",
                  }}
                  aria-expanded={isOpen}
                >
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{stack.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: stackComplete ? "rgba(255,255,255,0.5)" : "#fff" }}>{stack.name}</span>
                      {stackComplete && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "#86efac",
                          background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                          borderRadius: 99, padding: "1px 7px", letterSpacing: "0.3px",
                        }}>
                          ✓ All added
                        </span>
                      )}
                      {stackPartial && !stackComplete && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "#fbbf24",
                          background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
                          borderRadius: 99, padding: "1px 7px", letterSpacing: "0.3px",
                        }}>
                          Partial
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{stack.description}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: "rgba(255,255,255,0.4)",
                    }}>
                      {stack.habits.length} habits
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{isOpen ? "▾" : "▸"}</span>
                  </div>
                </button>

                {/* Expanded habits list */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{ padding: "0 16px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                          {stack.habits.map((h, i) => {
                            const alreadyHas = habits.some(
                              (ex) => !ex.archived && ex.name.toLowerCase() === h.name.toLowerCase(),
                            );
                            const diff = DIFFICULTY_MAP[h.difficulty] || DIFFICULTY_MAP.easy;
                            return (
                              <div
                                key={i}
                                style={{
                                  display: "flex", alignItems: "center", gap: 10,
                                  padding: "8px 10px",
                                  background: alreadyHas ? "rgba(34,197,94,0.07)" : "rgba(255,255,255,0.03)",
                                  border: alreadyHas ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.06)",
                                  borderRadius: 10,
                                }}
                              >
                                <span style={{ fontSize: 20, flexShrink: 0 }}>{h.emoji}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: alreadyHas ? "rgba(255,255,255,0.4)" : "#fff" }}>
                                    {h.name}
                                    {alreadyHas && (
                                      <span style={{ fontSize: 10, color: "#86efac", marginLeft: 6, fontWeight: 500 }}>
                                        already added
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                                    {FREQ_LABELS[h.frequency]} · {h.target} {h.unit}
                                  </div>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, color: diff.color, flexShrink: 0 }}>
                                  {diff.dot} {diff.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => onAddAll(stack)}
                          style={{
                            width: "100%", padding: "10px 0",
                            background: `${stack.color}22`,
                            border: `1.5px solid ${stack.color}66`,
                            borderRadius: 10,
                            color: stack.color,
                            fontWeight: 700, fontSize: 13,
                            cursor: "pointer",
                          }}
                        >
                          Add all {stack.habits.length} habits
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── HabitCard ────────────────────────────────────────────────────────────────

function HabitCard({ habit, onToggleToday, onLogValue, onEdit, onArchive }) {
  const today = todayKey();
  const logs = habit.logs || {};
  const doneToday = !!logs[today];
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Streak recovery state calculations
  const streak = useMemo(() => calcStreak(habit), [habit]);
  const atRisk = !doneToday && isStreakAtRisk(habit);
  const isRecovery = streak === 0 && hadRecentActivity(habit);
  const lastStreak = isRecovery ? getLastStreak(habit) : 0;

  // Unified log handler: value=null → toggle off, value=number → log that amount
  const handleLogOrToggle = useCallback((habitId, value) => {
    if (value === null) {
      onToggleToday(habitId);
    } else {
      onLogValue(habitId, value);
    }
  }, [onToggleToday, onLogValue]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        ...S.card,
        borderLeft: `4px solid ${isRecovery ? "#f59e0b" : habit.color}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Streak-at-risk warning banner */}
      {atRisk && (
        <div style={{
          background: "rgba(245,158,11,0.12)",
          border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: 8,
          padding: "7px 10px",
          marginBottom: 12,
          fontSize: 12,
          color: "#fbbf24",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span>⚠️</span>
          <span>Log today to keep your {streak}-day streak!</span>
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 26 }}>{habit.emoji}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {habit.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                {FREQ_LABELS[habit.frequency]} · {habit.target} {habit.unit}
              </span>
              {habit.difficulty && <DifficultyTag difficulty={habit.difficulty} />}
            </div>
          </div>
        </div>

        {/* Context menu */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {confirmArchive ? (
            <>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>Archive?</span>
              <button
                onClick={() => { onArchive(habit.id); setConfirmArchive(false); }}
                style={{ background: "none", border: "none", color: "#f97316", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "2px 4px" }}
              >Yes</button>
              <button
                onClick={() => setConfirmArchive(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, padding: "2px 4px" }}
              >No</button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEdit(habit)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 15, padding: "2px 4px" }}
                title="Edit"
              >✏️</button>
              <button
                onClick={() => setConfirmArchive(true)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 15, padding: "2px 4px" }}
                title="Archive"
              >📦</button>
            </>
          )}
        </div>
      </div>

      {/* Recovery badge */}
      {isRecovery && !doneToday && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          background: "rgba(245,158,11,0.15)",
          border: "1px solid rgba(245,158,11,0.35)",
          borderRadius: 99,
          padding: "3px 10px",
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 13 }}>🔄</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>
            Resume streak{lastStreak > 0 ? ` — you had ${lastStreak} days` : ""}
          </span>
        </div>
      )}

      {/* Log Today button */}
      <LogTodayButton habit={habit} onToggle={handleLogOrToggle} />

      {/* Streak stats row */}
      <HabitStreakStats habit={habit} />

      {/* Expand/collapse toggle for heat map + bars */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginTop: 10,
          padding: 0,
          color: "rgba(255,255,255,0.3)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
        aria-expanded={expanded}
        aria-label={expanded ? "Hide history" : "Show history"}
      >
        <span>{expanded ? "▾" : "▸"}</span>
        {expanded ? "Hide history" : "Show history"}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ overflow: "hidden" }}
          >
            {/* 12-week heat map */}
            <HabitHeatMap habit={habit} />

            {/* 4-week bar chart */}
            <HabitMonthlyBars habit={habit} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── HabitStackingPanel ───────────────────────────────────────────────────────

const DISMISSED_KEY = "habitStacking_dismissed";

function buildSuggestions(habits) {
  const names = habits.filter((h) => !h.archived).map((h) => h.name.toLowerCase());

  // Try to personalise using user's habit names
  const exerciseHabit = habits.find((h) =>
    !h.archived && /workout|exercise|run|gym|fitness|steps/i.test(h.name)
  );
  const readingHabit = habits.find((h) =>
    !h.archived && /read|book|pages/i.test(h.name)
  );
  const meditationHabit = habits.find((h) =>
    !h.archived && /medit|mindful|breath/i.test(h.name)
  );
  const journalHabit = habits.find((h) =>
    !h.archived && /journal|write|diary/i.test(h.name)
  );

  const suggestions = [...STACK_TEMPLATES.map((t) => ({ ...t }))];

  // Inject personalised suggestions at the front
  if (exerciseHabit && readingHabit) {
    suggestions.unshift({
      trigger: exerciseHabit.name,
      action: `read for 15 minutes (${readingHabit.name})`,
      icon: "📚",
    });
  }
  if (meditationHabit) {
    suggestions.unshift({
      trigger: "morning routine",
      action: `start with ${meditationHabit.name}, then review your goals`,
      icon: "🧘",
    });
  }
  if (journalHabit && exerciseHabit) {
    suggestions.unshift({
      trigger: exerciseHabit.name,
      action: `write in your journal (${journalHabit.name})`,
      icon: "✍️",
    });
  }

  // Deduplicate and cap at 5
  const seen = new Set();
  return suggestions
    .filter((s) => {
      const key = s.trigger + "|" + s.action;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function HabitStackingPanel({ habits }) {
  const activeHabits = habits.filter((h) => !h.archived);
  const [open, setOpen] = useState(activeHabits.length <= 3);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState(null);

  const suggestions = useMemo(() => buildSuggestions(habits), [habits]);
  const visible = suggestions.filter((_, i) => !dismissed.includes(i));

  const dismissCard = (idx) => {
    const next = [...dismissed, idx];
    setDismissed(next);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)); } catch {}
  };

  const copyToClipboard = (s, idx) => {
    const text = `After ${s.trigger}, ${s.action}.`;
    navigator.clipboard.writeText(text).catch(() => {});
    setToast(idx);
    setTimeout(() => setToast(null), 2000);
  };

  if (visible.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 10,
          padding: "8px 16px",
          color: "rgba(165,180,252,0.85)",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "all 0.15s",
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <span>💡 Stack Your Habits</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
          {open ? "▾  collapse" : "▸  expand"}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              background: "rgba(15,23,42,0.55)",
              border: "1px solid rgba(99,102,241,0.18)",
              borderRadius: 14,
              padding: 16,
              marginTop: 10,
            }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
                Pair habits together to make them stick
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {visible.map((s, visIdx) => {
                  // Map visible index back to original suggestion index for dismiss
                  const origIdx = suggestions.indexOf(s);
                  return (
                    <motion.div
                      key={origIdx}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Icon */}
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>

                      {/* Trigger pill */}
                      <span style={{
                        padding: "3px 10px",
                        borderRadius: 99,
                        background: "rgba(59,130,246,0.18)",
                        border: "1px solid rgba(59,130,246,0.35)",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#93c5fd",
                        whiteSpace: "nowrap",
                      }}>
                        After {s.trigger}
                      </span>

                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>→</span>

                      {/* Action pill */}
                      <span style={{
                        padding: "3px 10px",
                        borderRadius: 99,
                        background: "rgba(99,102,241,0.18)",
                        border: "1px solid rgba(99,102,241,0.35)",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#a5b4fc",
                        flex: 1,
                        minWidth: 120,
                      }}>
                        {s.action}
                      </span>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => copyToClipboard(s, origIdx)}
                          title="Copy to clipboard"
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid rgba(99,102,241,0.35)",
                            background: toast === origIdx ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.15)",
                            color: toast === origIdx ? "#86efac" : "#a5b4fc",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {toast === origIdx ? "✓ Copied!" : "Add to routine"}
                        </motion.button>
                        <button
                          onClick={() => dismissCard(origIdx)}
                          title="Dismiss"
                          style={{
                            background: "none",
                            border: "none",
                            color: "rgba(255,255,255,0.3)",
                            cursor: "pointer",
                            fontSize: 16,
                            lineHeight: 1,
                            padding: "2px 4px",
                            transition: "color 0.15s",
                          }}
                        >×</button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── TemplatesPanel ───────────────────────────────────────────────────────────

function TemplatesPanel({ onSelect }) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 14 }}>
        Click a template to get started
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 10,
      }}>
        {TEMPLATES.map((t, i) => (
          <motion.button
            key={i}
            whileHover={{ translateY: -2, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={() => onSelect(t)}
            style={{
              background: "rgba(17,24,39,0.75)",
              border: `1px solid rgba(255,255,255,0.08)`,
              borderLeft: `4px solid ${t.color}`,
              borderRadius: 12,
              padding: "12px 14px",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 24 }}>{t.emoji}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                {FREQ_LABELS[t.frequency]} · {t.category}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── StatisticsPanel ─────────────────────────────────────────────────────────

function StatisticsPanel({ habits }) {
  const active = habits.filter((h) => !h.archived);
  const { done, total } = completionRateToday(habits);
  const score = habitScoreThisWeek(habits);
  const best = bestCurrentStreak(habits);
  const weekTotal = totalCompletionsThisWeek(habits);
  const last7 = getLast7Days();

  const stats = [
    { label: "Active Habits",       value: active.length,                     suffix: "" },
    { label: "Done Today",          value: `${done}/${total}`,                 suffix: "" },
    { label: "Best Streak",         value: best,                               suffix: "🔥" },
    { label: "This Week",           value: weekTotal,                          suffix: " completions" },
  ];

  return (
    <div>
      {/* Stat cards row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ ...S.card, textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#6366f1" }}>{s.value}{s.suffix}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Habit score */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Habit Score (This Week)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444" }}>
            {score}%
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
            style={{
              height: "100%",
              background: score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444",
              borderRadius: 99,
            }}
          />
        </div>
      </div>

      {/* Weekly heatmap per habit */}
      {active.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Weekly Heatmap</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 130 }} />
            {last7.map((d) => {
              const dt = new Date(d + "T12:00:00");
              return (
                <div key={d} style={{ flex: 1, textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                  {["Su","Mo","Tu","We","Th","Fr","Sa"][dt.getDay()]}
                </div>
              );
            })}
          </div>
          {active.map((habit) => (
            <div key={habit.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div style={{ width: 130, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                <span style={{ fontSize: 14 }}>{habit.emoji}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {habit.name}
                </span>
              </div>
              {last7.map((d) => {
                const scheduled = isScheduledDay(habit, d);
                const done = !!(habit.logs || {})[d];
                return (
                  <div key={d} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5,
                      background: done ? habit.color : scheduled ? "rgba(255,255,255,0.07)" : "transparent",
                      border: scheduled && !done ? `1px solid rgba(255,255,255,0.12)` : "none",
                    }} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ArchiveSection ───────────────────────────────────────────────────────────

function ArchiveSection({ habits, onUnarchive }) {
  const [open, setOpen] = useState(false);
  const archived = habits.filter((h) => h.archived);
  if (archived.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "8px 16px",
          color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <span>{open ? "▾" : "▸"}</span>
        Archived ({archived.length})
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 10,
              marginTop: 12,
            }}>
              {archived.map((habit) => (
                <div
                  key={habit.id}
                  style={{
                    ...S.card,
                    borderLeft: `4px solid ${habit.color}`,
                    opacity: 0.6,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{habit.emoji}</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>{habit.name}</span>
                  </div>
                  <button
                    onClick={() => onUnarchive(habit.id)}
                    style={{
                      background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                      borderRadius: 8, padding: "4px 10px", color: "#6366f1",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "habits",    label: "My Habits" },
  { id: "templates", label: "Templates" },
  { id: "stats",     label: "Stats" },
];

// ─── HabitBuilderTab (main export) ────────────────────────────────────────────

const MILESTONES_SEEN_KEY = "habitMilestonesSeen";

function loadMilestonesSeen() {
  try {
    return JSON.parse(localStorage.getItem(MILESTONES_SEEN_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function HabitBuilderTab({ data, onChange }) {
  const habits = data?.customHabits ?? [];
  const [activeTab, setActiveTab] = useState("habits");
  const [modal, setModal] = useState(null); // null | { mode: "create"|"edit", initial: {} }
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateCatFilter, setTemplateCatFilter] = useState("All");
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [milestoneToast, setMilestoneToast] = useState(null); // { id, habitName, days }
  const [milestonesSeen, setMilestonesSeen] = useState(loadMilestonesSeen);

  const dismissMilestoneToast = useCallback(() => setMilestoneToast(null), []);

  // Helper: fire a milestone toast if this streak just crossed a milestone threshold
  const fireMilestoneIfNeeded = useCallback((habitId, habitName, newStreak) => {
    const milestone = calcHabitStreakMilestone(newStreak);
    if (!milestone) return;
    const seenKey = habitId + "_" + milestone;
    setMilestonesSeen((prev) => {
      if (prev[seenKey]) return prev; // already seen — don't re-fire
      const next = { ...prev, [seenKey]: true };
      try { localStorage.setItem(MILESTONES_SEEN_KEY, JSON.stringify(next)); } catch {}
      // Schedule toast outside of state updater
      setTimeout(() => {
        setMilestoneToast({ id: Date.now(), habitName, days: milestone });
      }, 0);
      return next;
    });
  }, []);

  // ── Mutators ────────────────────────────────────────────────────────────────

  const updateHabits = (updater) => {
    onChange((prev) => {
      const current = prev?.customHabits ?? [];
      const next = updater(current);
      return { ...(prev || {}), customHabits: next };
    });
  };

  const handleSaveHabit = (formData) => {
    updateHabits((prev) => {
      if (formData.id) {
        return prev.map((h) => h.id === formData.id ? { ...h, ...formData } : h);
      }
      const newHabit = {
        id: uid(),
        streak: 0,
        longestStreak: 0,
        logs: {},
        createdAt: new Date().toISOString(),
        archived: false,
        ...formData,
      };
      return [...prev, newHabit];
    });
    setModal(null);
  };

  const handleToggleToday = (habitId) => {
    const today = todayKey();
    updateHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const existingLogs = h.logs || {};
        const newLogs = { ...existingLogs, [today]: !existingLogs[today] };
        if (!newLogs[today]) delete newLogs[today];
        const newStreak = calcStreak({ ...h, logs: newLogs });
        if (newLogs[today]) {
          // Logging on (not toggling off) — check for milestone
          fireMilestoneIfNeeded(h.id, h.name, newStreak);
        }
        return {
          ...h,
          logs: newLogs,
          streak: newStreak,
          longestStreak: Math.max(h.longestStreak ?? 0, newStreak),
        };
      })
    );
  };

  // Log a specific numeric value for today (used by LogTodayButton inline input)
  const handleLogValue = (habitId, value) => {
    const today = todayKey();
    updateHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const existingLogs = h.logs || {};
        const newLogs = { ...existingLogs, [today]: value };
        const newStreak = calcStreak({ ...h, logs: newLogs });
        fireMilestoneIfNeeded(h.id, h.name, newStreak);
        return {
          ...h,
          logs: newLogs,
          streak: newStreak,
          longestStreak: Math.max(h.longestStreak ?? 0, newStreak),
        };
      })
    );
  };

  const handleArchive = (habitId) => {
    updateHabits((prev) =>
      prev.map((h) => h.id === habitId ? { ...h, archived: true } : h)
    );
  };

  const handleUnarchive = (habitId) => {
    updateHabits((prev) =>
      prev.map((h) => h.id === habitId ? { ...h, archived: false } : h)
    );
  };

  const handleTemplateSelect = (template) => {
    setModal({ mode: "create", initial: { ...template } });
    setActiveTab("habits");
  };

  const handleQuickAddTemplate = (tmpl) => {
    const color = HABIT_TEMPLATE_COLORS[tmpl.category] || "#6366f1";
    const frequency = weeklyGoalToFrequency(tmpl.weeklyGoal);
    const newHabit = {
      id: uid(),
      name: tmpl.name,
      emoji: tmpl.emoji,
      color,
      frequency,
      customDays: [],
      category: tmpl.category,
      target: 1,
      unit: tmpl.unit,
      reminderTime: "",
      streak: 0,
      longestStreak: 0,
      logs: {},
      createdAt: new Date().toISOString(),
      archived: false,
    };
    updateHabits((prev) => [...prev, newHabit]);
    setShowTemplates(false);
  };

  // Handle "Add all habits" from QuickStartModal
  const handleAddAllFromStack = useCallback((stack) => {
    updateHabits((prev) => {
      const toAdd = stack.habits.filter(
        (sh) => !prev.some((ex) => !ex.archived && ex.name.toLowerCase() === sh.name.toLowerCase())
      );
      const newHabits = toAdd.map((sh) => ({
        id: uid(),
        streak: 0,
        longestStreak: 0,
        logs: {},
        createdAt: new Date().toISOString(),
        archived: false,
        customDays: [],
        reminderTime: "",
        ...sh,
      }));
      return [...prev, ...newHabits];
    });
    setShowQuickStart(false);
  }, []);

  const activeHabits = habits.filter((h) => !h.archived);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Habit Builder</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
            Track daily habits &amp; Key Indicators
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowQuickStart(true)}
            style={{
              padding: "10px 16px",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.35)",
              borderRadius: 12,
              color: "#fbbf24",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            ⚡ Quick Start
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setShowTemplates((v) => !v); setTemplateCatFilter("All"); }}
            style={{
              padding: "10px 16px",
              background: showTemplates ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.06)",
              border: showTemplates ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              color: showTemplates ? "#a5b4fc" : "rgba(255,255,255,0.65)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            📋 Templates
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setModal({ mode: "create", initial: {} })}
            style={{
              padding: "10px 18px",
              background: "#6366f1",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            + New Habit
          </motion.button>
        </div>
      </div>

      {/* Template picker panel */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            key="template-picker"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ overflow: "hidden", marginBottom: 20 }}
          >
            <div style={{
              background: "rgba(15,23,42,0.6)",
              border: "1px solid rgba(51,65,85,0.4)",
              borderRadius: 14,
              padding: 16,
              marginTop: 12,
            }}>
              {/* Panel header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Quick-add a habit</span>
                <button
                  onClick={() => setShowTemplates(false)}
                  style={{
                    background: "none", border: "none", color: "rgba(148,163,184,0.7)",
                    fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 2px",
                  }}
                >×</button>
              </div>

              {/* Category filter tabs */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {HABIT_TEMPLATE_CATEGORIES.map((cat) => {
                  const active = templateCatFilter === cat;
                  const color = cat === "All" ? "#6366f1" : (HABIT_TEMPLATE_COLORS[cat] || "#6366f1");
                  return (
                    <button
                      key={cat}
                      onClick={() => setTemplateCatFilter(cat)}
                      style={{
                        padding: "5px 13px",
                        borderRadius: 99,
                        fontSize: 12,
                        fontWeight: 600,
                        border: active ? `1.5px solid ${color}` : "1.5px solid rgba(51,65,85,0.5)",
                        background: active ? `${color}22` : "transparent",
                        color: active ? color : "rgba(148,163,184,0.7)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        textTransform: cat === "All" ? undefined : "capitalize",
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Template cards grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 8,
              }}>
                {HABIT_TEMPLATES
                  .filter((t) => templateCatFilter === "All" || t.category === templateCatFilter)
                  .map((tmpl, i) => {
                    const alreadyAdded = habits.some((h) => !h.archived && h.name === tmpl.name);
                    const color = HABIT_TEMPLATE_COLORS[tmpl.category] || "#6366f1";
                    return (
                      <div
                        key={i}
                        style={{
                          background: alreadyAdded ? "rgba(255,255,255,0.03)" : "transparent",
                          border: "1px solid rgba(51,65,85,0.35)",
                          borderRadius: 10,
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          transition: "background 0.15s",
                          cursor: alreadyAdded ? "default" : "default",
                        }}
                        onMouseEnter={(e) => { if (!alreadyAdded) e.currentTarget.style.background = "rgba(99,102,241,0.08)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = alreadyAdded ? "rgba(255,255,255,0.03)" : "transparent"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span style={{ fontSize: 20, flexShrink: 0 }}>{tmpl.emoji}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 600,
                              color: alreadyAdded ? "rgba(148,163,184,0.45)" : "#f1f5f9",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>
                              {tmpl.name}
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", marginTop: 1 }}>
                              {tmpl.weeklyGoal}×/week
                            </div>
                          </div>
                        </div>
                        <button
                          disabled={alreadyAdded}
                          onClick={() => handleQuickAddTemplate(tmpl)}
                          style={{
                            width: 26, height: 26, borderRadius: "50%",
                            border: alreadyAdded ? "1.5px solid rgba(51,65,85,0.4)" : `1.5px solid ${color}`,
                            background: alreadyAdded ? "transparent" : `${color}22`,
                            color: alreadyAdded ? "rgba(148,163,184,0.5)" : color,
                            fontSize: alreadyAdded ? 14 : 18,
                            cursor: alreadyAdded ? "default" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                            fontWeight: 700,
                            transition: "all 0.15s",
                          }}
                          title={alreadyAdded ? "Already added" : `Add ${tmpl.name}`}
                        >
                          {alreadyAdded ? "✓" : "+"}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #6366f1" : "2px solid transparent",
              color: activeTab === tab.id ? "#6366f1" : "rgba(255,255,255,0.45)",
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 14,
              cursor: "pointer",
              marginBottom: -1,
              transition: "color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "habits" && (
          <motion.div
            key="habits"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {/* Rotating insight card — always shown when there are habits */}
            {activeHabits.length > 0 && (
              <HabitInsightCard habits={habits} />
            )}

            {/* Perfect Day banner */}
            {activeHabits.length > 0 && (
              <PerfectDayBanner habits={habits} />
            )}

            {/* Daily Score banner */}
            {activeHabits.length > 0 && (() => {
              const todayStr = todayKey();
              const earned = calcDailyChallengeScore(habits, todayStr);
              const max = calcMaxDailyScore(habits, todayStr);
              if (max === 0) return null;
              const pct = max > 0 ? earned / max : 0;
              const scoreColor = pct >= 1 ? "#22c55e" : pct >= 0.5 ? "#f59e0b" : "#6366f1";
              return (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(17,24,39,0.6)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    padding: "12px 16px",
                    marginBottom: 16,
                    gap: 12,
                  }}
                  role="meter"
                  aria-label={"Daily score: " + earned + " of " + max + " points"}
                  aria-valuenow={earned}
                  aria-valuemin={0}
                  aria-valuemax={max}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
                      Today's Score
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: (Math.min(pct, 1) * 100) + "%" }}
                        transition={{ type: "spring", stiffness: 200, damping: 30 }}
                        style={{ height: "100%", borderRadius: 99, background: scoreColor }}
                      />
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor }}>{earned}</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>/{max} pts</span>
                    <span style={{ fontSize: 14, marginLeft: 5 }}>⚡</span>
                  </div>
                </div>
              );
            })()}

            {activeHabits.length === 0 ? (
              <div>
                <div style={{
                  ...S.card,
                  textAlign: "center",
                  padding: "32px 24px 24px",
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🌱</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: "rgba(255,255,255,0.65)" }}>
                    Start building your habits (Key Indicators)
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(148,163,184,0.55)", marginBottom: 8 }}>
                    Key Indicators = daily habits you track. Each one shows your streak and weekly progress.
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 16 }}>
                    Use Quick Start for a curated bundle, or create your own
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setShowQuickStart(true)}
                      style={{
                        padding: "8px 18px", background: "rgba(245,158,11,0.15)",
                        border: "1px solid rgba(245,158,11,0.4)",
                        borderRadius: 10, color: "#fbbf24", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      ⚡ Quick Start
                    </button>
                    <button
                      onClick={() => setModal({ mode: "create", initial: {} })}
                      style={{
                        padding: "8px 18px", background: "#6366f1", border: "none",
                        borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      + Create Custom Habit
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.65)", marginBottom: 12 }}>
                  Or choose a template to get started
                </div>
                <TemplatesPanel onSelect={handleTemplateSelect} />
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 12,
              }}>
                <AnimatePresence>
                  {activeHabits.map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      onToggleToday={handleToggleToday}
                      onLogValue={handleLogValue}
                      onEdit={(h) => setModal({ mode: "edit", initial: h })}
                      onArchive={handleArchive}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            <ArchiveSection habits={habits} onUnarchive={handleUnarchive} />
            {activeHabits.length > 0 && (
              <HabitStackingPanel habits={habits} />
            )}
          </motion.div>
        )}

        {activeTab === "templates" && (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <TemplatesPanel onSelect={handleTemplateSelect} />
          </motion.div>
        )}

        {activeTab === "stats" && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <StatisticsPanel habits={habits} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Habit create/edit modal */}
      <AnimatePresence>
        {modal && (
          <HabitFormModal
            key="habit-form"
            initial={modal.initial}
            onSave={handleSaveHabit}
            onCancel={() => setModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Quick Start stacks modal */}
      <AnimatePresence>
        {showQuickStart && (
          <QuickStartModal
            key="quick-start"
            habits={habits}
            onAddAll={handleAddAllFromStack}
            onClose={() => setShowQuickStart(false)}
          />
        )}
      </AnimatePresence>

      {/* Streak milestone toast */}
      <StreakMilestoneToast toast={milestoneToast} onDismiss={dismissMilestoneToast} />
    </div>
  );
}

// ─── HabitsDashWidget ─────────────────────────────────────────────────────────

export function HabitsDashWidget({ data, onNavigate }) {
  const habits = (data?.customHabits ?? []).filter((h) => !h.archived);
  const today = todayKey();
  const scheduled = habits.filter((h) => isScheduledDay(h, today));
  const { done, total } = completionRateToday(data?.customHabits ?? []);

  const handleToggle = (e, habitId) => {
    e.stopPropagation();
    // Widget is read-only in dashboard context; navigate to full view for interaction
    if (onNavigate) onNavigate();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onNavigate}
      style={{
        ...S.card,
        cursor: "pointer",
        borderLeft: "4px solid #6366f1",
      }}
    >
      {/* Title row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
          Today's Habits
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: done === total && total > 0 ? "#22c55e" : "#6366f1",
        }}>
          {done}/{total} done
        </div>
      </div>

      {/* Habit emoji circles */}
      {scheduled.length === 0 ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>No habits scheduled today</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {scheduled.map((habit) => {
            const doneToday = !!(habit.logs || {})[today];
            return (
              <motion.button
                key={habit.id}
                whileTap={{ scale: 0.85 }}
                onClick={(e) => handleToggle(e, habit.id)}
                title={habit.name}
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  border: `2px solid ${doneToday ? habit.color : "rgba(255,255,255,0.2)"}`,
                  background: doneToday ? habit.color : "transparent",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                  transition: "all 0.15s",
                }}
              >
                {habit.emoji}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ marginTop: 12, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
            style={{ height: "100%", background: "#6366f1", borderRadius: 99 }}
          />
        </div>
      )}
    </motion.div>
  );
}
