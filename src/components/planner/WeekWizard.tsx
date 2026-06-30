import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Sparkles, Target } from 'lucide-react';
import { usePlannerStore } from '@/store/usePlannerStore';
import WeekOverview from './WeekOverview';
import WeekDayStep from './WeekDayStep';

interface WeekWizardProps {
  open: boolean;
  onClose: () => void;
}

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TOTAL_STEPS = 9; // 0=overview, 1-7=days, 8=summary

function getMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0]!;
}

function offsetDate(monday: string, offset: number): string {
  const d = new Date(monday + 'T00:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0]!;
}

function formatWeekRange(monday: string): string {
  const start = new Date(monday + 'T00:00:00');
  const end = new Date(monday + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function WeekWizard({ open, onClose }: WeekWizardProps) {
  const [step, setStep] = useState(0);
  const mondayDate = useMemo(getMonday, []);
  const { ensureWeekPlans, plans } = usePlannerStore();

  useEffect(() => {
    if (open) {
      ensureWeekPlans(mondayDate);
      setStep(0);
    }
  }, [open, mondayDate, ensureWeekPlans]);

  const progress = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  const goNext = useCallback(() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1)), []);
  const goPrev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const goToDay = useCallback((dayIndex: number) => setStep(dayIndex + 1), []);

  const weekPlans = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const date = offsetDate(mondayDate, i);
      return plans.find((p) => p.date === date);
    }),
    [mondayDate, plans],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[700] bg-black/92 backdrop-blur-[14px] flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-[#0d1424] rounded-panel border border-accent/20 w-full max-w-[680px] max-h-[92vh] overflow-hidden flex flex-col"
        style={{ boxShadow: '0 0 80px rgba(45, 212, 191,0.1)' }}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-accent-text uppercase tracking-[2px] font-bold mb-0.5">
                {step === 0
                  ? 'Week Overview'
                  : step <= 7
                    ? `Day ${step} of 7`
                    : 'Week Summary'}
              </div>
              <h2 className="text-xl font-bold text-fg font-[Syne]">
                {step === 0
                  ? formatWeekRange(mondayDate)
                  : step <= 7
                    ? DAY_LABELS[step - 1]
                    : 'You\'re All Set'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-fg-faint hover:text-fg-muted transition-colors p-1"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="bg-surface-1 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #14b8a6, #34d399)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* Day pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setStep(0)}
              className={[
                'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex-shrink-0',
                step === 0
                  ? 'bg-accent text-white'
                  : 'bg-white/5 text-fg-muted hover:text-fg-secondary',
              ].join(' ')}
            >
              Overview
            </button>
            {DAY_SHORT.map((d, i) => {
              const plan = weekPlans[i];
              const filled = plan?.intention || (plan?.topPriorities?.length ?? 0) > 0;
              return (
                <button
                  key={d}
                  onClick={() => setStep(i + 1)}
                  className={[
                    'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex-shrink-0',
                    step === i + 1
                      ? 'bg-accent text-white'
                      : 'bg-white/5 text-fg-muted hover:text-fg-secondary',
                  ].join(' ')}
                >
                  {d} {filled ? <Check size={10} className="inline ml-0.5" /> : ''}
                </button>
              );
            })}
            <button
              onClick={() => setStep(8)}
              className={[
                'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex-shrink-0',
                step === 8
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/5 text-fg-muted hover:text-fg-secondary',
              ].join(' ')}
            >
              Summary
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              {step === 0 && (
                <WeekOverview mondayDate={mondayDate} onSelectDay={goToDay} />
              )}

              {step >= 1 && step <= 7 && (
                <WeekDayStep
                  date={offsetDate(mondayDate, step - 1)}
                  dayLabel={DAY_LABELS[step - 1]!}
                />
              )}

              {step === 8 && (
                <SummaryStep mondayDate={mondayDate} weekPlans={weekPlans} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-shrink-0 bg-[#08090d]/60">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={goPrev}
            disabled={step === 0}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              step === 0
                ? 'opacity-30 cursor-not-allowed text-fg-muted'
                : 'bg-white/5 text-fg-secondary hover:bg-white/10',
            ].join(' ')}
          >
            <ChevronLeft size={16} />
            {step === 1 ? 'Overview' : step > 1 && step <= 7 ? DAY_SHORT[step - 2] : 'Back'}
          </motion.button>

          <span className="text-xs text-fg-faint">
            {step >= 1 && step <= 7
              ? `${weekPlans[step - 1]?.topPriorities?.length ?? 0} priorities`
              : ''}
          </span>

          {step === 8 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
            >
              <Check size={16} />
              Done Planning
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={goNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-accent/20 text-accent-text border border-accent/30 hover:bg-accent/30 transition-all"
            >
              {step === 0 ? 'Start Planning' : step < 7 ? DAY_SHORT[step] : 'Summary'}
              <ChevronRight size={16} />
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Summary Step (inline, <150 lines total) ────────────────────────────────

interface SummaryStepProps {
  mondayDate: string;
  weekPlans: (ReturnType<typeof usePlannerStore.getState>['plans'][number] | undefined)[];
}

function SummaryStep({ mondayDate, weekPlans }: SummaryStepProps) {
  const filledDays = weekPlans.filter((p) => p?.intention).length;
  const totalPriorities = weekPlans.reduce((sum, p) => sum + (p?.topPriorities?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="text-4xl">&#127775;</div>
        <h3 className="text-lg font-bold text-fg font-[Syne]">Week Planned</h3>
        <p className="text-xs text-fg-muted">
          {filledDays} day{filledDays !== 1 ? 's' : ''} with intentions &middot; {totalPriorities} priorities set
        </p>
      </div>

      <div className="space-y-2">
        {DAY_LABELS.map((_label, i) => {
          const plan = weekPlans[i];
          const date = offsetDate(mondayDate, i);
          return (
            <div
              key={date}
              className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface-1"
            >
              <div className="w-10 text-center flex-shrink-0">
                <span className="text-[10px] font-bold text-fg-muted uppercase">{DAY_SHORT[i]}</span>
              </div>
              <div className="flex-1 min-w-0">
                {plan?.intention ? (
                  <div className="flex items-start gap-1.5">
                    <Sparkles size={11} className="text-accent-text mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-fg-secondary truncate">{plan.intention}</span>
                  </div>
                ) : (
                  <span className="text-sm text-fg-faint italic">No intention</span>
                )}
                {(plan?.topPriorities?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Target size={10} className="text-accent-text/60" />
                    <span className="text-[10px] text-fg-muted">
                      {plan!.topPriorities.length} priorit{plan!.topPriorities.length === 1 ? 'y' : 'ies'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <div
                    key={lvl}
                    className={`w-1.5 h-4 rounded-full ${
                      lvl <= (plan?.energyLevel ?? 0)
                        ? 'bg-accent-hover/60'
                        : 'bg-surface-2'
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
