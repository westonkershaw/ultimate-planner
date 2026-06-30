/* eslint-disable */
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "up_focus_data";
const uid = () => Math.random().toString(36).slice(2, 9);
const FONT = "'DM Sans', sans-serif";

const CARD = {
  background: "rgba(17,24,39,0.7)",
  borderRadius: 16,
  padding: "16px 20px",
  marginBottom: 14,
  border: "1px solid rgba(51,65,85,0.3)",
};

const SECTION_LABEL = {
  fontSize: 12,
  fontWeight: 700,
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: 10,
  marginTop: 18,
};

const BTN = {
  padding: "10px 20px",
  borderRadius: 12,
  border: "none",
  fontFamily: FONT,
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 0.2s",
};

const DURATIONS = [
  { label: "15m", value: 15 },
  { label: "25m", value: 25 },
  { label: "45m", value: 45 },
  { label: "60m", value: 60 },
  { label: "Custom", value: 0 },
];

const DIFFICULTY_LEVELS = [
  { id: "easy", label: "Easy", desc: "Can quit anytime", icon: "🟢" },
  { id: "medium", label: "Medium", desc: 'Must type "QUIT" to end early', icon: "🟡" },
  { id: "hard", label: "Hard", desc: "Can't end until timer finishes", icon: "🔴" },
];

const DEFAULT_BLOCKS = [
  { id: "work_time", name: "Work Time", icon: "💼", schedule: "Weekdays 9AM–5PM", days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17 },
  { id: "morning_routine", name: "Morning Routine", icon: "🌅", schedule: "Every day 6AM–8AM", days: [0, 1, 2, 3, 4, 5, 6], startHour: 6, endHour: 8 },
  { id: "deep_work", name: "Deep Work", icon: "🧠", schedule: "Every day 2PM–3PM", days: [0, 1, 2, 3, 4, 5, 6], startHour: 14, endHour: 15 },
  { id: "wind_down", name: "Wind Down", icon: "🌙", schedule: "Every day 9PM–11PM", days: [0, 1, 2, 3, 4, 5, 6], startHour: 21, endHour: 23 },
];

const BLOCKLIST_CATEGORIES = [
  { id: "social", label: "Social", icon: "💬", domains: ["facebook.com", "instagram.com", "twitter.com", "x.com", "tiktok.com", "snapchat.com", "reddit.com", "threads.net"] },
  { id: "video", label: "Video", icon: "📺", domains: ["youtube.com", "netflix.com", "twitch.tv", "hulu.com", "disneyplus.com"] },
  { id: "news", label: "News", icon: "📰", domains: ["cnn.com", "foxnews.com", "bbc.com", "nytimes.com", "news.google.com"] },
  { id: "dating", label: "Dating", icon: "💕", domains: ["tinder.com", "bumble.com", "hinge.co", "match.com"] },
  { id: "shopping", label: "Shopping", icon: "🛒", domains: ["amazon.com", "ebay.com", "etsy.com", "walmart.com", "target.com"] },
  { id: "gaming", label: "Gaming", icon: "🎮", domains: ["store.steampowered.com", "twitch.tv", "discord.com", "roblox.com"] },
  { id: "adult", label: "Adult", icon: "🔞", domains: ["(adult sites)"] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return mon.toLocaleDateString("en-CA");
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function loadFocusData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    sessions: [],
    blocks: DEFAULT_BLOCKS,
    blockedCategories: ["social", "video"],
    customDomains: [],
    exceptions: [],
    difficulty: "easy",
    activeSession: null,
  };
}

function saveFocusData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Circular Timer SVG ──────────────────────────────────────────────────────

function CircularTimer({ progress, size = 240, strokeWidth = 10, children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(51,65,85,0.4)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#focusGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <defs>
          <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Focus Mode Main Component ───────────────────────────────────────────────

export default function FocusMode({ data, onChange, isPro, onSessionStart, onSessionEnd }) {
  const [focusData, setFocusData] = useState(loadFocusData);
  const [view, setView] = useState("home"); // home, timer, blocks, blocklist, history, settings
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [customMinutes, setCustomMinutes] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showQuitPrompt, setShowQuitPrompt] = useState(false);
  const [quitText, setQuitText] = useState("");
  const [newBlockForm, setNewBlockForm] = useState(null);
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [exceptionInput, setExceptionInput] = useState("");
  const intervalRef = useRef(null);
  const sessionStartRef = useRef(null);

  // ── Native app blocking state ──────────────────────────────────────────────
  const isNativeApp = typeof window !== "undefined" && !!window.ReactNativeWebView;
  const [nativeBlockerAvailable, setNativeBlockerAvailable] = useState(false);
  const [nativeAuthStatus, setNativeAuthStatus] = useState("unknown"); // approved | denied | notDetermined | unavailable
  const [nativeAppCount, setNativeAppCount] = useState(0);
  const [nativeBlocking, setNativeBlocking] = useState(false);

  // Check native blocker status on mount
  useEffect(() => {
    if (!isNativeApp) return;
    // Ask the native app if FamilyControls is available
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "FOCUS_BLOCKER_CHECK" }));

    const handler = (event) => {
      try {
        const msg = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (msg.type === "FOCUS_BLOCKER_STATUS") {
          setNativeBlockerAvailable(!!msg.available);
          setNativeAuthStatus(msg.authStatus || "unavailable");
        }
        if (msg.type === "SCREEN_TIME_AUTH_RESULT") {
          setNativeAuthStatus(msg.status || "denied");
        }
        if (msg.type === "APP_PICKER_RESULT") {
          setNativeAppCount(msg.count || 0);
        }
        if (msg.type === "FOCUS_BLOCKING_ACTIVE") {
          setNativeBlocking(!!msg.blocking);
        }
      } catch {}
    };

    // Listen for messages from the native bridge
    const origHandler = window.__rcBridge;
    window.__focusBlockerBridge = handler;
    // Also hook into message events if available
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      delete window.__focusBlockerBridge;
    };
  }, [isNativeApp]);

  const requestNativePermission = () => {
    if (!isNativeApp) return;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "REQUEST_SCREEN_TIME_PERMISSION" }));
  };

  const showNativeAppPicker = () => {
    if (!isNativeApp) return;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "SHOW_APP_PICKER" }));
  };

  // Persist focus data
  useEffect(() => {
    saveFocusData(focusData);
  }, [focusData]);

  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused && timerSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, isPaused]);

  const startSession = () => {
    const mins = selectedDuration || parseInt(customMinutes) || 25;
    setTimerSeconds(mins * 60);
    setIsRunning(true);
    setIsPaused(false);
    sessionStartRef.current = Date.now();
    setView("timer");
    // Bridge to global App state for overlay + tab title countdown
    if (onSessionStart) onSessionStart({ duration: mins, startedAt: Date.now() });
    // Trigger native app blocking via FamilyControls
    if (isNativeApp) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "FOCUS_START",
        duration: mins,
        apps: focusData.blocklist?.filter(b => b.enabled !== false).map(b => b.name) || [],
      }));
    }
  };

  const completeSession = () => {
    const duration = selectedDuration || parseInt(customMinutes) || 25;
    const actual = Math.round((Date.now() - (sessionStartRef.current || Date.now())) / 60000);
    const session = {
      id: uid(),
      date: todayStr(),
      startTime: sessionStartRef.current,
      duration,
      completed: true,
      difficulty: focusData.difficulty,
    };
    setFocusData((prev) => ({ ...prev, sessions: [...prev.sessions, session] }));
    setIsRunning(false);
    setIsPaused(false);
    setView("home");
    // Bridge to global App state
    if (onSessionEnd) onSessionEnd({ ...session, actual });
    // Stop native blocking
    if (isNativeApp) window.ReactNativeWebView.postMessage(JSON.stringify({ type: "FOCUS_END" }));
  };

  const abandonSession = () => {
    const duration = selectedDuration || parseInt(customMinutes) || 25;
    const elapsed = Math.round((Date.now() - sessionStartRef.current) / 60000);
    const session = {
      id: uid(),
      date: todayStr(),
      startTime: sessionStartRef.current,
      duration,
      elapsed,
      completed: false,
      difficulty: focusData.difficulty,
    };
    setFocusData((prev) => ({ ...prev, sessions: [...prev.sessions, session] }));
    setIsRunning(false);
    setIsPaused(false);
    setTimerSeconds(0);
    setShowQuitPrompt(false);
    setQuitText("");
    setView("home");
    // Bridge to global App state
    if (onSessionEnd) onSessionEnd({ ...session, actual: elapsed });
    // Stop native blocking
    if (isNativeApp) window.ReactNativeWebView.postMessage(JSON.stringify({ type: "FOCUS_END" }));
  };

  const handleEndEarly = () => {
    if (focusData.difficulty === "hard") return; // Can't quit
    if (focusData.difficulty === "medium") {
      setShowQuitPrompt(true);
      return;
    }
    abandonSession();
  };

  const confirmQuit = () => {
    if (quitText.toUpperCase() === "QUIT") {
      abandonSession();
    }
  };

  // Stats
  const todaySessions = focusData.sessions.filter((s) => s.date === todayStr());
  const todayFocusMinutes = todaySessions.filter((s) => s.completed).reduce((sum, s) => sum + s.duration, 0);
  const weekStart = getWeekStart();
  const weekSessions = focusData.sessions.filter((s) => s.date >= weekStart);
  const weekFocusMinutes = weekSessions.filter((s) => s.completed).reduce((sum, s) => sum + s.duration, 0);

  // Streak calculation
  const completedStreak = useMemo(() => {
    const completed = focusData.sessions.filter((s) => s.completed);
    if (completed.length === 0) return 0;
    const dates = [...new Set(completed.map((s) => s.date))].sort().reverse();
    let streak = 0;
    const today = todayStr();
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toLocaleDateString("en-CA");
      if (dates[i] === expectedStr) streak++;
      else break;
    }
    return streak;
  }, [focusData.sessions]);

  // Active block detection
  const activeBlock = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    return focusData.blocks.find(
      (b) => b.days.includes(day) && hour >= b.startHour && hour < b.endHour
    ) || null;
  }, [focusData.blocks]);

  const totalDuration = selectedDuration || parseInt(customMinutes) || 25;
  const progress = isRunning ? timerSeconds / (totalDuration * 60) : 1;

  // ─── Sub-views ─────────────────────────────────────────────────────────────

  const renderTimer = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ textAlign: "center", padding: "20px 0" }}
    >
      <CircularTimer progress={progress} size={260} strokeWidth={12}>
        <div style={{ fontSize: 48, fontWeight: 800, color: "#f1f5f9", fontFamily: "'DM Sans', monospace", letterSpacing: "-1px" }}>
          {formatTime(timerSeconds)}
        </div>
        <div style={{ fontSize: 13, color: "rgba(148,163,184,0.7)", marginTop: 4, fontWeight: 600 }}>
          {isPaused ? "PAUSED" : "FOCUSING"}
        </div>
      </CircularTimer>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 30 }}>
        {!isPaused ? (
          <button
            onClick={() => { setIsPaused(true); clearInterval(intervalRef.current); }}
            style={{ ...BTN, background: "rgba(234,179,8,0.2)", color: "#fbbf24" }}
          >
            Pause
          </button>
        ) : (
          <button
            onClick={() => setIsPaused(false)}
            style={{ ...BTN, background: "rgba(34,197,94,0.2)", color: "#22c55e" }}
          >
            Resume
          </button>
        )}
        <button
          onClick={handleEndEarly}
          disabled={focusData.difficulty === "hard"}
          style={{
            ...BTN,
            background: focusData.difficulty === "hard" ? "rgba(51,65,85,0.3)" : "rgba(239,68,68,0.15)",
            color: focusData.difficulty === "hard" ? "rgba(148,163,184,0.4)" : "#ef4444",
            cursor: focusData.difficulty === "hard" ? "not-allowed" : "pointer",
          }}
        >
          End Early
        </button>
      </div>

      {focusData.difficulty === "hard" && (
        <p style={{ fontSize: 11, color: "rgba(239,68,68,0.6)", marginTop: 12 }}>
          Hard mode: Cannot end session early
        </p>
      )}

      {/* Quit prompt for medium difficulty */}
      <AnimatePresence>
        {showQuitPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{ ...CARD, marginTop: 20, textAlign: "center" }}
          >
            <p style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              Type "QUIT" to confirm ending early
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <input
                value={quitText}
                onChange={(e) => setQuitText(e.target.value)}
                placeholder="Type QUIT..."
                style={{
                  background: "rgba(15,23,42,0.8)",
                  border: "1px solid rgba(51,65,85,0.5)",
                  borderRadius: 8,
                  padding: "8px 14px",
                  color: "#f1f5f9",
                  fontSize: 14,
                  fontFamily: FONT,
                  outline: "none",
                  width: 120,
                }}
              />
              <button onClick={confirmQuit} style={{ ...BTN, background: "rgba(239,68,68,0.2)", color: "#ef4444", padding: "8px 16px" }}>
                Confirm
              </button>
              <button onClick={() => { setShowQuitPrompt(false); setQuitText(""); }} style={{ ...BTN, background: "rgba(51,65,85,0.3)", color: "#94a3b8", padding: "8px 16px" }}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderHome = () => (
    <motion.div initial={false} animate={{ opacity: 1 }}>
      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        <div style={{ ...CARD, textAlign: "center", marginBottom: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#14b8a6" }}>
            {todayFocusMinutes}m
          </div>
          <div style={{ fontSize: 10, color: "rgba(148,163,184,0.6)", fontWeight: 600 }}>Today</div>
        </div>
        <div style={{ ...CARD, textAlign: "center", marginBottom: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e" }}>
            {Math.round(weekFocusMinutes / 60)}h
          </div>
          <div style={{ fontSize: 10, color: "rgba(148,163,184,0.6)", fontWeight: 600 }}>This Week</div>
        </div>
        <div style={{ ...CARD, textAlign: "center", marginBottom: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fbbf24" }}>
            {completedStreak}
          </div>
          <div style={{ fontSize: 10, color: "rgba(148,163,184,0.6)", fontWeight: 600 }}>Streak</div>
        </div>
      </div>

      {/* Active Block Indicator */}
      {activeBlock && (
        <div style={{ ...CARD, borderLeft: "3px solid #14b8a6", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{activeBlock.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{activeBlock.name}</div>
            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.6)" }}>Active now</div>
          </div>
        </div>
      )}

      {/* Duration Picker */}
      <p style={SECTION_LABEL}>Start Focus Session</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {DURATIONS.map((d) => (
          <button
            key={d.label}
            onClick={() => {
              if (d.value === 0) {
                setSelectedDuration(0);
              } else {
                setSelectedDuration(d.value);
                setCustomMinutes("");
              }
            }}
            style={{
              ...BTN,
              padding: "8px 16px",
              fontSize: 13,
              background: (d.value === 0 ? selectedDuration === 0 : selectedDuration === d.value)
                ? "rgba(45, 212, 191,0.2)" : "rgba(15,23,42,0.5)",
              color: (d.value === 0 ? selectedDuration === 0 : selectedDuration === d.value)
                ? "#2dd4bf" : "rgba(148,163,184,0.6)",
              border: (d.value === 0 ? selectedDuration === 0 : selectedDuration === d.value)
                ? "1px solid rgba(45, 212, 191,0.4)" : "1px solid rgba(51,65,85,0.4)",
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {selectedDuration === 0 && (
        <input
          type="number"
          value={customMinutes}
          onChange={(e) => setCustomMinutes(e.target.value)}
          placeholder="Minutes..."
          min={1}
          max={480}
          style={{
            background: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(51,65,85,0.5)",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#f1f5f9",
            fontSize: 14,
            fontFamily: FONT,
            outline: "none",
            width: 120,
            marginBottom: 14,
          }}
        />
      )}

      {/* ── Native App Blocking (iOS Screen Time) ── */}
      {isNativeApp && (
        <div style={{ ...CARD, borderLeft: nativeAuthStatus === "approved" ? "3px solid #22c55e" : "3px solid #f59e0b", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>
              🛡️ App Blocking {nativeAuthStatus === "approved" ? "(Active)" : ""}
            </div>
            {nativeAuthStatus === "approved" && nativeAppCount > 0 && (
              <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>{nativeAppCount} apps selected</span>
            )}
          </div>

          {nativeAuthStatus !== "approved" ? (
            <div>
              <div style={{ fontSize: 12, color: "rgba(148,163,184,0.7)", marginBottom: 10, lineHeight: 1.5 }}>
                Allow Screen Time access to actually block distracting apps during focus sessions.
              </div>
              <button
                onClick={requestNativePermission}
                style={{ ...BTN, width: "100%", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b", padding: "10px 16px", fontSize: 13, borderRadius: 10 }}
              >
                🔐 Enable App Blocking
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: "rgba(148,163,184,0.7)", marginBottom: 10, lineHeight: 1.5 }}>
                {nativeAppCount > 0
                  ? "Selected apps will be blocked when you start a focus session."
                  : "Tap below to choose which apps to block during focus sessions."}
              </div>
              <button
                onClick={showNativeAppPicker}
                style={{ ...BTN, width: "100%", background: "rgba(45, 212, 191,0.15)", border: "1px solid rgba(45, 212, 191,0.4)", color: "#2dd4bf", padding: "10px 16px", fontSize: 13, borderRadius: 10 }}
              >
                📱 {nativeAppCount > 0 ? "Change Blocked Apps" : "Select Apps to Block"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Web-only notice */}
      {!isNativeApp && (
        <div style={{ ...CARD, borderLeft: "3px solid rgba(148,163,184,0.3)", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "rgba(148,163,184,0.6)", lineHeight: 1.5 }}>
            💡 <strong style={{ color: "rgba(255,255,255,0.6)" }}>App blocking</strong> is available in the iOS app.
            On web, Focus Mode uses the honor system with timer + notifications.
          </div>
        </div>
      )}

      <button
        onClick={startSession}
        style={{
          ...BTN,
          width: "100%",
          background: "linear-gradient(135deg, #14b8a6, #0e9488)",
          color: "#fff",
          padding: "14px 20px",
          fontSize: 16,
          borderRadius: 14,
          boxShadow: "0 4px 20px rgba(45, 212, 191,0.3)",
        }}
      >
        {isNativeApp && nativeAuthStatus === "approved" && nativeAppCount > 0
          ? `🛡️ Start Focus + Block ${nativeAppCount} Apps`
          : "Start Focus Session"}
      </button>

      {/* Navigation Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
        {[
          { id: "blocks", icon: "📅", label: "Focus Blocks" },
          { id: "blocklist", icon: "🚫", label: "Blocklist" },
          { id: "history", icon: "📊", label: "History" },
          { id: "settings", icon: "⚙️", label: "Settings" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            style={{
              ...CARD,
              marginBottom: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "1px solid rgba(51,65,85,0.3)",
              background: "rgba(17,24,39,0.7)",
              textAlign: "left",
              fontFamily: FONT,
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{item.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );

  const renderBlocks = () => (
    <motion.div initial={false} animate={{ opacity: 1 }}>
      <button onClick={() => setView("home")} style={{ ...BTN, background: "transparent", color: "#2dd4bf", padding: "4px 0", marginBottom: 12, fontSize: 13 }}>
        ← Back
      </button>
      <p style={SECTION_LABEL}>Focus Blocks (Schedules)</p>

      {focusData.blocks.map((block) => (
        <div key={block.id} style={{ ...CARD, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>{block.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{block.name}</div>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)" }}>{block.schedule}</div>
            </div>
          </div>
          <button
            onClick={() => {
              setFocusData((prev) => ({
                ...prev,
                blocks: prev.blocks.filter((b) => b.id !== block.id),
              }));
            }}
            style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 8, padding: "6px 10px", color: "#ef4444", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
          >
            Remove
          </button>
        </div>
      ))}

      {/* New Block Form */}
      {newBlockForm ? (
        <div style={{ ...CARD, borderColor: "rgba(45, 212, 191,0.3)" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#2dd4bf", marginBottom: 10 }}>New Focus Block</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={newBlockForm.name}
              onChange={(e) => setNewBlockForm({ ...newBlockForm, name: e.target.value })}
              placeholder="Block name..."
              style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, fontFamily: FONT, outline: "none" }}
            />
            <input
              value={newBlockForm.icon}
              onChange={(e) => setNewBlockForm({ ...newBlockForm, icon: e.target.value })}
              placeholder="Icon (emoji)..."
              style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, fontFamily: FONT, outline: "none", width: 80 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                value={newBlockForm.startHour}
                onChange={(e) => setNewBlockForm({ ...newBlockForm, startHour: parseInt(e.target.value) || 0 })}
                placeholder="Start hour (0-23)"
                min={0}
                max={23}
                style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, fontFamily: FONT, outline: "none", flex: 1 }}
              />
              <input
                type="number"
                value={newBlockForm.endHour}
                onChange={(e) => setNewBlockForm({ ...newBlockForm, endHour: parseInt(e.target.value) || 0 })}
                placeholder="End hour (0-23)"
                min={0}
                max={23}
                style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, fontFamily: FONT, outline: "none", flex: 1 }}
              />
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                <button
                  key={d}
                  onClick={() => {
                    const days = newBlockForm.days.includes(i)
                      ? newBlockForm.days.filter((x) => x !== i)
                      : [...newBlockForm.days, i];
                    setNewBlockForm({ ...newBlockForm, days });
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: newBlockForm.days.includes(i) ? "rgba(45, 212, 191,0.3)" : "rgba(51,65,85,0.3)",
                    color: newBlockForm.days.includes(i) ? "#2dd4bf" : "rgba(148,163,184,0.5)",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button
                onClick={() => {
                  if (!newBlockForm.name) return;
                  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const schedule = newBlockForm.days.length === 7
                    ? `Every day ${newBlockForm.startHour > 12 ? (newBlockForm.startHour - 12) + "PM" : newBlockForm.startHour + "AM"}–${newBlockForm.endHour > 12 ? (newBlockForm.endHour - 12) + "PM" : newBlockForm.endHour + "AM"}`
                    : `${newBlockForm.days.map((d) => dayNames[d]).join(", ")} ${newBlockForm.startHour > 12 ? (newBlockForm.startHour - 12) + "PM" : newBlockForm.startHour + "AM"}–${newBlockForm.endHour > 12 ? (newBlockForm.endHour - 12) + "PM" : newBlockForm.endHour + "AM"}`;
                  const block = {
                    id: uid(),
                    name: newBlockForm.name,
                    icon: newBlockForm.icon || "🎯",
                    schedule,
                    days: newBlockForm.days,
                    startHour: newBlockForm.startHour,
                    endHour: newBlockForm.endHour,
                  };
                  setFocusData((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
                  setNewBlockForm(null);
                }}
                style={{ ...BTN, background: "rgba(45, 212, 191,0.2)", color: "#2dd4bf", padding: "8px 14px", fontSize: 12 }}
              >
                Save Block
              </button>
              <button
                onClick={() => setNewBlockForm(null)}
                style={{ ...BTN, background: "rgba(51,65,85,0.3)", color: "#94a3b8", padding: "8px 14px", fontSize: 12 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setNewBlockForm({ name: "", icon: "", startHour: 9, endHour: 17, days: [1, 2, 3, 4, 5] })}
          style={{
            ...BTN,
            width: "100%",
            background: "rgba(45, 212, 191,0.1)",
            color: "#2dd4bf",
            border: "1px dashed rgba(45, 212, 191,0.3)",
            padding: "12px 20px",
          }}
        >
          + New Block
        </button>
      )}
    </motion.div>
  );

  const renderBlocklist = () => (
    <motion.div initial={false} animate={{ opacity: 1 }}>
      <button onClick={() => setView("home")} style={{ ...BTN, background: "transparent", color: "#2dd4bf", padding: "4px 0", marginBottom: 12, fontSize: 13 }}>
        ← Back
      </button>
      <p style={SECTION_LABEL}>Website Blocklist</p>
      <p style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginBottom: 14, lineHeight: 1.5 }}>
        Select categories to block during focus sessions. This is commitment-based — track what you commit to avoiding.
      </p>

      {/* Category toggles */}
      {BLOCKLIST_CATEGORIES.map((cat) => {
        const isActive = focusData.blockedCategories.includes(cat.id);
        return (
          <div key={cat.id} style={{ ...CARD, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{cat.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{cat.label}</div>
                <div style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>
                  {cat.domains.slice(0, 3).join(", ")}...
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setFocusData((prev) => ({
                  ...prev,
                  blockedCategories: isActive
                    ? prev.blockedCategories.filter((c) => c !== cat.id)
                    : [...prev.blockedCategories, cat.id],
                }));
              }}
              style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                border: "none",
                background: isActive ? "#14b8a6" : "rgba(51,65,85,0.6)",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
              }}
            >
              <div style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: 3,
                left: isActive ? 21 : 3,
                transition: "left 0.2s",
              }} />
            </button>
          </div>
        );
      })}

      {/* Custom domains */}
      <p style={{ ...SECTION_LABEL, marginTop: 20 }}>Custom Domains</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={customDomainInput}
          onChange={(e) => setCustomDomainInput(e.target.value)}
          placeholder="e.g., distraction.com"
          style={{
            flex: 1,
            background: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(51,65,85,0.5)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#f1f5f9",
            fontSize: 13,
            fontFamily: FONT,
            outline: "none",
          }}
        />
        <button
          onClick={() => {
            if (customDomainInput.trim()) {
              setFocusData((prev) => ({
                ...prev,
                customDomains: [...prev.customDomains, customDomainInput.trim()],
              }));
              setCustomDomainInput("");
            }
          }}
          style={{ ...BTN, background: "rgba(45, 212, 191,0.2)", color: "#2dd4bf", padding: "8px 14px", fontSize: 12 }}
        >
          Add
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {focusData.customDomains.map((d, i) => (
          <span
            key={i}
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11,
              color: "#f87171",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {d}
            <button
              onClick={() => setFocusData((prev) => ({ ...prev, customDomains: prev.customDomains.filter((_, idx) => idx !== i) }))}
              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13, padding: 0 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Exceptions */}
      <p style={{ ...SECTION_LABEL, marginTop: 20 }}>Exceptions (Always Allow)</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={exceptionInput}
          onChange={(e) => setExceptionInput(e.target.value)}
          placeholder="e.g., docs.google.com"
          style={{
            flex: 1,
            background: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(51,65,85,0.5)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#f1f5f9",
            fontSize: 13,
            fontFamily: FONT,
            outline: "none",
          }}
        />
        <button
          onClick={() => {
            if (exceptionInput.trim()) {
              setFocusData((prev) => ({
                ...prev,
                exceptions: [...prev.exceptions, exceptionInput.trim()],
              }));
              setExceptionInput("");
            }
          }}
          style={{ ...BTN, background: "rgba(34,197,94,0.15)", color: "#22c55e", padding: "8px 14px", fontSize: 12 }}
        >
          Add
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {focusData.exceptions.map((d, i) => (
          <span
            key={i}
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11,
              color: "#4ade80",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {d}
            <button
              onClick={() => setFocusData((prev) => ({ ...prev, exceptions: prev.exceptions.filter((_, idx) => idx !== i) }))}
              style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", fontSize: 13, padding: 0 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </motion.div>
  );

  const renderHistory = () => {
    const sortedSessions = [...focusData.sessions].sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
    return (
      <motion.div initial={false} animate={{ opacity: 1 }}>
        <button onClick={() => setView("home")} style={{ ...BTN, background: "transparent", color: "#2dd4bf", padding: "4px 0", marginBottom: 12, fontSize: 13 }}>
          ← Back
        </button>
        <p style={SECTION_LABEL}>Session History</p>

        {/* Summary Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <div style={{ ...CARD, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#14b8a6" }}>
              {Math.round(todayFocusMinutes)}m
            </div>
            <div style={{ fontSize: 10, color: "rgba(148,163,184,0.6)", fontWeight: 600 }}>Today's Focus</div>
          </div>
          <div style={{ ...CARD, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#22c55e" }}>
              {Math.round(weekFocusMinutes)}m
            </div>
            <div style={{ fontSize: 10, color: "rgba(148,163,184,0.6)", fontWeight: 600 }}>This Week</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <div style={{ ...CARD, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fbbf24" }}>
              {completedStreak}
            </div>
            <div style={{ fontSize: 10, color: "rgba(148,163,184,0.6)", fontWeight: 600 }}>Day Streak</div>
          </div>
          <div style={{ ...CARD, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0" }}>
              {focusData.sessions.filter((s) => s.completed).length}/{focusData.sessions.length}
            </div>
            <div style={{ fontSize: 10, color: "rgba(148,163,184,0.6)", fontWeight: 600 }}>Completed</div>
          </div>
        </div>

        {/* Session List */}
        {sortedSessions.length === 0 ? (
          <div style={{ ...CARD, textAlign: "center" }}>
            <p style={{ color: "rgba(148,163,184,0.5)", fontSize: 13 }}>No sessions yet. Start your first focus session!</p>
          </div>
        ) : (
          sortedSessions.slice(0, 20).map((s) => (
            <div key={s.id} style={{ ...CARD, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{s.completed ? "✅" : "❌"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                    {s.duration}min {s.completed ? "completed" : `abandoned (${s.elapsed || 0}m)`}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(148,163,184,0.4)" }}>
                    {s.date} · {DIFFICULTY_LEVELS.find((d) => d.id === s.difficulty)?.label || "Easy"}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </motion.div>
    );
  };

  const renderSettings = () => (
    <motion.div initial={false} animate={{ opacity: 1 }}>
      <button onClick={() => setView("home")} style={{ ...BTN, background: "transparent", color: "#2dd4bf", padding: "4px 0", marginBottom: 12, fontSize: 13 }}>
        ← Back
      </button>
      <p style={SECTION_LABEL}>Difficulty Setting</p>
      <p style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginBottom: 14 }}>
        Controls how easy it is to quit a focus session early.
      </p>

      {DIFFICULTY_LEVELS.map((level) => (
        <button
          key={level.id}
          onClick={() => setFocusData((prev) => ({ ...prev, difficulty: level.id }))}
          style={{
            ...CARD,
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            fontFamily: FONT,
            borderColor: focusData.difficulty === level.id ? "rgba(45, 212, 191,0.5)" : "rgba(51,65,85,0.3)",
            background: focusData.difficulty === level.id ? "rgba(45, 212, 191,0.1)" : "rgba(17,24,39,0.7)",
          }}
        >
          <span style={{ fontSize: 20 }}>{level.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: focusData.difficulty === level.id ? "#2dd4bf" : "#f1f5f9" }}>
              {level.label}
            </div>
            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)" }}>{level.desc}</div>
          </div>
        </button>
      ))}

      {/* Reset data option */}
      <p style={{ ...SECTION_LABEL, marginTop: 24 }}>Data</p>
      <button
        onClick={() => {
          if (confirm("Reset all focus data? This cannot be undone.")) {
            const fresh = {
              sessions: [],
              blocks: DEFAULT_BLOCKS,
              blockedCategories: ["social", "video"],
              customDomains: [],
              exceptions: [],
              difficulty: "easy",
              activeSession: null,
            };
            setFocusData(fresh);
          }
        }}
        style={{ ...BTN, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        Reset Focus Data
      </button>
    </motion.div>
  );

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: FONT }}>
      <AnimatePresence mode="wait">
        {isRunning && renderTimer()}
        {!isRunning && view === "home" && renderHome()}
        {!isRunning && view === "blocks" && renderBlocks()}
        {!isRunning && view === "blocklist" && renderBlocklist()}
        {!isRunning && view === "history" && renderHistory()}
        {!isRunning && view === "settings" && renderSettings()}
      </AnimatePresence>
    </div>
  );
}

// ─── Dashboard Widget (exported separately) ──────────────────────────────────

export function FocusDashWidget({ data, onNavigate }) {
  const focusData = loadFocusData();
  const today = todayStr();
  const todaySessions = focusData.sessions.filter((s) => s.date === today && s.completed);
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);

  // Active block
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const activeBlock = focusData.blocks.find(
    (b) => b.days.includes(day) && hour >= b.startHour && hour < b.endHour
  ) || null;

  return (
    <div
      onClick={onNavigate}
      style={{
        background: "rgba(17,24,39,0.7)",
        border: "1px solid rgba(45, 212, 191,0.2)",
        borderRadius: 16,
        padding: "16px 20px",
        cursor: "pointer",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#2dd4bf" }}>🎯 Focus</span>
        <span style={{ fontSize: 11, color: "rgba(45, 212, 191,0.7)" }}>View all →</span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: todayMinutes > 0 ? "#22c55e" : "rgba(255,255,255,0.25)", marginBottom: 4 }}>
            {todayMinutes > 0 ? `${todayMinutes}m` : "–"}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
            Today's Focus
          </div>
        </div>
        <div style={{ flex: 1, background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>
            {activeBlock ? activeBlock.icon : "⏸️"}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
            {activeBlock ? activeBlock.name : "No block"}
          </div>
        </div>
      </div>
    </div>
  );
}
