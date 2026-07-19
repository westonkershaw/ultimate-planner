/**
 * format-target-date.ts — "Mon D, YYYY" display formatting for a goal's
 * targetDate (YYYY-MM-DD day key). Pure string formatting, not day-boundary
 * math, so it does not go through time-policy — it never compares "today" to
 * anything, just renders a key that's already local by construction (see
 * goals-types.ts: targetDate is a nullable milestone deadline day key).
 */

const MONTH_LONG = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatTargetDate(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  return `${MONTH_LONG[m! - 1]} ${d}, ${y}`;
}
