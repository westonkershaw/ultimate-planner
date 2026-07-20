import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function PeopleLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'People' }} />
      <Stack.Screen name="new" options={{ title: 'New person' }} />
      <Stack.Screen name="[id]" options={{ title: 'Person' }} />
      <Stack.Screen name="map" options={{ title: 'Map' }} />
    </Stack>
  );
}
