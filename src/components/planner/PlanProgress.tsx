import { useMemo } from 'react';
import { Flame, Shield, CalendarCheck } from 'lucide-react';
import { usePlanningStore, usePlannerStore } from '@/store';
import { streakMessage } from '@/utils/streakEngine';

/** Monday (YYYY-MM-DD) of the current week. */
function getMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(now);
  m.setDate(now.getDate() + diff);
  return m.toISOString().split('T')[0]!;
}

function Ring({ value, max, label, count }: { value: number; max: number; label: string; count: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[76px] h-[76px]">
        <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
          <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="7" />
          <circle
            cx="38" cy="38" r={r} fill="none" stroke="var(--color-accent)" strokeWidth="7"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-fg tabular-nums">{count}</span>
        </div>
      </div>
      <span className="text-[10px] font-mono uppercase tracking-wider text-fg-faint">{label}</span>
    </div>
  );
}

export default function PlanProgress() {
  // Subscribe to the underlying records so streaks recompute on change.
  const weeks = usePlanningStore((s) => s.weeks);
  const months = usePlanningStore((s) => s.months);
  const weekStreak = useMemo(() => usePlanningStore.getState().weekStreak(), [weeks]);
  const monthStreak = useMemo(() => usePlanningStore.getState().monthStreak(), [months]);
  const plans = usePlannerStore((s) => s.plans);

  const filledThisWeek = useMemo(() => {
    const monday = getMonday();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday + 'T00:00:00');
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0]!;
    });
    return days.filter((d) => plans.find((p) => p.date === d && p.intention.trim())).length;
  }, [plans]);

  return (
    <div className="rounded-panel border border-border bg-surface-1 p-5">
      <div className="flex items-center justify-around gap-4">
        <Ring value={weekStreak.current} max={12} label="week streak" count={weekStreak.current} />
        <Ring value={monthStreak.current} max={6} label="month streak" count={monthStreak.current} />
      </div>

      <div className="mt-4 flex items-start gap-2">
        <Flame size={15} className="text-accent-text mt-0.5 flex-shrink-0" />
        <p className="text-sm text-fg-secondary leading-snug">{streakMessage(weekStreak, 'week')}</p>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <CalendarCheck size={13} className="text-fg-faint" />
          {filledThisWeek}/7 days set this week
        </span>
        {weekStreak.freezesRemaining > 0 && (
          <span className="flex items-center gap-1" title="Streak freezes protect a missed week">
            {Array.from({ length: Math.min(weekStreak.freezesRemaining, 3) }).map((_, i) => (
              <Shield key={i} size={13} className="text-accent-text" />
            ))}
            <span className="text-fg-faint">freeze{weekStreak.freezesRemaining > 1 ? 's' : ''}</span>
          </span>
        )}
      </div>
    </div>
  );
}
