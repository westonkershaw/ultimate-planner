/**
 * geocode.test.ts — coverage for geocodeAddress (geocode.ts), the forward
 * geocoding wrapper around expo-location's geocodeAsync that populates
 * Person.latitude/longitude for the Phase 3d map view (map-pins.ts).
 *
 * expo-location is a native module and cannot run under vitest's node
 * environment, so the entire package is replaced with a vi.mock factory.
 * geocode.ts imports only `geocodeAsync` from 'expo-location' (confirmed by
 * reading the source) and does NOT request foreground location permission —
 * per the module's own header comment, CLGeocoder-backed forward geocoding
 * is a network lookup, not a device-sensor read, so expo-location's iOS
 * binding skips the permission guard entirely for geocodeAsync. This app
 * only ships iOS. Case 6 (permission-denied short-circuit) is therefore
 * N/A and is documented as skipped rather than faked, per the task's own
 * instruction: "If geocode.ts does not request permission at all, skip this
 * case and explain why."
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const geocodeAsyncMock = vi.fn();

vi.mock('expo-location', () => ({
  geocodeAsync: (...args: unknown[]) => geocodeAsyncMock(...args),
}));

// Imported AFTER the mock is registered so geocode.ts binds to the mock.
const { geocodeAddress } = await import('../geocode');

describe('geocodeAddress', () => {
  beforeEach(() => {
    geocodeAsyncMock.mockReset();
  });

  it('returns null for an empty string without calling the geocoder', async () => {
    const result = await geocodeAddress('');

    expect(result).toBeNull();
    expect(geocodeAsyncMock).not.toHaveBeenCalled();
  });

  it('returns null for a whitespace-only string without calling the geocoder', async () => {
    const result = await geocodeAddress('   \n\t  ');

    expect(result).toBeNull();
    expect(geocodeAsyncMock).not.toHaveBeenCalled();
  });

  it('returns null when the geocoder resolves an empty result list', async () => {
    geocodeAsyncMock.mockResolvedValueOnce([]);

    const result = await geocodeAddress('1600 Amphitheatre Parkway');

    expect(result).toBeNull();
    expect(geocodeAsyncMock).toHaveBeenCalledWith('1600 Amphitheatre Parkway');
  });

  it('resolves to the first result mapped to latitude/longitude when the geocoder finds matches', async () => {
    geocodeAsyncMock.mockResolvedValueOnce([
      { latitude: 37.422, longitude: -122.084, altitude: 0, accuracy: 5 },
      { latitude: 40.0, longitude: -73.0, altitude: 0, accuracy: 5 },
    ]);

    const result = await geocodeAddress('1600 Amphitheatre Parkway');

    expect(result).toEqual({ latitude: 37.422, longitude: -122.084 });
  });

  it('trims surrounding whitespace before geocoding', async () => {
    geocodeAsyncMock.mockResolvedValueOnce([{ latitude: 1, longitude: 2 }]);

    const result = await geocodeAddress('  221B Baker Street  ');

    expect(geocodeAsyncMock).toHaveBeenCalledWith('221B Baker Street');
    expect(result).toEqual({ latitude: 1, longitude: 2 });
  });

  it('resolves to null instead of rejecting when the geocoder rejects', async () => {
    geocodeAsyncMock.mockRejectedValueOnce(new Error('network unavailable'));

    await expect(geocodeAddress('Nowhere Ave')).resolves.toBeNull();
  });

  it('resolves to null instead of throwing when the geocoder throws synchronously', async () => {
    geocodeAsyncMock.mockImplementationOnce(() => {
      throw new Error('native module not linked');
    });

    await expect(geocodeAddress('Nowhere Ave')).resolves.toBeNull();
  });

  // Case 6 (permission-denied short-circuit) intentionally omitted: geocode.ts
  // does not import or call any permission API (requestForegroundPermissionsAsync
  // etc.) from expo-location — only geocodeAsync is imported. Per the module's
  // own header comment, iOS forward geocoding is a network lookup that skips
  // expo-location's permission guard, so there is no permission-gated code path
  // here to test. Confirmed by reading the full source of geocode.ts.
});
