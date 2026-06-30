import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Route, Fuel, Leaf, DollarSign } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { calcTripFuel, formatUsd, formatNumber } from '@/utils/travelEngine';
import type { VehicleMpg, DrivingMix } from '@/types';

// ── Types ───────────────────────────────────────────────────────────────────

interface TripCalculatorProps {
  distanceMiles: number;
  cityPercent: DrivingMix;
  fuelPricePerGallon: number;
  vehicleMpg: VehicleMpg | null;
  onDistanceChange: (miles: number) => void;
  onCityPercentChange: (pct: number) => void;
  onFuelPriceChange: (price: number) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

const TripCalculator = React.memo(function TripCalculator({
  distanceMiles,
  cityPercent,
  fuelPricePerGallon,
  vehicleMpg,
  onDistanceChange,
  onCityPercentChange,
  onFuelPriceChange,
}: TripCalculatorProps) {
  const result = useMemo(() => {
    if (!vehicleMpg || distanceMiles <= 0) return null;
    return calcTripFuel({
      distanceMiles,
      cityPercent,
      fuelPricePerGallon,
      cityMpg: vehicleMpg.city,
      highwayMpg: vehicleMpg.highway,
    });
  }, [distanceMiles, cityPercent, fuelPricePerGallon, vehicleMpg]);

  const handleDistance = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onDistanceChange(parseFloat(e.target.value) || 0);
  }, [onDistanceChange]);

  const handleFuelPrice = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFuelPriceChange(parseFloat(e.target.value) || 0);
  }, [onFuelPriceChange]);

  const handleCityPct = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onCityPercentChange(parseInt(e.target.value, 10));
  }, [onCityPercentChange]);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Route size={16} className="text-emerald-400" />
        <h3 className="text-sm font-semibold text-fg-secondary">Fuel Cost Calculator</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Distance (miles)"
          type="number"
          min={0}
          step={10}
          value={distanceMiles || ''}
          onChange={handleDistance}
          placeholder="e.g. 350"
          icon={<Route size={14} />}
        />
        <Input
          label="Fuel price ($/gal)"
          type="number"
          min={0}
          step={0.01}
          value={fuelPricePerGallon || ''}
          onChange={handleFuelPrice}
          placeholder="e.g. 3.50"
          icon={<DollarSign size={14} />}
        />
      </div>

      {/* City/Highway mix slider */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
            Driving Mix
          </span>
          <span className="text-xs text-fg-muted">
            {cityPercent}% city / {100 - cityPercent}% highway
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={cityPercent}
          onChange={handleCityPct}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-surface-2 accent-accent"
        />
        <div className="flex justify-between text-[10px] text-fg-faint mt-1">
          <span>All Highway</span>
          <span>All City</span>
        </div>
      </div>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4"
        >
          <ResultCard
            label="Fuel Cost"
            value={formatUsd(result.fuelCost)}
            icon={<DollarSign size={14} />}
            color="text-emerald-400"
            highlight
          />
          <ResultCard
            label="Trip MPG"
            value={formatNumber(result.effectiveMpg)}
            icon={<Fuel size={14} />}
            color="text-accent-text"
          />
          <ResultCard
            label="Gallons"
            value={formatNumber(result.gallonsUsed)}
            icon={<Fuel size={14} />}
            color="text-amber-400"
          />
          <ResultCard
            label="CO2 (lbs)"
            value={formatNumber(result.co2Pounds, 0)}
            icon={<Leaf size={14} />}
            color="text-fg-muted"
          />
        </motion.div>
      )}

      {!vehicleMpg && (
        <p className="text-xs text-fg-faint mt-4 text-center">
          Select a vehicle above to calculate fuel costs
        </p>
      )}
    </Card>
  );
});

// ── Sub-component ───────────────────────────────────────────────────────────

function ResultCard({
  label,
  value,
  icon,
  color,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={[
      'flex flex-col items-center gap-1 p-3 rounded-xl',
      highlight
        ? 'bg-emerald-500/10 border border-emerald-500/20'
        : 'bg-white/[0.03] border border-white/5',
    ].join(' ')}>
      <span className={`${color}`}>{icon}</span>
      <span className={`text-lg font-bold ${highlight ? 'text-emerald-300' : 'text-fg'}`}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-fg-muted">{label}</span>
    </div>
  );
}

export default TripCalculator;
