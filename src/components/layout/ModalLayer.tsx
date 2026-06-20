import { useEffect } from 'react';
import { useUIStore } from '@/store';
import { useLegacyDataStore } from '@/store';
import {
  OnboardingHost,
  MorningDashboardHost,
  GetStartedHost,
  MonthlyReviewHost,
  PaywallHost,
  BankConnectHost,
} from '@/components/legacy/LegacyModalHosts';
import { shouldShowMonthlyReview } from '@/components/MonthlyReviewModal.jsx';

// ── Auto-trigger helpers ────────────────────────────────────────────────────

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isMorning(): boolean {
  const h = new Date().getHours();
  return h >= 5 && h < 12;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ModalLayer() {
  const activeModal = useUIStore((s) => s.activeModal);
  const openModal = useUIStore((s) => s.openModal);

  // Auto-show priorities: onboarding > monthlyReview > morningDashboard > getStarted.
  // Each runs once: a higher-priority modal queued earlier doesn't get overridden.
  useEffect(() => {
    if (useUIStore.getState().activeModal) return;

    // 1. Onboarding for first-time users
    const onboarded = localStorage.getItem('up_onboarding_complete') === '1';
    if (!onboarded) {
      openModal('onboarding');
      return;
    }

    // 2. Monthly review when due
    const data = useLegacyDataStore.getState().data;
    try {
      if (shouldShowMonthlyReview(data)) {
        openModal('monthlyReview');
        return;
      }
    } catch { /* ignore */ }

    // 3. Morning dashboard once/day
    const seen = localStorage.getItem('up_morning_dashboard_seen');
    if (isMorning() && seen !== todayKey()) {
      openModal('morningDashboard');
      return;
    }

    // 4. Get started checklist when dismissable items remain
    const dismissed = localStorage.getItem('up_get_started_dismissed') === '1';
    if (!dismissed) {
      openModal('getStarted');
    }
  }, [openModal]);

  switch (activeModal) {
    case 'onboarding':       return <OnboardingHost />;
    case 'morningDashboard': return <MorningDashboardHost />;
    case 'getStarted':       return <GetStartedHost />;
    case 'monthlyReview':    return <MonthlyReviewHost />;
    case 'paywall':          return <PaywallHost />;
    case 'bankConnect':      return <BankConnectHost />;
    default:                 return null;
  }
}
