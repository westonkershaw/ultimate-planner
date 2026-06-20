/* eslint-disable */
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, TrendingUp, Minus, ChevronRight, Activity, Target } from "lucide-react";
import {
  calcWeightMovingAverage,
  calcWeightMonthlyAverages,
  calcMeasurementSparkline,
} from "../utils/math";

const uid = () => Math.random().toString(36).slice(2, 9);

const ACCENT = "#f97316";
const INDIGO  = "#6366f1";

const S = {
  card: {
    background: "rgba(17,24,39,0.7)",
    border: "1px solid rgba(51,65,85,0.5)",
    borderRadius: 16,
    padding: "16px 18px",
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    color: "rgba(148,163,184,0.6)",
    marginBottom: 4,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    background: "rgba(15,23,42,0.9)",
    border: "1px solid rgba(51,65,85,0.7)",
    borderRadius: 10,
    padding: "9px 12px",
    color: "#f1f5f9",
    fontSize: 13,
    fontFamily: "'DM Sans',sans-serif",
    boxSizing: "border-box",
    outline: "none",
  },
  btn: {
    background: ACCENT,
    border: "none",
    borderRadius: 10,
    color: "#fff",
    padding: "9px 18px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'DM Sans',sans-serif",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  row: { display: "flex", gap: 10, alignItems: "flex-end" },
};

// ─── BMI helpers ─────────────────────────────────────────────────────────────
function getBmiCategory(bmi) {
  const n = parseFloat(bmi);
  if (isNaN(n)) return null;
  if (n < 18.5) return { label: "Underweight", color: "#38bdf8" };
  if (n < 25)   return { label: "Normal",      color: "#22c55e" };
  if (n < 30)   return { label: "Overweight",  color: "#f59e0b" };
  return           { label: "Obese",           color: "#ef4444" };
}

// ─── Tooltip for charts ───────────────────────────────────────────────────────
function TooltipBox({ x, y, text, visible }) {
  if (!visible) return null;
  return (
    <g>
      <rect
        x={x - 32} y={y - 28} width={64} height={20} rx={5}
        fill="rgba(8,9,13,0.95)"
        stroke="rgba(249,115,22,0.3)"
        strokeWidth={1}
      />
      <text
        x={x} y={y - 13}
        textAnchor="middle"
        fontSize="9"
        fontFamily="'DM Sans',sans-serif"
        fill="#f1f5f9"
        fontWeight="700"
      >
        {text}
      </text>
    </g>
  );
}

// ─── 1. Weight Log Section ───────────────────────────────────────────────────
function WeightLog({ data, onChange }) {
  const today = new Date().toLocaleDateString("en-CA");
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(today);

  const history = useMemo(
    () => [...(data.weightHistory || [])].sort((a, b) => b.date.localeCompare(a.date)),
    [data.weightHistory]
  );

  const avg7Label = useMemo(() => {
    const recent = history.slice(0, 7);
    if (!recent.length) return null;
    const avg = (recent.reduce((s, e) => s + e.weight, 0) / recent.length).toFixed(1);
    if (recent.length < 7) return { label: `${recent.length}-day avg`, value: avg };
    return { label: "7-day avg", value: avg };
  }, [history]);

  function log() {
    const w = parseFloat(weight);
    if (!w || w <= 0 || !date) return;
    onChange(prev => ({
      ...prev,
      weightHistory: [{ id: uid(), date, weight: w }, ...(prev.weightHistory || [])]
    }));
    setWeight("");
  }

  function del(id) {
    onChange(prev => ({
      ...prev,
      weightHistory: (prev.weightHistory || []).filter(e => e.id !== id)
    }));
  }

  const last10 = history.slice(0, 10);

  return (
    <div style={S.card}>
      <div style={S.sectionHeader}>Weight Log</div>
      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <div style={S.label}>Weight (lbs)</div>
          <input
            style={S.input}
            type="number"
            step="0.1"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder="e.g. 185.5"
            onKeyDown={e => e.key === "Enter" && log()}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={S.label}>Date</div>
          <input
            style={S.input}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <button style={S.btn} onClick={log}>Log</button>
      </div>

      {avg7Label && (
        <div style={{
          marginTop: 10,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(249,115,22,0.1)",
          border: "1px solid rgba(249,115,22,0.25)",
          borderRadius: 8,
          padding: "5px 12px",
          fontSize: 12,
          color: ACCENT,
          fontWeight: 700,
        }}>
          {avg7Label.label}: {avg7Label.value} lbs
        </div>
      )}

      {last10.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ ...S.label, marginBottom: 6 }}>Recent Entries</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {last10.map(entry => (
              <div key={entry.id || entry.date} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(15,23,42,0.5)",
                borderRadius: 8,
                padding: "7px 12px",
              }}>
                <span style={{ fontSize: 12, color: "rgba(148,163,184,0.7)" }}>{entry.date}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{entry.weight} lbs</span>
                <button
                  onClick={() => del(entry.id || entry.date)}
                  style={{
                    background: "rgba(248,113,113,0.15)",
                    border: "none",
                    borderRadius: 6,
                    color: "#f87171",
                    fontSize: 11,
                    padding: "3px 8px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!history.length && (
        <div style={{ textAlign: "center", padding: "18px 0 4px", color: "rgba(100,116,139,0.5)", fontSize: 12 }}>
          No weight entries yet. Log your first entry above.
        </div>
      )}
    </div>
  );
}

// ─── 2. SVG Weight Trend Chart ────────────────────────────────────────────────
function WeightTrendChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const allSorted = useMemo(
    () => [...(data.weightHistory || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [data.weightHistory]
  );

  const last30 = allSorted.slice(-30);
  const movAvg = useMemo(() => calcWeightMovingAverage(last30), [last30]);

  const goalWeight = parseFloat(data.bodyStats?.goalWeight) || null;

  if (last30.length < 2) {
    return (
      <div style={S.card}>
        <div style={S.sectionHeader}>Weight Trend</div>
        <div style={{ textAlign: "center", padding: "28px 0", color: "rgba(100,116,139,0.5)", fontSize: 13 }}>
          Log at least 2 weigh-ins to see your trend
        </div>
      </div>
    );
  }

  const weights = last30.map(e => e.weight);
  const firstW  = weights[0];
  const lastW   = weights[weights.length - 1];
  const delta   = Math.round((lastW - firstW) * 10) / 10;
  const deltaColor = delta < 0 ? "#34c98a" : delta > 0 ? "#f97316" : "#94a3b8";
  const deltaLabel = delta < 0
    ? "Lost " + Math.abs(delta) + " lbs"
    : delta > 0
    ? "Gained " + delta + " lbs"
    : "No change";

  const W = 320;
  const H = 180;
  const PL = 36; const PR = 12; const PT = 20; const PB = 24;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const allW = [...weights];
  if (goalWeight) allW.push(goalWeight);
  const minW = Math.floor(Math.min(...allW) - 2);
  const maxW = Math.ceil(Math.max(...allW) + 2);
  const wRange = maxW - minW || 1;

  const toX = (i) => PL + (i / (last30.length - 1)) * chartW;
  const toY = (w) => PT + chartH - ((w - minW) / wRange) * chartH;

  // Bezier-smooth path
  const pts = last30.map((e, i) => ({ x: toX(i), y: toY(e.weight) }));
  let mainPath = "M " + pts[0].x + "," + pts[0].y;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    mainPath += " C " + cpx + "," + prev.y + " " + cpx + "," + curr.y + " " + curr.x + "," + curr.y;
  }
  // Fill path
  let fillPath = mainPath + " L " + pts[pts.length - 1].x + "," + (PT + chartH) + " L " + pts[0].x + "," + (PT + chartH) + " Z";

  // Moving average path
  const maPoints = movAvg
    .map((p, i) => p.avg !== null ? { x: toX(i), y: toY(p.avg) } : null)
    .filter(Boolean);
  let maPath = "";
  if (maPoints.length >= 2) {
    maPath = "M " + maPoints[0].x + "," + maPoints[0].y;
    for (let i = 1; i < maPoints.length; i++) {
      const prev = maPoints[i - 1];
      const curr = maPoints[i];
      const cpx = (prev.x + curr.x) / 2;
      maPath += " C " + cpx + "," + prev.y + " " + cpx + "," + curr.y + " " + curr.x + "," + curr.y;
    }
  }

  // Goal line Y
  const goalY = goalWeight ? toY(goalWeight) : null;

  // Y-axis ticks
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    Math.round(minW + (i / (tickCount - 1)) * wRange)
  );

  const hovered = hoveredIdx !== null ? last30[hoveredIdx] : null;

  return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={S.sectionHeader}>Weight Trend</div>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: deltaColor,
          background: deltaColor + "18",
          border: "1px solid " + deltaColor + "35",
          borderRadius: 8,
          padding: "3px 10px",
        }}>
          {deltaLabel}
        </div>
      </div>

      <svg
        viewBox={"0 0 " + W + " " + H}
        width="100%"
        style={{ display: "block", overflow: "visible" }}
        aria-label="Weight trend chart"
        role="img"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INDIGO} stopOpacity="0.3" />
            <stop offset="100%" stopColor={INDIGO} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {ticks.map((t) => {
          const y = toY(t);
          return (
            <g key={t}>
              <line x1={PL} y1={y} x2={PL + chartW} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PL - 4} y={y + 3} textAnchor="end" fontSize="8" fill="rgba(100,116,139,0.6)" fontFamily="'DM Sans',sans-serif">
                {t}
              </text>
            </g>
          );
        })}

        {/* Goal weight line */}
        {goalY !== null && (
          <>
            <line x1={PL} y1={goalY} x2={PL + chartW} y2={goalY} stroke="#34c98a" strokeWidth="1" strokeDasharray="5,3" opacity="0.7" />
            <text x={PL + chartW + 2} y={goalY + 3} fontSize="7" fill="#34c98a" opacity="0.8">Goal</text>
          </>
        )}

        {/* Gradient fill */}
        <path d={fillPath} fill="url(#weightGrad)" />

        {/* Moving average line */}
        {maPath && (
          <path d={maPath} fill="none" stroke={INDIGO} strokeWidth="1.5" strokeDasharray="3,2" opacity="0.5" />
        )}

        {/* Main weight line */}
        <path d={mainPath} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover zones + dots */}
        {last30.map((entry, i) => {
          const x = toX(i);
          const y = toY(entry.weight);
          const isHovered = hoveredIdx === i;
          return (
            <g key={entry.id || entry.date}>
              <rect
                x={x - 10} y={PT} width={20} height={chartH}
                fill="transparent"
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHoveredIdx(i)}
              />
              {isHovered && (
                <>
                  <line x1={x} y1={PT} x2={x} y2={PT + chartH} stroke="rgba(249,115,22,0.2)" strokeWidth="1" />
                  <circle cx={x} cy={y} r="5" fill={ACCENT} stroke="rgba(249,115,22,0.4)" strokeWidth="3" />
                  <TooltipBox x={x} y={y} text={entry.weight + " lbs"} visible={true} />
                </>
              )}
              {!isHovered && <circle cx={x} cy={y} r="2" fill={ACCENT} opacity="0.6" />}
            </g>
          );
        })}

        {/* X-axis labels — show every ~5th entry */}
        {last30.map((entry, i) => {
          if (i % Math.max(1, Math.floor(last30.length / 6)) !== 0 && i !== last30.length - 1) return null;
          return (
            <text key={entry.date} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="rgba(100,116,139,0.6)" fontFamily="'DM Sans',sans-serif">
              {entry.date.slice(5)}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 16, height: 2, background: ACCENT, borderRadius: 1 }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Weight</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 16, height: 2, background: INDIGO, borderRadius: 1, opacity: 0.6 }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>7-day avg</span>
        </div>
        {goalWeight && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 16, height: 2, background: "#34c98a", borderRadius: 1, opacity: 0.7 }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Goal</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 3. Progress Stats Row ────────────────────────────────────────────────────
function ProgressStatsRow({ data }) {
  const history = useMemo(
    () => [...(data.weightHistory || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [data.weightHistory]
  );

  const firstW   = history.length ? history[0].weight : null;
  const currentW = history.length ? history[history.length - 1].weight : parseFloat(data.bodyStats?.currentWeight) || null;

  const bmi = useMemo(() => {
    const w = currentW;
    const h = parseFloat(data.bodyStats?.height);
    if (!w || !h || w <= 0 || h <= 0) return null;
    return (703 * w / (h * h)).toFixed(1);
  }, [currentW, data.bodyStats]);

  const bmiCat = bmi ? getBmiCategory(bmi) : null;

  // Body fat trend
  const bfHistory = useMemo(
    () => [...(data.bodyFatHistory || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [data.bodyFatHistory]
  );
  const bfFirst   = bfHistory.length >= 2 ? bfHistory[0].pct : null;
  const bfCurrent = bfHistory.length     ? bfHistory[bfHistory.length - 1].pct : null;
  const bfDelta   = bfFirst !== null && bfCurrent !== null ? Math.round((bfCurrent - bfFirst) * 10) / 10 : null;

  const chips = [
    {
      label: "Weight Journey",
      value: firstW && currentW
        ? firstW.toFixed(1) + " \u2192 " + currentW.toFixed(1) + " lbs"
        : currentW
        ? currentW + " lbs"
        : "—",
      sub: firstW && currentW
        ? (currentW - firstW > 0 ? "+" : "") + Math.round((currentW - firstW) * 10) / 10 + " lbs overall"
        : "No history yet",
      color: firstW && currentW && currentW < firstW ? "#34c98a" : ACCENT,
      Icon: firstW && currentW && currentW < firstW ? TrendingDown : TrendingUp,
    },
    {
      label: "BMI",
      value: bmi ? bmi : "—",
      sub: bmiCat ? bmiCat.label : "Set height to calculate",
      color: bmiCat ? bmiCat.color : "rgba(148,163,184,0.5)",
      Icon: Activity,
    },
    {
      label: "Body Fat",
      value: bfCurrent !== null ? bfCurrent + "%" : "—",
      sub: bfDelta !== null
        ? (bfDelta > 0 ? "+" : "") + bfDelta + "% since start"
        : "Log body fat to track",
      color: bfDelta !== null ? (bfDelta <= 0 ? "#34c98a" : "#f97316") : "rgba(148,163,184,0.5)",
      Icon: Target,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
      {chips.map(({ label, value, sub, color, Icon }, idx) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.06, type: "spring", stiffness: 400, damping: 30 }}
          style={{
            background: "rgba(17,24,39,0.7)",
            border: "1px solid rgba(51,65,85,0.5)",
            borderRadius: 12,
            padding: "12px 10px",
            textAlign: "center",
          }}
        >
          <Icon size={14} style={{ color, marginBottom: 5 }} />
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, fontWeight: 700 }}>
            {label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color, fontFamily: "'Syne',serif", lineHeight: 1.2, marginBottom: 3 }}>
            {value}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", lineHeight: 1.3 }}>
            {sub}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── 4. Body Stats Panel ──────────────────────────────────────────────────────
function BodyStatsPanel({ data }) {
  const bs = data.bodyStats || {};
  const { currentWeight, goalWeight, height, age, sex, activityLevel, goal } = bs;

  const bmi = useMemo(() => {
    const w = parseFloat(currentWeight);
    const h = parseFloat(height);
    if (!w || !h || w <= 0 || h <= 0) return null;
    return (703 * w / (h * h)).toFixed(1);
  }, [currentWeight, height]);

  const bmiCategory = bmi ? getBmiCategory(bmi) : null;

  const toGoal = useMemo(() => {
    const cw = parseFloat(currentWeight);
    const gw = parseFloat(goalWeight);
    if (!cw || !gw) return null;
    return (gw - cw).toFixed(1);
  }, [currentWeight, goalWeight]);

  const activityLabels = {
    sedentary: "Sedentary",
    light: "Lightly Active",
    moderate: "Moderately Active",
    active: "Very Active",
    veryactive: "Extremely Active",
  };
  const goalLabels = {
    cut: "Cut (Lose Fat)",
    bulk: "Bulk (Gain Muscle)",
    maintain: "Maintain",
    recomp: "Recomp",
  };

  const bmiDisplay = bmi
    ? (bmiCategory ? `${bmi} \u2014 ${bmiCategory.label}` : bmi)
    : "—";

  const stats = [
    { label: "Current Weight", value: currentWeight ? `${currentWeight} lbs` : "—" },
    { label: "Goal Weight",    value: goalWeight ? `${goalWeight} lbs` : "—" },
    { label: "Height",         value: height ? `${height} in` : "—" },
    { label: "Age",            value: age || "—" },
    { label: "Sex",            value: sex ? (sex.charAt(0).toUpperCase() + sex.slice(1)) : "—" },
    { label: "Activity",       value: activityLabels[activityLevel] || activityLevel || "—" },
    { label: "Goal",           value: goalLabels[goal] || goal || "—" },
    { label: "BMI",            value: bmiDisplay, color: bmiCategory ? bmiCategory.color : undefined },
  ];

  return (
    <div style={S.card}>
      <div style={S.sectionHeader}>Body Stats</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {stats.map(({ label, value, color }) => (
          <div key={label} style={{
            background: "rgba(15,23,42,0.5)",
            borderRadius: 10,
            padding: "9px 12px",
            border: "1px solid rgba(51,65,85,0.4)",
          }}>
            <div style={{ fontSize: 10, color: "rgba(148,163,184,0.5)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: color || "#f1f5f9", fontFamily: "'DM Sans',sans-serif" }}>{value}</div>
          </div>
        ))}
      </div>
      {toGoal && (
        <div style={{
          marginTop: 10,
          padding: "9px 14px",
          background: parseFloat(toGoal) < 0 ? "rgba(52,201,138,0.08)" : "rgba(249,115,22,0.08)",
          border: "1px solid " + (parseFloat(toGoal) < 0 ? "rgba(52,201,138,0.25)" : "rgba(249,115,22,0.25)"),
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          color: parseFloat(toGoal) < 0 ? "#34c98a" : ACCENT,
          textAlign: "center",
        }}>
          {Math.abs(toGoal)} lbs {parseFloat(toGoal) < 0 ? "to lose" : "to gain"} to reach goal
        </div>
      )}
    </div>
  );
}

// ─── 5. Measurement Progress ──────────────────────────────────────────────────

const MEASUREMENTS = [
  { key: "waist",  label: "Waist",  unit: "in" },
  { key: "chest",  label: "Chest",  unit: "in" },
  { key: "hips",   label: "Hips",   unit: "in" },
  { key: "arms",   label: "Arms",   unit: "in" },
  { key: "thighs", label: "Thighs", unit: "in" },
  { key: "neck",   label: "Neck",   unit: "in" },
];

function MeasurementSparkline({ points, color }) {
  if (points.length < 2) return null;
  const W = 60;
  const H = 22;
  const vals = points.map(p => p.value);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals) - mn || 1;
  const ptStr = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((p.value - mn) / mx) * (H - 4) - 2;
    return x + "," + y;
  }).join(" ");
  return (
    <svg width={W} height={H} style={{ flexShrink: 0 }}>
      <polyline points={ptStr} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

function MeasurementProgress({ data, onChange }) {
  const measurements = data.measurements || [];

  // Log form state
  const today = new Date().toLocaleDateString("en-CA");
  const [formVals, setFormVals] = useState({});
  const [logDate, setLogDate] = useState(today);
  const [saved, setSaved]     = useState(false);

  function handleLog() {
    const hasAny = MEASUREMENTS.some(({ key }) => parseFloat(formVals[key]) > 0);
    if (!hasAny) return;
    const entry = { id: uid(), date: logDate };
    MEASUREMENTS.forEach(({ key }) => {
      const v = parseFloat(formVals[key]);
      if (v > 0) entry[key] = v;
    });
    onChange(prev => ({
      ...prev,
      measurements: [...(prev.measurements || []), entry],
    }));
    setFormVals({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={S.card}>
      <div style={S.sectionHeader}>Measurements</div>

      {/* Log form */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {MEASUREMENTS.map(({ key, label }) => (
            <div key={key}>
              <div style={S.label}>{label} (in)</div>
              <input
                style={{ ...S.input, padding: "7px 10px", fontSize: 12 }}
                type="number"
                step="0.25"
                placeholder="—"
                value={formVals[key] || ""}
                onChange={e => setFormVals(p => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={S.label}>Date</div>
            <input style={S.input} type="date" value={logDate} onChange={e => setLogDate(e.target.value)} />
          </div>
          <button
            style={{ ...S.btn, flex: 1 }}
            onClick={handleLog}
          >
            {saved ? "Saved \u2713" : "Log Measurements"}
          </button>
        </div>
      </div>

      {/* Progress deltas + sparklines */}
      {measurements.length >= 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <div style={{ ...S.sectionHeader, marginBottom: 6 }}>Progress vs First Entry</div>
          {MEASUREMENTS.map(({ key, label, unit }) => {
            const sparkPts = calcMeasurementSparkline(measurements, key);
            if (sparkPts.length === 0) return null;
            const first   = sparkPts[0].value;
            const current = sparkPts[sparkPts.length - 1].value;
            const diff    = Math.round((current - first) * 100) / 100;
            const color   = diff <= 0 ? "#34c98a" : "#f97316";
            const isNeutral = diff === 0;
            return (
              <div key={key} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(15,23,42,0.5)",
                borderRadius: 10,
                padding: "8px 12px",
                border: "1px solid rgba(51,65,85,0.35)",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>{label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", fontFamily: "'Syne',serif" }}>
                      {current} {unit}
                    </span>
                    {!isNeutral && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color,
                        background: color + "15",
                        border: "1px solid " + color + "30",
                        borderRadius: 6,
                        padding: "1px 6px",
                      }}>
                        {diff > 0 ? "+" : ""}{diff} {unit}
                      </span>
                    )}
                  </div>
                </div>
                <MeasurementSparkline points={sparkPts} color={color} />
              </div>
            );
          })}
        </div>
      )}

      {measurements.length === 0 && (
        <div style={{ textAlign: "center", padding: "14px 0 4px", color: "rgba(100,116,139,0.5)", fontSize: 12 }}>
          Log your first measurements above to track progress.
        </div>
      )}
    </div>
  );
}

// ─── 6. Transformation Timeline ───────────────────────────────────────────────
function TransformationTimeline({ data }) {
  const rows = useMemo(
    () => calcWeightMonthlyAverages(data.weightHistory || []),
    [data.weightHistory]
  );

  if (rows.length < 2) return null;

  return (
    <div style={S.card}>
      <div style={S.sectionHeader}>Transformation Timeline</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["Month", "Avg Weight", "Change", "Entries"].map(h => (
                <th key={h} style={{
                  textAlign: h === "Month" ? "left" : "center",
                  color: "rgba(148,163,184,0.5)",
                  fontWeight: 700,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  padding: "4px 8px",
                  borderBottom: "1px solid rgba(51,65,85,0.3)",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const deltaColor = row.delta === null ? "rgba(255,255,255,0.35)"
                : row.delta < 0 ? "#34c98a"
                : row.delta > 0 ? "#f97316"
                : "rgba(255,255,255,0.35)";
              return (
                <motion.tr
                  key={row.monthLabel}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, type: "spring", stiffness: 400, damping: 30 }}
                  style={{ background: idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}
                >
                  <td style={{ padding: "8px 8px", color: "#f1f5f9", fontWeight: 700 }}>{row.monthLabel}</td>
                  <td style={{ padding: "8px 8px", textAlign: "center", color: ACCENT, fontWeight: 700, fontFamily: "'Syne',serif" }}>
                    {row.avg} lbs
                  </td>
                  <td style={{ padding: "8px 8px", textAlign: "center", color: deltaColor, fontWeight: 700 }}>
                    {row.delta === null ? "—" : (row.delta > 0 ? "+" : "") + row.delta + " lbs"}
                  </td>
                  <td style={{ padding: "8px 8px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                    {row.entryCount}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 7. PR Tracker ────────────────────────────────────────────────────────────
function PRTracker({ workoutHistory }) {
  const prs = useMemo(() => {
    const map = {};
    for (const session of (workoutHistory || [])) {
      const ts = session.completedAt || session.date || 0;
      for (const ex of (session.exercises || [])) {
        const name = (ex.name || "").trim();
        if (!name) continue;
        for (const set of (ex.sets || [])) {
          const w = parseFloat(set.weight);
          if (!w) continue;
          if (!map[name] || w > map[name].weight) {
            map[name] = { name, weight: w, ts };
          }
        }
      }
    }
    return Object.values(map)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8);
  }, [workoutHistory]);

  const formatDate = (ts) => {
    if (!ts) return "—";
    try {
      const d = typeof ts === "string" ? new Date(ts) : new Date(ts);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return "—"; }
  };

  return (
    <div style={S.card}>
      <div style={S.sectionHeader}>Personal Records</div>
      {!prs.length ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(100,116,139,0.5)" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏋️</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(148,163,184,0.6)" }}>Complete workouts to track your personal records</div>
          <div style={{ fontSize: 11, marginTop: 4, color: "rgba(100,116,139,0.4)" }}>Log weighted sets in your workouts to see PRs here.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {prs.map((pr, idx) => {
            const rowBorder = idx === 0 ? "1px solid rgba(249,115,22,0.3)" : "1px solid rgba(51,65,85,0.3)";
            return (
              <motion.div
                key={pr.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "rgba(15,23,42,0.5)",
                  borderRadius: 10,
                  padding: "9px 12px",
                  border: rowBorder,
                }}
              >
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: idx === 0 ? "rgba(249,115,22,0.2)" : "rgba(51,65,85,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: idx === 0 ? ACCENT : "rgba(148,163,184,0.5)",
                  flexShrink: 0,
                }}>
                  {idx === 0 ? "🥇" : idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Sans',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🏋️ {pr.name}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(100,116,139,0.6)", marginTop: 1 }}>{formatDate(pr.ts)}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: idx === 0 ? ACCENT : "#818cf8", fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>
                  {pr.weight} lbs
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Widget (named export) ─────────────────────────────────────────
export function BodyMetricsDashWidget({ data, workoutHistory = [], onNavigate }) {
  const history = useMemo(
    () => [...(data.weightHistory || [])].sort((a, b) => b.date.localeCompare(a.date)),
    [data.weightHistory]
  );
  const currentWeight = history[0]?.weight ?? parseFloat(data.bodyStats?.currentWeight) ?? null;
  const goalWeight = parseFloat(data.bodyStats?.goalWeight) || null;

  const last7 = history.slice(0, 7).reverse();

  const topPR = useMemo(() => {
    const map = {};
    for (const session of (workoutHistory || [])) {
      for (const ex of (session.exercises || [])) {
        if (!ex.name) continue;
        for (const set of (ex.sets || [])) {
          const w = parseFloat(set.weight);
          if (w && (!map[ex.name] || w > map[ex.name])) map[ex.name] = w;
        }
      }
    }
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return entries[0] ? { name: entries[0][0], weight: entries[0][1] } : null;
  }, [workoutHistory]);

  const weights = last7.map(e => e.weight);
  const sparkMin = weights.length ? Math.min(...weights) : 0;
  const sparkMax = weights.length ? Math.max(...weights) : 1;
  const sparkRange = sparkMax - sparkMin || 1;
  const W = 80, H = 28;

  const sparkPoints = weights.map((w, i) => {
    const x = (i / Math.max(weights.length - 1, 1)) * W;
    const y = H - ((w - sparkMin) / sparkRange) * (H - 4) - 2;
    return x + "," + y;
  }).join(" ");

  return (
    <div
      onClick={onNavigate}
      style={{
        background: "rgba(17,24,39,0.7)",
        border: "1px solid rgba(249,115,22,0.2)",
        borderRadius: 16,
        padding: "14px 16px",
        cursor: "pointer",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>⚖️ Body Metrics</span>
        <span style={{ fontSize: 11, color: "rgba(249,115,22,0.6)" }}>View all →</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <div style={{
              background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 700,
              color: ACCENT,
            }}>
              {currentWeight ? `${currentWeight} lbs` : "No weight logged"}
            </div>
            {goalWeight && (
              <div style={{
                background: "rgba(52,201,138,0.08)",
                border: "1px solid rgba(52,201,138,0.2)",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 12,
                color: "#34c98a",
                fontWeight: 600,
              }}>
                Goal: {goalWeight} lbs
              </div>
            )}
          </div>
          {topPR && (
            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.6)" }}>
              🏆 Top PR: <span style={{ color: "#818cf8", fontWeight: 700 }}>{topPR.name} — {topPR.weight} lbs</span>
            </div>
          )}
        </div>
        {weights.length > 1 && (
          <svg width={W} height={H} style={{ flexShrink: 0, overflow: "visible" }}>
            <polyline
              points={sparkPoints}
              fill="none"
              stroke={ACCENT}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
          </svg>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BodyMetricsTab({ data, onChange, workoutHistory = [] }) {
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.3px" }}>
          ⚖️ Body Metrics
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(100,116,139,0.6)" }}>
          Track your weight, body composition, and personal records.
        </p>
      </div>

      {/* Progress Stats Row — quick glance chips */}
      <ProgressStatsRow data={data} />

      {/* Weight log + trend */}
      <WeightLog data={data} onChange={onChange} />
      <WeightTrendChart data={data} />

      {/* Body stats */}
      <BodyStatsPanel data={data} />

      {/* Measurement tracking */}
      <MeasurementProgress data={data} onChange={onChange} />

      {/* Transformation timeline */}
      <TransformationTimeline data={data} />

      {/* PRs */}
      <PRTracker workoutHistory={workoutHistory} />
    </div>
  );
}
