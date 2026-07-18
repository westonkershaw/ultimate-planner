import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useUIStore } from '@/store/index';
import Sidebar from '@/components/layout/Sidebar';
import CommandPalette from './CommandPalette.jsx';
import CaptureButton from '@/components/capture/CaptureButton';
import QuickCapture from '@/components/capture/QuickCapture';
import ModalLayer from '@/components/layout/ModalLayer';
import type { ActiveView } from '@/types';

// ── Types ───────────────────────────────────────────────────────────────────

interface ShellProps {
  children: React.ReactNode;
}

// ── Mobile nav label map ─────────────────────────────────────────────────────

const VIEW_LABELS: Record<ActiveView, string> = {
  dashboard: 'Dashboard',
  tasks:     'Tasks',
  workouts:  'Workouts',
  finance:   'Finance',
  explore:   'Explore',
  settings:  'Settings',
  planning:  'Planner',
  goals:     'Goals',
  projects:  'Projects',
  timeblock: 'Time Block',
  focus:     'Focus',
  sleep:     'Sleep',
  mood:      'Mood',
  wellness:  'Wellness',
  meals:     'Meals',
  body:      'Body',
  networth:  'Net Worth',
  habits:    'Habits',
  journal:   'Journal',
  reading:   'Reading',
  study:     'Study',
  vision:    'Vision',
  travel:    'Travel',
  social:    'Share',
  insights:  'Insights',
  community: 'Community',
};

// Mobile bottom nav items (reuse Sidebar data inline to keep this file self-contained)
import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
  Compass,
  Settings,
} from 'lucide-react';

const MOBILE_NAV = [
  { id: 'dashboard' as ActiveView, label: 'Home',      Icon: LayoutDashboard },
  { id: 'tasks'     as ActiveView, label: 'Tasks',     Icon: CheckSquare },
  { id: 'explore'   as ActiveView, label: 'Explore',   Icon: Compass },
  { id: 'finance'   as ActiveView, label: 'Finance',   Icon: Wallet },
  { id: 'settings'  as ActiveView, label: 'More',      Icon: Settings },
] as const;

// ── Shell ────────────────────────────────────────────────────────────────────

const Shell = React.memo(function Shell({ children }: ShellProps) {
  const { activeView, setActiveView, toggleCommandPalette } = useUIStore();
  const [captureOpen, setCaptureOpen] = useState(false);

  const openCapture = useCallback(() => setCaptureOpen(true), []);
  const closeCapture = useCallback(() => setCaptureOpen(false), []);

  // Global shortcuts: ⌘K (command palette), ⌘N (quick capture)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setCaptureOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleCommandPalette]);

  return (
    <div className="flex overflow-hidden bg-surface-0 text-fg-secondary" style={{ height: '100dvh' }}>
      {/* Desktop Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        onSearchOpen={toggleCommandPalette}
      />

      {/* Main column */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header */}
        <header
          className={[
            'sm:hidden flex items-center justify-between',
            'px-4 py-3',
            'border-b border-border',
            'bg-surface-0/95 backdrop-blur-sm',
          ].join(' ')}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        >
          <span className="font-semibold text-base text-fg tracking-tight">
            {VIEW_LABELS[activeView] ?? 'Life Planner'}
          </span>
          <button
            onClick={toggleCommandPalette}
            className="p-2 rounded-control border border-border text-fg-muted hover:text-fg transition-colors"
            aria-label="Open command palette"
          >
            <Search size={14} />
          </button>
        </header>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-auto">
          {/* Keyed on activeView: React remounts on nav, replaying the enter
              fade. No exit animation / no `mode="wait"` barrier, so the next view
              mounts instantly instead of waiting for the old one to animate out. */}
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.14 }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </div>

        {/* Mobile bottom nav */}
        <nav
          className={[
            'sm:hidden flex',
            'border-t border-border',
            'bg-surface-0/95 backdrop-blur-sm',
          ].join(' ')}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {MOBILE_NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={[
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs',
                'transition-colors duration-150',
                activeView === id
                  ? 'text-accent-text'
                  : 'text-fg-muted hover:text-fg-secondary',
              ].join(' ')}
              aria-label={label}
            >
              <Icon size={18} strokeWidth={activeView === id ? 2 : 1.75} />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </nav>
      </main>

      {/* Quick Capture FAB + Modal */}
      <CaptureButton onClick={openCapture} />
      <QuickCapture open={captureOpen} onClose={closeCapture} />

      {/* Command Palette (portal) */}
      <CommandPalette />

      {/* Legacy modal layer (onboarding, get-started, morning dashboard, monthly review) */}
      <ModalLayer />
    </div>
  );
});

export default Shell;
