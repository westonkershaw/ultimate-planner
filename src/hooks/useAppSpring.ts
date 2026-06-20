/**
 * useAppSpring.ts
 *
 * Project-wide spring animation preset.
 * Enforces the standard stiffness: 400 / damping: 30 spring
 * across all Framer Motion transitions in the app.
 *
 * Usage:
 *   const spring = useAppSpring();
 *   <motion.div transition={spring} ... />
 *
 * For overrides, spread and override individual fields:
 *   <motion.div transition={{ ...spring, damping: 20 }} ... />
 */

import type { Spring } from 'framer-motion';

export interface AppSpringConfig extends Spring {
  type: 'spring';
  stiffness: number;
  damping: number;
}

/** Shared spring config — satisfies Framer Motion's Spring type */
export const APP_SPRING: AppSpringConfig = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
} as const;

/**
 * Returns the standard spring transition config.
 * Memoized as a module-level constant — no hook overhead.
 *
 * Named as a hook for API consistency and discoverability;
 * components that need a transition reference should call this.
 */
export function useAppSpring(): AppSpringConfig {
  return APP_SPRING;
}
