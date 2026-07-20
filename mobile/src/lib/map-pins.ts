/**
 * map-pins.ts — pure geocoding/filtering/pin-shaping helpers for the People
 * map view. NO react-native-maps import here (and no other native deps):
 * this is math over Person[] + color/label lookups, testable in isolation
 * like people-grouping.ts. The screen that renders <MapView> imports this
 * module for data, not the other way around.
 */

import { contactRecencyBucket, type RecencyBucket } from './people-grouping';
import type { Category, Person } from './people-types';
import { resolveRelationshipStatus } from './relationship-status';
import { statusVisual } from './status-visual';

import { StatusColors } from '@/constants/palette';

export interface MapPin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: Category;
  pinColor: string;
  photoUrl: string | null;
  statusLabel: string;
}

export type MapLayer = 'dating' | 'friends' | 'family' | 'all';

/**
 * Friend/family recency-bucket -> pin color, reusing the SAME StatusColors
 * entries the Dating list already uses via statusVisual (no new hex values):
 *   in-touch -> StatusColors.dating (green), warming-up -> StatusColors.interested
 *   (yellow), out-of-touch -> StatusColors.muted (grey).
 */
const RECENCY_PIN_COLOR: Record<RecencyBucket, string> = {
  'in-touch': StatusColors.dating,
  'warming-up': StatusColors.interested,
  'out-of-touch': StatusColors.muted,
};

/** Same human labels people-grouping.ts uses for its recency section headers. */
const RECENCY_PIN_LABEL: Record<RecencyBucket, string> = {
  'in-touch': 'In Touch',
  'warming-up': 'Warming Up',
  'out-of-touch': 'Out of Touch',
};

/**
 * People with BOTH latitude and longitude present — a person can't be pinned
 * without coords. `!= null` (not a falsy check): 0 is a valid coordinate
 * (equator / prime meridian), so `!person.latitude` would wrongly drop it.
 */
export function geocodedPeople(people: Person[]): Person[] {
  return people.filter((p) => p.latitude != null && p.longitude != null);
}

/**
 * Maps a single geocoded person to a MapPin. Caller must ensure
 * latitude/longitude are non-null (geocodedPeople already filters for this).
 */
export function toMapPin(person: Person, today: Date): MapPin {
  let pinColor: string;
  let statusLabel: string;

  if (person.category === 'dating') {
    const resolved = resolveRelationshipStatus(person.relationshipStatus, person.weddingDate, today);
    const visual = statusVisual(resolved);
    pinColor = visual.color;
    statusLabel = visual.label;
  } else {
    const bucket = contactRecencyBucket(person.lastContactAt, today);
    pinColor = RECENCY_PIN_COLOR[bucket];
    statusLabel = RECENCY_PIN_LABEL[bucket];
  }

  return {
    id: person.id,
    name: person.name,
    // Non-null per this function's contract (see geocodedPeople).
    latitude: person.latitude as number,
    longitude: person.longitude as number,
    category: person.category,
    pinColor,
    photoUrl: person.photoUrl,
    statusLabel,
  };
}

/**
 * MapLayer -> Category for filtering. Layer values match Category 1:1
 * EXCEPT 'friends' (plural, matching the UI's "Friends" toggle label) vs.
 * Category's 'friend' (singular, per people-types.ts CATEGORIES) — mapped
 * explicitly here so `p.category === layer` is never compared directly for
 * that arm. 'all' isn't a Category and is handled separately below.
 */
const LAYER_CATEGORY: Record<Exclude<MapLayer, 'all'>, Category> = {
  dating: 'dating',
  friends: 'friend',
  family: 'family',
};

/**
 * Geocoded people for the given layer, mapped to pins. 'all' applies no
 * category filter; the other layers match via LAYER_CATEGORY.
 */
export function pinsForLayer(people: Person[], layer: MapLayer, today: Date): MapPin[] {
  const geocoded = geocodedPeople(people);
  const filtered = layer === 'all' ? geocoded : geocoded.filter((p) => p.category === LAYER_CATEGORY[layer]);
  return filtered.map((person) => toMapPin(person, today));
}

const MIN_DELTA = 0.02;
const PADDING_FACTOR = 1.2; // ~20% padding

/**
 * Bounding-box region covering all pins, with ~20% padding and a minimum
 * delta so a single pin (or a tight cluster) doesn't zoom in absurdly.
 * Null when there are no pins to fit.
 */
export function regionForPins(
  pins: MapPin[]
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null {
  if (pins.length === 0) return null;

  let minLat = pins[0]!.latitude;
  let maxLat = pins[0]!.latitude;
  let minLng = pins[0]!.longitude;
  let maxLng = pins[0]!.longitude;

  for (const pin of pins) {
    if (pin.latitude < minLat) minLat = pin.latitude;
    if (pin.latitude > maxLat) maxLat = pin.latitude;
    if (pin.longitude < minLng) minLng = pin.longitude;
    if (pin.longitude > maxLng) maxLng = pin.longitude;
  }

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  const latitudeDelta = Math.max((maxLat - minLat) * PADDING_FACTOR, MIN_DELTA);
  const longitudeDelta = Math.max((maxLng - minLng) * PADDING_FACTOR, MIN_DELTA);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
}
