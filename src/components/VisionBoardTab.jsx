/* eslint-disable */
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  calcVisionGoalPct,
  calcSvgRingProps,
  VISION_BUCKETS,
  mapCategoryToBucket,
  calcAffirmationOfDayIndex,
} from "../utils/math";

// ─── Utilities ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#c084fc";
const INDIGO = "#14b8a6";
const CANVAS_BG = "rgba(8,9,13,0.95)";

// Category color map — matches the app-wide category palette
const CATEGORY_COLORS = {
  intellectual: "#14b8a6",
  physical:     "#f43f5e",
  financial:    "#10b981",
  spiritual:    "#a78bfa",
  social:       "#f59e0b",
  creative:     "#ec4899",
  career:       "#06b6d4",
  default:      "#c084fc",
};

const CATEGORY_LABELS = [
  "intellectual", "physical", "financial", "spiritual",
  "social", "creative", "career",
];

const TOOLBAR_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  background: "rgba(8,9,13,0.8)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderBottom: "1px solid rgba(45, 212, 191,0.18)",
  flexWrap: "wrap",
};

const BTN = {
  background: "rgba(45, 212, 191,0.15)",
  border: "1px solid rgba(45, 212, 191,0.25)",
  borderRadius: 8,
  color: "#f1f5f9",
  cursor: "pointer",
  fontSize: 13,
  padding: "6px 14px",
  fontFamily: "inherit",
  transition: "background 0.15s",
};

const BTN_PRIMARY = {
  ...BTN,
  background: INDIGO,
  border: "1px solid rgba(45, 212, 191,0.6)",
  fontWeight: 700,
};

const BTN_GHOST = {
  ...BTN,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.1)",
};

const CARD_STYLE = {
  background: "rgba(17,24,39,0.7)",
  border: "1px solid rgba(45, 212, 191,0.15)",
  borderRadius: 14,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

const ITEM_TYPES = [
  { type: "quote", label: "Quote", emoji: "📝" },
  { type: "affirmation", label: "Affirmation", emoji: "💫" },
  { type: "goal", label: "Goal", emoji: "🎯" },
  { type: "image", label: "Image", emoji: "🖼️" },
  { type: "shape", label: "Shape", emoji: "🌈" },
];

const TEMPLATES = [
  {
    id: "goals",
    label: "Goals Board",
    emoji: "🏆",
    color: "#14b8a6",
    items: [
      { type: "goal", content: "My #1 Goal This Year", x: 10, y: 10, width: 35, fontSize: 18, bold: true, italic: false, color: "#c084fc", bgColor: "rgba(192,132,252,0.12)" },
      { type: "goal", content: "Health & Fitness Goal", x: 55, y: 10, width: 35, fontSize: 16, bold: false, italic: false, color: "#14b8a6", bgColor: "rgba(45, 212, 191,0.12)" },
      { type: "goal", content: "Career Milestone", x: 10, y: 50, width: 35, fontSize: 16, bold: false, italic: false, color: "#34d399", bgColor: "rgba(52,211,153,0.1)" },
      { type: "quote", content: "Dream big. Act bold. Stay focused.", x: 55, y: 50, width: 35, fontSize: 15, bold: false, italic: true, color: "#f1f5f9", bgColor: "rgba(45, 212, 191,0.08)" },
    ],
  },
  {
    id: "motivation",
    label: "Motivation Board",
    emoji: "💪",
    color: "#c084fc",
    items: [
      { type: "quote", content: "You are capable of amazing things.", x: 5, y: 8, width: 42, fontSize: 18, bold: false, italic: true, color: "#c084fc", bgColor: "rgba(192,132,252,0.12)" },
      { type: "affirmation", content: "I am strong, focused, and unstoppable.", x: 52, y: 8, width: 43, fontSize: 17, bold: false, italic: true, color: "#f9a8d4", bgColor: "rgba(249,168,212,0.1)" },
      { type: "quote", content: "Every day is a new beginning.", x: 5, y: 52, width: 42, fontSize: 16, bold: false, italic: true, color: "#67e8f9", bgColor: "rgba(103,232,249,0.08)" },
      { type: "affirmation", content: "I attract success and abundance.", x: 52, y: 52, width: 43, fontSize: 16, bold: false, italic: true, color: "#86efac", bgColor: "rgba(134,239,172,0.08)" },
    ],
  },
  {
    id: "blank",
    label: "Blank",
    emoji: "✨",
    color: "#334155",
    items: [],
  },
];

function makeItem(type, partial) {
  partial = partial || {};
  return {
    id: uid(),
    type,
    content: partial.content || "",
    imageUrl: "",
    x: partial.x !== undefined ? partial.x : 10,
    y: partial.y !== undefined ? partial.y : 10,
    width: partial.width !== undefined ? partial.width : 30,
    color: partial.color || ACCENT,
    fontSize: partial.fontSize || 16,
    bold: partial.bold || false,
    italic: partial.italic || false,
    bgColor: partial.bgColor || "rgba(192,132,252,0.13)",
    shape: "rect",
  };
}

// ─── Gallery Card Types (for masonry view) ─────────────────────────────────

// Default gallery cards — these are the "rich" card types separate from the
// freeform canvas. They live in board.galleryCards array.
function defaultGoalGalleryCard(partial) {
  partial = partial || {};
  return {
    id: uid(),
    cardType: "goal",
    title: partial.title || "My Goal",
    category: partial.category || "default",
    current: partial.current || 0,
    target: partial.target || 100,
    unit: partial.unit || "",
    notes: partial.notes || "",
    createdAt: new Date().toISOString(),
  };
}

function defaultAffirmationGalleryCard(partial) {
  partial = partial || {};
  return {
    id: uid(),
    cardType: "affirmation",
    text: partial.text || "I am capable of achieving everything I set my mind to.",
    gradient: partial.gradient || "135deg, #14b8a6 0%, #a78bfa 100%",
    pinned: false,
    createdAt: new Date().toISOString(),
  };
}

function defaultDreamGalleryCard(partial) {
  partial = partial || {};
  return {
    id: uid(),
    cardType: "dream",
    title: partial.title || "My Dream",
    description: partial.description || "",
    imageUrl: partial.imageUrl || "",
    createdAt: new Date().toISOString(),
  };
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#c084fc", "#14b8a6", "#f9a8d4", "#67e8f9",
  "#86efac", "#fde68a", "#fb923c", "#f87171",
  "#f1f5f9", "#94a3b8",
];

function ColorPicker({ value, onChange, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.7px" }}>{label}</span>}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{
              width: 22, height: 22, borderRadius: "50%",
              background: c, border: value === c ? "2px solid #fff" : "2px solid transparent",
              cursor: "pointer", padding: 0, flexShrink: 0,
            }}
          />
        ))}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 22, height: 22, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
          title="Custom color"
        />
      </div>
    </div>
  );
}

// ─── Animated SVG Progress Ring (mini, for goal cards) ────────────────────────

function MiniProgressRing({ pct, color, size }) {
  size = size || 48;
  const thickness = 4;
  const ring = useMemo(
    () => calcSvgRingProps(pct / 100, size, thickness),
    [pct, size]
  );
  const viewBoxStr = "0 0 " + size + " " + size;

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBoxStr}
      style={{ flexShrink: 0 }}
      role="img"
      aria-label={"Progress: " + pct + "%"}
    >
      <circle
        cx={ring.center}
        cy={ring.center}
        r={ring.radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={thickness}
      />
      <motion.circle
        cx={ring.center}
        cy={ring.center}
        r={ring.radius}
        fill="none"
        stroke={color || ACCENT}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={ring.circumference}
        initial={{ strokeDashoffset: ring.circumference }}
        animate={{ strokeDashoffset: ring.strokeDashoffset }}
        transition={{ duration: 1.0, ease: "easeOut" }}
        style={{ transformOrigin: ring.center + "px " + ring.center + "px", transform: "rotate(-90deg)" }}
      />
    </svg>
  );
}

// ─── Gallery Cards ────────────────────────────────────────────────────────────

function GoalGalleryCard({ card, onEdit, onDelete }) {
  const pct = useMemo(
    () => calcVisionGoalPct(card.current || 0, card.target || 100),
    [card.current, card.target]
  );
  const catColor = CATEGORY_COLORS[card.category] || CATEGORY_COLORS.default;
  const borderLeft = "3px solid " + catColor;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      style={{
        background: "rgba(17,24,39,0.85)",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.07)",
        borderLeft,
        padding: "16px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        cursor: "pointer",
        transition: "box-shadow 0.2s",
        position: "relative",
        overflow: "hidden",
        breakInside: "avoid",
        marginBottom: 14,
      }}
      onHoverStart={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 32px " + catColor + "44";
      }}
      onHoverEnd={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: catColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            {card.category || "goal"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.4 }}>
            {card.title}
          </div>
          {card.notes && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 4, lineHeight: 1.5 }}>
              {card.notes}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <MiniProgressRing pct={pct} color={catColor} size={52} />
          <div style={{ fontSize: 11, color: catColor, fontWeight: 800 }}>{pct}%</div>
        </div>
      </div>

      {/* Progress fill bar */}
      <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 4, height: 6, overflow: "hidden" }}>
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: pct + "%" }}
          transition={{ duration: 1.0, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 4, background: catColor }}
        />
      </div>

      {/* current / target */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          {card.current}{card.unit ? " " + card.unit : ""} of {card.target}{card.unit ? " " + card.unit : ""}
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Goal Card</span>
      </div>

      {/* Edit / delete controls */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          gap: 4,
          opacity: 0,
          transition: "opacity 0.15s",
        }}
        className="card-controls"
      >
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(card); }}
          style={{ ...BTN_GHOST, padding: "3px 7px", fontSize: 11 }}
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
          style={{ ...BTN_GHOST, padding: "3px 7px", fontSize: 11, color: "#f87171" }}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

function AffirmationGalleryCard({ card, onEdit, onDelete, onTogglePin }) {
  const gradient = card.gradient || "135deg, #14b8a6 0%, #a78bfa 100%";
  const bgGrad = "linear-gradient(" + gradient + ")";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      style={{
        background: bgGrad,
        borderRadius: 14,
        padding: "20px 18px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        cursor: "pointer",
        position: "relative",
        breakInside: "avoid",
        marginBottom: 14,
        overflow: "hidden",
      }}
    >
      {/* Glow overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,255,255,0.04)",
          pointerEvents: "none",
          borderRadius: 14,
        }}
      />

      {card.pinned && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            fontSize: 10,
            fontWeight: 700,
            color: "#fde68a",
            background: "rgba(0,0,0,0.35)",
            borderRadius: 6,
            padding: "2px 7px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Today's Affirmation
        </div>
      )}

      <div
        style={{
          fontSize: card.pinned ? 20 : 16,
          fontWeight: 700,
          fontStyle: "italic",
          color: "#fff",
          lineHeight: 1.5,
          textAlign: "center",
          marginTop: card.pinned ? 24 : 0,
          textShadow: "0 1px 8px rgba(0,0,0,0.4)",
        }}
      >
        "{card.text}"
      </div>

      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          gap: 4,
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(card.id); }}
          title={card.pinned ? "Unpin" : "Pin as Today's Affirmation"}
          style={{
            background: card.pinned ? "rgba(253,230,138,0.25)" : "rgba(255,255,255,0.15)",
            border: "none",
            borderRadius: 6,
            padding: "3px 7px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {card.pinned ? "★" : "☆"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(card); }}
          style={{ ...BTN_GHOST, padding: "3px 7px", fontSize: 11, background: "rgba(255,255,255,0.15)", border: "none" }}
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
          style={{ ...BTN_GHOST, padding: "3px 7px", fontSize: 11, color: "#fca5a5", background: "rgba(255,255,255,0.15)", border: "none" }}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

function DreamGalleryCard({ card, onEdit, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      style={{
        background: "rgba(17,24,39,0.9)",
        borderRadius: 14,
        border: "1px solid rgba(192,132,252,0.2)",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        cursor: "pointer",
        position: "relative",
        breakInside: "avoid",
        marginBottom: 14,
      }}
    >
      {card.imageUrl && (
        <div style={{ position: "relative", height: 140, overflow: "hidden" }}>
          <img
            src={card.imageUrl}
            alt={card.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 60,
              background: "linear-gradient(transparent, rgba(8,9,13,0.95))",
            }}
          />
        </div>
      )}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
          Dream
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.4, marginBottom: 6 }}>
          {card.title}
        </div>
        {card.description && (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>
            {card.description}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          gap: 4,
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(card); }}
          style={{ ...BTN_GHOST, padding: "3px 7px", fontSize: 11, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
          style={{ ...BTN_GHOST, padding: "3px 7px", fontSize: 11, color: "#fca5a5", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

// ─── Daily Affirmation Hero ───────────────────────────────────────────────────

function DailyAffirmationHero({ card }) {
  if (!card) return null;
  const gradient = card.gradient || "135deg, #14b8a6 0%, #a78bfa 100%";
  const bgGrad = "linear-gradient(" + gradient + ")";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: bgGrad,
        borderRadius: 18,
        padding: "28px 28px 24px",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 0 40px rgba(45, 212, 191,0.3)",
      }}
    >
      {/* Animated glow pulse */}
      <style>{`
        @keyframes vb-glow-pulse {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vb-glow-orb { animation: none !important; }
        }
      `}</style>
      <div
        className="vb-glow-orb"
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          animation: "vb-glow-pulse 3s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
        Today's Affirmation
      </div>
      <div
        style={{
          fontSize: "clamp(17px, 3vw, 24px)",
          fontWeight: 700,
          fontStyle: "italic",
          color: "#fff",
          lineHeight: 1.5,
          textShadow: "0 1px 12px rgba(0,0,0,0.3)",
          maxWidth: 640,
        }}
      >
        "{card.text}"
      </div>
    </motion.div>
  );
}

// ─── Gallery Card Modal (add / edit) ─────────────────────────────────────────

const AFFIRMATION_GRADIENTS = [
  { label: "Indigo Wave", value: "135deg, #14b8a6 0%, #a78bfa 100%" },
  { label: "Rose Gold",   value: "135deg, #f43f5e 0%, #f97316 100%" },
  { label: "Emerald",     value: "135deg, #059669 0%, #06b6d4 100%" },
  { label: "Sunset",      value: "135deg, #f59e0b 0%, #f43f5e 100%" },
  { label: "Violet Night", value: "135deg, #312e81 0%, #7c3aed 100%" },
  { label: "Ocean",       value: "135deg, #0ea5e9 0%, #14b8a6 100%" },
];

function GalleryCardModal({ initial, onSave, onClose }) {
  const isEdit = !!initial;
  const [cardType, setCardType] = useState((initial && initial.cardType) || "goal");

  // Goal fields
  const [title, setTitle] = useState((initial && initial.title) || "");
  const [category, setCategory] = useState((initial && initial.category) || "default");
  const [current, setCurrent] = useState((initial && initial.current) !== undefined ? String(initial.current) : "0");
  const [target, setTarget] = useState((initial && initial.target) !== undefined ? String(initial.target) : "100");
  const [unit, setUnit] = useState((initial && initial.unit) || "");
  const [notes, setNotes] = useState((initial && initial.notes) || "");

  // Affirmation fields
  const [affText, setAffText] = useState((initial && initial.text) || "I am capable of achieving everything I set my mind to.");
  const [gradient, setGradient] = useState((initial && initial.gradient) || AFFIRMATION_GRADIENTS[0].value);

  // Dream fields
  const [dreamTitle, setDreamTitle] = useState((initial && initial.title) || "");
  const [dreamDesc, setDreamDesc] = useState((initial && initial.description) || "");
  const [dreamImg, setDreamImg] = useState((initial && initial.imageUrl) || "");
  const dreamFileRef = useRef(null);

  function handleDreamFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDreamImg(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (cardType === "goal") {
      const base = isEdit ? initial : defaultGoalGalleryCard();
      onSave({ ...base, cardType: "goal", title: title || "My Goal", category, current: parseFloat(current) || 0, target: parseFloat(target) || 100, unit, notes });
    } else if (cardType === "affirmation") {
      const base = isEdit ? initial : defaultAffirmationGalleryCard();
      onSave({ ...base, cardType: "affirmation", text: affText || "I am capable.", gradient });
    } else {
      const base = isEdit ? initial : defaultDreamGalleryCard();
      onSave({ ...base, cardType: "dream", title: dreamTitle || "My Dream", description: dreamDesc, imageUrl: dreamImg });
    }
    onClose();
  }

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  };

  const modalStyle = {
    background: "#0f1117",
    border: "1px solid #1e2030",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 480,
    maxHeight: "90vh",
    overflowY: "auto",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <motion.div
        style={modalStyle}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>
          {isEdit ? "Edit Card" : "Add a Card"}
        </div>
        {!isEdit && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
            Choose a card type to get started
          </div>
        )}

        {/* Card type selector */}
        {!isEdit && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[
              { t: "goal", label: "Goal", emoji: "🎯" },
              { t: "affirmation", label: "Affirmation", emoji: "💫" },
              { t: "dream", label: "Dream", emoji: "🌟" },
            ].map(({ t, label, emoji }) => (
              <button
                key={t}
                onClick={() => setCardType(t)}
                style={{
                  ...BTN,
                  flex: 1,
                  background: cardType === t ? INDIGO : "rgba(45, 212, 191,0.1)",
                  border: "1px solid " + (cardType === t ? INDIGO : "rgba(45, 212, 191,0.2)"),
                  fontSize: 12,
                  padding: "8px 4px",
                  textAlign: "center",
                }}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        )}
        {/* Per-type one-liner description — shown only when adding */}
        {!isEdit && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginBottom: 18, minHeight: 16, paddingLeft: 2 }}>
            {cardType === "goal" && "Track a measurable goal with a title, target, and progress bar."}
            {cardType === "affirmation" && "Write a short positive statement to pin as your daily mantra."}
            {cardType === "dream" && "Capture a big dream — add an image, a story, and a target date."}
          </div>
        )}

        {/* GOAL fields */}
        {cardType === "goal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Goal Title</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Run a 5K"
                style={inputStyle}
                autoFocus
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Category</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {CATEGORY_LABELS.map((c) => {
                  const cc = CATEGORY_COLORS[c];
                  const isActive = category === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      style={{
                        background: isActive ? cc + "33" : "rgba(255,255,255,0.04)",
                        border: "1px solid " + (isActive ? cc : "rgba(255,255,255,0.1)"),
                        borderRadius: 7,
                        padding: "4px 10px",
                        fontSize: 11,
                        color: isActive ? cc : "rgba(255,255,255,0.5)",
                        cursor: "pointer",
                        textTransform: "capitalize",
                        fontWeight: isActive ? 700 : 400,
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Current</div>
                <input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} style={inputStyle} min="0" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Target</div>
                <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} style={inputStyle} min="1" />
              </div>
              <div style={{ width: 80 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Unit</div>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="km, %" style={inputStyle} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Notes (optional)</div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Why this goal matters..." style={{ ...inputStyle, resize: "vertical" }} />
            </div>
          </div>
        )}

        {/* AFFIRMATION fields */}
        {cardType === "affirmation" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Affirmation Text</div>
              <textarea
                value={affText}
                onChange={(e) => setAffText(e.target.value)}
                rows={3}
                placeholder="I am..."
                style={{ ...inputStyle, resize: "vertical", fontSize: 15, fontStyle: "italic" }}
                autoFocus
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Background Gradient</div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {AFFIRMATION_GRADIENTS.map((g) => {
                  const bg = "linear-gradient(" + g.value + ")";
                  return (
                    <button
                      key={g.value}
                      onClick={() => setGradient(g.value)}
                      title={g.label}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: bg,
                        border: gradient === g.value ? "3px solid #fff" : "3px solid transparent",
                        cursor: "pointer",
                        padding: 0,
                        flexShrink: 0,
                      }}
                    />
                  );
                })}
              </div>
            </div>
            {/* Preview */}
            <div style={{ borderRadius: 10, padding: "14px 16px", background: "linear-gradient(" + gradient + ")", fontSize: 14, fontStyle: "italic", fontWeight: 700, color: "#fff", textAlign: "center", lineHeight: 1.5 }}>
              "{affText || "I am..."}"
            </div>
          </div>
        )}

        {/* DREAM fields */}
        {cardType === "dream" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Dream Title</div>
              <input value={dreamTitle} onChange={(e) => setDreamTitle(e.target.value)} placeholder="Live in Tokyo" style={inputStyle} autoFocus />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description</div>
              <textarea value={dreamDesc} onChange={(e) => setDreamDesc(e.target.value)} rows={2} placeholder="What does this dream mean to you..." style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Image (optional)</div>
              {/* Upload-first layout — more discoverable for new users */}
              <button
                onClick={() => dreamFileRef.current?.click()}
                style={{
                  ...BTN_PRIMARY,
                  width: "100%",
                  textAlign: "center",
                  marginBottom: 8,
                  fontSize: 13,
                }}
              >
                Upload from Device
              </button>
              <input ref={dreamFileRef} type="file" accept="image/*" onChange={handleDreamFile} style={{ display: "none" }} />
              <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "4px 0 8px" }}>— or paste an image URL —</div>
              <input value={dreamImg} onChange={(e) => setDreamImg(e.target.value)} placeholder="https://  (Pinterest, Unsplash, etc.)" style={inputStyle} />
            </div>
            {dreamImg && (
              <img src={dreamImg} alt="preview" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }} onError={(e) => { e.target.style.display = "none"; }} />
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ ...BTN_GHOST, flex: 1 }}>Cancel</button>
          <button onClick={handleSave} style={{ ...BTN_PRIMARY, flex: 2 }}>
            {isEdit ? "Save Changes" : "Add Card"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Masonry Gallery View ─────────────────────────────────────────────────────

function MasonryGallery({ board, onUpdateBoard }) {
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const cards = board.galleryCards || [];
  const pinnedAffirmation = cards.find((c) => c.cardType === "affirmation" && c.pinned) || null;

  function saveCard(card) {
    const exists = cards.find((c) => c.id === card.id);
    const next = exists ? cards.map((c) => (c.id === card.id ? card : c)) : [...cards, card];
    onUpdateBoard({ ...board, galleryCards: next });
  }

  function deleteCard(id) {
    onUpdateBoard({ ...board, galleryCards: cards.filter((c) => c.id !== id) });
  }

  function togglePin(id) {
    const next = cards.map((c) => ({
      ...c,
      pinned: c.id === id ? !c.pinned : (c.cardType === "affirmation" ? false : c.pinned),
    }));
    onUpdateBoard({ ...board, galleryCards: next });
  }

  function handleShare() {
    const lines = ["=== " + board.title + " ===", ""];
    const goals = cards.filter((c) => c.cardType === "goal");
    const affs = cards.filter((c) => c.cardType === "affirmation");
    const dreams = cards.filter((c) => c.cardType === "dream");
    if (goals.length) {
      lines.push("GOALS:");
      goals.forEach((g) => {
        const pct = calcVisionGoalPct(g.current || 0, g.target || 100);
        lines.push("  - " + g.title + " (" + pct + "% complete)");
      });
      lines.push("");
    }
    if (affs.length) {
      lines.push("AFFIRMATIONS:");
      affs.forEach((a) => lines.push('  "' + a.text + '"'));
      lines.push("");
    }
    if (dreams.length) {
      lines.push("DREAMS:");
      dreams.forEach((d) => lines.push("  - " + d.title + (d.description ? ": " + d.description : "")));
    }
    const text = lines.join("\n");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => { setToastMsg('Vision board summary copied to clipboard!'); setTimeout(() => setToastMsg(''), 3000); });
    } else {
      prompt("Copy your vision board summary:", text);
    }
  }

  // Split cards into two columns for masonry layout
  const col1 = [];
  const col2 = [];
  const regular = cards.filter((c) => !(c.cardType === "affirmation" && c.pinned));
  regular.forEach((c, i) => {
    if (i % 2 === 0) col1.push(c);
    else col2.push(c);
  });

  function renderCard(card) {
    if (card.cardType === "goal") {
      return (
        <GoalGalleryCard
          key={card.id}
          card={card}
          onEdit={(c) => { setEditingCard(c); setShowModal(true); }}
          onDelete={deleteCard}
        />
      );
    }
    if (card.cardType === "affirmation") {
      return (
        <AffirmationGalleryCard
          key={card.id}
          card={card}
          onEdit={(c) => { setEditingCard(c); setShowModal(true); }}
          onDelete={deleteCard}
          onTogglePin={togglePin}
        />
      );
    }
    return (
      <DreamGalleryCard
        key={card.id}
        card={card}
        onEdit={(c) => { setEditingCard(c); setShowModal(true); }}
        onDelete={deleteCard}
      />
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>
            {board.emoji} {board.title}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {cards.length} card{cards.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleShare} style={{ ...BTN_GHOST, fontSize: 12 }}>
            Share Vision Board
          </button>
          <button
            onClick={() => { setEditingCard(null); setShowModal(true); }}
            style={{ ...BTN_PRIMARY, fontSize: 13 }}
          >
            + Add Card
          </button>
        </div>
      </div>

      {/* Daily Affirmation Hero */}
      <AnimatePresence>
        {pinnedAffirmation && (
          <DailyAffirmationHero key="hero" card={pinnedAffirmation} />
        )}
      </AnimatePresence>

      {/* Empty state */}
      {cards.length === 0 && (
        <div style={{ padding: "32px 20px" }}>
          {/* Card-type preview row — teaches users what they can create */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: 14 }}>
              Three types of cards to fill your board:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { emoji: "🎯", label: "Goal Card", desc: "Track a measurable goal with a progress bar" },
                { emoji: "💫", label: "Affirmation", desc: "Pin a daily mantra to stay motivated" },
                { emoji: "🌟", label: "Dream Card", desc: "Capture a dream with an image and story" },
              ].map(({ emoji, label, desc }) => (
                <button
                  key={label}
                  onClick={() => { setEditingCard(null); setShowModal(true); }}
                  style={{
                    ...CARD_STYLE,
                    padding: "14px 10px",
                    textAlign: "center",
                    cursor: "pointer",
                    border: "1px solid rgba(45, 212, 191,0.2)",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = INDIGO; e.currentTarget.style.background = "rgba(45, 212, 191,0.18)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(45, 212, 191,0.2)"; e.currentTarget.style.background = "rgba(17,24,39,0.7)"; }}
                >
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Full-width CTA */}
          <button
            onClick={() => { setEditingCard(null); setShowModal(true); }}
            style={{
              ...BTN_PRIMARY,
              width: "100%",
              fontSize: 15,
              padding: "13px 24px",
              borderRadius: 10,
            }}
          >
            Add Your First Card
          </button>
        </div>
      )}

      {/* Masonry 2-column grid */}
      {cards.length > 0 && (
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>{col1.map(renderCard)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>{col2.map(renderCard)}</div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <GalleryCardModal
            key="gcmodal"
            initial={editingCard}
            onSave={saveCard}
            onClose={() => { setShowModal(false); setEditingCard(null); }}
          />
        )}
      </AnimatePresence>

      {/* Toast notification */}
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#14b8a6', color: '#fff', padding: '12px 20px', borderRadius: 8, zIndex: 9999, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", boxShadow: '0 8px 24px rgba(45, 212, 191,0.4)' }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

// ─── Add Item Panel (freeform canvas) ────────────────────────────────────────

function AddItemPanel({ onAdd, onClose, yearlyGoals }) {
  yearlyGoals = yearlyGoals || [];
  const [activeType, setActiveType] = useState("quote");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [color, setColor] = useState(ACCENT);
  const [fontSize, setFontSize] = useState(16);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [bgColor, setBgColor] = useState("rgba(192,132,252,0.13)");
  const [selectedGoal, setSelectedGoal] = useState("");
  const [shapeType, setShapeType] = useState("rect");
  const fileRef = useRef(null);

  function handleAdd() {
    let item;
    if (activeType === "image") {
      item = makeItem("image", { content: content || imageUrl, imageUrl: imageUrl || content, color, fontSize, bold, italic, bgColor, width: 30 });
    } else if (activeType === "goal") {
      const goalText = selectedGoal || content || "My Goal";
      item = makeItem("goal", { content: goalText, color, fontSize, bold, italic, bgColor });
    } else if (activeType === "affirmation") {
      item = makeItem("affirmation", { content: content || "I am capable of amazing things.", color, fontSize: fontSize || 18, bold, italic: true, bgColor, width: 38 });
    } else if (activeType === "shape") {
      item = makeItem("shape", { content: shapeType, color, bgColor, width: 20, fontSize });
    } else {
      item = makeItem(activeType, { content, color, fontSize, bold, italic, bgColor });
    }
    onAdd(item);
    onClose();
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageUrl(ev.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 200,
        ...CARD_STYLE,
        border: "1px solid rgba(45, 212, 191,0.3)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
        padding: "16px",
        minWidth: 320,
        maxWidth: 380,
      }}
    >
      {/* Type selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {ITEM_TYPES.map((t) => (
          <button
            key={t.type}
            onClick={() => setActiveType(t.type)}
            style={{
              ...BTN,
              background: activeType === t.type ? INDIGO : "rgba(45, 212, 191,0.1)",
              border: "1px solid " + (activeType === t.type ? INDIGO : "rgba(45, 212, 191,0.2)"),
              fontSize: 12,
              padding: "5px 10px",
            }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {activeType === "image" ? (
          <>
            <input
              placeholder="Image URL..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              style={inputStyle}
            />
            <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>— or —</div>
            <button onClick={() => fileRef.current?.click()} style={{ ...BTN_GHOST, textAlign: "center" }}>
              Upload from file
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
            {imageUrl && (
              <img
                src={imageUrl}
                alt="preview"
                style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 8, opacity: 0.8 }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
          </>
        ) : activeType === "shape" ? (
          <div style={{ display: "flex", gap: 8 }}>
            {["rect", "circle"].map((s) => (
              <button
                key={s}
                onClick={() => setShapeType(s)}
                style={{
                  ...BTN,
                  background: shapeType === s ? INDIGO : "rgba(45, 212, 191,0.1)",
                  flex: 1,
                  fontSize: 12,
                }}
              >
                {s === "rect" ? "Rectangle" : "Circle"}
              </button>
            ))}
          </div>
        ) : activeType === "goal" ? (
          <>
            {yearlyGoals.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 2 }}>Pick from your goals:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 120, overflowY: "auto" }}>
                  {yearlyGoals.map((g) => {
                    const txt = typeof g === "string" ? g : g.title || g.text || JSON.stringify(g);
                    return (
                      <button
                        key={txt}
                        onClick={() => setSelectedGoal(txt)}
                        style={{
                          ...BTN,
                          background: selectedGoal === txt ? INDIGO : "rgba(45, 212, 191,0.08)",
                          textAlign: "left",
                          fontSize: 12,
                        }}
                      >
                        {txt}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>— or type custom —</div>
              </>
            )}
            <input
              placeholder="Goal text..."
              value={selectedGoal || content}
              onChange={(e) => { setSelectedGoal(""); setContent(e.target.value); }}
              style={inputStyle}
            />
          </>
        ) : (
          <textarea
            placeholder={activeType === "affirmation" ? "I am..." : "Enter text..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
          />
        )}

        {/* Style controls */}
        {activeType !== "image" && (
          <>
            <ColorPicker label="Text Color" value={color} onChange={setColor} />
            {activeType !== "shape" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.7px", minWidth: 60 }}>Font size</span>
                  <button onClick={() => setFontSize((s) => Math.max(10, s - 2))} style={{ ...BTN_GHOST, padding: "2px 9px", fontSize: 14 }}>−</button>
                  <span style={{ color: "#f1f5f9", fontSize: 13, minWidth: 24, textAlign: "center" }}>{fontSize}</span>
                  <button onClick={() => setFontSize((s) => Math.min(48, s + 2))} style={{ ...BTN_GHOST, padding: "2px 9px", fontSize: 14 }}>+</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setBold((b) => !b)}
                    style={{ ...BTN, background: bold ? INDIGO : "rgba(45, 212, 191,0.1)", fontWeight: 700, padding: "5px 14px" }}
                  >
                    B
                  </button>
                  <button
                    onClick={() => setItalic((i) => !i)}
                    style={{ ...BTN, background: italic ? INDIGO : "rgba(45, 212, 191,0.1)", fontStyle: "italic", padding: "5px 14px" }}
                  >
                    I
                  </button>
                </div>
              </>
            )}
            <ColorPicker label="Background" value={bgColor} onChange={setBgColor} />
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onClose} style={{ ...BTN_GHOST, flex: 1, fontSize: 13 }}>Cancel</button>
        <button onClick={handleAdd} style={{ ...BTN_PRIMARY, flex: 2, fontSize: 13 }}>Add to Board</button>
      </div>
    </motion.div>
  );
}

const inputStyle = {
  background: "rgba(15,23,42,0.8)",
  border: "1px solid rgba(45, 212, 191,0.25)",
  borderRadius: 8,
  color: "#f1f5f9",
  fontSize: 13,
  padding: "9px 12px",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};

// ─── Board Canvas Item ────────────────────────────────────────────────────────

function BoardItem({ item, selected, onSelect, onUpdate, onDelete, canvasRef }) {
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.content);
  const dragStart = useRef(null);
  const resizeStart = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, [editing]);

  function getCanvasSize() {
    if (!canvasRef.current) return { w: 800, h: 600 };
    const r = canvasRef.current.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  function handlePointerDown(e) {
    if (e.target.closest("[data-resize]") || e.target.closest("[data-delete]") || e.target.closest("[data-edit-input]")) return;
    e.stopPropagation();
    onSelect(item.id);
    if (editing) return;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const { w, h } = getCanvasSize();
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, startX: item.x, startY: item.y, w, h };
  }

  function handlePointerMove(e) {
    if (dragging && dragStart.current) {
      const { mouseX, mouseY, startX, startY, w, h } = dragStart.current;
      const dx = ((e.clientX - mouseX) / w) * 100;
      const dy = ((e.clientY - mouseY) / h) * 100;
      onUpdate(item.id, { x: clamp(startX + dx, 0, 85), y: clamp(startY + dy, 0, 85) });
    }
    if (resizing && resizeStart.current) {
      const { mouseX, startW, w } = resizeStart.current;
      const dw = ((e.clientX - mouseX) / w) * 100;
      onUpdate(item.id, { width: clamp(startW + dw, 15, 60) });
    }
  }

  function handlePointerUp() {
    setDragging(false);
    setResizing(false);
    dragStart.current = null;
    resizeStart.current = null;
  }

  function handleResizeDown(e) {
    e.stopPropagation();
    e.preventDefault();
    setResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const { w } = getCanvasSize();
    resizeStart.current = { mouseX: e.clientX, startW: item.width, w };
  }

  function handleDoubleClick(e) {
    if (item.type === "image" || item.type === "shape") return;
    e.stopPropagation();
    setEditing(true);
    setEditText(item.content);
  }

  function commitEdit() {
    onUpdate(item.id, { content: editText });
    setEditing(false);
  }

  function handleTouchStart(e) {
    if (e.target.closest("[data-resize]") || e.target.closest("[data-delete]")) return;
    if (!e.touches[0]) return;
    const t = e.touches[0];
    onSelect(item.id);
    setDragging(true);
    const { w, h } = getCanvasSize();
    dragStart.current = { mouseX: t.clientX, mouseY: t.clientY, startX: item.x, startY: item.y, w, h };
  }

  function handleTouchMove(e) {
    if (!dragging || !dragStart.current || !e.touches[0]) return;
    e.preventDefault();
    const t = e.touches[0];
    const { mouseX, mouseY, startX, startY, w, h } = dragStart.current;
    const dx = ((t.clientX - mouseX) / w) * 100;
    const dy = ((t.clientY - mouseY) / h) * 100;
    onUpdate(item.id, { x: clamp(startX + dx, 0, 85), y: clamp(startY + dy, 0, 85) });
  }

  function handleTouchEnd() {
    setDragging(false);
    dragStart.current = null;
  }

  const selectionStyle = selected
    ? { outline: "2px solid #14b8a6", boxShadow: "0 0 0 4px rgba(45, 212, 191,0.2)" }
    : {};

  function renderContent() {
    if (item.type === "image") {
      return item.imageUrl || item.content ? (
        <img
          src={item.imageUrl || item.content}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10, display: "block" }}
          draggable={false}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.3)", fontSize: 28 }}>🖼️</div>
      );
    }

    if (item.type === "shape") {
      return (
        <div style={{ width: "100%", height: "100%", background: item.bgColor || item.color, borderRadius: item.content === "circle" ? "50%" : 12, minHeight: 40 }} />
      );
    }

    if (editing) {
      return (
        <>
          <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
          <textarea
            data-edit-input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setEditing(false); }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
            }}
            style={{
              width: "100%", height: "100%", minHeight: 60,
              background: "rgba(45, 212, 191,0.08)", border: "2px solid #14b8a6",
              borderRadius: 8, outline: "none", resize: "none",
              color: item.color || "#f1f5f9", fontSize: item.fontSize || 16,
              fontWeight: item.bold ? 700 : 400, fontStyle: item.italic ? "italic" : "normal",
              fontFamily: "inherit", lineHeight: 1.5, padding: "6px 8px",
              boxShadow: "0 0 0 3px rgba(45, 212, 191,0.25)", caretColor: "#14b8a6",
              boxSizing: "border-box",
            }}
          />
        </>
      );
    }

    const icon = item.type === "goal" ? "🎯 " : item.type === "affirmation" ? "💫 " : "";
    return (
      <div
        style={{
          color: item.color || "#f1f5f9", fontSize: item.fontSize || 16,
          fontWeight: item.bold ? 700 : 400, fontStyle: item.italic ? "italic" : "normal",
          lineHeight: 1.55, wordBreak: "break-word", userSelect: "none", whiteSpace: "pre-wrap",
        }}
      >
        {icon}{item.content || <span style={{ opacity: 0.3 }}>(empty)</span>}
      </div>
    );
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      style={{
        position: "absolute",
        left: item.x + "%",
        top: item.y + "%",
        width: item.width + "%",
        minHeight: item.type === "shape" ? item.width * 0.5 + "%" : "auto",
        background: item.type === "image" || item.type === "shape" ? "transparent" : (item.bgColor || "rgba(192,132,252,0.13)"),
        borderRadius: 12,
        padding: item.type === "image" || item.type === "shape" ? 0 : "10px 14px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
        boxSizing: "border-box",
        backdropFilter: item.type !== "image" && item.type !== "shape" ? "blur(8px)" : "none",
        ...selectionStyle,
        zIndex: selected ? 10 : 1,
      }}
    >
      {renderContent()}

      {selected && (
        <button
          data-delete
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          style={{
            position: "absolute", top: -10, right: -10, width: 22, height: 22,
            borderRadius: "50%", background: "#ef4444", border: "2px solid rgba(8,9,13,0.9)",
            color: "#fff", fontSize: 11, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", zIndex: 20, padding: 0, lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}

      {selected && item.type !== "image" && (
        <div
          data-resize
          onPointerDown={handleResizeDown}
          style={{
            position: "absolute", bottom: -6, right: -6, width: 16, height: 16,
            borderRadius: 4, background: INDIGO, border: "2px solid rgba(8,9,13,0.9)",
            cursor: "se-resize", zIndex: 20,
          }}
        />
      )}
    </div>
  );
}

// ─── Board Editor (freeform canvas) ──────────────────────────────────────────

function BoardEditor({ board, onBack, onSave, yearlyGoals }) {
  const [items, setItems] = useState(board.items || []);
  const [title, setTitle] = useState(board.title);
  const [emoji, setEmoji] = useState(board.emoji);
  const [color, setColor] = useState(board.color);
  const [selectedId, setSelectedId] = useState(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [activeView, setActiveView] = useState("canvas"); // "canvas" | "gallery"
  const canvasRef = useRef(null);

  useEffect(() => {
    onSave({ ...board, title, emoji, color, items });
  }, [items, title, emoji, color]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        if (fullscreen) { setFullscreen(false); return; }
        setSelectedId(null);
        setShowAddPanel(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  function handleCanvasClick(e) {
    if (e.target === canvasRef.current) {
      setSelectedId(null);
      setShowAddPanel(false);
    }
  }

  function updateItem(id, patch) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function deleteItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId(null);
  }

  function addItem(item) {
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
  }

  function handleUpdateBoard(updated) {
    onSave(updated);
  }

  const selectedItem = items.find((i) => i.id === selectedId);

  const toolbar = (
    <div style={{ ...TOOLBAR_STYLE, position: "relative" }}>
      {!fullscreen && (
        <button onClick={onBack} style={{ ...BTN_GHOST, fontSize: 18, padding: "4px 10px", lineHeight: 1 }}>
          ←
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
        <button
          onClick={() => { const e = prompt("Board emoji:", emoji); if (e) setEmoji(e.trim()[0] || emoji); }}
          style={{ ...BTN_GHOST, fontSize: 20, padding: "2px 8px" }}
        >
          {emoji}
        </button>
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingTitle(false); }}
            style={{ ...inputStyle, fontSize: 15, fontWeight: 700, flex: 1, maxWidth: 240 }}
          />
        ) : (
          <span
            onClick={() => setEditingTitle(true)}
            style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, cursor: "text", userSelect: "none" }}
            title="Click to edit title"
          >
            {title}
          </span>
        )}
      </div>

      {/* View toggle: Canvas | Gallery */}
      <div style={{ display: "flex", gap: 4 }}>
        {["canvas", "gallery"].map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            style={{
              ...BTN,
              background: activeView === v ? INDIGO : "rgba(45, 212, 191,0.1)",
              border: "1px solid " + (activeView === v ? INDIGO : "rgba(45, 212, 191,0.2)"),
              fontSize: 12,
              padding: "5px 12px",
              textTransform: "capitalize",
            }}
          >
            {v === "canvas" ? "Canvas" : "Gallery"}
          </button>
        ))}
      </div>

      {/* Item style controls for canvas view */}
      {activeView === "canvas" && selectedItem && selectedItem.type !== "image" && selectedItem.type !== "shape" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => updateItem(selectedId, { fontSize: Math.max(10, (selectedItem.fontSize || 16) - 2) })}
            style={{ ...BTN_GHOST, padding: "4px 10px" }}
          >
            A−
          </button>
          <button
            onClick={() => updateItem(selectedId, { fontSize: Math.min(48, (selectedItem.fontSize || 16) + 2) })}
            style={{ ...BTN_GHOST, padding: "4px 10px" }}
          >
            A+
          </button>
          <button
            onClick={() => updateItem(selectedId, { bold: !selectedItem.bold })}
            style={{ ...BTN, background: selectedItem.bold ? INDIGO : "rgba(45, 212, 191,0.1)", fontWeight: 700, padding: "4px 10px" }}
          >
            B
          </button>
          <button
            onClick={() => updateItem(selectedId, { italic: !selectedItem.italic })}
            style={{ ...BTN, background: selectedItem.italic ? INDIGO : "rgba(45, 212, 191,0.1)", fontStyle: "italic", padding: "4px 10px" }}
          >
            I
          </button>
          <div style={{ display: "flex", gap: 3 }}>
            {PRESET_COLORS.slice(0, 6).map((c) => (
              <button
                key={c}
                onClick={() => updateItem(selectedId, { color: c })}
                style={{
                  width: 18, height: 18, borderRadius: "50%", background: c, padding: 0, cursor: "pointer",
                  border: selectedItem.color === c ? "2px solid #fff" : "2px solid transparent",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Item button (canvas only) */}
      {activeView === "canvas" && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowAddPanel((v) => !v)}
            style={{ ...BTN_PRIMARY, fontSize: 13 }}
          >
            + Add Item
          </button>
          <AnimatePresence>
            {showAddPanel && (
              <AddItemPanel
                onAdd={addItem}
                onClose={() => setShowAddPanel(false)}
                yearlyGoals={yearlyGoals}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Fullscreen toggle (canvas only) */}
      {activeView === "canvas" && (
        <button
          onClick={() => setFullscreen((v) => !v)}
          style={{ ...BTN_GHOST, fontSize: 16, padding: "5px 10px" }}
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {fullscreen ? "✕" : "⛶"}
        </button>
      )}
    </div>
  );

  // Gallery view
  if (activeView === "gallery") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {toolbar}
        <div style={{ flex: 1, overflowY: "auto", background: "#08090d" }}>
          <MasonryGallery
            board={board}
            onUpdateBoard={handleUpdateBoard}
          />
        </div>
      </div>
    );
  }

  // Canvas view
  const canvas = (
    <div
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{
        position: "relative",
        width: "100%",
        flex: 1,
        minHeight: fullscreen ? "calc(100vh - 60px)" : 520,
        background: CANVAS_BG,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {items.map((item) => (
        <BoardItem
          key={item.id}
          item={item}
          selected={selectedId === item.id}
          onSelect={setSelectedId}
          onUpdate={updateItem}
          onDelete={deleteItem}
          canvasRef={canvasRef}
        />
      ))}

      {items.length === 0 && (
        <div
          style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 16, pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 56 }}>✨</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
            Tap + Add Item to start building your vision board
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", maxWidth: 320, textAlign: "center", lineHeight: 1.6 }}>
            Add quotes, affirmations, goals, images, and shapes to visualize your dreams.
          </div>
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: CANVAS_BG }}>
        {toolbar}
        {canvas}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {toolbar}
      {canvas}
    </div>
  );
}

// ─── Template Picker ──────────────────────────────────────────────────────────

function TemplatePicker({ onCreate, onCancel }) {
  const [titleVal, setTitleVal] = useState("My Vision Board");
  const [chosenTemplate, setChosenTemplate] = useState("blank");
  const [boardColor, setBoardColor] = useState("#14b8a6");

  function handleCreate() {
    const tpl = TEMPLATES.find((t) => t.id === chosenTemplate) || TEMPLATES[2];
    const items = tpl.items.map((it) => ({ ...it, id: uid() }));
    onCreate({
      id: uid(),
      title: titleVal || "My Vision Board",
      emoji: tpl.emoji,
      color: boardColor,
      items,
      galleryCards: [],
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      style={{ ...CARD_STYLE, maxWidth: 520, margin: "40px auto", padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>Create Vision Board</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>Choose a starting template</div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: 6 }}>
          Board Title
        </label>
        <input value={titleVal} onChange={(e) => setTitleVal(e.target.value)} placeholder="My Vision Board" style={inputStyle} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <ColorPicker label="Board Color" value={boardColor} onChange={setBoardColor} />
      </div>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 10 }}>Template</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setChosenTemplate(tpl.id)}
              style={{
                ...CARD_STYLE,
                padding: "16px 10px",
                textAlign: "center",
                cursor: "pointer",
                border: "2px solid " + (chosenTemplate === tpl.id ? INDIGO : "rgba(45, 212, 191,0.15)"),
                background: chosenTemplate === tpl.id ? "rgba(45, 212, 191,0.18)" : "rgba(17,24,39,0.5)",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>{tpl.emoji}</div>
              <div style={{ fontSize: 12, color: "#f1f5f9", fontWeight: 600 }}>{tpl.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{tpl.items.length} items</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ ...BTN_GHOST, flex: 1 }}>Cancel</button>
        <button onClick={handleCreate} style={{ ...BTN_PRIMARY, flex: 2 }}>Create Board</button>
      </div>
    </motion.div>
  );
}

// ─── Board List (Home View) ───────────────────────────────────────────────────

function BoardList({ boards, onSelect, onCreate }) {
  return (
    <div style={{ padding: "24px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Vision Boards</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Build the life you want to live</div>
        </div>
        <button onClick={onCreate} style={{ ...BTN_PRIMARY, fontSize: 13 }}>+ Create Board</button>
      </div>

      {boards.length === 0 ? (
        <div>
          {/* Concept explanation banner */}
          <div style={{
            background: "linear-gradient(135deg, rgba(45, 212, 191,0.14) 0%, rgba(192,132,252,0.10) 100%)",
            border: "1px solid rgba(45, 212, 191,0.25)",
            borderRadius: 14,
            padding: "20px 22px",
            marginBottom: 24,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>🎯</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>What is a Vision Board?</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>
                  A vision board is a visual collection of your goals, dreams, and aspirations. Add images, quotes, and milestones to keep yourself motivated and focused on what matters most.
                </div>
              </div>
            </div>
          </div>

          {/* Starter template quick-picks */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Start with a template</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { emoji: "🏠", label: "Dream Home", sub: "Living space goals" },
                { emoji: "💪", label: "Fitness Goal", sub: "Health milestones" },
                { emoji: "🌍", label: "Dream Travel", sub: "Places to explore" },
              ].map(({ emoji, label, sub }) => (
                <button
                  key={label}
                  onClick={onCreate}
                  style={{
                    ...CARD_STYLE,
                    padding: "16px 10px",
                    textAlign: "center",
                    cursor: "pointer",
                    border: "1px solid rgba(45, 212, 191,0.2)",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = INDIGO; e.currentTarget.style.background = "rgba(45, 212, 191,0.18)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(45, 212, 191,0.2)"; e.currentTarget.style.background = "rgba(17,24,39,0.7)"; }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9" }}>{label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Primary CTA */}
          <button
            onClick={onCreate}
            style={{
              ...BTN_PRIMARY,
              width: "100%",
              fontSize: 15,
              padding: "13px 24px",
              borderRadius: 10,
              marginBottom: 20,
            }}
          >
            Create Your First Vision Board
          </button>

          {/* Motivational quote */}
          <div style={{ textAlign: "center", padding: "0 16px" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontStyle: "italic", lineHeight: 1.6 }}>
              "The future belongs to those who believe in the beauty of their dreams."
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginTop: 5 }}>— Eleanor Roosevelt</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {boards.map((board) => {
            const galleryCards = board.galleryCards || [];
            const goalCount = galleryCards.filter((c) => c.cardType === "goal").length;
            const pinned = galleryCards.find((c) => c.cardType === "affirmation" && c.pinned);
            return (
              <motion.button
                key={board.id}
                onClick={() => onSelect(board.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  ...CARD_STYLE,
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  overflow: "hidden",
                  border: "1px solid rgba(45, 212, 191,0.18)",
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    height: 110,
                    background: "linear-gradient(135deg, " + board.color + "33 0%, rgba(8,9,13,0.9) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {/* Mini item previews */}
                  {board.items.slice(0, 4).map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        position: "absolute",
                        left: (8 + idx * 18) + "%",
                        top: (12 + (idx % 2) * 30) + "%",
                        background: item.bgColor || "rgba(45, 212, 191,0.2)",
                        borderRadius: 5,
                        padding: "3px 7px",
                        fontSize: 9,
                        color: item.color || "#f1f5f9",
                        fontStyle: item.italic ? "italic" : "normal",
                        fontWeight: item.bold ? 700 : 400,
                        maxWidth: "30%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.type === "image" ? "🖼️" : item.type === "shape" ? "■" : (item.content || "").slice(0, 18) || "..."}
                    </div>
                  ))}
                  {pinned && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 8,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: 9,
                        color: "#fde68a",
                        background: "rgba(0,0,0,0.5)",
                        borderRadius: 5,
                        padding: "2px 6px",
                        whiteSpace: "nowrap",
                        maxWidth: "90%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      "{(pinned.text || "").slice(0, 28)}..."
                    </div>
                  )}
                  <div style={{ fontSize: 36, zIndex: 1, opacity: board.items.length === 0 ? 0.5 : 0.15 }}>
                    {board.emoji}
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>{board.emoji}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{board.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    {board.items.length} canvas item{board.items.length !== 1 ? "s" : ""}
                    {goalCount > 0 && " · " + goalCount + " goal" + (goalCount !== 1 ? "s" : "")}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export default function VisionBoardTab({ data, onChange }) {
  const boards = data?.visionBoards || [];
  const yearlyGoals = data?.yearlyGoals || [];

  const [view, setView] = useState("list"); // "list" | "create" | "edit"
  const [editingBoardId, setEditingBoardId] = useState(null);

  function updateBoards(next) {
    onChange(prev => ({ ...prev, visionBoards: next }));
  }

  function handleSelectBoard(id) {
    setEditingBoardId(id);
    setView("edit");
  }

  function handleCreateBoard(newBoard) {
    updateBoards([...boards, newBoard]);
    setEditingBoardId(newBoard.id);
    setView("edit");
  }

  function handleSaveBoard(updated) {
    updateBoards(boards.map((b) => (b.id === updated.id ? updated : b)));
  }

  function handleBack() {
    setView("list");
    setEditingBoardId(null);
  }

  const editingBoard = boards.find((b) => b.id === editingBoardId);

  return (
    <div
      style={{
        minHeight: "100%",
        background: "#08090d",
        color: "#f1f5f9",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BoardList
              boards={boards}
              onSelect={handleSelectBoard}
              onCreate={() => setView("create")}
            />
          </motion.div>
        )}

        {view === "create" && (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TemplatePicker
              onCreate={handleCreateBoard}
              onCancel={() => setView("list")}
            />
          </motion.div>
        )}

        {view === "edit" && editingBoard && (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            <BoardEditor
              board={editingBoard}
              onBack={handleBack}
              onSave={handleSaveBoard}
              yearlyGoals={yearlyGoals}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Dashboard Widget ─────────────────────────────────────────────────────────

export function VisionBoardDashWidget({ data, onNavigate }) {
  const boards = data?.visionBoards || [];
  const first = boards[0];

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onNavigate}
      style={{
        ...CARD_STYLE,
        padding: 0,
        cursor: "pointer",
        overflow: "hidden",
        border: "1px solid rgba(192,132,252,0.2)",
      }}
    >
      {first ? (
        <>
          <div
            style={{
              height: 72,
              background: "linear-gradient(135deg, " + first.color + "40 0%, rgba(8,9,13,0.95) 100%)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {first.items.slice(0, 3).map((item, idx) => (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  left: (8 + idx * 22) + "%",
                  top: (10 + (idx % 2) * 35) + "%",
                  background: item.bgColor || "rgba(45, 212, 191,0.2)",
                  borderRadius: 4,
                  padding: "2px 7px",
                  fontSize: 8,
                  color: item.color || "#f1f5f9",
                  maxWidth: "28%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.type === "image" ? "🖼️" : (item.content || "").slice(0, 16) || "..."}
              </div>
            ))}
            <span style={{ fontSize: 30, opacity: 0.18, zIndex: 0 }}>{first.emoji}</span>
          </div>

          <div style={{ padding: "11px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 16 }}>{first.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{first.title}</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                {first.items.length} item{first.items.length !== 1 ? "s" : ""}
                {boards.length > 1 && " · " + boards.length + " boards"}
              </div>
            </div>
            <span style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>View Board</span>
          </div>
        </>
      ) : (
        <div style={{ padding: "18px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>Vision Board</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Visualize your dreams and goals</div>
          </div>
          <span
            style={{
              fontSize: 12,
              color: ACCENT,
              fontWeight: 700,
              background: "rgba(192,132,252,0.12)",
              border: "1px solid rgba(192,132,252,0.25)",
              borderRadius: 7,
              padding: "6px 12px",
              whiteSpace: "nowrap",
            }}
          >
            Create
          </span>
        </div>
      )}
    </motion.div>
  );
}
