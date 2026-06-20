// Notification scheduler — browser-based push notifications
// Uses Notification API + setTimeout for tab-open reminders.
// Falls back to ServiceWorker.showNotification so alerts fire when the tab is backgrounded/closed.
// No server-side push required.

// ── Types ──────────────────────────────────────────────────────────────────
// NotifPrefs: {
//   enabled: bool,
//   morningTime: "09:00",
//   eveningTime: "20:00",
//   weeklyDay: 5,   // 0 = Sunday … 6 = Saturday
//   weeklyTime: "18:00",
// }

// ── Storage key ────────────────────────────────────────────────────────────
const PREFS_KEY = "up_notif_prefs";

// ── Default prefs ──────────────────────────────────────────────────────────
export const DEFAULT_NOTIF_PREFS = {
  enabled: false,
  morningTime: "09:00",
  eveningTime: "20:00",
  weeklyDay: 5, // Friday
  weeklyTime: "18:00",
  taskReminder: { enabled: false, time: "08:00" },
  eveningReminder: { enabled: false, time: "20:00" },
};

// ── Permission ─────────────────────────────────────────────────────────────
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function getNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "granted" | "denied" | "default"
}

// ── Prefs storage ──────────────────────────────────────────────────────────
export function getPrefs() {
  try {
    return { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

export function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...getPrefs(), ...prefs }));
}

// ── Send a notification now ────────────────────────────────────────────────
// Prefers ServiceWorker.showNotification so it fires even when the tab is
// in the background. Falls back to new Notification() for browsers without SW.
export function sendNotification(title, body, options = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const payload = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: options.tag || "up-general",
    silent: options.silent || false,
    ...options,
  };

  // Try service worker first (works when tab is backgrounded/closed)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        if (reg?.showNotification) {
          return reg.showNotification(title, payload);
        }
        // SW not capable — fall back to Notification API
        new Notification(title, payload);
      })
      .catch(() => {
        try { new Notification(title, payload); } catch { /* silent fail */ }
      });
    return;
  }

  // No service worker support
  try { new Notification(title, payload); } catch { /* silent fail */ }
}

// ── Schedule a one-shot notification at a specific time today ──────────────
// Returns a timeout ID (cancel with clearTimeout). Returns null if the time
// has already passed today.
export function scheduleNotificationAt(timeStr, title, body, tag) {
  const [h, m] = timeStr.split(":").map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null; // Already past for today
  return setTimeout(() => sendNotification(title, body, { tag }), diff);
}

// ── Module-level timeout handles for recurring daily notifications ─────────
let _morningTimeout = null;
let _eveningTimeout = null;

// ── Helper: ms until the next occurrence of a given hour:minute ───────────
function msUntil(hour, minute) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}

// ── Bootstrap (call once on app load, and whenever task data changes) ─────
// Schedules self-rescheduling daily reminders via setTimeout.
// Clears any previously registered timeouts before rescheduling.
export function bootstrapNotifications(data) {
  const prefs = getPrefs();

  // Always clear previous timeouts to avoid duplicate firings on re-call
  if (_morningTimeout) { clearTimeout(_morningTimeout); _morningTimeout = null; }
  if (_eveningTimeout) { clearTimeout(_eveningTimeout); _eveningTimeout = null; }

  if (!prefs.enabled || getNotificationPermission() !== "granted") return [];

  const WDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Morning task reminder
  const morningEnabled = prefs.taskReminder?.enabled ?? false;
  if (morningEnabled) {
    const [h, m] = (prefs.taskReminder?.time || prefs.morningTime || "08:00").split(":").map(Number);
    const fireMorning = () => {
      if (getNotificationPermission() === "granted") {
        const today = WDAYS[(new Date().getDay() + 6) % 7];
        const pendingCount = (data?.weekDays?.[today]?.tasks || []).filter((t) => !t.done).length;
        sendNotification(
          "Good morning! \uD83C\uDF05",
          pendingCount > 0
            ? `You have ${pendingCount} task${pendingCount > 1 ? "s" : ""} to tackle today.`
            : "Start your day with intention. Open your planner!",
          { tag: "up-morning" }
        );
      }
      // Reschedule for the same time tomorrow
      _morningTimeout = setTimeout(fireMorning, 24 * 60 * 60 * 1000);
    };
    _morningTimeout = setTimeout(fireMorning, msUntil(h, m));
  }

  // Evening check-in reminder
  const eveningEnabled = prefs.eveningReminder?.enabled ?? false;
  if (eveningEnabled) {
    const [h, m] = (prefs.eveningReminder?.time || prefs.eveningTime || "20:00").split(":").map(Number);
    const fireEvening = () => {
      if (getNotificationPermission() === "granted") {
        sendNotification(
          "Evening check-in \uD83C\uDF19",
          "How did your day go? Log your mood and reflect on today\u2019s wins.",
          { tag: "up-evening" }
        );
      }
      // Reschedule for the same time tomorrow
      _eveningTimeout = setTimeout(fireEvening, 24 * 60 * 60 * 1000);
    };
    _eveningTimeout = setTimeout(fireEvening, msUntil(h, m));
  }

  // Weekly review reminder — one-shot on the user's chosen day/time (legacy behaviour)
  const ids = [];
  const now = new Date();
  if (now.getDay() === prefs.weeklyDay % 7) {
    const id = scheduleNotificationAt(
      prefs.weeklyTime || "18:00",
      "Weekly Review time! \uD83D\uDCCB",
      "Take 5 minutes to review your week and plan ahead.",
      "up-weekly"
    );
    if (id) ids.push(id);
  }

  return ids;
}

// ── Helper: check if user has logged any habits today ─────────────────────
export function checkTodayHabitsLogged(data) {
  if (!data?.kis?.length) return false;
  const WDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const today = WDAYS[(new Date().getDay() + 6) % 7];
  return data.kis.some((k) => (k.dailyLogs?.[today] || 0) > 0);
}

// ── Notification settings UI helper ───────────────────────────────────────
export function getNotifStatusLabel() {
  const perm = getNotificationPermission();
  if (perm === "unsupported") return "Not supported in this browser";
  if (perm === "denied") return "Blocked \u2014 enable in browser settings";
  if (perm === "default") return "Not yet enabled";
  const prefs = getPrefs();
  return prefs.enabled
    ? `On \u2014 morning ${prefs.morningTime}, evening ${prefs.eveningTime}`
    : "Permission granted but reminders are off";
}
