import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  calcMood14Days,
  calcMoodWeeklySummary,
  calcMoodByDayOfWeek,
  calcMoodVsExercise,
  calcMood12WeekHeatmap,
  calcMoodAtHighStreak,
  calcMoodSleepCorrelation,
} from '../utils/math';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOODS = [
  { score: 1, emoji: '😔', label: 'Rough',   color: '#ef4444' },
  { score: 2, emoji: '😕', label: 'Meh',     color: '#f97316' },
  { score: 3, emoji: '😐', label: 'Okay',    color: '#eab308' },
  { score: 4, emoji: '😊', label: 'Good',    color: '#22c55e' },
  { score: 5, emoji: '😄', label: 'Great',   color: '#6366f1' },
];

const MOOD_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1'];

function scoreColor(score) {
  if (!score) return 'rgba(51,65,85,0.4)';
  return MOOD_COLORS[Math.min(5, Math.max(1, Math.round(score)))];
}

function scoreEmoji(score) {
  if (!score) return null;
  const m = MOODS.find((m) => m.score === Math.round(score));
  return m ? m.emoji : null;
}

function todayKey() {
  const d = new Date();
  return d.toLocaleDateString('en-CA');
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const S = {
  card: {
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(51,65,85,0.4)',
    borderRadius: 16,
    padding: '20px 18px',
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(100,116,139,0.7)',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    marginBottom: 10,
    display: 'block',
    fontFamily: "'DM Sans',sans-serif",
  },
  heading: {
    fontSize: 18,
    fontWeight: 800,
    color: '#f1f5f9',
    fontFamily: "'Syne',serif",
    letterSpacing: '-0.3px',
    margin: '0 0 4px',
  },
  sub: {
    fontSize: 13,
    color: 'rgba(100,116,139,0.8)',
    margin: '0 0 20px',
    fontFamily: "'DM Sans',sans-serif",
  },
};

// ─── WeeklySummaryBar ─────────────────────────────────────────────────────────

function WeeklySummaryBar({ moodLogs }) {
  const summary = useMemo(() => calcMoodWeeklySummary(moodLogs), [moodLogs]);

  const weekEmoji = summary.avg !== null ? scoreEmoji(summary.avg) : null;
  const weekColor = summary.avg !== null ? scoreColor(summary.avg) : 'rgba(100,116,139,0.6)';
  const maxCount = Math.max(1, ...Object.values(summary.distribution));

  return (
    <div style={{ ...S.card, marginBottom: 16 }}>
      <span style={S.label}>This Week's Mood</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        {weekEmoji && (
          <span style={{ fontSize: 36, lineHeight: 1 }}>{weekEmoji}</span>
        )}
        <div>
          {summary.avg !== null ? (
            <>
              <div style={{ fontSize: 26, fontWeight: 800, color: weekColor, fontFamily: "'Syne',serif", lineHeight: 1 }}>
                {summary.avg}<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>/5</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                Based on {summary.totalLogged} {summary.totalLogged === 1 ? 'entry' : 'entries'} this week
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
              No entries this week yet
            </div>
          )}
        </div>
      </div>

      {/* Score distribution bars */}
      {summary.totalLogged > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[5, 4, 3, 2, 1].map((score) => {
            const count = summary.distribution[score] || 0;
            const pct = (count / maxCount) * 100;
            const mood = MOODS.find((m) => m.score === score);
            return (
              <div key={score} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, width: 20 }}>{mood.emoji}</span>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    background: 'rgba(51,65,85,0.3)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.1 * (5 - score), ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: mood.color,
                      borderRadius: 4,
                      opacity: count > 0 ? 1 : 0.15,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: count > 0 ? mood.color : 'rgba(255,255,255,0.2)',
                    width: 16,
                    textAlign: 'right',
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MoodTrendChart ───────────────────────────────────────────────────────────

function MoodTrendChart({ moodLogs }) {
  const points = useMemo(() => calcMood14Days(moodLogs), [moodLogs]);

  const W = 560;
  const H = 100;
  const PAD_L = 24;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Only the points that have a score
  const scored = points.filter((p) => p.score !== null);

  // Map score 1-5 to y coordinate (5 = top, 1 = bottom)
  function toY(score) {
    return PAD_T + chartH - ((score - 1) / 4) * chartH;
  }

  function toX(index) {
    return PAD_L + (index / (points.length - 1)) * chartW;
  }

  // Build polyline points (only consecutive runs with scores; skip gaps)
  const segments = [];
  let currentSeg = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.score !== null) {
      currentSeg.push({ x: toX(i), y: toY(p.score), ...p });
    } else {
      if (currentSeg.length > 0) { segments.push(currentSeg); currentSeg = []; }
    }
  }
  if (currentSeg.length > 0) segments.push(currentSeg);

  // Gradient fill path (for the longest segment — just flood-fill under the first segment)
  function buildAreaPath(seg) {
    if (seg.length === 0) return '';
    const pts = seg.map((p) => `${p.x},${p.y}`).join(' ');
    const lastX = seg[seg.length - 1].x;
    const firstX = seg[0].x;
    return `M ${firstX} ${PAD_T + chartH} L ${pts.replace(/(\S+),(\S+)/g, (_, x, y) => `${x} ${y}`).replace(/\s+/g, ' L ')} L ${lastX} ${PAD_T + chartH} Z`;
  }

  const [tooltip, setTooltip] = useState(null);

  const allScoredPts = segments.flat();

  return (
    <div style={{ ...S.card }}>
      <span style={S.label}>14-Day Mood Trend</span>

      {scored.length === 0 ? (
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
          Log at least one mood to see your trend
        </div>
      ) : (
        <div style={{ position: 'relative', overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', display: 'block' }}
            role="img"
            aria-label="14-day mood trend chart"
          >
            <defs>
              <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Y-axis grid lines at 1–5 */}
            {[1, 2, 3, 4, 5].map((score) => (
              <g key={score}>
                <line
                  x1={PAD_L}
                  y1={toY(score)}
                  x2={W - PAD_R}
                  y2={toY(score)}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
                <text x={PAD_L - 4} y={toY(score) + 4} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.2)">{score}</text>
              </g>
            ))}

            {/* Area fill beneath first (largest) segment */}
            {segments.map((seg, si) => (
              <path
                key={`area-${si}`}
                d={buildAreaPath(seg)}
                fill="url(#moodFill)"
              />
            ))}

            {/* Polylines for each segment */}
            {segments.map((seg, si) => (
              <polyline
                key={`line-${si}`}
                points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="rgba(34,197,94,0.7)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Data points */}
            {allScoredPts.map((p, i) => (
              <g key={`dot-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.isToday ? 6 : 4}
                  fill={scoreColor(p.score)}
                  stroke={p.isToday ? '#fff' : 'rgba(15,23,42,0.8)'}
                  strokeWidth={p.isToday ? 2 : 1.5}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip(p)}
                  onMouseLeave={() => setTooltip(null)}
                />
                {p.isToday && (
                  <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.7)" fontWeight="700">Today</text>
                )}
              </g>
            ))}

            {/* X-axis date labels — show every 2nd point */}
            {points.map((p, i) => {
              if (i % 2 !== 0 && !p.isToday) return null;
              return (
                <text
                  key={`xlabel-${i}`}
                  x={toX(i)}
                  y={H - 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill={p.isToday ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)'}
                  fontWeight={p.isToday ? '700' : '400'}
                >
                  {p.label}
                </text>
              );
            })}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              style={{
                position: 'absolute',
                top: 4,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15,23,42,0.95)',
                border: `1px solid ${scoreColor(tooltip.score)}`,
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: '#f1f5f9',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: 10,
                fontFamily: "'DM Sans',sans-serif",
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              {scoreEmoji(tooltip.score)} {MOODS.find((m) => m.score === tooltip.score)?.label} — {tooltip.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MoodInsights ─────────────────────────────────────────────────────────────

function MoodInsights({ moodLogs, workoutHistory, habitLogs, sleepLogs }) {
  const exerciseCorr = useMemo(
    () => calcMoodVsExercise(moodLogs, workoutHistory || []),
    [moodLogs, workoutHistory]
  );

  const sleepCorr = useMemo(
    () => calcMoodSleepCorrelation(moodLogs, sleepLogs || []),
    [moodLogs, sleepLogs]
  );

  const dowData = useMemo(() => calcMoodByDayOfWeek(moodLogs), [moodLogs]);
  const bestDow = useMemo(() => {
    const withData = dowData.filter((d) => d.avg !== null && d.count >= 2);
    if (withData.length === 0) return null;
    return withData.reduce((best, d) => (d.avg > best.avg ? d : best));
  }, [dowData]);

  const highStreakMood = useMemo(
    () => calcMoodAtHighStreak(moodLogs, habitLogs || {}),
    [moodLogs, habitLogs]
  );

  const hasSleepInsight = sleepCorr.totalDays >= 4;

  const hasAnyInsight =
    (exerciseCorr.exerciseDaysCount >= 2 && exerciseCorr.restDaysCount >= 2) ||
    bestDow !== null ||
    highStreakMood !== null ||
    hasSleepInsight;

  if (!hasAnyInsight) {
    return (
      <div style={{ ...S.card }}>
        <span style={S.label}>Insights</span>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
          Log more moods to unlock correlation insights.
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...S.card }}>
      <span style={S.label}>Insights</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Exercise vs rest day correlation */}
        {exerciseCorr.exerciseDaysCount >= 2 && exerciseCorr.restDaysCount >= 2 && (
          <InsightRow
            icon="🏋️"
            text={
              <>
                On days you exercise, your average mood is{' '}
                <span style={{ color: scoreColor(exerciseCorr.exerciseDaysAvg), fontWeight: 800 }}>
                  {exerciseCorr.exerciseDaysAvg}
                </span>
                {' '}vs{' '}
                <span style={{ color: scoreColor(exerciseCorr.restDaysAvg), fontWeight: 800 }}>
                  {exerciseCorr.restDaysAvg}
                </span>
                {' '}on rest days
              </>
            }
          />
        )}

        {/* Best mood day of week */}
        {bestDow && (
          <InsightRow
            icon="📅"
            text={
              <>
                Your best mood days are{' '}
                <span style={{ color: '#f1f5f9', fontWeight: 800 }}>{bestDow.label}s</span>
                {' '}on average (
                <span style={{ color: scoreColor(bestDow.avg), fontWeight: 800 }}>
                  {bestDow.avg}/5
                </span>)
              </>
            }
          />
        )}

        {/* Streak correlation */}
        {highStreakMood !== null && (
          <InsightRow
            icon="🔥"
            text={
              <>
                When your habit streak is 5+, mood averages{' '}
                <span style={{ color: scoreColor(highStreakMood), fontWeight: 800 }}>
                  {highStreakMood}/5
                </span>
              </>
            }
          />
        )}

        {/* Sleep sweet spot */}
        {hasSleepInsight && sleepCorr.sweetSpotAvg !== null && (
          <InsightRow
            icon="🌙"
            text={
              <>
                Your{' '}
                <span style={{ color: '#818cf8', fontWeight: 800 }}>sleep sweet spot</span>
                {' '}is 8–9 hours — mood averages{' '}
                <span style={{ color: scoreColor(sleepCorr.sweetSpotAvg), fontWeight: 800 }}>
                  {sleepCorr.sweetSpotAvg}/5
                </span>
                {sleepCorr.shortSleepAvg !== null && (
                  <>
                    {' '}vs{' '}
                    <span style={{ color: scoreColor(sleepCorr.shortSleepAvg), fontWeight: 800 }}>
                      {sleepCorr.shortSleepAvg}/5
                    </span>
                    {' '}on under 6h
                  </>
                )}
              </>
            }
          />
        )}

        {/* Sleep generic lift when sweet spot data exists */}
        {hasSleepInsight && sleepCorr.bestRange === 'mid' && sleepCorr.midSleepAvg !== null && (
          <InsightRow
            icon="🌙"
            text={
              <>
                You feel best after{' '}
                <span style={{ color: '#818cf8', fontWeight: 800 }}>6–8 hours of sleep</span>
                {' '}— avg mood{' '}
                <span style={{ color: scoreColor(sleepCorr.midSleepAvg), fontWeight: 800 }}>
                  {sleepCorr.midSleepAvg}/5
                </span>
              </>
            }
          />
        )}

        {/* Short sleep penalty */}
        {hasSleepInsight &&
          sleepCorr.shortSleepAvg !== null &&
          (sleepCorr.sweetSpotAvg !== null || sleepCorr.midSleepAvg !== null) && (() => {
            const betterAvg = sleepCorr.sweetSpotAvg ?? sleepCorr.midSleepAvg ?? 0;
            const delta = Math.round((betterAvg - sleepCorr.shortSleepAvg) * 10) / 10;
            if (delta <= 0) return null;
            return (
              <InsightRow
                icon="⚠️"
                text={
                  <>
                    On nights with under 6h sleep, your mood drops by{' '}
                    <span style={{ color: '#f87171', fontWeight: 800 }}>
                      {delta} point{delta !== 1 ? 's' : ''}
                    </span>
                    {' '}on average
                  </>
                }
              />
            );
          })()}
      </div>
    </div>
  );
}

function InsightRow({ icon, text }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, fontFamily: "'DM Sans',sans-serif" }}>
        {text}
      </span>
    </div>
  );
}

// ─── MoodHeatmap (12-week) ────────────────────────────────────────────────────

function MoodHeatmap({ moodLogs }) {
  const cells = useMemo(() => calcMood12WeekHeatmap(moodLogs), [moodLogs]);
  const [hoveredCell, setHoveredCell] = useState(null);

  // cells are 84 items, column-major: 12 cols × 7 rows
  // Reorganize into 7 rows × 12 cols for CSS grid (row-first display)
  const rows = [];
  for (let row = 0; row < 7; row++) {
    const rowCells = [];
    for (let col = 0; col < 12; col++) {
      rowCells.push(cells[col * 7 + row]);
    }
    rows.push(rowCells);
  }

  const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div style={{ ...S.card }}>
      <span style={S.label}>12-Week Mood History</span>

      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
        {/* Day-of-week labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2 }}>
          {DOW_LABELS.map((d) => (
            <div
              key={d}
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.25)',
                height: 14,
                display: 'flex',
                alignItems: 'center',
                width: 14,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid: 7 rows */}
        <div style={{ flex: 1 }}>
          {rows.map((rowCells, rowIdx) => (
            <div key={rowIdx} style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
              {rowCells.map((cell) => {
                const bg = cell.isFuture
                  ? 'transparent'
                  : cell.score !== null
                  ? `${scoreColor(cell.score)}88`
                  : 'rgba(51,65,85,0.25)';
                return (
                  <div
                    key={cell.dateStr}
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${cell.label}: ${cell.score !== null ? `${scoreEmoji(cell.score)} ${MOODS.find((m) => m.score === cell.score)?.label}` : 'Not logged'}`}
                    style={{
                      flex: 1,
                      aspectRatio: '1',
                      borderRadius: 3,
                      background: bg,
                      border: cell.isToday
                        ? '2px solid rgba(99,102,241,0.9)'
                        : '1px solid transparent',
                      cursor: cell.score !== null ? 'pointer' : 'default',
                      transition: 'opacity 0.15s',
                      opacity: cell.isFuture ? 0 : 1,
                      minWidth: 0,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && hoveredCell.score !== null && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 600,
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          {hoveredCell.label}: {scoreEmoji(hoveredCell.score)}{' '}
          <span style={{ color: scoreColor(hoveredCell.score) }}>
            {MOODS.find((m) => m.score === hoveredCell.score)?.label}
          </span>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        {MOODS.map((m) => (
          <div key={m.score} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(148,163,184,0.7)' }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: `${m.color}88`,
              }}
            />
            <span>{m.emoji} {m.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(148,163,184,0.7)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(51,65,85,0.4)' }} />
          <span>Not logged</span>
        </div>
      </div>
    </div>
  );
}

// ─── MoodTrackerTab (main export) ─────────────────────────────────────────────

export default function MoodTrackerTab({ data, onChange, onNavigateToJournal, onPrefillJournal }) {
  const moodLogs = data.moodLogs || {};
  const workoutHistory = data.workoutHistory || [];
  // Use the first habit's logs if available for streak correlation
  const habits = data.habits || [];
  const firstHabitLogs = habits.length > 0 ? (habits[0].logs || {}) : {};

  // Build sleep log array from data.sleepEntries (SleepTrackerTab shape) if present
  const sleepLogs = useMemo(() => {
    const entries = data.sleepEntries || [];
    return entries
      .filter((e) => e.date && typeof e.hours === 'number')
      .map((e) => ({ date: e.date, hours: e.hours }));
  }, [data.sleepEntries]);

  const today = todayKey();
  const todayLog = moodLogs[today];
  const [note, setNote] = useState(todayLog?.note || '');
  const [selected, setSelected] = useState(todayLog?.score || null);

  function save(score) {
    const key = todayKey();
    onChange({
      ...data,
      moodLogs: {
        ...moodLogs,
        [key]: {
          score,
          emoji: MOODS.find((m) => m.score === score).emoji,
          note,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  // Stats row data
  const last30Days = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-CA');
      days.push({ key });
    }
    return days;
  }, []);

  const last7 = last30Days.slice(-7);
  const logged7 = last7.filter((d) => moodLogs[d.key]);
  const avg7 = logged7.length
    ? (logged7.reduce((a, d) => a + moodLogs[d.key].score, 0) / logged7.length).toFixed(1)
    : null;

  let streak = 0;
  for (let i = last30Days.length - 1; i >= 0; i--) {
    if (moodLogs[last30Days[i].key]) streak++;
    else break;
  }

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* Weekly mood summary with distribution */}
      <WeeklySummaryBar moodLogs={moodLogs} />

      {/* Today's mood log */}
      <div style={S.card}>
        <h2 style={S.heading}>How are you feeling today?</h2>
        <p style={S.sub}>{new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
          {MOODS.map((m) => {
            const isSelected = selected === m.score;
            return (
              <motion.button
                key={m.score}
                whileTap={{ scale: 0.88 }}
                onClick={() => { setSelected(m.score); save(m.score); }}
                style={{
                  flex: 1,
                  background: isSelected ? `${m.color}22` : 'rgba(15,23,42,0.5)',
                  border: `2px solid ${isSelected ? m.color : 'rgba(51,65,85,0.4)'}`,
                  borderRadius: 14,
                  padding: '12px 4px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s',
                }}
                aria-pressed={isSelected}
                aria-label={`${m.label} mood`}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>{m.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? m.color : 'rgba(148,163,184,0.5)', letterSpacing: '0.3px' }}>
                  {m.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        <textarea
          placeholder="Add a note about today... (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => selected && save(selected)}
          rows={2}
          style={{
            width: '100%',
            background: 'rgba(15,23,42,0.7)',
            border: '1px solid rgba(51,65,85,0.5)',
            borderRadius: 10,
            color: '#f1f5f9',
            padding: '10px 12px',
            fontSize: 13,
            fontFamily: "'DM Sans',sans-serif",
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {todayLog && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
              ✓ Logged for today
            </div>
            {(onNavigateToJournal || onPrefillJournal) && (
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  const score = todayLog.score;
                  const journalPrompt = score <= 4
                    ? "What's weighing on you today? Getting it out of your head can help."
                    : score >= 8
                    ? "You're doing great! What's contributing to your good mood today?"
                    : score >= 6
                    ? "Things are going well! What's been the highlight of your day?"
                    : "How are you feeling about today overall? Take a moment to reflect.";
                  if (onPrefillJournal) onPrefillJournal(journalPrompt);
                  if (onNavigateToJournal) onNavigateToJournal();
                }}
                style={{
                  background: 'rgba(129,140,248,0.12)',
                  border: '1px solid rgba(129,140,248,0.35)',
                  borderRadius: 8,
                  color: '#818cf8',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '5px 12px',
                  fontFamily: "'DM Sans',sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
                aria-label="Write a journal entry about your mood"
              >
                ✍️ Write about it →
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: '7-Day Avg', value: avg7 ? `${avg7}/5` : '—', icon: '📊' },
          { label: 'Log Streak', value: streak > 0 ? `${streak}d` : '—', icon: '🔥' },
          { label: 'Total Logs', value: Object.keys(moodLogs).length, icon: '📅' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(51,65,85,0.4)',
              borderRadius: 14,
              padding: '14px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', fontFamily: "'Syne',serif" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(100,116,139,0.7)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* 14-day SVG trend chart */}
      <MoodTrendChart moodLogs={moodLogs} />

      {/* 12-week heatmap */}
      <MoodHeatmap moodLogs={moodLogs} />

      {/* Mood vs habits/exercise/sleep insights */}
      <MoodInsights
        moodLogs={moodLogs}
        workoutHistory={workoutHistory}
        habitLogs={firstHabitLogs}
        sleepLogs={sleepLogs}
      />

      {/* Recent logs */}
      {Object.entries(moodLogs).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7).length > 0 && (
        <div style={{ ...S.card }}>
          <span style={S.label}>Recent Entries</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(moodLogs)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 7)
              .map(([key, log]) => {
                const mood = MOODS.find((m) => m.score === log.score);
                const d = new Date(key + 'T12:00:00');
                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(51,65,85,0.25)',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{mood?.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: mood?.color }}>{mood?.label}</div>
                      {log.note && (
                        <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.7)', marginTop: 1 }}>{log.note}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.6)', whiteSpace: 'nowrap' }}>
                      {d.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
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

// ─── MoodDashWidget ───────────────────────────────────────────────────────────

export function MoodDashWidget({ data, onNavigate }) {
  const moodLogs = data.moodLogs || {};
  const MOODS_MAP = [
    { score: 1, emoji: '😔', label: 'Rough',   color: '#ef4444' },
    { score: 2, emoji: '😕', label: 'Meh',     color: '#f97316' },
    { score: 3, emoji: '😐', label: 'Okay',    color: '#eab308' },
    { score: 4, emoji: '😊', label: 'Good',    color: '#22c55e' },
    { score: 5, emoji: '😄', label: 'Great',   color: '#6366f1' },
  ];

  const today = todayKey();
  const todayLog = moodLogs[today];
  const todayMood = todayLog ? MOODS_MAP.find((m) => m.score === todayLog.score) : null;

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-CA');
    last7.push({ key, log: moodLogs[key] });
  }

  return (
    <div
      onClick={onNavigate}
      style={{
        background: 'rgba(15,23,42,0.6)',
        border: '1px solid rgba(51,65,85,0.4)',
        borderRadius: 16,
        padding: '16px 18px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>😊 Mood</span>
        <span style={{ fontSize: 11, color: 'rgba(99,102,241,0.7)' }}>Log →</span>
      </div>
      <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 4 }}>
        {todayMood ? todayMood.emoji : '➕'}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', color: todayMood ? todayMood.color : 'rgba(100,116,139,0.6)', marginBottom: 12 }}>
        {todayMood ? todayMood.label : 'Log mood →'}
      </div>
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center', alignItems: 'flex-end' }}>
        {last7.map(({ key, log }) => {
          const mood = log ? MOODS_MAP.find((m) => m.score === log.score) : null;
          const isToday = key === today;
          return (
            <div
              key={key}
              style={{
                width: 10,
                height: mood ? `${mood.score * 6 + 6}px` : '6px',
                borderRadius: 3,
                background: mood ? `${mood.color}bb` : 'rgba(51,65,85,0.4)',
                border: isToday ? '1px solid #6366f1' : 'none',
                transition: 'height 0.2s',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
