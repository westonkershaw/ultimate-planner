import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthGate from './components/auth/AuthGate';
import Shell from './components/layout/Shell';
import Dashboard from './components/Dashboard';
import TaskList from './components/tasks/TaskList';
import WorkoutView from './components/workouts/WorkoutView';
import FinanceDashboard from './components/finance/FinanceDashboard';
import ExploreView from './components/explore/ExploreView';
import SettingsView from './components/settings/SettingsView';
import JournalView from './components/journal/JournalView';
import HabitsView from './components/habits/HabitsView';
import SleepView from './components/sleep/SleepView';
import MoodView from './components/mood/MoodView';
import ReadingView from './components/reading/ReadingView';
import NetWorthView from './components/networth/NetWorthView';
import TravelView from './components/travel/TravelView';
import MealsView from './components/meals/MealsView';
import VisionView from './components/vision/VisionView';
import StudyView from './components/study/StudyView';
import WellnessView from './components/wellness/WellnessView';
import {
  TimeBlockHost,
  FocusHost,
  SocialHost,
  GoalsHost,
  InsightsHost,
  BodyHost,
  ProjectsHost,
  CommunityHost,
} from './components/legacy/LegacyTabHosts';
import { useUIStore } from './store/index';
import { useThemeStore } from './store/useThemeStore';
import type { ActiveView, Toast } from './types';
import './index.css';

// ── Toast Notification Layer ───────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <motion.div
      key={toast.id}
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="px-4 py-3 rounded-xl border border-white/10 bg-[#0f1829]/95 backdrop-blur-sm text-sm text-slate-200 shadow-xl pointer-events-auto max-w-sm cursor-pointer"
      onClick={() => onDismiss(toast.id)}
    >
      {toast.message}
    </motion.div>
  );
}

function Toasts() {
  const { toasts, removeToast } = useUIStore();

  useEffect(() => {
    if (!toasts.length) return;
    const latest = toasts[toasts.length - 1];
    if (!latest) return;
    const timer = setTimeout(() => removeToast(latest.id), 4000);
    return () => clearTimeout(timer);
  }, [toasts, removeToast]);

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── View Router ────────────────────────────────────────────────────────────

function ViewContent({ view }: { view: ActiveView }) {
  switch (view) {
    case 'dashboard': return <Dashboard />;
    case 'tasks':     return <TaskList />;
    case 'workouts':  return <WorkoutView />;
    case 'finance':   return <FinanceDashboard />;
    case 'explore':   return <ExploreView />;
    case 'settings':  return <SettingsView />;
    // Plan
    case 'goals':     return <GoalsHost />;
    case 'projects':  return <ProjectsHost />;
    case 'timeblock': return <TimeBlockHost />;
    case 'focus':     return <FocusHost />;
    // Health
    case 'sleep':     return <SleepView />;
    case 'mood':      return <MoodView />;
    case 'wellness':  return <WellnessView />;
    case 'meals':     return <MealsView />;
    case 'body':      return <BodyHost />;
    // Money
    case 'networth':  return <NetWorthView />;
    // Grow
    case 'habits':    return <HabitsView />;
    case 'journal':   return <JournalView />;
    case 'reading':   return <ReadingView />;
    case 'study':     return <StudyView />;
    case 'vision':    return <VisionView />;
    case 'travel':    return <TravelView />;
    case 'social':    return <SocialHost />;
    case 'insights':  return <InsightsHost />;
    case 'community': return <CommunityHost />;
    default:          return <Dashboard />;
  }
}

// ── App Root ───────────────────────────────────────────────────────────────

function App() {
  const { activeView } = useUIStore();

  useEffect(() => {
    useThemeStore.getState().setTheme(useThemeStore.getState().theme);
  }, []);

  return (
    <AuthGate>
      <Shell>
        <ViewContent view={activeView} />
        <Toasts />
      </Shell>
    </AuthGate>
  );
}

export default App;
