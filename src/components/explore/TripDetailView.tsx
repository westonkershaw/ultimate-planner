import React, { useCallback, useMemo } from 'react';
import { ArrowLeft, Users, Calendar, Moon, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import LocationRoute from './LocationRoute';
import VehiclePicker from './VehiclePicker';
import TripCalculator from './TripCalculator';
import { FoodEstimator, AccommodationEstimator, EntertainmentEstimator, CustomCosts } from './CostEstimators';
import TripSummary from './TripSummary';
import DayItinerary from './DayItinerary';
import CostSplitter from './CostSplitter';
import TravelModeCompare from './TravelModeCompare';
import GasPrices from './GasPrices';
import CurrencyConverter from './CurrencyConverter';
import TripExport from './TripExport';
import { useExploreStore } from '@/store/useExploreStore';
import { calcTripFuel, calcTripBudgetFromTrip } from '@/utils/travelEngine';
import type {
  SavedTrip, VehicleSelection, VehicleMpg, MealTier, AccommodationTier,
  FlightEstimate, RentalCarEstimate,
} from '@/types';

interface TripDetailViewProps {
  trip: SavedTrip;
  onBack: () => void;
}

const TripDetailView = React.memo(function TripDetailView({ trip, onBack }: TripDetailViewProps) {
  const store = useExploreStore();

  const update = useCallback(
    (updates: Partial<SavedTrip>) => store.updateTrip(trip.id, updates),
    [trip.id, store.updateTrip],
  );

  // Vehicle
  const handleVehicleSelect = useCallback(
    (v: VehicleSelection, mpg: VehicleMpg) => store.setTripVehicle(trip.id, v, mpg),
    [trip.id, store.setTripVehicle],
  );
  const handleVehicleClear = useCallback(() => store.clearTripVehicle(trip.id), [trip.id, store.clearTripVehicle]);

  // Custom costs
  const handleAddCost = useCallback(
    (label: string, amount: number) => store.addCustomCost(trip.id, label, amount),
    [trip.id, store.addCustomCost],
  );
  const handleRemoveCost = useCallback(
    (costId: string) => store.removeCustomCost(trip.id, costId),
    [trip.id, store.removeCustomCost],
  );

  // Route
  const handleRouteCalculated = useCallback(
    (distance: number, duration: number) => update({ distanceMiles: distance, durationHours: duration }),
    [update],
  );

  // Waypoints
  const handleAddWaypoint = useCallback(
    (location: string) => store.addWaypoint(trip.id, location),
    [trip.id, store.addWaypoint],
  );
  const handleRemoveWaypoint = useCallback(
    (waypointId: string) => store.removeWaypoint(trip.id, waypointId),
    [trip.id, store.removeWaypoint],
  );

  // Itinerary
  const handleAddDay = useCallback(() => store.addItineraryDay(trip.id), [trip.id, store.addItineraryDay]);
  const handleRemoveDay = useCallback(
    (dayId: string) => store.removeItineraryDay(trip.id, dayId),
    [trip.id, store.removeItineraryDay],
  );
  const handleAddBlock = useCallback(
    (dayId: string) => store.addItineraryBlock(trip.id, dayId),
    [trip.id, store.addItineraryBlock],
  );
  const handleUpdateBlock = useCallback(
    (dayId: string, blockId: string, updates: Record<string, unknown>) => store.updateItineraryBlock(trip.id, dayId, blockId, updates),
    [trip.id, store.updateItineraryBlock],
  );
  const handleRemoveBlock = useCallback(
    (dayId: string, blockId: string) => store.removeItineraryBlock(trip.id, dayId, blockId),
    [trip.id, store.removeItineraryBlock],
  );

  // Split
  const handleAddPerson = useCallback(
    (name: string) => store.addSplitPerson(trip.id, name),
    [trip.id, store.addSplitPerson],
  );
  const handleRemovePerson = useCallback(
    (personId: string) => store.removeSplitPerson(trip.id, personId),
    [trip.id, store.removeSplitPerson],
  );
  const handleUpdatePerson = useCallback(
    (personId: string, updates: Record<string, unknown>) => store.updateSplitPerson(trip.id, personId, updates),
    [trip.id, store.updateSplitPerson],
  );

  // Flight / Rental
  const handleFlightUpdate = useCallback(
    (updates: Partial<FlightEstimate>) => update({ flightEstimate: { ...trip.flightEstimate, ...updates } }),
    [update, trip.flightEstimate],
  );
  const handleRentalUpdate = useCallback(
    (updates: Partial<RentalCarEstimate>) => update({ rentalCar: { ...trip.rentalCar, ...updates } }),
    [update, trip.rentalCar],
  );

  // Fuel cost for travel mode comparison
  const driveFuelCost = useMemo(() => {
    const cityMpg = trip.vehicleMpg?.city ?? 25;
    const hwyMpg = trip.vehicleMpg?.highway ?? 30;
    const result = calcTripFuel({
      distanceMiles: trip.distanceMiles,
      cityPercent: trip.cityPercent,
      fuelPricePerGallon: trip.fuelPricePerGallon,
      cityMpg, highwayMpg: hwyMpg,
    });
    return trip.roundTrip ? result.fuelCost * 2 : result.fuelCost;
  }, [trip.distanceMiles, trip.cityPercent, trip.fuelPricePerGallon, trip.vehicleMpg, trip.roundTrip]);

  const budget = useMemo(() => calcTripBudgetFromTrip(trip), [trip]);

  // Days/nights consistency check
  const nightsHint = trip.days > 1 && trip.nights !== trip.days - 1;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <input value={trip.name} onChange={(e) => update({ name: e.target.value })}
            className="bg-transparent text-lg font-bold text-fg outline-none w-full truncate"
            placeholder="Trip name..." />
        </div>
      </div>

      {/* Trip basics */}
      <div className="grid grid-cols-3 gap-3 mb-2">
        <Input label="Days" type="number" min={1} value={trip.days}
          onChange={(e) => {
            const days = parseInt(e.target.value, 10) || 1;
            update({ days, nights: Math.max(0, days - 1) });
          }} icon={<Calendar size={14} />} />
        <Input label="Nights" type="number" min={0} value={trip.nights}
          onChange={(e) => update({ nights: parseInt(e.target.value, 10) || 0 })} icon={<Moon size={14} />} />
        <Input label="People" type="number" min={1} value={trip.people}
          onChange={(e) => update({ people: parseInt(e.target.value, 10) || 1 })} icon={<Users size={14} />} />
      </div>

      {nightsHint && (
        <div className="flex items-center gap-1.5 mb-4 text-[11px] text-amber-400/80">
          <AlertTriangle size={11} />
          <span>{trip.days} days usually means {trip.days - 1} nights — adjust if intentional</span>
        </div>
      )}

      {!nightsHint && <div className="mb-4" />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: inputs */}
        <div className="space-y-4">
          <LocationRoute
            fromLocation={trip.fromLocation} toLocation={trip.toLocation}
            waypoints={trip.waypoints} roundTrip={trip.roundTrip}
            distanceMiles={trip.distanceMiles} durationHours={trip.durationHours}
            onFromChange={(v) => update({ fromLocation: v })}
            onToChange={(v) => update({ toLocation: v })}
            onRoundTripToggle={(v) => update({ roundTrip: v })}
            onAddWaypoint={handleAddWaypoint}
            onRemoveWaypoint={handleRemoveWaypoint}
            onRouteCalculated={handleRouteCalculated}
          />

          <VehiclePicker vehicle={trip.vehicle} vehicleMpg={trip.vehicleMpg}
            onSelect={handleVehicleSelect} onClear={handleVehicleClear} />

          <TripCalculator distanceMiles={trip.distanceMiles} cityPercent={trip.cityPercent}
            fuelPricePerGallon={trip.fuelPricePerGallon} vehicleMpg={trip.vehicleMpg}
            onDistanceChange={(d) => update({ distanceMiles: d })}
            onCityPercentChange={(p) => update({ cityPercent: p })}
            onFuelPriceChange={(p) => update({ fuelPricePerGallon: p })} />

          <GasPrices prices={store.fuelPrices} onPricesFetched={store.setFuelPrices}
            onSelectPrice={(p) => update({ fuelPricePerGallon: p })} />

          <TravelModeCompare distanceMiles={trip.distanceMiles} people={trip.people} days={trip.days}
            driveFuelCost={driveFuelCost}
            flight={trip.flightEstimate} rental={trip.rentalCar}
            onFlightUpdate={handleFlightUpdate} onRentalUpdate={handleRentalUpdate} />

          <FoodEstimator tier={trip.mealTier} perMealCost={trip.perMealCost}
            days={trip.days} people={trip.people} mealsPerDay={trip.mealsPerDay}
            onTierChange={(t: MealTier) => update({ mealTier: t })}
            onPerMealCostChange={(c) => update({ perMealCost: c })}
            onMealsChange={(m) => update({ mealsPerDay: m })} />

          <AccommodationEstimator tier={trip.accommodationTier} perNightCost={trip.perNightCost}
            nights={trip.nights} rooms={trip.rooms}
            onTierChange={(t: AccommodationTier) => update({ accommodationTier: t })}
            onPerNightCostChange={(c) => update({ perNightCost: c })}
            onNightsChange={(n) => update({ nights: n })}
            onRoomsChange={(r) => update({ rooms: r })} />

          <EntertainmentEstimator days={trip.days} people={trip.people}
            activitiesPerDay={trip.activitiesPerDay} avgActivityCost={trip.avgActivityCost}
            onActivitiesChange={(n) => update({ activitiesPerDay: n })}
            onCostChange={(c) => update({ avgActivityCost: c })} />

          <CustomCosts costs={trip.customCosts} onAdd={handleAddCost} onRemove={handleRemoveCost} />

          <DayItinerary itinerary={trip.itinerary}
            onAddDay={handleAddDay} onRemoveDay={handleRemoveDay}
            onAddBlock={handleAddBlock} onUpdateBlock={handleUpdateBlock} onRemoveBlock={handleRemoveBlock} />
        </div>

        {/* Right column: summary + tools (sticky on desktop) */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <TripSummary trip={trip} />
          <CostSplitter totalCost={budget.total} people={trip.splitPeople} tripPeopleCount={trip.people}
            onAdd={handleAddPerson} onRemove={handleRemovePerson} onUpdate={handleUpdatePerson} />
          <CurrencyConverter tripCurrency={trip.currency}
            onCurrencyChange={(c) => update({ currency: c })} />
          <TripExport trip={trip} />
        </div>
      </div>
    </motion.div>
  );
});

export default TripDetailView;
