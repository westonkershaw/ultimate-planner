/* eslint-disable */
import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Trash2, ChevronRight, Zap, TrendingUp, Award, Clock, Star, Flame } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area,
} from "recharts";
import {
  calcSleepScore,
  sleepScoreLabel,
  calcSleepLoggingStreak,
  calcSleep14DayTrend,
} from "../utils/math";

// ─── Constants ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const QUALITY_EMOJI  = ["", "😴", "💤", "😐", "😊", "⭐"];
const QUALITY_LABEL  = ["", "Poor", "Fair", "Okay", "Good", "Great"];
const QUALITY_COLOR  = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#6366f1"];

const DUR_COLOR = (h) => {
  if (h < 6)        return "#ef4444";
  if (h < 7)        return "#f97316";
  if (h <= 9)       return "#22c55e";
  return "#3b82f6";
};

const DUR_LABEL = (h) => {
  if (h < 6)        return "Short";
  if (h < 7)        return "Low";
  if (h <= 9)       return "Good";
  return "Long";
};

const SCORE_COLOR = (score) => {
  if (score >= 80) return "#34c98a";
  if (score >= 60) return "#4f9cf9";
  return "#fbbf24";
};

// ─── Style tokens ─────────────────────────────────────────────────────────────

const CARD = {
  background: "rgba(15,23,42,0.5)",
  border: "1px solid rgba(51,65,85,0.35)",
  borderRadius: 14,
  padding: "16px 18px",
  marginBottom: 14,
};

const SECTION_LABEL = {
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: 10,
};

const INPUT_STYLE = {
  background: "rgba(15,23,42,0.8)",
  border: "1px solid rgba(51,65,85,0.55)",
  borderRadius: 10,
  color: "#f1f5f9",
  padding: "10px 13px",
  fontSize: 13,
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const BTN_PRIMARY = {
  background: "linear-gradient(135deg,#6366f1,#818cf8)",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  padding: "11px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "'DM Sans', sans-serif",
  width: "100%",
  transition: "opacity 0.2s",
};

const BTN_DISABLED = {
  ...BTN_PRIMARY,
  background: "rgba(30,40,60,0.5)",
  color: "rgba(255,255,255,0.25)",
  cursor: "default",
};

const TAB_PILL_ACTIVE = {
  background: "rgba(99,102,241,0.25)",
  color: "#a5b4fc",
  border: "1px solid rgba(99,102,241,0.35)",
};

const TAB_PILL_IDLE = {
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.07)",
};

const SUBTAB_ANIM = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { type: "spring", stiffness: 400, damping: 30 },
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function parseDuration(bedTime, wakeTime) {
  if (!bedTime || !wakeTime) return 0;
  const [bh = 0, bm = 0] = bedTime.split(":").map(Number);
  const [wh = 0, wm = 0] = wakeTime.split(":").map(Number);
  let bedMins  = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= bedMins) wakeMins += 24 * 60;
  return (wakeMins - bedMins) / 60;
}

function fmtDuration(hours) {
  if (!hours || hours <= 0) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

function localDateKey(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toLocaleDateString("en-CA");
}

function shortDayName(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function bestStreak(sleepLog, minHours) {
  const mh = minHours === undefined ? 7 : minHours;
  if (!sleepLog.length) return 0;
  const sorted = [...sleepLog]
    .filter((e) => parseDuration(e.bedTime, e.wakeTime) >= mh)
    .map((e) => e.date)
    .sort();
  let best = 0;
  let cur  = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T12:00:00");
    const curr = new Date(sorted[i]     + "T12:00:00");
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  if (sorted.length) best = Math.max(best, cur);
  return best;
}

function buildDistribution(sleepLog) {
  const ranges = { "<6h": 0, "6–7h": 0, "7–8h": 0, "8–9h": 0, "9h+": 0 };
  sleepLog.forEach((e) => {
    const h = parseDuration(e.bedTime, e.wakeTime);
    if (h <= 0)    return;
    if (h < 6)     ranges["<6h"]++;
    else if (h < 7) ranges["6–7h"]++;
    else if (h < 8) ranges["7–8h"]++;
    else if (h < 9) ranges["8–9h"]++;
    else            ranges["9h+"]++;
  });
  return ranges;
}

const DIST_COLORS = {
  "<6h":  "#ef4444",
  "6–7h": "#f97316",
  "7–8h": "#22c55e",
  "8–9h": "#22c55e",
  "9h+":  "#3b82f6",
};

// ─── Sleep Score Card ─────────────────────────────────────────────────────────

function SleepScoreCard({ sleepLog }) {
  const yesterday = localDateKey(1);
  const dayBefore  = localDateKey(2);

  const lastNight = useMemo(
    () => sleepLog.find((e) => e.date === yesterday) || null,
    [sleepLog, yesterday]
  );
  const prevNight = useMemo(
    () => sleepLog.find((e) => e.date === dayBefore) || null,
    [sleepLog, dayBefore]
  );

  const score = useMemo(() => {
    if (!lastNight) return null;
    const hrs = parseDuration(lastNight.bedTime, lastNight.wakeTime);
    const prevBed = prevNight ? prevNight.bedTime : null;
    return calcSleepScore(hrs, lastNight.bedTime, prevBed);
  }, [lastNight, prevNight]);

  if (!lastNight || score === null) {
    return (
      <div style={{ ...CARD, textAlign: "center", padding: "20px 18px" }}>
        <Moon size={28} style={{ color: "rgba(129,140,248,0.4)", marginBottom: 8 }} />
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          Log last night's sleep to see your score
        </div>
      </div>
    );
  }

  const label     = sleepScoreLabel(score);
  const color     = SCORE_COLOR(score);
  const hrs       = parseDuration(lastNight.bedTime, lastNight.wakeTime);
  const ringPct   = score / 100;
  const R         = 36;
  const CIRC      = 2 * Math.PI * R;
  const dash      = ringPct * CIRC;
  const gap       = CIRC - dash;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        ...CARD,
        background: "rgba(15,23,42,0.7)",
        border: "1px solid rgba(99,102,241,0.2)",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* Circular ring */}
        <div style={{ position: "relative", flexShrink: 0, width: 88, height: 88 }}>
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle
              cx="44" cy="44" r={R}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="7"
            />
            <circle
              cx="44" cy="44" r={R}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={dash + " " + gap}
              strokeDashoffset={CIRC / 4}
              style={{ transition: "stroke-dasharray 0.8s ease", filter: "drop-shadow(0 0 6px " + color + "88)" }}
            />
          </svg>
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "'Syne', serif", lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              score
            </span>
          </div>
        </div>

        {/* Label + stats */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Syne', serif", lineHeight: 1, marginBottom: 3 }}>
            {label}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
            Last night &middot; {fmtDate(yesterday)}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={11} style={{ color: DUR_COLOR(hrs) }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: DUR_COLOR(hrs) }}>{fmtDuration(hrs)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Star size={11} style={{ color: QUALITY_COLOR[lastNight.quality] }} />
              <span style={{ fontSize: 12, color: QUALITY_COLOR[lastNight.quality], fontWeight: 700 }}>
                {QUALITY_LABEL[lastNight.quality]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── SVG 14-Day Sleep Chart ────────────────────────────────────────────────────

function SleepChart14Day({ sleepLog }) {
  const trend = useMemo(() => calcSleep14DayTrend(sleepLog), [sleepLog]);

  const W = 320;
  const H = 160;
  const PAD_L = 28;
  const PAD_R = 8;
  const PAD_T = 14;
  const PAD_B = 22;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const MAX_H  = 10;

  const toX = (i) => PAD_L + (i / (trend.length - 1)) * chartW;
  const toY = (h) => PAD_T + chartH - (h / MAX_H) * chartH;

  // Only points with data
  const dataPoints = trend
    .map((p, i) => (p.hours !== null ? { x: toX(i), y: toY(p.hours), h: p.hours } : null))
    .filter(Boolean);

  // Smooth polyline via cardinal interpolation (simple approach: straight lines connect data)
  const polyline = dataPoints.map((p) => p.x + "," + p.y).join(" ");

  // Gradient fill path — close down to baseline
  let fillPath = "";
  if (dataPoints.length >= 2) {
    const pts = dataPoints;
    fillPath = "M " + pts[0].x + "," + pts[0].y;
    for (let i = 1; i < pts.length; i++) fillPath += " L " + pts[i].x + "," + pts[i].y;
    fillPath += " L " + pts[pts.length - 1].x + "," + (PAD_T + chartH);
    fillPath += " L " + pts[0].x + "," + (PAD_T + chartH) + " Z";
  }

  // Color zone fills
  const y6   = toY(6);
  const y7   = toY(7);
  const y8   = toY(8);
  const y9   = toY(9);
  const yTop = PAD_T;
  const yBot = PAD_T + chartH;

  const gradId = "sleepGrad14";
  const maskId = "sleepMask14";

  return (
    <div style={{ ...CARD, overflow: "hidden" }}>
      <div style={SECTION_LABEL}>14-Day Sleep Trend</div>
      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={"0 0 " + W + " " + H}
          width="100%"
          style={{ display: "block", minWidth: 260 }}
          aria-label="14-day sleep trend chart"
          role="img"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Color zone fills */}
          {/* Below 6h — red */}
          <rect x={PAD_L} y={y6} width={chartW} height={yBot - y6} fill="#ef444412" />
          {/* 6-7h — amber */}
          <rect x={PAD_L} y={y7} width={chartW} height={y6 - y7} fill="#f9731612" />
          {/* 7-8h — green */}
          <rect x={PAD_L} y={y8} width={chartW} height={y7 - y8} fill="#22c55e14" />
          {/* 8-9h — teal */}
          <rect x={PAD_L} y={y9} width={chartW} height={y8 - y9} fill="#4f9cf914" />
          {/* 9h+ — lighter blue */}
          <rect x={PAD_L} y={yTop} width={chartW} height={y9 - yTop} fill="#3b82f60a" />

          {/* 7h target dashed line */}
          <line
            x1={PAD_L} y1={y7} x2={PAD_L + chartW} y2={y7}
            stroke="#22c55e" strokeWidth="1" strokeDasharray="5,3" opacity="0.7"
          />
          <text x={PAD_L + chartW + 2} y={y7 + 3} fontSize="7" fill="#22c55e" opacity="0.8">7h</text>

          {/* 8h ideal dashed line */}
          <line
            x1={PAD_L} y1={y8} x2={PAD_L + chartW} y2={y8}
            stroke="#4f9cf9" strokeWidth="1" strokeDasharray="5,3" opacity="0.7"
          />
          <text x={PAD_L + chartW + 2} y={y8 + 3} fontSize="7" fill="#4f9cf9" opacity="0.8">8h</text>

          {/* Gradient fill */}
          {fillPath && <path d={fillPath} fill={"url(#" + gradId + ")"} />}

          {/* Polyline */}
          {dataPoints.length >= 2 && (
            <polyline
              points={polyline}
              fill="none"
              stroke="#818cf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data dots */}
          {dataPoints.map((p, i) => {
            const dotColor = DUR_COLOR(p.h);
            return (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={dotColor} opacity="0.9" />
            );
          })}

          {/* X-axis day labels */}
          {trend.map((p, i) => {
            const x = toX(i);
            const hasData = p.hours !== null;
            return (
              <text
                key={p.date}
                x={x}
                y={H - 4}
                textAnchor="middle"
                fontSize="8"
                fill={hasData ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)"}
                fontFamily="'DM Sans', sans-serif"
                fontWeight={hasData ? "700" : "400"}
              >
                {p.label}
              </text>
            );
          })}

          {/* Y-axis labels */}
          {[0, 2, 4, 6, 8, 10].map((h) => {
            const y = toY(h);
            return (
              <text key={h} x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.3)" fontFamily="'DM Sans', sans-serif">
                {h}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
        {[
          { color: "#ef4444", label: "<6h" },
          { color: "#f97316", label: "6–7h" },
          { color: "#22c55e", label: "7–8h" },
          { color: "#4f9cf9", label: "8–9h" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, opacity: 0.85 }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Insight Cards ────────────────────────────────────────────────────────────

function InsightCards({ sleepLog, weekDays }) {
  // Average this week vs last week
  const { thisWeekAvg, lastWeekAvg } = useMemo(() => {
    const weekAvg = (offsetStart) => {
      const hrs = [];
      for (let i = offsetStart; i < offsetStart + 7; i++) {
        const key = localDateKey(i);
        const e = sleepLog.find((e) => e.date === key);
        if (e) {
          const h = parseDuration(e.bedTime, e.wakeTime);
          if (h > 0) hrs.push(h);
        }
      }
      return hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null;
    };
    return { thisWeekAvg: weekAvg(0), lastWeekAvg: weekAvg(7) };
  }, [sleepLog]);

  // Best night
  const bestNight = useMemo(() => {
    if (!sleepLog.length) return null;
    let best = null;
    for (const e of sleepLog) {
      const h = parseDuration(e.bedTime, e.wakeTime);
      if (!best || h > best.h) best = { h, date: e.date };
    }
    return best;
  }, [sleepLog]);

  // Workout correlation
  const workoutDayNames = useMemo(() => {
    return Object.entries(weekDays)
      .filter(([, v]) => Array.isArray(v.tasks) && v.tasks.some((t) => t.category === "physical"))
      .map(([k]) => k);
  }, [weekDays]);

  const { workoutAvg, nonWorkoutAvg } = useMemo(() => {
    if (!workoutDayNames.length) return { workoutAvg: null, nonWorkoutAvg: null };
    const wArr = [];
    const nArr = [];
    const full = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    for (let i = 0; i < 30; i++) {
      const key = localDateKey(i);
      const d = new Date(key + "T12:00:00");
      const fullName = full[d.getDay()];
      const entry = sleepLog.find((e) => e.date === key);
      if (!entry) continue;
      const h = parseDuration(entry.bedTime, entry.wakeTime);
      if (h <= 0) continue;
      if (workoutDayNames.includes(fullName)) wArr.push(h);
      else nArr.push(h);
    }
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    return { workoutAvg: avg(wArr), nonWorkoutAvg: avg(nArr) };
  }, [workoutDayNames, sleepLog]);

  const trendArrow = (thisWeekAvg !== null && lastWeekAvg !== null)
    ? (thisWeekAvg >= lastWeekAvg ? "↑" : "↓")
    : null;
  const trendColor = trendArrow === "↑" ? "#34c98a" : "#f97316";

  const workoutPctBetter = (workoutAvg !== null && nonWorkoutAvg !== null && nonWorkoutAvg > 0)
    ? Math.round(((workoutAvg - nonWorkoutAvg) / nonWorkoutAvg) * 100)
    : null;

  const cards = [
    {
      icon: TrendingUp,
      color: "#4f9cf9",
      title: "Weekly Average",
      value: thisWeekAvg ? fmtDuration(thisWeekAvg) : "—",
      sub: thisWeekAvg !== null && lastWeekAvg !== null
        ? trendArrow + " " + fmtDuration(Math.abs(thisWeekAvg - lastWeekAvg)) + " vs last week"
        : "Not enough data yet",
      subColor: trendArrow ? trendColor : "rgba(255,255,255,0.35)",
    },
    {
      icon: Award,
      color: "#818cf8",
      title: "Best Night",
      value: bestNight ? fmtDuration(bestNight.h) : "—",
      sub: bestNight ? fmtDate(bestNight.date) + " (" + shortDayName(bestNight.date) + ")" : "No data",
      subColor: "rgba(255,255,255,0.4)",
    },
    {
      icon: Zap,
      color: workoutPctBetter !== null && workoutPctBetter > 0 ? "#34c98a" : "#f97316",
      title: "Workout Effect",
      value: workoutPctBetter !== null
        ? (workoutPctBetter > 0 ? "+" : "") + workoutPctBetter + "% on gym days"
        : "—",
      sub: workoutPctBetter !== null
        ? "Sleep " + (workoutPctBetter > 0 ? "better" : "worse") + " on days you exercise"
        : "Log workouts to see correlation",
      subColor: workoutPctBetter !== null
        ? (workoutPctBetter > 0 ? "#34c98a" : "#f97316")
        : "rgba(255,255,255,0.35)",
    },
  ];

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...SECTION_LABEL, marginBottom: 10 }}>Sleep Insights</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cards.map(({ icon: Icon, color, title, value, sub, subColor }, idx) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.06, type: "spring", stiffness: 400, damping: 30 }}
            style={{
              ...CARD,
              marginBottom: 0,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 14px",
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: color + "18",
              border: "1px solid " + color + "30",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 2 }}>
                {title}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", fontFamily: "'Syne', serif", lineHeight: 1.2 }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: subColor, marginTop: 2 }}>
                {sub}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Logging Streak Badge ─────────────────────────────────────────────────────

function LoggingStreakBadge({ sleepLog }) {
  const streak = useMemo(() => calcSleepLoggingStreak(sleepLog), [sleepLog]);
  if (streak === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(251,191,36,0.1)",
        border: "1px solid rgba(251,191,36,0.3)",
        borderRadius: 20,
        padding: "6px 14px",
        marginBottom: 14,
      }}
    >
      <Flame size={13} style={{ color: "#fbbf24" }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>
        {streak} day logging streak
      </span>
    </motion.div>
  );
}

// ─── Quality slider ───────────────────────────────────────────────────────────

function QualityPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((q) => (
        <button
          key={q}
          onClick={() => onChange(q)}
          title={QUALITY_LABEL[q]}
          style={{
            fontSize: 28,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 10,
            boxShadow: value === q ? "0 0 0 3px " + QUALITY_COLOR[q] : "none",
            transition: "box-shadow 0.15s, opacity 0.15s",
            lineHeight: 1,
            opacity: value && value !== q ? 0.4 : 1,
          }}
        >
          {QUALITY_EMOJI[q]}
        </button>
      ))}
    </div>
  );
}

// ─── Quality dots display ─────────────────────────────────────────────────────

function QualityDots({ quality }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((q) => (
        <div
          key={q}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: q <= quality ? QUALITY_COLOR[quality] : "rgba(255,255,255,0.12)",
            transition: "background 0.2s",
          }}
        />
      ))}
    </div>
  );
}

// ─── Duration bar ─────────────────────────────────────────────────────────────

function DurationBar({ hours }) {
  const maxH  = 12;
  const pct   = Math.min((hours / maxH) * 100, 100);
  const color = DUR_COLOR(hours);
  return (
    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 3,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG SUB-TAB
// ─────────────────────────────────────────────────────────────────────────────

function LogTab({ data, onChange }) {
  const sleepLog  = data.sleepLog || [];
  const today     = todayStr();
  const yesterday = localDateKey(1);

  const lastNightEntry = sleepLog.find((e) => e.date === yesterday) || null;

  const [bedTime,  setBedTime]  = useState("22:30");
  const [wakeTime, setWakeTime] = useState("06:30");
  const [quality,  setQuality]  = useState(0);
  const [notes,    setNotes]    = useState("");
  const [saved,    setSaved]    = useState(false);

  const duration  = parseDuration(bedTime, wakeTime);
  const canSave   = quality > 0 && bedTime && wakeTime && duration > 0;

  function handleSave() {
    if (!canSave) return;
    const entry = {
      id:       uid(),
      date:     today,
      bedTime,
      wakeTime,
      quality,
      notes:    notes.trim(),
    };
    onChange((prev) => ({
      ...prev,
      sleepLog: [
        ...(prev.sleepLog || []).filter((e) => e.date !== today),
        entry,
      ],
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      {/* Sleep Score */}
      <SleepScoreCard sleepLog={sleepLog} />

      {/* Logging streak */}
      <LoggingStreakBadge sleepLog={sleepLog} />

      {/* Last Night Summary */}
      {lastNightEntry && (
        <div style={{ ...CARD, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <div style={SECTION_LABEL}>Last Night</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 34 }}>{QUALITY_EMOJI[lastNightEntry.quality]}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: DUR_COLOR(parseDuration(lastNightEntry.bedTime, lastNightEntry.wakeTime)), fontFamily: "'Syne', serif" }}>
                {fmtDuration(parseDuration(lastNightEntry.bedTime, lastNightEntry.wakeTime))}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                {lastNightEntry.bedTime} {"\u2192"} {lastNightEntry.wakeTime} &middot; {QUALITY_LABEL[lastNightEntry.quality]}
              </div>
              {lastNightEntry.notes && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3, fontStyle: "italic" }}>
                  &ldquo;{lastNightEntry.notes}&rdquo;
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Form */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Log Tonight&apos;s Sleep</div>

        {/* Time pickers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 5, fontWeight: 600 }}>
              <Moon size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              Bed Time
            </div>
            <input
              type="time"
              value={bedTime}
              onChange={(e) => setBedTime(e.target.value)}
              style={{ ...INPUT_STYLE, colorScheme: "dark" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 5, fontWeight: 600 }}>
              <Sun size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              Wake Time
            </div>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              style={{ ...INPUT_STYLE, colorScheme: "dark" }}
            />
          </div>
        </div>

        {/* Duration preview */}
        {duration > 0 && (
          <div style={{
            textAlign: "center",
            marginBottom: 14,
            padding: "8px",
            background: DUR_COLOR(duration) + "18",
            border: "1px solid " + DUR_COLOR(duration) + "40",
            borderRadius: 8,
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: DUR_COLOR(duration), fontFamily: "'Syne', serif" }}>
              {fmtDuration(duration)}
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>
              {DUR_LABEL(duration)}
            </span>
          </div>
        )}

        {/* Quality picker */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...SECTION_LABEL, marginBottom: 10 }}>Sleep Quality</div>
          <QualityPicker value={quality} onChange={setQuality} />
          {quality > 0 && (
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: QUALITY_COLOR[quality], fontWeight: 700 }}>
              {QUALITY_EMOJI[quality]} {QUALITY_LABEL[quality]}
            </div>
          )}
        </div>

        {/* Notes */}
        <textarea
          placeholder="Optional notes (dreams, disturbances, medication…)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{
            ...INPUT_STYLE,
            resize: "none",
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        />

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={canSave ? BTN_PRIMARY : BTN_DISABLED}
        >
          {saved ? "Saved \u2713" : "Save Sleep Log"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY SUB-TAB
// ─────────────────────────────────────────────────────────────────────────────

function HistoryTab({ data, onChange }) {
  const sleepLog = data.sleepLog || [];

  const sorted = useMemo(
    () => [...sleepLog].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
    [sleepLog]
  );

  function handleDelete(id) {
    onChange((prev) => ({
      ...prev,
      sleepLog: (prev.sleepLog || []).filter((e) => e.id !== id),
    }));
  }

  if (!sorted.length) {
    return (
      <div style={{ ...CARD, textAlign: "center", padding: 40 }}>
        <Moon size={36} style={{ color: "rgba(255,255,255,0.15)", marginBottom: 12 }} />
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>No sleep logs yet.</div>
        <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, marginTop: 4 }}>
          Head to the Log tab to record your first night.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map((entry) => {
        const h = parseDuration(entry.bedTime, entry.wakeTime);
        return (
          <motion.div
            key={entry.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={CARD}
          >
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{QUALITY_EMOJI[entry.quality]}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>
                    {fmtDate(entry.date)}
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: 6 }}>
                      {shortDayName(entry.date)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    {entry.bedTime} {"\u2192"} {entry.wakeTime}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: DUR_COLOR(h), fontFamily: "'Syne', serif" }}>
                  {fmtDuration(h)}
                </span>
                <button
                  onClick={() => handleDelete(entry.id)}
                  title="Delete entry"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Duration bar + quality dots */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <DurationBar hours={h} />
              <QualityDots quality={entry.quality} />
            </div>

            {/* Notes */}
            {entry.notes && (
              <div style={{ marginTop: 7, fontSize: 11, color: "rgba(255,255,255,0.38)", fontStyle: "italic", lineHeight: 1.4 }}>
                {entry.notes}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHTS SUB-TAB
// ─────────────────────────────────────────────────────────────────────────────

function InsightsTab({ data }) {
  const sleepLog = data.sleepLog || [];
  const weekDays = data.weekDays || {};

  // ── 7-day average ──────────────────────────────────────────────────────────
  const avg7 = useMemo(() => {
    const entries = [];
    for (let i = 0; i < 7; i++) {
      const key   = localDateKey(i);
      const entry = sleepLog.find((e) => e.date === key);
      if (entry) {
        const h = parseDuration(entry.bedTime, entry.wakeTime);
        if (h > 0) entries.push(h);
      }
    }
    if (!entries.length) return null;
    return entries.reduce((a, b) => a + b, 0) / entries.length;
  }, [sleepLog]);

  // ── Distribution ──────────────────────────────────────────────────────────
  const dist = useMemo(() => buildDistribution(sleepLog), [sleepLog]);
  const distTotal = Object.values(dist).reduce((a, b) => a + b, 0);

  // ── Best streak ───────────────────────────────────────────────────────────
  const streak = useMemo(() => bestStreak(sleepLog), [sleepLog]);

  if (!sleepLog.length) {
    return (
      <div style={{ ...CARD, textAlign: "center", padding: 40 }}>
        <TrendingUp size={36} style={{ color: "rgba(255,255,255,0.15)", marginBottom: 12 }} />
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>No data yet.</div>
        <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, marginTop: 4 }}>
          Log a few nights to see your insights.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {/* Weekly avg */}
        <div style={{ ...CARD, marginBottom: 0, textAlign: "center" }}>
          <div style={SECTION_LABEL}>7-Day Avg</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: avg7 ? DUR_COLOR(avg7) : "rgba(255,255,255,0.2)", fontFamily: "'Syne', serif" }}>
            {avg7 ? fmtDuration(avg7) : "—"}
          </div>
          {avg7 && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
              {DUR_LABEL(avg7)}
            </div>
          )}
        </div>

        {/* Best streak */}
        <div style={{ ...CARD, marginBottom: 0, textAlign: "center" }}>
          <div style={SECTION_LABEL}>Best Streak</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#6366f1", fontFamily: "'Syne', serif" }}>
            {streak}
            <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>
              nights
            </span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
            {"\u2265"}7h consecutive
          </div>
        </div>
      </div>

      {/* 14-day SVG chart */}
      <SleepChart14Day sleepLog={sleepLog} />

      {/* Auto-generated insight cards */}
      <InsightCards sleepLog={sleepLog} weekDays={weekDays} />

      {/* Distribution bars */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Duration Distribution</div>
        {distTotal === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>No data</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(dist).map(([label, count]) => {
              const pct = distTotal ? Math.round((count / distTotal) * 100) : 0;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700, flexShrink: 0 }}>
                    {label}
                  </div>
                  <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: DIST_COLORS[label],
                        borderRadius: 4,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  <div style={{ width: 36, fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "right" }}>
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRENDS SUB-TAB (Recharts sleep score line chart)
// ─────────────────────────────────────────────────────────────────────────────

function TrendsTab({ data }) {
  const sleepLog = data.sleepLog || [];
  const [range, setRange] = useState(7); // 7 | 14 | 30

  // Build chart data: one point per day in the range
  const chartData = useMemo(() => {
    const points = [];
    for (let i = range - 1; i >= 0; i--) {
      const key = localDateKey(i);
      const entry = sleepLog.find((e) => e.date === key);
      const d = new Date(key + "T12:00:00");
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      if (entry) {
        const hrs = parseDuration(entry.bedTime, entry.wakeTime);
        // Find previous day entry for consistency score
        const prevKey = localDateKey(i + 1);
        const prevEntry = sleepLog.find((e) => e.date === prevKey);
        const prevBed = prevEntry ? prevEntry.bedTime : null;
        const score = calcSleepScore(hrs, entry.bedTime, prevBed);
        points.push({
          date: key,
          label,
          score,
          duration: +hrs.toFixed(2),
          quality: entry.quality || 0,
        });
      } else {
        points.push({ date: key, label, score: null, duration: null, quality: null });
      }
    }
    return points;
  }, [sleepLog, range]);

  // Compute stats from entries with data
  const withData = useMemo(() => chartData.filter((p) => p.score !== null), [chartData]);

  const avgDuration = useMemo(() => {
    const durations = withData.map((p) => p.duration).filter((d) => d > 0);
    if (!durations.length) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }, [withData]);

  const avgScore = useMemo(() => {
    const scores = withData.map((p) => p.score).filter((s) => s > 0);
    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [withData]);

  const { best, worst } = useMemo(() => {
    if (!withData.length) return { best: null, worst: null };
    let b = withData[0], w = withData[0];
    withData.forEach((p) => {
      if (p.score > b.score) b = p;
      if (p.score < w.score) w = p;
    });
    return { best: b, worst: w };
  }, [withData]);

  const scoreColor = (s) => {
    if (s >= 80) return "#34c98a";
    if (s >= 60) return "#4f9cf9";
    return "#fbbf24";
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p || p.score === null) return null;
    return (
      <div style={{
        background: "rgba(15,17,23,0.95)",
        border: "1px solid rgba(99,102,241,0.4)",
        borderRadius: 10,
        padding: "10px 14px",
        fontFamily: "'DM Sans', sans-serif",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{p.label}</div>
        <div style={{ fontSize: 11, color: scoreColor(p.score), fontWeight: 700 }}>
          Score: {p.score}
        </div>
        <div style={{ fontSize: 11, color: DUR_COLOR(p.duration) }}>
          Duration: {fmtDuration(p.duration)}
        </div>
        {p.quality > 0 && (
          <div style={{ fontSize: 11, color: QUALITY_COLOR[p.quality] }}>
            Quality: {QUALITY_LABEL[p.quality]} {QUALITY_EMOJI[p.quality]}
          </div>
        )}
      </div>
    );
  };

  if (!sleepLog.length) {
    return (
      <div style={{ ...CARD, textAlign: "center", padding: 40 }}>
        <TrendingUp size={36} style={{ color: "rgba(255,255,255,0.15)", marginBottom: 12 }} />
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>No sleep data yet.</div>
        <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, marginTop: 4 }}>
          Log a few nights to see your sleep score trends.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Range toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {[7, 14, 30].map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              background: range === r ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.04)",
              color: range === r ? "#a5b4fc" : "rgba(255,255,255,0.5)",
              border: `1px solid ${range === r ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.07)"}`,
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s",
            }}
          >
            {r} Days
          </button>
        ))}
      </div>

      {/* Sleep Score Line Chart */}
      <div style={{ ...CARD, overflow: "hidden" }}>
        <div style={SECTION_LABEL}>Sleep Score Trend</div>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
                interval={range <= 7 ? 0 : range <= 14 ? 1 : 3}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(99,102,241,0.3)" }} />
              <ReferenceLine y={80} stroke="#34c98a" strokeDasharray="5 3" strokeOpacity={0.5} label={{ value: "Great", fill: "#34c98a", fontSize: 9, position: "right" }} />
              <ReferenceLine y={60} stroke="#4f9cf9" strokeDasharray="5 3" strokeOpacity={0.4} label={{ value: "Good", fill: "#4f9cf9", fontSize: 9, position: "right" }} />
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="score"
                stroke="none"
                fill="url(#scoreGradient)"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#818cf8"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#818cf8", stroke: "#0f1117", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#a5b4fc", stroke: "#0f1117", strokeWidth: 2 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Average Duration Trend Chart */}
      <div style={{ ...CARD, overflow: "hidden" }}>
        <div style={SECTION_LABEL}>Duration Trend</div>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
                interval={range <= 7 ? 0 : range <= 14 ? 1 : 3}
              />
              <YAxis
                domain={[0, 12]}
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
                width={32}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(34,197,94,0.3)" }} />
              <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="5 3" strokeOpacity={0.6} label={{ value: "7h min", fill: "#22c55e", fontSize: 9, position: "right" }} />
              {avgDuration > 0 && (
                <ReferenceLine y={avgDuration} stroke="#818cf8" strokeDasharray="6 4" strokeOpacity={0.7} label={{ value: `avg ${fmtDuration(avgDuration)}`, fill: "#818cf8", fontSize: 9, position: "right" }} />
              )}
              <defs>
                <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="duration"
                stroke="none"
                fill="url(#durationGradient)"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="duration"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3.5, fill: "#22c55e", stroke: "#0f1117", strokeWidth: 2 }}
                activeDot={{ r: 5.5, fill: "#4ade80", stroke: "#0f1117", strokeWidth: 2 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {/* Average Score */}
        <div style={{ ...CARD, marginBottom: 0, textAlign: "center" }}>
          <div style={SECTION_LABEL}>Avg Score</div>
          <div style={{
            fontSize: 32, fontWeight: 800,
            color: avgScore > 0 ? scoreColor(avgScore) : "rgba(255,255,255,0.2)",
            fontFamily: "'Syne', serif",
          }}>
            {avgScore > 0 ? avgScore : "\u2014"}
          </div>
          {avgScore > 0 && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
              {sleepScoreLabel(avgScore)}
            </div>
          )}
        </div>

        {/* Average Duration */}
        <div style={{ ...CARD, marginBottom: 0, textAlign: "center" }}>
          <div style={SECTION_LABEL}>Avg Duration</div>
          <div style={{
            fontSize: 32, fontWeight: 800,
            color: avgDuration > 0 ? DUR_COLOR(avgDuration) : "rgba(255,255,255,0.2)",
            fontFamily: "'Syne', serif",
          }}>
            {avgDuration > 0 ? fmtDuration(avgDuration) : "\u2014"}
          </div>
          {avgDuration > 0 && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
              {DUR_LABEL(avgDuration)}
            </div>
          )}
        </div>
      </div>

      {/* Best / Worst Score Highlights */}
      {best && worst && withData.length >= 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              ...CARD,
              marginBottom: 0,
              padding: "14px 16px",
              background: "rgba(52,201,138,0.06)",
              border: "1px solid rgba(52,201,138,0.2)",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
            }}>
              <Award size={13} style={{ color: "#34c98a" }} />
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                Best Score
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#34c98a", fontFamily: "'Syne', serif", lineHeight: 1 }}>
              {best.score}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              {best.label} &middot; {fmtDuration(best.duration)}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.05 }}
            style={{
              ...CARD,
              marginBottom: 0,
              padding: "14px 16px",
              background: "rgba(251,191,36,0.06)",
              border: "1px solid rgba(251,191,36,0.2)",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
            }}>
              <TrendingUp size={13} style={{ color: "#fbbf24" }} />
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                Worst Score
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fbbf24", fontFamily: "'Syne', serif", lineHeight: 1 }}>
              {worst.score}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              {worst.label} &middot; {fmtDuration(worst.duration)}
            </div>
          </motion.div>
        </div>
      )}

      {/* Legend */}
      <div style={{ ...CARD, padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { color: "#818cf8", label: "Sleep Score", dash: false },
            { color: "#22c55e", label: "Duration", dash: false },
            { color: "#34c98a", label: "Great (80+)", dash: true },
            { color: "#4f9cf9", label: "Good (60+)", dash: true },
          ].map(({ color, label, dash }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 14,
                height: dash ? 0 : 3,
                borderRadius: 2,
                background: dash ? "transparent" : color,
                borderTop: dash ? `2px dashed ${color}` : "none",
              }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const SUB_TABS = [
  { id: "log",      label: "Log" },
  { id: "history",  label: "History" },
  { id: "insights", label: "Insights" },
  { id: "trends",   label: "Trends" },
];

export default function SleepTrackerTab({ data, onChange }) {
  const [activeTab, setActiveTab] = useState("log");

  const safeData = {
    sleepLog: data?.sleepLog || [],
    weekDays: data?.weekDays || {},
  };

  return (
    <div style={{ padding: "16px 0", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Moon size={20} style={{ color: "#818cf8" }} />
        <h2 style={{ margin: 0, fontFamily: "'Syne', serif", fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>
          Sleep Tracker
        </h2>
      </div>

      {/* Sub-tab pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              ...(activeTab === t.id ? TAB_PILL_ACTIVE : TAB_PILL_IDLE),
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} {...SUBTAB_ANIM}>
          {activeTab === "log"      && <LogTab      data={safeData} onChange={onChange} />}
          {activeTab === "history"  && <HistoryTab  data={safeData} onChange={onChange} />}
          {activeTab === "insights" && <InsightsTab data={safeData} />}
          {activeTab === "trends"   && <TrendsTab   data={safeData} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLEEP DASH WIDGET (named export)
// ─────────────────────────────────────────────────────────────────────────────

export function SleepDashWidget({ data, onNavigate }) {
  const sleepLog = data?.sleepLog || [];

  const yesterday     = localDateKey(1);
  const lastNight     = sleepLog.find((e) => e.date === yesterday) || null;
  const lastNightHrs  = lastNight ? parseDuration(lastNight.bedTime, lastNight.wakeTime) : 0;

  const avg7 = useMemo(() => {
    const entries = [];
    for (let i = 0; i < 7; i++) {
      const key   = localDateKey(i);
      const entry = sleepLog.find((e) => e.date === key);
      if (entry) {
        const h = parseDuration(entry.bedTime, entry.wakeTime);
        if (h > 0) entries.push(h);
      }
    }
    if (!entries.length) return null;
    return entries.reduce((a, b) => a + b, 0) / entries.length;
  }, [sleepLog]);

  const sparkBars = useMemo(() => {
    const bars = [];
    for (let i = 6; i >= 0; i--) {
      const key   = localDateKey(i);
      const entry = sleepLog.find((e) => e.date === key);
      const h     = entry ? parseDuration(entry.bedTime, entry.wakeTime) : 0;
      bars.push({ key, h, day: shortDayName(key) });
    }
    return bars;
  }, [sleepLog]);

  const maxBar = Math.max(...sparkBars.map((b) => b.h), 1);

  const score = useMemo(() => {
    if (!lastNight) return null;
    const prevNight = sleepLog.find((e) => e.date === localDateKey(2)) || null;
    return calcSleepScore(lastNightHrs, lastNight.bedTime, prevNight ? prevNight.bedTime : null);
  }, [lastNight, lastNightHrs, sleepLog]);

  return (
    <div style={{
      background: "rgba(15,23,42,0.5)",
      border: "1px solid rgba(51,65,85,0.35)",
      borderRadius: 14,
      padding: "14px 16px",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      minHeight: 120,
    }}>
      {/* Top row: last night + score */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Moon size={14} style={{ color: "#818cf8" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            Sleep
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastNight ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: DUR_COLOR(lastNightHrs), fontFamily: "'Syne', serif" }}>
                {fmtDuration(lastNightHrs)}
              </span>
              {score !== null && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: SCORE_COLOR(score),
                  background: SCORE_COLOR(score) + "18",
                  border: "1px solid " + SCORE_COLOR(score) + "35",
                  borderRadius: 6,
                  padding: "1px 6px",
                }}>
                  {score}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>No log</span>
          )}
          {avg7 && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              avg {fmtDuration(avg7)}
            </span>
          )}
        </div>
      </div>

      {/* Mini sparkline */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 36 }}>
        {sparkBars.map((bar) => (
          <div
            key={bar.key}
            title={bar.day + ": " + (bar.h > 0 ? fmtDuration(bar.h) : "No log")}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
          >
            <div style={{ width: "100%", height: 28, display: "flex", alignItems: "flex-end" }}>
              <div
                style={{
                  width: "100%",
                  height: bar.h > 0 ? Math.round((bar.h / maxBar) * 100) + "%" : "10%",
                  minHeight: 2,
                  background: bar.h > 0 ? DUR_COLOR(bar.h) : "rgba(255,255,255,0.07)",
                  borderRadius: "3px 3px 0 0",
                  transition: "height 0.3s ease",
                  opacity: bar.h > 0 ? 1 : 0.4,
                }}
              />
            </div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
              {bar.day.slice(0, 1)}
            </div>
          </div>
        ))}
      </div>

      {/* Log Sleep button */}
      <button
        onClick={() => onNavigate && onNavigate()}
        style={{
          background: "rgba(99,102,241,0.12)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 8,
          color: "#a5b4fc",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          padding: "6px 10px",
          fontFamily: "'DM Sans', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.12)")}
      >
        <Moon size={12} />
        Log Sleep
        <ChevronRight size={12} style={{ opacity: 0.6 }} />
      </button>
    </div>
  );
}
