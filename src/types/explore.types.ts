import type { ID, Timestamp } from './common.types';

// ── Vehicle & Fuel Economy ──────────────────────────────────────────────────

export interface VehicleMenuItem {
  text: string;
  value: string;
}

export interface VehicleSelection {
  year: string;
  make: string;
  model: string;
  optionId: string;
  optionLabel: string;
}

export interface VehicleMpg {
  city: number;
  highway: number;
  combined: number;
  fuelType: string;
  cylinders: number;
  displacement: number;
  transmission: string;
  drive: string;
  vehicleClass: string;
  annualFuelCost: number;
  co2Gpm: number;
}

export interface FuelPrices {
  regular: number;
  midgrade: number;
  premium: number;
  diesel: number;
  e85: number;
  electric: number;
  fetchedAt: Timestamp;
}

// ── Trip Calculator ─────────────────────────────────────────────────────────

export type DrivingMix = number; // 0-100, percent city driving

export interface TripInput {
  distanceMiles: number;
  cityPercent: DrivingMix;
  fuelPricePerGallon: number;
  cityMpg: number;
  highwayMpg: number;
}

export interface TripResult {
  effectiveMpg: number;
  gallonsUsed: number;
  fuelCost: number;
  co2Pounds: number;
}

// ── Route ───────────────────────────────────────────────────────────────────

export interface RouteLocation {
  name: string;
  lat: number;
  lon: number;
}

export interface RouteResult {
  from: RouteLocation;
  to: RouteLocation;
  distanceMiles: number;
  durationHours: number;
}

export interface Waypoint {
  id: ID;
  location: string;
  distanceFromPrev: number;
  durationFromPrev: number;
}

// ── Cost Estimators ─────────────────────────────────────────────────────────

export type MealTier = 'budget' | 'moderate' | 'premium';
export type AccommodationTier = 'budget' | 'moderate' | 'premium';

export interface FoodCostInput {
  perMealCost: number;
  days: number;
  people: number;
  mealsPerDay: number;
}

export interface FoodCostResult {
  perMealCost: number;
  dailyCost: number;
  totalCost: number;
}

export interface AccommodationInput {
  perNightCost: number;
  nights: number;
  rooms: number;
}

export interface AccommodationResult {
  perNightCost: number;
  totalCost: number;
}

export interface EntertainmentInput {
  days: number;
  people: number;
  activitiesPerDay: number;
  avgActivityCost: number;
}

export interface EntertainmentResult {
  dailyCost: number;
  totalCost: number;
}

// ── Itinerary ───────────────────────────────────────────────────────────────

export interface ItineraryBlock {
  id: ID;
  time: string;
  title: string;
  notes: string;
  cost: number;
}

export interface ItineraryDay {
  id: ID;
  dayNumber: number;
  label: string;
  blocks: ItineraryBlock[];
}

// ── Cost Splitting ──────────────────────────────────────────────────────────

export interface SplitPerson {
  id: ID;
  name: string;
  paid: number;
}

// ── Travel Mode Comparison ──────────────────────────────────────────────────

export interface FlightEstimate {
  pricePerPerson: number;
  people: number;
  baggageFees: number;
  airportTransport: number;
}

export interface RentalCarEstimate {
  dailyRate: number;
  days: number;
  insurance: number;
  fuelCost: number;
}

// ── Saved Trip ──────────────────────────────────────────────────────────────

export interface SavedTrip {
  id: ID;
  name: string;
  fromLocation: string;
  toLocation: string;
  waypoints: Waypoint[];
  roundTrip: boolean;
  distanceMiles: number;
  durationHours: number;
  days: number;
  nights: number;
  people: number;
  vehicle: VehicleSelection | null;
  vehicleMpg: VehicleMpg | null;
  cityPercent: DrivingMix;
  fuelPricePerGallon: number;
  mealTier: MealTier;
  perMealCost: number;
  mealsPerDay: number;
  accommodationTier: AccommodationTier;
  perNightCost: number;
  rooms: number;
  activitiesPerDay: number;
  avgActivityCost: number;
  customCosts: CustomCost[];
  // Itinerary
  itinerary: ItineraryDay[];
  // Cost splitting
  splitPeople: SplitPerson[];
  // Travel mode comparison
  flightEstimate: FlightEstimate;
  rentalCar: RentalCarEstimate;
  // Currency
  currency: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CustomCost {
  id: ID;
  label: string;
  amount: number;
}

export interface TripBudgetSummary {
  fuel: number;
  food: number;
  accommodation: number;
  entertainment: number;
  custom: number;
  flight: number;
  rentalCar: number;
  total: number;
}
