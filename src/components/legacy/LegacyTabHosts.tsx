import React, { Suspense } from 'react';
import { useLegacyDataStore } from '@/store';

// ── Legacy tab adapters ────────────────────────────────────────────────────
//
// Most pre-migration tabs still consume `{ data, onChange }`. These thin hosts
// bridge them to the new Zustand-based legacy data store so the App.tsx shell
// can mount them without prop-drilling through the monolith.

// Lazy-load to keep the main bundle slim — these are large legacy files.
const TravelPlannerTab  = React.lazy(() => import('../TravelPlannerTab.jsx'));
const MealPlannerTab    = React.lazy(() => import('../MealPlannerTab.jsx'));
const VisionBoardTab    = React.lazy(() => import('../VisionBoardTab.jsx'));
const StudyModeTab      = React.lazy(() => import('../StudyModeTab.jsx'));
const WellnessTab       = React.lazy(() => import('../WellnessTab.jsx'));
const TimeBlockingTab   = React.lazy(() => import('../TimeBlockingTab.jsx'));
const FocusMode         = React.lazy(() => import('../FocusMode.jsx'));
const SocialCardsTab    = React.lazy(() => import('../SocialCardsTab.jsx'));
const GoalsTabV2        = React.lazy(() => import('../GoalsTabV2.jsx'));
const InsightsDashboard = React.lazy(() => import('../InsightsDashboard.jsx'));
const BodyMetricsTab    = React.lazy(() => import('../BodyMetricsTab.jsx'));
const ProjectsTab       = React.lazy(() => import('../ProjectsTab.jsx'));
const CommunityTab      = React.lazy(() => import('../community/CommunityTab'));

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
    </div>
  );
}

interface LegacyData {
  isPro?: boolean;
  projects?: unknown[];
  [k: string]: unknown;
}

function useLegacy() {
  const data = useLegacyDataStore((s) => s.data) as LegacyData;
  const onChange = useLegacyDataStore((s) => s.onChange);
  const upd = useLegacyDataStore((s) => s.upd);
  return { data, onChange, upd };
}

function Host({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

// ── Standard `{ data, onChange }` tabs ───────────────────────────────────

export function TravelHost() {
  const { data, onChange } = useLegacy();
  return <Host><TravelPlannerTab data={data} onChange={onChange} /></Host>;
}

export function MealsHost() {
  const { data, onChange } = useLegacy();
  return <Host><MealPlannerTab data={data} onChange={onChange} /></Host>;
}

export function VisionHost() {
  const { data, onChange } = useLegacy();
  return <Host><VisionBoardTab data={data} onChange={onChange} /></Host>;
}

export function StudyHost() {
  const { data, onChange } = useLegacy();
  return <Host><StudyModeTab data={data} onChange={onChange} /></Host>;
}

export function WellnessHost() {
  const { data, onChange } = useLegacy();
  return <Host><WellnessTab data={data} onChange={onChange} /></Host>;
}

export function TimeBlockHost() {
  const { data, onChange } = useLegacy();
  return <Host><TimeBlockingTab data={data} onChange={onChange} /></Host>;
}

export function SocialHost() {
  const { data, onChange } = useLegacy();
  return <Host><SocialCardsTab data={data} onChange={onChange} /></Host>;
}

export function BodyHost() {
  const { data, onChange } = useLegacy();
  return <Host><BodyMetricsTab data={data} onChange={onChange} /></Host>;
}

// ── Variant signatures ───────────────────────────────────────────────────

export function FocusHost() {
  const { data, onChange, upd } = useLegacy();
  return (
    <Host>
      <FocusMode
        data={data}
        onChange={onChange}
        isPro={!!data?.isPro}
        onSessionStart={() => undefined}
        onSessionEnd={(s: { id?: string; duration?: number; actual?: number }) => {
          upd((prev) => {
            const history = (prev as { focusHistory?: unknown[] }).focusHistory ?? [];
            return {
              ...prev,
              focusHistory: [
                { id: s.id, duration: s.duration ?? 0, actual: s.actual ?? 0, endedAt: Date.now() },
                ...history.slice(0, 29),
              ],
            };
          });
        }}
      />
    </Host>
  );
}

export function InsightsHost() {
  const { data } = useLegacy();
  return (
    <Host>
      <InsightsDashboard
        data={data}
        isPro={!!data?.isPro}
        onUpgrade={() => undefined}
      />
    </Host>
  );
}

export function GoalsHost() {
  const { data, upd } = useLegacy();
  return (
    <Host>
      <GoalsTabV2
        data={data}
        upd={upd}
        addToast={() => undefined}
      />
    </Host>
  );
}

export function ProjectsHost() {
  const { data, onChange } = useLegacy();
  const projects = (data?.projects as unknown[] | undefined) ?? [];
  return (
    <Host>
      <ProjectsTab
        projects={projects as never}
        onChange={(next: unknown[]) => onChange((prev) => ({ ...prev, projects: next }))}
      />
    </Host>
  );
}

export function CommunityHost() {
  return <Host><CommunityTab /></Host>;
}
