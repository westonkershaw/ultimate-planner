import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, TrendingUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import { calcTripBudgetFromTrip, formatUsd } from '@/utils/travelEngine';
import type { SavedTrip } from '@/types';

interface TripSummaryProps {
  trip: SavedTrip;
}

type SegmentKey = 'fuel' | 'food' | 'accommodation' | 'entertainment' | 'flight' | 'rentalCar' | 'custom';

const SEGMENT_COLORS: Record<SegmentKey, { bg: string; text: string; border: string }> = {
  fuel:           { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25' },
  food:           { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/25' },
  accommodation:  { bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/25' },
  entertainment:  { bg: 'bg-pink-500/15',    text: 'text-pink-400',    border: 'border-pink-500/25' },
  flight:         { bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/25' },
  rentalCar:      { bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/25' },
  custom:         { bg: 'bg-slate-500/15',   text: 'text-fg-muted',   border: 'border-slate-500/25' },
};

const BAR_COLORS: Record<SegmentKey, string> = {
  fuel:           'bg-emerald-500',
  food:           'bg-orange-500',
  accommodation:  'bg-blue-500',
  entertainment:  'bg-pink-500',
  flight:         'bg-sky-500',
  rentalCar:      'bg-amber-500',
  custom:         'bg-slate-500',
};

const TripSummary = React.memo(function TripSummary({ trip }: TripSummaryProps) {
  const budget = useMemo(() => calcTripBudgetFromTrip(trip), [trip]);

  const allSegments: { key: SegmentKey; label: string; amount: number }[] = [
    { key: 'fuel',          label: 'Fuel',           amount: budget.fuel },
    { key: 'food',          label: 'Food',           amount: budget.food },
    { key: 'accommodation', label: 'Accommodation',  amount: budget.accommodation },
    { key: 'entertainment', label: 'Entertainment',  amount: budget.entertainment },
    { key: 'flight',        label: 'Flights',        amount: budget.flight },
    { key: 'rentalCar',     label: 'Rental Car',     amount: budget.rentalCar },
    { key: 'custom',        label: 'Other',          amount: budget.custom },
  ];
  const segments = allSegments.filter((s) => s.amount > 0);

  const perPerson = trip.people > 0 ? budget.total / trip.people : budget.total;
  const perDay = trip.days > 0 ? budget.total / trip.days : budget.total;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <PieChart size={16} className="text-accent-text" />
        <h3 className="text-sm font-semibold text-fg-secondary">Trip Budget Summary</h3>
      </div>

      {/* Total */}
      <div className="text-center mb-4">
        <p className="text-3xl font-bold text-fg">{formatUsd(budget.total)}</p>
        <div className="flex items-center justify-center gap-3 mt-1.5">
          <span className="text-xs text-fg-secondary font-medium">{formatUsd(perPerson)}/person</span>
          <span className="text-fg-faint">&middot;</span>
          <span className="text-xs text-fg-secondary font-medium">{formatUsd(perDay)}/day</span>
        </div>
      </div>

      {/* Stacked bar */}
      {budget.total > 0 && (
        <div className="h-3 rounded-full overflow-hidden flex mb-4">
          {segments.map((s) => (
            <motion.div
              key={s.key}
              initial={{ width: 0 }}
              animate={{ width: `${(s.amount / budget.total) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`${BAR_COLORS[s.key]} first:rounded-l-full last:rounded-r-full`}
            />
          ))}
        </div>
      )}

      {/* Breakdown cards */}
      <div className="space-y-2">
        {segments.map((s) => {
          const colors = SEGMENT_COLORS[s.key];
          const pct = budget.total > 0 ? Math.round((s.amount / budget.total) * 100) : 0;
          return (
            <div key={s.key} className={`flex items-center justify-between p-2.5 rounded-xl ${colors.bg} border ${colors.border}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${BAR_COLORS[s.key]}`} />
                <span className="text-xs font-medium text-fg-secondary">{s.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-fg-muted">{pct}%</span>
                <span className={`text-sm font-semibold ${colors.text}`}>{formatUsd(s.amount)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {budget.total === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-fg-faint">
          <TrendingUp size={24} />
          <p className="text-xs">Fill in trip details above to see your budget</p>
        </div>
      )}
    </Card>
  );
});

export default TripSummary;
