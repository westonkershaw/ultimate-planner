import React from 'react';
import { BarChart3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import { calcTripBudgetFromTrip, formatUsd, formatNumber } from '@/utils/travelEngine';
import type { SavedTrip, TripBudgetSummary } from '@/types';

interface TripComparisonProps {
  trips: SavedTrip[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}

const CATEGORY_COLORS: Record<keyof Omit<TripBudgetSummary, 'total'>, string> = {
  fuel: 'bg-emerald-500',
  food: 'bg-orange-500',
  accommodation: 'bg-violet-500',
  entertainment: 'bg-pink-500',
  flight: 'bg-sky-500',
  rentalCar: 'bg-amber-500',
  custom: 'bg-slate-500',
};

const TripComparison = React.memo(function TripComparison({
  trips, selectedIds, onToggle, onClear,
}: TripComparisonProps) {
  const selected = trips.filter((t) => selectedIds.includes(t.id));
  const budgets = selected.map((t) => ({ trip: t, budget: calcTripBudgetFromTrip(t) }));
  const maxTotal = Math.max(...budgets.map((b) => b.budget.total), 1);

  if (trips.length < 2) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={16} className="text-accent-text" />
        <h3 className="text-sm font-semibold text-fg-secondary">Compare Trips</h3>
        {selected.length > 0 && (
          <button onClick={onClear} className="ml-auto text-xs text-fg-muted hover:text-fg-secondary transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Trip selector chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {trips.map((t) => {
          const active = selectedIds.includes(t.id);
          return (
            <button key={t.id} onClick={() => onToggle(t.id)}
              className={[
                'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors',
                active
                  ? 'bg-accent/15 text-accent-text border-accent/30'
                  : 'bg-white/5 text-fg-muted border-white/10 hover:text-fg-secondary',
              ].join(' ')}>
              {t.name}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {budgets.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="space-y-3">
            {budgets.map(({ trip, budget }) => (
              <div key={trip.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-fg-secondary truncate">{trip.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-fg">{formatUsd(budget.total)}</span>
                    <button onClick={() => onToggle(trip.id)}
                      className="text-fg-faint hover:text-red-400 transition-colors"><X size={10} /></button>
                  </div>
                </div>
                {/* Stacked bar */}
                <div className="h-3 rounded-full overflow-hidden flex bg-white/5">
                  {(Object.keys(CATEGORY_COLORS) as (keyof typeof CATEGORY_COLORS)[]).map((key) => {
                    const val = budget[key];
                    if (val <= 0) return null;
                    const pct = (val / maxTotal) * 100;
                    return <div key={key} className={`${CATEGORY_COLORS[key]} h-full`} style={{ width: `${pct}%` }} />;
                  })}
                </div>
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-fg-muted">
                  <span>{formatNumber(trip.distanceMiles, 0)} mi</span>
                  <span>·</span>
                  <span>{trip.days}d {trip.nights}n</span>
                  <span>·</span>
                  <span>{trip.people}p</span>
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
              {(Object.entries(CATEGORY_COLORS) as [keyof typeof CATEGORY_COLORS, string][]).map(([key, color]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-[10px] text-fg-muted capitalize">{key === 'rentalCar' ? 'Rental' : key}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selected.length === 0 && (
        <p className="text-xs text-fg-faint text-center py-3">Select 2+ trips to compare</p>
      )}
    </Card>
  );
});

export default TripComparison;
