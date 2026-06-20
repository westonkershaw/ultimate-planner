/**
 * travelEngine.ts
 *
 * Pure calculation functions for the Explore travel planner.
 * All math lives here — UI components are consumers only.
 */

import type {
  TripInput,
  TripResult,
  FoodCostInput,
  FoodCostResult,
  AccommodationInput,
  AccommodationResult,
  EntertainmentInput,
  EntertainmentResult,
  MealTier,
  AccommodationTier,
  TripBudgetSummary,
  CustomCost,
  FlightEstimate,
  RentalCarEstimate,
  SplitPerson,
  SavedTrip,
} from '@/types';

// ── Constants ───────────────────────────────────────────────────────────────

const CO2_LBS_PER_GALLON = 19.6;

export const MEAL_DEFAULTS: Record<MealTier, number> = {
  budget: 12, moderate: 25, premium: 55,
};

export const ACCOMMODATION_DEFAULTS: Record<AccommodationTier, number> = {
  budget: 80, moderate: 160, premium: 350,
};

/** Average one-way flight cost per mile (used for rough estimates) */
const FLIGHT_COST_PER_MILE = 0.11;

// ── Fuel Economy Trip Calculator ────────────────────────────────────────────

export function calcEffectiveMpg(
  cityMpg: number, highwayMpg: number, cityPercent: number,
): number {
  const cityFrac = cityPercent / 100;
  if (cityMpg <= 0 || highwayMpg <= 0) return 0;
  return 1 / (cityFrac / cityMpg + (1 - cityFrac) / highwayMpg);
}

export function calcTripFuel(input: TripInput): TripResult {
  const effectiveMpg = calcEffectiveMpg(input.cityMpg, input.highwayMpg, input.cityPercent);
  if (effectiveMpg <= 0) return { effectiveMpg: 0, gallonsUsed: 0, fuelCost: 0, co2Pounds: 0 };
  const gallonsUsed = input.distanceMiles / effectiveMpg;
  return {
    effectiveMpg: r1(effectiveMpg),
    gallonsUsed: r1(gallonsUsed),
    fuelCost: r2(gallonsUsed * input.fuelPricePerGallon),
    co2Pounds: r1(gallonsUsed * CO2_LBS_PER_GALLON),
  };
}

// ── Food Cost ───────────────────────────────────────────────────────────────

export function calcFoodCost(input: FoodCostInput): FoodCostResult {
  const dailyCost = input.perMealCost * input.mealsPerDay * input.people;
  return {
    perMealCost: r2(input.perMealCost),
    dailyCost: r2(dailyCost),
    totalCost: r2(dailyCost * input.days),
  };
}

// ── Accommodation Cost ──────────────────────────────────────────────────────

export function calcAccommodationCost(input: AccommodationInput): AccommodationResult {
  const perNightTotal = input.perNightCost * input.rooms;
  return {
    perNightCost: r2(perNightTotal),
    totalCost: r2(perNightTotal * input.nights),
  };
}

// ── Entertainment Cost ──────────────────────────────────────────────────────

export function calcEntertainmentCost(input: EntertainmentInput): EntertainmentResult {
  const dailyCost = input.activitiesPerDay * input.avgActivityCost * input.people;
  return { dailyCost: r2(dailyCost), totalCost: r2(dailyCost * input.days) };
}

// ── Flight Cost ─────────────────────────────────────────────────────────────

export function calcFlightCost(est: FlightEstimate): number {
  return r2(est.pricePerPerson * est.people + est.baggageFees + est.airportTransport);
}

export function estimateFlightPrice(distanceMiles: number): number {
  if (distanceMiles <= 0) return 0;
  // Base fare + per-mile charge, rough average
  return r2(Math.max(80, 50 + distanceMiles * FLIGHT_COST_PER_MILE));
}

// ── Rental Car Cost ─────────────────────────────────────────────────────────

export function calcRentalCarCost(est: RentalCarEstimate): number {
  return r2(est.dailyRate * est.days + est.insurance + est.fuelCost);
}

// ── Drive vs Fly vs Rental Comparison ───────────────────────────────────────

export interface TravelModeComparison {
  ownCar: number;
  flight: number;
  rental: number;
  cheapest: 'ownCar' | 'flight' | 'rental';
}

export function compareTravelModes(
  driveFuelCost: number,
  flight: FlightEstimate,
  rental: RentalCarEstimate,
): TravelModeComparison {
  const ownCar = r2(driveFuelCost);
  const flightTotal = calcFlightCost(flight);
  const rentalTotal = calcRentalCarCost(rental);
  const min = Math.min(ownCar, flightTotal, rentalTotal);
  const cheapest = min === ownCar ? 'ownCar' : min === flightTotal ? 'flight' : 'rental';
  return { ownCar, flight: flightTotal, rental: rentalTotal, cheapest };
}

// ── Cost Splitting ──────────────────────────────────────────────────────────

export interface SplitResult {
  totalCost: number;
  perPerson: number;
  balances: { name: string; balance: number }[];
}

export function calcCostSplit(totalCost: number, people: SplitPerson[]): SplitResult {
  if (people.length === 0) return { totalCost, perPerson: totalCost, balances: [] };
  const perPerson = r2(totalCost / people.length);
  const balances = people.map((p) => ({
    name: p.name,
    balance: r2(p.paid - perPerson),
  }));
  return { totalCost, perPerson, balances };
}

// ── Full Trip Budget Summary ────────────────────────────────────────────────

export function calcTripBudget(params: {
  tripInput: TripInput;
  foodInput: FoodCostInput;
  accommodationInput: AccommodationInput;
  entertainmentInput: EntertainmentInput;
  customCosts: CustomCost[];
  roundTrip?: boolean;
  flightEstimate?: FlightEstimate;
  rentalCarEstimate?: RentalCarEstimate;
}): TripBudgetSummary {
  let fuel = calcTripFuel(params.tripInput).fuelCost;
  if (params.roundTrip) fuel *= 2;
  const food = calcFoodCost(params.foodInput).totalCost;
  const accommodation = calcAccommodationCost(params.accommodationInput).totalCost;
  const entertainment = calcEntertainmentCost(params.entertainmentInput).totalCost;
  const custom = params.customCosts.reduce((sum, c) => sum + c.amount, 0);
  const flight = params.flightEstimate ? calcFlightCost(params.flightEstimate) : 0;
  const rentalCar = params.rentalCarEstimate ? calcRentalCarCost(params.rentalCarEstimate) : 0;
  const total = fuel + food + accommodation + entertainment + custom + flight + rentalCar;
  return {
    fuel: r2(fuel), food: r2(food), accommodation: r2(accommodation),
    entertainment: r2(entertainment), custom: r2(custom),
    flight: r2(flight), rentalCar: r2(rentalCar), total: r2(total),
  };
}

/** Build budget from a full SavedTrip object */
export function calcTripBudgetFromTrip(trip: SavedTrip): TripBudgetSummary {
  return calcTripBudget({
    tripInput: {
      distanceMiles: trip.distanceMiles,
      cityPercent: trip.cityPercent,
      fuelPricePerGallon: trip.fuelPricePerGallon,
      cityMpg: trip.vehicleMpg?.city ?? 25,
      highwayMpg: trip.vehicleMpg?.highway ?? 30,
    },
    foodInput: {
      perMealCost: trip.perMealCost,
      days: trip.days,
      people: trip.people,
      mealsPerDay: trip.mealsPerDay,
    },
    accommodationInput: {
      perNightCost: trip.perNightCost,
      nights: trip.nights,
      rooms: trip.rooms,
    },
    entertainmentInput: {
      days: trip.days,
      people: trip.people,
      activitiesPerDay: trip.activitiesPerDay,
      avgActivityCost: trip.avgActivityCost,
    },
    customCosts: trip.customCosts,
    roundTrip: trip.roundTrip,
    flightEstimate: trip.flightEstimate,
    rentalCarEstimate: trip.rentalCar,
  });
}

// ── Formatting Helpers ──────────────────────────────────────────────────────

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 1): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
}

// ── Internal rounding helpers ───────────────────────────────────────────────

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
