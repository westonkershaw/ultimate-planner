import React from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

// ── Style map ───────────────────────────────────────────────────────────────

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-slate-800 text-slate-400 border-slate-700',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  danger:  'bg-red-500/15 text-red-400 border-red-500/25',
};

// ── Component ───────────────────────────────────────────────────────────────

const Badge = React.memo(function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1',
        'rounded-full border px-2 py-0.5',
        'text-[11px] font-medium leading-none',
        'whitespace-nowrap',
        VARIANTS[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
});

export default Badge;
