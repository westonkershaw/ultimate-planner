/**
 * geocode.ts — forward geocoding (address string -> lat/lng) for the People
 * detail screen, wrapping expo-location's geocodeAsync. This is what
 * populates Person.latitude/longitude, which map-pins.ts then consumes to
 * plot the Phase 3d map view.
 *
 * iOS note: CLGeocoder-backed forward geocoding is a network lookup, not a
 * device-sensor read, so it does NOT require foreground location permission
 * on iOS (confirmed by reading expo-location's native module: geocodeAsync's
 * binding skips the ensureForegroundLocationPermissions guard that every
 * sensor-based function — getCurrentPositionAsync, watchPositionAsync, etc.
 * — calls). No permission request is made here as a result. Android DOES
 * require foreground permission per expo-location's own docs, but this app
 * only ships iOS.
 */

import { geocodeAsync } from 'expo-location';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

/**
 * Resolves a free-text address to coordinates, or null if it can't be
 * resolved. Never throws — any failure (empty input, network error, service
 * unavailable, etc.) resolves to null so callers can treat geocoding as
 * best-effort.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  try {
    const results = await geocodeAsync(trimmed);
    if (results.length === 0) return null;
    const [first] = results;
    return { latitude: first!.latitude, longitude: first!.longitude };
  } catch {
    // Address text is personal contact info — keep this log content-free.
    console.warn('geocodeAddress: geocoding failed');
    return null;
  }
}
