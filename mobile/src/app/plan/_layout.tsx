import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function PlanLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="today" options={{ title: "Today's Plan" }} />
      <Stack.Screen name="new-block" options={{ title: 'New Block' }} />
      <Stack.Screen name="weekly-wizard" options={{ title: 'Weekly Planning' }} />
    </Stack>
  );
}
