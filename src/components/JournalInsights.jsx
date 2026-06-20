/* eslint-disable */
import React, { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  countWords,
  calcEntrySentiment,
  calcMonthlyDigest,
  calcQuarterlyDigest,
  calcOnThisDay,
  calcTopicTrends,
  calcGoalCorrelation,
  calcJournalStreakMilestones,
} from "../utils/math";

// ─── Shared tokens ───────────────────────────────────────────────────────────

const ACCENT = "#f59e0b";
const ACCENT_SOFT = "rgba(245,158,11,0.18)";
const ACCENT_BORDER = "rgba(245,158,11,0.4)";
const GOLD = "#fbbf24";
const FONT = "'DM Sans', sans-serif";

const CARD = {
  background: "rgba(17,24,39,0.7)",
  borderRadius: 14,
  padding: "16px 20px",
  marginBottom: 14,
};

const SECTION_LABEL = {
  fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10,
};

const BTN_GHOST = {
  background: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}`,
  borderRadius: 8, color: ACCENT, cursor: "pointer",
  fontSize: 12, fontWeight: 700, padding: "5px 12px", fontFamily: FONT,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function sentimentColor(score) {
  if (score > 10) return "#4ade80";
  if (score < -10) return "#f87171";
  return "rgba(148,163,184,0.7)";
}

function sentimentLabel(score) {
  if (score > 10) return "Positive";
  if (score < -10) return "Negative";
  return "Neutral";
}

const TIER_COLORS = {
  bronze: { bg: "rgba(180,100,40,0.15)", border: "rgba(180,100,40,0.4)", text: "#cd7f32" },
  silver: { bg: "rgba(180,180,180,0.12)", border: "rgba(180,180,180,0.35)", text: "#c0c0c0" },
  gold: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#fbbf24" },
  platinum: { bg: "rgba(100,180,240,0.12)", border: "rgba(100,180,240,0.4)", text: "#67e8f9" },
  emerald: { bg: "rgba(16,185,129,0.14)", border: "rgba(16,185,129,0.45)", text: "#10b981" },
};

const TOPIC_COLORS = ["#f59e0b", "#6366f1", "#4ade80", "#f87171", "#c084fc", "#38bdf8"];

// ─── On This Day Card ────────────────────────────────────────────────────────

export function OnThisDayCard({ journals }) {
  const flashbacks = useMemo(() => calcOnThisDay(journals), [journals]);
  const [expandedIdx, setExpandedIdx] = useState(null);

  if (flashbacks.length === 0) return null;

  return (
    <motion.div
      style={{
        ...CARD,
        background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(245,158,11,0.06))",
        border: "1px solid rgba(99,102,241,0.25)",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.04 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>📅</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>On This Day</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {flashbacks.map((fb, idx) => {
          const isExpanded = expandedIdx === idx;
          const sentiment = calcEntrySentiment(fb.entry.text);
          const preview = fb.entry.text.length > 100 ? fb.entry.text.slice(0, 100) + "..." : fb.entry.text;

          return (
            <motion.div
              key={fb.label}
              style={{
                background: "rgba(15,23,42,0.5)",
                borderRadius: 10,
                padding: "12px 14px",
                borderLeft: `3px solid ${sentimentColor(sentiment)}`,
                cursor: "pointer",
              }}
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              whileHover={{ scale: 1.01 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#818cf8" }}>{fb.label}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{fmtDate(fb.entry.date)}</span>
                </div>
                {fb.entry.rating > 0 && (
                  <span style={{ fontSize: 11, color: GOLD }}>
                    {"★".repeat(fb.entry.rating)}{"☆".repeat(5 - fb.entry.rating)}
                  </span>
                )}
              </div>

              <div style={{
                fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}>
                {isExpanded ? fb.entry.text : preview}
              </div>

              {isExpanded && fb.entry.gratitude && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                  🙏 {fb.entry.gratitude}
                </div>
              )}

              {isExpanded && (fb.entry.tags || []).length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                  {fb.entry.tags.map((tag) => (
                    <span key={tag} style={{
                      background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                      borderRadius: 20, color: "rgba(245,158,11,0.7)", fontSize: 10, fontWeight: 700, padding: "1px 7px",
                    }}>{tag}</span>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4, fontWeight: 600 }}>
                {countWords(fb.entry.text)} words · {sentimentLabel(sentiment)}
                {!isExpanded && fb.entry.text.length > 100 && " · tap to expand"}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Monthly/Quarterly Digest Card ───────────────────────────────────────────

export function DigestCard({ journals }) {
  const now = new Date();
  const [mode, setMode] = useState("monthly"); // "monthly" | "quarterly"
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, -1 = last month
  const [quarterOffset, setQuarterOffset] = useState(0);

  const digest = useMemo(() => {
    if (mode === "monthly") {
      const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      return calcMonthlyDigest(journals, d.getFullYear(), d.getMonth());
    } else {
      const currentQ = Math.floor(now.getMonth() / 3) + 1;
      let q = currentQ + quarterOffset;
      let y = now.getFullYear();
      while (q < 1) { q += 4; y--; }
      while (q > 4) { q -= 4; y++; }
      return calcQuarterlyDigest(journals, y, q);
    }
  }, [journals, mode, monthOffset, quarterOffset]);

  const sentTrendEmoji = digest.sentimentTrend === "improving" ? "📈"
    : digest.sentimentTrend === "declining" ? "📉"
    : digest.sentimentTrend === "stable" ? "➡️" : "—";

  const sentTrendColor = digest.sentimentTrend === "improving" ? "#4ade80"
    : digest.sentimentTrend === "declining" ? "#f87171" : "rgba(255,255,255,0.5)";

  return (
    <motion.div
      style={{
        ...CARD,
        background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(34,197,94,0.05))",
        border: "1px solid rgba(245,158,11,0.2)",
        padding: "18px 20px",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.06 }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📊</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>
            {digest.period || "Digest"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Mode toggle */}
          {["monthly", "quarterly"].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setMonthOffset(0); setQuarterOffset(0); }}
              style={{
                ...BTN_GHOST, fontSize: 10, padding: "3px 10px",
                background: mode === m ? ACCENT_SOFT : "transparent",
                borderColor: mode === m ? ACCENT_BORDER : "rgba(255,255,255,0.12)",
                color: mode === m ? ACCENT : "rgba(255,255,255,0.4)",
              }}
            >
              {m === "monthly" ? "Month" : "Quarter"}
            </button>
          ))}
          {/* Navigation */}
          <button
            onClick={() => mode === "monthly" ? setMonthOffset((o) => o - 1) : setQuarterOffset((o) => o - 1)}
            style={{ ...BTN_GHOST, padding: "3px 8px", fontSize: 13 }}
            aria-label="Previous period"
          >‹</button>
          <button
            onClick={() => mode === "monthly" ? setMonthOffset((o) => Math.min(0, o + 1)) : setQuarterOffset((o) => Math.min(0, o + 1))}
            disabled={(mode === "monthly" ? monthOffset : quarterOffset) >= 0}
            style={{ ...BTN_GHOST, padding: "3px 8px", fontSize: 13, opacity: (mode === "monthly" ? monthOffset : quarterOffset) >= 0 ? 0.3 : 1 }}
            aria-label="Next period"
          >›</button>
        </div>
      </div>

      {digest.totalEntries === 0 ? (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>
          No journal entries in this period.
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Entries", value: digest.totalEntries, icon: "📝" },
              { label: "Words", value: digest.totalWords.toLocaleString(), icon: "✍️" },
              { label: "Avg/Entry", value: digest.avgWordsPerEntry, icon: "📖" },
            ].map((s) => (
              <div key={s.label} style={{ background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Second row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
            <div style={{ background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>💭</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: digest.avgSentiment != null ? sentimentColor(digest.avgSentiment) : "rgba(255,255,255,0.3)" }}>
                {digest.avgSentiment != null ? sentimentLabel(digest.avgSentiment) : "—"}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase" }}>Avg Mood</div>
            </div>
            <div style={{ background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{sentTrendEmoji}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: sentTrendColor, textTransform: "capitalize" }}>
                {digest.sentimentTrend}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase" }}>Trend</div>
            </div>
            <div style={{ background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>🔥</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>{digest.longestStreak}d</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase" }}>Best Streak</div>
            </div>
          </div>

          {/* Consistency bar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>Consistency</span>
              <span style={{ fontSize: 11, color: GOLD, fontWeight: 800 }}>{digest.consistency}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${digest.consistency}%`, borderRadius: 3, background: `linear-gradient(90deg, ${ACCENT}, ${GOLD})`, transition: "width 0.5s" }} />
            </div>
          </div>

          {/* Best / Toughest day */}
          {(digest.bestDay || digest.toughestDay) && (
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {digest.bestDay && (
                <div style={{ flex: 1, background: "rgba(34,197,94,0.08)", borderRadius: 10, padding: "8px 12px", borderLeft: "3px solid #4ade80" }}>
                  <div style={{ fontSize: 10, color: "#4ade80", fontWeight: 700, marginBottom: 2 }}>BEST DAY</div>
                  <div style={{ fontSize: 12, color: "#f1f5f9", fontWeight: 700 }}>{fmtDate(digest.bestDay.date)}</div>
                </div>
              )}
              {digest.toughestDay && (
                <div style={{ flex: 1, background: "rgba(239,68,68,0.06)", borderRadius: 10, padding: "8px 12px", borderLeft: "3px solid #f87171" }}>
                  <div style={{ fontSize: 10, color: "#f87171", fontWeight: 700, marginBottom: 2 }}>TOUGHEST DAY</div>
                  <div style={{ fontSize: 12, color: "#f1f5f9", fontWeight: 700 }}>{fmtDate(digest.toughestDay.date)}</div>
                </div>
              )}
            </div>
          )}

          {/* Top tags */}
          {digest.topTags.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Top Tags</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {digest.topTags.map((t) => (
                  <span key={t.tag} style={{
                    background: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}`,
                    borderRadius: 20, color: ACCENT, fontSize: 11, fontWeight: 700, padding: "2px 9px",
                  }}>
                    {t.tag} <span style={{ opacity: 0.6 }}>×{t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top topics word cloud */}
          {digest.topTopics.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Top Topics</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {digest.topTopics.map((t, i) => {
                  const maxCount = digest.topTopics[0].count;
                  const size = 11 + Math.round((t.count / maxCount) * 6);
                  return (
                    <span key={t.topic} style={{
                      fontSize: size, fontWeight: 700,
                      color: TOPIC_COLORS[i % TOPIC_COLORS.length],
                      opacity: 0.5 + (t.count / maxCount) * 0.5,
                      padding: "2px 6px",
                    }}>
                      {t.topic}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Avg rating */}
          {digest.avgRating != null && (
            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
              Average rating: <span style={{ color: GOLD, fontWeight: 800 }}>★ {digest.avgRating}</span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── Topic Tracking Card ─────────────────────────────────────────────────────

export function TopicTracker({ journals }) {
  const { trends, allTopics } = useMemo(() => calcTopicTrends(journals, 8), [journals]);

  if (allTopics.length === 0) {
    return null;
  }

  // Build a mini bar chart per week per topic
  const maxCount = Math.max(1, ...trends.flatMap((t) => allTopics.map((topic) => t.topics[topic] || 0)));

  return (
    <motion.div
      style={{ ...CARD, padding: "18px 20px" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.08 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>🔍</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>Topic Tracker</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Last 8 weeks</span>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {allTopics.map((topic, i) => (
          <div key={topic} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: TOPIC_COLORS[i % TOPIC_COLORS.length] }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{topic}</span>
          </div>
        ))}
      </div>

      {/* Stacked bar chart */}
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80 }}>
        {trends.map((week) => {
          const total = allTopics.reduce((s, t) => s + (week.topics[t] || 0), 0);
          return (
            <div key={week.week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: "100%", display: "flex", flexDirection: "column-reverse", height: 60 }}>
                {allTopics.map((topic, i) => {
                  const count = week.topics[topic] || 0;
                  const height = maxCount > 0 ? (count / maxCount) * 60 : 0;
                  return (
                    <div
                      key={topic}
                      style={{
                        height, width: "100%", borderRadius: 2,
                        background: TOPIC_COLORS[i % TOPIC_COLORS.length],
                        opacity: count > 0 ? 0.8 : 0,
                        transition: "height 0.3s",
                      }}
                      title={`${topic}: ${count}`}
                    />
                  );
                })}
              </div>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontWeight: 600, whiteSpace: "nowrap" }}>
                {week.weekLabel}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Goal Correlation Card ───────────────────────────────────────────────────

export function GoalCorrelationCard({ journals, weekDays, customHabits }) {
  const points = useMemo(
    () => calcGoalCorrelation(journals, weekDays || {}, customHabits || [], 14),
    [journals, weekDays, customHabits]
  );

  const hasData = points.some((p) => p.sentiment !== null);
  if (!hasData) return null;

  const W = 560;
  const H = 100;
  const PAD = { t: 12, b: 24, l: 8, r: 8 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  function toX(i) {
    const divisor = points.length <= 1 ? 1 : points.length - 1;
    return PAD.l + (i / divisor) * chartW;
  }

  function sentToY(score) {
    return PAD.t + chartH - ((score + 100) / 200) * chartH;
  }

  function pctToY(pct) {
    return PAD.t + chartH - (pct / 100) * chartH;
  }

  // Build sentiment path
  const sentPoints = points
    .map((p, i) => p.sentiment !== null ? `${toX(i)},${sentToY(p.sentiment)}` : null)
    .filter(Boolean);
  const sentPath = sentPoints.join(" ");

  // Build task completion path
  const taskPoints = points
    .map((p, i) => p.taskCompletionRate !== null ? `${toX(i)},${pctToY(p.taskCompletionRate)}` : null)
    .filter(Boolean);
  const taskPath = taskPoints.join(" ");

  // Build habit completion path
  const habitPoints = points
    .map((p, i) => p.habitCompletionRate !== null ? `${toX(i)},${pctToY(p.habitCompletionRate)}` : null)
    .filter(Boolean);
  const habitPath = habitPoints.join(" ");

  // Correlation summary
  const paired = points.filter((p) => p.sentiment !== null && (p.taskCompletionRate !== null || p.habitCompletionRate !== null));
  let correlationNote = "";
  if (paired.length >= 5) {
    const highSent = paired.filter((p) => p.sentiment > 10);
    const lowSent = paired.filter((p) => p.sentiment < -10);
    const highTaskAvg = highSent.length > 0
      ? highSent.reduce((s, p) => s + (p.taskCompletionRate || 0), 0) / highSent.length : null;
    const lowTaskAvg = lowSent.length > 0
      ? lowSent.reduce((s, p) => s + (p.taskCompletionRate || 0), 0) / lowSent.length : null;

    if (highTaskAvg !== null && lowTaskAvg !== null && highTaskAvg > lowTaskAvg + 15) {
      correlationNote = "You tend to get more done on days you feel positive.";
    } else if (highTaskAvg !== null && lowTaskAvg !== null && lowTaskAvg > highTaskAvg + 15) {
      correlationNote = "Interestingly, you get more done when you're feeling challenged.";
    } else {
      correlationNote = "Your productivity stays consistent regardless of mood.";
    }
  }

  return (
    <motion.div
      style={{ ...CARD, padding: "18px 20px" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>🎯</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>Mood vs. Productivity</span>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 16, height: 2, background: "#818cf8", borderRadius: 1 }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>Sentiment</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 16, height: 2, background: "#4ade80", borderRadius: 1 }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>Tasks</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 16, height: 2, background: GOLD, borderRadius: 1 }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>Habits</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        {/* Zero line for sentiment */}
        <line x1={PAD.l} y1={sentToY(0)} x2={W - PAD.r} y2={sentToY(0)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />

        {/* Lines */}
        {sentPath && <polyline points={sentPath} fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />}
        {taskPath && <polyline points={taskPath} fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />}
        {habitPath && <polyline points={habitPath} fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />}

        {/* Date labels */}
        {points.filter((_, i) => i % 3 === 0 || i === points.length - 1).map((p, _, arr) => {
          const idx = points.indexOf(p);
          return (
            <text key={p.date} x={toX(idx)} y={H - 4} fill="rgba(255,255,255,0.2)" fontSize="8" textAnchor="middle" fontFamily={FONT}>
              {p.label}
            </text>
          );
        })}
      </svg>

      {correlationNote && (
        <div style={{
          marginTop: 8, padding: "8px 12px", background: "rgba(15,23,42,0.5)",
          borderRadius: 8, borderLeft: "3px solid #818cf8",
          fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600, lineHeight: 1.5,
        }}>
          💡 {correlationNote}
        </div>
      )}
    </motion.div>
  );
}

// ─── Journal Photo Attachment ────────────────────────────────────────────────

const MAX_PHOTO_DIMENSION = 1200; // px — resize large photos
const MAX_PHOTOS_PER_ENTRY = 3;
const JPEG_QUALITY = 0.75;

/**
 * Compress/resize an image file using canvas. Returns a data URL.
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      // Resize if too large
      if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
        const ratio = Math.min(MAX_PHOTO_DIMENSION / width, MAX_PHOTO_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export function PhotoAttachment({ photos, onPhotosChange, readOnly = false }) {
  const inputRef = useRef(null);
  const [previewIdx, setPreviewIdx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = (photos || []).length;
    const allowed = files.slice(0, MAX_PHOTOS_PER_ENTRY - currentCount);
    if (allowed.length === 0) return;

    setLoading(true);
    setError("");

    try {
      const newPhotos = [];
      for (const file of allowed) {
        // Validate it's an image
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await compressImage(file);
        newPhotos.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          dataUrl,
          name: file.name,
        });
      }

      if (newPhotos.length > 0) {
        // Use functional update to avoid stale closure
        onPhotosChange((prev) => [...(prev || []), ...newPhotos]);
      }
    } catch (err) {
      setError("Failed to process image. Try a different photo.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [onPhotosChange]);

  function removePhoto(id) {
    onPhotosChange((prev) => (prev || []).filter((p) => p.id !== id));
  }

  const currentPhotos = photos || [];
  const canAdd = !readOnly && currentPhotos.length < MAX_PHOTOS_PER_ENTRY;

  return (
    <div>
      {/* Photo grid */}
      {currentPhotos.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {currentPhotos.map((photo, idx) => (
            <div
              key={photo.id}
              style={{
                position: "relative",
                width: 72, height: 72, borderRadius: 10, overflow: "hidden",
                border: "1px solid rgba(51,65,85,0.4)", cursor: "pointer",
              }}
              onClick={() => setPreviewIdx(idx)}
            >
              <img
                src={photo.dataUrl}
                alt={photo.name || "Journal photo"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {!readOnly && (
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                  style={{
                    position: "absolute", top: 2, right: 2,
                    width: 18, height: 18, borderRadius: "50%",
                    background: "rgba(0,0,0,0.6)", border: "none",
                    color: "#fff", fontSize: 10, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    lineHeight: 1,
                  }}
                  aria-label="Remove photo"
                >✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {canAdd && (
        <button
          onClick={() => !loading && inputRef.current?.click()}
          disabled={loading}
          style={{
            background: "rgba(15,23,42,0.5)",
            border: "1px dashed rgba(51,65,85,0.5)",
            borderRadius: 10, padding: "8px 14px",
            color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700,
            cursor: loading ? "wait" : "pointer", fontFamily: FONT,
            display: "flex", alignItems: "center", gap: 6,
            transition: "border-color 0.15s",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "⏳ Processing..." : `📷 Add Photo${currentPhotos.length > 0 ? ` (${currentPhotos.length}/${MAX_PHOTOS_PER_ENTRY})` : ""}`}
        </button>
      )}

      {error && (
        <div style={{ fontSize: 11, color: "#f87171", marginTop: 4, fontWeight: 600 }}>{error}</div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* Lightbox preview */}
      <AnimatePresence>
        {previewIdx !== null && currentPhotos[previewIdx] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
            onClick={() => setPreviewIdx(null)}
          >
            <img
              src={currentPhotos[previewIdx].dataUrl}
              alt="Preview"
              style={{
                maxWidth: "90vw", maxHeight: "85vh",
                borderRadius: 12, objectFit: "contain",
                boxShadow: "0 0 40px rgba(0,0,0,0.5)",
              }}
            />
            <button
              style={{
                position: "absolute", top: 20, right: 20,
                background: "rgba(255,255,255,0.1)", border: "none",
                color: "#fff", fontSize: 20, cursor: "pointer",
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              aria-label="Close preview"
            >✕</button>
            {/* Nav arrows */}
            {currentPhotos.length > 1 && (
              <>
                {previewIdx > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewIdx(previewIdx - 1); }}
                    style={{
                      position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.1)", border: "none", color: "#fff",
                      fontSize: 24, cursor: "pointer", width: 40, height: 40, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    aria-label="Previous photo"
                  >‹</button>
                )}
                {previewIdx < currentPhotos.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewIdx(previewIdx + 1); }}
                    style={{
                      position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.1)", border: "none", color: "#fff",
                      fontSize: 24, cursor: "pointer", width: 40, height: 40, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    aria-label="Next photo"
                  >›</button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Journaling Streak Rewards ───────────────────────────────────────────────

export function StreakRewardsCard({ journals }) {
  const milestones = useMemo(() => calcJournalStreakMilestones(journals), [journals]);

  return (
    <motion.div
      style={{
        ...CARD,
        background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(168,85,247,0.06))",
        border: "1px solid rgba(245,158,11,0.2)",
        padding: "18px 20px",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.03 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>🏆</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>Journal Milestones</span>
      </div>

      {/* Current streak highlight */}
      <div style={{
        background: "rgba(15,23,42,0.5)", borderRadius: 12, padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14,
        border: milestones.currentStreak >= 7 ? `1px solid ${ACCENT_BORDER}` : "1px solid rgba(51,65,85,0.3)",
      }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: milestones.currentStreak >= 7 ? GOLD : "#f1f5f9" }}>
            {milestones.currentStreak}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>Current Streak</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.6)" }}>
            {milestones.longestStreak}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Longest Ever</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.6)" }}>
            {milestones.totalEntries}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Total Entries</div>
        </div>
      </div>

      {/* Milestone badges */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {milestones.milestones.map((m) => {
          const tc = TIER_COLORS[m.tier] || TIER_COLORS.bronze;
          return (
            <div
              key={m.threshold}
              style={{
                background: m.reached ? tc.bg : "rgba(15,23,42,0.3)",
                border: `1px solid ${m.reached ? tc.border : "rgba(51,65,85,0.2)"}`,
                borderRadius: 10, padding: "10px 8px", textAlign: "center",
                opacity: m.reached ? 1 : 0.45,
                transition: "all 0.3s",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>
                {m.reached ? "🏅" : "🔒"}
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color: m.reached ? tc.text : "rgba(255,255,255,0.3)" }}>
                {m.threshold}d
              </div>
              <div style={{ fontSize: 9, color: m.reached ? tc.text : "rgba(255,255,255,0.2)", fontWeight: 600, marginTop: 2 }}>
                {m.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next milestone */}
      {(() => {
        const next = milestones.milestones.find((m) => !m.reached);
        if (!next) return (
          <div style={{ marginTop: 12, fontSize: 12, color: GOLD, fontWeight: 700, textAlign: "center" }}>
            All milestones unlocked! You're a journaling legend.
          </div>
        );
        const daysLeft = next.threshold - milestones.currentStreak;
        return (
          <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, textAlign: "center" }}>
            <span style={{ color: GOLD, fontWeight: 800 }}>{daysLeft} {daysLeft === 1 ? "day" : "days"}</span> until "{next.label}" milestone
          </div>
        );
      })()}
    </motion.div>
  );
}
