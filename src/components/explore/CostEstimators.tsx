import React, { useCallback } from 'react';
import { UtensilsCrossed, Bed, Ticket, Plus, X, Moon } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { MEAL_DEFAULTS, ACCOMMODATION_DEFAULTS, formatUsd } from '@/utils/travelEngine';
import type { MealTier, AccommodationTier, CustomCost } from '@/types';

// ── Food ────────────────────────────────────────────────────────────────────

interface FoodEstimatorProps {
  tier: MealTier;
  perMealCost: number;
  days: number;
  people: number;
  mealsPerDay: number;
  onTierChange: (tier: MealTier) => void;
  onPerMealCostChange: (cost: number) => void;
  onMealsChange: (meals: number) => void;
}

export const FoodEstimator = React.memo(function FoodEstimator({
  tier,
  perMealCost,
  days,
  people,
  mealsPerDay,
  onTierChange,
  onPerMealCostChange,
  onMealsChange,
}: FoodEstimatorProps) {
  const daily = perMealCost * mealsPerDay * people;
  const total = daily * days;

  const handleTierChange = useCallback(
    (newTier: MealTier) => {
      onTierChange(newTier);
      onPerMealCostChange(MEAL_DEFAULTS[newTier]);
    },
    [onTierChange, onPerMealCostChange],
  );

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <UtensilsCrossed size={16} className="text-orange-400" />
        <h3 className="text-sm font-semibold text-fg-secondary">Food Budget</h3>
        <span className="ml-auto text-sm font-bold text-orange-300">{formatUsd(total)}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Style"
          value={tier}
          onChange={(e) => handleTierChange(e.target.value as MealTier)}
        >
          <option value="budget">Budget</option>
          <option value="moderate">Moderate</option>
          <option value="premium">Premium</option>
        </Select>

        <Input
          label="$/Meal"
          type="number"
          min={0}
          step={1}
          value={perMealCost}
          onChange={(e) => onPerMealCostChange(parseFloat(e.target.value) || 0)}
        />

        <Input
          label="Meals/Day"
          type="number"
          min={1}
          max={6}
          value={mealsPerDay}
          onChange={(e) => onMealsChange(parseInt(e.target.value, 10) || 1)}
        />
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 text-xs text-fg-muted">
        {formatUsd(perMealCost)}/meal x {mealsPerDay}/day x {people} people x {days} days
      </div>
    </Card>
  );
});

// ── Accommodation ───────────────────────────────────────────────────────────

interface AccommodationEstimatorProps {
  tier: AccommodationTier;
  perNightCost: number;
  nights: number;
  rooms: number;
  onTierChange: (tier: AccommodationTier) => void;
  onPerNightCostChange: (cost: number) => void;
  onNightsChange: (nights: number) => void;
  onRoomsChange: (rooms: number) => void;
}

export const AccommodationEstimator = React.memo(function AccommodationEstimator({
  tier,
  perNightCost,
  nights,
  rooms,
  onTierChange,
  onPerNightCostChange,
  onNightsChange,
  onRoomsChange,
}: AccommodationEstimatorProps) {
  const total = perNightCost * rooms * nights;

  const handleTierChange = useCallback(
    (newTier: AccommodationTier) => {
      onTierChange(newTier);
      onPerNightCostChange(ACCOMMODATION_DEFAULTS[newTier]);
    },
    [onTierChange, onPerNightCostChange],
  );

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Bed size={16} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-fg-secondary">Accommodation</h3>
        <span className="ml-auto text-sm font-bold text-blue-300">{formatUsd(total)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Select
          label="Type"
          value={tier}
          onChange={(e) => handleTierChange(e.target.value as AccommodationTier)}
        >
          <option value="budget">Budget</option>
          <option value="moderate">Moderate</option>
          <option value="premium">Premium</option>
        </Select>

        <Input
          label="$/Night"
          type="number"
          min={0}
          step={10}
          value={perNightCost}
          onChange={(e) => onPerNightCostChange(parseFloat(e.target.value) || 0)}
        />

        <Input
          label="Nights"
          type="number"
          min={0}
          value={nights}
          onChange={(e) => onNightsChange(parseInt(e.target.value, 10) || 0)}
          icon={<Moon size={14} />}
        />

        <Input
          label="Rooms"
          type="number"
          min={1}
          max={10}
          value={rooms}
          onChange={(e) => onRoomsChange(parseInt(e.target.value, 10) || 1)}
        />
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 text-xs text-fg-muted">
        {formatUsd(perNightCost)}/night x {rooms} room{rooms > 1 ? 's' : ''} x {nights} night{nights !== 1 ? 's' : ''}
      </div>
    </Card>
  );
});

// ── Entertainment ───────────────────────────────────────────────────────────

interface EntertainmentEstimatorProps {
  days: number;
  people: number;
  activitiesPerDay: number;
  avgActivityCost: number;
  onActivitiesChange: (n: number) => void;
  onCostChange: (cost: number) => void;
}

export const EntertainmentEstimator = React.memo(function EntertainmentEstimator({
  days,
  people,
  activitiesPerDay,
  avgActivityCost,
  onActivitiesChange,
  onCostChange,
}: EntertainmentEstimatorProps) {
  const daily = activitiesPerDay * avgActivityCost * people;
  const total = daily * days;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Ticket size={16} className="text-pink-400" />
        <h3 className="text-sm font-semibold text-fg-secondary">Activities & Entertainment</h3>
        <span className="ml-auto text-sm font-bold text-pink-300">{formatUsd(total)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Activities/Day"
          type="number"
          min={0}
          max={10}
          value={activitiesPerDay}
          onChange={(e) => onActivitiesChange(parseInt(e.target.value, 10) || 0)}
        />
        <Input
          label="$/Activity"
          type="number"
          min={0}
          step={5}
          value={avgActivityCost}
          onChange={(e) => onCostChange(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 text-xs text-fg-muted">
        {activitiesPerDay}/day x {formatUsd(avgActivityCost)} x {people} people x {days} days
      </div>
    </Card>
  );
});

// ── Custom Costs ────────────────────────────────────────────────────────────

interface CustomCostsProps {
  costs: CustomCost[];
  onAdd: (label: string, amount: number) => void;
  onRemove: (id: string) => void;
}

export const CustomCosts = React.memo(function CustomCosts({
  costs,
  onAdd,
  onRemove,
}: CustomCostsProps) {
  const [label, setLabel] = React.useState('');
  const [amount, setAmount] = React.useState('');

  const handleAdd = useCallback(() => {
    const trimmed = label.trim();
    const num = parseFloat(amount);
    if (!trimmed || !num || num <= 0) return;
    onAdd(trimmed, num);
    setLabel('');
    setAmount('');
  }, [label, amount, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleAdd();
    },
    [handleAdd],
  );

  const total = costs.reduce((s, c) => s + c.amount, 0);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Plus size={16} className="text-fg-muted" />
        <h3 className="text-sm font-semibold text-fg-secondary">Other Costs</h3>
        {total > 0 && (
          <span className="ml-auto text-sm font-bold text-fg-secondary">{formatUsd(total)}</span>
        )}
      </div>

      {costs.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {costs.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-xs text-fg-secondary">{c.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-fg-secondary">{formatUsd(c.amount)}</span>
                <button
                  onClick={() => onRemove(c.id)}
                  className="text-fg-faint hover:text-red-400 transition-colors"
                  aria-label="Remove cost"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          containerClassName="flex-1"
          placeholder="e.g. Parking, Tolls"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Input
          containerClassName="w-28"
          type="number"
          min={0}
          step={5}
          placeholder="$"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button variant="ghost" size="sm" onClick={handleAdd} disabled={!label.trim() || !parseFloat(amount)}>
          <Plus size={14} />
        </Button>
      </div>
    </Card>
  );
});
