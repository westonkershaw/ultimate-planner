/* eslint-disable */
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Utilities ───────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(str) {
  return new Date(str + "T12:00:00");
}

function fmtDateShort(str) {
  const d = parseDate(str);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysBetween(a, b) {
  return Math.ceil((parseDate(b) - parseDate(a)) / 86400000);
}

function daysUntil(str) {
  return Math.ceil((parseDate(str) - new Date()) / 86400000);
}

function tripDuration(start, end) {
  return Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#f97316";
const FONT = "'DM Sans', sans-serif";

const STATUS_COLORS = {
  planning: "#64748b",
  upcoming: "#6366f1",
  active: "#22c55e",
  done: "#334155",
};

const STATUS_LABELS = {
  planning: "Planning",
  upcoming: "Upcoming",
  active: "Active",
  done: "Done",
};

const ACTIVITY_ICONS = {
  transport: "✈️",
  accommodation: "🏨",
  food: "🍜",
  activity: "🎭",
  other: "📝",
};

const PACKING_CATEGORIES = ["documents", "clothes", "toiletries", "electronics", "other"];
const PACKING_CATEGORY_LABELS = {
  documents: "Documents",
  clothes: "Clothes",
  toiletries: "Toiletries",
  electronics: "Electronics",
  other: "Other",
};
const PACKING_CATEGORY_ICONS = {
  documents: "📄",
  clothes: "👕",
  toiletries: "🧴",
  electronics: "💻",
  other: "📦",
};

const EXPENSE_CATEGORIES = ["transport", "accommodation", "food", "activity", "other"];

const EXPENSE_CATEGORY_COLORS = {
  transport: "#6366f1",
  accommodation: "#f97316",
  food: "#22c55e",
  activity: "#ec4899",
  other: "#94a3b8",
};

const FX_RATES = {
  USD: 1,
  JPY: 0.0067,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.74,
  AUD: 0.65,
  MXN: 0.058,
};

const CURRENCIES = Object.keys(FX_RATES);

const QUICK_PACK_TEMPLATES = [
  { item: "Passport", category: "documents" },
  { item: "Flight tickets", category: "documents" },
  { item: "Travel insurance", category: "documents" },
  { item: "Phone charger", category: "electronics" },
  { item: "Laptop + charger", category: "electronics" },
  { item: "Power adapter", category: "electronics" },
  { item: "Toothbrush + toothpaste", category: "toiletries" },
  { item: "Shampoo + conditioner", category: "toiletries" },
  { item: "Deodorant", category: "toiletries" },
  { item: "T-shirts (3)", category: "clothes" },
  { item: "Pants (2)", category: "clothes" },
  { item: "Underwear (5)", category: "clothes" },
  { item: "Comfortable shoes", category: "clothes" },
  { item: "Sunscreen", category: "other" },
  { item: "Medications", category: "other" },
];

const EMOJI_OPTIONS = ["✈️", "🗺️", "🏖️", "🏔️", "🌍", "🌏", "🌎", "🏝️", "🗼", "🎌", "🏛️", "🌆", "🚂", "🛳️", "🏕️", "🎿"];

const COVER_COLORS = [
  "#6366f1", "#f97316", "#ec4899", "#22c55e",
  "#06b6d4", "#a855f7", "#eab308", "#ef4444",
];

const BUCKET_EMOJIS = ["🌍", "🗺️", "🏖️", "🏔️", "🏝️", "🗼", "🎌", "🏛️", "🌆", "🛳️", "🏕️", "🎿", "🌅", "🏜️", "🌋", "🧭"];

// ─── Budget bar color ─────────────────────────────────────────────────────────

function budgetBarColor(pct) {
  if (pct < 70) return "#22c55e";
  if (pct < 90) return "#f59e0b";
  return "#ef4444";
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const S = {
  wrap: {
    fontFamily: FONT,
    color: "#f1f5f9",
    minHeight: "100vh",
    padding: "20px 16px",
    boxSizing: "border-box",
  },
  card: {
    background: "rgba(17,24,39,0.7)",
    border: "1px solid rgba(51,65,85,0.4)",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 14,
  },
  btn: {
    background: ACCENT,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSm: {
    background: ACCENT,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "5px 10px",
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnGhost: {
    background: "rgba(255,255,255,0.07)",
    color: "#cbd5e1",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "8px 16px",
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  input: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#f1f5f9",
    fontFamily: FONT,
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  label: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 4,
    display: "block",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  tag: {
    display: "inline-block",
    borderRadius: 20,
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColor = color || budgetBarColor(pct);
  return (
    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 7, width: "100%", overflow: "hidden" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: pct + "%" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ height: "100%", borderRadius: 99, background: barColor }}
      />
    </div>
  );
}

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────

function DonutChart({ slices, size = 120 }) {
  // slices: [{label, value, color}]
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  const r = 40;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 14;

  let cum = 0;
  const segments = slices.map((sl) => {
    const pct = sl.value / total;
    const startAngle = cum * 2 * Math.PI - Math.PI / 2;
    const endAngle = (cum + pct) * 2 * Math.PI - Math.PI / 2;
    cum += pct;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;

    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    return { ...sl, d, pct };
  });

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {segments.map((seg, i) => (
        <path
          key={i}
          d={seg.d}
          fill="none"
          stroke={seg.color}
          strokeWidth={stroke}
          strokeLinecap="butt"
          opacity={0.9}
        />
      ))}
      <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="rgba(15,23,42,0.9)" />
    </svg>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ onClose, children, title }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: 24,
            width: "100%",
            maxWidth: 480,
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <div style={{ ...S.row, justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
            <button onClick={onClose} style={{ ...S.btnGhost, padding: "4px 10px", fontSize: 16 }}>✕</button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Create Trip Modal ────────────────────────────────────────────────────────

function CreateTripModal({ onSave, onClose, initial }) {
  const [form, setForm] = useState(
    initial || {
      name: "",
      destination: "",
      emoji: "✈️",
      startDate: "",
      endDate: "",
      budget: "",
      currency: "USD",
      coverColor: COVER_COLORS[0],
      notes: "",
    }
  );

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSave() {
    if (!form.name.trim() || !form.destination.trim() || !form.startDate || !form.endDate) return;
    onSave(form);
  }

  return (
    <Modal onClose={onClose} title={initial ? "Edit Trip" : "New Trip"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={S.label}>Trip Name</label>
          <input style={S.input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Summer in Tokyo" />
        </div>
        <div>
          <label style={S.label}>Destination</label>
          <input style={S.input} value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Tokyo, Japan" />
        </div>
        <div>
          <label style={S.label}>Emoji</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => set("emoji", e)}
                style={{
                  background: form.emoji === e ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.05)",
                  border: form.emoji === e ? "2px solid " + ACCENT : "2px solid transparent",
                  borderRadius: 8,
                  padding: "4px 8px",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={S.label}>Start Date</label>
            <input type="date" style={S.input} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </div>
          <div>
            <label style={S.label}>End Date</label>
            <input type="date" style={S.input} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <div>
            <label style={S.label}>Total Budget</label>
            <input type="number" style={S.input} value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="3000" />
          </div>
          <div>
            <label style={S.label}>Currency</label>
            <select
              style={{ ...S.input, cursor: "pointer" }}
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={S.label}>Cover Color</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COVER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => set("coverColor", c)}
                style={{
                  width: 28, height: 28, borderRadius: "50%", background: c,
                  border: form.coverColor === c ? "3px solid #fff" : "3px solid transparent",
                  cursor: "pointer",
                  boxShadow: form.coverColor === c ? "0 0 0 2px " + c : "none",
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ ...S.row, justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <button style={S.btnGhost} onClick={onClose}>Cancel</button>
          <button style={S.btn} onClick={handleSave}>Save Trip</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Trip Card ────────────────────────────────────────────────────────────────

function TripCard({ trip, onClick }) {
  const pct = trip.budget > 0 ? Math.min(100, (trip.spent / trip.budget) * 100) : 0;
  const barColor = budgetBarColor(pct);
  const today = todayStr();

  const daysAway = trip.startDate
    ? Math.ceil((new Date(trip.startDate + "T12:00:00") - new Date()) / 86400000)
    : null;

  const isUpcoming = daysAway !== null && daysAway > 0 && trip.status !== "done";
  const isActive = trip.startDate <= today && trip.endDate >= today;

  let countdownLabel = null;
  if (trip.status === "done") {
    countdownLabel = "Completed";
  } else if (isActive) {
    countdownLabel = "Active now";
  } else if (daysAway === 0) {
    countdownLabel = "Today!";
  } else if (daysAway !== null && daysAway < 0) {
    const abs = Math.abs(daysAway);
    countdownLabel = abs + " day" + (abs !== 1 ? "s" : "") + " ago";
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onClick}
      style={{
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        background: "rgba(17,24,39,0.8)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Color header */}
      <div
        style={{
          background: trip.coverColor || ACCENT,
          height: isUpcoming ? 96 : 80,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 10,
          position: "relative",
        }}
      >
        <span style={{ fontSize: 28 }}>{trip.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{trip.name}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{trip.destination}</div>
          {/* Large countdown pill for upcoming trips */}
          {isUpcoming && (
            <div style={{
              marginTop: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(0,0,0,0.35)",
              borderRadius: 20,
              padding: "3px 10px",
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{daysAway}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                {daysAway === 1 ? "day left" : "days left"}
              </span>
            </div>
          )}
        </div>
        <span
          style={{
            ...S.tag,
            position: "absolute",
            top: 10, right: 10,
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
          }}
        >
          {STATUS_LABELS[trip.status]}
        </span>
      </div>
      {/* Body */}
      <div style={{ padding: "10px 14px 12px" }}>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          {trip.startDate ? fmtDateShort(trip.startDate) : "—"}{trip.endDate ? " → " + fmtDateShort(trip.endDate) : ""}
          {trip.startDate && trip.endDate && (
            <span style={{ color: "#64748b" }}> · {tripDuration(trip.startDate, trip.endDate)} days</span>
          )}
        </div>
        {countdownLabel && (
          <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 6 }}>
            {countdownLabel}
          </div>
        )}
        {trip.budget > 0 ? (
          <>
            <div style={{ ...S.row, justifyContent: "space-between", marginBottom: 4, fontSize: 12, color: "#94a3b8" }}>
              <span>Budget</span>
              <span style={{ color: barColor }}>${(trip.spent || 0).toLocaleString()} / ${trip.budget?.toLocaleString()}</span>
            </div>
            <ProgressBar value={trip.spent || 0} max={trip.budget} />
            {(trip.spent || 0) > trip.budget ? (
              <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginTop: 4 }}>Over budget!</div>
            ) : (
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                {"$" + (trip.budget - (trip.spent || 0)).toLocaleString() + " remaining"}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>No budget set</div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Overview sub-tab ─────────────────────────────────────────────────────────

function OverviewTab({ trip, onEditTrip, onUpdateNotes }) {
  const today = todayStr();
  const duration = trip.startDate && trip.endDate ? tripDuration(trip.startDate, trip.endDate) : null;
  const until = trip.startDate ? daysUntil(trip.startDate) : null;
  const since = trip.endDate ? daysUntil(trip.endDate) : null;
  const pct = trip.budget > 0 ? Math.min(100, (trip.spent / trip.budget) * 100) : 0;
  const barColor = budgetBarColor(pct);
  const remaining = trip.budget > 0 ? trip.budget - (trip.spent || 0) : 0;

  // Currency helper
  const [fxFrom, setFxFrom] = useState(trip.currency !== "USD" ? trip.currency : "JPY");
  const [fxAmount, setFxAmount] = useState("");
  const fxResult = useMemo(() => {
    const n = parseFloat(fxAmount);
    if (!n || !FX_RATES[fxFrom]) return null;
    return (n * FX_RATES[fxFrom]).toFixed(2);
  }, [fxAmount, fxFrom]);

  return (
    <div>
      {/* Countdown hero for upcoming trips */}
      {until !== null && until > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.1) 100%)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 14,
            padding: "18px 20px",
            marginBottom: 14,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 42, fontWeight: 900, color: "#a5b4fc", lineHeight: 1 }}>{until}</div>
          <div style={{ fontSize: 14, color: "rgba(165,180,252,0.8)", marginTop: 4, fontWeight: 600 }}>
            {"days until " + trip.name}
          </div>
          <div style={{
            marginTop: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(20,184,166,0.15)",
            border: "1px solid rgba(20,184,166,0.3)",
            borderRadius: 20,
            padding: "4px 14px",
          }}>
            <span style={{ fontSize: 11, color: "#5eead4", fontWeight: 700 }}>{fmtDateShort(trip.startDate)}</span>
            <span style={{ fontSize: 11, color: "rgba(94,234,212,0.6)" }}>·</span>
            <span style={{ fontSize: 11, color: "#5eead4", fontWeight: 700 }}>{until + " days left"}</span>
          </div>
        </motion.div>
      )}

      {/* Dates & duration */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Trip Info</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={S.label}>Departs</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{trip.startDate ? fmtDateShort(trip.startDate) : "—"}</div>
          </div>
          <div>
            <div style={S.label}>Returns</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{trip.endDate ? fmtDateShort(trip.endDate) : "—"}</div>
          </div>
          {duration && (
            <div>
              <div style={S.label}>Duration</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{duration} days</div>
            </div>
          )}
          <div>
            <div style={S.label}>Status</div>
            <span
              style={{
                ...S.tag,
                background: STATUS_COLORS[trip.status] + "33",
                color: STATUS_COLORS[trip.status],
              }}
            >
              {STATUS_LABELS[trip.status]}
            </span>
          </div>
          {since !== null && since < 0 && (
            <div>
              <div style={S.label}>Since return</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#64748b" }}>{Math.abs(since)} days ago</div>
            </div>
          )}
        </div>
      </div>

      {/* Budget detail */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Budget</div>
        {trip.budget > 0 ? (
          <>
            <div style={{ ...S.row, justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
              <span style={{ color: "#94a3b8" }}>Spent</span>
              <span style={{ fontWeight: 700, color: barColor }}>
                {"$" + (trip.spent || 0).toLocaleString() + " / $" + trip.budget.toLocaleString() + " (" + pct.toFixed(0) + "%)"}
              </span>
            </div>
            <ProgressBar value={trip.spent || 0} max={trip.budget} />
            {(trip.spent || 0) > trip.budget ? (
              <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 700, marginTop: 8 }}>
                {"Over budget by $" + ((trip.spent || 0) - trip.budget).toLocaleString()}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>
                {"Remaining: $" + remaining.toLocaleString()}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#475569" }}>No budget set</div>
        )}
      </div>

      {/* Notes */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Notes</div>
        <textarea
          value={trip.notes || ""}
          onChange={(e) => onUpdateNotes(e.target.value)}
          placeholder="Add trip notes, reminders, ideas…"
          style={{
            ...S.input,
            minHeight: 90,
            resize: "vertical",
          }}
        />
      </div>

      {/* Currency helper */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Currency Helper</div>
        <div style={{ ...S.row, flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <select
            value={fxFrom}
            onChange={(e) => setFxFrom(e.target.value)}
            style={{ ...S.input, width: 90, flex: "0 0 auto" }}
          >
            {CURRENCIES.filter((c) => c !== "USD").map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            style={{ ...S.input, flex: 1 }}
            value={fxAmount}
            onChange={(e) => setFxAmount(e.target.value)}
            placeholder="Amount in local currency"
          />
        </div>
        {fxResult !== null && (
          <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>
            {"≈ $" + fxResult + " USD"}
          </div>
        )}
        <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
          Rates are approximate. JPY: 0.0067 · EUR: 1.08 · GBP: 1.27 · CAD: 0.74 · AUD: 0.65 · MXN: 0.058
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={S.btnGhost} onClick={onEditTrip}>Edit Trip</button>
      </div>
    </div>
  );
}

// ─── Itinerary sub-tab ────────────────────────────────────────────────────────

function ItineraryTab({ trip, onChange }) {
  const [addingDay, setAddingDay] = useState(null);
  const [actForm, setActForm] = useState({ time: "", activity: "", type: "activity", cost: "", notes: "" });

  function updateItinerary(newItin) {
    onChange({ ...trip, itinerary: newItin || [] });
  }

  function addDay() {
    const days = trip.itinerary || [];
    const nextDay = days.length > 0 ? Math.max(...days.map((d) => d.day)) + 1 : 1;
    const date = trip.startDate
      ? (() => {
          const d = new Date(trip.startDate + "T12:00:00");
          d.setDate(d.getDate() + nextDay - 1);
          return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        })()
      : "";
    updateItinerary([...days, { id: uid(), day: nextDay, date, items: [] }]);
  }

  function addActivity(dayId) {
    if (!actForm.activity.trim()) return;
    const newItem = {
      id: uid(),
      time: actForm.time,
      activity: actForm.activity,
      type: actForm.type,
      cost: parseFloat(actForm.cost) || 0,
      notes: actForm.notes,
    };
    updateItinerary(
      (trip.itinerary || []).map((d) =>
        d.id === dayId ? { ...d, items: [...(d.items || []), newItem] } : d
      )
    );
    setActForm({ time: "", activity: "", type: "activity", cost: "", notes: "" });
    setAddingDay(null);
  }

  function removeActivity(dayId, itemId) {
    updateItinerary(
      (trip.itinerary || []).map((d) =>
        d.id === dayId ? { ...d, items: d.items.filter((i) => i.id !== itemId) } : d
      )
    );
  }

  function moveActivity(dayId, idx, dir) {
    updateItinerary(
      (trip.itinerary || []).map((d) => {
        if (d.id !== dayId) return d;
        const items = [...d.items];
        const swapIdx = idx + dir;
        if (swapIdx < 0 || swapIdx >= items.length) return d;
        [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
        return { ...d, items };
      })
    );
  }

  function removeDay(dayId) {
    updateItinerary((trip.itinerary || []).filter((d) => d.id !== dayId));
  }

  const sortedDays = [...(trip.itinerary || [])].sort((a, b) => a.day - b.day);

  return (
    <div>
      {sortedDays.length === 0 && (
        <div style={{ ...S.card, textAlign: "center", padding: 32, color: "#64748b" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
          <div style={{ marginBottom: 8 }}>No itinerary yet</div>
          <button style={S.btn} onClick={addDay}>Add First Day</button>
        </div>
      )}
      {sortedDays.map((day) => (
        <div key={day.id} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              background: "rgba(249,115,22,0.1)",
              borderBottom: "1px solid rgba(249,115,22,0.15)",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <span style={{ fontWeight: 700, color: ACCENT, marginRight: 8 }}>Day {day.day}</span>
              {day.date && <span style={{ fontSize: 13, color: "#94a3b8" }}>{fmtDateShort(day.date)}</span>}
            </div>
            <div style={S.row}>
              <button
                style={{ ...S.btnSm, background: "rgba(255,255,255,0.07)", color: "#94a3b8" }}
                onClick={() => { setAddingDay(day.id); setActForm({ time: "", activity: "", type: "activity", cost: "", notes: "" }); }}
              >
                + Activity
              </button>
              <button
                style={{ ...S.btnSm, background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                onClick={() => removeDay(day.id)}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ padding: "10px 16px" }}>
            <div style={{ position: "relative" }}>
              {day.items.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 11,
                    top: 16,
                    bottom: 16,
                    width: 2,
                    background: "rgba(249,115,22,0.2)",
                    borderRadius: 2,
                  }}
                />
              )}
              {day.items.map((item, idx) => (
                <div key={item.id} style={{ display: "flex", gap: 12, marginBottom: 12, position: "relative" }}>
                  <div
                    style={{
                      width: 24, height: 24,
                      borderRadius: "50%",
                      background: "rgba(249,115,22,0.15)",
                      border: "2px solid " + ACCENT,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12,
                      flexShrink: 0,
                      zIndex: 1,
                    }}
                  >
                    {ACTIVITY_ICONS[item.type] || "📝"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...S.row, justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{item.activity}</span>
                        {item.time && <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>{item.time}</span>}
                        {item.cost > 0 && <span style={{ fontSize: 12, color: "#22c55e", marginLeft: 8 }}>{"$" + item.cost}</span>}
                      </div>
                      <div style={S.row}>
                        <button
                          style={{ ...S.btnSm, background: "transparent", color: "#64748b", padding: "2px 6px" }}
                          onClick={() => moveActivity(day.id, idx, -1)}
                          disabled={idx === 0}
                        >
                          ↑
                        </button>
                        <button
                          style={{ ...S.btnSm, background: "transparent", color: "#64748b", padding: "2px 6px" }}
                          onClick={() => moveActivity(day.id, idx, 1)}
                          disabled={idx === day.items.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          style={{ ...S.btnSm, background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "2px 6px" }}
                          onClick={() => removeActivity(day.id, item.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {item.notes && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{item.notes}</div>}
                  </div>
                </div>
              ))}
              {day.items.length === 0 && (
                <div style={{ fontSize: 13, color: "#475569", padding: "8px 0" }}>Tap + to add your first activity</div>
              )}
            </div>

            <AnimatePresence>
              {addingDay === day.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    style={{
                      background: "rgba(249,115,22,0.05)",
                      border: "1px solid rgba(249,115,22,0.2)",
                      borderRadius: 10,
                      padding: 12,
                      marginTop: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input
                        style={S.input}
                        placeholder="Activity / description"
                        value={actForm.activity}
                        onChange={(e) => setActForm((f) => ({ ...f, activity: e.target.value }))}
                      />
                      <input
                        type="time"
                        style={S.input}
                        value={actForm.time}
                        onChange={(e) => setActForm((f) => ({ ...f, time: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <select
                        style={{ ...S.input, cursor: "pointer" }}
                        value={actForm.type}
                        onChange={(e) => setActForm((f) => ({ ...f, type: e.target.value }))}
                      >
                        {Object.keys(ACTIVITY_ICONS).map((t) => (
                          <option key={t} value={t}>{ACTIVITY_ICONS[t]} {t}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        style={S.input}
                        placeholder="Cost (USD)"
                        value={actForm.cost}
                        onChange={(e) => setActForm((f) => ({ ...f, cost: e.target.value }))}
                      />
                    </div>
                    <input
                      style={S.input}
                      placeholder="Notes (optional)"
                      value={actForm.notes}
                      onChange={(e) => setActForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                    <div style={{ ...S.row, justifyContent: "flex-end", gap: 8 }}>
                      <button style={S.btnGhost} onClick={() => setAddingDay(null)}>Cancel</button>
                      <button style={S.btn} onClick={() => addActivity(day.id)}>Add</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ))}

      {sortedDays.length > 0 && (
        <button style={{ ...S.btn, width: "100%", marginTop: 4 }} onClick={addDay}>
          + Add Day
        </button>
      )}
    </div>
  );
}

// ─── Packing List sub-tab ─────────────────────────────────────────────────────

function PackingTab({ trip, onChange }) {
  const [newItem, setNewItem] = useState("");
  const [newCat, setNewCat] = useState("other");

  const packingList = trip.packingList || [];
  const packed = packingList.filter((i) => i.packed).length;
  const total = packingList.length;
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0;
  const allPacked = total > 0 && packed === total;

  function toggleItem(id) {
    onChange({
      ...trip,
      packingList: packingList.map((i) => (i.id === id ? { ...i, packed: !i.packed } : i)),
    });
  }

  function addItem() {
    if (!newItem.trim()) return;
    onChange({
      ...trip,
      packingList: [...packingList, { id: uid(), item: newItem.trim(), category: newCat, packed: false }],
    });
    setNewItem("");
  }

  function removeItem(id) {
    onChange({ ...trip, packingList: packingList.filter((i) => i.id !== id) });
  }

  function addTemplates() {
    const existingNames = new Set(packingList.map((i) => i.item.toLowerCase()));
    const toAdd = QUICK_PACK_TEMPLATES
      .filter((t) => !existingNames.has(t.item.toLowerCase()))
      .map((t) => ({ id: uid(), item: t.item, category: t.category, packed: false }));
    if (toAdd.length === 0) return;
    onChange({ ...trip, packingList: [...packingList, ...toAdd] });
  }

  return (
    <div>
      {/* Progress header */}
      <div style={S.card}>
        <div style={{ ...S.row, justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Packing Progress</span>
          <span
            style={{
              background: allPacked ? "rgba(34,197,94,0.15)" : "rgba(249,115,22,0.15)",
              color: allPacked ? "#22c55e" : ACCENT,
              borderRadius: 20,
              padding: "3px 12px",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {pct + "% packed"}
          </span>
        </div>
        <ProgressBar value={packed} max={total || 1} color={allPacked ? "#22c55e" : ACCENT} />
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
          {packed + " of " + total + " items packed"}
        </div>
        {/* Celebration banner */}
        <AnimatePresence>
          {allPacked && total > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{
                marginTop: 12,
                background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(6,182,212,0.1))",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 10,
                padding: "10px 16px",
                textAlign: "center",
                fontSize: 15,
                fontWeight: 700,
                color: "#86efac",
              }}
            >
              All packed! ✈️ Ready for takeoff!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Per-category mini stats */}
        {total > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {PACKING_CATEGORIES.map((cat) => {
              const catItems = packingList.filter((i) => i.category === cat);
              if (catItems.length === 0) return null;
              const catPacked = catItems.filter((i) => i.packed).length;
              const catDone = catPacked === catItems.length;
              return (
                <div
                  key={cat}
                  style={{
                    background: catDone ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                    border: "1px solid " + (catDone ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"),
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 11,
                    color: catDone ? "#86efac" : "#94a3b8",
                    fontWeight: 600,
                  }}
                >
                  {PACKING_CATEGORY_ICONS[cat]} {PACKING_CATEGORY_LABELS[cat]} {catPacked}/{catItems.length}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add item */}
      <div style={{ ...S.card, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          style={{ ...S.input, flex: "1 1 160px" }}
          placeholder="Add item…"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <select
          style={{ ...S.input, flex: "0 0 130px", cursor: "pointer" }}
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
        >
          {PACKING_CATEGORIES.map((c) => (
            <option key={c} value={c}>{PACKING_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <button style={S.btn} onClick={addItem}>Add</button>
        <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={addTemplates}>Quick-add templates</button>
      </div>

      {/* Category sections */}
      {total === 0 && (
        <div style={{ ...S.card, textAlign: "center", padding: 32, color: "#64748b" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎒</div>
          <div>Nothing packed yet. Add items above or use the template.</div>
        </div>
      )}
      {PACKING_CATEGORIES.map((cat) => {
        const items = packingList.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        const catPacked = items.filter((i) => i.packed).length;
        return (
          <div key={cat} style={S.card}>
            <div style={{ ...S.row, justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ ...S.sectionTitle, marginBottom: 0 }}>
                {PACKING_CATEGORY_ICONS[cat]} {PACKING_CATEGORY_LABELS[cat]}
              </div>
              <span style={{ fontSize: 12, color: catPacked === items.length ? "#22c55e" : "#64748b", fontWeight: 700 }}>
                {catPacked}/{items.length}
              </span>
            </div>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                style={{
                  ...S.row,
                  justifyContent: "space-between",
                  padding: "7px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div style={S.row}>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    onClick={() => toggleItem(item.id)}
                    style={{
                      width: 20, height: 20,
                      borderRadius: 5,
                      border: item.packed ? "none" : "2px solid rgba(255,255,255,0.2)",
                      background: item.packed ? ACCENT : "transparent",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.packed && <span style={{ fontSize: 11, color: "#fff" }}>✓</span>}
                  </motion.button>
                  <span
                    style={{
                      fontSize: 14,
                      textDecoration: item.packed ? "line-through" : "none",
                      color: item.packed ? "#475569" : "#e2e8f0",
                      transition: "all 0.2s",
                    }}
                  >
                    {item.item}
                  </span>
                </div>
                <button
                  style={{ ...S.btnSm, background: "transparent", color: "#475569", padding: "2px 6px" }}
                  onClick={() => removeItem(item.id)}
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Expenses sub-tab ─────────────────────────────────────────────────────────

function ExpensesTab({ trip, onChange }) {
  const [form, setForm] = useState({ date: todayStr(), description: "", amount: "", category: "food" });
  const expenses = [...(trip.expenses || [])].sort((a, b) => (a.date < b.date ? 1 : -1));

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function addExpense() {
    if (!form.description.trim() || !form.amount) return;
    const newExp = {
      id: uid(),
      date: form.date,
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
    };
    const newExpenses = [...(trip.expenses || []), newExp];
    const newSpent = newExpenses.reduce((s, e) => s + e.amount, 0);
    onChange({ ...trip, expenses: newExpenses, spent: newSpent });
    setForm({ date: todayStr(), description: "", amount: "", category: "food" });
  }

  function removeExpense(id) {
    const newExpenses = (trip.expenses || []).filter((e) => e.id !== id);
    const newSpent = newExpenses.reduce((s, e) => s + e.amount, 0);
    onChange({ ...trip, expenses: newExpenses, spent: newSpent });
  }

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = EXPENSE_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {});

  const pct = trip.budget > 0 ? Math.min(100, (totalSpent / trip.budget) * 100) : 0;
  const barColor = budgetBarColor(pct);

  // Cost per day
  const duration = trip.startDate && trip.endDate ? tripDuration(trip.startDate, trip.endDate) : null;
  const costPerDay = duration && duration > 0 && totalSpent > 0
    ? (totalSpent / duration).toFixed(2)
    : null;

  // Donut slices
  const donutSlices = EXPENSE_CATEGORIES
    .filter((cat) => byCategory[cat] > 0)
    .map((cat) => ({
      label: cat,
      value: byCategory[cat],
      color: EXPENSE_CATEGORY_COLORS[cat],
    }));

  return (
    <div>
      {/* Budget summary */}
      <div style={S.card}>
        <div style={{ ...S.row, justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>Total Spent</span>
          {trip.budget > 0 ? (
            <span style={{ fontWeight: 700, color: barColor }}>{"$" + totalSpent.toFixed(2) + " / $" + trip.budget}</span>
          ) : (
            <span style={{ fontWeight: 700, color: "#f1f5f9" }}>{"$" + totalSpent.toFixed(2)}</span>
          )}
        </div>
        {trip.budget > 0 && (
          <>
            <ProgressBar value={totalSpent} max={trip.budget} />
            {totalSpent > trip.budget ? (
              <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700, marginTop: 6 }}>
                {"Over budget by $" + (totalSpent - trip.budget).toFixed(2)}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                {"Remaining: $" + (trip.budget - totalSpent).toFixed(2)}
              </div>
            )}
          </>
        )}
        {costPerDay && (
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
            Cost per day: <span style={{ color: "#f1f5f9", fontWeight: 700 }}>{"$" + costPerDay}</span>
          </div>
        )}
      </div>

      {/* Donut chart + category breakdown */}
      {totalSpent > 0 && (
        <div style={S.card}>
          <div style={S.sectionTitle}>Expense Breakdown</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            {donutSlices.length > 1 && (
              <DonutChart slices={donutSlices} size={120} />
            )}
            <div style={{ flex: 1, minWidth: 160 }}>
              {EXPENSE_CATEGORIES.map((cat) => {
                if (byCategory[cat] <= 0) return null;
                const catPct = totalSpent > 0 ? (byCategory[cat] / totalSpent) * 100 : 0;
                return (
                  <div key={cat} style={{ marginBottom: 8 }}>
                    <div style={{ ...S.row, justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}>
                      <div style={{ ...S.row, gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: EXPENSE_CATEGORY_COLORS[cat], flexShrink: 0 }} />
                        <span style={{ color: "#cbd5e1", textTransform: "capitalize" }}>{cat}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{"$" + byCategory[cat].toFixed(2)}</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 5, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: catPct + "%" }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        style={{ height: "100%", borderRadius: 99, background: EXPENSE_CATEGORY_COLORS[cat] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add expense */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Add Expense</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={S.label}>Date</label>
            <input type="date" style={S.input} value={form.date} onChange={(e) => setF("date", e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Amount (USD)</label>
            <input type="number" style={S.input} value={form.amount} onChange={(e) => setF("amount", e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={S.label}>Description</label>
          <input style={S.input} value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="Flight, hotel, dinner…" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Category</label>
          <select style={{ ...S.input, cursor: "pointer" }} value={form.category} onChange={(e) => setF("category", e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button style={{ ...S.btn, width: "100%" }} onClick={addExpense}>Add Expense</button>
      </div>

      {/* Expense list */}
      {expenses.length > 0 && (
        <div style={S.card}>
          <div style={S.sectionTitle}>Expenses</div>
          {expenses.map((exp) => (
            <div
              key={exp.id}
              style={{
                ...S.row,
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{exp.description}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {fmtDateShort(exp.date)} · <span style={{ textTransform: "capitalize" }}>{exp.category}</span>
                </div>
              </div>
              <div style={S.row}>
                <span style={{ fontWeight: 700, color: "#f1f5f9" }}>{"$" + (exp.amount || 0).toFixed(2)}</span>
                <button
                  style={{ ...S.btnSm, background: "transparent", color: "#475569", padding: "2px 6px" }}
                  onClick={() => removeExpense(exp.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bucket List ──────────────────────────────────────────────────────────────

function BucketListModal({ onSave, onClose }) {
  const [dest, setDest] = useState("");
  const [emoji, setEmoji] = useState("🌍");
  const [notes, setNotes] = useState("");

  function handleSave() {
    if (!dest.trim()) return;
    onSave({ id: uid(), destination: dest.trim(), emoji, notes, visited: false, addedDate: todayStr() });
  }

  return (
    <Modal onClose={onClose} title="Add to Bucket List">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={S.label}>Destination</label>
          <input style={S.input} value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Patagonia, Argentina" autoFocus />
        </div>
        <div>
          <label style={S.label}>Emoji</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {BUCKET_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                style={{
                  background: emoji === e ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                  border: emoji === e ? "2px solid #6366f1" : "2px solid transparent",
                  borderRadius: 8,
                  padding: "4px 8px",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={S.label}>Notes (optional)</label>
          <input style={S.input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why you want to visit…" />
        </div>
        <div style={{ ...S.row, justifyContent: "flex-end", gap: 10 }}>
          <button style={S.btnGhost} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn, background: "#6366f1" }} onClick={handleSave}>Add</button>
        </div>
      </div>
    </Modal>
  );
}

function BucketListSection({ data, onChange, onStartPlanning }) {
  const bucketList = data?.bucketList || [];
  const [showModal, setShowModal] = useState(false);

  const visited = bucketList.filter((b) => b.visited).length;
  const pending = bucketList.filter((b) => !b.visited).length;

  function addBucketItem(item) {
    onChange((prev) => ({ ...prev, bucketList: [...(prev?.bucketList || []), item] }));
    setShowModal(false);
  }

  function markVisited(id) {
    onChange((prev) => ({
      ...prev,
      bucketList: (prev?.bucketList || []).map((b) => b.id === id ? { ...b, visited: !b.visited } : b),
    }));
  }

  function removeBucketItem(id) {
    onChange((prev) => ({
      ...prev,
      bucketList: (prev?.bucketList || []).filter((b) => b.id !== id),
    }));
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ ...S.row, justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Bucket List</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {"🌍 " + visited + " destination" + (visited !== 1 ? "s" : "") + " visited · " + pending + " on bucket list"}
          </div>
        </div>
        <button
          style={{ ...S.btn, background: "#6366f1", fontSize: 12, padding: "6px 14px" }}
          onClick={() => setShowModal(true)}
        >
          + Add Destination
        </button>
      </div>

      {bucketList.length === 0 && (
        <div style={{ ...S.card, textAlign: "center", padding: "32px 24px", color: "#64748b" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🗺️</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Your dream destinations await</div>
          <div style={{ fontSize: 13, color: "#475569" }}>Start building your travel bucket list</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {bucketList.map((item) => (
          <motion.div
            key={item.id}
            layout
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              background: item.visited
                ? "rgba(34,197,94,0.08)"
                : "rgba(99,102,241,0.08)",
              border: "1px solid " + (item.visited ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.2)"),
              borderRadius: 12,
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 4 }}>{item.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 2 }}>
              {item.destination}
            </div>
            {item.notes && (
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{item.notes}</div>
            )}
            {item.visited && (
              <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 6 }}>Visited ✓</div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {!item.visited && (
                <button
                  onClick={() => onStartPlanning(item)}
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: 6,
                    color: "#818cf8",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 10px",
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  Start Planning →
                </button>
              )}
              <button
                onClick={() => markVisited(item.id)}
                style={{
                  background: item.visited ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                  border: "1px solid " + (item.visited ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"),
                  borderRadius: 6,
                  color: item.visited ? "#22c55e" : "#64748b",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                {item.visited ? "Unmark" : "Mark visited"}
              </button>
              <button
                onClick={() => removeBucketItem(item.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#475569",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: FONT,
                  padding: "4px 6px",
                }}
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {showModal && (
        <BucketListModal onSave={addBucketItem} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

// ─── Trip Detail View ─────────────────────────────────────────────────────────

const DETAIL_TABS = [
  { id: "overview", label: "📋 Overview" },
  { id: "itinerary", label: "🗺️ Itinerary" },
  { id: "packing", label: "🎒 Packing" },
  { id: "expenses", label: "💵 Expenses" },
];

function TripDetail({ trip, onBack, onChange }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);

  function handleEditSave(form) {
    onChange({
      ...trip,
      name: form.name,
      destination: form.destination,
      emoji: form.emoji,
      startDate: form.startDate,
      endDate: form.endDate,
      budget: parseFloat(form.budget) || 0,
      currency: form.currency,
      coverColor: form.coverColor,
    });
    setEditing(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Header */}
      <div
        style={{
          background: trip.coverColor || ACCENT,
          borderRadius: 16,
          padding: "16px 18px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "rgba(0,0,0,0.25)", color: "#fff",
            border: "none", borderRadius: 8, padding: "6px 12px",
            fontFamily: FONT, fontSize: 14, cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <span style={{ fontSize: 24 }}>{trip.emoji}</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{trip.name}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{trip.destination}</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 10,
          padding: 4,
          marginBottom: 16,
          overflowX: "auto",
        }}
      >
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: "1 0 auto",
              background: activeTab === tab.id ? ACCENT : "transparent",
              color: activeTab === tab.id ? "#fff" : "#94a3b8",
              border: "none",
              borderRadius: 7,
              padding: "8px 10px",
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "overview" && (
            <OverviewTab
              trip={trip}
              onEditTrip={() => setEditing(true)}
              onUpdateNotes={(notes) => onChange({ ...trip, notes })}
            />
          )}
          {activeTab === "itinerary" && (
            <ItineraryTab trip={trip} onChange={onChange} />
          )}
          {activeTab === "packing" && (
            <PackingTab trip={trip} onChange={onChange} />
          )}
          {activeTab === "expenses" && (
            <ExpensesTab trip={trip} onChange={onChange} />
          )}
        </motion.div>
      </AnimatePresence>

      {editing && (
        <CreateTripModal
          initial={{
            name: trip.name,
            destination: trip.destination,
            emoji: trip.emoji,
            startDate: trip.startDate,
            endDate: trip.endDate,
            budget: String(trip.budget || ""),
            currency: trip.currency || "USD",
            coverColor: trip.coverColor || COVER_COLORS[0],
            notes: trip.notes || "",
          }}
          onSave={handleEditSave}
          onClose={() => setEditing(false)}
        />
      )}
    </motion.div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export default function TravelPlannerTab({ data, onChange }) {
  const trips = data?.trips || [];
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [prefillBucket, setPrefillBucket] = useState(null);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) || null;

  function handleCreateTrip(form) {
    const day1Date = form.startDate || "";
    const initialItinerary = [{ id: uid(), day: 1, date: day1Date, items: [] }];

    const newTrip = {
      id: uid(),
      name: form.name,
      destination: form.destination,
      emoji: form.emoji,
      startDate: form.startDate,
      endDate: form.endDate,
      budget: parseFloat(form.budget) || 0,
      spent: 0,
      currency: form.currency,
      coverColor: form.coverColor,
      notes: "",
      status: "planning",
      packingList: [],
      itinerary: initialItinerary,
      expenses: [],
    };
    onChange((prev) => ({ ...prev, trips: [...(prev?.trips || []), newTrip] }));
    setCreating(false);
    setPrefillBucket(null);
  }

  function handleTripChange(updatedTrip) {
    onChange((prev) => ({ ...prev, trips: (prev?.trips || []).map((t) => (t.id === updatedTrip.id ? updatedTrip : t)) }));
  }

  function handleStartPlanning(bucketItem) {
    setPrefillBucket(bucketItem);
    setCreating(true);
  }

  const today = todayStr();
  const upcoming = useMemo(() => trips.filter((t) => t.status !== "done" && t.startDate > today), [trips, today]);
  const done = trips.filter((t) => t.status === "done");

  return (
    <div style={S.wrap}>
      <AnimatePresence mode="wait">
        {selectedTrip ? (
          <TripDetail
            key={selectedTrip.id}
            trip={selectedTrip}
            onBack={() => setSelectedTripId(null)}
            onChange={handleTripChange}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div style={{ ...S.row, justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
                  <span style={{ color: ACCENT }}>✈️</span> Travel Planner
                </h1>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                  {trips.length + " trip" + (trips.length !== 1 ? "s" : "")}
                </div>
              </div>
              <button style={S.btn} onClick={() => { setPrefillBucket(null); setCreating(true); }}>+ New Trip</button>
            </div>

            {/* Trip grid */}
            {trips.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  ...S.card,
                  textAlign: "center",
                  padding: "48px 24px",
                  background: "linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(17,24,39,0.7) 100%)",
                  border: "1px solid rgba(249,115,22,0.2)",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>🌍</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Plan your next adventure</div>
                <div style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
                  Track trips, itineraries, budgets, and packing lists in one place.
                </div>
                <button style={S.btn} onClick={() => { setPrefillBucket(null); setCreating(true); }}>Plan a Trip</button>
              </motion.div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {trips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} onClick={() => setSelectedTripId(trip.id)} />
                ))}
              </div>
            )}

            {/* Bucket List section */}
            <BucketListSection
              data={data}
              onChange={onChange}
              onStartPlanning={handleStartPlanning}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {creating && (
        <CreateTripModal
          onSave={handleCreateTrip}
          onClose={() => { setCreating(false); setPrefillBucket(null); }}
          initial={prefillBucket ? {
            name: "Trip to " + prefillBucket.destination,
            destination: prefillBucket.destination,
            emoji: prefillBucket.emoji,
            startDate: "",
            endDate: "",
            budget: "",
            currency: "USD",
            coverColor: COVER_COLORS[0],
            notes: prefillBucket.notes || "",
          } : undefined}
        />
      )}
    </div>
  );
}

// ─── Dashboard Widget ─────────────────────────────────────────────────────────

export function TravelDashWidget({ data, onNavigate }) {
  const trips = data?.trips || [];
  const today = todayStr();

  const nextTrip = useMemo(() => {
    const upcoming = trips
      .filter((t) => t.status !== "done" && t.startDate > today)
      .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    if (upcoming.length > 0) return upcoming[0];
    const active = trips.find((t) => t.status === "active" || (t.startDate <= today && t.endDate >= today));
    return active || null;
  }, [trips, today]);

  const bucketCount = (data?.bucketList || []).filter((b) => !b.visited).length;

  if (!nextTrip) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={onNavigate}
        style={{
          ...S.card,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ ...S.row, gap: 10 }}>
          <span style={{ fontSize: 24 }}>🌍</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Travel Planner</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {bucketCount > 0 ? bucketCount + " bucket list destinations" : "No upcoming trips"}
            </div>
          </div>
        </div>
        <span style={{ color: ACCENT, fontSize: 14, fontWeight: 700 }}>Plan a trip →</span>
      </motion.div>
    );
  }

  const pct = nextTrip.budget > 0 ? Math.min(100, ((nextTrip.spent || 0) / nextTrip.budget) * 100) : 0;
  const until = daysUntil(nextTrip.startDate);
  const isActive = nextTrip.startDate <= today && nextTrip.endDate >= today;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onNavigate}
      style={{
        cursor: "pointer",
        background: nextTrip.coverColor || ACCENT,
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ ...S.row, justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ ...S.row, gap: 8 }}>
            <span style={{ fontSize: 22 }}>{nextTrip.emoji}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{nextTrip.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{nextTrip.destination}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
              {isActive ? "Active" : until <= 0 ? "Today!" : until + "d"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
              {isActive ? "In progress" : until > 0 ? "days away" : ""}
            </div>
          </div>
        </div>
        {nextTrip.budget > 0 && (
          <>
            <div style={{ ...S.row, justifyContent: "space-between", marginBottom: 4, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
              <span>Budget used</span>
              <span style={{ fontWeight: 700 }}>{pct.toFixed(0) + "%"}</span>
            </div>
            <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 99, height: 6, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: pct + "%" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                  height: "100%",
                  borderRadius: 99,
                  background: pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#22c55e",
                }}
              />
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
