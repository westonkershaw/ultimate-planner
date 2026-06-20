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
        <Bot size={14} className="text-slate-500" />
        <h2 id="ai-heading" className="text-xs font-medium text-slate-500 uppercase tracking-wider">AI Coach</h2>
      </div>

      <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-200">Weekly AI Insights</div>
            <div className="text-[11px] text-slate-500">Personalized summary powered by Claude</div>
          </div>
        </div>

        {insight && (
          <div className="text-sm text-slate-300 leading-relaxed p-3 rounded-lg bg-slate-900/40 border border-slate-800/40">
            {insight}
          </div>
        )}

        <button
          onClick={generate}
          disabled={loading}
          className={[
            'w-full py-2.5 rounded-xl border text-sm font-medium transition-colors',
            loading
              ? 'border-slate-700/40 bg-slate-800/40 text-slate-500 cursor-not-allowed'
              : 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25',
          ].join(' ')}
        >
          {loading ? 'Generating…' : '💡 Generate weekly insight'}
        </button>
      </div>
    </motion.section>
  );
}
