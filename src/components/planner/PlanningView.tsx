import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, CalendarRange, Check, ArrowRight, Brain } from 'lucide-react';
import { usePlanningStore, useProfileStore } from '@/store';
import { periodIndex } from '@/utils/streakEngine';
import PlanProgress from './PlanProgress';
import WeekReflection from './WeekReflection';
import WeekWizard from './WeekWizard';
import MonthWizard from './MonthWizard';

function RitualCard({
  Icon, title, subtitle, done, onClick,
}: { Icon: typeof CalendarCheck; title: string; subtitle: string; done: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex-1 text-left rounded-panel border border-border bg-surface-1 p-5 hover:border-accent/40 transition-colors group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-card flex items-center justify-center ${done ? 'bg-accent/10' : 'bg-surface-2'}`}>
          <Icon size={19} className={done ? 'text-accent-text' : 'text-fg-secondary'} />
        </div>
        {done ? (
          <span className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-accent-text">
            <Check size={13} /> Planned
          </span>
        ) : (
          <ArrowRight size={16} className="text-fg-faint group-hover:text-accent-text transition-colors" />
        )}
      </div>
      <p className="text-base font-bold text-fg">{title}</p>
      <p className="text-xs text-fg-muted mt-0.5">{done ? 'Done — reopen to adjust anytime.' : subtitle}</p>
    </motion.button>
  );
}

export default function PlanningView() {
  const [showWeek, setShowWeek] = useState(false);
  const [showMonth, setShowMonth] = useState(false);
  const weeks = usePlanningStore((s) => s.weeks);
  const months = usePlanningStore((s) => s.months);
  const weekPlanned = !!weeks[periodIndex(new Date(), 'week')];
  const monthRec = months[periodIndex(new Date(), 'month')];
  const monthPlanned = !!monthRec && monthRec.completedAt > 0;
  const insights = useProfileStore((s) => s.profile?.insights ?? []);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-fg">Plan &amp; Reflect</h1>
        <p className="text-sm text-fg-muted mt-1">
          A short ritual to set your week and month — pre-filled from what actually works for you.
        </p>
      </div>

      <PlanProgress />

      <div className="flex flex-col sm:flex-row gap-3">
        <RitualCard
          Icon={CalendarCheck}
          title="Plan your week"
          subtitle="7 quick days, one-tap accept."
          done={weekPlanned}
          onClick={() => setShowWeek(true)}
        />
        <RitualCard
          Icon={CalendarRange}
          title="Plan your month"
          subtitle="Set 2–3 focuses that matter."
          done={monthPlanned}
          onClick={() => setShowMonth(true)}
        />
      </div>

      <WeekReflection />

      {/* What we've learned — the recursion made visible. */}
      <div className="rounded-panel border border-border bg-surface-1 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={15} className="text-accent-text" />
          <p className="text-sm font-semibold text-fg">What the planner has learned about you</p>
        </div>
        {insights.length ? (
          <ul className="space-y-2">
            {insights.slice(0, 3).map((i) => (
              <li key={i.id} className="flex items-start gap-2 text-sm text-fg-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                {i.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-fg-muted">
            Plan a couple of weeks and check things off — patterns show up here, and your plans start to fit better. You
            can view and edit everything in Settings.
          </p>
        )}
      </div>

      <WeekWizard open={showWeek} onClose={() => setShowWeek(false)} />
      <MonthWizard open={showMonth} onClose={() => setShowMonth(false)} />
    </div>
  );
}
