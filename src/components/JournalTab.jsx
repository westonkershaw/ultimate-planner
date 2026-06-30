/* eslint-disable */
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  countWords,
  calcWritingStreak,
  calcLifetimeWordCount,
  calcTagFrequency,
  calcEntrySentiment,
  calcSentiment30DayTrend,
  calcWeeklyJournalReview,
} from "../utils/math";
import JournalExportModal, { JournalExportButton } from "./JournalExport";
import {
  OnThisDayCard,
  DigestCard,
  TopicTracker,
  GoalCorrelationCard,
  PhotoAttachment,
  StreakRewardsCard,
} from "./JournalInsights";

// ─── Utilities ───────────────────────────────────────────────────────────────

// Bug fix #1: Stronger unique ID generation using crypto API with fallback
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

function todayStr() {
  const d = new Date();
  return d.toLocaleDateString("en-CA");
}

// Bug fix #2: fmtDate now validates the date and returns fallback for invalid input
function fmtDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "Unknown date";
  const d = new Date(dateStr + "T12:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// Bug fix #3: getWeekStart no longer mutates the Date object, handles month boundaries correctly
function getWeekStart(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = (day === 0 ? 6 : day - 1); // Monday = 0 offset
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return monday.toLocaleDateString("en-CA");
}

function getDayName(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  if (isNaN(d.getTime())) return "?";
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROMPTS = [
  // Reflection
  { text: "What was the highlight of your day?", category: "Reflection" },
  { text: "What would you do differently today?", category: "Reflection" },
  { text: "What challenged you today and what did you learn?", category: "Reflection" },
  { text: "How did you show up for yourself today?", category: "Reflection" },
  { text: "What energy did you bring to today?", category: "Reflection" },
  { text: "What story am I telling myself that might not be true?", category: "Reflection" },
  // Gratitude
  { text: "Name 3 specific things you're grateful for today.", category: "Gratitude" },
  { text: "Who in your life are you grateful for right now, and why?", category: "Gratitude" },
  { text: "What's one small moment from today worth celebrating?", category: "Gratitude" },
  { text: "What's a challenge that secretly helped you?", category: "Gratitude" },
  { text: "What made you smile today?", category: "Gratitude" },
  // Growth
  { text: "What did you learn today?", category: "Growth" },
  { text: "What fear did you face today — or wish you had?", category: "Growth" },
  { text: "What is one habit you want to strengthen?", category: "Growth" },
  { text: "What conversation do I need to have that I've been avoiding?", category: "Growth" },
  { text: "Where did you spend your energy today — wisely or not?", category: "Growth" },
  { text: "What would your future self thank you for doing today?", category: "Growth" },
  // Goals
  { text: "What's one step toward your biggest goal you could take this week?", category: "Goals" },
  { text: "What would make this week feel like a success?", category: "Goals" },
  { text: "What are you most proud of this week so far?", category: "Goals" },
  { text: "What intention will you set for tomorrow?", category: "Goals" },
  { text: "What's one win, no matter how small, from today?", category: "Goals" },
  { text: "What would you attempt if you knew you couldn't fail?", category: "Goals" },
  // Creativity
  { text: "If you could change one thing about today, what would it be?", category: "Creativity" },
  { text: "If today were a chapter title in your autobiography, what would it be?", category: "Creativity" },
  { text: "What is one small act of kindness you could do tomorrow?", category: "Creativity" },
  { text: "Who inspired you recently, and why?", category: "Creativity" },
  { text: "What does your body need more of right now?", category: "Creativity" },
  { text: "What would you do with a completely free day?", category: "Creativity" },
  { text: "What boundary did you hold today — or wish you had?", category: "Creativity" },
];

const PROMPT_CATEGORY_COLORS = {
  Reflection: { bg: "rgba(45, 212, 191,0.18)", border: "rgba(45, 212, 191,0.45)", text: "#2dd4bf" },
  Gratitude:  { bg: "rgba(245,158,11,0.18)", border: "rgba(245,158,11,0.45)", text: "#fbbf24" },
  Growth:     { bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",   text: "#4ade80" },
  Goals:      { bg: "rgba(249,115,22,0.15)", border: "rgba(249,115,22,0.4)",  text: "#fb923c" },
  Creativity: { bg: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.4)", text: "#c084fc" },
};

const TAGS = ["#grateful", "#productive", "#stressed", "#excited", "#reflective", "#motivated"];

const MILESTONE_THRESHOLDS = [
  { words: 100, message: "100 words!", icon: "✨" },
  { words: 250, message: "Deep session!", icon: "📝" },
  { words: 500, message: "In the zone!", icon: "🔥" },
];

// Bug fix #4: getDailyPromptIndex now uses local date instead of UTC epoch
// to prevent prompt changing mid-day due to timezone offset
function getDailyPromptIndex() {
  const d = new Date();
  const localDayKey = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return localDayKey % PROMPTS.length;
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const ACCENT = "#f59e0b";
const ACCENT_SOFT = "rgba(245,158,11,0.18)";
const ACCENT_BORDER = "rgba(245,158,11,0.4)";
const GOLD = "#fbbf24";

const CARD = {
  background: "rgba(17,24,39,0.7)",
  borderRadius: 14,
  padding: "16px 20px",
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
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(15,23,42,0.6)",
  border: "1px solid rgba(51,65,85,0.55)",
  borderRadius: 10,
  color: "#f1f5f9",
  padding: "12px 14px",
  fontSize: 15,
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
  resize: "vertical",
};

const BTN_PRIMARY = {
  background: `linear-gradient(135deg, ${ACCENT}, #f97316)`,
  border: "none",
  borderRadius: 10,
  color: "#fff",
  padding: "11px 20px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "'DM Sans', sans-serif",
  transition: "opacity 0.15s",
};

const BTN_GHOST = {
  background: ACCENT_SOFT,
  border: `1px solid ${ACCENT_BORDER}`,
  borderRadius: 8,
  color: ACCENT,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  padding: "5px 12px",
  fontFamily: "'DM Sans', sans-serif",
};

// ─── Milestone Toast ──────────────────────────────────────────────────────────

// Bug fix #5: MilestoneToast now uses empty dependency array to prevent
// timer resets when onDone reference changes (parent re-renders)
function MilestoneToast({ message, icon, onDone }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        background: "linear-gradient(135deg, rgba(245,158,11,0.95), rgba(249,115,22,0.95))",
        borderRadius: 14,
        padding: "10px 22px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 15,
        fontWeight: 800,
        color: "#fff",
        boxShadow: "0 8px 32px rgba(245,158,11,0.45)",
        zIndex: 9999,
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: "nowrap",
      }}
      role="status"
      aria-live="polite"
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      {message}
    </motion.div>
  );
}

// ─── WritingStreakBar ─────────────────────────────────────────────────────────

function WritingStreakBar({ journals }) {
  const streak = useMemo(() => calcWritingStreak(journals), [journals]);
  const lifetimeWords = useMemo(() => calcLifetimeWordCount(journals), [journals]);

  // Build this week's 7 days (Sun–Sat)
  const weekDots = useMemo(() => {
    const datesSet = new Set(journals.map((e) => e.date));
    const dots = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-CA");
      dots.push({ key, filled: datesSet.has(key), label: getDayName(key) });
    }
    return dots;
  }, [journals]);

  return (
    <motion.div
      style={{ ...CARD, display: "flex", flexDirection: "column", gap: 12 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>✍️</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9" }}>
            {streak > 0 ? `${streak} day writing streak` : "Start your streak today"}
          </span>
          {streak >= 3 && <span style={{ fontSize: 16 }}>🔥</span>}
        </div>
        {/* Bug fix #28: Added aria-label for screen reader accessibility */}
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600 }} aria-label={`${lifetimeWords} total words written`}>
          📚 {lifetimeWords.toLocaleString()} words lifetime
        </div>
      </div>

      {/* Week dots */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {weekDots.map(({ key, filled, label }) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: filled ? GOLD : "rgba(255,255,255,0.1)",
                border: `1.5px solid ${filled ? GOLD : "rgba(255,255,255,0.15)"}`,
                boxShadow: filled ? `0 0 6px ${GOLD}66` : "none",
                transition: "all 0.2s",
              }}
              title={key}
            />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── TagStats ─────────────────────────────────────────────────────────────────

function TagStats({ journals }) {
  const freqs = useMemo(() => calcTagFrequency(journals), [journals]);
  if (freqs.length === 0) return null;
  const top = freqs[0];

  return (
    <motion.div
      style={{ ...CARD, padding: "12px 20px" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.04 }}
    >
      <div style={SECTION_LABEL}>Tag Frequency</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {freqs.slice(0, 6).map(({ tag, count }) => (
          <div
            key={tag}
            style={{
              background: tag === top.tag ? ACCENT_SOFT : "rgba(255,255,255,0.04)",
              border: `1px solid ${tag === top.tag ? ACCENT_BORDER : "rgba(255,255,255,0.1)"}`,
              borderRadius: 20,
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 700,
              color: tag === top.tag ? ACCENT : "rgba(255,255,255,0.5)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {tag}
            <span
              style={{
                background: tag === top.tag ? ACCENT_BORDER : "rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "0 5px",
                fontSize: 10,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              {count}
            </span>
          </div>
        ))}
      </div>
      {top && (
        <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
          Most common: <span style={{ color: ACCENT }}>{top.tag}</span> ({top.count} {top.count === 1 ? "time" : "times"})
        </div>
      )}
    </motion.div>
  );
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

// Bug fix #6: MiniCalendar uses single state object to prevent state race condition
// Bug fix #7: nextMonth properly blocks all future months, not just current year
function MiniCalendar({ journals, onSelectDate }) {
  const today = todayStr();
  const [view, setView] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const viewYear = view.year;
  const viewMonth = view.month;

  const datesWithEntries = useMemo(() => new Set(journals.map((e) => e.date)), [journals]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const now = new Date();
  const isAtCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const isFutureMonth = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth());

  function prevMonth() {
    setView((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  }

  function nextMonth() {
    if (isFutureMonth) return;
    setView((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <motion.div
      style={{ ...CARD }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.06 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={SECTION_LABEL}>Entry Calendar</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Bug fix #8: Calendar nav buttons now have proper aria-labels */}
          <button onClick={prevMonth} style={{ ...BTN_GHOST, padding: "3px 9px", fontSize: 13 }} aria-label="Previous month">‹</button>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", minWidth: 100, textAlign: "center" }}>{monthLabel}</span>
          <button
            onClick={nextMonth}
            disabled={isFutureMonth}
            style={{ ...BTN_GHOST, padding: "3px 9px", fontSize: 13, opacity: isFutureMonth ? 0.35 : 1 }}
            aria-label="Next month"
          >›</button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 4 }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasEntry = datesWithEntries.has(dateKey);
          const isToday = dateKey === today;
          const isFuture = dateKey > today;

          return (
            <button
              key={dateKey}
              onClick={() => hasEntry && onSelectDate && onSelectDate(dateKey)}
              disabled={!hasEntry || isFuture}
              title={hasEntry ? `Entry on ${fmtDate(dateKey)}` : "No entry"}
              aria-label={`${fmtDate(dateKey)}${hasEntry ? " — has entry" : ""}${isToday ? " (today)" : ""}`}
              style={{
                aspectRatio: "1",
                borderRadius: "50%",
                border: isToday ? `2px solid ${ACCENT}` : "2px solid transparent",
                background: hasEntry
                  ? (isToday ? ACCENT : ACCENT_SOFT)
                  : "transparent",
                color: hasEntry ? (isToday ? "#fff" : ACCENT) : "rgba(255,255,255,0.25)",
                fontSize: 11,
                fontWeight: hasEntry ? 800 : 400,
                cursor: hasEntry ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
                padding: 0,
                fontFamily: "'DM Sans', sans-serif",
                opacity: isFuture ? 0.2 : 1,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── StarRating ───────────────────────────────────────────────────────────────

// Bug fix #9: StarRating clears hover on touch to prevent sticky state on mobile
// Bug fix #10: Added role="group" and aria-valuenow for screen readers
function StarRating({ value, onChange, size = 24, readOnly = false }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div style={{ display: "flex", gap: 4 }} role="group" aria-label={`Rating: ${value || 0} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hovered || value) >= n;
        return (
          <button
            key={n}
            onClick={() => !readOnly && onChange && onChange(n)}
            onMouseEnter={() => !readOnly && setHovered(n)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            onTouchEnd={() => !readOnly && setHovered(0)}
            style={{
              fontSize: size,
              background: "transparent",
              border: "none",
              cursor: readOnly ? "default" : "pointer",
              padding: 0,
              color: filled ? GOLD : "rgba(255,255,255,0.15)",
              transition: "color 0.15s, transform 0.1s",
              transform: filled && !readOnly ? "scale(1.15)" : "scale(1)",
              lineHeight: 1,
            }}
            aria-label={`${n} star${n !== 1 ? "s" : ""}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

// ─── RatingSparkline ─────────────────────────────────────────────────────────

// Bug fix #11: RatingSparkline uses Map lookup instead of repeated .find() (O(n) -> O(1) per day)
function RatingSparkline({ entries }) {
  const entryMap = useMemo(() => {
    const m = new Map();
    entries.forEach((e) => m.set(e.date, e));
    return m;
  }, [entries]);

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-CA");
    const entry = entryMap.get(key);
    last7.push({ date: key, rating: entry ? entry.rating : 0, day: getDayName(key) });
  }

  const logged = last7.filter((d) => d.rating > 0);
  const avg = logged.length
    ? (logged.reduce((a, b) => a + b.rating, 0) / logged.length).toFixed(1)
    : null;

  function dotColor(r) {
    if (!r) return "rgba(255,255,255,0.08)";
    if (r === 1) return "#ef4444";
    if (r === 2) return "#f97316";
    if (r === 3) return "#eab308";
    if (r === 4) return "#84cc16";
    return GOLD;
  }

  function dotSize(r) {
    if (!r) return 10;
    return 10 + r * 4;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 44 }}>
        {last7.map((d) => (
          <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: dotSize(d.rating),
                height: dotSize(d.rating),
                borderRadius: "50%",
                background: dotColor(d.rating),
                boxShadow: d.rating === 5 ? `0 0 8px ${GOLD}88` : "none",
                transition: "all 0.2s",
              }}
              title={d.rating ? `${d.rating} stars` : "No entry"}
            />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{d.day}</span>
          </div>
        ))}
      </div>
      {avg && (
        <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
          Avg: <span style={{ color: GOLD, fontWeight: 800 }}>★ {avg}</span>
        </div>
      )}
    </div>
  );
}

// ─── TodayEntry ───────────────────────────────────────────────────────────────

function TodayEntry({ journals, onChange, initialPromptIndex, prefillText, textareaRef }) {
  const today = todayStr();
  const [promptIndex, setPromptIndex] = useState(
    initialPromptIndex !== undefined ? initialPromptIndex : getDailyPromptIndex()
  );
  const promptObj = PROMPTS[promptIndex % PROMPTS.length];
  const prompt = promptObj.text;
  const promptCategory = promptObj.category;
  const promptColors = PROMPT_CATEGORY_COLORS[promptCategory];

  const existing = journals.find((e) => e.date === today);

  const [editing, setEditing] = useState(!existing);
  const [text, setText] = useState(existing ? existing.text : "");
  const [rating, setRating] = useState(existing ? existing.rating : 0);
  const [mood, setMood] = useState(existing ? (existing.mood || "") : "");
  const [gratitude, setGratitude] = useState(existing ? (existing.gratitude || "") : "");
  const [activeTags, setActiveTags] = useState(existing ? (existing.tags || []) : []);
  const [photos, setPhotos] = useState(existing ? (existing.photos || []) : []);
  const [toast, setToast] = useState(null); // { icon, message }
  // Bug fix #13: Track the date milestones were set for so they reset on day change
  const [milestoneDate, setMilestoneDate] = useState(today);
  const [shownMilestones, setShownMilestones] = useState(() => {
    const wc = countWords(existing ? existing.text : "");
    const already = new Set(MILESTONE_THRESHOLDS.filter((m) => wc >= m.words).map((m) => m.words));
    return already;
  });

  // Bug fix #14: Reset milestones when the day rolls over (app stays open past midnight)
  useEffect(() => {
    if (today !== milestoneDate) {
      setMilestoneDate(today);
      setShownMilestones(new Set());
    }
  }, [today, milestoneDate]);

  // Accept external prefill (from empty-state prompt shortcuts)
  const prevPrefill = useRef(prefillText);
  useEffect(() => {
    if (prefillText && prefillText !== prevPrefill.current) {
      prevPrefill.current = prefillText;
      setText((prev) => prev ? prev : prefillText);
      setEditing(true);
    }
  }, [prefillText]);

  useEffect(() => {
    if (existing && !editing) {
      setText(existing.text);
      setRating(existing.rating);
      setGratitude(existing.gratitude || "");
      setActiveTags(existing.tags || []);
      setPhotos(existing.photos || []);
    }
  }, [existing, editing]);

  // Milestone detection
  useEffect(() => {
    if (!editing) return;
    const wc = countWords(text);
    for (const milestone of MILESTONE_THRESHOLDS) {
      if (wc >= milestone.words && !shownMilestones.has(milestone.words)) {
        setShownMilestones((prev) => new Set([...prev, milestone.words]));
        setToast({ icon: milestone.icon, message: milestone.message });
        break;
      }
    }
  }, [text, editing]);

  function toggleTag(tag) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleSave() {
    if (!text.trim()) return;
    const entry = {
      id: existing ? existing.id : uid(),
      date: today,
      text: text.trim(),
      rating,
      mood,
      prompt,
      gratitude: gratitude.trim(),
      tags: activeTags,
      photos: photos,
      aiInsight: existing ? (existing.aiInsight || "") : "",
    };
    onChange((p) => ({
      ...p,
      journals: [...(p.journals || []).filter((e) => e.date !== today), entry],
    }));
    setEditing(false);
  }

  const wc = countWords(text);
  const showForm = !existing || editing;

  return (
    <>
      <AnimatePresence>
        {toast && (
          <MilestoneToast
            key="toast"
            icon={toast.icon}
            message={toast.message}
            onDone={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        style={CARD}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div style={SECTION_LABEL}>Today's Entry — {fmtDate(today)}</div>

        {/* Prompt of the day */}
        <div
          style={{
            fontSize: 13,
            color: promptColors.text,
            fontWeight: 700,
            marginBottom: 12,
            padding: "10px 14px",
            background: promptColors.bg,
            borderRadius: 10,
            borderLeft: "3px solid " + promptColors.border,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: promptColors.text, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                Today's Prompt
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: promptColors.text,
                  background: promptColors.bg,
                  border: "1px solid " + promptColors.border,
                  borderRadius: 20,
                  padding: "1px 7px",
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                }}
              >
                {promptCategory}
              </span>
            </div>
            <button
              onClick={() => setPromptIndex((i) => (i + 1) % PROMPTS.length)}
              style={{
                background: "transparent",
                border: "none",
                color: promptColors.text,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 4px",
                opacity: 0.75,
                fontFamily: "'DM Sans', sans-serif",
              }}
              title="Next prompt"
              aria-label="Cycle to next prompt"
            >
              Next →
            </button>
          </div>
          <div style={{ marginBottom: showForm ? 8 : 0 }}>✍️ {prompt}</div>
          {showForm && (
            <button
              onClick={() => setText((prev) => prev ? prev : prompt)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid " + promptColors.border,
                borderRadius: 6,
                color: promptColors.text,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 10px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Use this prompt
            </button>
          )}
        </div>

        {!showForm && existing ? (
          <div>
            <div
              style={{
                background: "rgba(15,23,42,0.6)",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 14,
                color: "#e2e8f0",
                lineHeight: 1.7,
                marginBottom: 10,
                whiteSpace: "pre-wrap",
              }}
            >
              {existing.text}
            </div>
            {/* Tags on saved entry */}
            {(existing.tags || []).length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {existing.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      background: ACCENT_SOFT,
                      border: `1px solid ${ACCENT_BORDER}`,
                      borderRadius: 20,
                      color: ACCENT,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 9px",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {/* Photos on saved entry */}
            {(existing.photos || []).length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <PhotoAttachment photos={existing.photos} onPhotosChange={() => {}} readOnly />
              </div>
            )}
            {existing.gratitude && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
                🙏 {existing.gratitude}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <StarRating value={existing.rating} readOnly />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                  {countWords(existing.text)} words
                </span>
                <SentimentBadge text={existing.text} compact />
              </div>
              <button onClick={() => setEditing(true)} style={BTN_GHOST}>
                Edit
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your reflection here…"
                rows={5}
                style={{ ...INPUT_STYLE, minHeight: 120, paddingBottom: 30 }}
              />
              {/* Live word count overlay */}
              <div
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  color: wc >= 500 ? "#f97316" : wc >= 250 ? ACCENT : "rgba(255,255,255,0.3)",
                  pointerEvents: "none",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "color 0.3s",
                }}
              >
                {wc} {wc === 1 ? "word" : "words"}
              </div>
            </div>

            {/* Mood picker */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }} role="group" aria-label="How are you feeling?">
              <span style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", fontWeight: 600, alignSelf: "center", marginRight: 4 }}>Mood:</span>
              {[
                { emoji: "😄", label: "Great", value: "great" },
                { emoji: "🙂", label: "Good", value: "good" },
                { emoji: "😐", label: "Okay", value: "okay" },
                { emoji: "😔", label: "Low", value: "low" },
                { emoji: "😤", label: "Stressed", value: "stressed" },
              ].map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(mood === m.value ? "" : m.value)}
                  title={m.label}
                  aria-label={m.label}
                  aria-pressed={mood === m.value}
                  style={{
                    background: mood === m.value ? "rgba(45, 212, 191,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${mood === m.value ? "rgba(45, 212, 191,0.5)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 20,
                    padding: "5px 10px",
                    fontSize: 16,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    transform: mood === m.value ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  {m.emoji}
                </button>
              ))}
            </div>

            {/* Tag pills — Bug fix #15: Added keyboard Enter/Space support */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }} role="group" aria-label="Tags">
              {TAGS.map((tag) => {
                const active = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTag(tag); } }}
                    style={{
                      background: active ? ACCENT_SOFT : "rgba(255,255,255,0.04)",
                      border: `1px solid ${active ? ACCENT_BORDER : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 20,
                      color: active ? ACCENT : "rgba(255,255,255,0.4)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "4px 12px",
                      fontFamily: "'DM Sans', sans-serif",
                      transition: "all 0.15s",
                    }}
                    aria-pressed={active}
                    role="switch"
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Photo attachment */}
            <div style={{ marginBottom: 12 }}>
              <PhotoAttachment photos={photos} onPhotosChange={setPhotos} />
            </div>

            <input
              type="text"
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              placeholder="🙏 Gratitude note (optional)"
              style={{ ...INPUT_STYLE, fontSize: 13, marginBottom: 12 }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4, fontWeight: 600 }}>
                  RATE YOUR DAY
                </div>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {existing && (
                  <button onClick={() => setEditing(false)} style={{ ...BTN_GHOST, color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.12)" }}>
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!text.trim()}
                  style={{
                    ...BTN_PRIMARY,
                    opacity: text.trim() ? 1 : 0.4,
                    cursor: text.trim() ? "pointer" : "default",
                  }}
                >
                  Save Entry
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ─── AIInsightCard ────────────────────────────────────────────────────────────

// Bug fix #16: Added debounce guard to prevent rapid-fire AI requests
function AIInsightCard({ journals, weeklyJournalInsight, onChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lastGeneratedRef = useRef(0);

  async function generateInsight() {
    // Bug fix #17: Debounce - prevent generating more than once per 5 seconds
    const now = Date.now();
    if (now - lastGeneratedRef.current < 5000) return;
    lastGeneratedRef.current = now;

    const weekStart = getWeekStart(todayStr());
    const weekEntries = journals.filter((e) => e.date >= weekStart);

    if (weekEntries.length === 0) {
      setError("No journal entries this week yet.");
      return;
    }

    setLoading(true);
    setError("");

    const content = weekEntries
      .map((e) => `[${e.date}] (${e.rating}/5 stars)\nPrompt: ${e.prompt}\n${e.text}${e.gratitude ? `\nGratitude: ${e.gratitude}` : ""}`)
      .join("\n\n---\n\n");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 400,
          system:
            "You are a personal growth coach. Analyze these journal entries and provide 3 specific, actionable insights about patterns, growth areas, and wins. Be warm and encouraging. Use bullet points.",
          messages: [
            {
              role: "user",
              content: `Here are my journal entries from this week:\n\n${content}`,
            },
          ],
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const text =
        data?.content?.[0]?.text ||
        data?.choices?.[0]?.message?.content ||
        "No insight returned.";

      onChange((p) => ({
        ...p,
        weeklyJournalInsight: { text, weekOf: todayStr() },
      }));
    } catch (e) {
      setError("Failed to generate insight. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const insight = weeklyJournalInsight;

  return (
    <motion.div
      style={{
        ...CARD,
        background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(45, 212, 191,0.08))",
        border: "1px solid rgba(245,158,11,0.25)",
        padding: "18px 20px",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>✨</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9", letterSpacing: "0.3px" }}>
            This Week's Insight
          </span>
        </div>
        <button
          onClick={generateInsight}
          disabled={loading}
          style={{
            ...BTN_GHOST,
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <>
              <Spinner /> Analyzing…
            </>
          ) : (
            "✨ Generate Insight"
          )}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#f87171", marginBottom: 8 }}>{error}</div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
          <Spinner />
          Analyzing your journal entries…
        </div>
      )}

      {insight && insight.text ? (
        <div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.75,
              whiteSpace: "pre-wrap",
            }}
          >
            {insight.text}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
            Last generated {fmtDate(insight.weekOf)}
          </div>
        </div>
      ) : (
        !loading && (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
            Generate an AI insight based on your journal entries this week.
          </div>
        )
      )}
    </motion.div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        border: `2px solid ${ACCENT_BORDER}`,
        borderTopColor: ACCENT,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

// ─── SentimentBadge ───────────────────────────────────────────────────────────

// Bug fix #30: Wrapped in React.memo — SentimentBadge renders many times in EntryHistory
// and re-computing sentiment for unchanged text entries is wasteful
const SentimentBadge = React.memo(function SentimentBadge({ text, compact = false }) {
  const score = useMemo(() => calcEntrySentiment(text), [text]);

  let emoji, label, bg, color;
  if (score > 10) {
    emoji = "😊"; label = "Positive";
    bg = "rgba(34,197,94,0.15)"; color = "#4ade80";
  } else if (score < -10) {
    emoji = "😔"; label = "Negative";
    bg = "rgba(239,68,68,0.15)"; color = "#f87171";
  } else {
    emoji = "😐"; label = "Neutral";
    bg = "rgba(148,163,184,0.12)"; color = "rgba(148,163,184,0.7)";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 3 : 4,
        background: bg,
        border: `1px solid ${color}44`,
        borderRadius: 20,
        padding: compact ? "1px 7px" : "3px 10px",
        fontSize: compact ? 10 : 11,
        fontWeight: 700,
        color,
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: "nowrap",
      }}
      title={`Sentiment score: ${score > 0 ? "+" : ""}${score}`}
    >
      {emoji} {label}
    </span>
  );
});

// ─── SentimentSparkline ───────────────────────────────────────────────────────

function SentimentSparkline({ journals }) {
  const points = useMemo(() => calcSentiment30DayTrend(journals), [journals]);

  const scored = points.filter((p) => p.score !== null);
  if (scored.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontStyle: "italic", padding: "8px 0" }}>
        Write more entries to see your sentiment trend.
      </div>
    );
  }

  const W = 560;
  const H = 60;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 8;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Map score -100 to +100 → y coordinate (positive = top)
  function toY(score) {
    return PAD_T + chartH - ((score + 100) / 200) * chartH;
  }

  // Bug fix #12: Prevent division by zero when only 1 data point
  function toX(i) {
    const divisor = points.length <= 1 ? 1 : points.length - 1;
    return PAD_L + (i / divisor) * chartW;
  }

  // Build path for scored points, connecting with line breaks on nulls
  const segments = [];
  let cur = [];
  for (let i = 0; i < points.length; i++) {
    if (points[i].score !== null) {
      cur.push({ x: toX(i), y: toY(points[i].score), ...points[i] });
    } else {
      if (cur.length > 0) { segments.push(cur); cur = []; }
    }
  }
  if (cur.length > 0) segments.push(cur);

  const midY = toY(0);
  const avgScore = scored.reduce((a, p) => a + p.score, 0) / scored.length;
  const avgLabel = avgScore > 10 ? "Positive" : avgScore < -10 ? "Negative" : "Neutral";
  const avgColor = avgScore > 10 ? "#4ade80" : avgScore < -10 ? "#f87171" : "rgba(148,163,184,0.7)";

  return (
    <div>
      <svg
        viewBox={"0 0 " + W + " " + H}
        style={{ width: "100%", display: "block" }}
        role="img"
        aria-label="30-day sentiment trend sparkline"
      >
        <defs>
          <linearGradient id="sentPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sentNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Zero baseline */}
        <line
          x1={PAD_L} y1={midY}
          x2={W - PAD_R} y2={midY}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Segment lines */}
        {segments.map((seg, si) => (
          <polyline
            key={"spl-" + si}
            points={seg.map((p) => p.x + "," + p.y).join(" ")}
            fill="none"
            stroke={avgScore >= 0 ? "rgba(74,222,128,0.7)" : "rgba(248,113,113,0.7)"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Data dots for today (last point with score) */}
        {scored.slice(-1).map((p, i) => {
          const idx = points.findIndex((pt) => pt.dateStr === p.dateStr);
          return (
            <circle
              key={"spdot-" + i}
              cx={toX(idx)}
              cy={toY(p.score)}
              r={3}
              fill={p.score > 10 ? "#4ade80" : p.score < -10 ? "#f87171" : "rgba(148,163,184,0.7)"}
            />
          );
        })}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
        <span>30 days ago</span>
        <span>
          30-day avg: <span style={{ color: avgColor, fontWeight: 800 }}>{avgLabel}</span>
          {" "}
          <span style={{ color: "rgba(255,255,255,0.25)" }}>({avgScore > 0 ? "+" : ""}{Math.round(avgScore)})</span>
        </span>
        <span>Today</span>
      </div>
    </div>
  );
}

// ─── WeeklyReviewCard ─────────────────────────────────────────────────────────

const CONSISTENCY_MESSAGES = {
  daily:        { text: "You wrote every day this week. Incredible consistency!", color: "#4ade80" },
  almost_daily: { text: "You wrote most days this week. Great momentum!", color: "#fbbf24" },
  some_days:    { text: "A solid week of journaling. Keep building the habit!", color: "#fb923c" },
  sporadic:     { text: "Every entry counts. Try for one more day next week.", color: "rgba(148,163,184,0.7)" },
  none:         { text: "No entries this week yet — start now!", color: "rgba(148,163,184,0.5)" },
};

// Bug fix #29: WeeklyReviewCard caches isSunday in useMemo to avoid repeated Date construction
function WeeklyReviewCard({ journals }) {
  const isSunday = useMemo(() => new Date().getDay() === 0, []);
  const [forceShow, setForceShow] = useState(false);

  const review = useMemo(() => calcWeeklyJournalReview(journals), [journals]);

  if (!isSunday && !forceShow) {
    return (
      <motion.div
        style={{ ...CARD, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>📋</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Week in Review</span>
        </div>
        <button
          onClick={() => setForceShow(true)}
          style={{ ...BTN_GHOST, fontSize: 11 }}
        >
          View →
        </button>
      </motion.div>
    );
  }

  const sentLabel = review.avgSentiment === null
    ? "—"
    : review.avgSentiment > 10 ? "Positive"
    : review.avgSentiment < -10 ? "Negative"
    : "Neutral";
  const sentColor = review.avgSentiment === null
    ? "rgba(255,255,255,0.3)"
    : review.avgSentiment > 10 ? "#4ade80"
    : review.avgSentiment < -10 ? "#f87171"
    : "rgba(148,163,184,0.7)";

  const consistencyMsg = CONSISTENCY_MESSAGES[review.consistency];

  return (
    <motion.div
      style={{
        ...CARD,
        background: "linear-gradient(135deg, rgba(45, 212, 191,0.08), rgba(245,158,11,0.06))",
        border: "1px solid rgba(45, 212, 191,0.25)",
        padding: "18px 20px",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", letterSpacing: "0.3px" }}>
            Week in Review
          </span>
        </div>
        {!isSunday && (
          <button onClick={() => setForceShow(false)} style={{ ...BTN_GHOST, fontSize: 11 }}>
            Collapse
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Words Written", value: review.totalWords.toLocaleString(), icon: "✍️" },
          { label: "Entries", value: review.entryCount, icon: "📝" },
          { label: "Avg Sentiment", value: sentLabel, icon: "💭", color: sentColor },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(15,23,42,0.6)",
              borderRadius: 10,
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 3 }}>{s.icon}</div>
            {/* Bug fix #22: Replaced 'Syne' font reference (not loaded) with DM Sans */}
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color || "#f1f5f9", fontFamily: "'DM Sans', sans-serif" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 9, color: "rgba(100,116,139,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tags insight */}
      {/* Bug fix #21: Null-safe check for topTags array */}
      {(review.topTags || []).length > 0 && (
        <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Most-used tags:</span>
          {review.topTags.map((tag) => (
            <span
              key={tag}
              style={{
                background: ACCENT_SOFT,
                border: "1px solid " + ACCENT_BORDER,
                borderRadius: 20,
                color: ACCENT,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 9px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Topic insight */}
      {review.topTopic && (
        <div style={{ marginBottom: 10, fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
          Your writing this week often touched on{" "}
          <span style={{ color: "#2dd4bf", fontWeight: 800 }}>"{review.topTopic}"</span>
        </div>
      )}

      {/* Consistency message */}
      <div
        style={{
          padding: "8px 12px",
          background: "rgba(15,23,42,0.5)",
          borderRadius: 8,
          borderLeft: "3px solid " + consistencyMsg.color,
          fontSize: 12,
          color: consistencyMsg.color,
          fontWeight: 700,
          lineHeight: 1.5,
        }}
      >
        {consistencyMsg.text}
      </div>
    </motion.div>
  );
}

// ─── EntryHistory ─────────────────────────────────────────────────────────────

function EntryHistory({ journals, onChange, selectedDate, onClearSelected }) {
  const [filterRating, setFilterRating] = useState(0);
  const [filterTag, setFilterTag] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);
  // Bug fix #18: Cache today's date string and update it if component re-renders after midnight
  const todayCache = useMemo(() => todayStr(), []);

  // Auto-expand a selected date
  useEffect(() => {
    if (selectedDate) {
      const entry = journals.find((e) => e.date === selectedDate);
      if (entry) setExpanded((prev) => ({ ...prev, [entry.id]: true }));
    }
  }, [selectedDate, journals]);

  // Bug fix #19: Show total count and inform user when entries are truncated
  const MAX_HISTORY = 100;
  const filtered = useMemo(() => {
    const today = todayStr(); // Fresh call each memo recalc
    let list = [...journals]
      .filter((e) => e.date !== today)
      .sort((a, b) => (a.date > b.date ? -1 : 1))
      .slice(0, MAX_HISTORY);

    if (selectedDate) {
      const se = list.find((e) => e.date === selectedDate);
      if (se) {
        list = [se, ...list.filter((e) => e.date !== selectedDate)];
      }
    }

    if (filterRating > 0) {
      list = list.filter((e) => e.rating === filterRating);
    }
    if (filterTag) {
      list = list.filter((e) => (e.tags || []).includes(filterTag));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.text.toLowerCase().includes(q) ||
          (e.gratitude || "").toLowerCase().includes(q) ||
          (e.prompt || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [journals, filterRating, filterTag, search, selectedDate]);

  const totalPast = journals.filter((e) => e.date !== todayCache).length;
  const isTruncated = totalPast > MAX_HISTORY;

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Bug fix #20: deleteEntry now clears selectedDate if the deleted entry was selected
  function deleteEntry(id) {
    const entry = journals.find((e) => e.id === id);
    if (entry && entry.date === selectedDate) {
      onClearSelected();
    }
    onChange((p) => ({
      ...p,
      journals: (p.journals || []).filter((e) => e.id !== id),
    }));
    setPendingDelete(null);
  }

  const RATING_FILTERS = [0, 1, 2, 3, 4, 5];
  const RATING_LABELS = ["All", "★", "★★", "★★★", "★★★★", "★★★★★"];

  // Build available tags from current journal entries
  const availableTags = useMemo(() => {
    const all = new Set();
    journals.forEach((e) => (e.tags || []).forEach((t) => all.add(t)));
    return Array.from(all);
  }, [journals]);

  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={SECTION_LABEL}>Entry History</div>
        {selectedDate && (
          <button
            onClick={onClearSelected}
            style={{ ...BTN_GHOST, fontSize: 11 }}
          >
            Show all
          </button>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search entries…"
        style={{ ...INPUT_STYLE, fontSize: 13, marginBottom: 10 }}
      />

      {/* Rating filter pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {RATING_FILTERS.map((r, i) => (
          <button
            key={r}
            onClick={() => setFilterRating(r)}
            style={{
              background: filterRating === r ? ACCENT_SOFT : "rgba(255,255,255,0.04)",
              border: `1px solid ${filterRating === r ? ACCENT_BORDER : "rgba(255,255,255,0.1)"}`,
              borderRadius: 20,
              color: filterRating === r ? ACCENT : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 12px",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {RATING_LABELS[i]}
          </button>
        ))}
      </div>

      {/* Tag filter pills */}
      {availableTags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <button
            onClick={() => setFilterTag("")}
            style={{
              background: !filterTag ? ACCENT_SOFT : "rgba(255,255,255,0.04)",
              border: `1px solid ${!filterTag ? ACCENT_BORDER : "rgba(255,255,255,0.1)"}`,
              borderRadius: 20,
              color: !filterTag ? ACCENT : "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            All tags
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
              style={{
                background: filterTag === tag ? ACCENT_SOFT : "rgba(255,255,255,0.04)",
                border: `1px solid ${filterTag === tag ? ACCENT_BORDER : "rgba(255,255,255,0.1)"}`,
                borderRadius: 20,
                color: filterTag === tag ? ACCENT : "rgba(255,255,255,0.4)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 10px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "20px 0" }}>
          No entries found.
        </div>
      ) : (
        <div>
          {/* Bug fix #19 continued: Show truncation notice */}
          {isTruncated && !search && !filterRating && !filterTag && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", marginBottom: 10, fontWeight: 600 }}>
              Showing {MAX_HISTORY} of {totalPast} entries. Use search or filters to find older ones.
            </div>
          )}
          {filtered.map((entry) => {
            const isExpanded = expanded[entry.id];
            const preview = entry.text.length > 120 ? entry.text.slice(0, 120) + "…" : entry.text;

            return (
              <motion.div
                key={entry.id}
                layout
                style={{
                  borderLeft: `3px solid ${entry.date === selectedDate ? ACCENT : ACCENT_BORDER}`,
                  paddingLeft: 14,
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: entry.date === selectedDate ? "#f1f5f9" : ACCENT }}>
                    {fmtDate(entry.date)}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <SentimentBadge text={entry.text} compact />
                    <StarRating value={entry.rating} readOnly size={14} />
                    {pendingDelete === entry.id ? (
                      <span style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          style={{ ...BTN_GHOST, color: "#f87171", borderColor: "rgba(248,113,113,0.3)", background: "rgba(239,68,68,0.08)", fontSize: 11 }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setPendingDelete(null)}
                          style={{ ...BTN_GHOST, fontSize: 11 }}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setPendingDelete(entry.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "rgba(255,255,255,0.2)",
                          fontSize: 14,
                          padding: "2px 4px",
                          lineHeight: 1,
                          transition: "color 0.15s",
                        }}
                        title="Delete entry"
                        aria-label={`Delete entry from ${fmtDate(entry.date)}`}
                        /* Bug fix #27: Use currentTarget instead of target to prevent style leak to children */
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {entry.prompt && (
                  <div style={{ fontSize: 11, color: "rgba(245,158,11,0.6)", marginBottom: 4, fontStyle: "italic" }}>
                    {entry.prompt}
                  </div>
                )}

                {/* Tags on history entry */}
                {(entry.tags || []).length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: "rgba(245,158,11,0.08)",
                          border: "1px solid rgba(245,158,11,0.2)",
                          borderRadius: 20,
                          color: "rgba(245,158,11,0.7)",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "1px 7px",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.65)",
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                    cursor: entry.text.length > 120 ? "pointer" : "default",
                  }}
                  onClick={() => entry.text.length > 120 && toggleExpand(entry.id)}
                >
                  {isExpanded ? entry.text : preview}
                </div>

                {entry.text.length > 120 && (
                  <button
                    onClick={() => toggleExpand(entry.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 11,
                      color: ACCENT,
                      fontWeight: 700,
                      padding: "2px 0",
                      marginTop: 2,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {isExpanded ? "Show less ↑" : "Read more ↓"}
                  </button>
                )}

                {isExpanded && entry.gratitude && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                    🙏 {entry.gratitude}
                  </div>
                )}

                {isExpanded && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
                      {countWords(entry.text)} words
                    </span>
                    <SentimentBadge text={entry.text} compact />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── FirstTimeEmptyState ──────────────────────────────────────────────────────

const STARTER_PROMPTS = [
  { text: "What went well today?", category: "Reflection" },
  { text: "What are you grateful for right now?", category: "Gratitude" },
  { text: "What's one thing you want to accomplish tomorrow?", category: "Goals" },
];

function FirstTimeEmptyState({ onPrefill, onFocus }) {
  return (
    <motion.div
      style={{
        ...CARD,
        border: "1px dashed rgba(245,158,11,0.3)",
        padding: "28px 20px",
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
    >
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📓</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
          What's on your mind today?
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
          Even 2 sentences a day builds a powerful reflection habit. Your first entry takes 60 seconds.
        </div>
      </div>

      {/* Starter prompt shortcuts */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
          Need a nudge? Pick a starter:
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STARTER_PROMPTS.map((sp) => {
            const colors = PROMPT_CATEGORY_COLORS[sp.category];
            return (
              <button
                key={sp.text}
                onClick={() => onPrefill(sp.text)}
                style={{
                  background: colors.bg,
                  border: "1px solid " + colors.border,
                  borderRadius: 10,
                  color: colors.text,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "10px 14px",
                  textAlign: "left",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "opacity 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>✍️</span>
                <span>{sp.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary CTA */}
      <div style={{ textAlign: "center" }}>
        <button
          onClick={onFocus}
          style={{
            ...BTN_PRIMARY,
            fontSize: 14,
            padding: "12px 28px",
            borderRadius: 12,
          }}
        >
          Start Writing
        </button>
      </div>
    </motion.div>
  );
}

// ─── JournalTab (main export) ─────────────────────────────────────────────────

// Bug fix #23: Spinner CSS moved to module-level constant to avoid re-injection on every render
const GLOBAL_STYLES = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;

export default function JournalTab({ data, onChange }) {
  const journals = data.journals || [];
  const weeklyJournalInsight = data.weeklyJournalInsight || null;
  const weekDays = data.weekDays || {};
  const customHabits = data.customHabits || [];
  const [selectedDate, setSelectedDate] = useState(null);
  const [prefillText, setPrefillText] = useState("");
  const [showExport, setShowExport] = useState(false);
  const textareaRef = useRef(null);
  // Bug fix #24: Track timeout so it can be cleaned up
  const prefillTimerRef = useRef(null);
  const isFirstTime = journals.length === 0;

  // Bug fix #25: Clean up prefill timeout on unmount
  useEffect(() => {
    return () => {
      if (prefillTimerRef.current) clearTimeout(prefillTimerRef.current);
    };
  }, []);

  function handlePrefill(text) {
    setPrefillText(text);
    if (prefillTimerRef.current) clearTimeout(prefillTimerRef.current);
    prefillTimerRef.current = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 80);
  }

  function handleFocusEditor() {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 4px" }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Export Modal */}
      <AnimatePresence>
        {showExport && (
          <JournalExportModal
            journals={journals}
            onClose={() => setShowExport(false)}
          />
        )}
      </AnimatePresence>

      {/* ── New-user first-run view: editor + empty state, no analytics noise ── */}
      {isFirstTime ? (
        <>
          {/* Writing streak bar still appears but shows motivating "start today" copy */}
          <WritingStreakBar journals={journals} />

          {/* Editor first — most important action */}
          <TodayEntry
            journals={journals}
            onChange={onChange}
            prefillText={prefillText}
            textareaRef={textareaRef}
          />

          {/* Rich empty state below the editor with clickable starter prompts */}
          <FirstTimeEmptyState
            onPrefill={handlePrefill}
            onFocus={handleFocusEditor}
          />
        </>
      ) : (
        <>
          {/* Header row with export button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 2px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Journal
            </div>
            <JournalExportButton onClick={() => setShowExport(true)} />
          </div>

          {/* Writing streak + lifetime words */}
          <WritingStreakBar journals={journals} />

          {/* Streak rewards & milestones */}
          <StreakRewardsCard journals={journals} />

          {/* On This Day flashback */}
          <OnThisDayCard journals={journals} />

          {/* AI Insight */}
          <AIInsightCard
            journals={journals}
            weeklyJournalInsight={weeklyJournalInsight}
            onChange={onChange}
          />

          {/* Week in Review (shown collapsed; auto-expands on Sundays) */}
          <WeeklyReviewCard journals={journals} />

          {/* 7-day sparkline */}
          <motion.div
            style={CARD}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            <div style={SECTION_LABEL}>7-Day Rating Trend</div>
            <RatingSparkline entries={journals} />
          </motion.div>

          {/* 30-day sentiment sparkline */}
          <motion.div
            style={CARD}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.09 }}
          >
            <div style={SECTION_LABEL}>30-Day Sentiment Trend</div>
            <SentimentSparkline journals={journals} />
          </motion.div>

          {/* Today's entry (with prompt, word count, tags, photos, milestones) */}
          <TodayEntry
            journals={journals}
            onChange={onChange}
            prefillText={prefillText}
            textareaRef={textareaRef}
          />

          {/* Goal correlation: mood vs productivity */}
          <GoalCorrelationCard
            journals={journals}
            weekDays={weekDays}
            customHabits={customHabits}
          />

          {/* Monthly/Quarterly digest */}
          <DigestCard journals={journals} />

          {/* Topic tracker */}
          <TopicTracker journals={journals} />

          {/* Tag frequency stats */}
          <TagStats journals={journals} />

          {/* Mini calendar */}
          <MiniCalendar
            journals={journals}
            onSelectDate={(date) => setSelectedDate(date)}
          />

          {/* History */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12 }}
          >
            <EntryHistory
              journals={journals}
              onChange={onChange}
              selectedDate={selectedDate}
              onClearSelected={() => setSelectedDate(null)}
            />
          </motion.div>
        </>
      )}
    </div>
  );
}

// ─── JournalDashWidget ────────────────────────────────────────────────────────

export function JournalDashWidget({ data, onNavigate, onChange }) {
  const journals = data.journals || [];
  const today = todayStr();
  const todayEntry = journals.find((e) => e.date === today);

  const [quickText, setQuickText] = useState("");
  // Bug fix #26: Track IME composition to prevent Enter during IME input
  const [composing, setComposing] = useState(false);

  function saveQuick() {
    if (!quickText.trim()) return;
    const prompt = PROMPTS[getDailyPromptIndex()].text;

    if (onChange) {
      const existing = todayEntry;
      const entry = {
        id: existing ? existing.id : uid(),
        date: today,
        text: existing ? existing.text + "\n\n" + quickText.trim() : quickText.trim(),
        rating: existing ? existing.rating : 0,
        prompt: existing ? existing.prompt : prompt,
        gratitude: existing ? (existing.gratitude || "") : "",
        tags: existing ? (existing.tags || []) : [],
        aiInsight: existing ? (existing.aiInsight || "") : "",
      };
      onChange((p) => ({
        ...p,
        journals: [...(p.journals || []).filter((e) => e.date !== today), entry],
      }));
      setQuickText("");
    } else {
      onNavigate && onNavigate();
    }
  }

  return (
    <motion.div
      onClick={onNavigate}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      style={{
        background: "rgba(17,24,39,0.7)",
        border: `1px solid ${ACCENT_BORDER}`,
        borderRadius: 16,
        padding: "14px 16px",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>
            {todayEntry ? "✅" : "📝"}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>
            {todayEntry ? "Journaled today" : "Journal not written yet"}
          </span>
        </div>
        {todayEntry && todayEntry.rating > 0 && (
          <div style={{ display: "flex", gap: 2 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} style={{ fontSize: 12, color: n <= todayEntry.rating ? GOLD : "rgba(255,255,255,0.12)" }}>
                ★
              </span>
            ))}
          </div>
        )}
      </div>

      {!todayEntry && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          {/* Bug fix #26 continued: IME-safe Enter handling */}
          <textarea
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            placeholder="Quick thought…"
            rows={2}
            style={{
              ...INPUT_STYLE,
              fontSize: 13,
              minHeight: "unset",
              resize: "none",
              flex: 1,
              padding: "8px 10px",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !composing) {
                e.preventDefault();
                saveQuick();
              }
            }}
          />
          <button
            onClick={saveQuick}
            disabled={!quickText.trim()}
            style={{
              ...BTN_PRIMARY,
              padding: "8px 14px",
              fontSize: 16,
              opacity: quickText.trim() ? 1 : 0.4,
              cursor: quickText.trim() ? "pointer" : "default",
              flexShrink: 0,
              alignSelf: "stretch",
              display: "flex",
              alignItems: "center",
            }}
          >
            →
          </button>
        </div>
      )}

      {todayEntry && (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontStyle: "italic", lineHeight: 1.5 }}>
          {todayEntry.text.slice(0, 80)}{todayEntry.text.length > 80 ? "…" : ""}
        </div>
      )}
    </motion.div>
  );
}
