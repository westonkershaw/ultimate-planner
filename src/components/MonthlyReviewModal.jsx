/* eslint-disable */
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Target,
  Flame,
  Dumbbell,
  Trophy,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Star,
  TrendingUp,
  Calendar,
} from "lucide-react";

// ─── helpers ───────────────────────────────────────────────────────────────

function getYearMonth(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getLastMonthKey() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return getYearMonth(d);
}

function getMonthName(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function daysRemainingInYear() {
  const now = new Date();
  const end = new Date(now.getFullYear(), 11, 31);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export function shouldShowMonthlyReview(data) {
  const today = new Date();
  const day = today.getDate();
  const isEndOfMonth = day >= 25;
  const isStartOfNewMonth = day <= 3;
  if (!isEndOfMonth && !isStartOfNewMonth) return false;
  const lastMonthKey = getLastMonthKey();
  return !(data?.monthlyReviews?.[lastMonthKey]);
}

// ─── spring config ──────────────────────────────────────────────────────────
const spring = { type: "spring", stiffness: 400, damping: 30 };

// ─── subcomponents ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      style={{
        background: "rgba(15,23,42,0.7)",
        border: "1px solid rgba(51,65,85,0.5)",
        borderRadius: 14,
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: "1 1 calc(50% - 8px)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: `${color}20`,
          border: `1px solid ${color}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} color={color} />
      </div>
      <div
        style={{
          fontFamily: "'Syne', serif",
          fontSize: 26,
          fontWeight: 800,
          color: "#f1f5f9",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(148,163,184,0.7)",
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.4px",
        }}
      >
        {label}
      </div>
    </motion.div>
  );
}

function StepDots({ total, current }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 99,
            background:
              i === current
                ? "#14b8a6"
                : i < current
                ? "rgba(45, 212, 191,0.4)"
                : "rgba(51,65,85,0.6)",
            transition: "all 0.35s ease",
          }}
        />
      ))}
    </div>
  );
}

function GoalBadge({ pct, daysLeft }) {
  if (pct >= 80) return <span style={badge("#34c98a")}>Crushing it</span>;
  const onPace = pct / 100 >= (365 - daysLeft) / 365;
  if (onPace) return <span style={badge("#4f9cf9")}>On track</span>;
  return <span style={badge("#f87171")}>At risk</span>;
}

function badge(color) {
  return {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    color,
    background: `${color}18`,
    border: `1px solid ${color}35`,
    borderRadius: 20,
    padding: "2px 8px",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
  };
}

// ─── main component ─────────────────────────────────────────────────────────

export default function MonthlyReviewModal({ data, onChange, onClose, addToast }) {
  const lastMonthKey = getLastMonthKey();
  const monthLabel = getMonthName(lastMonthKey);

  const [step, setStep] = useState(0);
  const [wins, setWins] = useState(data?.monthlyReviews?.[lastMonthKey]?.wins ?? "");
  const [struggles, setStruggles] = useState(data?.monthlyReviews?.[lastMonthKey]?.struggles ?? "");
  const [focusGoalId, setFocusGoalId] = useState(data?.monthlyReviews?.[lastMonthKey]?.focusGoalId ?? "");
  const [attentionNote, setAttentionNote] = useState(data?.monthlyReviews?.[lastMonthKey]?.attentionNote ?? "");
  const [nextFocus, setNextFocus] = useState(data?.monthlyReviews?.[lastMonthKey]?.nextFocus ?? "");
  const [milestones, setMilestones] = useState(
    data?.monthlyReviews?.[lastMonthKey]?.milestones ?? ["", "", ""]
  );

  // ── computed stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const [year, month] = lastMonthKey.split("-").map(Number);
    const startOfMonth = new Date(year, month - 1, 1).getTime();
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).getTime();

    // Tasks completed this month from weekDays (object keyed by YYYY-MM-DD or day name)
    let tasksCompleted = 0;
    const weekDays = data?.weekDays ?? {};
    Object.entries(weekDays).forEach(([key, dayData]) => {
      // Try to parse as a date
      const d = new Date(key);
      if (!isNaN(d.getTime())) {
        const ts = d.getTime();
        if (ts >= startOfMonth && ts <= endOfMonth) {
          tasksCompleted += (dayData?.tasks ?? []).filter((t) => t.done).length;
        }
      }
    });

    // Goals with any progress this month
    const goalsWithProgress = (data?.yearlyGoals ?? []).filter((g) => {
      return (g?.progress ?? 0) > 0;
    }).length;

    // Top habit: KI with most logs this month
    let topHabit = null;
    let topHabitCount = 0;
    (data?.kis ?? []).forEach((ki) => {
      const count = Object.entries(ki?.dailyLogs ?? {}).filter(([dateStr, val]) => {
        const ts = new Date(dateStr).getTime();
        return ts >= startOfMonth && ts <= endOfMonth && val;
      }).length;
      if (count > topHabitCount) {
        topHabitCount = count;
        topHabit = ki?.name ?? null;
      }
    });

    // Workouts this month
    const workouts = (data?.workoutHistory ?? []).filter((w) => {
      const ts = w?.completedAt ?? 0;
      return ts >= startOfMonth && ts <= endOfMonth;
    }).length;

    return { tasksCompleted, goalsWithProgress, topHabit, topHabitCount, workouts };
  }, [data, lastMonthKey]);

  // ── helpers ─────────────────────────────────────────────────────────────
  const goals = data?.yearlyGoals ?? [];
  const daysLeft = daysRemainingInYear();

  function updateMilestone(i, val) {
    setMilestones((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  }

  function handleComplete() {
    const reviewObj = {
      wins,
      struggles,
      focusGoalId,
      attentionNote,
      nextFocus,
      milestones,
      completedAt: Date.now(),
    };

    onChange((prev) => {
      const newTasks = [];

      // Create next-focus task
      if (nextFocus.trim()) {
        newTasks.push({
          id: `monthly-focus-${Date.now()}`,
          text: `[Monthly Focus] ${nextFocus.trim()}`,
          done: false,
          createdAt: Date.now(),
          source: "monthly-review",
        });
      }

      // Create milestone tasks
      milestones.forEach((m, i) => {
        if (m.trim()) {
          newTasks.push({
            id: `monthly-milestone-${Date.now()}-${i}`,
            text: `[Milestone] ${m.trim()}`,
            done: false,
            createdAt: Date.now(),
            source: "monthly-review",
          });
        }
      });

      // Append to today's tasks if weekDays supports date keys
      const todayKey = new Date().toISOString().split("T")[0];
      const todayTasks = [
        ...(prev?.weekDays?.[todayKey]?.tasks ?? []),
        ...newTasks,
      ];

      return {
        ...prev,
        monthlyReviews: {
          ...(prev?.monthlyReviews ?? {}),
          [lastMonthKey]: reviewObj,
        },
        weekDays: {
          ...(prev?.weekDays ?? {}),
          [todayKey]: {
            ...(prev?.weekDays?.[todayKey] ?? {}),
            tasks: todayTasks,
          },
        },
      };
    });

    addToast?.("Monthly review saved", "🎉");
    onClose();
  }

  // ── shared styles ────────────────────────────────────────────────────────
  const textAreaStyle = {
    width: "100%",
    minHeight: 90,
    background: "rgba(8,9,13,0.7)",
    border: "1px solid rgba(51,65,85,0.5)",
    borderRadius: 12,
    color: "#f1f5f9",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    padding: "11px 13px",
    resize: "vertical",
    outline: "none",
    lineHeight: 1.6,
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const inputStyle = {
    width: "100%",
    background: "rgba(8,9,13,0.7)",
    border: "1px solid rgba(51,65,85,0.5)",
    borderRadius: 10,
    color: "#f1f5f9",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    padding: "10px 12px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const sectionLabel = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "1px",
    textTransform: "uppercase",
    color: "rgba(148,163,184,0.6)",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: 8,
  };

  // ── step content ─────────────────────────────────────────────────────────
  const steps = [
    // ── Step 0: Month in Review ──────────────────────────────────────────
    <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(45, 212, 191,0.12)",
            border: "1px solid rgba(45, 212, 191,0.3)",
            borderRadius: 20,
            padding: "4px 12px",
            marginBottom: 12,
          }}
        >
          <Calendar size={12} color="#14b8a6" />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#14b8a6", letterSpacing: "0.6px", fontFamily: "'DM Sans', sans-serif" }}>
            YOUR MONTH AT A GLANCE
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Syne', serif",
            fontSize: 22,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: "-0.4px",
          }}
        >
          {monthLabel}
        </div>
        <div style={{ fontSize: 12, color: "rgba(148,163,184,0.6)", marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
          Let's see how you did
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <StatCard icon={CheckCircle2} label="Tasks completed" value={stats.tasksCompleted} color="#34c98a" />
        <StatCard icon={Target} label="Goals with progress" value={stats.goalsWithProgress} color="#14b8a6" />
        <StatCard
          icon={Flame}
          label={stats.topHabit ? `Top habit: ${stats.topHabit}` : "Top habit"}
          value={stats.topHabitCount > 0 ? `${stats.topHabitCount}d` : "—"}
          color="#f97316"
        />
        <StatCard icon={Dumbbell} label="Workouts logged" value={stats.workouts} color="#c084fc" />
      </div>

      {stats.tasksCompleted === 0 && stats.workouts === 0 && (
        <div
          style={{
            marginTop: 14,
            background: "rgba(251,191,36,0.07)",
            border: "1px solid rgba(251,191,36,0.2)",
            borderRadius: 10,
            padding: "10px 13px",
            fontSize: 12,
            color: "rgba(251,191,36,0.8)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Keep logging daily activity to see richer stats here next month.
        </div>
      )}
    </motion.div>,

    // ── Step 1: Wins & Struggles ─────────────────────────────────────────
    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Syne', serif", fontSize: 18, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>
          Wins & Struggles
        </div>
        <div style={{ fontSize: 12, color: "rgba(148,163,184,0.6)", fontFamily: "'DM Sans', sans-serif" }}>
          Honest reflection fuels next month's momentum.
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <div style={sectionLabel}>Biggest win this month</div>
          <textarea
            style={textAreaStyle}
            placeholder="What are you most proud of?"
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "rgba(45, 212, 191,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(51,65,85,0.5)")}
          />
          <div style={{ fontSize: 10, color: "#34c98a", fontFamily: "'DM Sans', sans-serif", marginTop: 4, paddingLeft: 2 }}>
            Trophy moment
          </div>
        </div>

        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <div style={sectionLabel}>Biggest challenge</div>
          <textarea
            style={textAreaStyle}
            placeholder="What was hardest?"
            value={struggles}
            onChange={(e) => setStruggles(e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "rgba(45, 212, 191,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(51,65,85,0.5)")}
          />
          <div style={{ fontSize: 10, color: "#f87171", fontFamily: "'DM Sans', sans-serif", marginTop: 4, paddingLeft: 2 }}>
            Growth opportunity
          </div>
        </div>
      </div>
    </motion.div>,

    // ── Step 2: Goal Progress ────────────────────────────────────────────
    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Syne', serif", fontSize: 18, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>
          Goal Progress Check
        </div>
        <div style={{ fontSize: 12, color: "rgba(148,163,184,0.6)", fontFamily: "'DM Sans', sans-serif" }}>
          {daysLeft} days left in the year — where do you stand?
        </div>
      </div>

      {goals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(148,163,184,0.4)", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          No yearly goals set yet. Add goals to track them here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {goals.map((goal) => {
            const pct = Math.min(100, Math.round(((goal?.progress ?? 0) / (goal?.target ?? 100)) * 100));
            return (
              <div
                key={goal.id}
                style={{
                  background: "rgba(8,9,13,0.6)",
                  border: "1px solid rgba(51,65,85,0.4)",
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#e2e8f0", flex: 1, minWidth: 0, marginRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {goal.name ?? goal.title ?? "Unnamed goal"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(148,163,184,0.7)", fontFamily: "'DM Sans', sans-serif" }}>
                      {pct}%
                    </span>
                    <GoalBadge pct={pct} daysLeft={daysLeft} />
                  </div>
                </div>
                <div style={{ height: 5, background: "rgba(51,65,85,0.5)", borderRadius: 99, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{
                      height: "100%",
                      background: pct >= 80 ? "#34c98a" : pct >= 50 ? "#14b8a6" : "#f87171",
                      borderRadius: 99,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {goals.length > 0 && (
        <>
          <div style={sectionLabel}>Which goal needs the most attention next month?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {goals.map((goal) => (
              <label
                key={goal.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  background: focusGoalId === goal.id ? "rgba(45, 212, 191,0.12)" : "rgba(8,9,13,0.4)",
                  border: `1px solid ${focusGoalId === goal.id ? "rgba(45, 212, 191,0.4)" : "rgba(51,65,85,0.3)"}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <input
                  type="radio"
                  name="focusGoal"
                  value={goal.id}
                  checked={focusGoalId === goal.id}
                  onChange={() => setFocusGoalId(goal.id)}
                  style={{ accentColor: "#14b8a6" }}
                />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#e2e8f0" }}>
                  {goal.name ?? goal.title ?? "Unnamed goal"}
                </span>
              </label>
            ))}
          </div>
          <div style={sectionLabel}>Notes on this goal</div>
          <textarea
            style={{ ...textAreaStyle, minHeight: 70 }}
            placeholder="What specifically needs to change?"
            value={attentionNote}
            onChange={(e) => setAttentionNote(e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "rgba(45, 212, 191,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(51,65,85,0.5)")}
          />
        </>
      )}
    </motion.div>,

    // ── Step 3: Next Month Intention ─────────────────────────────────────
    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Syne', serif", fontSize: 18, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>
          Next Month's Intention
        </div>
        <div style={{ fontSize: 12, color: "rgba(148,163,184,0.6)", fontFamily: "'DM Sans', sans-serif" }}>
          These will be added as tasks when you complete the review.
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(45, 212, 191,0.15)", border: "1px solid rgba(45, 212, 191,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Star size={13} color="#14b8a6" />
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
            Your ONE big focus
          </div>
        </div>
        <input
          type="text"
          style={inputStyle}
          placeholder="What matters most next month?"
          value={nextFocus}
          onChange={(e) => setNextFocus(e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = "rgba(45, 212, 191,0.5)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(51,65,85,0.5)")}
        />
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(52,201,138,0.12)", border: "1px solid rgba(52,201,138,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={13} color="#34c98a" />
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
            3 monthly milestones
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {milestones.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(45, 212, 191,0.1)", border: "1px solid rgba(45, 212, 191,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#14b8a6", fontFamily: "'DM Sans', sans-serif" }}>
                  {i + 1}
                </span>
              </div>
              <input
                type="text"
                style={{ ...inputStyle, flex: 1 }}
                placeholder={`Milestone ${i + 1}`}
                value={m}
                onChange={(e) => updateMilestone(i, e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "rgba(45, 212, 191,0.5)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(51,65,85,0.5)")}
              />
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 12,
            background: "rgba(45, 212, 191,0.07)",
            border: "1px solid rgba(45, 212, 191,0.15)",
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 11,
            color: "rgba(148,163,184,0.6)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Non-empty milestones will be created as tasks for today.
        </div>
      </div>
    </motion.div>,
  ];

  const TOTAL_STEPS = steps.length;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Monthly Review"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          background: "rgba(7,13,26,0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.97 }}
          transition={spring}
          style={{
            width: "100%",
            maxWidth: 580,
            maxHeight: "92vh",
            overflowY: "auto",
            borderRadius: 22,
            background: "rgba(15,23,42,0.92)",
            border: "1px solid rgba(51,65,85,0.5)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(45, 212, 191,0.2) transparent",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 22px 16px",
              borderBottom: "1px solid rgba(51,65,85,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #14b8a6, #2dd4bf)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={16} color="#fff" />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Syne', serif",
                    fontSize: 16,
                    fontWeight: 900,
                    color: "#f1f5f9",
                    letterSpacing: "-0.2px",
                  }}
                >
                  Monthly Review
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(148,163,184,0.5)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Step {step + 1} of {TOTAL_STEPS}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <StepDots total={TOTAL_STEPS} current={step} />
              <button
                onClick={onClose}
                style={{
                  background: "rgba(51,65,85,0.3)",
                  border: "1px solid rgba(51,65,85,0.4)",
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "rgba(148,163,184,0.6)",
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "22px 22px 8px", flex: 1, overflow: "hidden" }}>
            <AnimatePresence mode="wait">
              {steps[step]}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "16px 22px 20px",
              borderTop: "1px solid rgba(51,65,85,0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: step === 0 ? "rgba(51,65,85,0.15)" : "rgba(51,65,85,0.3)",
                border: "1px solid rgba(51,65,85,0.35)",
                borderRadius: 10,
                padding: "9px 16px",
                color: step === 0 ? "rgba(148,163,184,0.3)" : "rgba(148,163,184,0.7)",
                fontSize: 13,
                fontWeight: 600,
                cursor: step === 0 ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s",
              }}
            >
              <ChevronLeft size={14} />
              Back
            </button>

            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "linear-gradient(135deg, #14b8a6, #2dd4bf)",
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 20px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "-0.1px",
                  boxShadow: "0 4px 20px rgba(45, 212, 191,0.35)",
                }}
              >
                Continue
                <ChevronRight size={14} />
              </button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleComplete}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "linear-gradient(135deg, #34c98a, #4ade80)",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 22px",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "-0.1px",
                  boxShadow: "0 4px 20px rgba(52,201,138,0.35)",
                }}
              >
                <Trophy size={15} />
                Complete Review
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
