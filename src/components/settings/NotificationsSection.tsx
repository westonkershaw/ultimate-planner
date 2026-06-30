import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellRing, Calendar, ClipboardList, Moon } from 'lucide-react';
import {
  getPrefs, savePrefs, requestNotificationPermission, getNotificationPermission, sendNotification,
} from '@/utils/notifications.js';
import { useUIStore } from '@/store';

type Permission = 'granted' | 'denied' | 'default' | 'unsupported';

interface NotifPrefs {
  enabled: boolean;
  taskReminder?: { enabled: boolean; time: string };
  eveningReminder?: { enabled: boolean; time: string };
  eventReminders?: { enabled: boolean; minutesBefore: number };
  weeklyReview?: { enabled: boolean };
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-accent' : 'bg-surface-3'}`}
    >
      <motion.span
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
      />
    </button>
  );
}

function PrefRow({
  Icon, title, subtitle, on, onToggle, children,
}: {
  Icon: React.FC<{ size?: number; className?: string }>;
  title: string; subtitle: string; on: boolean; onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-xl border border-border bg-surface-1">
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-accent-text flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-fg-secondary">{title}</div>
          <div className="text-[11px] text-fg-muted mt-0.5">{subtitle}</div>
        </div>
        <Toggle on={on} onToggle={onToggle} label={title} />
      </div>
      {on && children && (
        <div className="mt-3 pt-3 border-t border-border">{children}</div>
      )}
    </div>
  );
}

export default function NotificationsSection() {
  const addToast = useUIStore((s) => s.addToast);
  const [perm, setPerm] = useState<Permission>('default');
  const [prefs, setPrefs] = useState<NotifPrefs>(() => getPrefs() as NotifPrefs);

  useEffect(() => {
    setPerm(getNotificationPermission() as Permission);
  }, []);

  const update = (patch: Partial<NotifPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(patch);
  };

  const askPermission = async () => {
    const ok = await requestNotificationPermission();
    setPerm(getNotificationPermission() as Permission);
    addToast(ok ? 'Notifications enabled' : 'Permission denied', ok ? 'success' : 'warning');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
      aria-labelledby="notifs-heading"
    >
      <div className="flex items-center gap-2">
        <Bell size={14} className="text-fg-muted" />
        <h2 id="notifs-heading" className="text-xs font-medium text-fg-muted uppercase tracking-wider">Notifications</h2>
      </div>

      {perm !== 'granted' && perm !== 'unsupported' && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04]">
          <Bell size={18} className="text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm text-fg-secondary">Enable browser notifications</div>
            <div className="text-[11px] text-fg-muted">Required for reminders to fire</div>
          </div>
          <button
            onClick={askPermission}
            className="px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-xs font-medium text-accent-text hover:bg-accent/25 transition-colors"
          >
            Enable
          </button>
        </div>
      )}

      <PrefRow
        Icon={ClipboardList}
        title="Daily task reminder"
        subtitle="Morning nudge with today's task count"
        on={!!prefs.taskReminder?.enabled}
        onToggle={() =>
          update({ taskReminder: { time: '08:00', ...prefs.taskReminder, enabled: !prefs.taskReminder?.enabled } })
        }
      >
        <label className="flex items-center gap-3">
          <span className="text-xs text-fg-muted flex-1">Time</span>
          <input
            type="time"
            value={prefs.taskReminder?.time || '08:00'}
            onChange={(e) =>
              update({ taskReminder: { enabled: true, time: e.target.value } })
            }
            className="bg-surface-1 border border-border rounded-lg text-fg text-xs px-2 py-1 outline-none"
          />
        </label>
      </PrefRow>

      <PrefRow
        Icon={Moon}
        title="Evening check-in"
        subtitle="Nightly nudge to log habits & reflect"
        on={!!prefs.eveningReminder?.enabled}
        onToggle={() =>
          update({ eveningReminder: { time: '20:00', ...prefs.eveningReminder, enabled: !prefs.eveningReminder?.enabled } })
        }
      >
        <label className="flex items-center gap-3">
          <span className="text-xs text-fg-muted flex-1">Time</span>
          <input
            type="time"
            value={prefs.eveningReminder?.time || '20:00'}
            onChange={(e) =>
              update({ eveningReminder: { enabled: true, time: e.target.value } })
            }
            className="bg-surface-1 border border-border rounded-lg text-fg text-xs px-2 py-1 outline-none"
          />
        </label>
      </PrefRow>

      <PrefRow
        Icon={Calendar}
        title="Event reminders"
        subtitle="Alert before calendar events"
        on={!!prefs.eventReminders?.enabled}
        onToggle={() =>
          update({ eventReminders: { minutesBefore: 15, ...prefs.eventReminders, enabled: !prefs.eventReminders?.enabled } })
        }
      >
        <label className="flex items-center gap-3">
          <span className="text-xs text-fg-muted flex-1">Minutes before</span>
          <select
            value={prefs.eventReminders?.minutesBefore ?? 15}
            onChange={(e) =>
              update({ eventReminders: { enabled: true, minutesBefore: parseInt(e.target.value) } })
            }
            className="bg-surface-1 border border-border rounded-lg text-fg text-xs px-2 py-1 outline-none"
          >
            {[5, 10, 15, 30].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
        </label>
      </PrefRow>

      <PrefRow
        Icon={BellRing}
        title="Weekly review reminder"
        subtitle="Nudge to run your weekly review"
        on={!!prefs.weeklyReview?.enabled}
        onToggle={() =>
          update({ weeklyReview: { enabled: !prefs.weeklyReview?.enabled } })
        }
      />

      {perm === 'granted' && (
        <button
          onClick={() => sendNotification('Ultimate Life Planner', '🔔 Test — your reminders are working!')}
          className="w-full py-2.5 rounded-xl border border-accent/30 bg-accent/10 text-sm font-medium text-accent-text hover:bg-accent/20 transition-colors"
        >
          Send test notification
        </button>
      )}
    </motion.section>
  );
}
