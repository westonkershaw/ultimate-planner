import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';

interface DailyReviewProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, notes: string) => void;
}

export default function DailyReview({ open, onClose, onSubmit }: DailyReviewProps) {
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit(rating, notes);
    setNotes('');
    setRating(3);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md bg-[#0f1829]/95 backdrop-blur-xl border border-border rounded-panel p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-syne text-base font-bold text-fg">End of Day Review</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg text-fg-muted hover:text-fg-secondary transition-colors">
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-fg-muted">How did today go?</p>

            {/* Star rating */}
            <div className="flex gap-2 justify-center py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setRating(star)}
                >
                  <Star
                    size={28}
                    className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-fg-faint'}
                  />
                </motion.button>
              ))}
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any reflections on today..."
              rows={3}
              className="w-full bg-surface-1 border border-border rounded-xl px-4 py-3 text-sm text-fg-secondary placeholder:text-fg-faint focus:outline-none focus:border-accent/50 resize-none"
            />

            <button
              onClick={handleSubmit}
              className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Save Review
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
