import { useEffect, type ReactNode } from 'react';
import { useAuthStore, useLegacyDataStore, useJournalStore, useHabitStore, useSleepStore, useMoodStore, useReadingStore, useNetWorthStore } from '@/store';
import AuthScreen from './AuthScreen';

interface AuthGateProps {
  children: ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const user = useAuthStore((s) => s.user);
  const hydrating = useAuthStore((s) => s.hydrating);
  const hydrate = useAuthStore((s) => s.hydrate);
  const reloadLegacyData = useLegacyDataStore((s) => s.reload);

  // Initial Supabase session restore on mount.
  useEffect(() => { hydrate(); }, [hydrate]);

  // Re-key all per-user stores whenever the auth user changes. The legacy
  // store reads its storage key dynamically from userId; the journal store
  // (and future per-user stores) needs an explicit reset.
  useEffect(() => {
    const uid = user?.id ?? 'guest';
    reloadLegacyData();
    useJournalStore.getState().resetForUser(uid);
    useHabitStore.getState().resetForUser(uid);
    useSleepStore.getState().resetForUser(uid);
    useMoodStore.getState().resetForUser(uid);
    useReadingStore.getState().resetForUser(uid);
    useNetWorthStore.getState().resetForUser(uid);
  }, [user?.id, reloadLegacyData]);

  if (hydrating) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#08090d]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return <>{children}</>;
}
