/* eslint-disable */
import React, { useState, useRef, useCallback, useMemo, useReducer } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const uid = () => Math.random().toString(36).slice(2, 9);

const S = {
  card: { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 18, marginBottom: 14 },
  label: { fontSize: 10, color: "rgba(148,163,184,0.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 },
  input: { width: "100%", background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 12px", color: "#f1f5f9", fontSize: 13, fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box", outline: "none" },
  btn: { background: "#6366f1", border: "none", borderRadius: 10, color: "#fff", padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" },
  row: { display: "flex", gap: 10, alignItems: "flex-end" },
  statBox: { flex: 1, background: "rgba(15,23,42,0.6)", borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.05)" },
  statVal: { fontSize: 18, fontWeight: 800, color: "#f1f5f9", fontFamily: "'DM Sans',sans-serif" },
  statLbl: { fontSize: 10, color: "rgba(148,163,184,0.5)", marginTop: 2 },
};

function bmiColor(bmi) {
  if (!bmi || isNaN(bmi)) return "#94a3b8";
  if (bmi < 18.5) return "#60a5fa";
  if (bmi < 25)   return "#34c98a";
  if (bmi < 30)   return "#fbbf24";
  return "#f87171";
}

function epley(weight, reps) {
  return reps === 1 ? weight : Math.round(weight * (1 + reps / 30));
}

function compressImage(file, maxPx, cb) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      cb(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ─── Weight Tab ─────────────────────────────────────────────────────────────
function WeightTab({ data, upd, addToast }) {
  const [wt, setWt] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const history = useMemo(() => [...(data.weightHistory || [])].sort((a, b) => b.date.localeCompare(a.date)), [data.weightHistory]);
  const last14 = history.slice(0, 14).reverse();
  const heightIn = data.profile?.height || 70;

  const stats = useMemo(() => {
    if (!history.length) return {};
    const current = history[0].weight;
    const avg7 = history.slice(0, 7).reduce((s, e) => s + e.weight, 0) / Math.min(history.length, 7);
    const first = history[history.length - 1].weight;
    const bmi = (current / (heightIn * heightIn)) * 703;
    return { current, avg7: avg7.toFixed(1), change: (current - first).toFixed(1), bmi: bmi.toFixed(1) };
  }, [history, heightIn]);

  function log() {
    const w = parseFloat(wt);
    if (!w || !date) return;
    upd(p => ({ ...p, weightHistory: [{ id: uid(), date, weight: w }, ...(p.weightHistory || [])] }));
    addToast("Weight logged!", "✅");
    setWt("");
  }

  const weights = last14.map(e => e.weight);
  const mn = Math.min(...weights), mx = Math.max(...weights), rng = mx - mn || 1;

  return (
    <div>
      <div style={S.card}>
        <div style={S.row}>
          <div style={{ flex: 1 }}>
            <div style={S.label}>Weight (lbs)</div>
            <input style={S.input} type="number" step="0.1" value={wt} onChange={e => setWt(e.target.value)} placeholder="e.g. 175.5" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.label}>Date</div>
            <input style={S.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <button style={S.btn} onClick={log}>Log</button>
        </div>
      </div>
      {weights.length > 1 && (
        <div style={{ ...S.card, padding: "14px 16px" }}>
          <div style={S.label}>Last {last14.length} Entries</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48 }}>
            {weights.map((w, i) => (
              <div key={i} title={`${last14[i].date}: ${w} lbs`} style={{ flex: 1, borderRadius: "3px 3px 0 0", background: `rgba(99,102,241,${0.35 + ((w - mn) / rng) * 0.65})`, height: `${Math.max(6, Math.round(((w - mn) / rng) * 40) + 8)}px`, minWidth: 0 }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(100,116,139,0.6)", marginTop: 4 }}>
            <span>{last14[0]?.date?.slice(5)}</span>
            <span style={{ color: "#818cf8", fontWeight: 700 }}>{weights[weights.length - 1]} lbs</span>
            <span>{last14[last14.length - 1]?.date?.slice(5)}</span>
          </div>
        </div>
      )}
      {Object.keys(stats).length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={S.statBox}><div style={S.statVal}>{stats.current}</div><div style={S.statLbl}>Current (lbs)</div></div>
          <div style={S.statBox}><div style={S.statVal}>{stats.avg7}</div><div style={S.statLbl}>7-day avg</div></div>
          <div style={S.statBox}><div style={{ ...S.statVal, color: parseFloat(stats.change) < 0 ? "#34c98a" : "#f87171" }}>{stats.change > 0 ? "+" : ""}{stats.change}</div><div style={S.statLbl}>Total change</div></div>
          <div style={S.statBox}><div style={{ ...S.statVal, color: bmiColor(parseFloat(stats.bmi)) }}>{stats.bmi}</div><div style={S.statLbl}>BMI</div></div>
        </div>
      )}
      {!history.length && <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(100,116,139,0.5)", fontSize: 13 }}>No weight entries yet. Log your first entry above.</div>}
    </div>
  );
}

// ─── Body Fat Tab ────────────────────────────────────────────────────────────
function BodyFatTab({ data, upd, addToast }) {
  const [pct, setPct] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [neck, setNeck] = useState(""); const [waist, setWaist] = useState(""); const [ht, setHt] = useState(data.profile?.height?.toString() || "70");
  const history = useMemo(() => [...(data.bodyFatHistory || [])].sort((a, b) => b.date.localeCompare(a.date)), [data.bodyFatHistory]);
  const last10 = history.slice(0, 10).reverse();
  const latestWeight = (data.weightHistory || []).sort((a, b) => b.date.localeCompare(a.date))[0]?.weight;
  const current = history[0]?.pct;

  function log() {
    const p = parseFloat(pct);
    if (!p || !date) return;
    upd(prev => ({ ...prev, bodyFatHistory: [{ id: uid(), date, pct: p }, ...(prev.bodyFatHistory || [])] }));
    addToast("Body fat logged!", "✅");
    setPct("");
  }

  function calcNavy() {
    const n = parseFloat(neck), w = parseFloat(waist), h = parseFloat(ht);
    if (!n || !w || !h) return;
    const result = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
    setPct(result.toFixed(1));
  }

  const pcts = last10.map(e => e.pct);
  const mn = Math.min(...pcts), mx = Math.max(...pcts), rng = mx - mn || 1;

  return (
    <div>
      <div style={S.card}>
        <div style={S.row}>
          <div style={{ flex: 1 }}>
            <div style={S.label}>Body Fat %</div>
            <input style={S.input} type="number" step="0.1" value={pct} onChange={e => setPct(e.target.value)} placeholder="e.g. 18.5" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.label}>Date</div>
            <input style={S.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <button style={S.btn} onClick={log}>Log</button>
        </div>
      </div>
      <div style={S.card}>
        <div style={{ ...S.label, marginBottom: 10 }}>Navy Formula Calculator (Men)</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {[["Neck (in)", neck, setNeck], ["Waist (in)", waist, setWaist], ["Height (in)", ht, setHt]].map(([lbl, val, set]) => (
            <div key={lbl} style={{ flex: 1 }}>
              <div style={{ ...S.label, marginBottom: 4 }}>{lbl}</div>
              <input style={S.input} type="number" step="0.1" value={val} onChange={e => set(e.target.value)} />
            </div>
          ))}
        </div>
        <button style={{ ...S.btn, background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }} onClick={calcNavy}>Calculate →</button>
      </div>
      {current != null && (
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: 42, fontWeight: 900, color: current < 20 ? "#34c98a" : current < 25 ? "#fbbf24" : "#f87171", fontFamily: "'DM Sans',sans-serif" }}>{current}%</div>
          <div style={{ fontSize: 12, color: "rgba(148,163,184,0.5)", marginTop: 4 }}>Current Body Fat</div>
          {latestWeight && (
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 12 }}>
              <div><div style={{ ...S.statVal, fontSize: 15, color: "#f87171" }}>{((current / 100) * latestWeight).toFixed(1)} lbs</div><div style={S.statLbl}>Fat Mass</div></div>
              <div><div style={{ ...S.statVal, fontSize: 15, color: "#34c98a" }}>{((1 - current / 100) * latestWeight).toFixed(1)} lbs</div><div style={S.statLbl}>Lean Mass</div></div>
            </div>
          )}
        </div>
      )}
      {pcts.length > 1 && (
        <div style={{ ...S.card, padding: "14px 16px" }}>
          <div style={S.label}>Trend (last {last10.length})</div>
          <svg viewBox={`0 0 ${pcts.length * 20} 48`} style={{ width: "100%", height: 48, overflow: "visible" }}>
            <polyline points={pcts.map((p, i) => `${i * 20 + 10},${48 - ((p - mn) / rng) * 40}`).join(" ")} fill="none" stroke="#34c98a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {pcts.map((p, i) => <circle key={i} cx={i * 20 + 10} cy={48 - ((p - mn) / rng) * 40} r="3" fill="#34c98a" />)}
          </svg>
        </div>
      )}
      {!history.length && <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(100,116,139,0.5)", fontSize: 13 }}>No body fat entries yet.</div>}
    </div>
  );
}

// ─── 1RM Records Tab ─────────────────────────────────────────────────────────
function OneRMTab({ data }) {
  const records = useMemo(() => {
    const map = {};
    for (const session of (data.workoutHistory || [])) {
      const ts = session.completedAt || 0;
      for (const ex of (session.exercises || [])) {
        const name = ex.name;
        if (!name) continue;
        for (const set of (ex.sets || [])) {
          const w = parseFloat(set.weight), r = parseInt(set.reps, 10);
          if (!w || !r) continue;
          const rm = epley(w, r);
          if (!map[name] || rm > map[name].best) {
            const prev = map[name]?.best;
            map[name] = { name, best: rm, date: ts, prev };
          }
        }
      }
    }
    return Object.values(map).sort((a, b) => b.date - a.date);
  }, [data.workoutHistory]);

  if (!records.length) return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: "rgba(100,116,139,0.5)" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🏋️</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>No workout history yet</div>
      <div style={{ fontSize: 12, marginTop: 6 }}>Complete workouts with weighted sets to track 1RM records.</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {records.map(rec => {
        const isPR = rec.prev && rec.best > rec.prev;
        return (
          <div key={rec.name} style={{ ...S.card, marginBottom: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Sans',sans-serif" }}>
                {rec.name} {isPR && <span title="New PR!">🏆</span>}
              </div>
              <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", marginTop: 2 }}>{rec.date ? new Date(rec.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#818cf8", fontFamily: "'DM Sans',sans-serif" }}>{rec.best}</div>
              <div style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>est. 1RM lbs</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Photos Tab ───────────────────────────────────────────────────────────────
function PhotosTab({ data, upd, addToast }) {
  const [lightbox, setLightbox] = useState(null);
  const [notes, setNotes] = useState("");
  const fileRef = useRef();
  const photos = data.progressPhotos || [];

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, 400, b64 => {
      upd(p => ({ ...p, progressPhotos: [{ id: uid(), date: new Date().toLocaleDateString("en-CA"), b64, notes }, ...(p.progressPhotos || [])] }));
      addToast("Photo added!", "📸");
      setNotes("");
    });
    e.target.value = "";
  }

  function del(id) {
    upd(p => ({ ...p, progressPhotos: (p.progressPhotos || []).filter(ph => ph.id !== id) }));
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      <div style={{ ...S.card, display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div style={S.label}>Notes (optional)</div>
          <input style={S.input} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 12 weeks in" />
        </div>
        <button style={S.btn} onClick={() => fileRef.current?.click()}>+ Add Photo</button>
      </div>
      {!photos.length && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "rgba(100,116,139,0.5)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No progress photos yet</div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
        {photos.map(ph => (
          <div key={ph.id} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }} onClick={() => setLightbox(ph)}>
            <img src={ph.b64} alt={ph.notes || ph.date} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(8,9,13,0.75)", padding: "4px 6px", fontSize: 9, color: "rgba(148,163,184,0.7)" }}>{ph.date}</div>
            <button onClick={e => { e.stopPropagation(); del(ph.id); }} style={{ position: "absolute", top: 4, right: 4, background: "rgba(248,113,113,0.85)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: "100%", borderRadius: 16, overflow: "hidden", background: "#08090d", border: "1px solid rgba(255,255,255,0.08)" }}>
            <img src={lightbox.b64} alt={lightbox.notes || lightbox.date} style={{ width: "100%", display: "block" }} />
            {lightbox.notes && <div style={{ padding: "12px 16px", fontSize: 13, color: "rgba(148,163,184,0.7)" }}>{lightbox.notes}</div>}
            <div style={{ padding: "8px 16px 14px", fontSize: 11, color: "rgba(100,116,139,0.5)" }}>{lightbox.date}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const TABS = [["weight", "Weight"], ["bodyfat", "Body Fat %"], ["onerm", "1RM Records"], ["photos", "Photos"]];

export default function BodyMetrics({ data, upd, addToast }) {
  const [tab, setTab] = useState("weight");
  const prefersReduced = useReducedMotion();

  const variants = prefersReduced
    ? { enter: {}, center: {}, exit: {} }
    : { enter: { opacity: 0, x: 16 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 } };

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {TABS.map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "7px 16px", borderRadius: 20, border: "none", background: tab === id ? "#6366f1" : "rgba(15,23,42,0.6)", color: tab === id ? "#fff" : "rgba(148,163,184,0.6)", cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 700 : 400, fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" }}>
            {lbl}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.18, ease: "easeOut" }}>
          {tab === "weight"   && <WeightTab  data={data} upd={upd} addToast={addToast} />}
          {tab === "bodyfat"  && <BodyFatTab data={data} upd={upd} addToast={addToast} />}
          {tab === "onerm"    && <OneRMTab   data={data} />}
          {tab === "photos"   && <PhotosTab  data={data} upd={upd} addToast={addToast} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
