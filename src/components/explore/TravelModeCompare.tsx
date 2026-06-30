import React, { useMemo, useEffect } from 'react';
import { Car, Plane, Key, Trophy } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import {
  calcFlightCost,
  calcRentalCarCost,
  estimateFlightPrice,
  formatUsd,
} from '@/utils/travelEngine';
import type { FlightEstimate, RentalCarEstimate } from '@/types';

interface TravelModeCompareProps {
  distanceMiles: number;
  people: number;
  days: number;
  driveFuelCost: number;
  flight: FlightEstimate;
  rental: RentalCarEstimate;
  onFlightUpdate: (updates: Partial<FlightEstimate>) => void;
  onRentalUpdate: (updates: Partial<RentalCarEstimate>) => void;
}

const MODES = [
  { key: 'ownCar', label: 'Own Car', icon: Car, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { key: 'flight', label: 'Fly', icon: Plane, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  { key: 'rental', label: 'Rental', icon: Key, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
] as const;

const AVG_RENTAL_DAILY = 55;

const TravelModeCompare = React.memo(function TravelModeCompare({
  distanceMiles, people, days, driveFuelCost, flight, rental,
  onFlightUpdate, onRentalUpdate,
}: TravelModeCompareProps) {
  const suggestedFlight = useMemo(() => estimateFlightPrice(distanceMiles), [distanceMiles]);
  const flightTotal = calcFlightCost(flight);
  const rentalTotal = calcRentalCarCost(rental);

  // Auto-populate flight estimate when distance is available and user hasn't entered anything
  useEffect(() => {
    if (distanceMiles > 0 && flight.pricePerPerson === 0 && suggestedFlight > 0) {
      onFlightUpdate({ pricePerPerson: suggestedFlight, people });
    }
  }, [distanceMiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-populate rental days from trip days when user hasn't entered anything
  useEffect(() => {
    if (days > 0 && rental.dailyRate === 0 && rental.days === 0) {
      onRentalUpdate({ dailyRate: AVG_RENTAL_DAILY, days });
    }
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const costs = { ownCar: driveFuelCost, flight: flightTotal, rental: rentalTotal };
  const activeCosts = Object.entries(costs).filter(([, v]) => v > 0);
  const cheapestKey = activeCosts.length > 0
    ? activeCosts.reduce((a, b) => (a[1] < b[1] ? a : b))[0]
    : null;

  // Savings message
  const savings = activeCosts.length >= 2 ? (() => {
    const sorted = [...activeCosts].sort((a, b) => a[1] - b[1]);
    const diff = sorted[1]![1] - sorted[0]![1];
    if (diff < 1) return null;
    const labels: Record<string, string> = { ownCar: 'Driving', flight: 'Flying', rental: 'Renting' };
    return `${labels[sorted[0]![0]] ?? sorted[0]![0]} saves ${formatUsd(diff)} vs ${(labels[sorted[1]![0]] ?? sorted[1]![0]).toLowerCase()}`;
  })() : null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-fg-secondary">Travel Mode Comparison</h3>
      </div>

      {/* Cost comparison badges */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {MODES.map((m) => {
          const cost = costs[m.key] ?? 0;
          const isCheapest = cheapestKey === m.key && cost > 0;
          return (
            <div key={m.key} className={`relative rounded-xl border p-3 text-center ${m.bg}`}>
              {isCheapest && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full">
                  Best
                </span>
              )}
              <m.icon size={16} className={`mx-auto mb-1 ${m.color}`} />
              <p className="text-xs text-fg-muted">{m.label}</p>
              <p className="text-sm font-bold text-fg">{cost > 0 ? formatUsd(cost) : '—'}</p>
            </div>
          );
        })}
      </div>

      {savings && (
        <p className="text-[11px] text-emerald-400 font-medium text-center mb-3">{savings}</p>
      )}

      {/* Flight inputs — open by default */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Plane size={12} className="text-sky-400" />
          <span className="text-xs font-semibold text-sky-400">Flight Estimate</span>
          {suggestedFlight > 0 && (
            <span className="ml-auto text-[10px] text-fg-faint">avg ~{formatUsd(suggestedFlight)}/person</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="$/person" type="number" min={0} step={10}
            value={flight.pricePerPerson || ''} placeholder="0"
            onChange={(e) => onFlightUpdate({ pricePerPerson: parseFloat(e.target.value) || 0 })} />
          <Input label="Travelers" type="number" min={1}
            value={flight.people} onChange={(e) => onFlightUpdate({ people: parseInt(e.target.value) || 1 })} />
          <Input label="Baggage $" type="number" min={0} step={5}
            value={flight.baggageFees || ''} placeholder="0"
            onChange={(e) => onFlightUpdate({ baggageFees: parseFloat(e.target.value) || 0 })} />
          <Input label="Airport transport $" type="number" min={0} step={5}
            value={flight.airportTransport || ''} placeholder="0"
            onChange={(e) => onFlightUpdate({ airportTransport: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>

      {/* Rental inputs — open by default */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Key size={12} className="text-amber-400" />
          <span className="text-xs font-semibold text-amber-400">Rental Car Estimate</span>
          <span className="ml-auto text-[10px] text-fg-faint">avg ~$55/day</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="$/day" type="number" min={0} step={5}
            value={rental.dailyRate || ''} placeholder="0"
            onChange={(e) => onRentalUpdate({ dailyRate: parseFloat(e.target.value) || 0 })} />
          <Input label="Days" type="number" min={0}
            value={rental.days || ''} placeholder="0"
            onChange={(e) => onRentalUpdate({ days: parseInt(e.target.value) || 0 })} />
          <Input label="Insurance $" type="number" min={0} step={5}
            value={rental.insurance || ''} placeholder="0"
            onChange={(e) => onRentalUpdate({ insurance: parseFloat(e.target.value) || 0 })} />
          <Input label="Fuel $" type="number" min={0} step={5}
            value={rental.fuelCost || ''} placeholder="0"
            onChange={(e) => onRentalUpdate({ fuelCost: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
    </Card>
  );
});

export default TravelModeCompare;
