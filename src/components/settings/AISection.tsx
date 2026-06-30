import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bot } from 'lucide-react';
import { useLegacyDataStore, useUIStore } from '@/store';

export default function AISection() {
  const data = useLegacyDataStore((s) => s.data) as { userName?: string; firstName?: string };
  const addToast = useUIStore((s) => s.addToast);
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/weekly-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, userName: data.userName || data.firstName }),
      });
      const json = (await res.json()) as { insight?: string };
      if (json.insight) {
        setInsight(json.insight);
        addToast('Weekly insight ready', 'success');
      } else {
        addToast('Could not generate insight', 'warning');
      }
    } catch {
      addToast('Failed to reach AI', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      aria-labelledby="ai-heading"
    >
      <div className="flex items-center gap-2">
        <Bot size={14} className="text-fg-muted" />
        <h2 id="ai-heading" className="text-xs font-medium text-fg-muted uppercase tracking-wider">AI Coach</h2>
      </div>

      <div className="p-4 rounded-xl border border-accent/20 bg-accent/[0.04] space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-card bg-accent flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-fg-secondary">Weekly AI Insights</div>
            <div className="text-[11px] text-fg-muted">Personalized summary powered by Claude</div>
          </div>
        </div>

        {insight && (
          <div className="text-sm text-fg-secondary leading-relaxed p-3 rounded-lg bg-surface-1 border border-border">
            {insight}
          </div>
        )}

        <button
          onClick={generate}
          disabled={loading}
          className={[
            'w-full py-2.5 rounded-xl border text-sm font-medium transition-colors',
            loading
              ? 'border-border-strong bg-surface-2 text-fg-muted cursor-not-allowed'
              : 'border-accent/30 bg-accent/15 text-accent-text hover:bg-accent/25',
          ].join(' ')}
        >
          {loading ? 'Generating…' : '💡 Generate weekly insight'}
        </button>
      </div>
    </motion.section>
  );
}
