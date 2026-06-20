import { motion } from 'framer-motion';
import { Sun, Sunset, Moon } from 'lucide-react';

export default function PlannerGreeting() {
  const hour = new Date().getHours();
  const { greeting, Icon } = getGreetingData(hour);
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-1"
    >
      <div className="flex items-center gap-2">
        <Icon size={20} className="text-amber-400" />
        <h1 className="font-syne text-xl font-bold text-slate-100">{greeting}</h1>
      </div>
      <p className="text-sm text-slate-500">{dateStr}</p>
    </motion.div>
  );
}

function getGreetingData(hour: number) {
  if (hour < 12) return { greeting: 'Good morning', Icon: Sun };
  if (hour < 17) return { greeting: 'Good afternoon', Icon: Sunset };
  return { greeting: 'Good evening', Icon: Moon };
}
