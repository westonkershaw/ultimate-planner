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
  default: 'bg-surface-2 text-fg-muted border-border',
  success: 'bg-success/15 text-success-text border-success/25',
  warning: 'bg-warning/15 text-warning-text border-warning/25',
  danger:  'bg-danger/15 text-danger-text border-danger/25',
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
