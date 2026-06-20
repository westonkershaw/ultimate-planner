/* eslint-disable */
import React from "react";

export const EVENT_TYPES = [
  { id: "work", label: "Work", color: "#4f9cf9", icon: "\u{1F4BC}" },
  { id: "school", label: "School", color: "#c084fc", icon: "\u{1F4DA}" },
  { id: "personal", label: "Personal", color: "#34c98a", icon: "\u{1F3E0}" },
  { id: "health", label: "Health", color: "#f97b4f", icon: "\u{1F3C3}" },
  { id: "social", label: "Social", color: "#fbbf24", icon: "\u{1F91D}" },
  { id: "other", label: "Other", color: "#94a3b8", icon: "\u{1F4CC}" },
];

export const COLORS = [
  "#4f9cf9","#c084fc","#34c98a","#f97b4f","#fbbf24","#f87171","#818cf8","#94a3b8",
];

export const fmtTime = (h, m = 0) => {
  const ap = h < 12 ? "AM" : "PM";
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hh}:00 ${ap}` : `${hh}:${String(m).padStart(2, "0")} ${ap}`;
};

export const buildTimeOptions = () => {
  const opts = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 15)
      opts.push({ h, m, label: fmtTime(h, m), val: `${h}:${m}` });
  return opts;
};

const INP = {
  width: "100%", boxSizing: "border-box", background: "rgba(15,23,42,0.8)",
  border: "1px solid rgba(51,65,85,0.6)", borderRadius: 8, outline: "none",
  color: "#e2e8f0", fontSize: 14, fontFamily: "'DM Sans', sans-serif", padding: "9px 12px",
};
const SEL = {
  ...INP, appearance: "none", WebkitAppearance: "none", paddingRight: 28, cursor: "pointer",
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
};
const LBL = {
  fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5, display: "block",
};

/** Renders form fields for calendar item editing. */
export default function CalendarEditForm({
  title, setTitle, startTime, onStartChange, endTime, setEndTime,
  startTotal, duration, type, setType, color, setColor,
  notes, setNotes, kind, onSave, inputRef, timeOpts,
}) {
  const kindLabel = kind === "task" ? "Task" : kind === "meal" ? "Meal" : "Event";
  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <label style={LBL}>Title</label>
        <input ref={inputRef} value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSave(); }}
          placeholder={kind === "meal" ? "Meal name" : `${kindLabel} title`} style={INP} />
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={LBL}>Start</label>
          <select value={startTime} onChange={(e) => onStartChange(e.target.value)} style={SEL}>
            {timeOpts.map((o) => <option key={`s-${o.h}-${o.m}`} value={o.val}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={LBL}>End</label>
          <select value={endTime} onChange={(e) => setEndTime(e.target.value)} style={SEL}>
            {timeOpts.filter((o) => o.h * 60 + o.m > startTotal).map((o) => (
              <option key={`e-${o.h}-${o.m}`} value={o.val}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      {duration > 0 && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>
          Duration: {duration >= 60
            ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ""}` : `${duration}m`}
        </div>
      )}
      {kind !== "meal" && (
        <div style={{ marginBottom: 14 }}>
          <label style={LBL}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} style={SEL}>
            {EVENT_TYPES.map((et) => <option key={et.id} value={et.id}>{et.icon} {et.label}</option>)}
          </select>
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <label style={LBL}>Color</label>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 22, height: 22, borderRadius: "50%", cursor: "pointer", background: c, padding: 0,
              border: color === c ? "2.5px solid #fff" : "2.5px solid transparent", boxSizing: "border-box",
              transition: "transform 0.1s, border-color 0.15s", transform: color === c ? "scale(1.15)" : "scale(1)",
            }} />
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={LBL}>Notes</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSave(); }}
          placeholder="Optional notes..." style={{ ...INP, fontSize: 12 }} />
      </div>
    </>
  );
}
