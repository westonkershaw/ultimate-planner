/**
 * map.tsx — full-screen map of geocoded people (Phase 3d), pushed from the
 * People list's header. One Marker per pin (map-pins.ts), colored via the
 * SAME status logic the list uses (statusVisual / recency buckets — no
 * duplicated color rules here). Tapping a Marker's Callout shows identity +
 * quick actions (map-callout.tsx); the LAYERS row (map-layer-picker.tsx)
 * filters by category.
 *
 * PROVIDER_DEFAULT (not PROVIDER_GOOGLE) so iOS renders Apple Maps. This
 * screen never requests location permission or shows the user's own
 * position — it only ever plots where PEOPLE are, not the device.
 *
 * The Callout itself has no onPress — MapCallout's identity row is a
 * CalloutSubview that already navigates to the detail screen, and giving
 * the outer Callout its own onPress too would double-fire (or steal the
 * touch from) the inner action rows. See map-callout.tsx.
 */

import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Callout, Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { MapCallout } from '@/components/people/map-callout';
import { MapEmptyState } from '@/components/people/map-empty-state';
import { MapLayerPicker } from '@/components/people/map-layer-picker';
import { Spacing } from '@/constants/theme';
import { pinsForLayer, regionForPins, type MapLayer } from '@/lib/map-pins';
import { useLogContact, usePeople } from '@/lib/people-hooks';

/**
 * Sane US-wide fallback region (roughly centers the contiguous US) for when
 * there are zero geocoded people yet and regionForPins has nothing to fit.
 */
const FALLBACK_REGION = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 50,
  longitudeDelta: 50,
};

export default function PeopleMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);
  const { data: people } = usePeople();
  const [layer, setLayer] = useState<MapLayer>('all');
  const logContact = useLogContact();
  const [loggingId, setLoggingId] = useState<string | null>(null);

  const allPeople = people ?? [];
  const pins = useMemo(() => pinsForLayer(allPeople, layer, today), [allPeople, layer, today]);
  const initialRegion = useMemo(() => regionForPins(pins) ?? FALLBACK_REGION, [pins]);

  async function handleLogContact(id: string) {
    setLoggingId(id);
    try {
      await logContact.mutateAsync(id);
    } finally {
      setLoggingId(null);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Map' }} />
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={false}>
        {pins.map((pin) => {
          const person = allPeople.find((p) => p.id === pin.id);
          return (
            <Marker key={pin.id} coordinate={{ latitude: pin.latitude, longitude: pin.longitude }} pinColor={pin.pinColor}>
              <Callout>
                <MapCallout
                  pin={pin}
                  onOpenDetail={() => router.push(`/people/${pin.id}`)}
                  onLogContact={() => handleLogContact(pin.id)}
                  logContactPending={logContact.isPending && loggingId === pin.id}
                  phone={person?.phone ?? null}
                />
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <View style={[styles.layerRow, { top: insets.top + Spacing.two }]}>
        <MapLayerPicker layer={layer} onChange={setLayer} />
      </View>

      {pins.length === 0 && <MapEmptyState onBack={() => router.push('/people')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  layerRow: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
  },
});
