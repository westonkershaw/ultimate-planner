import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { useFinanceStore } from '@/store';
import { calcSpendingPace, formatPaceMessage } from '@/utils/spendingPace';
import { fmt$ } from '@/utils/financeEngine';

const GAUGE_SIZE = 160;
const STROKE_WIDTH = 12;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = Math.PI * RADIUS; // Semi-circle

export default function SpendingPaceWidget() {
  const { transactions, income, budgetSplits } = useFinanceStore();

  const pace = useMemo(
    () => calcSpendingPace(transactions, income, budgetSplits),
    [transactions, income, budgetSplits],
  );

  const message = formatPaceMessage(pace);

  if (income <= 0) return null;

  // Gauge fill: how much of spendable budget has been used
  const gaugeProgress = Math.min(pace.spentPct / 100, 1);
  const dashOffset = CIRCUMFERENCE * (1 - gaugeProgress);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-6">
        {/* Semi-circle gauge */}
        <div className="flex-shrink-0 relative" style={{ width: GAUGE_SIZE, height: GAUGE_SIZE / 2 + 16 }}>
          <svg
            width={GAUGE_SIZE}
            height={GAUGE_SIZE / 2 + 16}
            viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE / 2 + 16}`}
          >
            {/* Track */}
            <path
              d={describeArc(GAUGE_SIZE / 2, GAUGE_SIZE / 2 + 4, RADIUS, 180, 360)}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            />
            {/* Fill */}
            <motion.path
              d={describeArc(GAUGE_SIZE / 2, GAUGE_SIZE / 2 + 4, RADIUS, 180, 360)}
              fill="none"
              stroke={pace.statusColor}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ type: 'spring', stiffness: 60, damping: 20 }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <div className="text-xl font-bold text-fg">{pace.spentPct}%</div>
            <div className="text-[10px] text-fg-muted">of budget used</div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="text-sm font-bold text-fg mb-1">Spending Pace</div>
            <div className="text-xs" style={{ color: pace.statusColor }}>
              {message}
            </div>
          </div>

          {/* Time vs money progress bars */}
          <div className="space-y-2">
            <ProgressRow
              label={`Day ${pace.daysElapsed} of ${pace.daysInMonth}`}
              pct={pace.daysPct}
              color="#14b8a6"
            />
            <ProgressRow
              label={`${fmt$(pace.amountSpent)} of ${fmt$(pace.monthlyBudget)}`}
              pct={pace.spentPct}
              color={pace.statusColor}
            />
          </div>

          {/* Daily average */}
          <div className="text-[11px] text-fg-muted">
            Avg. {fmt$(pace.dailyAvg)}/day
            {' · '}
            {pace.daysInMonth - pace.daysElapsed} days left
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProgressRow({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-fg-muted">{label}</span>
        <span className="text-[10px] font-semibold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
    </div>
  );
}

/**
 * Generate SVG arc path for a semi-circle gauge.
 */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}
