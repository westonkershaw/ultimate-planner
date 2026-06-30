import React from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Lucide icon element rendered on the left inside the input */
  icon?: React.ReactNode;
  containerClassName?: string;
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  children: React.ReactNode;
}

// ── Shared label ────────────────────────────────────────────────────────────

function FieldLabel({ text }: { text: string }) {
  return (
    <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
      {text}
    </label>
  );
}

// ── Input ───────────────────────────────────────────────────────────────────

const Input = React.memo(function Input({
  label,
  error,
  icon,
  className = '',
  containerClassName = '',
  type = 'text',
  ...props
}: InputProps) {
  const fieldBase = [
    'w-full rounded-control border bg-surface-2',
    'py-2.5 text-sm text-fg outline-none',
    'placeholder:text-fg-faint',
    'transition-all duration-150',
    error
      ? 'border-danger/50 focus:border-danger/60 focus:ring-2 focus:ring-danger/20'
      : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/25',
    icon ? 'pl-9 pr-3' : 'px-3',
    className,
  ].join(' ');

  return (
    <div className={['flex flex-col gap-1', containerClassName].join(' ')}>
      {label && <FieldLabel text={label} />}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none">
            {icon}
          </span>
        )}
        <input type={type} className={fieldBase} {...props} />
      </div>
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  );
});

// ── Textarea ─────────────────────────────────────────────────────────────────

export const Textarea = React.memo(function Textarea({
  label,
  error,
  className = '',
  containerClassName = '',
  ...props
}: TextareaProps) {
  return (
    <div className={['flex flex-col gap-1', containerClassName].join(' ')}>
      {label && <FieldLabel text={label} />}
      <textarea
        className={[
          'w-full rounded-control border bg-surface-2',
          'px-3 py-2.5 text-sm text-fg outline-none resize-none',
          'placeholder:text-fg-faint',
          'transition-all duration-150',
          error
            ? 'border-danger/50 focus:border-danger/60 focus:ring-2 focus:ring-danger/20'
            : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/25',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  );
});

// ── Select ───────────────────────────────────────────────────────────────────

export const Select = React.memo(function Select({
  label,
  error,
  children,
  className = '',
  containerClassName = '',
  ...props
}: SelectProps) {
  return (
    <div className={['flex flex-col gap-1', containerClassName].join(' ')}>
      {label && <FieldLabel text={label} />}
      <select
        className={[
          'w-full rounded-control border bg-surface-2',
          'px-3 py-2.5 text-sm text-fg outline-none',
          'transition-all duration-150',
          error
            ? 'border-danger/50'
            : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/25',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  );
});

export default Input;
