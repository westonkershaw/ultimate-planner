/* eslint-disable */
import React, { useState, useRef, useCallback, useMemo } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return `${mon.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sun.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

const localDate = (d = new Date()) => d.toLocaleDateString("en-CA");

function getLast30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(localDate(d));
  }
  return days;
}

function getThisWeekKeys() {
  const keys = [];
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    keys.push(localDate(d));
  }
  return keys;
}

// ─── Colour Themes ────────────────────────────────────────────────────────────

const THEMES = {
  "Dark Indigo": {
    bg: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    accent: "#2dd4bf",
    accent2: "#14b8a6",
    text: "#f8fafc",
    sub: "#a5b4fc",
    card: "rgba(45, 212, 191,0.15)",
    border: "rgba(129,140,248,0.3)",
  },
  Midnight: {
    bg: "linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #16213e 100%)",
    accent: "#64ffda",
    accent2: "#00b4d8",
    text: "#e2e8f0",
    sub: "#94a3b8",
    card: "rgba(100,255,218,0.08)",
    border: "rgba(100,255,218,0.2)",
  },
  Forest: {
    bg: "linear-gradient(135deg, #0a2e0a 0%, #1a4a1a 50%, #0d3b0d 100%)",
    accent: "#4ade80",
    accent2: "#22c55e",
    text: "#f0fdf4",
    sub: "#86efac",
    card: "rgba(74,222,128,0.1)",
    border: "rgba(74,222,128,0.25)",
  },
  Sunset: {
    bg: "linear-gradient(135deg, #1a0a00 0%, #3d1200 50%, #2d0a0a 100%)",
    accent: "#fb923c",
    accent2: "#f97316",
    text: "#fff7ed",
    sub: "#fdba74",
    card: "rgba(251,146,60,0.12)",
    border: "rgba(251,146,60,0.3)",
  },
  Ocean: {
    bg: "linear-gradient(135deg, #001219 0%, #005f73 50%, #0a9396 100%)",
    accent: "#94d2bd",
    accent2: "#0a9396",
    text: "#f0fdfa",
    sub: "#a8dadc",
    card: "rgba(148,210,189,0.12)",
    border: "rgba(148,210,189,0.25)",
  },
  Rose: {
    bg: "linear-gradient(135deg, #1a0010 0%, #4a0020 50%, #2d0018 100%)",
    accent: "#fb7185",
    accent2: "#f43f5e",
    text: "#fff1f2",
    sub: "#fda4af",
    card: "rgba(251,113,133,0.12)",
    border: "rgba(251,113,133,0.3)",
  },
};

// ─── Card: Week Summary ───────────────────────────────────────────────────────

function WeekSummaryCard({ data, theme, fontSize, showStats }) {
  const t = THEMES[theme];
  const fs = fontSize === "Large" ? 1.2 : 1;

  const weekKeys = getThisWeekKeys();
  const weekDays = data.weekDays || {};

  let totalTasks = 0;
  let doneTasks = 0;
  weekKeys.forEach((k) => {
    const day = weekDays[k];
    if (!day) return;
    const tasks = day.tasks || [];
    totalTasks += tasks.length;
    doneTasks += tasks.filter((t2) => t2.done).length;
  });

  const habits = (data.customHabits || []).slice(0, 3);

  const workouts = (data.workoutHistory || []).filter((w) => {
    const d = new Date(w.date);
    const now = new Date();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return d >= mon;
  });
  const bestWorkout = [...workouts].sort((a, b) => (b.duration || 0) - (a.duration || 0))[0];

  const moodLog = data.moodLog || {};
  const moodValues = weekKeys.map((k) => moodLog[k]).filter(Boolean);
  const avgMood = moodValues.length
    ? (moodValues.reduce((a, b) => a + Number(b), 0) / moodValues.length).toFixed(1)
    : null;

  const moodEmojis = ["", "😞", "😕", "😐", "😊", "😄"];

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        padding: 80,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: t.text,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -120, right: -120, width: 400, height: 400, borderRadius: "50%", background: t.accent2, opacity: 0.08 }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: t.accent, opacity: 0.06 }} />

      {/* Header */}
      <div style={{ marginBottom: 60 }}>
        <div style={{ fontSize: 28 * fs, color: t.sub, fontWeight: 500, marginBottom: 8, letterSpacing: 3, textTransform: "uppercase" }}>
          📅 My Week
        </div>
        <div style={{ fontSize: 52 * fs, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1 }}>
          {getWeekRange()}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, flex: 1 }}>
        {showStats.tasks && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 24, padding: 40 }}>
            <div style={{ fontSize: 22 * fs, color: t.sub, marginBottom: 16 }}>Tasks Completed</div>
            <div style={{ fontSize: 72 * fs, fontWeight: 900, color: t.accent, lineHeight: 1 }}>
              {doneTasks}
              <span style={{ fontSize: 36 * fs, color: t.sub, fontWeight: 500 }}>/{totalTasks}</span>
            </div>
            {totalTasks > 0 && (
              <div style={{ marginTop: 16, height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${Math.round((doneTasks / totalTasks) * 100)}%`, height: "100%", background: t.accent, borderRadius: 4 }} />
              </div>
            )}
          </div>
        )}

        {showStats.mood && avgMood && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 24, padding: 40 }}>
            <div style={{ fontSize: 22 * fs, color: t.sub, marginBottom: 16 }}>Avg Mood</div>
            <div style={{ fontSize: 72 * fs, fontWeight: 900, color: t.accent, lineHeight: 1 }}>
              {moodEmojis[Math.round(Number(avgMood))] || avgMood}
            </div>
            <div style={{ fontSize: 28 * fs, color: t.sub, marginTop: 8 }}>{avgMood} / 5</div>
          </div>
        )}

        {showStats.habits && habits.length > 0 && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 24, padding: 40 }}>
            <div style={{ fontSize: 22 * fs, color: t.sub, marginBottom: 20 }}>Top Habits</div>
            {habits.map((h) => (
              <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 22 * fs, fontWeight: 600 }}>{h.emoji || "✅"} {h.name}</span>
                <span style={{ fontSize: 22 * fs, color: t.accent, fontWeight: 700 }}>🔥{h.streak || 0}</span>
              </div>
            ))}
          </div>
        )}

        {showStats.workout && bestWorkout && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 24, padding: 40 }}>
            <div style={{ fontSize: 22 * fs, color: t.sub, marginBottom: 16 }}>Best Workout</div>
            <div style={{ fontSize: 36 * fs, fontWeight: 700, lineHeight: 1.3 }}>{bestWorkout.name || bestWorkout.type || "Workout"}</div>
            <div style={{ fontSize: 24 * fs, color: t.accent, marginTop: 12 }}>
              {bestWorkout.duration ? `${bestWorkout.duration} min` : ""}
              {bestWorkout.calories ? ` · ${bestWorkout.calories} cal` : ""}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 20 * fs, color: t.sub, opacity: 0.6 }}>Ultimate Life Planner</div>
        <div style={{ fontSize: 20 * fs, color: t.sub, opacity: 0.6 }}>
          {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}

// ─── Card: Goal Milestone ─────────────────────────────────────────────────────

function GoalMilestoneCard({ data, theme, fontSize, showStats, selectedGoalId }) {
  const t = THEMES[theme];
  const fs = fontSize === "Large" ? 1.2 : 1;

  const goals = data.yearlyGoals || [];
  const goal = goals.find((g) => g.id === selectedGoalId) || goals[0];

  if (!goal) {
    return (
      <div style={{ width: 1080, height: 1080, background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: t.sub, fontSize: 40, gap: 24 }}>
        <div style={{ fontSize: 80 }}>🎯</div>
        <div>Add goals first</div>
        <div style={{ fontSize: 24, opacity: 0.5 }}>Head to the Goals tab to set your first goal.</div>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, Math.round(((goal.current || 0) / (goal.target || 1)) * 100)));
  const r = 200;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: t.text,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <div style={{ position: "absolute", top: -150, left: -150, width: 500, height: 500, borderRadius: "50%", background: t.accent2, opacity: 0.06 }} />
      <div style={{ position: "absolute", bottom: -100, right: -100, width: 350, height: 350, borderRadius: "50%", background: t.accent, opacity: 0.07 }} />

      <div style={{ fontSize: 28 * fs, color: t.sub, letterSpacing: 4, textTransform: "uppercase", marginBottom: 32 }}>🎯 Goal Milestone</div>

      <div style={{ fontSize: 48 * fs, fontWeight: 800, maxWidth: 700, lineHeight: 1.2, marginBottom: 60 }}>{goal.title || goal.name}</div>

      {/* Arc */}
      <div style={{ position: "relative", width: 480, height: 480, marginBottom: 40 }}>
        <svg width="480" height="480" style={{ position: "absolute", top: 0, left: 0 }}>
          <circle cx="240" cy="240" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="24" />
          <circle
            cx="240"
            cy="240"
            r={r}
            fill="none"
            stroke={t.accent}
            strokeWidth="24"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 240 240)"
            style={{ filter: `drop-shadow(0 0 12px ${t.accent})` }}
          />
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
          <div style={{ fontSize: 100 * fs, fontWeight: 900, color: t.accent, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 24 * fs, color: t.sub, marginTop: 8 }}>Complete</div>
        </div>
      </div>

      {showStats.progress && (
        <div style={{ fontSize: 30 * fs, color: t.sub, fontStyle: "italic" }}>
          {pct}% closer to{" "}
          <span style={{ color: t.accent, fontWeight: 700 }}>"{goal.title || goal.name}"</span>
        </div>
      )}

      {showStats.values && (
        <div style={{ marginTop: 32, display: "flex", gap: 60, justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40 * fs, fontWeight: 800, color: t.accent }}>{goal.current || 0}</div>
            <div style={{ fontSize: 20 * fs, color: t.sub }}>Current</div>
          </div>
          <div style={{ width: 1, background: t.border }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40 * fs, fontWeight: 800 }}>{goal.target || 0}</div>
            <div style={{ fontSize: 20 * fs, color: t.sub }}>Target</div>
          </div>
        </div>
      )}

      <div style={{ position: "absolute", bottom: 48, fontSize: 20 * fs, color: t.sub, opacity: 0.5 }}>Ultimate Life Planner</div>
    </div>
  );
}

// ─── Card: Habit Streak ───────────────────────────────────────────────────────

function HabitStreakCard({ data, theme, fontSize, showStats, selectedHabitId }) {
  const t = THEMES[theme];
  const fs = fontSize === "Large" ? 1.2 : 1;

  const habits = data.customHabits || [];
  const habit = habits.find((h) => h.id === selectedHabitId) || habits[0];

  const last30 = getLast30Days();

  if (!habit) {
    return (
      <div style={{ width: 1080, height: 1080, background: "linear-gradient(135deg,#1a0a00,#3d1200)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fdba74", fontSize: 40, fontFamily: "system-ui" }}>
        No habits found. Add a habit first.
      </div>
    );
  }

  const completions = habit.completions || {};
  const streak = habit.streak || 0;

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: t.text,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <div style={{ position: "absolute", top: -100, right: -100, width: 450, height: 450, borderRadius: "50%", background: "#f97316", opacity: 0.07 }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "#fb923c", opacity: 0.06 }} />

      <div style={{ fontSize: 28 * fs, color: t.sub, letterSpacing: 4, textTransform: "uppercase", marginBottom: 32 }}>🔥 Habit Streak</div>

      <div style={{ fontSize: 56 * fs, fontWeight: 800, marginBottom: 40 }}>
        {habit.emoji || "✅"} {habit.name}
      </div>

      <div style={{ fontSize: 200 * fs, fontWeight: 900, color: t.accent, lineHeight: 0.9, filter: `drop-shadow(0 0 40px ${t.accent}88)` }}>
        {streak}
      </div>
      <div style={{ fontSize: 36 * fs, color: t.sub, marginTop: 16, marginBottom: 60, letterSpacing: 4, textTransform: "uppercase" }}>
        Day Streak
      </div>

      {showStats.heatmap && (
        <div>
          <div style={{ fontSize: 20 * fs, color: t.sub, marginBottom: 20, letterSpacing: 2, textTransform: "uppercase" }}>Last 30 Days</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 700 }}>
            {last30.map((d) => {
              const done = completions[d];
              return (
                <div
                  key={d}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: done ? t.accent : "rgba(255,255,255,0.08)",
                    border: `1px solid ${done ? t.accent : "rgba(255,255,255,0.1)"}`,
                    boxShadow: done ? `0 0 8px ${t.accent}66` : "none",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      <div style={{ position: "absolute", bottom: 48, fontSize: 20 * fs, color: t.sub, opacity: 0.5 }}>Ultimate Life Planner</div>
    </div>
  );
}

// ─── Card: Workout PR ─────────────────────────────────────────────────────────

function WorkoutPRCard({ data, theme, fontSize, showStats }) {
  const t = THEMES[theme];
  const fs = fontSize === "Large" ? 1.2 : 1;

  const history = data.workoutHistory || [];

  // Find best by weight lifted
  let pr = null;
  history.forEach((session) => {
    const exercises = session.exercises || [];
    exercises.forEach((ex) => {
      const sets = ex.sets || [];
      sets.forEach((s) => {
        if (!pr || (s.weight && Number(s.weight) > Number(pr.weight || 0))) {
          pr = { exercise: ex.name, weight: s.weight, reps: s.reps, date: session.date, sessionName: session.name };
        }
      });
    });
  });

  if (history.length === 0) {
    return (
      <div style={{ width: 1080, height: 1080, background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: t.sub, fontSize: 40, fontFamily: "system-ui", gap: 24 }}>
        <div style={{ fontSize: 80 }}>💪</div>
        <div>No workouts logged yet</div>
        <div style={{ fontSize: 24, opacity: 0.5 }}>Start tracking your workouts to see your PRs here.</div>
      </div>
    );
  }

  const display = pr || { exercise: "Workout", weight: "—", reps: "—", date: new Date().toISOString(), sessionName: history[0]?.name };

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: t.text,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <div style={{ position: "absolute", top: -120, left: -120, width: 480, height: 480, borderRadius: "50%", background: "#d97706", opacity: 0.08 }} />
      <div style={{ position: "absolute", bottom: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "#f59e0b", opacity: 0.07 }} />

      {/* PR Badge */}
      <div style={{
        background: "linear-gradient(135deg,#d97706,#f59e0b)",
        borderRadius: 16,
        padding: "12px 40px",
        fontSize: 28 * fs,
        fontWeight: 800,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: "#000",
        marginBottom: 48,
        boxShadow: "0 8px 32px rgba(245,158,11,0.4)",
      }}>
        🏆 Personal Record
      </div>

      <div style={{ fontSize: 28 * fs, color: t.sub, letterSpacing: 4, textTransform: "uppercase", marginBottom: 20 }}>💪 Workout Achievement</div>

      <div style={{ fontSize: 72 * fs, fontWeight: 900, lineHeight: 1.1, marginBottom: 16 }}>{display.exercise}</div>

      {showStats.weight && display.weight && display.weight !== "—" && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 48 }}>
          <span style={{ fontSize: 120 * fs, fontWeight: 900, color: "#f59e0b", lineHeight: 1, filter: "drop-shadow(0 0 24px rgba(245,158,11,0.6))" }}>
            {display.weight}
          </span>
          <span style={{ fontSize: 44 * fs, color: t.sub }}>lbs</span>
          {showStats.reps && display.reps && (
            <>
              <span style={{ fontSize: 36 * fs, color: t.sub }}>×</span>
              <span style={{ fontSize: 64 * fs, fontWeight: 800 }}>{display.reps}</span>
              <span style={{ fontSize: 36 * fs, color: t.sub }}>reps</span>
            </>
          )}
        </div>
      )}

      {showStats.date && display.date && (
        <div style={{ fontSize: 28 * fs, color: t.sub, marginTop: 8 }}>Achieved {formatDate(display.date)}</div>
      )}

      <div style={{ position: "absolute", bottom: 48, fontSize: 20 * fs, color: t.sub, opacity: 0.5 }}>Ultimate Life Planner</div>
    </div>
  );
}

// ─── Card: Reading Stats ──────────────────────────────────────────────────────

function ReadingStatsCard({ data, theme, fontSize, showStats }) {
  const t = THEMES[theme];
  const fs = fontSize === "Large" ? 1.2 : 1;

  const books = data.readingList || [];
  const thisYear = new Date().getFullYear();
  const readThisYear = books.filter((b) => b.status === "read" && b.finishedAt && new Date(b.finishedAt).getFullYear() === thisYear);
  const currentBook = books.find((b) => b.status === "reading");
  const totalPages = books.reduce((acc, b) => acc + (b.pages || 0), 0);

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        padding: 80,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: t.text,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "#7c3aed", opacity: 0.1 }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 280, height: 280, borderRadius: "50%", background: "#a855f7", opacity: 0.08 }} />

      <div style={{ fontSize: 28 * fs, color: t.sub, letterSpacing: 4, textTransform: "uppercase", marginBottom: 32 }}>📚 Reading Stats</div>
      <div style={{ fontSize: 64 * fs, fontWeight: 800, lineHeight: 1.1, marginBottom: 60 }}>{thisYear} Reading Wrap</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, flex: 1 }}>
        {showStats.booksRead && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 24, padding: 40, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 22 * fs, color: t.sub, marginBottom: 12 }}>Books Read</div>
            <div style={{ fontSize: 100 * fs, fontWeight: 900, color: t.accent, lineHeight: 1 }}>{readThisYear.length}</div>
            <div style={{ fontSize: 22 * fs, color: t.sub, marginTop: 8 }}>this year</div>
          </div>
        )}

        {showStats.pages && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 24, padding: 40, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 22 * fs, color: t.sub, marginBottom: 12 }}>Pages Read</div>
            <div style={{ fontSize: 72 * fs, fontWeight: 900, color: t.accent, lineHeight: 1 }}>{totalPages.toLocaleString()}</div>
            <div style={{ fontSize: 22 * fs, color: t.sub, marginTop: 8 }}>total pages</div>
          </div>
        )}

        {showStats.currentBook && currentBook && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 24, padding: 40, gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 22 * fs, color: t.sub, marginBottom: 16 }}>Currently Reading</div>
            <div style={{ fontSize: 40 * fs, fontWeight: 700, lineHeight: 1.3 }}>{currentBook.title}</div>
            {currentBook.author && (
              <div style={{ fontSize: 26 * fs, color: t.sub, marginTop: 12 }}>by {currentBook.author}</div>
            )}
            {currentBook.progress != null && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 20 * fs, color: t.sub }}>Progress</span>
                  <span style={{ fontSize: 20 * fs, color: t.accent }}>{currentBook.progress}%</span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${currentBook.progress}%`, height: "100%", background: t.accent, borderRadius: 4 }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 20 * fs, color: t.sub, opacity: 0.5 }}>Ultimate Life Planner</div>
        <div style={{ fontSize: 20 * fs, color: t.sub, opacity: 0.5 }}>{thisYear}</div>
      </div>
    </div>
  );
}

// ─── Card: Net Worth ──────────────────────────────────────────────────────────

function NetWorthCard({ data, theme, fontSize, showStats }) {
  const t = THEMES[theme];
  const fs = fontSize === "Large" ? 1.2 : 1;

  const assets = data.netWorthAssets || [];
  const liabilities = data.netWorthLiabilities || [];

  const totalAssets = assets.reduce((a, item) => a + Number(item.value || 0), 0);
  const totalLiab = liabilities.reduce((a, item) => a + Number(item.value || 0), 0);
  const netWorth = totalAssets - totalLiab;

  // Financial health score: simple ratio of assets/liabilities
  function getGrade() {
    if (totalLiab === 0 && totalAssets > 0) return "A+";
    if (totalLiab === 0) return "—";
    const ratio = totalAssets / totalLiab;
    if (ratio >= 5) return "A";
    if (ratio >= 3) return "B";
    if (ratio >= 1.5) return "C";
    if (ratio >= 1) return "D";
    return "F";
  }
  const grade = getGrade();

  function formatMoney(n) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toLocaleString()}`;
  }

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        padding: 80,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: t.text,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", top: -120, right: -120, width: 420, height: 420, borderRadius: "50%", background: "#065f46", opacity: 0.2 }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "#10b981", opacity: 0.08 }} />

      <div style={{ fontSize: 28 * fs, color: t.sub, letterSpacing: 4, textTransform: "uppercase", marginBottom: 32 }}>💰 Financial Health</div>
      <div style={{ fontSize: 64 * fs, fontWeight: 800, lineHeight: 1.1, marginBottom: 60 }}>Net Worth Snapshot</div>

      {/* Main net worth */}
      {showStats.netWorth && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 24, padding: 48, marginBottom: 28 }}>
          <div style={{ fontSize: 24 * fs, color: t.sub, marginBottom: 16 }}>Current Net Worth</div>
          <div style={{
            fontSize: 96 * fs,
            fontWeight: 900,
            color: netWorth >= 0 ? t.accent : "#f87171",
            lineHeight: 1,
            filter: `drop-shadow(0 0 20px ${netWorth >= 0 ? t.accent : "#f87171"}44)`,
          }}>
            {formatMoney(netWorth)}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        {showStats.assets && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 20 * fs, color: t.sub, marginBottom: 12 }}>Assets</div>
            <div style={{ fontSize: 44 * fs, fontWeight: 800, color: t.accent }}>{formatMoney(totalAssets)}</div>
          </div>
        )}
        {showStats.liabilities && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 20 * fs, color: t.sub, marginBottom: 12 }}>Liabilities</div>
            <div style={{ fontSize: 44 * fs, fontWeight: 800, color: "#f87171" }}>{formatMoney(totalLiab)}</div>
          </div>
        )}
        {showStats.grade && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 20 * fs, color: t.sub, marginBottom: 12 }}>Health Score</div>
            <div style={{ fontSize: 64 * fs, fontWeight: 900, color: t.accent }}>{grade}</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: "auto", paddingTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 20 * fs, color: t.sub, opacity: 0.5 }}>Ultimate Life Planner · Private</div>
        <div style={{ fontSize: 20 * fs, color: t.sub, opacity: 0.5 }}>{formatDate(new Date())}</div>
      </div>
    </div>
  );
}

// ─── Card Router ──────────────────────────────────────────────────────────────

function CardRenderer({ cardType, data, theme, fontSize, showStats, selectedGoalId, selectedHabitId }) {
  const props = { data, theme, fontSize, showStats };
  switch (cardType) {
    case "week":     return <WeekSummaryCard    {...props} />;
    case "goal":     return <GoalMilestoneCard  {...props} selectedGoalId={selectedGoalId} />;
    case "habit":    return <HabitStreakCard     {...props} selectedHabitId={selectedHabitId} />;
    case "workout":  return <WorkoutPRCard       {...props} />;
    case "reading":  return <ReadingStatsCard    {...props} />;
    case "networth": return <NetWorthCard        {...props} />;
    default:         return null;
  }
}

// ─── Default showStats per card type ─────────────────────────────────────────

const DEFAULT_SHOW_STATS = {
  week:     { tasks: true, mood: true, habits: true, workout: true },
  goal:     { progress: true, values: true },
  habit:    { heatmap: true },
  workout:  { weight: true, reps: true, date: true },
  reading:  { booksRead: true, pages: true, currentBook: true },
  networth: { netWorth: true, assets: true, liabilities: true, grade: true },
};

const STAT_LABELS = {
  week:     { tasks: "Tasks", mood: "Mood", habits: "Habits", workout: "Workout" },
  goal:     { progress: "Motivational Text", values: "Current / Target" },
  habit:    { heatmap: "30-Day Heatmap" },
  workout:  { weight: "Weight", reps: "Reps", date: "Date" },
  reading:  { booksRead: "Books Read", pages: "Pages", currentBook: "Current Book" },
  networth: { netWorth: "Net Worth", assets: "Assets", liabilities: "Liabilities", grade: "Health Grade" },
};

// ─── Card Type Buttons ────────────────────────────────────────────────────────

const CARD_TYPES = [
  { id: "week",     label: "Week Summary",   emoji: "📅" },
  { id: "goal",     label: "Goal Milestone", emoji: "🎯" },
  { id: "habit",    label: "Habit Streak",   emoji: "🔥" },
  { id: "workout",  label: "Workout PR",     emoji: "💪" },
  { id: "reading",  label: "Reading Stats",  emoji: "📚" },
  { id: "networth", label: "Net Worth",      emoji: "💰" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SocialCardsTab({ data, onChange }) {
  const [cardType, setCardType] = useState("week");
  const [theme, setTheme] = useState("Dark Indigo");
  const [fontSize, setFontSize] = useState("Normal");
  const [showStats, setShowStats] = useState(DEFAULT_SHOW_STATS.week);
  const [selectedGoalId, setSelectedGoalId] = useState(
    (data?.yearlyGoals?.[0]?.id) || null
  );
  const [selectedHabitId, setSelectedHabitId] = useState(
    (data?.customHabits?.[0]?.id) || null
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(""); // "", "generating", "done", "error"
  const [toastMsg, setToastMsg] = useState("");

  const cardRef = useRef(null);

  // When card type changes, reset showStats
  const handleCardTypeChange = useCallback((id) => {
    setCardType(id);
    setShowStats({ ...DEFAULT_SHOW_STATS[id] });
  }, []);

  const toggleStat = useCallback((key) => {
    setShowStats((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Export helpers ──────────────────────────────────────────────────────────

  async function captureCanvas() {
    const html2canvas = (await import("html2canvas")).default;
    const el = document.getElementById("social-card-preview");
    const canvas = await html2canvas(el, {
      backgroundColor: "#0d1117",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return canvas;
  }

  async function downloadCard() {
    setIsExporting(true);
    setExportStatus("generating");
    try {
      const canvas = await captureCanvas();
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `ultimate-planner-${cardType}-card.png`;
      a.click();
      setExportStatus("done");
    } catch (e) {
      console.error(e);
      setExportStatus("error");
      setToastMsg("Could not export. Try again."); setTimeout(() => setToastMsg(""), 3000);
    } finally {
      setIsExporting(false);
    }
  }

  async function shareCard() {
    setIsExporting(true);
    setExportStatus("generating");
    try {
      const canvas = await captureCanvas();
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      const file = new File([blob], `ultimate-planner-card.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Ultimate Life Planner Card" });
      } else {
        // Fallback: download if share not available
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ultimate-planner-card.png";
        a.click();
        URL.revokeObjectURL(url);
      }
      setExportStatus("done");
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error(e);
        setExportStatus("error");
        setToastMsg("Could not export. Try again."); setTimeout(() => setToastMsg(""), 3000);
      } else {
        setExportStatus("");
      }
    } finally {
      setIsExporting(false);
    }
  }

  async function copyCard() {
    setIsExporting(true);
    setExportStatus("generating");
    try {
      const canvas = await captureCanvas();
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setExportStatus("done");
    } catch (e) {
      console.error(e);
      setExportStatus("error");
      setToastMsg("Could not export. Try again."); setTimeout(() => setToastMsg(""), 3000);
    } finally {
      setIsExporting(false);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const goals  = useMemo(() => data?.yearlyGoals  || [], [data]);
  const habits = useMemo(() => data?.customHabits || [], [data]);

  const statKeys   = Object.keys(STAT_LABELS[cardType] || {});
  const themeNames = Object.keys(THEMES);

  // ── Styles ──────────────────────────────────────────────────────────────────

  const s = {
    root: {
      display: "flex",
      height: "100%",
      minHeight: 0,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      background: "#08090d",
      color: "#e2e8f0",
    },
    sidebar: {
      width: 240,
      flexShrink: 0,
      borderRight: "1px solid #1e293b",
      display: "flex",
      flexDirection: "column",
      padding: 20,
      gap: 8,
      overflowY: "auto",
    },
    sidebarHeading: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: "#475569",
      marginBottom: 4,
      marginTop: 8,
    },
    cardBtn: (active) => ({
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      borderRadius: 10,
      border: active ? "1px solid #14b8a6" : "1px solid transparent",
      background: active ? "rgba(45, 212, 191,0.15)" : "transparent",
      color: active ? "#a5b4fc" : "#94a3b8",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      textAlign: "left",
      transition: "all 0.15s",
    }),
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
      overflow: "hidden",
    },
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 24px",
      borderBottom: "1px solid #1e293b",
      flexShrink: 0,
      gap: 16,
      flexWrap: "wrap",
    },
    controls: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    label: {
      fontSize: 12,
      color: "#64748b",
      marginRight: 4,
    },
    select: {
      background: "#0f172a",
      border: "1px solid #1e293b",
      color: "#e2e8f0",
      borderRadius: 8,
      padding: "6px 10px",
      fontSize: 13,
      cursor: "pointer",
    },
    exportBtns: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
    },
    exportBtn: (loading) => ({
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 16px",
      borderRadius: 8,
      border: "1px solid #334155",
      background: loading ? "#1e293b" : "#0f172a",
      color: loading ? "#475569" : "#e2e8f0",
      cursor: loading ? "not-allowed" : "pointer",
      fontSize: 13,
      fontWeight: 500,
      transition: "all 0.15s",
    }),
    previewArea: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      overflowY: "auto",
      gap: 20,
    },
    previewWrapper: {
      width: "min(432px, 80vw)",
      height: "min(432px, 80vw)",
      overflow: "hidden",
      borderRadius: 16,
      border: "1px solid #1e293b",
      boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      position: "relative",
      flexShrink: 0,
    },
    previewInner: {
      transformOrigin: "top left",
      transform: `scale(${typeof window !== "undefined" && window.innerWidth < 500 ? 0.3 : 0.4})`,
      width: 1080,
      height: 1080,
      pointerEvents: "none",
    },
    loadingOverlay: {
      position: "absolute",
      inset: 0,
      background: "rgba(8,9,13,0.85)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      gap: 12,
      fontSize: 16,
      color: "#a5b4fc",
      zIndex: 10,
    },
    configPanel: {
      display: "flex",
      gap: 24,
      flexWrap: "wrap",
      justifyContent: "center",
      paddingTop: 8,
    },
    configSection: {
      background: "#0f172a",
      border: "1px solid #1e293b",
      borderRadius: 12,
      padding: "14px 18px",
      minWidth: 160,
    },
    configTitle: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: "#475569",
      marginBottom: 10,
    },
    checkRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      fontSize: 13,
      color: "#94a3b8",
      cursor: "pointer",
    },
    checkbox: {
      accentColor: "#14b8a6",
      width: 14,
      height: 14,
      cursor: "pointer",
    },
    themeDot: (name, active) => ({
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: THEMES[name].accent2,
      border: active ? `3px solid ${THEMES[name].accent}` : "3px solid transparent",
      cursor: "pointer",
      outline: active ? `2px solid ${THEMES[name].accent}` : "none",
      outlineOffset: 2,
      flexShrink: 0,
      transition: "all 0.15s",
      title: name,
    }),
    statusBadge: (status) => ({
      padding: "4px 12px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: status === "done" ? "rgba(74,222,128,0.15)" : status === "error" ? "rgba(248,113,113,0.15)" : "rgba(45, 212, 191,0.15)",
      color: status === "done" ? "#4ade80" : status === "error" ? "#f87171" : "#a5b4fc",
    }),
    spinner: {
      width: 32,
      height: 32,
      border: "3px solid rgba(45, 212, 191,0.2)",
      borderTop: "3px solid #14b8a6",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    },
  };

  return (
    <div style={s.root}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Sidebar ── */}
      <div style={s.sidebar}>
        <div style={s.sidebarHeading}>Card Type</div>
        {CARD_TYPES.map((ct) => (
          <button key={ct.id} style={s.cardBtn(cardType === ct.id)} onClick={() => handleCardTypeChange(ct.id)}>
            <span style={{ fontSize: 18 }}>{ct.emoji}</span>
            <span>{ct.label}</span>
          </button>
        ))}

        {/* Context-sensitive selectors */}
        {cardType === "goal" && goals.length > 0 && (
          <>
            <div style={{ ...s.sidebarHeading, marginTop: 16 }}>Select Goal</div>
            <select
              style={{ ...s.select, width: "100%", marginTop: 2 }}
              value={selectedGoalId || ""}
              onChange={(e) => setSelectedGoalId(e.target.value)}
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.title || g.name}</option>
              ))}
            </select>
          </>
        )}

        {cardType === "habit" && habits.length > 0 && (
          <>
            <div style={{ ...s.sidebarHeading, marginTop: 16 }}>Select Habit</div>
            <select
              style={{ ...s.select, width: "100%", marginTop: 2 }}
              value={selectedHabitId || ""}
              onChange={(e) => setSelectedHabitId(e.target.value)}
            >
              {habits.map((h) => (
                <option key={h.id} value={h.id}>{h.emoji || "✅"} {h.name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* ── Main ── */}
      <div style={s.main}>
        {/* Top bar: theme, font size, export */}
        <div style={s.topBar}>
          <div style={s.controls}>
            <span style={s.label}>Theme</span>
            {themeNames.map((name) => (
              <div
                key={name}
                style={s.themeDot(name, theme === name)}
                onClick={() => setTheme(name)}
                title={name}
              />
            ))}
            <span style={{ ...s.label, marginLeft: 8 }}>Font</span>
            <select style={s.select} value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
              <option>Normal</option>
              <option>Large</option>
            </select>
          </div>

          <div style={s.exportBtns}>
            {exportStatus && (
              <span style={s.statusBadge(exportStatus)}>
                {exportStatus === "generating" && "Generating..."}
                {exportStatus === "done" && "Done!"}
                {exportStatus === "error" && "Error"}
              </span>
            )}
            <button style={s.exportBtn(isExporting)} disabled={isExporting} onClick={downloadCard}>
              ⬇️ Download PNG
            </button>
            <button style={s.exportBtn(isExporting)} disabled={isExporting} onClick={shareCard}>
              📤 Share
            </button>
            <button style={s.exportBtn(isExporting)} disabled={isExporting} onClick={copyCard}>
              📋 Copy
            </button>
          </div>
        </div>

        {/* Preview + config */}
        <div style={s.previewArea}>
          {/* Card Preview */}
          <div style={s.previewWrapper}>
            {isExporting && (
              <div style={s.loadingOverlay}>
                <div style={s.spinner} />
                <span>Generating image...</span>
              </div>
            )}
            <div id="social-card-preview" style={s.previewInner} ref={cardRef}>
              <CardRenderer
                cardType={cardType}
                data={data || {}}
                theme={theme}
                fontSize={fontSize}
                showStats={showStats}
                selectedGoalId={selectedGoalId}
                selectedHabitId={selectedHabitId}
              />
            </div>
          </div>

          {/* Config panel */}
          <div style={s.configPanel}>
            {statKeys.length > 0 && (
              <div style={s.configSection}>
                <div style={s.configTitle}>Show / Hide</div>
                {statKeys.map((key) => (
                  <label key={key} style={s.checkRow}>
                    <input
                      type="checkbox"
                      style={s.checkbox}
                      checked={!!showStats[key]}
                      onChange={() => toggleStat(key)}
                    />
                    {STAT_LABELS[cardType][key]}
                  </label>
                ))}
              </div>
            )}

            <div style={s.configSection}>
              <div style={s.configTitle}>Theme Info</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                <div style={{ color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>{theme}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: THEMES[theme].accent }} />
                  <span>Accent</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: THEMES[theme].accent2 }} />
                  <span>Secondary</span>
                </div>
              </div>
            </div>

            <div style={s.configSection}>
              <div style={s.configTitle}>Export Size</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.8 }}>
                <div>Canvas: 1080 × 1080 px</div>
                <div>Export: 2160 × 2160 px</div>
                <div style={{ color: "#475569", marginTop: 4 }}>2× Retina quality</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toastMsg && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#ef4444", color: "#fff", padding: "12px 20px", borderRadius: 8, zIndex: 9999, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", boxShadow: "0 8px 24px rgba(239,68,68,0.4)" }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
