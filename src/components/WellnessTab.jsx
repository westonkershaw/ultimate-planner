/* eslint-disable */
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid
} from "recharts";

const uid = () => Math.random().toString(36).slice(2, 9);

const MOOD_EMOJIS = ["", "😫", "😕", "😐", "🙂", "😄"];
const MOOD_LABELS = ["", "Awful", "Bad", "Okay", "Good", "Great"];
const MOOD_COLORS = [
  "",
  "rgba(239,68,68,0.6)",
  "rgba(249,115,22,0.5)",
  "rgba(234,179,8,0.4)",
  "rgba(34,197,94,0.5)",
  "rgba(45, 212, 191,0.7)"
];

const SECTION_LABEL = {
  fontSize: 12,
  fontWeight: 700,
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: 10
};

const CARD = {
  background: "rgba(17,24,39,0.7)",
  borderRadius: 16,
  padding: "16px 20px",
  marginBottom: 14
};

const FONT = "'DM Sans', sans-serif";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

function parseDuration(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return 0;
  const bedParts = bedtime.split(":").map(Number);
  const wakeParts = wakeTime.split(":").map(Number);
  const bh = isNaN(bedParts[0]) ? 0 : bedParts[0];
  const bm = isNaN(bedParts[1]) ? 0 : bedParts[1];
  const wh = isNaN(wakeParts[0]) ? 0 : wakeParts[0];
  const wm = isNaN(wakeParts[1]) ? 0 : wakeParts[1];
  let bedMins = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins < bedMins) wakeMins += 24 * 60;
  return (wakeMins - bedMins) / 60;
}

function fmtDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? h + "h " + m + "m" : h + "h";
}

function getDayName(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

function localDateKey(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toLocaleDateString("en-CA");
}

// ─── Wellness Score Calculator ────────────────────────────────────────────────
// Max 100pts: Sleep 25 + Exercise 25 + Meditation 20 + Water 15 + Mood 15

function calcWellnessScore(data) {
  const today = todayStr();
  const moodLog = data.moodLog || [];
  const sleepLog = data.sleepLog || [];
  const wellnessLog = data.wellnessLog || {};

  // Build last-7-days keys
  const last7 = [];
  for (let i = 6; i >= 0; i--) last7.push(localDateKey(i));

  // Sleep score: avg hours this week vs 8h goal (max 25)
  const sleepEntries = last7
    .map((k) => sleepLog.find((e) => e.date === k))
    .filter(Boolean);
  const avgSleep = sleepEntries.length
    ? sleepEntries.reduce((s, e) => s + parseDuration(e.bedtime, e.wakeTime), 0) / sleepEntries.length
    : 0;
  const sleepScore = Math.min(25, Math.round((avgSleep / 8) * 25));

  // Exercise score: days moved this week (max 25, 5pts per day capped at 5 days)
  const movedDays = last7.filter((k) => wellnessLog[k]?.moved).length;
  const exerciseScore = Math.min(25, movedDays * 5);

  // Meditation score: days meditated (max 20, ~2.85pts per day for 7 days)
  const meditatedDays = last7.filter((k) => wellnessLog[k]?.meditated).length;
  const meditationScore = Math.min(20, Math.round((meditatedDays / 7) * 20));

  // Water score: merge wellnessLog and shared up_waterLog localStorage
  let sharedWaterLog = [];
  try { sharedWaterLog = JSON.parse(localStorage.getItem("up_waterLog") || "[]"); } catch {}
  const waterDays = last7.map((k) => {
    const fromWellness = wellnessLog[k]?.water || 0;
    const fromShared = (sharedWaterLog.find((e) => e.date === k) || {}).glasses || 0;
    return Math.max(fromWellness, fromShared);
  }).filter((w) => w > 0);
  const avgWater = waterDays.length
    ? waterDays.reduce((s, w) => s + w, 0) / waterDays.length
    : 0;
  const waterScore = Math.min(15, Math.round((avgWater / 8) * 15));

  // Mood score: avg mood this week vs 5 (max 15)
  const moodEntries = last7
    .map((k) => moodLog.find((e) => e.date === k))
    .filter((e) => e && e.mood > 0);
  const avgMood = moodEntries.length
    ? moodEntries.reduce((s, e) => s + e.mood, 0) / moodEntries.length
    : 0;
  const moodScore = Math.min(15, Math.round((avgMood / 5) * 15));

  const total = sleepScore + exerciseScore + meditationScore + waterScore + moodScore;
  return { total, sleepScore, exerciseScore, meditationScore, waterScore, moodScore };
}

function scoreGrade(score) {
  if (score >= 90) return { grade: "A+", color: "#22c55e" };
  if (score >= 80) return { grade: "A", color: "#22c55e" };
  if (score >= 70) return { grade: "B", color: "#86efac" };
  if (score >= 60) return { grade: "C", color: "#f59e0b" };
  if (score >= 50) return { grade: "D", color: "#f97316" };
  return { grade: "F", color: "#ef4444" };
}

// ─── Wellness Score Gauge ─────────────────────────────────────────────────────

function WellnessScoreGauge({ score }) {
  const { grade, color } = scoreGrade(score.total);
  const pct = score.total / 100;
  const r = 52;
  const cx = 72;
  const cy = 72;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - pct);

  const breakdownItems = [
    { label: "Sleep", val: score.sleepScore, max: 25, color: "#38bdf8" },
    { label: "Exercise", val: score.exerciseScore, max: 25, color: "#22c55e" },
    { label: "Meditation", val: score.meditationScore, max: 20, color: "#a78bfa" },
    { label: "Water", val: score.waterScore, max: 15, color: "#06b6d4" },
    { label: "Mood", val: score.moodScore, max: 15, color: "#f59e0b" },
  ];

  return (
    <div style={{ ...CARD, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
      {/* Circular gauge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <svg width={144} height={144} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={10}
          />
          {/* Fill */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
          />
        </svg>
        <div style={{ marginTop: -100, marginBottom: 0, textAlign: "center", zIndex: 1, position: "relative" }}>
          <div style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>{score.total}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 2 }}>{grade}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2, fontWeight: 600, letterSpacing: "0.5px" }}>WELLNESS SCORE</div>
        </div>
        <div style={{ height: 60 }} />
      </div>

      {/* Breakdown bars */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>
          Breakdown (this week)
        </div>
        {breakdownItems.map((item) => (
          <div key={item.label} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>
              <span>{item.label}</span>
              <span style={{ color: item.color, fontWeight: 700 }}>{item.val}/{item.max}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 5, overflow: "hidden" }}>
              <div
                style={{
                  width: Math.round((item.val / item.max) * 100) + "%",
                  height: "100%",
                  borderRadius: 99,
                  background: item.color,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Today's Wellness Checklist ───────────────────────────────────────────────

const WATER_LOG_KEY = "up_waterLog";

function readWaterGlasses(todayKey) {
  try {
    const log = JSON.parse(localStorage.getItem(WATER_LOG_KEY) || "[]");
    const entry = log.find((e) => e.date === todayKey);
    return entry ? entry.glasses : 0;
  } catch { return 0; }
}

function writeWaterGlasses(todayKey, glasses) {
  try {
    const log = JSON.parse(localStorage.getItem(WATER_LOG_KEY) || "[]");
    const idx = log.findIndex((e) => e.date === todayKey);
    if (idx >= 0) log[idx].glasses = glasses;
    else log.push({ date: todayKey, glasses });
    localStorage.setItem(WATER_LOG_KEY, JSON.stringify(log));
  } catch { /* noop */ }
}

function TodayChecklist({ data, onChange }) {
  const today = todayStr();
  const log = (data.wellnessLog || {})[today] || {};

  function updateLog(patch) {
    onChange((prev) => ({
      ...prev,
      wellnessLog: {
        ...(prev.wellnessLog || {}),
        [today]: { ...(prev.wellnessLog?.[today] || {}), ...patch },
      },
    }));
  }

  // Read water from shared localStorage (same source as MealPlannerTab)
  const [water, setWater] = useState(() => readWaterGlasses(today));
  const meditated = log.meditated || false;
  const mood = log.quickMood || 0;
  const moved = log.moved || false;

  function updateWater(glasses) {
    setWater(glasses);
    writeWaterGlasses(today, glasses);
    // Also sync to wellnessLog so wellness score/heatmap picks it up
    updateLog({ water: glasses });
  }

  return (
    <div style={{ ...CARD }}>
      <div style={{ ...SECTION_LABEL, marginBottom: 14 }}>Today's Wellness</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>

        {/* Water */}
        <div style={{ flex: "1 1 140px", background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.6px", marginBottom: 8 }}>
            💧 WATER
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                onClick={() => updateWater(i < water ? i : i + 1)}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: i < water ? "#06b6d4" : "rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{water}/8 glasses</div>
        </div>

        {/* Meditation */}
        <div
          onClick={() => updateLog({ meditated: !meditated })}
          style={{
            flex: "1 1 110px",
            background: meditated ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.03)",
            border: "1px solid " + (meditated ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.08)"),
            borderRadius: 12,
            padding: "12px 14px",
            cursor: "pointer",
            textAlign: "center",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 4 }}>🧘</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: meditated ? "#c4b5fd" : "#64748b", letterSpacing: "0.6px" }}>
            MEDITATED
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: meditated ? "#a78bfa" : "rgba(255,255,255,0.2)", marginTop: 4 }}>
            {meditated ? "Done" : "Tap to log"}
          </div>
        </div>

        {/* Mood quick tap */}
        <div style={{ flex: "1 1 130px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: "0.6px", marginBottom: 8 }}>
            🌿 MOOD
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            {[1, 2, 3, 4, 5].map((m) => (
              <button
                key={m}
                onClick={() => updateLog({ quickMood: mood === m ? 0 : m })}
                style={{
                  width: 28, height: 28,
                  borderRadius: "50%",
                  background: mood === m ? "#f59e0b" : "rgba(255,255,255,0.06)",
                  border: "none",
                  color: mood === m ? "#fff" : "#94a3b8",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {m}
              </button>
            ))}
          </div>
          {mood > 0 && (
            <div style={{ fontSize: 11, color: "#f59e0b", textAlign: "center", marginTop: 6, fontWeight: 600 }}>
              {MOOD_EMOJIS[mood]} {MOOD_LABELS[mood]}
            </div>
          )}
        </div>

        {/* Moved */}
        <div
          onClick={() => updateLog({ moved: !moved })}
          style={{
            flex: "1 1 110px",
            background: moved ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
            border: "1px solid " + (moved ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.08)"),
            borderRadius: 12,
            padding: "12px 14px",
            cursor: "pointer",
            textAlign: "center",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 4 }}>🏃</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: moved ? "#86efac" : "#64748b", letterSpacing: "0.6px" }}>
            MOVED
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: moved ? "#22c55e" : "rgba(255,255,255,0.2)", marginTop: 4 }}>
            {moved ? "30 min" : "Tap to log"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Weekly Wellness Heatmap ──────────────────────────────────────────────────

const HEATMAP_METRICS = [
  { key: "sleep", label: "Sleep", icon: "😴", color: "#38bdf8" },
  { key: "moved", label: "Exercise", icon: "🏃", color: "#22c55e" },
  { key: "meditated", label: "Meditate", icon: "🧘", color: "#a78bfa" },
  { key: "water", label: "Water", icon: "💧", color: "#06b6d4" },
  { key: "mood", label: "Mood", icon: "🌿", color: "#f59e0b" },
];

function WellnessHeatmap({ data }) {
  const sleepLog = data.sleepLog || [];
  const moodLog = data.moodLog || [];
  const wellnessLog = data.wellnessLog || {};

  // Merge shared water log from localStorage
  let sharedWaterLog = [];
  try { sharedWaterLog = JSON.parse(localStorage.getItem("up_waterLog") || "[]"); } catch {}

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const key = localDateKey(i);
    const sleepEntry = sleepLog.find((e) => e.date === key);
    const moodEntry = moodLog.find((e) => e.date === key);
    const wLog = wellnessLog[key] || {};

    const sleepHrs = sleepEntry ? parseDuration(sleepEntry.bedtime, sleepEntry.wakeTime) : 0;
    const moodVal = moodEntry?.mood || wLog.quickMood || 0;
    const waterGlasses = Math.max(wLog.water || 0, (sharedWaterLog.find((e) => e.date === key) || {}).glasses || 0);

    days.push({
      key,
      label: getDayName(key),
      metrics: {
        sleep: sleepHrs >= 7 ? "hit" : sleepHrs >= 5 ? "partial" : "miss",
        moved: wLog.moved ? "hit" : "miss",
        meditated: wLog.meditated ? "hit" : "miss",
        water: waterGlasses >= 8 ? "hit" : waterGlasses >= 4 ? "partial" : "miss",
        mood: moodVal >= 4 ? "hit" : moodVal >= 2 ? "partial" : "miss",
      },
    });
  }

  function cellColor(status, color) {
    if (status === "hit") return color;
    if (status === "partial") return color.replace(")", ",0.4)").replace("rgb", "rgba").replace("#", "").length > 6
      ? color + "66"
      : color + "66";
    return "rgba(255,255,255,0.05)";
  }

  // Simpler approach for partial colors
  const statusToOpacity = { hit: 1, partial: 0.4, miss: 0 };

  return (
    <div style={CARD}>
      <div style={SECTION_LABEL}>Weekly Wellness Heatmap</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: "4px", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: 80, fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, textAlign: "left", paddingBottom: 4 }}>
                Metric
              </th>
              {days.map((d) => (
                <th key={d.key} style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600, textAlign: "center", paddingBottom: 4, minWidth: 36 }}>
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEATMAP_METRICS.map((metric) => (
              <tr key={metric.key}>
                <td style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", paddingRight: 8, whiteSpace: "nowrap", fontWeight: 600 }}>
                  {metric.icon} {metric.label}
                </td>
                {days.map((d) => {
                  const status = d.metrics[metric.key];
                  const isHit = status === "hit";
                  const isPartial = status === "partial";
                  const bgColor = isHit ? metric.color : isPartial ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)";
                  const borderColor = isHit ? metric.color : isPartial ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)";
                  return (
                    <td key={d.key} style={{ textAlign: "center" }}>
                      <div
                        title={d.key + " · " + status}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: bgColor,
                          border: "1px solid " + borderColor,
                          margin: "0 auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                        }}
                      >
                        {isHit ? "✓" : isPartial ? "~" : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
        {[
          { label: "Hit", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
          { label: "Partial", color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.1)" },
          { label: "Missed", color: "rgba(255,255,255,0.25)", bg: "rgba(255,255,255,0.04)" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: item.bg, border: "1px solid " + item.color }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Wellness Trends (3 sparklines) ──────────────────────────────────────────

function WellnessTrends({ data }) {
  const sleepLog = data.sleepLog || [];
  const moodLog = data.moodLog || [];
  const wellnessLog = data.wellnessLog || {};

  // Merge shared water log
  let sharedWaterLog = [];
  try { sharedWaterLog = JSON.parse(localStorage.getItem("up_waterLog") || "[]"); } catch {}

  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const key = localDateKey(i);
    const sleepEntry = sleepLog.find((e) => e.date === key);
    const moodEntry = moodLog.find((e) => e.date === key);
    const wLog = wellnessLog[key] || {};
    const waterGlasses = Math.max(wLog.water || 0, (sharedWaterLog.find((e) => e.date === key) || {}).glasses || 0);

    last14.push({
      day: getDayName(key).slice(0, 2),
      date: key,
      water: waterGlasses,
      mood: moodEntry?.mood || wLog.quickMood || 0,
      sleep: sleepEntry ? Math.round(parseDuration(sleepEntry.bedtime, sleepEntry.wakeTime) * 10) / 10 : 0,
    });
  }

  const sparklineStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 10,
    padding: "10px 12px",
  };

  const tooltipStyle = {
    contentStyle: {
      background: "#0f172a",
      border: "1px solid rgba(45, 212, 191,0.3)",
      borderRadius: 8,
      fontSize: 11,
      color: "#f1f5f9",
    },
  };

  return (
    <div style={CARD}>
      <div style={SECTION_LABEL}>14-Day Trends</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Water */}
        <div style={sparklineStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#22d3ee", marginBottom: 8 }}>💧 Water (glasses/day)</div>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={last14} margin={{ top: 2, right: 4, left: -32, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 8]} />
              <Tooltip {...tooltipStyle} formatter={(v) => [v + " glasses", "Water"]} />
              <ReferenceLine y={8} stroke="rgba(6,182,212,0.3)" strokeDasharray="3 2" />
              <Line type="monotone" dataKey="water" stroke="#06b6d4" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Mood */}
        <div style={sparklineStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", marginBottom: 8 }}>🌿 Mood (1–5)</div>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={last14} margin={{ top: 2, right: 4, left: -32, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 5]} />
              <Tooltip {...tooltipStyle} formatter={(v) => [v > 0 ? MOOD_EMOJIS[Math.round(v)] + " " + v.toFixed(1) : "–", "Mood"]} />
              <Line type="monotone" dataKey="mood" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sleep */}
        <div style={sparklineStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#2dd4bf", marginBottom: 8 }}>😴 Sleep (hours/night)</div>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={last14} margin={{ top: 2, right: 4, left: -32, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 10]} />
              <Tooltip {...tooltipStyle} formatter={(v) => [v > 0 ? v + "h" : "–", "Sleep"]} />
              <ReferenceLine y={8} stroke="rgba(45, 212, 191,0.3)" strokeDasharray="3 2" />
              <Line type="monotone" dataKey="sleep" stroke="#14b8a6" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Wellness Insights ────────────────────────────────────────────────────────

function WellnessInsights({ data }) {
  const sleepLog = data.sleepLog || [];
  const moodLog = data.moodLog || [];
  const wellnessLog = data.wellnessLog || {};

  const insights = useMemo(() => {
    const results = [];
    // Merge shared water log
    let sharedWaterLog = [];
    try { sharedWaterLog = JSON.parse(localStorage.getItem("up_waterLog") || "[]"); } catch {}
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
      const key = localDateKey(i);
      const sleepEntry = sleepLog.find((e) => e.date === key);
      const moodEntry = moodLog.find((e) => e.date === key);
      const wLog = wellnessLog[key] || {};
      const waterGlasses = Math.max(wLog.water || 0, (sharedWaterLog.find((e) => e.date === key) || {}).glasses || 0);
      last14.push({
        key,
        mood: moodEntry?.mood || wLog.quickMood || 0,
        sleep: sleepEntry ? parseDuration(sleepEntry.bedtime, sleepEntry.wakeTime) : 0,
        water: waterGlasses,
        moved: wLog.moved || false,
      });
    }

    const withMood = last14.filter((d) => d.mood > 0);
    if (withMood.length >= 4) {
      // Water vs mood insight
      const highWater = withMood.filter((d) => d.water >= 6);
      const lowWater = withMood.filter((d) => d.water > 0 && d.water < 6);
      if (highWater.length >= 2 && lowWater.length >= 2) {
        const avgMoodHigh = highWater.reduce((s, d) => s + d.mood, 0) / highWater.length;
        const avgMoodLow = lowWater.reduce((s, d) => s + d.mood, 0) / lowWater.length;
        if (avgMoodHigh > avgMoodLow + 0.3) {
          results.push({
            icon: "💧",
            text: "You feel better on days you drink 6+ glasses of water (avg mood " + avgMoodHigh.toFixed(1) + " vs " + avgMoodLow.toFixed(1) + ")",
            color: "#06b6d4",
          });
        }
      }

      // Exercise vs sleep insight
      const exerciseDays = last14.filter((d) => d.moved && d.sleep > 0);
      const restDays = last14.filter((d) => !d.moved && d.sleep > 0);
      if (exerciseDays.length >= 2 && restDays.length >= 2) {
        const avgSleepEx = exerciseDays.reduce((s, d) => s + d.sleep, 0) / exerciseDays.length;
        const avgSleepRest = restDays.reduce((s, d) => s + d.sleep, 0) / restDays.length;
        const diff = avgSleepEx - avgSleepRest;
        if (Math.abs(diff) >= 0.3) {
          results.push({
            icon: "🏃",
            text: diff > 0
              ? "Exercise days correlate with better sleep (+" + diff.toFixed(1) + " hrs average)"
              : "Rest days average " + Math.abs(diff).toFixed(1) + " more hrs of sleep this period",
            color: "#22c55e",
          });
        }
      }

      // Mood trend
      const recent7Mood = withMood.slice(-7);
      const older7Mood = withMood.slice(0, 7);
      if (recent7Mood.length >= 3 && older7Mood.length >= 3) {
        const recentAvg = recent7Mood.reduce((s, d) => s + d.mood, 0) / recent7Mood.length;
        const olderAvg = older7Mood.reduce((s, d) => s + d.mood, 0) / older7Mood.length;
        const diff = recentAvg - olderAvg;
        if (Math.abs(diff) >= 0.4) {
          results.push({
            icon: diff > 0 ? "📈" : "📉",
            text: diff > 0
              ? "Your mood has improved " + diff.toFixed(1) + " points in the last 7 days"
              : "Your mood dipped " + Math.abs(diff).toFixed(1) + " points recently — keep logging to track patterns",
            color: diff > 0 ? "#a78bfa" : "#f59e0b",
          });
        }
      }
    }

    if (results.length === 0) {
      results.push({
        icon: "📊",
        text: "Log your wellness data for 7+ days to unlock personalized insights",
        color: "#64748b",
      });
    }

    return results.slice(0, 3);
  }, [data]);

  return (
    <div style={CARD}>
      <div style={SECTION_LABEL}>Insights</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {insights.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderLeft: "3px solid " + ins.color,
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{ins.icon}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{ins.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOOD SUB-TAB
// ─────────────────────────────────────────────────────────────────────────────
function MoodTab({ data, onChange }) {
  const moodLog = data.moodLog || [];
  const today = todayStr();
  const todayEntry = moodLog.find((e) => e.date === today);

  const [selectedMood, setSelectedMood] = useState(0);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  const last30 = [];
  for (let i = 29; i >= 0; i--) {
    const key = localDateKey(i);
    const entry = moodLog.find((e) => e.date === key);
    last30.push({ date: key, mood: entry ? entry.mood : 0 });
  }

  const last7 = last30.slice(-7);

  const logged7 = last7.filter((d) => d.mood > 0);
  const avgMood = logged7.length
    ? (logged7.reduce((a, b) => a + b.mood, 0) / logged7.length).toFixed(1)
    : null;

  function logMood() {
    if (!selectedMood) return;
    const newEntry = { id: uid(), date: today, mood: selectedMood, note };
    onChange((prev) => ({
      ...prev,
      moodLog: [
        ...(prev.moodLog || []).filter((e) => e.date !== today),
        newEntry
      ]
    }));
    setSelectedMood(0);
    setNote("");
    setEditing(false);
  }

  const showLogForm = !todayEntry || editing;

  return (
    <div>
      <div style={CARD}>
        <div style={SECTION_LABEL}>Today's Mood</div>
        {!showLogForm && todayEntry ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 32 }}>{MOOD_EMOJIS[todayEntry.mood]}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
                Today: {MOOD_EMOJIS[todayEntry.mood]} {MOOD_LABELS[todayEntry.mood]}
              </div>
              {todayEntry.note && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                  {todayEntry.note}
                </div>
              )}
            </div>
            <button
              onClick={() => { setSelectedMood(todayEntry.mood); setNote(todayEntry.note || ""); setEditing(true); }}
              style={{ marginLeft: "auto", background: "rgba(45, 212, 191,0.1)", border: "1px solid rgba(45, 212, 191,0.3)", borderRadius: 8, color: "#2dd4bf", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "5px 12px", fontFamily: FONT }}
            >
              Edit
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 14, justifyContent: "center" }}>
              {[1, 2, 3, 4, 5].map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMood(m)}
                  title={MOOD_LABELS[m]}
                  style={{
                    fontSize: 32,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    borderRadius: 10,
                    boxShadow: selectedMood === m ? "0 0 0 3px #14b8a6" : "none",
                    transition: "box-shadow 0.15s",
                    lineHeight: 1,
                    opacity: selectedMood && selectedMood !== m ? 0.45 : 1
                  }}
                >
                  {MOOD_EMOJIS[m]}
                </button>
              ))}
            </div>
            {selectedMood > 0 && (
              <div style={{ marginBottom: 10, textAlign: "center", fontSize: 12, color: "#2dd4bf", fontWeight: 700 }}>
                {MOOD_EMOJIS[selectedMood]} {MOOD_LABELS[selectedMood]}
              </div>
            )}
            <input
              type="text"
              placeholder="Optional note about your mood…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.55)", borderRadius: 10, color: "#f1f5f9", padding: "10px 13px", fontSize: 13, fontFamily: FONT, outline: "none", marginBottom: 10 }}
            />
            <button
              onClick={logMood}
              disabled={!selectedMood}
              style={{ width: "100%", background: selectedMood ? "linear-gradient(135deg,#14b8a6,#2dd4bf)" : "rgba(30,40,60,0.5)", border: "none", borderRadius: 10, color: selectedMood ? "#fff" : "rgba(255,255,255,0.25)", padding: "11px", cursor: selectedMood ? "pointer" : "default", fontSize: 13, fontWeight: 700, fontFamily: FONT, transition: "all 0.2s" }}
            >
              {editing ? "Update Mood" : "Log Mood"}
            </button>
          </div>
        )}
      </div>

      {/* 7-day trend */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>7-Day Trend</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {last7.map((d) => (
            <div
              key={d.date}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: d.mood ? MOOD_COLORS[d.mood] : "rgba(255,255,255,0.04)", border: "1px solid " + (d.mood ? MOOD_COLORS[d.mood] : "rgba(255,255,255,0.08)"), borderRadius: 10, padding: "7px 10px", minWidth: 40 }}
            >
              <span style={{ fontSize: 20 }}>{d.mood ? MOOD_EMOJIS[d.mood] : "·"}</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{getDayName(d.date)}</span>
            </div>
          ))}
        </div>
        {avgMood && (
          <div style={{ marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
            This week avg: <span style={{ color: "#2dd4bf", fontWeight: 800 }}>{MOOD_EMOJIS[Math.round(Number(avgMood))]} {avgMood}</span>
          </div>
        )}
      </div>

      {/* 30-day heatmap */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>30-Day Heatmap</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5 }}>
          {last30.map((d) => (
            <div
              key={d.date}
              title={d.date + (d.mood ? " · " + MOOD_EMOJIS[d.mood] + " " + MOOD_LABELS[d.mood] : " · No log")}
              style={{ aspectRatio: "1", borderRadius: 6, background: d.mood ? MOOD_COLORS[d.mood] : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)", cursor: "default" }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          {[1, 2, 3, 4, 5].map((m) => (
            <div key={m} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: MOOD_COLORS[m] }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{MOOD_LABELS[m]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLEEP SUB-TAB
// ─────────────────────────────────────────────────────────────────────────────
function SleepTab({ data, onChange }) {
  const sleepLog = data.sleepLog || [];
  const today = todayStr();
  const todayEntry = sleepLog.find((e) => e.date === today);

  const [bedtime, setBedtime] = useState("22:30");
  const [wakeTime, setWakeTime] = useState("06:30");
  const [quality, setQuality] = useState(0);
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);

  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const key = localDateKey(i);
    const entry = sleepLog.find((e) => e.date === key);
    const hours = entry ? parseDuration(entry.bedtime, entry.wakeTime) : 0;
    chartData.push({ day: getDayName(key), hours: Math.round(hours * 10) / 10, quality: entry?.quality || 0 });
  }

  const weekEntries = sleepLog.filter((e) => {
    const d = new Date(e.date + "T12:00:00");
    const diff = (new Date() - d) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });

  const avgDuration = weekEntries.length
    ? weekEntries.reduce((a, e) => a + parseDuration(e.bedtime, e.wakeTime), 0) / weekEntries.length
    : 0;
  const avgQuality = weekEntries.length
    ? weekEntries.reduce((a, e) => a + (e.quality || 0), 0) / weekEntries.length
    : 0;
  const bestNight = weekEntries.length
    ? weekEntries.reduce((best, e) => {
        const h = parseDuration(e.bedtime, e.wakeTime);
        return h > parseDuration(best.bedtime, best.wakeTime) ? e : best;
      }, weekEntries[0])
    : null;

  function logSleep() {
    if (!bedtime || !wakeTime) return;
    const entry = { id: uid(), date: today, bedtime, wakeTime, quality, notes };
    onChange((prev) => ({
      ...prev,
      sleepLog: [
        ...(prev.sleepLog || []).filter((e) => e.date !== today),
        entry
      ]
    }));
    setEditing(false);
  }

  const showLogForm = !todayEntry || editing;
  const todayDuration = todayEntry ? parseDuration(todayEntry.bedtime, todayEntry.wakeTime) : 0;

  const barColor = (hours) => {
    if (hours >= 7) return "#22c55e";
    if (hours >= 5) return "#f59e0b";
    return "#ef4444";
  };

  const hasAnySleep = sleepLog.length > 0;

  return (
    <div>
      <div style={CARD}>
        <div style={SECTION_LABEL}>Last Night's Sleep</div>
        {!showLogForm && todayEntry ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>😴</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
                Last night: {fmtDuration(todayDuration)}
                {todayEntry.quality > 0 && " · " + "⭐".repeat(todayEntry.quality)}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                {todayEntry.bedtime} → {todayEntry.wakeTime}
              </div>
            </div>
            <button
              onClick={() => { setBedtime(todayEntry.bedtime); setWakeTime(todayEntry.wakeTime); setQuality(todayEntry.quality || 0); setNotes(todayEntry.notes || ""); setEditing(true); }}
              style={{ marginLeft: "auto", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 8, color: "#38bdf8", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "5px 12px", fontFamily: FONT }}
            >
              Edit
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 5, fontWeight: 700, letterSpacing: "0.5px" }}>BEDTIME</div>
                <input
                  type="time"
                  value={bedtime}
                  onChange={(e) => setBedtime(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.55)", borderRadius: 10, color: "#f1f5f9", padding: "10px 12px", fontSize: 14, outline: "none", fontFamily: FONT }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 5, fontWeight: 700, letterSpacing: "0.5px" }}>WAKE TIME</div>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.55)", borderRadius: 10, color: "#f1f5f9", padding: "10px 12px", fontSize: 14, outline: "none", fontFamily: FONT }}
                />
              </div>
            </div>
            {bedtime && wakeTime && (
              <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, marginBottom: 10 }}>
                Duration: {fmtDuration(parseDuration(bedtime, wakeTime))}
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 7, fontWeight: 700, letterSpacing: "0.5px" }}>QUALITY</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuality(s)}
                    style={{ fontSize: 22, background: "transparent", border: "none", cursor: "pointer", padding: 2, opacity: quality >= s ? 1 : 0.3, transition: "opacity 0.15s", lineHeight: 1 }}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={logSleep}
              style={{ width: "100%", background: "linear-gradient(135deg,#38bdf8,#0ea5e9)", border: "none", borderRadius: 10, color: "#fff", padding: "11px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: FONT }}
            >
              {editing ? "Update Sleep" : "Log Sleep"}
            </button>
          </div>
        )}
      </div>

      <div style={CARD}>
        <div style={SECTION_LABEL}>Weekly Sleep (hours)</div>
        {!hasAnySleep ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: "rgba(100,116,139,0.5)", fontSize: 13 }}>
            Log your first night's sleep to see trends
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 10]} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 10, fontSize: 12, color: "#f1f5f9" }}
                formatter={(v) => [v + "h", "Sleep"]}
              />
              <ReferenceLine y={8} stroke="rgba(56,189,248,0.4)" strokeDasharray="4 3" label={{ value: "8h goal", fill: "rgba(56,189,248,0.5)", fontSize: 10, position: "insideTopRight" }} />
              <Bar dataKey="hours" radius={[5, 5, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={barColor(entry.hours)} opacity={entry.hours > 0 ? 1 : 0.2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {weekEntries.length > 0 && (
        <div style={{ ...CARD, display: "flex", gap: 10 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={SECTION_LABEL}>Avg Duration</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#38bdf8" }}>{fmtDuration(avgDuration)}</div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={SECTION_LABEL}>Avg Quality</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#38bdf8" }}>{"⭐".repeat(Math.round(avgQuality))}</div>
          </div>
          {bestNight && (
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={SECTION_LABEL}>Best Night</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>{fmtDuration(parseDuration(bestNight.bedtime, bestNight.wakeTime))}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{bestNight.date}</div>
            </div>
          )}
        </div>
      )}

      {weekEntries.length >= 3 && avgDuration < 7 && (
        <div style={{ ...CARD, background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
            💡 You're averaging <strong style={{ color: "#38bdf8" }}>{fmtDuration(avgDuration)}</strong> this week. Try a consistent bedtime to improve sleep quality and duration.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WELLNESS OVERVIEW SUB-TAB
// ─────────────────────────────────────────────────────────────────────────────
function WellnessOverviewTab({ data, onChange }) {
  const score = useMemo(() => calcWellnessScore(data), [data]);
  return (
    <div>
      <TodayChecklist data={data} onChange={onChange} />
      <WellnessScoreGauge score={score} />
      <WellnessHeatmap data={data} />
      <WellnessTrends data={data} />
      <WellnessInsights data={data} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN WELLNESS TAB
// ─────────────────────────────────────────────────────────────────────────────
export default function WellnessTab({ data, onChange }) {
  const [subTab, setSubTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "🌿 Overview" },
    { id: "mood", label: "😊 Mood" },
  ];

  return (
    <div>
      {/* Pill toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              background: subTab === t.id ? "rgba(45, 212, 191,0.2)" : "transparent",
              border: subTab === t.id ? "1px solid rgba(45, 212, 191,0.4)" : "1px solid rgba(51,65,85,0.4)",
              borderRadius: 20,
              color: subTab === t.id ? "#2dd4bf" : "rgba(148,163,184,0.6)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: subTab === t.id ? 700 : 500,
              padding: "7px 18px",
              fontFamily: FONT,
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {subTab === "overview" && <WellnessOverviewTab data={data} onChange={onChange} />}
          {subTab === "mood" && <MoodTab data={data} onChange={onChange} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD WIDGET
// ─────────────────────────────────────────────────────────────────────────────
export function WellnessDashWidget({ data, onNavigate }) {
  const today = todayStr();
  const moodLog = data.moodLog || [];
  const sleepLog = data.sleepLog || [];

  const todayMood = moodLog.find((e) => e.date === today);
  const latestSleep = [...sleepLog].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const sleepHours = latestSleep ? parseDuration(latestSleep.bedtime, latestSleep.wakeTime) : null;

  const score = useMemo(() => calcWellnessScore(data), [data]);
  const { grade, color: gradeColor } = scoreGrade(score.total);

  const sleepColorVal = sleepHours
    ? sleepHours >= 7 ? "#22c55e" : sleepHours >= 5 ? "#f59e0b" : "#ef4444"
    : "rgba(255,255,255,0.25)";

  return (
    <div
      onClick={onNavigate}
      style={{ background: "rgba(17,24,39,0.7)", border: "1px solid rgba(45, 212, 191,0.2)", borderRadius: 16, padding: "16px 20px", cursor: "pointer", marginBottom: 14 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#2dd4bf" }}>🌿 Wellness</span>
        <span style={{ fontSize: 11, color: "rgba(45, 212, 191,0.7)" }}>View all →</span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>
            {todayMood ? MOOD_EMOJIS[todayMood.mood] : "–"}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
            {todayMood ? MOOD_LABELS[todayMood.mood] : "No mood"}
          </div>
        </div>
        <div style={{ flex: 1, background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: sleepColorVal, marginBottom: 4 }}>
            {sleepHours ? fmtDuration(sleepHours) : "–"}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Last sleep</div>
        </div>
        <div style={{ flex: 1, background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: gradeColor, marginBottom: 4 }}>
            {score.total}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Score ({grade})</div>
        </div>
      </div>
    </div>
  );
}
