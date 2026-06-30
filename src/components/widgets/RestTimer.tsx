import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAppSpring } from '@/hooks/useAppSpring';

const R = 45;
const CX = 60;
const CY = 60;
const CIRCUMFERENCE = 2 * Math.PI * R;

function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

interface ControlButtonProps {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

function ControlButton({ onClick, label, children }: ControlButtonProps) {
  const spring = useAppSpring();
  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.08 }}
      transition={spring}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-1 border border-border text-fg-muted hover:text-accent-text hover:border-accent/50 transition-colors"
    >
      {children}
    </motion.button>
  );
}

interface RestTimerProps {
  defaultSeconds?: number;
  onComplete?: () => void;
  className?: string;
}

export default function RestTimer({
  defaultSeconds = 90,
  onComplete,
  className = '',
}: RestTimerProps) {
  const spring = useAppSpring();
  const activeSession = useWorkoutStore((s) => s.activeSession);

  const restDuration = (() => {
    if (!activeSession) return defaultSeconds;
    const ex = activeSession.exercises[activeSession.currentExIndex];
    const set = ex?.sets[activeSession.currentSetIndex];
    return set?.rest ?? defaultSeconds;
  })();

  const [totalSeconds, setTotalSeconds] = useState(restDuration);
  const [remaining, setRemaining] = useState(restDuration);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTotalSeconds(restDuration);
    setRemaining(restDuration);
    setRunning(false);
    setCompleted(false);
  }, [restDuration]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          setRunning(false);
          setCompleted(true);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [running, clearTimer, onComplete]);

  const handleReset = () => {
    clearTimer();
    setRunning(false);
    setCompleted(false);
    setRemaining(totalSeconds);
  };

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className={`flex flex-col items-center gap-4 select-none ${className}`}>
      <div className="relative">
        <svg viewBox="0 0 120 120" width={120} height={120} className="block -rotate-90" aria-hidden="true">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e1b4b" strokeWidth={8} />
          <motion.circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="#14b8a6"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'linear' }}
            style={{ strokeDashoffset: CIRCUMFERENCE }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {completed ? (
              <motion.span
                key="done"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: [1, 1.15, 1], opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="text-xs font-semibold text-accent-text tracking-widest uppercase"
              >
                Done!
              </motion.span>
            ) : (
              <motion.span
                key="time"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-2xl font-bold tabular-nums text-white"
              >
                {formatTime(remaining)}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="text-[10px] text-fg-muted uppercase tracking-widest mt-0.5">rest</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ControlButton onClick={handleReset} label="Reset timer">
          <RotateCcw size={14} />
        </ControlButton>
        <motion.button
          onClick={() => !completed && setRunning((r) => !r)}
          aria-label={running ? 'Pause timer' : 'Start timer'}
          disabled={completed}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.06 }}
          transition={spring}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-accent hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg transition-colors"
        >
          {running ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </motion.button>
        <div className="w-8 h-8" aria-hidden="true" />
      </div>
    </div>
  );
}
