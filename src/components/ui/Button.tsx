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
    'bg-indigo-500 hover:bg-indigo-400',
    'text-white',
    'border border-indigo-400/30',
    'shadow-lg shadow-indigo-500/20',
  ].join(' '),
  ghost: [
    'bg-white/5 hover:bg-white/10',
    'text-slate-300',
    'border border-white/10',
  ].join(' '),
  danger: [
    'bg-red-500/15 hover:bg-red-500/25',
    'text-red-400',
    'border border-red-500/30',
  ].join(' '),
  success: [
    'bg-emerald-500/15 hover:bg-emerald-500/25',
    'text-emerald-400',
    'border border-emerald-500/30',
  ].join(' '),
  amber: [
    'bg-amber-500/15 hover:bg-amber-500/25',
    'text-amber-400',
    'border border-amber-500/30',
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
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      transition={APP_SPRING}
      className={[
        'inline-flex items-center justify-center',
        'rounded-[10px] font-medium',
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
