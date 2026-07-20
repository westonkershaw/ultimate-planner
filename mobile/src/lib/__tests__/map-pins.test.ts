/**
 * map-pins.test.ts — coverage for the People map view's pure geocoding,
 * pin-shaping, layer-filtering, and bounding-region helpers (map-pins.ts).
 *
 * Deterministic by construction: every "today" is a fixed local-time
 * `new Date(y, m - 1, d)` literal (never wall-clock `new Date()`), and
 * `lastContactAt` ISO strings are derived via explicit Y-M-D-at-noon
 * construction (see `lastContactOn` below, matching the convention already
 * used in people-grouping.test.ts) so bucket expectations hold under any
 * host timezone, including the "late evening west of UTC" trap.
 *
 * Kept in its own file (like status-visual.test.ts), not merged into
 * people-grouping.test.ts: map-pins.ts transitively imports status-visual.ts,
 * which imports StatusColors from '@/constants/palette' — a module with no
 * react-native/global.css import, safe to load under vitest's node
 * environment. Isolating it here contains blast radius if that ever changes.
 */
import { describe, expect, it } from 'vitest';

import {
  geocodedPeople,
  pinsForLayer,
  regionForPins,
  toMapPin,
  type MapPin,
} from '../map-pins';
import type { Person, RelationshipStatus } from '../people-types';
import { statusVisual } from '../status-visual';

/** Local-midnight Date from a YYYY-MM-DD string, matching the module's own convention. */
function localDate(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

/**
 * Builds an ISO timestamp that lands on `dayKey` when read back with
 * localDayKey in the host timezone. Local noon (not midnight) keeps the
 * instant safely inside the local calendar day regardless of host UTC
 * offset — same convention as people-grouping.test.ts's lastContactOn.
 */
function lastContactOn(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0).toISOString();
}

const TODAY = localDate('2026-07-19');

let nextId = 0;
function makePerson(overrides: Partial<Person> = {}): Person {
  nextId += 1;
  return {
    id: `person-${nextId}`,
    userId: 'user-1',
    name: `Person ${nextId}`,
    photoUrl: null,
    category: 'friend',
    relationshipStatus: null,
    weddingDate: null,
    address: null,
    phone: null,
    email: null,
    socialLinks: [],
    latitude: null,
    longitude: null,
    lastContactAt: null,
    birthday: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('geocodedPeople', () => {
  it('excludes a person with null latitude', () => {
    const p = makePerson({ latitude: null, longitude: 12.5 });
    expect(geocodedPeople([p])).toEqual([]);
  });

  it('excludes a person with null longitude', () => {
    const p = makePerson({ latitude: 12.5, longitude: null });
    expect(geocodedPeople([p])).toEqual([]);
  });

  it('excludes a person with both null', () => {
    const p = makePerson({ latitude: null, longitude: null });
    expect(geocodedPeople([p])).toEqual([]);
  });

  it('includes a person with both present, INCLUDING the (0,0) edge case', () => {
    // 0 is a valid coordinate (Gulf of Guinea / equator+prime-meridian) — a
    // falsy check like `!person.latitude` would wrongly treat it as missing.
    // geocodedPeople uses `!= null`, so this must be included.
    const nullIsland = makePerson({ name: 'Null Islander', latitude: 0, longitude: 0 });
    const normal = makePerson({ name: 'Normal', latitude: 40.7, longitude: -74.0 });

    const result = geocodedPeople([nullIsland, normal]);

    expect(result.map((p) => p.name).sort()).toEqual(['Normal', 'Null Islander']);
  });
});

describe('toMapPin — dating category', () => {
  const cases: RelationshipStatus[] = ['engaged', 'newlywed', 'married', 'dating', 'interested', 'past'];

  it.each(cases)('cross-checks color+label against statusVisual for "%s"', (status) => {
    const person = makePerson({
      category: 'dating',
      relationshipStatus: status,
      latitude: 10,
      longitude: 20,
      // No weddingDate: resolveRelationshipStatus passes `status` through
      // unchanged when weddingDate is null, so the resolved status is
      // exactly `status` and we can cross-check statusVisual(status) directly.
      weddingDate: null,
    });

    const pin = toMapPin(person, TODAY);
    const expected = statusVisual(status);

    expect(pin.pinColor).toBe(expected.color);
    expect(pin.statusLabel).toBe(expected.label);
  });

  it('cascades engaged -> newlywed via resolveRelationshipStatus before consulting statusVisual', () => {
    // Wedding date is today, so resolveRelationshipStatus cascades
    // 'engaged' -> 'newlywed' — the pin must reflect the RESOLVED status,
    // not the raw stored 'engaged'.
    const person = makePerson({
      category: 'dating',
      relationshipStatus: 'engaged',
      weddingDate: '2026-07-19',
      latitude: 10,
      longitude: 20,
    });

    const pin = toMapPin(person, TODAY);
    const expected = statusVisual('newlywed');

    expect(pin.pinColor).toBe(expected.color);
    expect(pin.statusLabel).toBe(expected.label);
    expect(pin.statusLabel).not.toBe(statusVisual('engaged').label);
  });

  it('sets category and coordinates straight through from the person', () => {
    const person = makePerson({
      category: 'dating',
      relationshipStatus: 'dating',
      latitude: 51.5,
      longitude: -0.1,
    });

    const pin = toMapPin(person, TODAY);

    expect(pin.category).toBe('dating');
    expect(pin.latitude).toBe(51.5);
    expect(pin.longitude).toBe(-0.1);
    expect(pin.id).toBe(person.id);
  });
});

describe('toMapPin — friend/family category', () => {
  it('colors an in-touch friend/family person with StatusColors.dating (matching statusVisual("dating"))', () => {
    const person = makePerson({
      category: 'friend',
      lastContactAt: lastContactOn('2026-07-19'), // today -> in-touch
      latitude: 1,
      longitude: 1,
    });

    const pin = toMapPin(person, TODAY);

    // Documented reuse: in-touch -> StatusColors.dating, same hex statusVisual
    // uses for the 'dating' relationship status.
    expect(pin.pinColor).toBe(statusVisual('dating').color);
    expect(pin.statusLabel).toBe('In Touch');
  });

  it('colors a warming-up family person with StatusColors.interested (matching statusVisual("interested"))', () => {
    const person = makePerson({
      category: 'family',
      lastContactAt: lastContactOn('2026-07-04'), // 15 days ago -> warming-up
      latitude: 1,
      longitude: 1,
    });

    const pin = toMapPin(person, TODAY);

    expect(pin.pinColor).toBe(statusVisual('interested').color);
    expect(pin.statusLabel).toBe('Warming Up');
  });

  it('colors an out-of-touch friend with StatusColors.muted, distinct from in-touch and warming-up', () => {
    const person = makePerson({
      category: 'friend',
      lastContactAt: null, // null -> out-of-touch
      latitude: 1,
      longitude: 1,
    });

    const pin = toMapPin(person, TODAY);

    expect(pin.statusLabel).toBe('Out of Touch');
    expect(pin.pinColor).not.toBe(statusVisual('dating').color);
    expect(pin.pinColor).not.toBe(statusVisual('interested').color);
  });

  it('produces three distinct colors across the three recency buckets', () => {
    const inTouch = toMapPin(
      makePerson({ category: 'friend', lastContactAt: lastContactOn('2026-07-19'), latitude: 1, longitude: 1 }),
      TODAY
    );
    const warmingUp = toMapPin(
      makePerson({ category: 'friend', lastContactAt: lastContactOn('2026-07-04'), latitude: 1, longitude: 1 }),
      TODAY
    );
    const outOfTouch = toMapPin(
      makePerson({ category: 'friend', lastContactAt: null, latitude: 1, longitude: 1 }),
      TODAY
    );

    const colors = new Set([inTouch.pinColor, warmingUp.pinColor, outOfTouch.pinColor]);
    expect(colors.size).toBe(3);
  });
});

describe('pinsForLayer', () => {
  function scene() {
    const dater = makePerson({
      name: 'Dana',
      category: 'dating',
      relationshipStatus: 'dating',
      latitude: 1,
      longitude: 1,
    });
    const friend = makePerson({ name: 'Fred', category: 'friend', latitude: 2, longitude: 2 });
    const family = makePerson({ name: 'Fiona', category: 'family', latitude: 3, longitude: 3 });
    const ungeocodedDater = makePerson({
      name: 'Uma',
      category: 'dating',
      relationshipStatus: 'dating',
      latitude: null,
      longitude: null,
    });
    const ungeocodedFriend = makePerson({
      name: 'Ugo',
      category: 'friend',
      latitude: null,
      longitude: null,
    });
    return { dater, friend, family, ungeocodedDater, ungeocodedFriend };
  }

  it('"all" returns every geocoded person regardless of category', () => {
    const { dater, friend, family, ungeocodedDater, ungeocodedFriend } = scene();
    const pins = pinsForLayer([dater, friend, family, ungeocodedDater, ungeocodedFriend], 'all', TODAY);

    expect(pins.map((p) => p.name).sort()).toEqual(['Dana', 'Fiona', 'Fred']);
  });

  it('"dating" returns only category dating, excluding ungeocoded daters', () => {
    const { dater, friend, family, ungeocodedDater } = scene();
    const pins = pinsForLayer([dater, friend, family, ungeocodedDater], 'dating', TODAY);

    expect(pins.map((p) => p.name)).toEqual(['Dana']);
  });

  it('"family" returns only category family', () => {
    const { dater, friend, family } = scene();
    const pins = pinsForLayer([dater, friend, family], 'family', TODAY);

    expect(pins.map((p) => p.name)).toEqual(['Fiona']);
  });

  it('excludes ungeocoded people from every layer, including "all"', () => {
    const { ungeocodedDater, ungeocodedFriend } = scene();
    expect(pinsForLayer([ungeocodedDater, ungeocodedFriend], 'all', TODAY)).toEqual([]);
    expect(pinsForLayer([ungeocodedDater], 'dating', TODAY)).toEqual([]);
    expect(pinsForLayer([ungeocodedFriend], 'family', TODAY)).toEqual([]);
  });

  // Verified edge case: MapLayer declares the friend/family layer value as
  // 'friends' (plural), but Person['category'] for friends is 'friend'
  // (singular) — see people-types.ts's `CATEGORIES = ['friend', 'family',
  // 'dating']`. pinsForLayer already handles this via LAYER_CATEGORY
  // (map-pins.ts), which explicitly maps 'friends' -> 'friend' before
  // filtering, so the singular/plural mismatch never reaches `p.category ===
  // ...`. This test is a regression guard for that mapping.
  it('pinsForLayer maps plural layer "friends" to singular category "friend" via LAYER_CATEGORY', () => {
    const { dater, friend, family } = scene();
    const pins = pinsForLayer([dater, friend, family], 'friends', TODAY);

    expect(pins.map((p) => p.name)).toEqual(['Fred']);
  });
});

describe('regionForPins', () => {
  function pin(overrides: Partial<MapPin> = {}): MapPin {
    return {
      id: 'p',
      name: 'P',
      latitude: 0,
      longitude: 0,
      category: 'friend',
      pinColor: '#000',
      photoUrl: null,
      statusLabel: '',
      ...overrides,
    };
  }

  it('returns null for an empty pin list', () => {
    expect(regionForPins([])).toBeNull();
  });

  it('centers on a single pin and applies the minimum delta floor (not zero)', () => {
    const region = regionForPins([pin({ latitude: 40.7128, longitude: -74.006 })]);

    expect(region).not.toBeNull();
    expect(region!.latitude).toBe(40.7128);
    expect(region!.longitude).toBe(-74.006);
    // A single pin has zero lat/lng spread, so without a floor the delta
    // would be 0 (an unusable/invalid map region). Both deltas must be the
    // positive minimum floor.
    expect(region!.latitudeDelta).toBeGreaterThan(0);
    expect(region!.longitudeDelta).toBeGreaterThan(0);
  });

  it('bounding box for multiple pins contains every pin, with padding beyond the tight box', () => {
    const pins = [
      pin({ latitude: 10, longitude: 10 }),
      pin({ latitude: 20, longitude: 30 }),
      pin({ latitude: -5, longitude: 15 }),
    ];
    const region = regionForPins(pins)!;

    const minLat = Math.min(...pins.map((p) => p.latitude));
    const maxLat = Math.max(...pins.map((p) => p.latitude));
    const minLng = Math.min(...pins.map((p) => p.longitude));
    const maxLng = Math.max(...pins.map((p) => p.longitude));

    const regionMinLat = region.latitude - region.latitudeDelta / 2;
    const regionMaxLat = region.latitude + region.latitudeDelta / 2;
    const regionMinLng = region.longitude - region.longitudeDelta / 2;
    const regionMaxLng = region.longitude + region.longitudeDelta / 2;

    // Every pin's coordinate must fall within the computed region bounds.
    expect(minLat).toBeGreaterThanOrEqual(regionMinLat);
    expect(maxLat).toBeLessThanOrEqual(regionMaxLat);
    expect(minLng).toBeGreaterThanOrEqual(regionMinLng);
    expect(maxLng).toBeLessThanOrEqual(regionMaxLng);

    // Padding means the region is strictly larger than the tight bounding box.
    expect(region.latitudeDelta).toBeGreaterThan(maxLat - minLat);
    expect(region.longitudeDelta).toBeGreaterThan(maxLng - minLng);

    // Center is the midpoint of the tight box (padding is symmetric).
    expect(region.latitude).toBeCloseTo((minLat + maxLat) / 2, 10);
    expect(region.longitude).toBeCloseTo((minLng + maxLng) / 2, 10);
  });
});
