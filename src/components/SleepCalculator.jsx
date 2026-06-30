import { useState } from "react";

const DEFAULT_CYCLE_MIN = 90;
const DEFAULT_FALL_ASLEEP_MIN = 14;

// Bug fix 1 & 2: accept cycleLen and fallAsleep as parameters so
// getCycleTimes uses state values, not frozen constants.
function getCycleTimes(baseDateMs, direction, cycles, cycleLen, fallAsleepMin) {
  return cycles.map((numCycles) => {
    const totalSleepMin = numCycles * cycleLen;
    const offsetMin = totalSleepMin + fallAsleepMin;
    const ms = direction === "back"
      ? baseDateMs - offsetMin * 60000
      : baseDateMs + offsetMin * 60000;
    return { cycles: numCycles, totalSleep: totalSleepMin, time: new Date(ms) };
  });
}

function formatTime(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatHoursMin(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const QUALITY_LABEL = {
  6: { label: "Ideal", color: "#34c98a", emoji: "🌟" },
  5: { label: "Great", color: "#4ade80", emoji: "✅" },
  4: { label: "Good", color: "#fbbf24", emoji: "🟡" },
  3: { label: "Minimum", color: "#f87171", emoji: "⚠️" },
};

export default function SleepCalculator() {
  const [mode, setMode] = useState("wakeup");
  const [wakeHour, setWakeHour] = useState("7");
  const [wakeMin, setWakeMin] = useState("00");
  const [wakeAmPm, setWakeAmPm] = useState("AM");
  const [bedHour, setBedHour] = useState("10");
  const [bedMin, setBedMin] = useState("30");
  const [bedAmPm, setBedAmPm] = useState("PM");
  const [cycleLen, setCycleLen] = useState(DEFAULT_CYCLE_MIN);
  const [fallAsleep, setFallAsleep] = useState(DEFAULT_FALL_ASLEEP_MIN);

  const parseTime = (h, m, ampm) => {
    let hour = parseInt(h) % 12;
    if (ampm === "PM") hour += 12;
    const d = new Date();
    d.setHours(hour, parseInt(m) || 0, 0, 0);
    return d.getTime();
  };

  // Bug fix 3: pass state values to getCycleTimes — no redundant totalSleep override
  const results = mode === "wakeup"
    ? getCycleTimes(parseTime(wakeHour, wakeMin, wakeAmPm), "back", [6, 5, 4, 3], cycleLen, fallAsleep)
        .map((r) => ({ ...r, label: "Go to sleep at" }))
    : getCycleTimes(parseTime(bedHour, bedMin, bedAmPm), "forward", [6, 5, 4, 3], cycleLen, fallAsleep)
        .map((r) => ({ ...r, label: "Wake up at" }));

  const setNow = () => {
    const d = new Date();
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = String(h % 12 || 12);
    const min2 = String(m).padStart(2, "0");
    if (mode === "wakeup") { setWakeHour(hour12); setWakeMin(min2); setWakeAmPm(ampm); }
    else { setBedHour(hour12); setBedMin(min2); setBedAmPm(ampm); }
  };

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  const containerStyle = {
    background: "rgba(8,9,13,0.95)",
    borderRadius: 18,
    padding: "24px 20px",
    maxWidth: 560,
    margin: "0 auto",
    fontFamily: "'DM Sans', sans-serif",
  };

  const cardStyle = (color) => ({
    background: `rgba(8,9,13,0.6)`,
    border: `1px solid ${color}33`,
    borderRadius: 14,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  });

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>
          😴 Sleep Calculator
        </div>
        <div style={{ fontSize: 13, color: "rgba(148,163,184,0.7)", lineHeight: 1.5 }}>
          Based on {cycleLen}-minute sleep cycles. Waking at the end of a cycle means you wake up feeling refreshed.
        </div>
      </div>

      {/* Mode Toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { id: "wakeup", label: "⏰ I want to wake up at..." },
          { id: "bedtime", label: "🛏️ I plan to sleep at..." },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              flex: 1,
              background: mode === m.id ? "rgba(45, 212, 191,0.2)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${mode === m.id ? "rgba(45, 212, 191,0.5)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10,
              color: mode === m.id ? "#2dd4bf" : "rgba(148,163,184,0.6)",
              padding: "10px 8px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: mode === m.id ? 700 : 400,
              fontFamily: "'DM Sans',sans-serif",
              transition: "all 0.15s ease",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Time Input */}
      <div style={{ background: "rgba(15,23,42,0.6)", borderRadius: 14, padding: "16px", marginBottom: 16, border: "1px solid rgba(51,65,85,0.4)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(148,163,184,0.7)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>
          {mode === "wakeup" ? "Wake-up Time" : "Bedtime"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={mode === "wakeup" ? wakeHour : bedHour}
            onChange={(e) => mode === "wakeup" ? setWakeHour(e.target.value) : setBedHour(e.target.value)}
            style={selectStyle}
          >
            {hours.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <span style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 20 }}>:</span>
          <select
            value={mode === "wakeup" ? wakeMin : bedMin}
            onChange={(e) => mode === "wakeup" ? setWakeMin(e.target.value) : setBedMin(e.target.value)}
            style={selectStyle}
          >
            {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={mode === "wakeup" ? wakeAmPm : bedAmPm}
            onChange={(e) => mode === "wakeup" ? setWakeAmPm(e.target.value) : setBedAmPm(e.target.value)}
            style={{ ...selectStyle, minWidth: 70 }}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
          <button
            onClick={setNow}
            style={{ marginLeft: "auto", background: "rgba(45, 212, 191,0.12)", border: "1px solid rgba(45, 212, 191,0.3)", borderRadius: 8, color: "#2dd4bf", padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}
          >
            Now
          </button>
        </div>
      </div>

      {/* Advanced Settings */}
      <details style={{ marginBottom: 20 }}>
        <summary style={{ fontSize: 12, color: "rgba(148,163,184,0.5)", cursor: "pointer", userSelect: "none", marginBottom: 10 }}>
          ⚙️ Advanced settings
        </summary>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", marginBottom: 4 }}>Cycle length (min)</div>
            <input
              type="number"
              value={cycleLen}
              onChange={(e) => setCycleLen(Math.max(60, Math.min(120, parseInt(e.target.value) || DEFAULT_CYCLE_MIN)))}
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", marginBottom: 4 }}>Time to fall asleep (min)</div>
            <input
              type="number"
              value={fallAsleep}
              onChange={(e) => setFallAsleep(Math.max(5, Math.min(45, parseInt(e.target.value) || DEFAULT_FALL_ASLEEP_MIN)))}
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>
        </div>
      </details>

      {/* Results */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(148,163,184,0.7)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.8px" }}>
          {mode === "wakeup" ? "You should go to sleep at..." : "You should wake up at..."}
        </div>
        {results.map((r) => {
          const q = QUALITY_LABEL[r.cycles] || QUALITY_LABEL[4];
          return (
            <div key={r.cycles} style={cardStyle(q.color)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, background: `${q.color}18`, border: `1px solid ${q.color}40`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {q.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>
                    {formatTime(r.time)}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", marginTop: 1 }}>
                    {r.cycles} cycles · {formatHoursMin(r.totalSleep)} sleep
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: q.color }}>{q.label}</div>
                <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginTop: 2 }}>
                  +{fallAsleep}min to fall asleep
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div style={{ marginTop: 16, background: "rgba(45, 212, 191,0.07)", border: "1px solid rgba(45, 212, 191,0.2)", borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#2dd4bf", marginBottom: 4 }}>💡 How it works</div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.65)", lineHeight: 1.65 }}>
          Sleep happens in ~{cycleLen}-minute cycles through light sleep, deep sleep, and REM. Waking at the end of a cycle — rather than in the middle — means you wake up feeling more refreshed. This calculator adds {fallAsleep} minutes to fall asleep before counting cycles.
        </div>
      </div>
    </div>
  );
}

const selectStyle = {
  background: "rgba(15,23,42,0.8)",
  border: "1px solid rgba(51,65,85,0.5)",
  borderRadius: 8,
  color: "#f1f5f9",
  padding: "8px 10px",
  fontSize: 16,
  fontWeight: 700,
  fontFamily: "'DM Sans',sans-serif",
  outline: "none",
  cursor: "pointer",
  minWidth: 60,
};

const inputStyle = {
  background: "rgba(15,23,42,0.8)",
  border: "1px solid rgba(51,65,85,0.5)",
  borderRadius: 8,
  color: "#f1f5f9",
  padding: "8px 10px",
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "'DM Sans',sans-serif",
  outline: "none",
  boxSizing: "border-box",
};
