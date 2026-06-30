import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CheckSquare,
  Dumbbell,
  Wallet,
  Compass,
  Search,
  Settings,
  Target,
  KanbanSquare,
  Calendar,
  Timer,
  Moon,
  Smile,
  HeartPulse,
  Utensils,
  Activity,
  Coins,
  Flame,
  BookOpen,
  Library,
  GraduationCap,
  Image as ImageIcon,
  Plane,
  Share2,
  BarChart3,
  Users,
  ChevronDown,
} from 'lucide-react';
import { APP_SPRING } from '@/hooks/useAppSpring';
import type { ActiveView } from '@/types';

interface NavItemDef {
  id: ActiveView;
  label: string;
  Icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItemDef[];
}

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onSearchOpen: () => void;
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'top',
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    ],
  },
  {
    id: 'plan',
    label: 'Plan',
    items: [
      { id: 'tasks',     label: 'Tasks',      Icon: CheckSquare },
      { id: 'goals',     label: 'Goals',      Icon: Target },
      { id: 'projects',  label: 'Projects',   Icon: KanbanSquare },
      { id: 'timeblock', label: 'Time Block', Icon: Calendar },
      { id: 'focus',     label: 'Focus',      Icon: Timer },
    ],
  },
  {
    id: 'health',
    label: 'Health',
    items: [
      { id: 'workouts', label: 'Workouts', Icon: Dumbbell },
      { id: 'sleep',    label: 'Sleep',    Icon: Moon },
      { id: 'mood',     label: 'Mood',     Icon: Smile },
      { id: 'wellness', label: 'Wellness', Icon: HeartPulse },
      { id: 'meals',    label: 'Meals',    Icon: Utensils },
      { id: 'body',     label: 'Body',     Icon: Activity },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    items: [
      { id: 'finance',  label: 'Finance',   Icon: Wallet },
      { id: 'networth', label: 'Net Worth', Icon: Coins },
    ],
  },
  {
    id: 'grow',
    label: 'Grow',
    items: [
      { id: 'habits',    label: 'Habits',   Icon: Flame },
      { id: 'journal',   label: 'Journal',  Icon: BookOpen },
      { id: 'reading',   label: 'Reading',  Icon: Library },
      { id: 'study',     label: 'Study',    Icon: GraduationCap },
      { id: 'vision',    label: 'Vision',   Icon: ImageIcon },
      { id: 'travel',    label: 'Travel',   Icon: Plane },
      { id: 'explore',   label: 'Explore',  Icon: Compass },
      { id: 'social',    label: 'Share',    Icon: Share2 },
      { id: 'insights',  label: 'Insights', Icon: BarChart3 },
      { id: 'community', label: 'Community', Icon: Users },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings', Icon: Settings },
    ],
  },
];

const STORAGE_KEY = 'ui.sidebar.collapsed_groups';

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function NavItem({ item, active, onClick }: { item: NavItemDef; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.97 }}
      transition={APP_SPRING}
      className={[
        'relative w-full flex items-center gap-3',
        'px-3 py-2 rounded-lg text-sm font-medium',
        'transition-colors duration-150 select-none text-left',
        active
          ? 'bg-accent/10 text-accent-text border border-accent/20'
          : 'text-fg-muted hover:text-fg hover:bg-surface-2 border border-transparent',
      ].join(' ')}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-pill"
          transition={APP_SPRING}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-accent-text"
        />
      )}
      <item.Icon
        size={16}
        strokeWidth={active ? 2 : 1.75}
        className={active ? 'text-accent-text flex-shrink-0' : 'flex-shrink-0'}
      />
      <span className="hidden lg:block truncate">{item.label}</span>
    </motion.button>
  );
}

const Sidebar = React.memo(function Sidebar({ activeView, onNavigate, onSearchOpen }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadCollapsed());

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <aside
      className={[
        'hidden sm:flex flex-col flex-shrink-0',
        'w-16 lg:w-56',
        'bg-surface-0',
        'border-r border-border',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-card bg-accent flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          U
        </div>
        <div className="hidden lg:block">
          <div className="text-sm font-semibold text-fg tracking-tight">Ultimate Life</div>
          <div className="text-[10px] text-fg-faint -mt-0.5">Planner</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-1">
        {NAV_GROUPS.map((group) => {
          const isCollapsed = collapsed.has(group.id);
          const showHeader = group.id !== 'top' && group.id !== 'system';
          return (
            <div key={group.id} className="flex flex-col gap-0.5">
              {showHeader && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={[
                    'hidden lg:flex items-center justify-between',
                    'px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider',
                    'text-fg-faint hover:text-fg-muted transition-colors',
                  ].join(' ')}
                >
                  <span>{group.label}</span>
                  <motion.span
                    animate={{ rotate: isCollapsed ? -90 : 0 }}
                    transition={APP_SPRING}
                  >
                    <ChevronDown size={11} />
                  </motion.span>
                </button>
              )}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-0.5 overflow-hidden"
                  >
                    {group.items.map((item) => (
                      <NavItem
                        key={item.id}
                        item={item}
                        active={activeView === item.id}
                        onClick={() => onNavigate(item.id)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Search shortcut */}
      <div className="px-3 pb-5 hidden lg:block">
        <button
          onClick={onSearchOpen}
          className={[
            'w-full flex items-center gap-2 px-3 py-2',
            'rounded-control border border-border',
            'text-fg-muted text-xs',
            'hover:text-fg-secondary hover:border-border-strong',
            'transition-colors duration-150',
          ].join(' ')}
        >
          <Search size={12} className="flex-shrink-0" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] border border-border-strong rounded px-1.5 py-0.5 text-fg-muted">
            ⌘K
          </kbd>
        </button>
      </div>
    </aside>
  );
});

export default Sidebar;
