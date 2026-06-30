import React from 'react';
import { motion } from 'framer-motion';
import { APP_SPRING } from '@/hooks/useAppSpring';

// ── Types ───────────────────────────────────────────────────────────────────

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Enables pointer cursor + subtle hover lift */
  hover?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

// ── Component ───────────────────────────────────────────────────────────────

const Card = React.memo(function Card({
  children,
  className = '',
  style,
  hover = false,
  onClick,
}: CardProps) {
  const base = [
    'relative',
    'rounded-card',
    'bg-surface-1',
    'border border-border',
    className,
  ].join(' ');

  if (hover) {
    return (
      <motion.div
        onClick={onClick}
        whileHover={{ y: -1, borderColor: '#2f333b' }}
        transition={APP_SPRING}
        className={[base, 'cursor-pointer'].join(' ')}
        style={style}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div onClick={onClick} className={base} style={style}>
      {children}
    </div>
  );
});

export default Card;
