/**
 * icon-types.ts — shared prop contract for the life-area icon set. Every icon
 * is a simple original two-tone line figure: `color` draws the primary
 * stroke, `accent` (defaults to `color` when omitted) draws one small detail
 * so the mark reads at a glance without needing a legend.
 */

export interface IconProps {
  /** Edge length in px; icons are square (viewBox 0 0 24 24). */
  size?: number;
  /** Primary stroke color. */
  color: string;
  /** Secondary/detail stroke color. Defaults to `color` when omitted. */
  accent?: string;
}
