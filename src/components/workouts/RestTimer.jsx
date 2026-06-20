import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import { formatRestTime } from '../../utils/math';

const PRESETS = [
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
];

// ── Color ramp: green → yellow → red ─────────────────────────────────────
function arcColor(progress) {
  if (progress > 0.5) return '#10b981'; // green
  if (progress > 0.25) return '#f59e0b'; // yellow
  return '#ef4444'; // red
}

// ── RestTimer ─────────────────────────────────────────────────────────────

const RestTimer = React.memo(function RestTimer({
  onComplete,
  autoStart = false,
  defaultDuration = 90,
}) {
  const [duration, setDuration] = useState(defaultDuration);
  const [remaining, setRemaining] = useState(defaultDuration);
  const [running, setRunning] = useState(autoStart);
  const intervalRef = useRef(null);

  const SIZE = 140;
  const STROKE = 10;
  const r = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = duration > 0 ? remaining / duration : 0;
  const dashOffset = circumference * (1 - progress);
  const color = arcColor(progress);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    setRunning(true);
  }, []);

  const reset = useCallback(
    (dur) => {
      const d = dur ?? duration;
      clearInterval(intervalRef.current);
      setRemaining(d);
      setRunning(false);
    },
    [duration],
  );

  const changeDuration = useCallback(
    (dur) => {
      setDuration(dur);
      reset(dur);
    },
    [reset],
  );

  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, onComplete]);

  const timeLabel = formatRestTime(remaining);

  return (
    <div
      className="flex flex-col items-center gap-4"
      role="timer"
      aria-label={`Rest timer: ${timeLabel} remaining`}
      aria-live="off"
    >
      {/* "Next set in..." hint */}
      <AnimatePresence>
        {running && remaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs font-medium text-slate-400 tracking-wide"
            aria-live="polite"
          >
            Next set in...
          </motion.div>
        )}
        {remaining === 0 && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs font-semibold text-emerald-400 tracking-wide"
            aria-live="assertive"
          >
            Rest complete!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Circular SVG ring */}
      <div
        className="relative cursor-pointer"
        onClick={remaining === 0 ? onComplete : undefined}
        title={remaining === 0 ? 'Tap to dismiss' : undefined}
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
        >
          {/* Outer glow track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={STROKE}
          />
          {/* Progress arc */}
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            animate={{ strokeDashoffset: dashOffset, stroke: color }}
            transition={{ type: 'spring', stiffness: 60, damping: 20 }}
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
          {/* Time label */}
          <text
            x={SIZE / 2}
            y={SIZE / 2 + 6}
            textAnchor="middle"
            fill="white"
            fontSize="26"
            fontWeight="700"
            fontFamily="'Syne', sans-serif"
          >
            {timeLabel}
          </text>
        </svg>

        {/* "Tap to dismiss" hint when complete */}
        <AnimatePresence>
          {remaining === 0 && (
            <motion.div
              key="dismiss"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 -bottom-5 text-center text-[10px] text-slate-600"
              aria-hidden="true"
            >
              Tap to dismiss
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-1">
        {running ? (
          <Button variant="ghost" size="sm" onClick={stop}>Pause</Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={start}
            disabled={remaining === 0}
          >
            {remaining === duration ? 'Start' : 'Resume'}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => reset(duration)}>Reset</Button>
        {onComplete && (
          <Button variant="ghost" size="sm" onClick={onComplete}>Skip</Button>
        )}
      </div>

      {/* Preset buttons */}
      <div className="flex gap-1.5" role="group" aria-label="Rest duration presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.seconds}
            onClick={() => changeDuration(preset.seconds)}
            className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
              duration === preset.seconds
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40'
                : 'bg-white/5 text-slate-600 hover:text-slate-300 border border-white/10'
            }`}
            aria-pressed={duration === preset.seconds}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
});

export default RestTimer;
