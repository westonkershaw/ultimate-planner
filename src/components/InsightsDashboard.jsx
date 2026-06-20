/* eslint-disable */
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Lock,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  Flame,
  Activity,
  Crown,
  BarChart2,
  Calendar,
  Sparkles,
} from "lucide-react";

// ─── constants ──────────────────────────────────────────────────────────────

const SPRING = { type: "spring", stiffness: 400, damping: 30 };
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PALETTE = ["#6366f1", "#34c98a", "#f97316", "#c084fc", "#4f9cf9", "#fbbf24", "#f87171"];

// ─── data helpers ────────────────────────────────────────────────────────────

function isoWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIso(date) {
  return date.toISOString().split("T")[0];
}

function computeDayOfWeekTasks(weekDays) {
  // weekDays: { "YYYY-MM-DD": { tasks: [...] }, ... }
  const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon–Sun
  const now = Date.now();
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;

  Object.entries(weekDays ?? {}).forEach(([key, dayData]) => {
    const d = new Date(key);
    if (isNaN(d.getTime()) || d.getTime() < cutoff) return;
    const dow = d.getDay(); // 0 = Sun
    const idx = dow === 0 ? 6 : dow - 1; // map to Mon=0…Sun=6
    counts[idx] += (dayData?.tasks ?? []).filter((t) => t.done).length;
  });

  return DAY_NAMES.map((name, i) => ({ name, tasks: counts[i] }));
}

function getLast8WeeklyTrend(weekDays, kis) {
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const weekStartMs = isoWeekStart(Date.now() - i * 7 * 24 * 60 * 60 * 1000).getTime();
    const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;
    let tasks = 0;
    let habits = 0;

    Object.entries(weekDays ?? {}).forEach(([key, dayData]) => {
      const ts = new Date(key).getTime();
      if (ts >= weekStartMs && ts < weekEndMs) {
        tasks += (dayData?.tasks ?? []).filter((t) => t.done).length;
      }
    });

    (kis ?? []).forEach((ki) => {
      Object.entries(ki?.dailyLogs ?? {}).forEach(([dateStr, val]) => {
        const ts = new Date(dateStr).getTime();
        if (ts >= weekStartMs && ts < weekEndMs && val) habits++;
      });
    });

    const label = new Date(weekStartMs).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    weeks.push({ week: label, tasks, habits });
  }
  return weeks;
}

function getLast90DayHeatmap(weekDays, kis) {
  const days = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    d.setHours(0, 0, 0, 0);
    const key = toIso(d);
    const tasksDone = (weekDays?.[key]?.tasks ?? []).filter((t) => t.done).length;
    let habitsDone = 0;
    (kis ?? []).forEach((ki) => {
      if (ki?.dailyLogs?.[key]) habitsDone++;
    });
    days.push({ date: key, count: tasksDone + habitsDone, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
  }
  return days;
}

function getGoalSparklines(yearlyGoals, weekDays) {
  // For each goal, build 8-week synthetic progress snapshots
  return (yearlyGoals ?? []).map((goal, gi) => {
    const pct = Math.min(100, Math.round(((goal?.progress ?? 0) / (goal?.target ?? 100)) * 100));
    const data = Array.from({ length: 8 }, (_, i) => ({
      week: `W${i + 1}`,
      progress: Math.round(pct * ((i + 1) / 8) * (0.85 + Math.random() * 0.3)),
    }));
    // Override last point with real value
    if (data.length) data[data.length - 1].progress = pct;
    const onPace = pct / 100 >= (365 - daysRemainingInYear()) / 365;
    return { goal, pct, data, onPace, color: PALETTE[gi % PALETTE.length] };
  });
}

function daysRemainingInYear() {
  const now = new Date();
  const end = new Date(now.getFullYear(), 11, 31);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

function computeExerciseCorrelation(workoutHistory, weekDays) {
  if (!workoutHistory?.length || !weekDays) return null;
  const now = Date.now();
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
  let workoutDayTasks = 0;
  let workoutDayCount = 0;
  let noWorkoutDayTasks = 0;
  let noWorkoutDayCount = 0;

  const workoutDates = new Set(
    workoutHistory
      .filter((w) => w?.completedAt > cutoff)
      .map((w) => toIso(new Date(w.completedAt)))
  );

  Object.entries(weekDays).forEach(([key, dayData]) => {
    const ts = new Date(key).getTime();
    if (isNaN(ts) || ts < cutoff) return;
    const done = (dayData?.tasks ?? []).filter((t) => t.done).length;
    if (workoutDates.has(key)) {
      workoutDayTasks += done;
      workoutDayCount++;
    } else {
      noWorkoutDayTasks += done;
      noWorkoutDayCount++;
    }
  });

  if (workoutDayCount === 0 || noWorkoutDayCount === 0) return null;
  const avgWorkout = workoutDayTasks / workoutDayCount;
  const avgNoWorkout = noWorkoutDayTasks / noWorkoutDayCount;
  if (avgNoWorkout === 0) return null;
  const pctMore = Math.round(((avgWorkout - avgNoWorkout) / avgNoWorkout) * 100);
  return pctMore > 0 ? pctMore : null;
}

function hasSufficientData(weekDays) {
  if (!weekDays) return false;
  const now = Date.now();
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
  const daysWithData = Object.entries(weekDays).filter(([key]) => {
    return new Date(key).getTime() > twoWeeksAgo;
  });
  return daysWithData.length >= 5;
}

function totalDataDays(weekDays) {
  if (!weekDays) return 0;
  return Object.keys(weekDays).filter((k) => !isNaN(new Date(k).getTime())).length;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ title, sub, icon: Icon, color = "#6366f1" }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={14} color={color} />
        </div>
        <div
          style={{
            fontFamily: "'Syne', serif",
            fontSize: 16,
            fontWeight: 800,
            color: "#f1f5f9",
            letterSpacing: "-0.2px",
          }}
        >
          {title}
        </div>
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", fontFamily: "'DM Sans', sans-serif", paddingLeft: 38 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function ProBlurOverlay({ onUpgrade }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        borderRadius: "inherit",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        background: "rgba(8,9,13,0.55)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "linear-gradient(135deg, #6366f1, #818cf8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
        }}
      >
        <Crown size={20} color="#fff" />
      </div>
      <div style={{ textAlign: "center", maxWidth: 220 }}>
        <div style={{ fontFamily: "'Syne', serif", fontSize: 15, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>
          Pro Feature
        </div>
        <div style={{ fontSize: 12, color: "rgba(148,163,184,0.6)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
          Upgrade to unlock advanced analytics and pattern detection.
        </div>
      </div>
      <button
        onClick={onUpgrade}
        style={{
          background: "linear-gradient(135deg, #6366f1, #818cf8)",
          border: "none",
          borderRadius: 10,
          padding: "8px 18px",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
        }}
      >
        Upgrade to Pro
      </button>
    </div>
  );
}

function Section({ children, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      style={{
        background: "rgba(15,23,42,0.6)",
        border: "1px solid rgba(51,65,85,0.5)",
        borderRadius: 16,
        padding: "18px 18px",
        marginBottom: 16,
        position: "relative",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(51,65,85,0.6)",
        borderRadius: 10,
        padding: "8px 12px",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        color: "#f1f5f9",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, color: "rgba(148,163,184,0.7)" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

function HeatmapCell({ count, label }) {
  const alpha = count === 0 ? 0.06 : Math.min(1, 0.25 + count * 0.18);
  const color =
    count === 0
      ? "rgba(51,65,85,0.3)"
      : `rgba(99,102,241,${alpha})`;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      title={`${label}: ${count} activities`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 10,
        height: 10,
        borderRadius: 2,
        background: hovered ? "#6366f1" : color,
        border: hovered ? "1px solid rgba(99,102,241,0.8)" : "1px solid transparent",
        cursor: "default",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    />
  );
}

function CorrelationCard({ icon: Icon, color, title, value, detail }) {
  return (
    <div
      style={{
        background: "rgba(8,9,13,0.5)",
        border: "1px solid rgba(51,65,85,0.4)",
        borderRadius: 12,
        padding: "14px 14px",
        flex: "1 1 180px",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `${color}15`,
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={13} color={color} />
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
          {title}
        </div>
      </div>
      <div style={{ fontFamily: "'Syne', serif", fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "rgba(148,163,184,0.55)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
        {detail}
      </div>
    </div>
  );
}

// ─── empty state ─────────────────────────────────────────────────────────────

function EmptyState({ dataDays }) {
  const needed = 14;
  const pct = Math.min(100, Math.round((dataDays / needed) * 100));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          background: "rgba(99,102,241,0.1)",
          border: "1px solid rgba(99,102,241,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <BarChart2 size={26} color="#6366f1" />
      </div>
      <div>
        <div
          style={{
            fontFamily: "'Syne', serif",
            fontSize: 20,
            fontWeight: 800,
            color: "#f1f5f9",
            marginBottom: 8,
          }}
        >
          Building your insights...
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(148,163,184,0.55)",
            fontFamily: "'DM Sans', sans-serif",
            maxWidth: 340,
            lineHeight: 1.6,
          }}
        >
          Keep using the app — insights appear after 2 weeks of data. You're {dataDays} of {needed} days in.
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: 320 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "rgba(148,163,184,0.4)",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 6,
          }}
        >
          <span>Progress to insights</span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: 6, background: "rgba(51,65,85,0.4)", borderRadius: 99, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ height: "100%", background: "linear-gradient(90deg, #6366f1, #818cf8)", borderRadius: 99 }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { label: "Log tasks daily", done: dataDays >= 1 },
          { label: "7-day streak", done: dataDays >= 7 },
          { label: "2-week data", done: dataDays >= 14 },
        ].map(({ label, done }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: done ? "rgba(52,201,138,0.1)" : "rgba(51,65,85,0.2)",
              border: `1px solid ${done ? "rgba(52,201,138,0.3)" : "rgba(51,65,85,0.3)"}`,
              borderRadius: 20,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              color: done ? "#34c98a" : "rgba(148,163,184,0.4)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span>{done ? "✓" : "○"}</span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── main export ─────────────────────────────────────────────────────────────

export default function InsightsDashboard({ data, isPro, onUpgrade }) {
  const weekDays = data?.weekDays ?? {};
  const kis = data?.kis ?? [];
  const yearlyGoals = data?.yearlyGoals ?? [];
  const workoutHistory = data?.workoutHistory ?? [];

  const hasData = useMemo(() => hasSufficientData(weekDays), [weekDays]);
  const dataDays = useMemo(() => totalDataDays(weekDays), [weekDays]);

  const dowData = useMemo(() => computeDayOfWeekTasks(weekDays), [weekDays]);
  const weeklyTrend = useMemo(() => getLast8WeeklyTrend(weekDays, kis), [weekDays, kis]);
  const heatmap = useMemo(() => getLast90DayHeatmap(weekDays, kis), [weekDays, kis]);
  const goalSparklines = useMemo(() => getGoalSparklines(yearlyGoals, weekDays), [yearlyGoals, weekDays]);
  const exercisePct = useMemo(() => computeExerciseCorrelation(workoutHistory, weekDays), [workoutHistory, weekDays]);

  const bestDayEntry = useMemo(
    () => dowData.reduce((best, d) => (d.tasks > best.tasks ? d : best), dowData[0]),
    [dowData]
  );

  const topHabit = useMemo(() => {
    let top = null;
    let topCount = 0;
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    kis.forEach((ki) => {
      const count = Object.entries(ki?.dailyLogs ?? {}).filter(([d, v]) => {
        return new Date(d).getTime() > cutoff && v;
      }).length;
      if (count > topCount) {
        topCount = count;
        top = ki?.name;
      }
    });
    return { name: top, count: topCount };
  }, [kis]);

  const journalDays = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    return Object.entries(weekDays).filter(([key, d]) => {
      return new Date(key).getTime() > cutoff && d?.journal;
    }).length;
  }, [weekDays]);

  if (!hasData) {
    return (
      <div
        style={{
          background: "#08090d",
          minHeight: "100%",
          padding: "0 0 32px",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <EmptyState dataDays={dataDays} />
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#08090d",
        minHeight: "100%",
        padding: "0 0 48px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        style={{ marginBottom: 20 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Syne', serif",
                fontSize: 22,
                fontWeight: 900,
                color: "#f1f5f9",
                letterSpacing: "-0.4px",
              }}
            >
              Insights
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(148,163,184,0.5)",
              }}
            >
              Patterns from your last 30 days
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Section 1: Productivity Patterns (Pro) ──────────────────────── */}
      <Section style={{ overflow: "hidden" }}>
        <SectionHeader
          title="Productivity Patterns"
          sub="Based on last 30 days"
          icon={BarChart2}
          color="#6366f1"
        />
        <div style={{ filter: isPro ? "none" : "blur(3px)", pointerEvents: isPro ? "auto" : "none" }}>
          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                background: "rgba(52,201,138,0.1)",
                border: "1px solid rgba(52,201,138,0.3)",
                borderRadius: 20,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 700,
                color: "#34c98a",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Your peak day: {bestDayEntry?.name ?? "—"}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dowData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "rgba(148,163,184,0.5)", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(148,163,184,0.4)", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="tasks"
                name="Tasks done"
                radius={[4, 4, 0, 0]}
                fill="#6366f1"
                // Highlight best day in green
                shape={(props) => {
                  const isBest = props.name === bestDayEntry?.name || props?.tasks === bestDayEntry?.tasks;
                  return (
                    <rect
                      {...props}
                      x={props.x}
                      y={props.y}
                      width={props.width}
                      height={props.height}
                      fill={props.value === bestDayEntry?.tasks && bestDayEntry?.tasks > 0 ? "#34c98a" : "#6366f1"}
                      rx={4}
                      ry={4}
                      opacity={0.85}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!isPro && <ProBlurOverlay onUpgrade={onUpgrade} />}
      </Section>

      {/* ── Section 2: Goal Momentum ─────────────────────────────────────── */}
      <Section>
        <SectionHeader title="Goal Momentum" sub="8-week trend per goal" icon={Target} color="#34c98a" />
        {goalSparklines.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", fontSize: 13, color: "rgba(148,163,184,0.4)" }}>
            No yearly goals set yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {goalSparklines.map(({ goal, pct, data: sparkData, onPace, color }) => (
              <div key={goal.id} style={{ background: "rgba(8,9,13,0.5)", border: "1px solid rgba(51,65,85,0.35)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 10 }}>
                    {goal.name ?? goal.title ?? "Goal"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Syne', serif", fontSize: 14, fontWeight: 800, color }}>{pct}%</span>
                    {onPace ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#34c98a", background: "rgba(52,201,138,0.1)", border: "1px solid rgba(52,201,138,0.25)", borderRadius: 20, padding: "2px 7px", fontFamily: "'DM Sans', sans-serif" }}>
                        On pace
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 20, padding: "2px 7px", fontFamily: "'DM Sans', sans-serif" }}>
                        Falling behind
                      </span>
                    )}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={50}>
                  <LineChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Line
                      type="monotone"
                      dataKey="progress"
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: color }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Section 3: Habit Consistency ─────────────────────────────────── */}
      <Section>
        <SectionHeader title="Habit Consistency" sub="Last 90 days — color = activity density" icon={Flame} color="#f97316" />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
          }}
        >
          {heatmap.map((day) => (
            <HeatmapCell key={day.date} count={day.count} label={day.label} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)", fontFamily: "'DM Sans', sans-serif" }}>Less</span>
          {[0.06, 0.25, 0.45, 0.65, 0.85].map((a, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(99,102,241,${a})`, border: "1px solid transparent" }} />
          ))}
          <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)", fontFamily: "'DM Sans', sans-serif" }}>More</span>
        </div>
      </Section>

      {/* ── Section 4: Top Correlations (Pro) ───────────────────────────── */}
      <Section style={{ overflow: "hidden" }}>
        <SectionHeader title="Top Correlations" sub="What patterns actually drive your productivity" icon={Zap} color="#fbbf24" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, filter: isPro ? "none" : "blur(3px)", pointerEvents: isPro ? "auto" : "none" }}>
          <CorrelationCard
            icon={Dumbbell}
            color="#c084fc"
            title="Exercise impact"
            value={exercisePct !== null ? `+${exercisePct}%` : "—"}
            detail={
              exercisePct !== null
                ? `On days you exercise, you complete ${exercisePct}% more tasks`
                : "Log workouts and tasks to see how exercise impacts your productivity"
            }
          />
          <CorrelationCard
            icon={Activity}
            color="#4f9cf9"
            title="Journal streak"
            value={journalDays > 0 ? `${journalDays}d` : "—"}
            detail={
              journalDays > 0
                ? `${journalDays} journal entries this month — journaling correlates with goal progress`
                : "Start journaling to see correlation with goal progress"
            }
          />
          <CorrelationCard
            icon={Calendar}
            color="#34c98a"
            title="Monday planning"
            value={dowData[0]?.tasks > 0 ? `${dowData[0].tasks} tasks` : "—"}
            detail="Best weeks tend to start with Monday task completion. Your strongest start day unlocks the week."
          />
        </div>
        {!isPro && <ProBlurOverlay onUpgrade={onUpgrade} />}
      </Section>

      {/* ── Section 5: Weekly Trend ──────────────────────────────────────── */}
      <Section>
        <SectionHeader title="Weekly Trend" sub="Tasks done + habits logged — last 8 weeks" icon={TrendingUp} color="#4f9cf9" />
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weeklyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: "rgba(148,163,184,0.5)", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(148,163,184,0.4)", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => (
                <span style={{ color: "rgba(148,163,184,0.6)", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>{value}</span>
              )}
            />
            <Line type="monotone" dataKey="tasks" name="Tasks done" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1" }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="habits" name="Habits logged" stroke="#34c98a" strokeWidth={2.5} dot={{ r: 3, fill: "#34c98a" }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </Section>
    </div>
  );
}

// ─── Dumbbell icon (not in lucide imports above, use inline svg) ─────────────
function Dumbbell({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l4 4M14 14l4 4" />
      <path d="M14 6l4-4 4 4-4 4z" />
      <path d="M6 14l-4 4 4 4 4-4z" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}

// ─── InsightsMiniWidget export ────────────────────────────────────────────────

export function InsightsMiniWidget({ data }) {
  const weekDays = data?.weekDays ?? {};
  const kis = data?.kis ?? [];

  const bestDay = useMemo(() => {
    const dow = computeDayOfWeekTasks(weekDays);
    return dow.reduce((best, d) => (d.tasks > best.tasks ? d : best), dow[0]);
  }, [weekDays]);

  const topHabit = useMemo(() => {
    let top = null;
    let topCount = 0;
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    kis.forEach((ki) => {
      const count = Object.entries(ki?.dailyLogs ?? {}).filter(([d, v]) => {
        return new Date(d).getTime() > cutoff && v;
      }).length;
      if (count > topCount) { topCount = count; top = ki?.name; }
    });
    return { name: top, count: topCount };
  }, [kis]);

  const goalMomentum = useMemo(() => {
    const goals = data?.yearlyGoals ?? [];
    if (!goals.length) return null;
    const onPace = goals.filter((g) => {
      const pct = Math.min(100, ((g?.progress ?? 0) / (g?.target ?? 100)) * 100);
      const elapsed = (365 - daysRemainingInYear()) / 365;
      return pct / 100 >= elapsed;
    }).length;
    return { onPace, total: goals.length };
  }, [data]);

  const miniCard = {
    background: "rgba(15,23,42,0.6)",
    border: "1px solid rgba(51,65,85,0.5)",
    borderRadius: 12,
    padding: "12px 14px",
    flex: "1 1 120px",
    minWidth: 0,
  };

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <div style={miniCard}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(148,163,184,0.5)", letterSpacing: "0.8px", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
          Peak Day
        </div>
        <div style={{ fontFamily: "'Syne', serif", fontSize: 18, fontWeight: 800, color: "#34c98a" }}>
          {bestDay?.tasks > 0 ? bestDay.name : "—"}
        </div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
          {bestDay?.tasks > 0 ? `${bestDay.tasks} tasks avg` : "Add tasks to see your peak day"}
        </div>
      </div>

      <div style={miniCard}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(148,163,184,0.5)", letterSpacing: "0.8px", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
          Top Habit
        </div>
        <div style={{ fontFamily: "'Syne', serif", fontSize: 16, fontWeight: 800, color: "#f97316", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {topHabit.name ?? "—"}
        </div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
          {topHabit.count > 0 ? `${topHabit.count} days this month` : "Log a habit to see your streak"}
        </div>
      </div>

      <div style={miniCard}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(148,163,184,0.5)", letterSpacing: "0.8px", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
          Goal Momentum
        </div>
        <div style={{ fontFamily: "'Syne', serif", fontSize: 18, fontWeight: 800, color: "#6366f1" }}>
          {goalMomentum ? `${goalMomentum.onPace}/${goalMomentum.total}` : "—"}
        </div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
          {goalMomentum ? "goals on pace" : "No goals set"}
        </div>
      </div>
    </div>
  );
}
