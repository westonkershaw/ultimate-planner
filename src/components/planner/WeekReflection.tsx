import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';
import { useUIStore } from '@/store';
import { logLearningEvent } from '@/utils/learningEvents';
import { learnNow } from '@/utils/learnNow';

const FACES = ['😞', '😕', '😐', '🙂', '😄'];

/**
 * The reflection half of the loop — celebrates the week and feeds a rating into
 * the profile. Deliberately warm and never shaming: even a low rating is framed
 * as useful signal, and the takeaway is carried forward, not scored.
 */
export default function WeekReflection() {
  const addToast = useUIStore((s) => s.addToast);
  const [rating, setRating] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const save = (r: number) => {
    setRating(r);
    logLearningEvent('week_reviewed', { rating: r });
    void learnNow();
    setSaved(true);
    addToast('Reflection saved — it shapes next week’s plan.', 'success');
  };

  if (saved) {
    return (
      <div className="rounded-panel border border-border bg-surface-1 p-5 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Check size={17} className="text-accent-text" />
        </div>
        <div>
          <p className="text-sm font-semibold text-fg">Carried forward{rating ? ` ${FACES[rating - 1]}` : ''}</p>
          <p className="text-xs text-fg-muted mt-0.5">
            Your reflection just updated what the planner knows about you. Next week will fit a little better.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-border bg-surface-1 p-5">
      <div className="flex items-start gap-2 mb-3">
        <Sparkles size={15} className="text-accent-text mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-fg">How did last week feel?</p>
          <p className="text-xs text-fg-muted mt-0.5">A quick pulse — no wrong answer. It just helps us learn.</p>
        </div>
      </div>
      <div className="flex gap-2">
        {FACES.map((face, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.9 }}
            whileHover={{ y: -2 }}
            onClick={() => save(i + 1)}
            className="flex-1 py-3 rounded-card border border-border bg-surface-2 text-2xl hover:border-accent/40 transition-colors"
            aria-label={`Rate ${i + 1} of 5`}
          >
            {face}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
