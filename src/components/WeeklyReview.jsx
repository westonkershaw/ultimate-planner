/* eslint-disable */
import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { calcWeeklyScore, calcLetterGrade } from "../utils/math";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const GREEN  = "#34c98a";
const YELLOW = "#fbbf24";
const RED    = "#f87171";
const BLUE   = "#4f9cf9";
const PURPLE = "#c084fc";
const TEAL   = "#14b8a6";

function pctColor(pct) {
  if (pct >= 80) return GREEN;
  if (pct >= 50) return YELLOW;
  return RED;
}

function sleepColor(h) {
  const n = parseFloat(h);
  if (n >= 7.5) return GREEN;
  if (n >= 6)   return YELLOW;
  return RED;
}

function weekRange() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

function buildAutoSummary(stats) {
  const { completionPct, workoutCount, totalSets, avgSleep, avgMood, habitCompletionPct, habitsLogged, habitsTotal } = stats;
  const wentWell = [
    completionPct >= 80
      ? `Crushed ${completionPct}% of tasks this week`
      : completionPct >= 50
      ? `Completed ${completionPct}% of planned tasks`
      : null,
    workoutCount > 0
      ? `Hit ${workoutCount} workout${workoutCount > 1 ? "s" : ""} (${totalSets} sets)`
      : null,
    avgSleep && parseFloat(avgSleep) >= 7
      ? `Averaged ${avgSleep}h sleep`
      : null,
    habitCompletionPct >= 70
      ? `Tracked ${habitsLogged}/${habitsTotal} habits (${habitCompletionPct}%)`
      : null,
    avgMood && parseFloat(avgMood) >= 4
      ? `Mood averaged ${avgMood}/5 — great week`
      : null,
  ]
    .filter(Boolean)
    .join(". ");

  const improve = [
    completionPct < 50 ? "Improve task completion rate" : null,
    avgSleep && parseFloat(avgSleep) < 6 ? "Prioritize getting more sleep" : null,
    workoutCount === 0 ? "Add at least one workout next week" : null,
    habitsTotal > 0 && habitCompletionPct < 50 ? "Focus on logging habits daily" : null,
    avgMood && parseFloat(avgMood) < 3 ? "Check in with yourself — mood has been low" : null,
  ]
    .filter(Boolean)
    .join(". ");

  return {
    wentWell: wentWell || "Showed up and put in effort this week.",
    improve:  improve  || "Keep building on this week's momentum.",
  };
}

function buildSuggestedActions(stats) {
  const actions = [];
  if (stats.completionPct < 50 && stats.allTasksCount > 5) actions.push("Reduce your task list to 3-5 high-priority items");
  if (stats.workoutCount === 0) actions.push("Schedule a 20-minute workout for Monday");
  if (stats.avgSleep && parseFloat(stats.avgSleep) < 6.5) actions.push("Set a bedtime alarm 30 minutes earlier");
  if (stats.habitsTotal > 0 && stats.habitCompletionPct < 40) actions.push("Pick your top 2 habits and focus on just those");
  if (stats.thisWeekSpend > stats.lastWeekSpend * 1.3 && stats.lastWeekSpend > 0) actions.push("Review this week's spending for unnecessary expenses");
  if (stats.avgMood && parseFloat(stats.avgMood) < 2.5) actions.push("Try journaling or a short walk to improve mood");
  if (actions.length === 0) actions.push("Keep up this pace — you're doing great");
  return actions.slice(0, 3);
}

// Auto-generate 3 win strings from stats
function buildWins(stats) {
  const {
    completionPct, doneTasksCount, allTasksCount,
    workoutCount, totalSets, prs,
    thisWeekSpend, lastWeekSpend, spendDelta,
    avgSleep,
  } = stats;

  const wins = [];

  if (allTasksCount > 0 && completionPct >= 50) {
    wins.push(`Completed ${doneTasksCount}/${allTasksCount} tasks (${completionPct}%)`);
  } else if (doneTasksCount > 0) {
    wins.push(`Finished ${doneTasksCount} task${doneTasksCount > 1 ? "s" : ""} this week`);
  }

  if (workoutCount >= 3) {
    wins.push(`Hit the gym ${workoutCount} times this week`);
  } else if (workoutCount > 0) {
    wins.push(`Logged ${workoutCount} workout${workoutCount > 1 ? "s" : ""} with ${totalSets} total sets`);
  }

  if (prs && prs.length > 0) {
    wins.push(`Set a new PR on ${prs[0]}${prs.length > 1 ? ` and ${prs.length - 1} more` : ""}`);
  }

  if (avgSleep && parseFloat(avgSleep) >= 7.5) {
    wins.push(`Averaged ${avgSleep}h sleep — excellent recovery`);
  } else if (avgSleep && parseFloat(avgSleep) >= 7) {
    wins.push(`Averaged ${avgSleep}h sleep this week`);
  }

  if (lastWeekSpend > 0 && spendDelta < 0) {
    wins.push(`Spent $${Math.abs(spendDelta).toFixed(0)} less than last week`);
  }

  // Fallback
  if (wins.length === 0) {
    wins.push("Showed up and put in effort this week");
  }
  while (wins.length < 3) {
    wins.push("Kept consistent with your daily routine");
  }

  return wins.slice(0, 3);
}

// ── Animated count-up hook ──────────────────────────────────────────────────

function useCountUp(target, duration = 1000, enabled = true) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const raf               = useRef(null);
  const start             = useRef(null);

  useEffect(() => {
    if (!enabled) { setValue(target); return; }
    start.current = null;
    setValue(0);

    function tick(ts) {
      if (!start.current) start.current = ts;
      const elapsed = ts - start.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      }
    }
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration, enabled]);

  return value;
}

// ── Grade color ────────────────────────────────────────────────────────────

function gradeColor(grade) {
  if (grade === "A") return GREEN;
  if (grade === "B") return TEAL;
  if (grade === "C") return YELLOW;
  if (grade === "D") return "#f97b4f";
  return RED;
}

// ── Trend arrow ────────────────────────────────────────────────────────────

function TrendArrow({ delta, label, value, unit = "" }) {
  const up    = delta >= 0;
  const color = label === "Spending" ? (up ? RED : GREEN) : (up ? GREEN : RED);
  const arrow = up ? "↑" : "↓";

  return (
    <div
      style={{
        flex:           1,
        background:     "rgba(15,23,42,0.6)",
        border:         "1px solid rgba(51,65,85,0.4)",
        borderRadius:   12,
        padding:        "10px 12px",
        textAlign:      "center",
        minWidth:        0,
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "'Syne', serif", color }}>
        {value}{unit} <span style={{ fontSize: 15 }}>{arrow}</span>
      </div>
      <div style={{ fontSize: 10, color: "rgba(148,163,184,0.6)", marginTop: 3, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </div>
      {delta !== 0 && (
        <div style={{ fontSize: 10, color, marginTop: 2, fontWeight: 700 }}>
          {up ? "+" : ""}{typeof delta === "number" ? (Number.isInteger(delta) ? delta : delta.toFixed(1)) : delta}
          {unit}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WeeklyReview({ data, onClose, onSaveReflection, upd, addToast }) {
  const reduced = useReducedMotion();

  const stats = useMemo(() => {
    const allTasks    = DAYS.flatMap((d) => data.weekDays?.[d]?.tasks || []);
    const doneTasks   = allTasks.filter((t) => t.done);
    const completionPct = allTasks.length
      ? Math.round((doneTasks.length / allTasks.length) * 100)
      : 0;

    const bestDay = DAYS.reduce(
      (best, d) => {
        const cnt = (data.weekDays?.[d]?.tasks || []).filter((t) => t.done).length;
        return cnt > best.cnt ? { day: d, cnt } : best;
      },
      { day: null, cnt: 0 }
    );

    const now    = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const thisWeekWorkouts = (data.workoutHistory || []).filter(
      (w) => now - w.completedAt < weekMs
    );
    const lastWeekWorkouts = (data.workoutHistory || []).filter(
      (w) => { const age = now - w.completedAt; return age >= weekMs && age < 2 * weekMs; }
    );
    const totalSets = thisWeekWorkouts.reduce(
      (acc, w) =>
        acc + (w.exercises || []).reduce(
          (s, ex) => s + (ex.sets || []).filter((st) => st.done).length,
          0
        ),
      0
    );
    const prs = thisWeekWorkouts.flatMap((w) =>
      (w.exercises || []).filter((ex) => ex.isPR).map((ex) => ex.name)
    );

    const thisWeekSpend = (data.transactions || [])
      .filter((t) => now - new Date(t.date).getTime() < weekMs)
      .reduce((a, t) => a + Math.abs(t.amount || 0), 0);
    const lastWeekSpend = (data.transactions || [])
      .filter((t) => { const age = now - new Date(t.date).getTime(); return age >= weekMs && age < 2 * weekMs; })
      .reduce((a, t) => a + Math.abs(t.amount || 0), 0);

    const sleepDays = DAYS.map((d) => parseFloat(data.weekDays?.[d]?.sleep || 0)).filter((s) => s > 0);
    const avgSleepH = sleepDays.length
      ? sleepDays.reduce((a, b) => a + b, 0) / sleepDays.length
      : null;
    const avgSleep  = avgSleepH !== null ? avgSleepH.toFixed(1) : null;

    const moodDays = DAYS.map((d) => data.weekDays?.[d]?.mood || 0).filter((m) => m > 0);
    const avgMood  = moodDays.length
      ? (moodDays.reduce((a, b) => a + b, 0) / moodDays.length).toFixed(1)
      : null;

    // Habit completion for the week
    const kis = data.kis || [];
    const habitsTotal = kis.length;
    const habitsLogged = kis.filter(k => DAYS.some(d => (k.dailyLogs || {})[d])).length;
    const habitCompletionPct = habitsTotal > 0 ? Math.round(habitsLogged / habitsTotal * 100) : 0;

    // Journal mood data for the week
    const journals = data.journals || [];
    const weekJournals = journals.filter(j => {
      const jDate = new Date(j.date);
      return (now - jDate.getTime()) < weekMs;
    });
    const journalMoods = weekJournals.filter(j => j.mood).map(j => j.mood);

    // Prior-week task completion (from stored snapshot if available, else 0)
    const prevCompletionPct = data.prevWeekCompletionPct ?? 0;

    // Weekly score via math.ts utility
    const score = calcWeeklyScore(completionPct, thisWeekWorkouts.length, avgSleepH);
    const grade = calcLetterGrade(score);

    return {
      allTasksCount:  allTasks.length,
      doneTasksCount: doneTasks.length,
      completionPct,
      prevCompletionPct,
      bestDay: bestDay.cnt > 0 ? bestDay.day : null,
      workoutCount: thisWeekWorkouts.length,
      prevWorkoutCount: lastWeekWorkouts.length,
      totalSets,
      prs,
      thisWeekSpend,
      lastWeekSpend,
      spendDelta: thisWeekSpend - lastWeekSpend,
      avgSleep,
      avgSleepH,
      avgMood,
      habitsTotal,
      habitsLogged,
      habitCompletionPct,
      journalMoods,
      weekRating: data.currentReflection?.rating ?? null,
      score,
      grade,
    };
  }, [data]);

  // Animated score counter
  const animatedScore = useCountUp(stats.score, 1000, !reduced);

  // Next-week priority state
  const [weekPriority, setWeekPriority] = useState(data.weekPriority || "");

  // Pre-populate with lowest-progress goal's next step
  const lowestGoal = useMemo(() => {
    const goals = data.yearlyGoals || [];
    if (goals.length === 0) return null;
    return goals.reduce((lowest, g) =>
      (g.progress || 0) < (lowest.progress || 0) ? g : lowest
    , goals[0]);
  }, [data.yearlyGoals]);

  useEffect(() => {
    if (!data.weekPriority && lowestGoal) {
      setWeekPriority(`Make progress on: ${lowestGoal.title}`);
    } else {
      setWeekPriority(data.weekPriority || "");
    }
  }, [data.weekPriority, lowestGoal]);

  function handleSaveWeekPriority() {
    upd((p) => ({ ...p, weekPriority }));
    addToast("Next week priority saved", "🎯");
  }

  function handleSave() {
    const summary = buildAutoSummary(stats);
    upd((p) => ({
      ...p,
      currentReflection: {
        ...(p.currentReflection || {}),
        wentWell: summary.wentWell,
        improve:  summary.improve,
      },
    }));
    addToast("Weekly review saved to reflection", "📋");
    onSaveReflection();
  }

  const wins = useMemo(() => buildWins(stats), [stats]);
  const suggestedActions = useMemo(() => buildSuggestedActions(stats), [stats]);

  const card = {
    background:   "rgba(8,9,13,0.6)",
    borderRadius: 14,
    padding:      "14px 16px",
    border:       "1px solid rgba(255,255,255,0.07)",
    marginBottom: 12,
  };

  const label = {
    fontSize:      10,
    letterSpacing: "1.1px",
    textTransform: "uppercase",
    fontWeight:    700,
    marginBottom:  10,
    fontFamily:    "'DM Sans', sans-serif",
  };

  const row = {
    display:         "flex",
    justifyContent:  "space-between",
    alignItems:      "center",
    marginBottom:    6,
    fontSize:        13,
    color:           "rgba(255,255,255,0.7)",
    fontFamily:      "'DM Sans', sans-serif",
  };

  const big = { fontSize: 20, fontWeight: 800, fontFamily: "'Syne', serif" };

  const iV = reduced
    ? {}
    : {
        initial:   { opacity: 0, y: 16 },
        animate:   { opacity: 1, y: 0 },
        transition: { type: "spring", stiffness: 380, damping: 30 },
      };

  const scaleFade = reduced
    ? {}
    : {
        initial:   { opacity: 0, scale: 0.88 },
        animate:   { opacity: 1, scale: 1 },
        transition: { type: "spring", stiffness: 400, damping: 28, delay: 0.1 },
      };

  const gradeCol = gradeColor(stats.grade);

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Weekly Review"
        style={{
          position:             "fixed",
          inset:                0,
          zIndex:               10000,
          background:           "rgba(7,13,26,0.95)",
          backdropFilter:       "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          display:              "flex",
          alignItems:           "center",
          justifyContent:       "center",
          padding:              "16px",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            width:         "100%",
            maxWidth:      560,
            maxHeight:     "90vh",
            overflowY:     "auto",
            borderRadius:  20,
            background:    "rgba(15,23,42,0.9)",
            border:        "1px solid rgba(255,255,255,0.1)",
            padding:       "24px 22px 20px",
            scrollbarWidth:"thin",
          }}
        >
          {/* ── Header ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'Syne', serif", fontSize: 20, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.3px" }}>
                  Weekly Review
                </div>
                <div style={{ fontSize: 12, color: "rgba(148,163,184,0.7)", marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
                  Week of {weekRange()}
                </div>
              </div>
              <span style={{ background: "rgba(79,156,249,0.15)", border: "1px solid rgba(79,156,249,0.3)", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: BLUE, letterSpacing: "0.8px", fontFamily: "'DM Sans', sans-serif" }}>
                AUTO-GENERATED
              </span>
            </div>
          </div>

          {/* ── Performance Report Card ── */}
          <motion.div
            {...scaleFade}
            style={{
              ...card,
              background:   `linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.6))`,
              border:       `1px solid ${gradeCol}33`,
              marginBottom: 16,
              position:     "relative",
              overflow:     "hidden",
            }}
          >
            {/* subtle glow behind grade */}
            <div style={{
              position:     "absolute",
              top:          -30,
              right:        -20,
              width:        120,
              height:       120,
              borderRadius: "50%",
              background:   `${gradeCol}18`,
              filter:       "blur(30px)",
              pointerEvents:"none",
            }} />

            <div style={{ ...label, color: gradeCol }}>Weekly Performance Report</div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Grade circle */}
              <div style={{
                width:          72,
                height:         72,
                borderRadius:   "50%",
                border:         `3px solid ${gradeCol}`,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                flexShrink:     0,
                background:     `${gradeCol}10`,
              }}>
                <span style={{ fontFamily: "'Syne', serif", fontSize: 28, fontWeight: 900, color: gradeCol }}>
                  {stats.grade}
                </span>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                  <span
                    style={{ fontFamily: "'Syne', serif", fontSize: 36, fontWeight: 900, color: gradeCol }}
                    aria-live="polite"
                    aria-label={`Score: ${animatedScore} out of 100`}
                  >
                    {animatedScore}
                  </span>
                  <span style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>/100</span>
                </div>
                {/* Score progress bar */}
                <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
                  <motion.div
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${stats.score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{ height: "100%", background: gradeCol, borderRadius: 99 }}
                  />
                </div>
              </div>
            </div>

            {/* 3 trend metrics */}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <TrendArrow
                label="Tasks"
                value={`${stats.completionPct}%`}
                delta={stats.completionPct - stats.prevCompletionPct}
                unit="%"
              />
              <TrendArrow
                label="Workouts"
                value={stats.workoutCount}
                delta={stats.workoutCount - stats.prevWorkoutCount}
              />
              <TrendArrow
                label="Spending"
                value={`$${stats.thisWeekSpend.toFixed(0)}`}
                delta={stats.spendDelta}
              />
            </div>
          </motion.div>

          {/* ── Wins this week ── */}
          <motion.div {...iV} style={{ ...card, marginBottom: 16 }}>
            <div style={{ ...label, color: YELLOW }}>Wins This Week</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {wins.map((win, i) => (
                <motion.div
                  key={i}
                  initial={reduced ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.1, type: "spring", stiffness: 380, damping: 30 }}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          10,
                    background:   "rgba(251,191,36,0.06)",
                    border:       "1px solid rgba(251,191,36,0.15)",
                    borderRadius: 10,
                    padding:      "10px 12px",
                  }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0 }}>✨</span>
                  <span style={{ fontSize: 13, color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>{win}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Habits ── */}
          {stats.habitsTotal > 0 && (
            <motion.div {...iV} style={card}>
              <div style={{ ...label, color: PURPLE }}>Habits</div>
              <div style={row}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: pctColor(stats.habitCompletionPct), fontFamily: "'Syne', serif" }}>
                    {stats.habitCompletionPct}%
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)" }}>
                    {stats.habitsLogged}/{stats.habitsTotal} tracked this week
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Suggested Actions ── */}
          <motion.div {...iV} style={{ ...card, marginBottom: 16 }}>
            <div style={{ ...label, color: BLUE }}>Suggested Next Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {suggestedActions.map((action, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "rgba(79,156,249,0.06)",
                    border: "1px solid rgba(79,156,249,0.15)",
                    borderRadius: 10, padding: "10px 12px",
                  }}
                >
                  <span style={{ fontSize: 13, flexShrink: 0 }}>→</span>
                  <span style={{ fontSize: 13, color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>{action}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Tasks ── */}
          <motion.div {...iV} style={card}>
            <div style={{ ...label, color: GREEN }}>Tasks</div>
            <div style={row}>
              <span>Total added</span>
              <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{stats.allTasksCount}</span>
            </div>
            <div style={row}>
              <span>Completed</span>
              <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{stats.doneTasksCount}</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>Completion</span>
                <span style={{ color: pctColor(stats.completionPct), fontWeight: 700 }}>{stats.completionPct}%</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
                <motion.div
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${stats.completionPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  style={{ height: "100%", background: pctColor(stats.completionPct), borderRadius: 99 }}
                />
              </div>
            </div>
            {stats.bestDay && (
              <div style={{ ...row, marginBottom: 0 }}>
                <span>Best day</span>
                <span style={{ color: YELLOW, fontWeight: 600 }}>{stats.bestDay}</span>
              </div>
            )}
          </motion.div>

          {/* ── Workouts ── */}
          <motion.div {...iV} style={card}>
            <div style={{ ...label, color: PURPLE }}>Workouts</div>
            <div style={row}>
              <span>Workouts completed</span>
              <span style={{ ...big, color: PURPLE }}>{stats.workoutCount}</span>
            </div>
            <div style={row}>
              <span>Total sets logged</span>
              <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{stats.totalSets}</span>
            </div>
            {stats.prs.length > 0 && (
              <div style={{ marginTop: 6, background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: PURPLE, fontFamily: "'DM Sans', sans-serif" }}>
                PR this week: {stats.prs.join(", ")}
              </div>
            )}
          </motion.div>

          {/* ── Finance ── */}
          <motion.div {...iV} style={card}>
            <div style={{ ...label, color: BLUE }}>Finance</div>
            <div style={row}>
              <span>Spent this week</span>
              <span style={{ ...big, color: BLUE }}>${stats.thisWeekSpend.toFixed(2)}</span>
            </div>
            <div style={row}>
              <span>vs last week</span>
              <span style={{ color: stats.spendDelta > 0 ? RED : GREEN, fontWeight: 700, fontSize: 13 }}>
                {stats.spendDelta > 0 ? "▲" : "▼"} ${Math.abs(stats.spendDelta).toFixed(2)}
              </span>
            </div>
            {stats.lastWeekSpend === 0 && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>No last-week data</div>
            )}
          </motion.div>

          {/* ── Mood ── */}
          <motion.div {...iV} style={card}>
            <div style={{ ...label, color: YELLOW }}>Mood / Rating</div>
            <div style={row}>
              <span>Avg daily mood</span>
              {stats.avgMood ? (
                <span style={{ ...big, color: YELLOW }}>{stats.avgMood} <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>/ 5</span></span>
              ) : (
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Not logged</span>
              )}
            </div>
            {stats.weekRating !== null && (
              <div style={row}>
                <span>Week rating</span>
                <span style={{ ...big, color: stats.weekRating >= 8 ? GREEN : stats.weekRating >= 5 ? BLUE : RED }}>
                  {stats.weekRating} <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>/ 10</span>
                </span>
              </div>
            )}
          </motion.div>

          {/* ── Sleep ── */}
          <motion.div {...iV} style={{ ...card }}>
            <div style={{ ...label, color: sleepColor(stats.avgSleep ?? 0) }}>Sleep</div>
            {stats.avgSleep ? (
              <>
                <div style={row}>
                  <span>Avg sleep</span>
                  <span style={{ ...big, color: sleepColor(stats.avgSleep) }}>{stats.avgSleep}h</span>
                </div>
                <div style={{ fontSize: 11, color: sleepColor(stats.avgSleep), fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                  {parseFloat(stats.avgSleep) >= 7.5 ? "Good sleep quality" : parseFloat(stats.avgSleep) >= 6 ? "Sleep could improve" : "Sleep needs attention"}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>No sleep data logged this week</div>
            )}
          </motion.div>

          {/* ── Next week setup ── */}
          <motion.div
            {...iV}
            style={{
              ...card,
              marginBottom: 20,
              border:       "1px solid rgba(99,102,241,0.25)",
              background:   "rgba(99,102,241,0.06)",
            }}
          >
            <div style={{ ...label, color: "#818cf8" }}>Next Week Setup</div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "rgba(148,163,184,0.7)", fontFamily: "'DM Sans', sans-serif" }}>
              Set your #1 priority for next week
            </p>
            <input
              type="text"
              value={weekPriority}
              onChange={(e) => setWeekPriority(e.target.value)}
              placeholder="What's your top focus next week?"
              aria-label="Next week's top priority"
              style={{
                background:   "rgba(15,23,42,0.7)",
                border:       "1.5px solid rgba(99,102,241,0.3)",
                borderRadius: 10,
                padding:      "11px 14px",
                color:        "#f1f5f9",
                fontSize:     14,
                fontFamily:   "'DM Sans', sans-serif",
                width:        "100%",
                boxSizing:    "border-box",
                outline:      "none",
                marginBottom: 10,
              }}
            />
            <button
              onClick={handleSaveWeekPriority}
              style={{
                background:   "rgba(99,102,241,0.2)",
                border:       "1px solid rgba(99,102,241,0.4)",
                borderRadius: 8,
                color:        "#818cf8",
                padding:      "8px 16px",
                fontSize:     13,
                fontWeight:   700,
                fontFamily:   "'DM Sans', sans-serif",
                cursor:       "pointer",
                transition:   "background 0.15s",
              }}
            >
              Save Priority
            </button>
          </motion.div>

          {/* ── Actions ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <button
              onClick={handleSave}
              style={{
                flex:         1,
                background:   "linear-gradient(135deg, #6366f1, #818cf8)",
                border:       "none",
                borderRadius: 12,
                color:        "#fff",
                padding:      "12px 18px",
                fontSize:     14,
                fontWeight:   700,
                cursor:       "pointer",
                fontFamily:   "'DM Sans', sans-serif",
                letterSpacing:"-0.1px",
              }}
            >
              Save as Reflection ✦
            </button>
            <button
              onClick={onClose}
              style={{
                background:       "transparent",
                border:           "none",
                color:            "rgba(148,163,184,0.6)",
                fontSize:         13,
                cursor:           "pointer",
                padding:          "12px 8px",
                fontFamily:       "'DM Sans', sans-serif",
                textDecoration:   "underline",
                textUnderlineOffset: 3,
              }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
