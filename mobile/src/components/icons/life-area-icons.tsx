/**
 * life-area-icons.tsx — original two-tone line icon set for the five
 * LifeArea values plus a few supporting marks (milestone flag, streak,
 * generic person-pair). Each icon is simple original geometry (not traced
 * from any existing icon set) drawn on a 24x24 viewBox: a primary stroke
 * (`color`) for the main figure and a single `accent` stroke for one small
 * detail, matching the app's flat two-tone visual language.
 */

import type { ComponentType } from 'react';
import { Circle, Line, Path, Svg } from 'react-native-svg';

import type { LifeArea } from '@/lib/goals-types';
import type { IconProps } from './icon-types';

const DEFAULT_SIZE = 24;
const STROKE_WIDTH = 1.75;

/** Coin-on-banknote motif: a note outline with a coin ring stacked on top. */
export function FinanceIcon({ size = DEFAULT_SIZE, color, accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 15.5v-6a1 1 0 0 1 1-1h17a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1Z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Circle cx={16.5} cy={12.5} r={2.25} stroke={accent ?? color} strokeWidth={STROKE_WIDTH} />
      <Line x1={5.5} y1={12.5} x2={5.5} y2={12.5} stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </Svg>
  );
}

/** Open book with a small rising light/spark above the spine — study & reflection. */
export function SpiritualIcon({ size = DEFAULT_SIZE, color, accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 6.5c-1.6-1.2-4-1.7-6.5-1.3a.7.7 0 0 0-.6.7v10.6c0 .4.4.8.9.7 2.2-.3 4.4.2 5.8 1.2M12 6.5c1.6-1.2 4-1.7 6.5-1.3a.7.7 0 0 1 .6.7v10.6c0 .4-.4.8-.9.7-2.2-.3-4.4.2-5.8 1.2M12 6.5v11.9"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 2.2v1.4M9.7 3.7l.9 1.1M14.3 3.7l-.9 1.1"
        stroke={accent ?? color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Head profile with a small spark at the temple — clarity / mental focus. */
export function MentalIcon({ size = DEFAULT_SIZE, color, accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 20.5v-2.7c-2.2-1.2-3.6-3.4-3.6-6 0-4 3.4-7.3 7.6-7.3s7.5 3 7.5 6.8c0 1.9-.9 3.5-2.3 4.7v3a1 1 0 0 1-1 1H9.5a1 1 0 0 1-1-1Z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Path
        d="M12.4 8.2 10.6 11h2.6l-1.8 3.1"
        stroke={accent ?? color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Two overlapping person silhouettes — social connection. */
export function SocialIcon({ size = DEFAULT_SIZE, color, accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={7.5} r={2.75} stroke={color} strokeWidth={STROKE_WIDTH} />
      <Path
        d="M3.5 19c0-3.2 2.5-5.3 5.5-5.3s5.5 2.1 5.5 5.3"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={16} cy={7} r={2} stroke={accent ?? color} strokeWidth={STROKE_WIDTH} />
      <Path
        d="M14.8 13.1c2.7.3 4.7 2.3 4.7 5"
        stroke={accent ?? color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Dumbbell with a small heartbeat blip crossing the bar — training & vitality. */
export function PhysicalIcon({ size = DEFAULT_SIZE, color, accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10v4M2.5 9.3v5.4M20 10v4M21.5 9.3v5.4"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      <Line x1={6.5} y1={12} x2={9.3} y2={12} stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Path d="M4 12h2.5" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Path d="M17.5 12H20" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Path
        d="M6.5 7.5v9M9.5 6.5v11M14.5 6.5v11M17.5 7.5v9"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      <Path
        d="M9.3 12h1.4l.9-1.6 1 3.2 1-1.6h1.1"
        stroke={accent ?? color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Small pennant flag on a post, for targetDate milestone goals. */
export function TargetFlagIcon({ size = DEFAULT_SIZE, color, accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={6} y1={3.5} x2={6} y2={20.5} stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Path
        d="M6 4.5h11.5c.7 0 1 .8.5 1.3l-2.8 2.7 2.8 2.7c.5.5.2 1.3-.5 1.3H6"
        stroke={accent ?? color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Teardrop flame built from two nested arcs — streak indicator. */
export function StreakFlameIcon({ size = DEFAULT_SIZE, color, accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5c.6 2.1-.4 3.4-1.6 4.7-1.5 1.6-3.1 3.3-3.1 6a4.7 4.7 0 0 0 9.4 0c0-2.1-1-3.4-1.9-4.6-.3.9-.8 1.6-1.4 2 .2-2.6-.5-5.4-1.4-8.1Z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Path
        d="M11.6 13.2c-.9.9-1.3 1.7-1.3 2.6a1.7 1.7 0 0 0 3.4 0c0-.5-.1-.9-.4-1.4"
        stroke={accent ?? color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Generic person-pair mark (reuses SocialIcon's geometry) for contexts that need "people" but aren't the Social life area. */
export function PeopleIcon(props: IconProps) {
  return <SocialIcon {...props} />;
}

export const LIFE_AREA_ICONS: Record<LifeArea, ComponentType<IconProps>> = {
  finance: FinanceIcon,
  spiritual: SpiritualIcon,
  mental: MentalIcon,
  social: SocialIcon,
  physical: PhysicalIcon,
};
