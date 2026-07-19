/**
 * palette.ts — plain color-token data with NO react-native or global.css
 * imports. Exists so pure-logic modules (e.g. lib/status-visual.ts) can
 * consume color tokens without transitively pulling in 'react-native' (Flow
 * syntax) or '@/global.css', both of which are unparseable by vitest's node
 * environment. theme.ts re-exports these for UI call sites — it stays the
 * single source of truth import path for components; only pure `lib/`
 * modules should import directly from here.
 */

import type { LifeArea } from '@/lib/goals-types';

/**
 * Five distinct hues, one per LifeArea, picked to read clearly against the
 * app's dark surfaces (~#151718 card/background tone): each is bright/light
 * enough for >4.5:1 contrast there while staying visually separable from the
 * existing `#3c87f7` (goals) accent blue.
 */
export const LifeAreaColors: Record<LifeArea, string> = {
  finance: '#34d399', // green
  spiritual: '#a78bfa', // violet
  mental: '#38bdf8', // sky blue
  social: '#fbbf24', // amber
  physical: '#fb7185', // red/rose
};

/**
 * Relationship-status indicator colors for the People/Dating tab (see
 * lib/status-visual.ts). Picked to read clearly against the app's dark
 * surfaces, same brightness family as LifeAreaColors above.
 */
export const StatusColors = {
  past: '#6b7280',
  interested: '#eab308',
  dating: '#22c55e',
  lightBlue: '#38bdf8',
  darkBlue: '#2563eb',
  muted: '#4b5563',
} as const;
