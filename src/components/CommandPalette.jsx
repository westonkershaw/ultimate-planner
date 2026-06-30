import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// NLP parsers
// ---------------------------------------------------------------------------

/**
 * Parse workout shorthand: "Bench 225 3x10" or "Squat 315 5×5"
 * Returns { type, exercise, weight, sets, reps } or null.
 */
function parseWorkout(input) {
  const match = input.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+)[x×](\d+)/i);
  if (!match) return null;
  return {
    type: "workout",
    exercise: match[1].trim(),
    weight: parseFloat(match[2]),
    sets: parseInt(match[3], 10),
    reps: parseInt(match[4], 10),
  };
}

/**
 * Parse expense shorthand: "Coffee $5" or "Groceries 42.50"
 * Returns { type, name, amount } or null.
 */
function parseExpense(input) {
  const match = input.match(/^(.+?)\s+\$?(\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  const name = match[1].trim();
  // Avoid matching workout patterns (e.g. "Bench 225 3x10" already handled above)
  if (/\d+[x×]\d+/i.test(input)) return null;
  return {
    type: "expense",
    name,
    amount: parseFloat(match[2]),
  };
}

// ---------------------------------------------------------------------------
// Static navigation commands
// ---------------------------------------------------------------------------

// Each entry: id = unique React key, tabId = top-level tab to navigate to.
// tabId matches the values accepted by onNavigate (which calls setTab in App.jsx).
const NAV_COMMANDS = [
  // Navigation — top-level tabs (tabIds verified against DEFAULT_TABS in App.jsx)
  { id: "dashboard",    tabId: "dashboard", label: "Go to Dashboard",         icon: "🏠", keywords: ["home", "dashboard", "overview"], category: "Navigation" },
  { id: "nav-plan",     tabId: "plan",      label: "Weekly Planner",          icon: "📅", keywords: ["weekly", "tasks", "calendar", "planner", "week"], category: "Navigation" },
  { id: "nav-grow",     tabId: "grow",      label: "Habits Tracker",          icon: "🌱", keywords: ["habits", "streak", "grow", "daily", "ki", "indicators", "metrics"], category: "Navigation" },
  { id: "nav-journal",  tabId: "journal",   label: "Journal",                 icon: "📓", keywords: ["journal", "write", "reflect", "diary", "notes", "reflection"], category: "Navigation" },
  { id: "nav-vision",   tabId: "vision",    label: "Vision Board",            icon: "✨", keywords: ["vision", "goals", "board", "inspire", "yearly", "life"], category: "Navigation" },
  { id: "nav-health",   tabId: "health",    label: "Health & Fitness",        icon: "❤️", keywords: ["health", "fitness", "body", "wellness", "workout", "gym", "exercise", "sleep", "workouts"], category: "Navigation" },
  { id: "nav-finance",  tabId: "finance",   label: "Finance",                 icon: "💰", keywords: ["finance", "money", "budget", "financial", "spending", "bills", "expenses"], category: "Navigation" },
  { id: "nav-explore",  tabId: "explore",   label: "Explore & Insights",      icon: "✦",  keywords: ["explore", "insights", "travel", "community"], category: "Navigation" },
  { id: "nav-coach",    tabId: "coach",     label: "AI Coach",                icon: "🤖", keywords: ["coach", "ai", "insights", "advice"], category: "Navigation" },
  { id: "nav-profile",  tabId: "profile",   label: "My Profile",              icon: "👤", keywords: ["profile", "account", "me", "settings", "achievements", "badges", "preferences"], category: "Navigation" },
  // Actions
  { id: "nav-settings", tabId: "profile",   label: "Open Settings",           icon: "⚙️",  keywords: ["settings", "preferences", "config", "account", "profile"], category: "Actions" },
  { id: "nav-sleep",    tabId: "health",    label: "Sleep Calculator",        icon: "😴", keywords: ["sleep", "bedtime", "wake", "rest", "health"], category: "Actions" },
  { id: "nav-workout",  tabId: "health",    label: "Log Workout",             icon: "💪", keywords: ["workout", "gym", "lift", "exercise", "log", "training"], category: "Actions" },
  { id: "nav-mood",     tabId: "grow",      label: "Log Mood",                icon: "🧠", keywords: ["mood", "feeling", "mental", "emotion", "wellbeing"], category: "Actions" },
  { id: "nav-budget",   tabId: "finance",   label: "Budget",                  icon: "💸", keywords: ["budget", "spending", "money", "finance", "bills", "expenses"], category: "Actions" },
  { id: "nav-habit",    tabId: "grow",      label: "Add New Habit",           icon: "🌱", keywords: ["habit", "add", "new", "create", "tracker", "indicator"], category: "Actions" },
  { id: "nav-goal",     tabId: "grow",      label: "Set a Goal",              icon: "🎯", keywords: ["goal", "yearly", "monthly", "target", "objective"], category: "Actions" },
  { id: "nav-journal-new", tabId: "journal", label: "New Journal Entry",      icon: "✍️", keywords: ["journal", "write", "entry", "new", "reflect", "diary"], category: "Actions" },
  { id: "nav-challenge", tabId: "explore",  label: "Browse Challenges",       icon: "🔥", keywords: ["challenge", "compete", "streak", "30day"], category: "Actions" },
  { id: "nav-focus",    tabId: "plan",      label: "Start Focus Session",     icon: "⏱️", keywords: ["focus", "pomodoro", "timer", "deep", "work", "concentrate"], category: "Actions" },
  { id: "nav-review",   tabId: "dashboard", label: "Weekly Review",           icon: "📊", keywords: ["review", "summary", "weekly", "progress", "report"], category: "Actions" },
];

// ---------------------------------------------------------------------------
// CommandPalette component
// ---------------------------------------------------------------------------

/**
 * @param {{ open: boolean, onClose: () => void, onNavigate: (tabId: string) => void, onAddTask: (title: string) => void, onLogWorkout: (workout: object) => void, onAddExpense: (expense: object) => void }} props
 */
export default function CommandPalette({
  open,
  onClose,
  onNavigate,
  onAddTask,
  onLogWorkout,
  onAddExpense,
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef(null);

  // Respect reduced-motion preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reset when palette opens
  useEffect(() => {
    if (open) {
      // Defer state resets to avoid synchronous setState-in-effect lint warning
      const timer = setTimeout(() => {
        setQuery("");
        setSelected(0);
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Derived NLP parses — memoised so they don't recalculate on every keypress
  const parsedWorkout = useMemo(
    () => (query.trim() ? parseWorkout(query) : null),
    [query]
  );
  const parsedExpense = useMemo(
    () => (query.trim() && !parsedWorkout ? parseExpense(query) : null),
    [query, parsedWorkout]
  );

  // Filtered nav commands
  const filteredNav = useMemo(() => {
    if (!query.trim()) return NAV_COMMANDS;
    const q = query.toLowerCase();
    return NAV_COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.includes(q))
    );
  }, [query]);

  // Build the full suggestion list
  const suggestions = useMemo(() => {
    const list = [];

    if (parsedWorkout) {
      list.push({
        id: "log-workout",
        label: `Log: ${parsedWorkout.exercise} ${parsedWorkout.weight} lbs — ${parsedWorkout.sets}×${parsedWorkout.reps}`,
        icon: "💪",
        hint: "log workout",
        action: () => { onLogWorkout?.(parsedWorkout); onClose(); },
        type: "action",
        category: "Actions",
      });
    }

    if (parsedExpense) {
      list.push({
        id: "add-expense",
        label: `Add expense: ${parsedExpense.name} — $${parsedExpense.amount.toFixed(2)}`,
        icon: "💸",
        hint: "log expense",
        action: () => { onAddExpense?.(parsedExpense); onClose(); },
        type: "action",
        category: "Actions",
      });
    }

    if (query.trim() && !parsedWorkout && !parsedExpense) {
      list.push({
        id: "add-task",
        label: `Add task: "${query.trim()}"`,
        icon: "✓",
        hint: "add to today",
        action: () => { onAddTask?.(query.trim()); onClose(); },
        type: "action",
        category: "Actions",
      });
    }

    filteredNav.forEach((c) => {
      list.push({
        id: c.id,
        label: c.label,
        icon: c.icon,
        hint: "↵",
        action: () => { onNavigate?.(c.tabId ?? c.id); onClose(); },
        type: "nav",
        category: c.category || "Navigation",
      });
    });

    return list;
  }, [parsedWorkout, parsedExpense, query, filteredNav, onLogWorkout, onAddExpense, onAddTask, onNavigate, onClose]);

  // Keep selected index in bounds when suggestions change (deferred to avoid setState-in-effect)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelected((s) => Math.min(s, Math.max(0, suggestions.length - 1)));
    }, 0);
    return () => clearTimeout(timer);
  }, [suggestions.length]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        // Shake when query is non-empty but resolves to no structured command or nav match
        const isUnparseable =
          query.trim().length > 0 &&
          !parsedWorkout &&
          !parsedExpense &&
          filteredNav.length === 0;
        if (isUnparseable) {
          setHasError(true);
          setTimeout(() => setHasError(false), 500);
        } else if (suggestions.length > 0 && suggestions[selected]) {
          suggestions[selected].action?.();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [suggestions, selected, onClose, query, parsedWorkout, parsedExpense, filteredNav]
  );

  // Animation variants — static fallback when reduced-motion is preferred
  const backdropVariants = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };

  const paletteVariants = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden:  { scale: 0.96, y: -12, opacity: 0 },
        visible: { scale: 1,    y: 0,   opacity: 1 },
        exit:    { scale: 0.96, y: -12, opacity: 0 },
      };

  // ---------------------------------------------------------------------------
  // Styles (inline — consistent with app's existing inline style pattern)
  // ---------------------------------------------------------------------------

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const backdropStyle = isMobile
    ? {
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: "env(safe-area-inset-bottom,0px)",
      }
    : {
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
      };

  const paletteStyle = isMobile
    ? {
        width: "100vw",
        background: "rgba(9,14,28,0.99)",
        border: "1px solid rgba(45, 212, 191,0.25)",
        borderRadius: "20px 20px 0 0",
        overflow: "hidden",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(45, 212, 191,0.1)",
      }
    : {
        width: "min(560px, 92vw)",
        background: "rgba(9,14,28,0.97)",
        border: "1px solid rgba(45, 212, 191,0.25)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(45, 212, 191,0.1)",
      };

  const inputWrapStyle = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 18px",
    borderBottom: "1px solid rgba(51,65,85,0.45)",
  };

  const inputStyle = {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#f1f5f9",
    fontSize: 15,
    fontFamily: "-apple-system,'Inter',system-ui,sans-serif",
  };

  const footerStyle = {
    padding: "7px 18px",
    borderTop: "1px solid rgba(51,65,85,0.35)",
    display: "flex",
    gap: 14,
    alignItems: "center",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          style={backdropStyle}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            style={paletteStyle}
            variants={paletteVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={
              prefersReducedMotion
                ? { duration: 0.1 }
                : { type: "spring", stiffness: 400, damping: 30 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div style={inputWrapStyle}>
              <span style={{ fontSize: 17, color: "rgba(45, 212, 191,0.8)", flexShrink: 0 }}>⌘</span>
              <motion.div
                style={{ flex: 1, display: "flex" }}
                animate={
                  prefersReducedMotion
                    ? { x: 0 }
                    : hasError
                    ? { x: [0, -10, 10, -8, 8, -5, 5, 0] }
                    : { x: 0 }
                }
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <input
                  ref={inputRef}
                  role="combobox"
                  aria-expanded={open}
                  aria-autocomplete="list"
                  aria-label="Command search"
                  aria-activedescendant={
                    suggestions[selected]
                      ? `cmdpal-item-${suggestions[selected].id}`
                      : undefined
                  }
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(0);
                    setHasError(false);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search anything or type a command…"
                  style={inputStyle}
                />
              </motion.div>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(100,116,139,0.45)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                ESC to close
              </span>
            </div>

            {/* Error hint */}
            {hasError && (
              <div style={{ padding: "6px 16px 2px", fontSize: 11, color: "rgba(248,113,113,0.7)", fontFamily: "'DM Sans',sans-serif" }}>
                Not recognized — try "Go to Finance", "Bench 225 3x10", or "$12 lunch"
              </div>
            )}

            {/* Suggestion list */}
            <div
              role="listbox"
              aria-label="Suggestions"
              aria-live="polite"
              style={{ maxHeight: isMobile ? 360 : 340, overflowY: "auto", padding: "6px 0" }}
            >
              {suggestions.length === 0 && query.trim() && !hasError && (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "rgba(100,116,139,0.55)",
                    fontSize: 13,
                    fontFamily: "-apple-system,'Inter',system-ui,sans-serif",
                  }}
                >
                  No matches — try a different keyword
                </div>
              )}

              {!query.trim() && (
                <>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "rgba(100,116,139,0.45)",
                      letterSpacing: "0.8px",
                      textTransform: "uppercase",
                      padding: "4px 18px 6px",
                    }}
                  >
                    Quick Actions
                  </div>
                  {[
                    "💡 Try: 'Add dentist appointment'",
                    "💡 Try: 'Bench 225 3x10'",
                    "💡 Try: 'Coffee $8.50'",
                  ].map((ex) => (
                    <div
                      key={ex}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "7px 18px",
                        color: "rgba(100,116,139,0.35)",
                        fontSize: 12,
                        fontFamily: "-apple-system,'Inter',system-ui,sans-serif",
                        fontStyle: "italic",
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    >
                      {ex}
                    </div>
                  ))}
                </>
              )}

              {(() => {
                // Render with category headers when there are results
                const items = [];
                let lastCat = null;
                suggestions.forEach((s, i) => {
                  const cat = s.category;
                  if (cat && cat !== lastCat) {
                    lastCat = cat;
                    items.push(
                      <div
                        key={`cat-${cat}`}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "rgba(100,116,139,0.45)",
                          letterSpacing: "0.8px",
                          textTransform: "uppercase",
                          padding: "8px 18px 4px",
                          marginTop: i > 0 ? 4 : 0,
                        }}
                      >
                        {cat}
                      </div>
                    );
                  }
                  items.push(
                    <div
                      key={s.id}
                      id={`cmdpal-item-${s.id}`}
                      role="option"
                      aria-selected={i === selected}
                      onClick={s.action}
                      onMouseEnter={() => setSelected(i)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 18px",
                        cursor: "pointer",
                        background:
                          i === selected
                            ? "rgba(45, 212, 191,0.12)"
                            : "transparent",
                        borderLeft:
                          i === selected
                            ? "2px solid #14b8a6"
                            : "2px solid transparent",
                        transition: "all 0.08s",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          width: 24,
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {s.icon}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          color: i === selected ? "#e2e8f0" : "#94a3b8",
                          flex: 1,
                          fontFamily: "-apple-system,'Inter',system-ui,sans-serif",
                        }}
                      >
                        {s.label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(100,116,139,0.4)",
                          flexShrink: 0,
                          fontFamily: "monospace",
                        }}
                      >
                        {s.hint}
                      </span>
                    </div>
                  );
                });
                return items;
              })()}
            </div>

            {/* Keyboard hint footer */}
            <div style={footerStyle}>
              {[
                ["↑↓", "navigate"],
                ["↵", "select"],
                ["esc", "close"],
              ].map(([key, label]) => (
                <div
                  key={key}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                >
                  <kbd
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 4,
                      padding: "1px 5px",
                      fontSize: 10,
                      color: "#64748b",
                      fontFamily: "monospace",
                    }}
                  >
                    {key}
                  </kbd>
                  <span
                    style={{
                      fontSize: 10,
                      color: "rgba(100,116,139,0.4)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
