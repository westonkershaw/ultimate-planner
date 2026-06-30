import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award } from 'lucide-react';
import Leaderboard from './Leaderboard';
import AchievementFeed from './AchievementFeed';

type SubTab = 'leaderboard' | 'achievements';

const TABS: { id: SubTab; label: string; Icon: typeof Trophy }[] = [
  { id: 'leaderboard', label: 'Leaderboard', Icon: Trophy },
  { id: 'achievements', label: 'Achievements', Icon: Award },
];

export default function CommunityTab() {
  const [subTab, setSubTab] = useState<SubTab>('leaderboard');

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-fg font-[Syne]">Community</h1>
        <p className="text-xs text-fg-muted mt-0.5">
          Track your progress and celebrate your wins
        </p>
      </div>

      {/* Sub-tab toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-1 border border-border">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
              subTab === id
                ? 'bg-accent/15 text-accent-text border border-accent/20'
                : 'text-fg-muted hover:text-fg-secondary',
            ].join(' ')}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={subTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.14 }}
      >
        {subTab === 'leaderboard' ? <Leaderboard /> : <AchievementFeed />}
      </motion.div>
    </div>
  );
}
