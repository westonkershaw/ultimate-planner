import React, { useMemo } from 'react';
import { generateSparklineData, generateSparklinePath } from '../../utils/financeEngine';

const Sparkline = React.memo(function Sparkline({
  transactions = [],
  width = 200,
  height = 40,
  color = '#6366f1',
  days = 30,
  showArea = true,
  className = '',
}) {
  const data = useMemo(() => generateSparklineData(transactions, days), [transactions, days]);
  const result = useMemo(() => generateSparklinePath(data, width, height), [data, width, height]);

  if (!result || !result.path) {
    return (
      <svg width={width} height={height} className={className}>
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      </svg>
    );
  }

  const { path, points } = result;
  const hasData = data.some((d) => d.amount > 0);

  if (!hasData) {
    return (
      <svg width={width} height={height} className={className}>
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      </svg>
    );
  }

  // Build area path (closed shape for gradient fill)
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath = `${path} L ${lastPoint.x},${height - 4} L ${firstPoint.x},${height - 4} Z`;

  const gradId = `spark-grad-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      {showArea && (
        <path
          d={areaPath}
          fill={`url(#${gradId})`}
        />
      )}

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
      />

      {/* Last point dot */}
      {lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={3}
          fill={color}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      )}
    </svg>
  );
});

export default Sparkline;
