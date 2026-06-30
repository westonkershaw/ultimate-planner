import React from 'react';
import { motion } from 'framer-motion';
import { APP_SPRING } from '@/hooks/useAppSpring';

// ── Types ───────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'success' | 'amber';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  id?: string;
  'aria-label'?: string;
  'aria-expanded'?: boolean | 'true' | 'false';
  'aria-controls'?: string;
  title?: string;
  tabIndex?: number;
  form?: string;
}

// ── Style maps ──────────────────────────────────────────────────────────────

const VARIANTS: Record<ButtonVariant, string> = {
  primary: [
    'bg-accent hover:bg-accent-hover',
    'text-white',
    'border border-transparent',
  ].join(' '),
  ghost: [
    'bg-surface-2 hover:bg-surface-3',
    'text-fg-secondary',
    'border border-border',
  ].join(' '),
  danger: [
    'bg-danger/15 hover:bg-danger/25',
    'text-danger-text',
    'border border-danger/30',
  ].join(' '),
  success: [
    'bg-success/15 hover:bg-success/25',
    'text-success-text',
    'border border-success/30',
  ].join(' '),
  amber: [
    'bg-warning/15 hover:bg-warning/25',
    'text-warning-text',
    'border border-warning/30',
  ].join(' '),
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

// ── Component ───────────────────────────────────────────────────────────────

const Button = React.memo(function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  id,
  title,
  tabIndex,
  form,
  'aria-label': ariaLabel,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      id={id}
      title={title}
      tabIndex={tabIndex}
      form={form}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={APP_SPRING}
      className={[
        'inline-flex items-center justify-center',
        'rounded-control font-medium',
        'transition-colors duration-150',
        'select-none cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(' ')}
    >
      {children}
    </motion.button>
  );
});

export default Button;
