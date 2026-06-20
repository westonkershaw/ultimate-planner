import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MilestoneCelebrationProps {
  milestone: number | null;
  color?: string;
}

const PARTICLE_COUNT = 24;

/**
 * Confetti burst animation triggered when a goal milestone is reached.
 * Auto-dismisses after 2 seconds.
 */
export default function MilestoneCelebration({
  milestone,
  color = '#6366f1',
}: MilestoneCelebrationProps) {
  const [show, setShow] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (milestone !== null) {
      setShow(true);
      setKey((k) => k + 1);
      const timer = setTimeout(() => setShow(false), 2200);
      return () => clearTimeout(timer);
    }
  }, [milestone]);

  const particles = useCallback(() => {
    const colors = [color, '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#fff'];
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * 360;
      const rad = (angle * Math.PI) / 180;
      const distance = 40 + Math.random() * 50;
      const size = 3 + Math.random() * 4;
      return {
        id: i,
        x: Math.cos(rad) * distance,
        y: Math.sin(rad) * distance - 20,
        size,
        color: colors[i % colors.length]!,
        delay: Math.random() * 0.15,
      };
    });
  }, [color]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={key}
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-10"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Milestone badge */}
          <motion.div
            className="absolute text-sm font-bold px-3 py-1 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${color}, #8b5cf6)`,
              color: '#fff',
              boxShadow: `0 4px 20px ${color}66`,
            }}
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: -30 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {milestone}% reached!
          </motion.div>

          {/* Confetti particles */}
          {particles().map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: p.color,
              }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{
                x: p.x,
                y: p.y,
                scale: [0, 1.2, 0.8],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 1.2,
                delay: p.delay,
                ease: 'easeOut',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
