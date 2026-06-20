import { memo, useId } from 'react';
import { motion } from 'framer-motion';

interface GoalJarProps {
  pct: number;
  color?: string;
  size?: number;
}

const MILESTONES = [25, 50, 75, 100];

/**
 * SVG glass jar with animated liquid fill and milestone markers.
 */
const GoalJar = memo(function GoalJar({
  pct,
  color = '#10b981',
  size = 80,
}: GoalJarProps) {
  const clipId = useId();
  const gradientId = useId();
  const clamped = Math.min(100, Math.max(0, pct));

  // Jar dimensions (proportional to size)
  const jarWidth = size * 0.7;
  const jarHeight = size * 0.85;
  const neckWidth = jarWidth * 0.5;
  const neckHeight = size * 0.1;
  const rimWidth = neckWidth * 1.2;
  const rimHeight = 4;
  const cornerRadius = jarWidth * 0.15;
  const cx = size / 2;

  // Liquid level (bottom of jar to fill level)
  const jarTop = neckHeight + rimHeight + 2;
  const jarBottom = jarTop + jarHeight;
  const fillHeight = (jarHeight * clamped) / 100;
  const liquidTop = jarBottom - fillHeight;

  // Wave parameters
  const waveAmp = clamped > 0 && clamped < 100 ? 3 : 0;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Goal jar ${clamped}% full`}
      >
        <defs>
          {/* Jar shape clip path */}
          <clipPath id={clipId}>
            {/* Jar body (rounded rect) */}
            <rect
              x={cx - jarWidth / 2}
              y={jarTop}
              width={jarWidth}
              height={jarHeight}
              rx={cornerRadius}
              ry={cornerRadius}
            />
            {/* Neck */}
            <rect
              x={cx - neckWidth / 2}
              y={rimHeight + 2}
              width={neckWidth}
              height={neckHeight + cornerRadius}
            />
          </clipPath>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Jar outline */}
        <rect
          x={cx - jarWidth / 2}
          y={jarTop}
          width={jarWidth}
          height={jarHeight}
          rx={cornerRadius}
          ry={cornerRadius}
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1.5}
        />
        {/* Neck */}
        <rect
          x={cx - neckWidth / 2}
          y={rimHeight + 2}
          width={neckWidth}
          height={neckHeight}
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1.5}
        />
        {/* Rim */}
        <rect
          x={cx - rimWidth / 2}
          y={1}
          width={rimWidth}
          height={rimHeight}
          rx={2}
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1.5}
        />

        {/* Glass highlight */}
        <rect
          x={cx - jarWidth / 2 + 4}
          y={jarTop + 4}
          width={3}
          height={jarHeight * 0.5}
          rx={1.5}
          fill="rgba(255,255,255,0.08)"
        />

        {/* Liquid fill (clipped to jar shape) */}
        <g clipPath={`url(#${clipId})`}>
          {clamped > 0 && (
            <motion.path
              d={`
                M ${cx - jarWidth / 2 - 4} ${liquidTop}
                Q ${cx - jarWidth / 4} ${liquidTop - waveAmp} ${cx} ${liquidTop}
                Q ${cx + jarWidth / 4} ${liquidTop + waveAmp} ${cx + jarWidth / 2 + 4} ${liquidTop}
                L ${cx + jarWidth / 2 + 4} ${jarBottom + 4}
                L ${cx - jarWidth / 2 - 4} ${jarBottom + 4}
                Z
              `}
              fill={`url(#${gradientId})`}
              animate={{ y: [0, -1.5, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            />
          )}
        </g>

        {/* Milestone markers */}
        {MILESTONES.filter((m) => m < 100).map((m) => {
          const markerY = jarBottom - (jarHeight * m) / 100;
          return (
            <g key={m}>
              <line
                x1={cx - jarWidth / 2 + 4}
                y1={markerY}
                x2={cx - jarWidth / 2 + 10}
                y2={markerY}
                stroke={clamped >= m ? color : 'rgba(255,255,255,0.1)'}
                strokeWidth={1}
                strokeDasharray={clamped >= m ? 'none' : '2 2'}
              />
              <text
                x={cx - jarWidth / 2 + 12}
                y={markerY + 3}
                fontSize={7}
                fill={clamped >= m ? color : 'rgba(255,255,255,0.15)'}
              >
                {m}%
              </text>
            </g>
          );
        })}
      </svg>

      {/* Center percentage text */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingTop: size * 0.15 }}
      >
        <span
          className="text-xs font-bold"
          style={{
            color: clamped > 40 ? '#fff' : 'rgba(255,255,255,0.7)',
            textShadow: clamped > 40 ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {clamped}%
        </span>
      </div>
    </div>
  );
});

export default GoalJar;
