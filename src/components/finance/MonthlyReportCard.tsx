import { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus, Copy } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useFinanceStore } from '@/store';
import {
  generateMonthlyReport,
  formatReportForClipboard,
} from '@/utils/monthlyReportEngine';
import { fmt$ } from '@/utils/financeEngine';

const CATEGORY_COLORS: Record<string, string> = {
  housing: '#6366f1',
  food: '#10b981',
  transport: '#f59e0b',
  health: '#ef4444',
  entertainment: '#8b5cf6',
  shopping: '#ec4899',
  utilities: '#3b82f6',
  other: '#64748b',
};

export default function MonthlyReportCard() {
  const { income, transactions, envelopes } = useFinanceStore();

  const report = useMemo(
    () => generateMonthlyReport(income, transactions, envelopes),
    [income, transactions, envelopes],
  );

  const handleCopy = useCallback(async () => {
    if (!report) return;
    const text = formatReportForClipboard(report);
    await navigator.clipboard.writeText(text);
  }, [report]);

  if (!report) return null;

  const TrendIcon =
    report.vsLastMonth.direction === 'down'
      ? TrendingDown
      : report.vsLastMonth.direction === 'up'
        ? TrendingUp
        : Minus;

  const trendColor =
    report.vsLastMonth.direction === 'down'
      ? '#10b981'
      : report.vsLastMonth.direction === 'up'
        ? '#ef4444'
        : '#64748b';

  return (
    <Card className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100">
            Monthly Report
          </h3>
          <p className="text-[11px] text-slate-500">{report.monthLabel}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          <Copy className="w-3.5 h-3.5 mr-1" />
          Copy
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCell label="Income" value={fmt$(report.totalIncome)} color="#6366f1" />
        <StatCell label="Spent" value={fmt$(report.totalSpent)} color="#ef4444" />
        <StatCell
          label="Saved"
          value={`${fmt$(report.totalSaved)} (${report.savingsRate}%)`}
          color="#10b981"
        />
      </div>

      {/* Comparison to last month */}
      {report.vsLastMonth.spentDelta !== 0 && (
        <div className="flex items-center gap-2 text-xs" style={{ color: trendColor }}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span>
            Spending {report.vsLastMonth.direction === 'down' ? 'down' : 'up'}{' '}
            {Math.abs(report.vsLastMonth.spentDelta)}% vs last month
          </span>
        </div>
      )}

      {/* Top categories */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Top Categories
        </div>
        {report.topCategories.map((cat) => (
          <div key={cat.category} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 capitalize">{cat.category}</span>
              <span className="text-slate-400">
                {fmt$(cat.amount)} ({cat.pct}%)
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: CATEGORY_COLORS[cat.category] ?? '#64748b',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${cat.pct}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Envelope adherence */}
      {report.envelopeAdherence < 100 && (
        <div className="text-xs text-slate-400">
          Envelope adherence:{' '}
          <span
            className="font-semibold"
            style={{
              color: report.envelopeAdherence >= 75 ? '#10b981' : '#f59e0b',
            }}
          >
            {report.envelopeAdherence}%
          </span>
        </div>
      )}

      {/* Insights */}
      {report.insights.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-slate-800/50">
          {report.insights.map((insight, i) => (
            <div key={i} className="text-[11px] text-slate-400">
              <span className="text-slate-500">{insight.label}:</span>{' '}
              <span className="text-slate-300">{insight.value}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className="text-base font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
