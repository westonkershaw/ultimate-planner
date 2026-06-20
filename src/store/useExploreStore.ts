import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  ID,
  SavedTrip,
  VehicleSelection,
  VehicleMpg,
  FuelPrices,
  MealTier,
  AccommodationTier,
  Waypoint,
  ItineraryBlock,
  SplitPerson,
} from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────

const uid = (): ID => Math.random().toString(36).slice(2, 9);

// ── State & Action Interfaces ──────────────────────────────────────────────

interface ExploreState {
  trips: SavedTrip[];
  fuelPrices: FuelPrices | null;
}

interface ExploreActions {
  addTrip: (name: string, from: string, to: string) => ID;
  updateTrip: (id: ID, updates: Partial<Omit<SavedTrip, 'id' | 'createdAt'>>) => void;
  deleteTrip: (id: ID) => void;
  setTripVehicle: (tripId: ID, vehicle: VehicleSelection, mpg: VehicleMpg) => void;
  clearTripVehicle: (tripId: ID) => void;
  addCustomCost: (tripId: ID, label: string, amount: number) => void;
  removeCustomCost: (tripId: ID, costId: ID) => void;
  setFuelPrices: (prices: FuelPrices) => void;
  // Waypoints
  addWaypoint: (tripId: ID, location: string) => void;
  removeWaypoint: (tripId: ID, waypointId: ID) => void;
  updateWaypoint: (tripId: ID, waypointId: ID, updates: Partial<Waypoint>) => void;
  // Itinerary
  addItineraryDay: (tripId: ID) => void;
  removeItineraryDay: (tripId: ID, dayId: ID) => void;
  addItineraryBlock: (tripId: ID, dayId: ID) => void;
  updateItineraryBlock: (tripId: ID, dayId: ID, blockId: ID, updates: Partial<ItineraryBlock>) => void;
  removeItineraryBlock: (tripId: ID, dayId: ID, blockId: ID) => void;
  // Split
  addSplitPerson: (tripId: ID, name: string) => void;
  removeSplitPerson: (tripId: ID, personId: ID) => void;
  updateSplitPerson: (tripId: ID, personId: ID, updates: Partial<SplitPerson>) => void;
}

export type ExploreStore = ExploreState & ExploreActions;

// ── Default Trip ────────────────────────────────────────────────────────────

function defaultTrip(name: string, from: string, to: string): SavedTrip {
  const now = Date.now();
  return {
    id: uid(), name, fromLocation: from, toLocation: to,
    waypoints: [], roundTrip: false,
    distanceMiles: 0, durationHours: 0,
    days: 1, nights: 1, people: 1,
    vehicle: null, vehicleMpg: null,
    cityPercent: 45, fuelPricePerGallon: 3.50,
    mealTier: 'moderate' as MealTier, perMealCost: 25, mealsPerDay: 3,
    accommodationTier: 'moderate' as AccommodationTier, perNightCost: 160, rooms: 1,
    activitiesPerDay: 1, avgActivityCost: 30,
    customCosts: [], itinerary: [], splitPeople: [],
    flightEstimate: { pricePerPerson: 0, people: 1, baggageFees: 0, airportTransport: 0 },
    rentalCar: { dailyRate: 0, days: 0, insurance: 0, fuelCost: 0 },
    currency: 'USD',
    createdAt: now, updatedAt: now,
  };
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useExploreStore = create<ExploreStore>()(
  persist(
    immer((set) => ({
      trips: [],
      fuelPrices: null,

      addTrip: (name, from, to) => {
        const trip = defaultTrip(name, from, to);
        set((d) => { d.trips.unshift(trip); });
        return trip.id;
      },
      updateTrip: (id, updates) => set((d) => {
        const t = d.trips.find((x) => x.id === id);
        if (t) Object.assign(t, updates, { updatedAt: Date.now() });
      }),
      deleteTrip: (id) => set((d) => { d.trips = d.trips.filter((t) => t.id !== id); }),

      setTripVehicle: (tripId, vehicle, mpg) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (t) { t.vehicle = vehicle; t.vehicleMpg = mpg; t.updatedAt = Date.now(); }
      }),
      clearTripVehicle: (tripId) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (t) { t.vehicle = null; t.vehicleMpg = null; t.updatedAt = Date.now(); }
      }),

      addCustomCost: (tripId, label, amount) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (t) { t.customCosts.push({ id: uid(), label, amount }); t.updatedAt = Date.now(); }
      }),
      removeCustomCost: (tripId, costId) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (t) { t.customCosts = t.customCosts.filter((c) => c.id !== costId); t.updatedAt = Date.now(); }
      }),

      setFuelPrices: (prices) => set((d) => { d.fuelPrices = prices; }),

      // Waypoints
      addWaypoint: (tripId, location) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (t) { t.waypoints.push({ id: uid(), location, distanceFromPrev: 0, durationFromPrev: 0 }); t.updatedAt = Date.now(); }
      }),
      removeWaypoint: (tripId, waypointId) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (t) { t.waypoints = t.waypoints.filter((w) => w.id !== waypointId); t.updatedAt = Date.now(); }
      }),
      updateWaypoint: (tripId, waypointId, updates) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (!t) return;
        const w = t.waypoints.find((x) => x.id === waypointId);
        if (w) { Object.assign(w, updates); t.updatedAt = Date.now(); }
      }),

      // Itinerary
      addItineraryDay: (tripId) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (!t) return;
        const dayNum = t.itinerary.length + 1;
        t.itinerary.push({ id: uid(), dayNumber: dayNum, label: `Day ${dayNum}`, blocks: [] });
        t.updatedAt = Date.now();
      }),
      removeItineraryDay: (tripId, dayId) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (!t) return;
        t.itinerary = t.itinerary.filter((day) => day.id !== dayId);
        t.itinerary.forEach((day, i) => { day.dayNumber = i + 1; });
        t.updatedAt = Date.now();
      }),
      addItineraryBlock: (tripId, dayId) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (!t) return;
        const day = t.itinerary.find((x) => x.id === dayId);
        if (day) { day.blocks.push({ id: uid(), time: '09:00', title: '', notes: '', cost: 0 }); t.updatedAt = Date.now(); }
      }),
      updateItineraryBlock: (tripId, dayId, blockId, updates) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (!t) return;
        const day = t.itinerary.find((x) => x.id === dayId);
        if (!day) return;
        const block = day.blocks.find((x) => x.id === blockId);
        if (block) { Object.assign(block, updates); t.updatedAt = Date.now(); }
      }),
      removeItineraryBlock: (tripId, dayId, blockId) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (!t) return;
        const day = t.itinerary.find((x) => x.id === dayId);
        if (day) { day.blocks = day.blocks.filter((b) => b.id !== blockId); t.updatedAt = Date.now(); }
      }),

      // Split
      addSplitPerson: (tripId, name) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (t) { t.splitPeople.push({ id: uid(), name, paid: 0 }); t.updatedAt = Date.now(); }
      }),
      removeSplitPerson: (tripId, personId) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (t) { t.splitPeople = t.splitPeople.filter((p) => p.id !== personId); t.updatedAt = Date.now(); }
      }),
      updateSplitPerson: (tripId, personId, updates) => set((d) => {
        const t = d.trips.find((x) => x.id === tripId);
        if (!t) return;
        const p = t.splitPeople.find((x) => x.id === personId);
        if (p) { Object.assign(p, updates); t.updatedAt = Date.now(); }
      }),
    })),
    {
      name: 'up_explore',
      version: 2,
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>;
        const trips = (state.trips ?? []) as Record<string, unknown>[];
        for (const t of trips) {
          if (!t.waypoints) t.waypoints = [];
          if (t.roundTrip === undefined) t.roundTrip = false;
          if (!t.itinerary) t.itinerary = [];
          if (!t.splitPeople) t.splitPeople = [];
          if (!t.flightEstimate) t.flightEstimate = { pricePerPerson: 0, people: 1, baggageFees: 0, airportTransport: 0 };
          if (!t.rentalCar) t.rentalCar = { dailyRate: 0, days: 0, insurance: 0, fuelCost: 0 };
          if (!t.currency) t.currency = 'USD';
          if (t.durationHours === undefined) t.durationHours = 0;
        }
        return state as unknown as ExploreStore;
      },
    },
  ),
);
