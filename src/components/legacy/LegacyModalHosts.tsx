import React, { Suspense, useCallback } from 'react';
import { useUIStore } from '@/store';
import { useLegacyDataStore, useAuthStore } from '@/store';
import type { ActiveView } from '@/types';

// ── Legacy modal adapters ──────────────────────────────────────────────────
//
// Wraps the monolith's modal components so the new TS shell can render them
// without rebuilding them from scratch. Each host pulls store state and
// dismiss-handlers internally so the Shell only needs to render <ModalLayer/>.

const OnboardingWizard      = React.lazy(() => import('../OnboardingWizard.jsx'));
const MorningDashboardModal = React.lazy(() => import('../MorningDashboardModal.jsx'));
const GetStartedChecklist   = React.lazy(() => import('../GetStartedChecklist.jsx'));
const MonthlyReviewModal    = React.lazy(() => import('../MonthlyReviewModal.jsx'));
const PaywallModal          = React.lazy(() => import('../PaywallModal.jsx'));
const BankConnectModal      = React.lazy(() => import('../finance/BankConnectModal'));

// Map legacy tab ids → new shell ActiveView ids. The monolith's modals call
// onNavigate with legacy ids ('plan', 'grow', 'health', etc.) plus optional
// sub-tabs; the new shell uses flat ActiveView ids. Bridge the most common
// destinations so navigation from a modal lands somewhere sensible.
const LEGACY_TAB_TO_VIEW: Record<string, ActiveView> = {
  plan:     'tasks',
  health:   'workouts',
  finance:  'finance',
  grow:     'habits',
  goals:    'goals',
  body:     'body',
  workouts: 'workouts',
  sleep:    'sleep',
  mood:     'mood',
  meals:    'meals',
  habits:   'habits',
  journal:  'journal',
  reading:  'reading',
  study:    'study',
  vision:   'vision',
  travel:   'travel',
  focus:    'focus',
  insights: 'insights',
  social:   'social',
  projects: 'projects',
  wellness: 'wellness',
  networth: 'networth',
  community: 'community',
  dashboard: 'dashboard',
  settings: 'settings',
  explore:  'explore',
  tasks:    'tasks',
  timeblock: 'timeblock',
};

function mapLegacyTab(legacyId: string): ActiveView {
  return LEGACY_TAB_TO_VIEW[legacyId] ?? 'dashboard';
}

function Suspended({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

function useLegacy() {
  const data = useLegacyDataStore((s) => s.data);
  const onChange = useLegacyDataStore((s) => s.onChange);
  return { data, onChange };
}

// ── Hosts ────────────────────────────────────────────────────────────────

export function OnboardingHost() {
  const closeModal = useUIStore((s) => s.closeModal);
  const onComplete = useCallback(() => {
    try { localStorage.setItem('up_onboarding_complete', '1'); } catch { /* ignore */ }
    closeModal();
  }, [closeModal]);

  return <Suspended><OnboardingWizard onComplete={onComplete} /></Suspended>;
}

export function MorningDashboardHost() {
  const { data, onChange } = useLegacy();
  const closeModal = useUIStore((s) => s.closeModal);
  const setActiveView = useUIStore((s) => s.setActiveView);

  const onClose = useCallback(() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    try { localStorage.setItem('up_morning_dashboard_seen', today); } catch { /* ignore */ }
    closeModal();
  }, [closeModal]);

  const onNavigate = useCallback((tabId: string) => {
    setActiveView(mapLegacyTab(tabId));
    closeModal();
  }, [closeModal, setActiveView]);

  const isPro = !!(data as { isPro?: boolean }).isPro;

  return (
    <Suspended>
      <MorningDashboardModal
        data={data}
        onChange={onChange}
        onClose={onClose}
        onNavigate={onNavigate}
        isPro={isPro}
      />
    </Suspended>
  );
}

export function GetStartedHost() {
  const { data } = useLegacy();
  const closeModal = useUIStore((s) => s.closeModal);
  const setActiveView = useUIStore((s) => s.setActiveView);

  const onDismiss = useCallback(() => {
    try { localStorage.setItem('up_get_started_dismissed', '1'); } catch { /* ignore */ }
    closeModal();
  }, [closeModal]);

  const onNavigate = useCallback((tabId: string) => {
    setActiveView(mapLegacyTab(tabId));
  }, [setActiveView]);

  return (
    <Suspended>
      <GetStartedChecklist data={data} onNavigate={onNavigate} onDismiss={onDismiss} />
    </Suspended>
  );
}

export function MonthlyReviewHost() {
  const { data, onChange } = useLegacy();
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);

  return (
    <Suspended>
      <MonthlyReviewModal
        data={data}
        onChange={onChange}
        onClose={closeModal}
        addToast={(msg: string) => addToast(msg)}
      />
    </Suspended>
  );
}

export function PaywallHost() {
  const authUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);

  const onSuccess = useCallback(() => {
    if (authUser) setUser({ ...authUser, isPro: true });
    addToast('Welcome to Pro!', 'success');
    closeModal();
  }, [authUser, setUser, addToast, closeModal]);

  return (
    <Suspended>
      <PaywallModal authUser={authUser} onClose={closeModal} onSuccess={onSuccess} />
    </Suspended>
  );
}

export function BankConnectHost() {
  const activeModal = useUIStore((s) => s.activeModal);
  const closeModal = useUIStore((s) => s.closeModal);
  return (
    <Suspended>
      <BankConnectModal open={activeModal === 'bankConnect'} onClose={closeModal} />
    </Suspended>
  );
}
