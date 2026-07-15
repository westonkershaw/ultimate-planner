import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Plus, Trash2, Check, Target } from 'lucide-react';
import { usePlanningStore, useProfileStore, makeMonthFocus, useUIStore, type MonthFocusItem } from '@/store';
import { suggestMonthPlan } from '@/utils/planSuggest';
import { periodIndex } from '@/utils/streakEngine';
import { logLearningEvent } from '@/utils/learningEvents';
import { learnNow } from '@/utils/learnNow';

interface MonthWizardProps {
  open: boolean;
  onClose: () => void;
}

export default function MonthWizard({ open, onClose }: MonthWizardProps) {
  const profile = useProfileStore((s) => s.profile);
  const monthIdx = useMemo(() => periodIndex(new Date(), 'month'), []);
  const stored = usePlanningStore((s) => s.months[monthIdx]);
  const setMonthFocuses = usePlanningStore((s) => s.setMonthFocuses);
  const completeMonth = usePlanningStore((s) => s.completeMonth);
  const addToast = useUIStore((s) => s.addToast);

  const suggestion = useMemo(() => (profile ? suggestMonthPlan(profile) : null), [profile]);
  const [focuses, setFocuses] = useState<MonthFocusItem[]>([]);
  const [usedSuggestion, setUsedSuggestion] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (stored?.focuses.length) setFocuses(stored.focuses);
    else if (suggestion) {
      setFocuses(suggestion.focuses.map((f) => makeMonthFocus(f.category, f.focus)));
      setUsedSuggestion(true);
    } else setFocuses([]);
  }, [open, stored, suggestion]);

  if (!open) return null;

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const update = (id: string, focus: string) => {
    setFocuses((f) => f.map((x) => (x.id === id ? { ...x, focus } : x)));
    setUsedSuggestion(false);
  };
  const remove = (id: string) => {
    setFocuses((f) => f.filter((x) => x.id !== id));
    setUsedSuggestion(false);
  };
  const add = () => {
    setFocuses((f) => [...f, makeMonthFocus('focus', '')]);
    setUsedSuggestion(false);
  };

  const finish = () => {
    const kept = focuses.filter((f) => f.focus.trim());
    setMonthFocuses(monthIdx, kept);
    completeMonth(monthIdx, kept);
    logLearningEvent(usedSuggestion && kept.length ? 'plan_accepted' : kept.length ? 'plan_edited' : 'plan_rejected', {
      itemCount: suggestion?.focuses.length ?? kept.length,
      keptCount: kept.length,
    });
    void learnNow();
    addToast(`${monthName} planned — ${kept.length} focus${kept.length === 1 ? '' : 'es'} set.`, 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-[10px] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-surface-1 rounded-panel border border-border w-full max-w-[560px] max-h-[92vh] overflow-hidden flex flex-col"
      >
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-[11px] text-accent-text uppercase tracking-[2px] font-bold mb-0.5 font-mono">
              Plan your month
            </div>
            <h2 className="text-xl font-bold text-fg">{monthName}</h2>
          </div>
          <button onClick={onClose} className="text-fg-faint hover:text-fg-muted p-1" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {suggestion && (
            <div className="flex items-start gap-2 text-xs text-fg-muted bg-surface-2 rounded-card p-3">
              <Sparkles size={13} className="text-accent-text mt-0.5 flex-shrink-0" />
              <span>{suggestion.basis}</span>
            </div>
          )}

          {focuses.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-card border border-border bg-surface-1 p-2.5">
              <Target size={15} className="text-accent-text flex-shrink-0" />
              <input
                value={f.focus}
                onChange={(e) => update(f.id, e.target.value)}
                placeholder="A focus for this month…"
                className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-faint outline-none"
              />
              <button onClick={() => remove(f.id)} className="text-fg-faint hover:text-accent-text p-1" aria-label="Remove">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <button
            onClick={add}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-card border border-dashed border-border text-sm text-fg-muted hover:text-fg-secondary hover:border-border-strong transition-colors"
          >
            <Plus size={14} /> Add a focus
          </button>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <span className="text-xs text-fg-faint">{focuses.filter((f) => f.focus.trim()).length} focuses</span>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={finish}
            className="flex items-center gap-1.5 px-5 py-2 rounded-control text-sm font-bold bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            <Check size={16} /> Month planned
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
