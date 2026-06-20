/* eslint-disable */
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'up_sleep_log';
const FONT = "'DM Sans',sans-serif";
const FONT_HEAD = "'Syne',serif";

const QUALITY_EMOJI = ['', '\uD83D\uDE34', '\uD83D\uDCA4', '\uD83D\uDE10', '\uD83D\uDE0A', '\u2B50'];
const QUALITY_LABEL = ['', 'Poor', 'Fair', 'Okay', 'Good', 'Great'];
const QUALITY_COLOR = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1'];

const DUR_COLOR = (h) => {
  if (h < 6) return '#ef4444';
  if (h < 7) return '#f97316';
  if (h <= 9) return '#22c55e';
  return '#3b82f6';
};

// ── Style tokens ─────────────────────────────────────────────────────────────

const CARD = {
  background: 'rgba(15,23,42,0.5)',
  border: '1px solid rgba(51,65,85,0.35)',
  borderRadius: 14,
  padding: '16px 18px',
  marginBottom: 14,
};

const SECTION_LABEL = {
  fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10,
};

const INPUT_STYLE = {
  background: 'rgba(15,23,42,0.8)',
  border: '1px solid rgba(51,65,85,0.55)',
  borderRadius: 10, color: '#f1f5f9',
  padding: '10px 13px', fontSize: 13,
  fontFamily: FONT, outline: 'none',
  width: '100%', boxSizing: 'border-box',
};

const BTN_PRIMARY = {
  background: 'linear-gradient(135deg,#6366f1,#818cf8)',
  border: 'none', borderRadius: 10, color: '#fff',
  padding: '11px', cursor: 'pointer', fontSize: 13,
  fontWeight: 700, fontFamily: FONT, width: '100%',
  transition: 'opacity 0.2s',
};

const BTN_DISABLED = {
  ...BTN_PRIMARY,
  background: 'rgba(30,40,60,0.5)',
  color: 'rgba(255,255,255,0.25)',
  cursor: 'default',
};

const ANIM = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { type: 'spring', stiffness: 400, damping: 30 },
};

// ── Pure helpers ─────────────────────────────────────────────────────────────

function loadSleepLog() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSleepLog(log) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(log)); } catch {}
}

function parseDuration(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return 0;
  const [bh = 0, bm = 0] = bedtime.split(':').map(Number);
  const [wh = 0, wm = 0] = wakeTime.split(':').map(Number);
  let bedMins = bh * 60 + bm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= bedMins) wakeMins += 24 * 60;
  return +((wakeMins - bedMins) / 60).toFixed(2);
}

function fmtDuration(hours) {
  if (!hours || hours <= 0) return '\u2014';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

function dateKey(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toLocaleDateString('en-CA');
}

function shortDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function calcSleepScore(entries) {
  if (!entries.length) return 0;
  const durations = entries.map(e => e.duration).filter(d => d > 0);
  const qualities = entries.map(e => e.quality).filter(q => q > 0);
  if (!durations.length || !qualities.length) return 0;

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
  const sd = stdDev(durations);
  const consistency = avgDuration > 0 ? Math.max(0, 1 - (sd / avgDuration)) : 0;

  const durationScore = (avgDuration >= 7 && avgDuration <= 9) ? 40 : 20;
  const qualityScore = (avgQuality / 5) * 40;
  const consistencyScore = consistency * 20;

  return Math.round(Math.min(100, durationScore + qualityScore + consistencyScore));
}

// ── Quality Picker ───────────────────────────────────────────────────────────

function QualityPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map(q => (
        <button
          key={q}
          onClick={() => onChange(q)}
          title={QUALITY_LABEL[q]}
          style={{
            fontSize: 28, background: 'transparent', border: 'none',
            cursor: 'pointer', padding: 4, borderRadius: 10,
            boxShadow: value === q ? '0 0 0 3px ' + QUALITY_COLOR[q] : 'none',
            transition: 'box-shadow 0.15s, opacity 0.15s', lineHeight: 1,
            opacity: value && value !== q ? 0.4 : 1,
          }}
        >
          {QUALITY_EMOJI[q]}
        </button>
      ))}
    </div>
  );
}

// ── SVG Bar Chart ────────────────────────────────────────────────────────────

function SleepBarChart({ entries, range }) {
  const days = range === 30 ? 30 : 7;
  const W = 320;
  const H = 170;
  const PAD_L = 32;
  const PAD_R = 8;
  const PAD_T = 16;
  const PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const MAX_H = 12;
  const barGap = days === 7 ? 6 : 2;

  // Build data: one bar per day
  const bars = useMemo(() => {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const key = dateKey(i);
      const entry = entries.find(e => e.date === key);
      result.push({
        date: key,
        day: shortDay(key),
        duration: entry ? entry.duration : 0,
        quality: entry ? entry.quality : 0,
      });
    }
    return result;
  }, [entries, days]);

  // Average line
  const durations = bars.map(b => b.duration).filter(d => d > 0);
  const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const barW = (chartW - barGap * (days - 1)) / days;
  const toY = (h) => PAD_T + chartH - (h / MAX_H) * chartH;

  function barColor(quality, duration) {
    if (duration === 0) return 'rgba(255,255,255,0.07)';
    if (quality >= 4) return '#22c55e';
    if (quality >= 3) return '#eab308';
    return '#ef4444';
  }

  return (
    <div style={{ ...CARD, overflow: 'hidden' }}>
      <div style={SECTION_LABEL}>{days}-Day Sleep Duration</div>
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: 'block', minWidth: days === 30 ? 400 : 260 }}
          role="img"
          aria-label={`${days}-day sleep duration bar chart`}
        >
          {/* Y-axis grid lines */}
          {[0, 3, 6, 9, 12].map(h => (
            <g key={h}>
              <line
                x1={PAD_L} y1={toY(h)} x2={PAD_L + chartW} y2={toY(h)}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1"
              />
              <text
                x={PAD_L - 4} y={toY(h) + 3}
                textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.3)"
                fontFamily={FONT}
              >
                {h}h
              </text>
            </g>
          ))}

          {/* 7h target line */}
          <line
            x1={PAD_L} y1={toY(7)} x2={PAD_L + chartW} y2={toY(7)}
            stroke="#22c55e" strokeWidth="1" strokeDasharray="4,3" opacity="0.5"
          />

          {/* Average line */}
          {avg > 0 && (
            <line
              x1={PAD_L} y1={toY(avg)} x2={PAD_L + chartW} y2={toY(avg)}
              stroke="#818cf8" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.7"
            />
          )}
          {avg > 0 && (
            <text
              x={PAD_L + chartW + 2} y={toY(avg) + 3}
              fontSize="7" fill="#818cf8" opacity="0.9" fontFamily={FONT}
            >
              avg
            </text>
          )}

          {/* Bars */}
          {bars.map((bar, i) => {
            const x = PAD_L + i * (barW + barGap);
            const barH = bar.duration > 0
              ? Math.max(2, (bar.duration / MAX_H) * chartH)
              : 3;
            const y = PAD_T + chartH - barH;
            const fill = barColor(bar.quality, bar.duration);

            return (
              <g key={bar.date}>
                <rect
                  x={x} y={y} width={barW} height={barH}
                  rx={Math.min(3, barW / 2)}
                  fill={fill}
                  opacity={bar.duration > 0 ? 0.85 : 0.3}
                >
                  <title>{bar.day} {fmtDate(bar.date)}: {bar.duration > 0 ? fmtDuration(bar.duration) : 'No log'}</title>
                </rect>
                {/* X-axis label */}
                {(days <= 7 || i % 3 === 0) && (
                  <text
                    x={x + barW / 2} y={H - 6}
                    textAnchor="middle" fontSize={days <= 7 ? '9' : '7'}
                    fill={bar.duration > 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)'}
                    fontFamily={FONT} fontWeight={bar.duration > 0 ? '700' : '400'}
                  >
                    {days <= 7 ? bar.day : bar.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
        {[
          { color: '#22c55e', label: 'Good (4-5)' },
          { color: '#eab308', label: 'Okay (3)' },
          { color: '#ef4444', label: 'Poor (1-2)' },
          { color: '#818cf8', label: 'Average', dash: true },
        ].map(({ color, label, dash }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 12, height: dash ? 2 : 8, borderRadius: dash ? 0 : 2,
              background: color, opacity: 0.85,
              borderTop: dash ? `2px dashed ${color}` : 'none',
            }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stats Cards ──────────────────────────────────────────────────────────────

function StatsPanel({ entries, range }) {
  const days = range === 30 ? 30 : 7;

  const rangeEntries = useMemo(() => {
    const cutoff = dateKey(days);
    return entries.filter(e => e.date >= cutoff && e.duration > 0);
  }, [entries, days]);

  const avgDuration = useMemo(() => {
    if (!rangeEntries.length) return 0;
    return rangeEntries.reduce((a, e) => a + e.duration, 0) / rangeEntries.length;
  }, [rangeEntries]);

  const avgQuality = useMemo(() => {
    const q = rangeEntries.filter(e => e.quality > 0);
    if (!q.length) return 0;
    return q.reduce((a, e) => a + e.quality, 0) / q.length;
  }, [rangeEntries]);

  const score = useMemo(() => calcSleepScore(rangeEntries), [rangeEntries]);

  const { best, worst } = useMemo(() => {
    if (!rangeEntries.length) return { best: null, worst: null };
    let b = rangeEntries[0], w = rangeEntries[0];
    rangeEntries.forEach(e => {
      if (e.duration > b.duration) b = e;
      if (e.duration < w.duration) w = e;
    });
    return { best: b, worst: w };
  }, [rangeEntries]);

  const scoreColor = score >= 80 ? '#34c98a' : score >= 60 ? '#4f9cf9' : '#fbbf24';

  // Ring animation
  const R = 32;
  const CIRC = 2 * Math.PI * R;
  const dash = (score / 100) * CIRC;
  const gap = CIRC - dash;

  return (
    <div>
      {/* Score + stats row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        {/* Score ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            ...CARD, marginBottom: 0, flex: '0 0 auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '16px 20px',
          }}
        >
          <div style={{ position: 'relative', width: 80, height: 80 }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r={R} fill="none"
                stroke={scoreColor} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={CIRC / 4}
                style={{ transition: 'stroke-dasharray 0.8s ease', filter: `drop-shadow(0 0 6px ${scoreColor}88)` }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: scoreColor, fontFamily: FONT_HEAD, lineHeight: 1 }}>
                {score}
              </span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                score
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stat cards */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...CARD, marginBottom: 0, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Avg Duration
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: avgDuration > 0 ? DUR_COLOR(avgDuration) : 'rgba(255,255,255,0.2)', fontFamily: FONT_HEAD }}>
              {avgDuration > 0 ? fmtDuration(avgDuration) : '\u2014'}
            </div>
          </div>
          <div style={{ ...CARD, marginBottom: 0, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Avg Quality
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: avgQuality > 0 ? QUALITY_COLOR[Math.round(avgQuality)] : 'rgba(255,255,255,0.2)', fontFamily: FONT_HEAD }}>
                {avgQuality > 0 ? avgQuality.toFixed(1) : '\u2014'}
              </span>
              {avgQuality > 0 && (
                <span style={{ fontSize: 16 }}>{QUALITY_EMOJI[Math.round(avgQuality)]}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Best / Worst nights */}
      {best && worst && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ ...CARD, marginBottom: 0, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Best Night
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e', fontFamily: FONT_HEAD }}>
              {fmtDuration(best.duration)}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {fmtDate(best.date)} ({shortDay(best.date)})
            </div>
          </div>
          <div style={{ ...CARD, marginBottom: 0, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Worst Night
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', fontFamily: FONT_HEAD }}>
              {fmtDuration(worst.duration)}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {fmtDate(worst.date)} ({shortDay(worst.date)})
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function SleepTrends() {
  const [sleepLog, setSleepLog] = useState(loadSleepLog);
  const [range, setRange] = useState(7); // 7 | 30
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(0);
  const [saved, setSaved] = useState(false);

  const duration = parseDuration(bedtime, wakeTime);
  const canSave = quality > 0 && bedtime && wakeTime && duration > 0;

  const persistLog = useCallback((newLog) => {
    setSleepLog(newLog);
    saveSleepLog(newLog);
  }, []);

  function handleSave() {
    if (!canSave) return;
    const today = todayStr();
    const entry = {
      date: today,
      bedtime,
      wakeTime,
      quality,
      duration: parseDuration(bedtime, wakeTime),
    };
    const newLog = [...sleepLog.filter(e => e.date !== today), entry];
    persistLog(newLog);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDelete(date) {
    persistLog(sleepLog.filter(e => e.date !== date));
  }

  // Check if today already logged
  const todayEntry = useMemo(
    () => sleepLog.find(e => e.date === todayStr()),
    [sleepLog]
  );

  return (
    <div style={{ padding: '16px 0', fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 22 }}>{'\uD83D\uDCA4'}</span>
        <h2 style={{ margin: 0, fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>
          Sleep Trends
        </h2>
      </div>

      {/* Range toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[7, 30].map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              background: range === r ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
              color: range === r ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${range === r ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`,
              padding: '6px 14px', borderRadius: 20, fontSize: 13,
              fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
              transition: 'all 0.2s',
            }}
          >
            {r} Days
          </button>
        ))}
      </div>

      {/* Stats Panel */}
      <StatsPanel entries={sleepLog} range={range} />

      {/* Bar Chart */}
      <SleepBarChart entries={sleepLog} range={range} />

      {/* Log Sleep Form */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>
          {todayEntry ? 'Update Today\'s Sleep' : 'Log Sleep'}
        </div>

        {/* Time inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5, fontWeight: 600 }}>
              {'\uD83C\uDF19'} Bedtime
            </div>
            <input
              type="time"
              value={bedtime}
              onChange={e => setBedtime(e.target.value)}
              style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5, fontWeight: 600 }}>
              {'\u2600\uFE0F'} Wake Time
            </div>
            <input
              type="time"
              value={wakeTime}
              onChange={e => setWakeTime(e.target.value)}
              style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Duration preview */}
        {duration > 0 && (
          <div style={{
            textAlign: 'center', marginBottom: 14, padding: '8px',
            background: DUR_COLOR(duration) + '18',
            border: '1px solid ' + DUR_COLOR(duration) + '40',
            borderRadius: 8,
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: DUR_COLOR(duration), fontFamily: FONT_HEAD }}>
              {fmtDuration(duration)}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
              auto-calculated
            </span>
          </div>
        )}

        {/* Quality picker */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...SECTION_LABEL, marginBottom: 10 }}>Sleep Quality</div>
          <QualityPicker value={quality} onChange={setQuality} />
          {quality > 0 && (
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: QUALITY_COLOR[quality], fontWeight: 700 }}>
              {QUALITY_EMOJI[quality]} {QUALITY_LABEL[quality]}
            </div>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={canSave ? BTN_PRIMARY : BTN_DISABLED}
        >
          {saved ? 'Saved \u2713' : todayEntry ? 'Update Log' : 'Save Sleep Log'}
        </button>
      </div>

      {/* Recent entries */}
      {sleepLog.length > 0 && (
        <div>
          <div style={SECTION_LABEL}>Recent Entries</div>
          <AnimatePresence>
            {[...sleepLog]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 10)
              .map(entry => (
                <motion.div
                  key={entry.date}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  style={{
                    ...CARD,
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{QUALITY_EMOJI[entry.quality] || '\uD83D\uDCA4'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
                      {fmtDate(entry.date)}
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>
                        {shortDay(entry.date)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      {entry.bedtime} {'\u2192'} {entry.wakeTime}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: DUR_COLOR(entry.duration), fontFamily: FONT_HEAD }}>
                      {fmtDuration(entry.duration)}
                    </div>
                    <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end', marginTop: 3 }}>
                      {[1, 2, 3, 4, 5].map(q => (
                        <div
                          key={q}
                          style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: q <= entry.quality ? QUALITY_COLOR[entry.quality] : 'rgba(255,255,255,0.12)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.date)}
                    title="Delete entry"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.2)', padding: 4, borderRadius: 6,
                      fontSize: 14, transition: 'color 0.2s', lineHeight: 1,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                  >
                    {'\u2715'}
                  </button>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {sleepLog.length === 0 && (
        <div style={{ ...CARD, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{'\uD83C\uDF19'}</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>No sleep data yet.</div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 4 }}>
            Log your first night above to start tracking trends.
          </div>
        </div>
      )}
    </div>
  );
}
