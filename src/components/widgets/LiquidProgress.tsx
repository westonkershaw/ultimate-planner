import { useRef } from 'react';
import { useAnimationFrame, motion } from 'framer-motion';
import { useFinanceStore } from '@/store/useFinanceStore';
import type { FinanceGoal } from '@/types';

// ── Wave path helper ─────────────────────────────────────────────────────────

function buildWavePath(
  width: number,
  height: number,
  fillY: number,
  offset: number,
  amplitude: number,
): string {
  const waveWidth = width * 2;
  const step = width / 4;
  const x0 = -(offset % waveWidth);
  let d = `M ${x0} ${fillY}`;
  for (let i = 0; i < 5; i++) {
    d += ` C ${x0 + step * (i * 2)} ${fillY - amplitude}, ${x0 + step * (i * 2 + 1)} ${fillY + amplitude}, ${x0 + step * (i * 2 + 2)} ${fillY}`;
  }
  return `${d} L ${x0 + waveWidth} ${height} L ${x0} ${height} Z`;
}

// ── Animated wave fill ───────────────────────────────────────────────────────

interface WaveFillProps { width: number; height: number; fillY: number; clipId: string; }

function WaveFill({ width, height, fillY, clipId }: WaveFillProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const offsetRef = useRef(0);

  useAnimationFrame((_, delta) => {
    offsetRef.current += delta * 0.04;
    if (pathRef.current) {
      pathRef.current.setAttribute('d', buildWavePath(width, height, fillY, offsetRef.current, 6));
    }
  });

  return (
    <g clipPath={`url(#${clipId})`}>
      <defs>
        <linearGradient id={`wg-${clipId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path
        ref={pathRef}
        d={buildWavePath(width, height, fillY, 0, 6)}
        fill={`url(#wg-${clipId})`}
        opacity={0.9}
      />
    </g>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface LiquidProgressProps {
  goalId?: string;
  width?: number;
  height?: number;
  className?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// ── Component ────────────────────────────────────────────────────────────────

export default function LiquidProgress({ goalId, width = 200, height = 200, className = '' }: LiquidProgressProps) {
  const goals = useFinanceStore((s) => s.goals);
  const goal: FinanceGoal | undefined = goalId ? goals.find((g) => g.id === goalId) : goals[0];

  const progressPct =
    goal && goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
      : 0;

  const fillY = height * (1 - progressPct / 100);
  const radius = Math.min(width, height) / 2;
  const cx = width / 2;
  const cy = height / 2;
  const clipId = `lc-${goalId ?? 'default'}`;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block" aria-hidden="true">
          <defs>
            <clipPath id={clipId}>
              <circle cx={cx} cy={cy} r={radius - 4} />
            </clipPath>
          </defs>
          <circle cx={cx} cy={cy} r={radius - 4} fill="#0f0e17" />
          <WaveFill width={width} height={height} fillY={fillY} clipId={clipId} />
          <circle cx={cx} cy={cy} r={radius - 4} fill="none" stroke="#312e81" strokeWidth={3} />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span
            key={progressPct}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="text-3xl font-bold text-white tabular-nums drop-shadow-lg"
          >
            {progressPct}%
          </motion.span>
        </div>
      </div>

      {goal ? (
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-sm font-semibold text-white truncate max-w-[180px]">
            {goal.name || 'Unnamed Goal'}
          </span>
          <span className="text-xs text-slate-400">
            {fmt(goal.currentAmount)} <span className="text-slate-600">/</span> {fmt(goal.targetAmount)}
          </span>
        </div>
      ) : (
        <span className="text-xs text-slate-500">No active goal</span>
      )}
    </div>
  );
}
