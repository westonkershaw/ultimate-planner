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
    'rounded-[12px]',
    'bg-slate-900/50',
    'backdrop-blur-xl',
    'border border-slate-800',
    className,
  ].join(' ');

  if (hover) {
    return (
      <motion.div
        onClick={onClick}
        whileHover={{ y: -1, borderColor: 'rgba(99,102,241,0.25)' }}
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
