import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface DailyIntentionProps {
  value: string;
  onChange: (intention: string) => void;
}

export default function DailyIntention({ value, onChange }: DailyIntentionProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <Sparkles size={12} className="text-indigo-400" />
        Today's Intention
      </label>
      <motion.div
        animate={{ borderColor: focused ? 'rgba(99,102,241,0.5)' : 'rgba(30,41,59,0.6)' }}
        className="rounded-xl border bg-slate-900/40 overflow-hidden"
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="What do you want to accomplish today?"
          className="w-full bg-transparent px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
        />
      </motion.div>
    </div>
  );
}
