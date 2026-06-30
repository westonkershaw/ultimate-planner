/* eslint-disable */
/**
 * GoalsTabV2 — beta replacement for the legacy goals tab.
 *
 * Behind the up_goals_v2 localStorage flag. Reads the unified d.goals array
 * built by migrateGoals on data load. Outcome + numeric kinds only in v1;
 * habit kind deferred.
 */

import React, { useState, useMemo } from "react";
import { progressFor, paceFor } from "../utils/goalEngine";

const CATS = [
  { id: "intellectual", label: "Intellectual", icon: "📚", color: "#4f9cf9" },
  { id: "physical",     label: "Physical",     icon: "💪", color: "#34c98a" },
  { id: "financial",    label: "Financial",    icon: "💰", color: "#fbbf24" },
  { id: "spiritual",    label: "Spiritual",    icon: "🕊️", color: "#c084fc" },
  { id: "social",       label: "Social",       icon: "💬", color: "#f87171" },
];
const catBy = (id) => CATS.find((c) => c.id === id) || CATS[0];

function uid(prefix = "g") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function mondayISO(now = Date.now()) {
  const d = new Date(now);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const STYLES = {
  page: { padding: "20px 4px 80px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  h1: { fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "'Syne',serif" },
  sub: { fontSize: 12, color: "rgba(148,163,184,0.75)", marginTop: 4 },
  betaBadge: { display: "inline-block", marginLeft: 8, padding: "2px 8px", borderRadius: 999, background: "rgba(45, 212, 191,0.15)", border: "1px solid rgba(45, 212, 191,0.4)", color: "#a5b4fc", fontSize: 10, fontWeight: 700, verticalAlign: "middle" },
  primaryBtn: { background: "linear-gradient(135deg,#14b8a6,#8b5cf6)", border: "none", borderRadius: 10, color: "#fff", padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  card: { background: "rgba(15,23,42,0.6)", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 14, padding: 16, marginBottom: 12 },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modal: { background: "#0f172a", border: "1px solid rgba(45, 212, 191,0.3)", borderRadius: 16, padding: 24, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "rgba(148,163,184,0.8)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" },
  input: { width: "100%", background: "rgba(8,9,13,0.8)", border: "1px solid rgba(51,65,85,0.6)", borderRadius: 8, color: "#f1f5f9", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif" },
  pill: (active, color) => ({ padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", border: `1px solid ${active ? color : "rgba(255,255,255,0.1)"}`, background: active ? `${color}22` : "transparent", color: active ? color : "rgba(148,163,184,0.75)" }),
  ghostBtn: { background: "transparent", border: "1px solid rgba(45, 212, 191,0.4)", borderRadius: 8, color: "#a5b4fc", padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  dangerBtn: { background: "transparent", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 8, color: "#f87171", padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" },
};

function PaceBadge({ pace }) {
  const map = {
    "ahead":    { color: "#34c98a", bg: "rgba(52,201,138,0.12)", label: "Ahead of pace" },
    "on-track": { color: "#a5b4fc", bg: "rgba(45, 212, 191,0.12)", label: "On track" },
    "behind":   { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "Behind pace" },
    "unknown":  { color: "rgba(148,163,184,0.7)", bg: "rgba(71,85,105,0.18)", label: "No deadline" },
  };
  const s = map[pace.status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, letterSpacing: "0.3px" }}>
      {s.label}
    </span>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 6, background: "rgba(51,65,85,0.5)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 999, transition: "width 0.3s" }} />
    </div>
  );
}

function GoalCard({ goal, onUpdate, onDelete, addToast }) {
  const [expanded, setExpanded] = useState(false);
  const [newMs, setNewMs] = useState("");
  const [newEntry, setNewEntry] = useState({ delta: "", note: "" });
  const cat = catBy(goal.category);
  const progress = progressFor(goal);
  const pace = paceFor(goal);

  const addMilestone = () => {
    if (!newMs.trim()) return;
    onUpdate({ ...goal, milestones: [...goal.milestones, { id: uid("m"), title: newMs.trim(), weight: 1, done: false }] });
    setNewMs("");
  };
  const toggleMilestone = (mid) => {
    onUpdate({
      ...goal,
      milestones: goal.milestones.map((m) =>
        m.id === mid ? { ...m, done: !m.done, doneAt: !m.done ? Date.now() : undefined } : m,
      ),
    });
  };
  const removeMilestone = (mid) => {
    onUpdate({ ...goal, milestones: goal.milestones.filter((m) => m.id !== mid) });
  };
  const addEntry = () => {
    const n = parseFloat(newEntry.delta);
    if (!Number.isFinite(n) || n === 0) return;
    const next = {
      ...goal,
      numeric: {
        ...goal.numeric,
        current: goal.numeric.current + n,
        entries: [...goal.numeric.entries, { id: uid("e"), date: new Date().toISOString().slice(0, 10), delta: n, note: newEntry.note || undefined }],
      },
    };
    onUpdate(next);
    setNewEntry({ delta: "", note: "" });
    addToast?.(`+${n} ${goal.numeric.unit} logged`, "✅");
  };

  const setWeeklyAction = (text) => {
    const week = mondayISO();
    const existing = goal.weeklyFocus.find((w) => w.weekOf === week);
    const next = existing
      ? goal.weeklyFocus.map((w) => (w.weekOf === week ? { ...w, action: text } : w))
      : [...goal.weeklyFocus, { weekOf: week, action: text, done: false }];
    onUpdate({ ...goal, weeklyFocus: next });
  };
  const currentWeek = goal.weeklyFocus.find((w) => w.weekOf === mondayISO());

  return (
    <div style={STYLES.card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16 }}>{cat.icon}</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{goal.title}</h3>
            <PaceBadge pace={pace} />
          </div>
          {goal.description && <p style={{ margin: "0 0 10px", fontSize: 12, color: "rgba(148,163,184,0.7)", lineHeight: 1.5 }}>{goal.description}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <ProgressBar pct={progress} color={cat.color} />
            <span style={{ fontSize: 12, fontWeight: 700, color: cat.color, minWidth: 38, textAlign: "right" }}>{Math.round(progress)}%</span>
          </div>
          {goal.kind === "numeric" && (
            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)" }}>
              {goal.numeric.unit}{goal.numeric.current.toLocaleString()} of {goal.numeric.unit}{goal.numeric.target.toLocaleString()}
            </div>
          )}
          {goal.deadline && <div style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", marginTop: 4 }}>Due {goal.deadline}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={() => setExpanded(!expanded)} style={STYLES.ghostBtn}>{expanded ? "Close" : "Open"}</button>
          <button onClick={() => { if (confirm(`Delete "${goal.title}"?`)) onDelete(goal.id); }} style={STYLES.dangerBtn}>Delete</button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(51,65,85,0.4)" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={STYLES.label}>This week&rsquo;s focus</div>
            <input
              style={STYLES.input}
              placeholder="What will you do this week?"
              value={currentWeek?.action || ""}
              onChange={(e) => setWeeklyAction(e.target.value)}
            />
          </div>

          {goal.kind === "outcome" && (
            <div>
              <div style={STYLES.label}>Milestones</div>
              {goal.milestones.length === 0 && <p style={{ fontSize: 12, color: "rgba(148,163,184,0.5)", margin: "0 0 10px" }}>No milestones yet — add one below.</p>}
              {goal.milestones.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <input type="checkbox" checked={m.done} onChange={() => toggleMilestone(m.id)} style={{ accentColor: cat.color }} />
                  <span style={{ flex: 1, fontSize: 13, color: m.done ? "rgba(148,163,184,0.5)" : "#e2e8f0", textDecoration: m.done ? "line-through" : "none" }}>{m.title}</span>
                  <button onClick={() => removeMilestone(m.id)} style={{ ...STYLES.dangerBtn, padding: "3px 8px", fontSize: 10 }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input style={STYLES.input} placeholder="Add a milestone…" value={newMs} onChange={(e) => setNewMs(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMilestone()} />
                <button onClick={addMilestone} style={STYLES.ghostBtn}>Add</button>
              </div>
            </div>
          )}

          {goal.kind === "numeric" && (
            <div>
              <div style={STYLES.label}>Recent entries</div>
              {goal.numeric.entries.length === 0 && <p style={{ fontSize: 12, color: "rgba(148,163,184,0.5)", margin: "0 0 10px" }}>No entries yet.</p>}
              <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 10 }}>
                {goal.numeric.entries.slice(-8).reverse().map((e) => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, borderBottom: "1px solid rgba(51,65,85,0.25)" }}>
                    <span style={{ color: "rgba(148,163,184,0.7)" }}>{e.date}</span>
                    <span style={{ color: e.delta >= 0 ? "#34c98a" : "#f87171", fontWeight: 600 }}>
                      {e.delta >= 0 ? "+" : ""}{goal.numeric.unit}{e.delta.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...STYLES.input, flex: 1 }} type="number" placeholder={`Δ in ${goal.numeric.unit}`} value={newEntry.delta} onChange={(e) => setNewEntry((p) => ({ ...p, delta: e.target.value }))} />
                <input style={{ ...STYLES.input, flex: 1 }} placeholder="Note (optional)" value={newEntry.note} onChange={(e) => setNewEntry((p) => ({ ...p, note: e.target.value }))} />
                <button onClick={addEntry} style={STYLES.ghostBtn}>Log</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewGoalModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    kind: "outcome",
    title: "",
    description: "",
    category: "intellectual",
    deadline: "",
    numericUnit: "$",
    numericStart: "0",
    numericTarget: "1000",
  });
  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const submit = () => {
    if (!form.title.trim()) return;
    const base = {
      id: uid("g"),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      deadline: form.deadline || undefined,
      createdAt: new Date().toISOString(),
      milestones: [],
      weeklyFocus: [],
    };
    if (form.kind === "outcome") {
      onCreate({ ...base, kind: "outcome" });
    } else {
      const start = parseFloat(form.numericStart) || 0;
      const target = parseFloat(form.numericTarget) || 0;
      onCreate({
        ...base,
        kind: "numeric",
        numeric: { unit: form.numericUnit || "", start, current: start, target, entries: [] },
      });
    }
    onClose();
  };

  return (
    <div style={STYLES.modalBackdrop} onClick={onClose}>
      <div style={STYLES.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Syne',serif" }}>New Life Goal</h3>

        <div style={{ marginBottom: 14 }}>
          <div style={STYLES.label}>Type</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { id: "outcome", label: "Outcome", desc: "Milestones drive progress" },
              { id: "numeric", label: "Numeric", desc: "Save $, lose lbs, etc." },
            ].map((o) => (
              <button key={o.id} onClick={() => upd("kind", o.id)} style={{
                flex: 1, padding: "10px 12px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                background: form.kind === o.id ? "rgba(45, 212, 191,0.15)" : "rgba(8,9,13,0.4)",
                border: `1px solid ${form.kind === o.id ? "#14b8a6" : "rgba(51,65,85,0.5)"}`,
                color: form.kind === o.id ? "#a5b4fc" : "rgba(148,163,184,0.85)",
              }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{o.label}</div>
                <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>{o.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={STYLES.label}>Title</div>
          <input style={STYLES.input} value={form.title} onChange={(e) => upd("title", e.target.value)} placeholder="e.g. Run a half marathon" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={STYLES.label}>Category</div>
            <select style={STYLES.input} value={form.category} onChange={(e) => upd("category", e.target.value)}>
              {CATS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div>
            <div style={STYLES.label}>Deadline</div>
            <input style={STYLES.input} type="date" value={form.deadline} onChange={(e) => upd("deadline", e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={STYLES.label}>Description (optional)</div>
          <input style={STYLES.input} value={form.description} onChange={(e) => upd("description", e.target.value)} placeholder="Why does this matter?" />
        </div>

        {form.kind === "numeric" && (
          <div style={{ display: "grid", gridTemplateColumns: "0.7fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={STYLES.label}>Unit</div>
              <input style={STYLES.input} value={form.numericUnit} onChange={(e) => upd("numericUnit", e.target.value)} placeholder="$" />
            </div>
            <div>
              <div style={STYLES.label}>Start</div>
              <input style={STYLES.input} type="number" value={form.numericStart} onChange={(e) => upd("numericStart", e.target.value)} />
            </div>
            <div>
              <div style={STYLES.label}>Target</div>
              <input style={STYLES.input} type="number" value={form.numericTarget} onChange={(e) => upd("numericTarget", e.target.value)} />
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ ...STYLES.ghostBtn, flex: 1, padding: "10px 0" }}>Cancel</button>
          <button onClick={submit} style={{ ...STYLES.primaryBtn, flex: 1 }}>Create Goal</button>
        </div>
      </div>
    </div>
  );
}

export default function GoalsTabV2({ data, upd, addToast }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("progress-asc");
  const [showNew, setShowNew] = useState(false);

  const goals = data?.goals || [];
  const visible = useMemo(() => {
    const filtered = filter === "all" ? goals : goals.filter((g) => g.category === filter);
    const sorted = [...filtered];
    if (sort === "progress-asc") sorted.sort((a, b) => progressFor(a) - progressFor(b));
    else if (sort === "progress-desc") sorted.sort((a, b) => progressFor(b) - progressFor(a));
    else if (sort === "az") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return sorted;
  }, [goals, filter, sort]);

  const done = goals.filter((g) => progressFor(g) >= 100).length;

  const updateGoal = (next) => {
    upd((p) => ({ ...p, goals: (p.goals || []).map((g) => (g.id === next.id ? next : g)) }));
  };
  const deleteGoal = (gid) => {
    upd((p) => ({ ...p, goals: (p.goals || []).filter((g) => g.id !== gid) }));
    addToast?.("Goal deleted", "🗑️");
  };
  const createGoal = (g) => {
    upd((p) => ({ ...p, goals: [g, ...(p.goals || [])] }));
    addToast?.("Goal created", "🎯");
  };

  return (
    <div style={STYLES.page}>
      <div style={STYLES.header}>
        <div>
          <h2 style={STYLES.h1}>
            Life Goals
            <span style={STYLES.betaBadge}>v2 beta</span>
          </h2>
          <p style={STYLES.sub}>{done} of {goals.length} complete · progress derived from milestones &amp; entries</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
            <button onClick={() => setFilter("all")} style={STYLES.pill(filter === "all", "rgba(255,255,255,0.4)")}>All</button>
            {CATS.map((c) => (
              <button key={c.id} onClick={() => setFilter(c.id)} style={STYLES.pill(filter === c.id, c.color)}>{c.icon} {c.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 600 }}>Sort:</span>
            {[["progress-asc", "Needs Work"], ["progress-desc", "Most Progress"], ["az", "A–Z"], ["added", "Recently Added"]].map(([v, lbl]) => (
              <button key={v} onClick={() => setSort(v)} style={STYLES.pill(sort === v, "#4f9cf9")}>{lbl}</button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowNew(true)} style={STYLES.primaryBtn}>+ New Goal</button>
      </div>

      {visible.length === 0 ? (
        <div style={{ ...STYLES.card, textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>
            {goals.length === 0 ? "No goals yet" : "No goals match this filter"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(148,163,184,0.7)" }}>
            {goals.length === 0 ? "Create your first to start tracking real progress." : "Try a different category or clear the filter."}
          </div>
        </div>
      ) : (
        visible.map((g) => (
          <GoalCard key={g.id} goal={g} onUpdate={updateGoal} onDelete={deleteGoal} addToast={addToast} />
        ))
      )}

      {showNew && <NewGoalModal onClose={() => setShowNew(false)} onCreate={createGoal} />}
    </div>
  );
}
