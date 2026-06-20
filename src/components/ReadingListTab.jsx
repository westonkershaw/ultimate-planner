/* eslint-disable */
import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  calcMonthlyReadingHistory,
  calcGenreBreakdown,
  calcDaysToFinish,
  calcReadingChallengePace,
  calcPagesThisWeek,
  calcMinutesThisWeek,
  calcReadingMilestoneBadges,
} from "../utils/math";

// ─── Utilities ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function currentYear() {
  return new Date().getFullYear();
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#8b5cf6";

const GENRES = [
  { value: "fiction", label: "Fiction", color: "#6366f1", bg: "#6366f120" },
  { value: "non-fiction", label: "Non-Fiction", color: "#0ea5e9", bg: "#0ea5e920" },
  { value: "self-help", label: "Self-Help", color: "#10b981", bg: "#10b98120" },
  { value: "sci-fi", label: "Sci-Fi", color: "#8b5cf6", bg: "#8b5cf620" },
  { value: "biography", label: "Biography", color: "#f59e0b", bg: "#f59e0b20" },
  { value: "history", label: "History", color: "#ef4444", bg: "#ef444420" },
  { value: "other", label: "Other", color: "#64748b", bg: "#64748b20" },
];

const BOOK_EMOJIS = ["📚", "📖", "📕", "📗", "📘", "📙", "🔖", "📝", "🎓", "💡", "🧠", "✨"];

const STATUS_TABS = [
  { value: "reading", label: "📖 Reading" },
  { value: "done", label: "✅ Done" },
  { value: "want", label: "🔖 Want to Read" },
];

const BLANK_BOOK = {
  id: "",
  title: "",
  author: "",
  cover: "",
  emoji: "📚",
  status: "want",
  progress: 0,
  totalPages: 0,
  currentPage: 0,
  rating: 0,
  notes: "",
  aiSummary: "",
  genre: "other",
  startDate: "",
  finishDate: "",
  addedAt: "",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GenrePill({ genre }) {
  const g = GENRES.find((x) => x.value === genre) || GENRES[GENRES.length - 1];
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        color: g.color,
        background: g.bg,
        letterSpacing: 0.3,
      }}
    >
      {g.label}
    </span>
  );
}

function ProgressBar({ value, height = 6, color = ACCENT, style = {} }) {
  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: height,
        background: "#ffffff18",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          width: Math.min(100, Math.max(0, value)) + "%",
          height: "100%",
          borderRadius: height,
          background: color,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

function StarRating({ value, onChange, size = 18 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => onChange && onChange(star === value ? 0 : star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          style={{
            fontSize: size,
            cursor: onChange ? "pointer" : "default",
            color: star <= (hovered || value) ? "#f59e0b" : "#ffffff30",
            transition: "color 0.15s",
            userSelect: "none",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ─── Reading Stats Hero ───────────────────────────────────────────────────────

function ReadingStatsHero({ books, goal, onSetGoal }) {
  const year = currentYear();
  const yearStr = String(year);

  const booksReadThisYear = books.filter(
    (b) => b.status === "done" && b.finishDate && b.finishDate.startsWith(yearStr)
  ).length;

  const currentlyReading = books.filter((b) => b.status === "reading").length;

  const totalPages = books.reduce((sum, b) => sum + (b.currentPage || 0), 0);

  // Reading streak: consecutive days back from today where at least one book was started/active
  const streak = useMemo(() => {
    const readingBooks = books.filter((b) => b.status === "reading" && b.startDate);
    if (!readingBooks.length) return 0;
    const sorted = readingBooks
      .map((b) => new Date(b.startDate + "T12:00:00"))
      .sort((a, b) => b - a);
    if (!sorted.length) return 0;
    const msPerDay = 86400000;
    const today = new Date(todayStr() + "T12:00:00");
    const start = sorted[0];
    const diff = Math.floor((today - start) / msPerDay);
    return Math.max(0, diff + 1);
  }, [books]);

  const avgPerMonth = useMemo(() => {
    const doneWithDate = books.filter((b) => b.status === "done" && b.finishDate);
    if (doneWithDate.length === 0) return 0;
    const months = new Set(doneWithDate.map((b) => b.finishDate.slice(0, 7)));
    return (doneWithDate.length / Math.max(1, months.size)).toFixed(1);
  }, [books]);

  const targetBooks = goal?.target || 0;
  const goalProgress = targetBooks > 0 ? Math.min(100, (booksReadThisYear / targetBooks) * 100) : 0;

  const pace = useMemo(
    () => calcReadingChallengePace(booksReadThisYear, targetBooks),
    [booksReadThisYear, targetBooks]
  );

  const paceColor = pace === "ahead" ? "#10b981" : pace === "behind" ? "#ef4444" : "#f59e0b";
  const paceLabel = pace === "ahead" ? "Ahead of pace" : pace === "behind" ? "Behind pace" : "On track";

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(targetBooks || ""));

  const handleSetGoal = () => {
    const n = parseInt(goalInput, 10);
    if (!isNaN(n) && n > 0) onSetGoal(n);
    setEditingGoal(false);
  };

  return (
    <div style={{
      background: "linear-gradient(135deg,rgba(17,24,39,0.95) 0%,rgba(15,23,42,0.98) 100%)",
      border: "1px solid rgba(139,92,246,0.25)",
      borderRadius: 20,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 20,
    }}>
      {/* Stats row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        gap: 12,
      }}>
        {[
          { icon: "📚", value: booksReadThisYear, label: "Books This Year" },
          { icon: "📄", value: totalPages.toLocaleString(), label: "Pages Read" },
          { icon: "🔥", value: streak, label: "Day Streak" },
          { icon: "📅", value: avgPerMonth, label: "Avg / Month" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#ffffff08",
              border: "1px solid #ffffff10",
              borderRadius: 12,
              padding: "14px 12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginTop: 4, lineHeight: 1.1 }}
            >
              {s.value}
            </motion.div>
            <div style={{ fontSize: 10, color: "#ffffff55", marginTop: 3, fontWeight: 600, letterSpacing: 0.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reading Challenge */}
      <div style={{
        background: "#ffffff08",
        border: "1px solid #ffffff10",
        borderRadius: 14,
        padding: "16px 18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>
              {year} Reading Challenge
            </div>
            <div style={{ fontSize: 12, color: "#ffffff60", marginTop: 2 }}>
              {booksReadThisYear} / {targetBooks || "—"} books
              {targetBooks > 0 && (
                <span style={{ marginLeft: 8, color: paceColor, fontWeight: 600 }}>
                  · {paceLabel}
                </span>
              )}
            </div>
          </div>
          {!editingGoal && (
            <button
              onClick={() => { setGoalInput(String(targetBooks || "")); setEditingGoal(true); }}
              style={{ ...btnGhost, fontSize: 12, padding: "5px 12px" }}
            >
              {targetBooks ? "Edit Goal" : "Set Goal"}
            </button>
          )}
        </div>

        <AnimatePresence>
          {editingGoal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden", marginBottom: 10 }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  min={1}
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSetGoal()}
                  autoFocus
                  style={inputStyle}
                  placeholder="Books per year"
                />
                <button onClick={handleSetGoal} style={btnPrimary}>Set</button>
                <button onClick={() => setEditingGoal(false)} style={btnGhost}>Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {targetBooks > 0 && (
          <div style={{ position: "relative" }}>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: goalProgress + "%" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ height: "100%", borderRadius: 4, background: paceColor }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reading Progress Ring ────────────────────────────────────────────────────

function ReadingProgressRing({ book }) {
  const SIZE = 80;
  const STROKE = 9;
  const r = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, book.progress || 0));
  const dashOffset = circumference - (pct / 100) * circumference;

  const daysLeft = useMemo(() => calcDaysToFinish(book), [book]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} viewBox={"0 0 " + SIZE + " " + SIZE} role="img" aria-label={book.title + " progress: " + pct + "%"}>
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={r}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE}
          />
          <motion.circle
            cx={SIZE / 2} cy={SIZE / 2} r={r}
            fill="none"
            stroke={ACCENT}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference + " " + circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: "#fff", fontSize: 14, lineHeight: 1.3 }}>
          {book.title}
        </div>
        <div style={{ fontSize: 12, color: "#ffffff70", marginTop: 2 }}>{book.author}</div>
        <div style={{ fontSize: 12, color: "#ffffff50", marginTop: 4 }}>
          {book.currentPage} / {book.totalPages} pages
          {daysLeft !== null && (
            <span style={{ color: ACCENT, fontWeight: 600, marginLeft: 6 }}>
              · ~{daysLeft} day{daysLeft !== 1 ? "s" : ""} to finish
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentlyReadingPanel({ books }) {
  const reading = books.filter((b) => b.status === "reading");
  if (reading.length === 0) return null;

  return (
    <div style={{
      background: "rgba(17,24,39,0.7)",
      border: "1px solid rgba(51,65,85,0.5)",
      borderRadius: 16,
      padding: "18px 20px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
        📖 Currently Reading
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {reading.map((book) => (
          <ReadingProgressRing key={book.id} book={book} />
        ))}
      </div>
    </div>
  );
}

// ─── Genre Breakdown ──────────────────────────────────────────────────────────

function GenreBreakdownPanel({ books }) {
  const breakdown = useMemo(() => calcGenreBreakdown(books), [books]);

  if (breakdown.length === 0) return null;

  const topGenre = breakdown[0];
  const topGenreData = GENRES.find((g) => g.value === topGenre.genre) || GENRES[GENRES.length - 1];

  return (
    <div style={{
      background: "rgba(17,24,39,0.7)",
      border: "1px solid rgba(51,65,85,0.5)",
      borderRadius: 16,
      padding: "18px 20px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        🎭 Genre Breakdown
      </div>
      <div style={{ fontSize: 12, color: "rgba(148,163,184,0.6)", marginBottom: 14 }}>
        Mostly {topGenreData.label} ({topGenre.count} book{topGenre.count !== 1 ? "s" : ""})
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {breakdown.map((g) => {
          const gDef = GENRES.find((x) => x.value === g.genre) || GENRES[GENRES.length - 1];
          return (
            <div key={g.genre} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", width: 80, flexShrink: 0 }}>{gDef.label}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: g.pct + "%" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ height: "100%", borderRadius: 3, background: gDef.color }}
                />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: gDef.color, width: 28, textAlign: "right", flexShrink: 0 }}>
                {g.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tag pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {breakdown.map((g) => {
          const gDef = GENRES.find((x) => x.value === g.genre) || GENRES[GENRES.length - 1];
          return (
            <span
              key={g.genre}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 999,
                color: gDef.color,
                background: gDef.bg,
              }}
            >
              {gDef.label} · {g.count}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reading History Timeline ─────────────────────────────────────────────────

function ReadingTimeline({ books }) {
  const history = useMemo(() => calcMonthlyReadingHistory(books, 12), [books]);

  const nonEmpty = history.filter((m) => m.count > 0);
  if (nonEmpty.length === 0) return null;

  // Build lookup for book details
  const bookById = useMemo(() => {
    const map = {};
    books.forEach((b) => { map[b.id] = b; });
    return map;
  }, [books]);

  return (
    <div style={{
      background: "rgba(17,24,39,0.7)",
      border: "1px solid rgba(51,65,85,0.5)",
      borderRadius: 16,
      padding: "18px 20px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
        📅 Reading History
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[...nonEmpty].reverse().map((entry) => (
          <div key={entry.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{entry.label}</div>
              <div style={{ height: 1, flex: 1, background: "rgba(51,65,85,0.4)" }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>
                {entry.count} book{entry.count !== 1 ? "s" : ""}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
              {entry.bookIds.map((id) => {
                const book = bookById[id];
                if (!book) return null;
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{book.emoji || "📚"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{book.title}</div>
                      <div style={{ fontSize: 11, color: "#ffffff50" }}>{book.author}</div>
                    </div>
                    {book.finishDate && (
                      <div style={{ fontSize: 10, color: "rgba(148,163,184,0.45)", flexShrink: 0 }}>
                        {fmtDate(book.finishDate)}
                      </div>
                    )}
                    {book.rating > 0 && <StarRating value={book.rating} size={13} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Weekly Pages Panel ───────────────────────────────────────────────────────

function WeeklyPagesPanel({ sessions, weeklyGoal, onSetGoal }) {
  const pagesThisWeek = useMemo(() => calcPagesThisWeek(sessions), [sessions]);
  const minutesThisWeek = useMemo(() => calcMinutesThisWeek(sessions), [sessions]);
  const pct = weeklyGoal > 0 ? Math.min(100, (pagesThisWeek / weeklyGoal) * 100) : 0;
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(weeklyGoal || 100));

  const barColor =
    pct >= 100 ? "#10b981" :
    pct >= 60  ? "#6366f1" : "#f59e0b";

  const handleSetGoal = () => {
    const n = parseInt(goalInput, 10);
    if (!isNaN(n) && n > 0) onSetGoal(n);
    setEditingGoal(false);
  };

  return (
    <div style={{
      background: "rgba(17,24,39,0.7)",
      border: "1px solid rgba(51,65,85,0.5)",
      borderRadius: 16,
      padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 6 }}>
          📄 Pages This Week
        </div>
        {!editingGoal && (
          <button
            onClick={() => { setGoalInput(String(weeklyGoal || 100)); setEditingGoal(true); }}
            style={{ fontSize: 11, color: ACCENT, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
          >
            {weeklyGoal ? "Edit Goal" : "Set Goal"}
          </button>
        )}
      </div>

      <AnimatePresence>
        {editingGoal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 12 }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                min={1}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetGoal()}
                autoFocus
                style={inputStyle}
                placeholder="Pages per week"
              />
              <button onClick={handleSetGoal} style={btnPrimary}>Set</button>
              <button onClick={() => setEditingGoal(false)} style={btnGhost}>Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 32, fontWeight: 900, color: barColor, fontFamily: "'Syne',serif", lineHeight: 1 }}>
          {pagesThisWeek.toLocaleString()}
        </span>
        {weeklyGoal > 0 && (
          <span style={{ fontSize: 13, color: "rgba(148,163,184,0.55)", fontWeight: 600 }}>
            / {weeklyGoal.toLocaleString()} pages
          </span>
        )}
        {minutesThisWeek > 0 && (
          <span style={{ fontSize: 12, color: "rgba(148,163,184,0.4)", marginLeft: "auto" }}>
            {minutesThisWeek} min read
          </span>
        )}
      </div>

      {weeklyGoal > 0 && (
        <>
          <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 6 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: pct + "%" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{ height: "100%", borderRadius: 4, background: barColor }}
            />
          </div>
          <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", textAlign: "right" }}>
            {pct >= 100 ? "Goal reached! " : Math.round(pct) + "% of weekly goal"}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Books Milestone Badges ────────────────────────────────────────────────────

function BooksMilestonesPanel({ books }) {
  const totalDone = useMemo(() => books.filter((b) => b.status === "done").length, [books]);
  const badges = useMemo(() => calcReadingMilestoneBadges(totalDone), [totalDone]);

  return (
    <div style={{
      background: "rgba(17,24,39,0.7)",
      border: "1px solid rgba(51,65,85,0.5)",
      borderRadius: 16,
      padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 6 }}>
          🏅 Books Completed
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: "#fff", fontFamily: "'Syne',serif", lineHeight: 1 }}>{totalDone}</span>
          <span style={{ fontSize: 12, color: "rgba(148,163,184,0.5)" }}>total</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {badges.map((b) => {
          const _opacity = b.reached ? 1 : 0.3;
          const _border = b.reached ? "1px solid " + ACCENT + "50" : "1px solid rgba(51,65,85,0.4)";
          const _bg = b.reached ? "rgba(99,102,241,0.12)" : "rgba(15,23,42,0.4)";
          return (
            <div
              key={b.count}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 14px",
                borderRadius: 12,
                background: _bg,
                border: _border,
                opacity: _opacity,
                minWidth: 64,
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 22 }}>{b.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: b.reached ? ACCENT : "rgba(148,163,184,0.5)", letterSpacing: 0.3 }}>
                {b.count} books
              </span>
              <span style={{ fontSize: 10, color: b.reached ? "rgba(255,255,255,0.6)" : "rgba(148,163,184,0.35)", fontWeight: 600 }}>
                {b.label}
              </span>
            </div>
          );
        })}
      </div>

      {totalDone > 0 && (
        <div style={{ marginTop: 12 }}>
          {(() => {
            const nextBadge = badges.find((b) => !b.reached);
            if (!nextBadge) {
              return (
                <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600, textAlign: "center" }}>
                  All milestones reached — you are a Bibliophile!
                </div>
              );
            }
            const remaining = nextBadge.count - totalDone;
            return (
              <div style={{ fontSize: 12, color: "rgba(148,163,184,0.5)", textAlign: "center" }}>
                {remaining} more book{remaining !== 1 ? "s" : ""} to unlock {nextBadge.label} {nextBadge.emoji}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Reading Time Log Panel ────────────────────────────────────────────────────

const TIME_PRESETS = [
  { label: "+15 min", minutes: 15, pages: 15 },
  { label: "+30 min", minutes: 30, pages: 30 },
  { label: "+1 hr",  minutes: 60, pages: 60 },
];

function ReadingTimeLogPanel({ sessions, books, onChange }) {
  const [customMin, setCustomMin] = useState("");
  const [customPages, setCustomPages] = useState("");
  const [selectedBook, setSelectedBook] = useState("");
  const [justLogged, setJustLogged] = useState(false);

  const readingBooks = useMemo(() => books.filter((b) => b.status === "reading"), [books]);

  function logSession(minutes, pages) {
    const today = new Date();
    const dateStr =
      today.getFullYear() + "-" +
      String(today.getMonth() + 1).padStart(2, "0") + "-" +
      String(today.getDate()).padStart(2, "0");
    const session = {
      id: uid(),
      date: dateStr,
      minutes,
      pages,
      bookId: selectedBook || undefined,
    };
    onChange([...sessions, session]);
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 2000);
    setCustomMin("");
    setCustomPages("");
  }

  function logCustom() {
    const min = parseInt(customMin, 10);
    const pg = parseInt(customPages, 10) || Math.round((parseInt(customMin, 10) || 0));
    if (isNaN(min) || min <= 0) return;
    logSession(min, pg);
  }

  // Show last 3 sessions for context
  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 3);
  }, [sessions]);

  return (
    <div style={{
      background: "rgba(17,24,39,0.7)",
      border: "1px solid rgba(51,65,85,0.5)",
      borderRadius: 16,
      padding: "18px 20px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        ⏱ Log Reading Time
      </div>

      {/* Book selector */}
      {readingBooks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <select
            value={selectedBook}
            onChange={(e) => setSelectedBook(e.target.value)}
            style={{
              width: "100%",
              background: "#ffffff0d",
              border: "1px solid #ffffff20",
              borderRadius: 8,
              padding: "8px 12px",
              color: selectedBook ? "#fff" : "rgba(148,163,184,0.5)",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          >
            <option value="">— Select book (optional) —</option>
            {readingBooks.map((b) => (
              <option key={b.id} value={b.id}>{b.emoji || "📚"} {b.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Quick preset buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {TIME_PRESETS.map((p) => (
          <motion.button
            key={p.label}
            onClick={() => logSession(p.minutes, p.pages)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              flex: "1 1 80px",
              padding: "10px 8px",
              borderRadius: 10,
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: ACCENT,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            {p.label}
          </motion.button>
        ))}
      </div>

      {/* Custom entry row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input
          type="number"
          min={1}
          placeholder="min"
          value={customMin}
          onChange={(e) => setCustomMin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && logCustom()}
          style={{ ...inputStyle, flex: "1 1 70px", minWidth: 60, fontSize: 13 }}
        />
        <input
          type="number"
          min={0}
          placeholder="pages (opt)"
          value={customPages}
          onChange={(e) => setCustomPages(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && logCustom()}
          style={{ ...inputStyle, flex: "1 1 100px", minWidth: 80, fontSize: 13 }}
        />
        <button
          onClick={logCustom}
          style={{ ...btnPrimary, padding: "8px 16px", fontSize: 13, flexShrink: 0 }}
        >
          Log
        </button>
      </div>

      {/* Success flash */}
      <AnimatePresence>
        {justLogged && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: 12, color: "#10b981", fontWeight: 600, marginBottom: 10 }}
          >
            Session logged!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(148,163,184,0.4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            Recent
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recentSessions.map((s) => {
              const bk = books.find((b) => b.id === s.bookId);
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    background: "rgba(15,23,42,0.4)",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{bk ? (bk.emoji || "📚") : "📖"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {bk ? bk.title : "General reading"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(148,163,184,0.45)" }}>
                      {s.date}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{s.minutes} min</div>
                    {s.pages > 0 && (
                      <div style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>{s.pages} pg</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Book Card ────────────────────────────────────────────────────────────────

function BookCard({ book, onOpen, onStatusChange }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3, boxShadow: "0 8px 32px #8b5cf630" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={() => onOpen(book)}
      style={{
        background: "#ffffff0a",
        border: "1px solid #ffffff14",
        borderRadius: 14,
        padding: 16,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: "#ffffff10",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {book.cover ? (
            <img
              src={book.cover}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            book.emoji || "📚"
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              color: "#fff",
              fontSize: 14,
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {book.title || "Untitled"}
          </div>
          <div style={{ fontSize: 12, color: "#ffffff80", marginTop: 2 }}>
            {book.author || "Unknown Author"}
          </div>
        </div>
      </div>

      <GenrePill genre={book.genre} />

      {book.status === "reading" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <ProgressBar value={book.progress} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#ffffff80" }}>
            <span>{book.currentPage} / {book.totalPages} pages</span>
            <span style={{ color: ACCENT, fontWeight: 600 }}>{book.progress}%</span>
          </div>
        </div>
      )}

      {book.status === "done" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <StarRating value={book.rating} size={16} />
          {book.finishDate && (
            <div style={{ fontSize: 11, color: "#ffffff60" }}>
              Finished {fmtDate(book.finishDate)}
            </div>
          )}
        </div>
      )}

      {book.status === "want" && (
        <button
          onClick={(e) => { e.stopPropagation(); onStatusChange(book.id, "reading"); }}
          style={{
            ...btnPrimary,
            fontSize: 12,
            padding: "6px 12px",
            width: "100%",
            marginTop: 2,
          }}
        >
          Add to Reading
        </button>
      )}
    </motion.div>
  );
}

// ─── Add / Edit Book Modal ────────────────────────────────────────────────────

function BookModal({ book, onSave, onClose }) {
  const isNew = !book?.id;
  const [form, setForm] = useState(
    book
      ? { ...book }
      : { ...BLANK_BOOK, id: uid(), addedAt: new Date().toISOString() }
  );

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    const cp = parseInt(form.currentPage, 10) || 0;
    const tp = parseInt(form.totalPages, 10) || 0;
    const progress = tp > 0 ? Math.round((cp / tp) * 100) : 0;
    onSave({ ...form, currentPage: cp, totalPages: tp, progress });
  };

  return (
    <Overlay onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={modalBox}
      >
        <div style={modalHeader}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>
            {isNew ? "Add Book" : "Edit Book"}
          </span>
          <button onClick={onClose} style={btnClose}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", maxHeight: "60vh" }}>
          <div>
            <Label>Emoji</Label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {BOOK_EMOJIS.map((e) => {
                const _border = form.emoji === e ? "1.5px solid " + ACCENT : "1.5px solid #ffffff18";
                return (
                  <button
                    key={e}
                    onClick={() => set("emoji", e)}
                    style={{
                      fontSize: 22,
                      background: form.emoji === e ? "#8b5cf630" : "transparent",
                      border: _border,
                      borderRadius: 8,
                      padding: "4px 8px",
                      cursor: "pointer",
                    }}
                  >
                    {e}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Title *</Label>
            <input
              style={inputStyle}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Book title"
            />
          </div>

          <div>
            <Label>Author</Label>
            <input
              style={inputStyle}
              value={form.author}
              onChange={(e) => set("author", e.target.value)}
              placeholder="Author name"
            />
          </div>

          <div>
            <Label>Genre</Label>
            <select
              style={inputStyle}
              value={form.genre}
              onChange={(e) => set("genre", e.target.value)}
            >
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Status</Label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {[
                { value: "want", label: "🔖 Want" },
                { value: "reading", label: "📖 Reading" },
                { value: "done", label: "✅ Done" },
              ].map((s) => {
                const _border = form.status === s.value ? "1.5px solid " + ACCENT : "1.5px solid #ffffff20";
                return (
                  <button
                    key={s.value}
                    onClick={() => set("status", s.value)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: _border,
                      background: form.status === s.value ? "#8b5cf620" : "transparent",
                      color: form.status === s.value ? ACCENT : "#ffffff80",
                      transition: "all 0.15s",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {(form.status === "reading" || form.status === "done") && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Label>Total Pages</Label>
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  value={form.totalPages || ""}
                  onChange={(e) => set("totalPages", e.target.value)}
                  placeholder="320"
                />
              </div>
              {form.status === "reading" && (
                <div>
                  <Label>Current Page</Label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={0}
                    value={form.currentPage || ""}
                    onChange={(e) => set("currentPage", e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          )}

          {form.status === "done" && (
            <div>
              <Label>Rating</Label>
              <div style={{ marginTop: 6 }}>
                <StarRating
                  value={form.rating}
                  onChange={(v) => set("rating", v)}
                  size={22}
                />
              </div>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Personal notes..."
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={!form.title.trim()}
            style={{ ...btnPrimary, opacity: form.title.trim() ? 1 : 0.5 }}
          >
            Save
          </button>
        </div>
      </motion.div>
    </Overlay>
  );
}

// ─── Book Detail Panel ────────────────────────────────────────────────────────

function BookDetailPanel({ book, onUpdate, onDelete, onClose }) {
  const [form, setForm] = useState({ ...book });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const set = (key, val) => {
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === "currentPage" || key === "totalPages") {
        const cp = key === "currentPage" ? parseInt(val, 10) || 0 : parseInt(f.currentPage, 10) || 0;
        const tp = key === "totalPages" ? parseInt(val, 10) || 0 : parseInt(f.totalPages, 10) || 0;
        next.progress = tp > 0 ? Math.round((cp / tp) * 100) : 0;
      }
      return next;
    });
  };

  const handleSave = () => {
    onUpdate({ ...form });
  };

  const handleMarkDone = () => {
    const updated = { ...form, status: "done", progress: 100, finishDate: todayStr() };
    onUpdate(updated);
    onClose();
  };

  const handleGenerateSummary = async () => {
    if (form.aiSummary) return;
    setAiLoading(true);
    setAiError("");
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: "Give me a 3-bullet summary of the key insights from '" + form.title + "' by " + form.author + ". Be concise and practical.",
            },
          ],
        }),
      });
      if (!resp.ok) throw new Error("API error");
      const respData = await resp.json();
      const summary =
        respData?.content?.[0]?.text ||
        respData?.choices?.[0]?.message?.content ||
        "";
      set("aiSummary", summary);
      onUpdate({ ...form, aiSummary: summary });
    } catch (err) {
      setAiError("Could not generate summary. Check your AI settings.");
    } finally {
      setAiLoading(false);
    }
  };

  const cpNum = parseInt(form.currentPage, 10) || 0;
  const tpNum = parseInt(form.totalPages, 10) || 0;

  return (
    <Overlay onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{ ...modalBox, maxWidth: 480, width: "95vw" }}
      >
        <div style={modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 32 }}>{form.emoji || "📚"}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#fff", lineHeight: 1.2 }}>
                {form.title}
              </div>
              <div style={{ fontSize: 12, color: "#ffffff80" }}>{form.author}</div>
            </div>
          </div>
          <button onClick={onClose} style={btnClose}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: "60vh" }}>
          <GenrePill genre={form.genre} />

          {(form.status === "reading" || form.status === "done") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Label>Progress</Label>
              {form.status === "reading" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    type="range"
                    min={0}
                    max={tpNum || 100}
                    value={cpNum}
                    onChange={(e) => set("currentPage", e.target.value)}
                    style={{ width: "100%", accentColor: ACCENT }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <Label>Current Page</Label>
                      <input
                        style={inputStyle}
                        type="number"
                        min={0}
                        max={tpNum || undefined}
                        value={form.currentPage || ""}
                        onChange={(e) => set("currentPage", e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Label>Total Pages</Label>
                      <input
                        style={inputStyle}
                        type="number"
                        min={0}
                        value={form.totalPages || ""}
                        onChange={(e) => set("totalPages", e.target.value)}
                      />
                    </div>
                  </div>
                  <ProgressBar value={form.progress} height={8} />
                  <div style={{ fontSize: 12, color: "#ffffff80", textAlign: "right" }}>
                    {cpNum} / {tpNum} pages
                    <span style={{ color: ACCENT, fontWeight: 600, marginLeft: 6 }}>{form.progress}%</span>
                  </div>
                </div>
              )}
              {form.status === "done" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <ProgressBar value={100} height={8} />
                  <div style={{ fontSize: 12, color: "#ffffff60" }}>
                    {form.finishDate ? "Finished " + fmtDate(form.finishDate) : "Complete"}
                    {tpNum > 0 && " · " + tpNum + " pages"}
                  </div>
                </div>
              )}
            </div>
          )}

          {form.status === "done" && (
            <div>
              <Label>Rating</Label>
              <div style={{ marginTop: 6 }}>
                <StarRating value={form.rating} onChange={(v) => set("rating", v)} size={24} />
              </div>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical", marginTop: 6 }}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Your thoughts..."
            />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Label>AI Summary</Label>
              <button
                onClick={handleGenerateSummary}
                disabled={aiLoading || !!form.aiSummary}
                style={{
                  ...btnPrimary,
                  fontSize: 12,
                  padding: "5px 12px",
                  opacity: (aiLoading || !!form.aiSummary) ? 0.5 : 1,
                  cursor: (aiLoading || !!form.aiSummary) ? "default" : "pointer",
                }}
              >
                {aiLoading ? "Generating..." : form.aiSummary ? "Summary Cached" : "Generate AI Summary"}
              </button>
            </div>
            {aiError && (
              <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>{aiError}</div>
            )}
            {aiLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ffffff60", fontSize: 13 }}>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  style={{ display: "inline-block" }}
                >
                  ⟳
                </motion.span>
                Summarizing...
              </div>
            )}
            {form.aiSummary && !aiLoading && (
              <div
                style={{
                  background: "#8b5cf615",
                  border: "1px solid #8b5cf630",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#ffffffcc",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {form.aiSummary}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={handleSave} style={btnPrimary}>Save Changes</button>
          {form.status !== "done" && (
            <button
              onClick={handleMarkDone}
              style={{ ...btnPrimary, background: "#10b981", borderColor: "#10b981" }}
            >
              Mark as Done
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { onDelete(form.id); onClose(); }}
            style={{ ...btnGhost, color: "#ef4444", borderColor: "#ef444440" }}
          >
            Delete
          </button>
        </div>
      </motion.div>
    </Overlay>
  );
}

// ─── Shared overlay wrapper ───────────────────────────────────────────────────

function Overlay({ children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000b0",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%",
  background: "#ffffff0d",
  border: "1px solid #ffffff20",
  borderRadius: 8,
  padding: "8px 12px",
  color: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary = {
  background: ACCENT,
  border: "1.5px solid " + ACCENT,
  borderRadius: 8,
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  padding: "8px 18px",
  cursor: "pointer",
  transition: "opacity 0.15s",
};

const btnGhost = {
  background: "transparent",
  border: "1.5px solid #ffffff25",
  borderRadius: 8,
  color: "#ffffffaa",
  fontWeight: 500,
  fontSize: 14,
  padding: "8px 18px",
  cursor: "pointer",
  transition: "border-color 0.15s",
};

const btnClose = {
  background: "transparent",
  border: "none",
  color: "#ffffff60",
  fontSize: 18,
  cursor: "pointer",
  lineHeight: 1,
  padding: 4,
};

const modalBox = {
  background: "#13141a",
  border: "1px solid #ffffff18",
  borderRadius: 18,
  padding: 24,
  width: "95vw",
  maxWidth: 520,
  display: "flex",
  flexDirection: "column",
  gap: 0,
  maxHeight: "90vh",
  overflowY: "auto",
};

const modalHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  marginBottom: 20,
  gap: 8,
};

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: "#ffffff60", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
      {children}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function ReadingListTab({ data, onChange }) {
  const books = data?.readingList || [];
  const goal = data?.readingGoal || { year: currentYear(), target: 12 };

  const [activeShelf, setActiveShelf] = useState("reading");
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailBook, setDetailBook] = useState(null);

  const shelfCounts = useMemo(() => {
    return STATUS_TABS.reduce((acc, t) => {
      acc[t.value] = books.filter((b) => b.status === t.value).length;
      return acc;
    }, {});
  }, [books]);

  const shelfBooks = useMemo(
    () => books.filter((b) => b.status === activeShelf),
    [books, activeShelf]
  );

  const updateBooks = (newBooks) => {
    onChange(prev => ({ ...prev, readingList: newBooks }));
  };

  const handleAddBook = (book) => {
    updateBooks([...books, book]);
    setShowAddModal(false);
  };

  const handleUpdateBook = (updated) => {
    updateBooks(books.map((b) => (b.id === updated.id ? updated : b)));
    setDetailBook(null);
  };

  const handleDeleteBook = (id) => {
    updateBooks(books.filter((b) => b.id !== id));
  };

  const handleStatusChange = (id, newStatus) => {
    updateBooks(
      books.map((b) => {
        if (b.id !== id) return b;
        const updated = { ...b, status: newStatus };
        if (newStatus === "reading" && !b.startDate) updated.startDate = todayStr();
        if (newStatus === "done") {
          updated.finishDate = todayStr();
          updated.progress = 100;
        }
        return updated;
      })
    );
  };

  const handleSetGoal = (target) => {
    onChange(prev => ({ ...prev, readingGoal: { year: currentYear(), target } }));
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        color: "#fff",
        fontFamily: "inherit",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Reading List</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#ffffff60" }}>
            Track books, log progress, and hit your reading goals.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={btnPrimary}>
          + Add Book
        </button>
      </div>

      {/* Stats Hero */}
      <ReadingStatsHero books={books} goal={goal} onSetGoal={handleSetGoal} />

      {/* Currently Reading rings */}
      <CurrentlyReadingPanel books={books} />

      {/* Genre Breakdown */}
      <GenreBreakdownPanel books={books} />

      {/* Reading History Timeline */}
      <ReadingTimeline books={books} />

      {/* Shelf Tabs */}
      <div>
        <div
          style={{
            display: "flex",
            gap: 4,
            borderBottom: "1px solid #ffffff14",
            marginBottom: 20,
          }}
        >
          {STATUS_TABS.map((t) => {
            const _borderBottom = activeShelf === t.value ? "2px solid " + ACCENT : "2px solid transparent";
            return (
              <button
                key={t.value}
                onClick={() => setActiveShelf(t.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: _borderBottom,
                  padding: "10px 16px",
                  color: activeShelf === t.value ? "#fff" : "#ffffff60",
                  fontWeight: activeShelf === t.value ? 700 : 400,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "color 0.15s",
                  marginBottom: -1,
                }}
              >
                {t.label}
                {shelfCounts[t.value] > 0 && (
                  <span
                    style={{
                      background: activeShelf === t.value ? ACCENT : "#ffffff20",
                      color: "#fff",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 7px",
                      minWidth: 20,
                      textAlign: "center",
                    }}
                  >
                    {shelfCounts[t.value]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Book Grid */}
        {shelfBooks.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "#ffffff40",
              fontSize: 14,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {activeShelf === "reading" ? "📖" : activeShelf === "done" ? "✅" : "🔖"}
            </div>
            {activeShelf === "reading" && "No books in progress. Start reading!"}
            {activeShelf === "done" && "No finished books yet. Keep reading!"}
            {activeShelf === "want" && "Your want-to-read list is empty. Add some books!"}
          </div>
        ) : (
          <motion.div
            layout
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            <AnimatePresence>
              {shelfBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onOpen={setDetailBook}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <BookModal
            key="add-modal"
            book={null}
            onSave={handleAddBook}
            onClose={() => setShowAddModal(false)}
          />
        )}
        {detailBook && (
          <BookDetailPanel
            key={"detail-" + detailBook.id}
            book={detailBook}
            onUpdate={handleUpdateBook}
            onDelete={handleDeleteBook}
            onClose={() => setDetailBook(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Dashboard Widget ─────────────────────────────────────────────────────────

export function ReadingListDashWidget({ data, onNavigate }) {
  const books = data?.readingList || [];
  const goal = data?.readingGoal || { year: currentYear(), target: 0 };

  const year = currentYear();
  const yearStr = String(year);

  const booksReadThisYear = books.filter(
    (b) => b.status === "done" && b.finishDate && b.finishDate.startsWith(yearStr)
  ).length;

  const currentlyReading = books.find((b) => b.status === "reading") || null;

  const goalProgress =
    goal.target > 0 ? Math.min(100, (booksReadThisYear / goal.target) * 100) : 0;

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 6px 24px #8b5cf625" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onNavigate}
      style={{
        background: "rgba(17,24,39,0.75)",
        border: "1px solid rgba(139,92,246,0.2)",
        borderRadius: 16,
        padding: "16px 18px",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(148,163,184,0.5)", marginBottom: 8 }}>
        Reading List
      </div>

      {books.length === 0 ? (
        <>
          <div style={{ fontSize: 13, color: "rgba(148,163,184,0.6)", lineHeight: 1.5, marginBottom: 8 }}>
            Track your reading journey — add a book to get started.
          </div>
          <div style={{ fontSize: 11, color: "rgba(139,92,246,0.7)", fontWeight: 600 }}>
            Add your first book →
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1.1, marginBottom: 4 }}>
            {booksReadThisYear} <span style={{ fontSize: 13, fontWeight: 400, color: "#ffffff60" }}>books this year</span>
          </div>

          {currentlyReading && (
            <div style={{ fontSize: 12, color: "#ffffff70", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span>{currentlyReading.emoji || "\u{1F4D6}"}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {currentlyReading.title}
              </span>
              <span style={{ color: ACCENT, fontWeight: 700, flexShrink: 0 }}>{currentlyReading.progress}%</span>
            </div>
          )}

          {goal.target > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(148,163,184,0.45)", marginBottom: 4 }}>
                <span>{year} goal</span>
                <span>{booksReadThisYear} / {goal.target}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(139,92,246,0.15)", overflow: "hidden" }}>
                <div style={{ width: goalProgress + "%", height: "100%", background: ACCENT, transition: "width 0.4s" }} />
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: "rgba(139,92,246,0.7)", fontWeight: 600, marginTop: 8 }}>
            View library →
          </div>
        </>
      )}
    </motion.div>
  );
}
