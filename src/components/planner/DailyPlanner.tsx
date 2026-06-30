import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { usePlannerStore } from '@/store/usePlannerStore';
import PlannerGreeting from './PlannerGreeting';
import EnergySelector from './EnergySelector';
import DailyIntention from './DailyIntention';
import TopPriorities from './TopPriorities';
import DailyReview from './DailyReview';

export default function DailyPlanner() {
  const { createPlan, setIntention, setEnergyLevel, setTopPriorities, submitReview, getToday } = usePlannerStore();
  const [reviewOpen, setReviewOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0]!;

  useEffect(() => {
    createPlan(today);
  }, [today, createPlan]);

  const plan = getToday();
  if (!plan) return null;

  const hour = new Date().getHours();
  const showReviewPrompt = hour >= 20 && !plan.review;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <PlannerGreeting />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-5"
      >
        <DailyIntention
          value={plan.intention}
          onChange={(v) => setIntention(today, v)}
        />

        <EnergySelector
          value={plan.energyLevel}
          onChange={(v) => setEnergyLevel(today, v)}
        />

        <TopPriorities
          taskIds={plan.topPriorities}
          onChange={(ids) => setTopPriorities(today, ids)}
        />

        {/* End-of-day review prompt */}
        {showReviewPrompt && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setReviewOpen(true)}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
          >
            <BookOpen size={18} className="text-amber-400" />
            <div className="text-left">
              <p className="text-sm font-medium text-fg-secondary">Time to reflect</p>
              <p className="text-xs text-fg-muted">How did today go? Tap to review.</p>
            </div>
          </motion.button>
        )}

        {plan.review && (
          <div className="p-3 rounded-xl border border-border bg-surface-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-fg-muted">Today's review:</span>
              <span className="text-xs">{'⭐'.repeat(plan.review.rating)}</span>
            </div>
            {plan.review.notes && (
              <p className="text-xs text-fg-muted">{plan.review.notes}</p>
            )}
          </div>
        )}
      </motion.div>

      <DailyReview
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSubmit={(rating, notes) => submitReview(today, rating, notes)}
      />
    </div>
  );
}
