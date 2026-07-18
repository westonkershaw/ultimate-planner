import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function GoalsLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'Goals' }} />
      <Stack.Screen name="new" options={{ title: 'New goal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Goal' }} />
    </Stack>
  );
}
