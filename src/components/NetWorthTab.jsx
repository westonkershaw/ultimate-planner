/* eslint-disable */
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  calcNetWorthMilestones,
  calcFIScore,
  calcYearsToFI,
  calcSmoothSVGPath,
  calcNetWorthSVGPoints,
} from "../utils/math";

// ─── Utilities ───────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const fmt$ = (n) =>
  n >= 0
    ? "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })
    : "-$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtAbbrev = (n) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "$" + (abs / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return sign + "$" + (abs / 1_000).toFixed(0) + "k";
  return sign + "$" + abs.toLocaleString();
};

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function monthLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function fmtDateLong(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSET_CATEGORIES = [
  { id: "real_estate", label: "Real Estate", icon: "🏠", color: "#14b8a6" },
  { id: "investments", label: "Investments", icon: "📈", color: "#10b981" },
  { id: "cash", label: "Cash", icon: "💵", color: "#22c55e" },
  { id: "retirement", label: "Retirement", icon: "🏦", color: "#f59e0b" },
  { id: "vehicle", label: "Vehicle", icon: "🚗", color: "#3b82f6" },
  { id: "other", label: "Other", icon: "📦", color: "#64748b" },
];

const LIABILITY_CATEGORIES = [
  { id: "mortgage", label: "Mortgage", icon: "🏠", color: "#ef4444" },
  { id: "student_loan", label: "Student Loan", icon: "🎓", color: "#f97316" },
  { id: "car_loan", label: "Car Loan", icon: "🚗", color: "#f59e0b" },
  { id: "credit_card", label: "Credit Card", icon: "💳", color: "#ec4899" },
  { id: "personal_loan", label: "Personal Loan", icon: "🤝", color: "#8b5cf6" },
  { id: "other", label: "Other", icon: "📦", color: "#64748b" },
];

function assetCat(id) {
  return ASSET_CATEGORIES.find((c) => c.id === id) || ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1];
}
function liabCat(id) {
  return LIABILITY_CATEGORIES.find((c) => c.id === id) || LIABILITY_CATEGORIES[LIABILITY_CATEGORIES.length - 1];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "20px 16px 40px",
    color: "#f1f5f9",
    fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    background: "rgba(17,24,39,0.7)",
    border: "1px solid rgba(51,65,85,0.5)",
    borderRadius: 16,
    padding: "18px 20px",
    marginBottom: 16,
  },
  heroCard: {
    background: "linear-gradient(135deg,rgba(17,24,39,0.95) 0%,rgba(15,23,42,0.98) 100%)",
    border: "1px solid rgba(45, 212, 191,0.25)",
    borderRadius: 20,
    padding: "28px 28px 24px",
    marginBottom: 16,
    textAlign: "center",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "rgba(255,255,255,0.85)",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  input: {
    background: "rgba(15,23,42,0.9)",
    border: "1px solid rgba(51,65,85,0.7)",
    borderRadius: 9,
    padding: "8px 11px",
    color: "#f1f5f9",
    fontSize: 13,
    fontFamily: "'DM Sans',sans-serif",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    background: "rgba(15,23,42,0.9)",
    border: "1px solid rgba(51,65,85,0.7)",
    borderRadius: 9,
    padding: "8px 11px",
    color: "#f1f5f9",
    fontSize: 13,
    fontFamily: "'DM Sans',sans-serif",
    outline: "none",
    cursor: "pointer",
  },
  addRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    padding: "12px 14px",
    background: "rgba(45, 212, 191,0.06)",
    border: "1px dashed rgba(45, 212, 191,0.25)",
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  addBtn: {
    background: "#14b8a6",
    border: "none",
    borderRadius: 9,
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    padding: "8px 16px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "'DM Sans',sans-serif",
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    background: "rgba(15,23,42,0.4)",
    borderRadius: 8,
    marginBottom: 6,
    transition: "background 0.15s",
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    flexShrink: 0,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: "#e2e8f0",
    fontWeight: 500,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    padding: "2px 5px",
    borderRadius: 5,
    color: "rgba(148,163,184,0.5)",
    transition: "color 0.15s",
    lineHeight: 1,
  },
  subLabel: {
    fontSize: 11,
    color: "rgba(148,163,184,0.55)",
    marginTop: 2,
  },
  totalBadge: {
    fontSize: 13,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 20,
  },
};

// ─── Edit-in-place value cell ─────────────────────────────────────────────────

function EditableValue({ value, onSave, color }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function start() {
    setDraft(String(value));
    setEditing(true);
  }
  function commit() {
    const n = parseFloat(draft.replace(/[^0-9.\-]/g, ""));
    if (!isNaN(n)) onSave(n);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        style={{ ...S.input, width: 100, textAlign: "right", fontSize: 13, fontWeight: 700 }}
      />
    );
  }
  return (
    <span
      onClick={start}
      title="Click to edit"
      style={{ ...S.itemValue, color, cursor: "pointer", borderBottom: "1px dashed rgba(148,163,184,0.3)" }}
    >
      {fmt$(value)}
    </span>
  );
}

// ─── Assets Section ───────────────────────────────────────────────────────────

function AssetsSection({ assets, onChange }) {
  const [form, setForm] = useState({ name: "", value: "", category: "cash", notes: "" });
  const [err, setErr] = useState("");
  const [expandedCats, setExpandedCats] = useState({});
  const [hovered, setHovered] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const total = useMemo(() => assets.reduce((s, a) => s + (Number(a.value) || 0), 0), [assets]);

  function add() {
    if (!form.name.trim()) { setErr("Name required"); return; }
    const val = parseFloat(form.value);
    if (isNaN(val) || val < 0) { setErr("Enter a valid value"); return; }
    const updated = [...assets, { id: uid(), name: form.name.trim(), value: val, category: form.category, notes: form.notes.trim() }];
    onChange(updated);
    setForm({ name: "", value: "", category: "cash", notes: "" });
    setErr("");
  }

  function remove(id) {
    onChange(assets.filter((a) => a.id !== id));
    setConfirmDelete(null);
  }

  function updateValue(id, newVal) {
    onChange(assets.map((a) => a.id === id ? { ...a, value: newVal } : a));
  }

  const byCat = useMemo(() => {
    const map = {};
    assets.forEach((a) => {
      if (!map[a.category]) map[a.category] = [];
      map[a.category].push(a);
    });
    return map;
  }, [assets]);

  const catTotals = useMemo(() => {
    const out = {};
    Object.entries(byCat).forEach(([cat, items]) => {
      out[cat] = items.reduce((s, i) => s + (Number(i.value) || 0), 0);
    });
    return out;
  }, [byCat]);

  const usedCats = ASSET_CATEGORIES.filter((c) => byCat[c.id]);

  return (
    <div style={S.card}>
      <div style={S.sectionHeader}>
        <div style={S.sectionTitle}>
          <span>💰 Assets</span>
        </div>
        <span style={{ ...S.totalBadge, background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
          {fmt$(total)}
        </span>
      </div>

      <div style={S.addRow}>
        <input
          placeholder="Asset name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && add()}
          style={{ ...S.input, flex: "2 1 140px", minWidth: 100 }}
        />
        <input
          placeholder="Value ($)"
          value={form.value}
          type="number"
          min="0"
          onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && add()}
          style={{ ...S.input, flex: "1 1 90px", minWidth: 80 }}
        />
        <select
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          style={{ ...S.select, flex: "1 1 120px", minWidth: 110 }}
        >
          {ASSET_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
          ))}
        </select>
        <button onClick={add} style={S.addBtn}>+ Add</button>
      </div>
      {err && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8, marginLeft: 2 }}>{err}</div>}

      {usedCats.length === 0 && (
        <div style={{ textAlign: "center", padding: "28px 16px", color: "rgba(148,163,184,0.45)", fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💰</div>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "rgba(148,163,184,0.65)" }}>Add your first asset to get started</div>
          <div style={{ fontSize: 12 }}>Enter real estate, investments, cash, retirement accounts, and more above.</div>
        </div>
      )}

      {usedCats.map((cat) => {
        const items = byCat[cat.id];
        const catTotal = catTotals[cat.id];
        const isExpanded = expandedCats[cat.id] !== false;

        return (
          <div key={cat.id} style={{ marginBottom: 8 }}>
            <button
              onClick={() => setExpandedCats((p) => ({ ...p, [cat.id]: !isExpanded }))}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                background: "none", border: "none", cursor: "pointer", padding: "4px 0 6px",
                color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.7px",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              <span>{cat.icon}</span>
              <span style={{ flex: 1, textAlign: "left" }}>{cat.label}</span>
              <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>{fmt$(catTotal)}</span>
              <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(148,163,184,0.4)" }}>{isExpanded ? "▲" : "▼"}</span>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="items"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: "hidden" }}
                >
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHovered(item.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        ...S.itemRow,
                        background: hovered === item.id
                          ? "rgba(34,197,94,0.07)"
                          : "rgba(15,23,42,0.4)",
                      }}
                    >
                      <div style={{ ...S.iconCircle, background: cat.color + "22" }}>
                        {cat.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.itemName}>{item.name}</div>
                        {item.notes && <div style={S.subLabel}>{item.notes}</div>}
                      </div>
                      <EditableValue
                        value={item.value}
                        onSave={(v) => updateValue(item.id, v)}
                        color="#22c55e"
                      />
                      {confirmDelete === item.id ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 11, color: "rgba(148,163,184,0.7)" }}>Remove?</span>
                          <button
                            onClick={() => remove(item.id)}
                            style={{ ...S.iconBtn, color: "#ef4444", fontSize: 12, fontWeight: 700 }}
                          >Yes</button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            style={{ ...S.iconBtn, color: "rgba(148,163,184,0.6)", fontSize: 12 }}
                          >No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(item.id)}
                          style={S.iconBtn}
                          title="Delete"
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(148,163,184,0.5)")}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─── Liabilities Section ──────────────────────────────────────────────────────

function LiabilitiesSection({ liabilities, onChange }) {
  const [form, setForm] = useState({ name: "", balance: "", interestRate: "", category: "credit_card", notes: "" });
  const [err, setErr] = useState("");
  const [hovered, setHovered] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const total = useMemo(() => liabilities.reduce((s, l) => s + (Number(l.balance) || 0), 0), [liabilities]);

  function add() {
    if (!form.name.trim()) { setErr("Name required"); return; }
    const bal = parseFloat(form.balance);
    if (isNaN(bal) || bal < 0) { setErr("Enter a valid balance"); return; }
    const rate = parseFloat(form.interestRate) || 0;
    const updated = [
      ...liabilities,
      { id: uid(), name: form.name.trim(), balance: bal, interestRate: rate, category: form.category, notes: form.notes.trim() },
    ];
    onChange(updated);
    setForm({ name: "", balance: "", interestRate: "", category: "credit_card", notes: "" });
    setErr("");
  }

  function remove(id) {
    onChange(liabilities.filter((l) => l.id !== id));
    setConfirmDelete(null);
  }

  function updateBalance(id, newBal) {
    onChange(liabilities.map((l) => l.id === id ? { ...l, balance: newBal } : l));
  }

  return (
    <div style={S.card}>
      <div style={S.sectionHeader}>
        <div style={S.sectionTitle}>
          <span>💳 Liabilities</span>
        </div>
        <span style={{ ...S.totalBadge, background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
          {fmt$(total)}
        </span>
      </div>

      <div style={S.addRow}>
        <input
          placeholder="Liability name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && add()}
          style={{ ...S.input, flex: "2 1 140px", minWidth: 100 }}
        />
        <input
          placeholder="Balance ($)"
          value={form.balance}
          type="number"
          min="0"
          onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && add()}
          style={{ ...S.input, flex: "1 1 90px", minWidth: 80 }}
        />
        <input
          placeholder="Rate (%)"
          value={form.interestRate}
          type="number"
          min="0"
          max="100"
          step="0.1"
          onChange={(e) => setForm((f) => ({ ...f, interestRate: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && add()}
          style={{ ...S.input, flex: "0 1 70px", minWidth: 60 }}
        />
        <select
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          style={{ ...S.select, flex: "1 1 130px", minWidth: 110 }}
        >
          {LIABILITY_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
          ))}
        </select>
        <button onClick={add} style={{ ...S.addBtn, background: "#ef4444" }}>+ Add</button>
      </div>
      {err && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8, marginLeft: 2 }}>{err}</div>}

      {liabilities.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(148,163,184,0.45)", fontSize: 13 }}>
          No liabilities — great work! Add any debts above.
        </div>
      )}

      {liabilities.map((item) => {
        const cat = liabCat(item.category);
        const monthlyInterest = ((item.balance * (item.interestRate || 0)) / 100) / 12;

        return (
          <div
            key={item.id}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...S.itemRow,
              background: hovered === item.id
                ? "rgba(239,68,68,0.07)"
                : "rgba(15,23,42,0.4)",
            }}
          >
            <div style={{ ...S.iconCircle, background: cat.color + "22" }}>
              {cat.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.itemName}>{item.name}</div>
              <div style={S.subLabel}>
                {item.interestRate > 0
                  ? item.interestRate + "% APR · ~" + fmt$(Math.round(monthlyInterest)) + "/mo interest"
                  : cat.label}
                {item.notes ? " · " + item.notes : ""}
              </div>
            </div>
            <EditableValue
              value={item.balance}
              onSave={(v) => updateBalance(item.id, v)}
              color="#ef4444"
            />
            {confirmDelete === item.id ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: "rgba(148,163,184,0.7)" }}>Remove?</span>
                <button
                  onClick={() => remove(item.id)}
                  style={{ ...S.iconBtn, color: "#ef4444", fontSize: 12, fontWeight: 700 }}
                >Yes</button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{ ...S.iconBtn, color: "rgba(148,163,184,0.6)", fontSize: 12 }}
                >No</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(item.id)}
                style={S.iconBtn}
                title="Delete"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(148,163,184,0.5)")}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Asset Allocation ─────────────────────────────────────────────────────────

function AllocationBreakdown({ assets }) {
  const total = useMemo(() => assets.reduce((s, a) => s + (Number(a.value) || 0), 0), [assets]);

  const breakdown = useMemo(() => {
    const map = {};
    assets.forEach((a) => {
      map[a.category] = (map[a.category] || 0) + (Number(a.value) || 0);
    });
    return ASSET_CATEGORIES
      .filter((c) => map[c.id])
      .map((c) => ({ ...c, amount: map[c.id], pct: total > 0 ? (map[c.id] / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [assets, total]);

  if (breakdown.length === 0) return null;

  return (
    <div style={S.card}>
      <div style={S.sectionHeader}>
        <div style={S.sectionTitle}>🎯 Asset Allocation</div>
      </div>

      <div style={{
        display: "flex", height: 14, borderRadius: 7, overflow: "hidden",
        marginBottom: 16, background: "rgba(15,23,42,0.5)",
      }}>
        {breakdown.map((cat) => (
          <div
            key={cat.id}
            title={cat.label + ": " + cat.pct.toFixed(1) + "%"}
            style={{
              width: cat.pct + "%",
              background: cat.color,
              transition: "width 0.4s ease",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {breakdown.map((cat) => (
          <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", flex: 1 }}>
              {cat.icon} {cat.label}
            </span>
            <span style={{ fontSize: 12, color: "rgba(148,163,184,0.6)" }}>
              {cat.pct.toFixed(1)}%
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", minWidth: 80, textAlign: "right" }}>
              {fmt$(cat.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SVG Net Worth Trend Chart ────────────────────────────────────────────────

const NW_MILESTONES_LEVELS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

function NetWorthSVGChart({ snapshots }) {
  const W = 560;
  const H = 180;
  const pathRef = useRef(null);
  const [pathLen, setPathLen] = useState(0);
  const [animated, setAnimated] = useState(false);

  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => a.date.localeCompare(b.date)),
    [snapshots]
  );

  const points = useMemo(
    () => calcNetWorthSVGPoints(sorted, W, H, 18),
    [sorted]
  );

  const pathD = useMemo(() => calcSmoothSVGPath(points), [points]);

  // Gradient fill path (close to bottom)
  const fillD = useMemo(() => {
    if (points.length < 2) return "";
    const last = points[points.length - 1];
    const first = points[0];
    return pathD + " L " + last[0] + " " + H + " L " + first[0] + " " + H + " Z";
  }, [pathD, points, H]);

  // Trend vs last snapshot
  const trend = useMemo(() => {
    if (sorted.length < 2) return null;
    const diff = sorted[sorted.length - 1].netWorth - sorted[sorted.length - 2].netWorth;
    const prevLabel = monthLabel(sorted[sorted.length - 2].date);
    return { diff, prevLabel };
  }, [sorted]);

  // Milestone diamond markers
  const milestoneMarkers = useMemo(() => {
    const markers = [];
    for (const level of NW_MILESTONES_LEVELS) {
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i - 1].netWorth < level && sorted[i].netWorth >= level) {
          markers.push({ level, point: points[i] });
          break;
        }
      }
    }
    return markers;
  }, [sorted, points]);

  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength();
      setPathLen(len);
      setAnimated(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
    }
  }, [pathD]);

  if (sorted.length < 2) {
    return (
      <div style={S.card}>
        <div style={S.sectionHeader}>
          <div style={S.sectionTitle}>📈 Net Worth Trend</div>
        </div>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "32px 20px", color: "rgba(148,163,184,0.45)", fontSize: 13, textAlign: "center",
          background: "rgba(15,23,42,0.3)", borderRadius: 10,
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📈</div>
          <div>Log your assets to start tracking your trend</div>
          <div style={{ fontSize: 11, marginTop: 6, color: "rgba(148,163,184,0.3)" }}>
            A snapshot is saved automatically each time you make changes
          </div>
        </div>
      </div>
    );
  }

  const trendColor = trend && trend.diff >= 0 ? "#10b981" : "#ef4444";
  const trendArrow = trend && trend.diff >= 0 ? "↑" : "↓";

  return (
    <div style={S.card}>
      <div style={S.sectionHeader}>
        <div style={S.sectionTitle}>📈 Net Worth Trend</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {trend && (
            <span style={{ fontSize: 13, fontWeight: 700, color: trendColor }}>
              {trendArrow} {fmt$(Math.abs(trend.diff))} since {trend.prevLabel}
            </span>
          )}
          <span style={{ fontSize: 11, color: "rgba(148,163,184,0.45)" }}>{sorted.length} snapshots</span>
        </div>
      </div>

      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={"0 0 " + W + " " + H}
          style={{ width: "100%", minWidth: 240, height: "auto", display: "block" }}
          role="img"
          aria-label="Net worth trend chart"
        >
          <defs>
            <linearGradient id="nwLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
            <linearGradient id="nwFillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.01" />
            </linearGradient>
            <clipPath id="nwClip">
              <rect x="0" y="0" width={W} height={H} />
            </clipPath>
          </defs>

          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75].map((frac) => (
            <line
              key={frac}
              x1={0}
              y1={18 + (H - 36) * frac}
              x2={W}
              y2={18 + (H - 36) * frac}
              stroke="rgba(51,65,85,0.3)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ))}

          {/* Fill area */}
          {fillD && (
            <path d={fillD} fill="url(#nwFillGrad)" clipPath="url(#nwClip)" />
          )}

          {/* Animated stroke line */}
          {pathD && (
            <path
              ref={pathRef}
              d={pathD}
              fill="none"
              stroke="url(#nwLineGrad)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath="url(#nwClip)"
              style={{
                strokeDasharray: pathLen || undefined,
                strokeDashoffset: animated ? 0 : (pathLen || undefined),
                transition: animated ? "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" : "none",
              }}
            />
          )}

          {/* Milestone diamonds */}
          {milestoneMarkers.map(({ level, point }) => {
            if (!point) return null;
            const [mx, my] = point;
            const sz = 5;
            const diamondPath = "M " + mx + " " + (my - sz) + " L " + (mx + sz) + " " + my + " L " + mx + " " + (my + sz) + " L " + (mx - sz) + " " + my + " Z";
            return (
              <g key={level}>
                <path d={diamondPath} fill="#f59e0b" stroke="#0f172a" strokeWidth={1.5} />
                <title>{fmtAbbrev(level)}</title>
              </g>
            );
          })}

          {/* Data point dots at ends */}
          {points.length > 0 && (
            <>
              <circle
                cx={points[0][0]}
                cy={points[0][1]}
                r={3}
                fill="#14b8a6"
                stroke="#0f172a"
                strokeWidth={2}
              />
              <circle
                cx={points[points.length - 1][0]}
                cy={points[points.length - 1][1]}
                r={4}
                fill="#10b981"
                stroke="#0f172a"
                strokeWidth={2}
              />
            </>
          )}

          {/* X-axis month labels — show first and last */}
          {sorted.length >= 2 && (
            <>
              <text
                x={points[0][0] + 2}
                y={H - 3}
                fontSize={9}
                fill="rgba(148,163,184,0.45)"
                textAnchor="start"
              >
                {monthLabel(sorted[0].date)}
              </text>
              <text
                x={points[points.length - 1][0] - 2}
                y={H - 3}
                fontSize={9}
                fill="rgba(148,163,184,0.45)"
                textAnchor="end"
              >
                {monthLabel(sorted[sorted.length - 1].date)}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Diamond legend */}
      {milestoneMarkers.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <svg width={10} height={10} style={{ flexShrink: 0 }}>
            <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="#f59e0b" />
          </svg>
          <span style={{ fontSize: 11, color: "rgba(148,163,184,0.5)" }}>
            Milestone markers: {milestoneMarkers.map((m) => fmtAbbrev(m.level)).join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({ segments, label, total, size = 120, thickness = 22 }) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.pct / 100) * circumference;
    const arc = { ...seg, dash, offset, gap: circumference - dash };
    offset += dash;
    return arc;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={"0 0 " + size + " " + size}>
          {/* Background ring */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(51,65,85,0.35)"
            strokeWidth={thickness}
          />
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={thickness}
              strokeDasharray={arc.dash + " " + (circumference - arc.dash)}
              strokeDashoffset={circumference - arc.offset}
              strokeLinecap="butt"
              style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 0.6s ease" }}
            />
          ))}
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#ffffff80", textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1 }}>
            {label}
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", marginTop: 3 }}>
            {fmtAbbrev(total)}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
        {segments.map((seg) => (
          <div key={seg.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {seg.icon} {seg.label}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
              {seg.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownDonuts({ assets, liabilities }) {
  const totalAssets = useMemo(() => assets.reduce((s, a) => s + (Number(a.value) || 0), 0), [assets]);
  const totalLiabilities = useMemo(() => liabilities.reduce((s, l) => s + (Number(l.balance) || 0), 0), [liabilities]);

  const assetSegs = useMemo(() => {
    const map = {};
    assets.forEach((a) => { map[a.category] = (map[a.category] || 0) + (Number(a.value) || 0); });
    return ASSET_CATEGORIES
      .filter((c) => map[c.id])
      .map((c) => ({ ...c, amount: map[c.id], pct: totalAssets > 0 ? (map[c.id] / totalAssets) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [assets, totalAssets]);

  const liabSegs = useMemo(() => {
    const map = {};
    liabilities.forEach((l) => { map[l.category] = (map[l.category] || 0) + (Number(l.balance) || 0); });
    return LIABILITY_CATEGORIES
      .filter((c) => map[c.id])
      .map((c) => ({ ...c, amount: map[c.id], pct: totalLiabilities > 0 ? (map[c.id] / totalLiabilities) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [liabilities, totalLiabilities]);

  if (assetSegs.length === 0 && liabSegs.length === 0) return null;

  return (
    <div style={S.card}>
      <div style={S.sectionHeader}>
        <div style={S.sectionTitle}>🍩 Breakdown</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {assetSegs.length > 0 && (
          <DonutChart
            segments={assetSegs}
            label="Assets"
            total={totalAssets}
          />
        )}
        {liabSegs.length > 0 && (
          <DonutChart
            segments={liabSegs}
            label="Debt"
            total={totalLiabilities}
          />
        )}
      </div>
    </div>
  );
}

// ─── FI Score Bar ─────────────────────────────────────────────────────────────

const FI_MILESTONES = [0, 25, 50, 75, 100];

function FIScoreBar({ netWorth, data, onChange }) {
  const annualExpenses = data.fiAnnualExpenses || 0;
  const annualSavings = data.fiAnnualSavings || 0;
  const [editing, setEditing] = useState(false);
  const [expInput, setExpInput] = useState(String(annualExpenses || ""));
  const [savInput, setSavInput] = useState(String(annualSavings || ""));

  const fiScore = useMemo(
    () => calcFIScore(netWorth, annualExpenses),
    [netWorth, annualExpenses]
  );

  const yearsToFI = useMemo(
    () => calcYearsToFI(netWorth, annualExpenses, annualSavings),
    [netWorth, annualExpenses, annualSavings]
  );

  function saveSettings() {
    const exp = parseFloat(expInput) || 0;
    const sav = parseFloat(savInput) || 0;
    onChange((prev) => ({ ...(prev || {}), fiAnnualExpenses: exp, fiAnnualSavings: sav }));
    setEditing(false);
  }

  const barColor =
    fiScore >= 100 ? "#10b981" :
    fiScore >= 75 ? "#22c55e" :
    fiScore >= 50 ? "#f59e0b" :
    fiScore >= 25 ? "#14b8a6" : "#64748b";

  return (
    <div style={S.card}>
      <div style={S.sectionHeader}>
        <div style={S.sectionTitle}>🏁 Financial Independence Score</div>
        <button
          onClick={() => { setExpInput(String(annualExpenses || "")); setSavInput(String(annualSavings || "")); setEditing(true); }}
          style={{ fontSize: 11, color: "#14b8a6", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
        >
          {annualExpenses ? "Edit" : "Set Expenses"}
        </button>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 16 }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", fontWeight: 600 }}>Annual Expenses ($)</label>
                <input
                  type="number"
                  value={expInput}
                  onChange={(e) => setExpInput(e.target.value)}
                  style={{ ...S.input, width: 140 }}
                  placeholder="e.g. 50000"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", fontWeight: 600 }}>Annual Savings ($)</label>
                <input
                  type="number"
                  value={savInput}
                  onChange={(e) => setSavInput(e.target.value)}
                  style={{ ...S.input, width: 140 }}
                  placeholder="e.g. 24000"
                />
              </div>
              <button onClick={saveSettings} style={{ ...S.addBtn, height: 36, marginBottom: 1 }}>Save</button>
              <button onClick={() => setEditing(false)} style={{ ...S.addBtn, background: "transparent", border: "1px solid rgba(51,65,85,0.7)", color: "rgba(148,163,184,0.7)", height: 36, marginBottom: 1 }}>Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {annualExpenses > 0 ? (
        <>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <motion.div
              key={fiScore}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ fontSize: 44, fontWeight: 900, color: barColor, fontFamily: "'Syne', serif", lineHeight: 1 }}
            >
              {fiScore.toFixed(1)}%
            </motion.div>
            <div style={{ fontSize: 13, color: "rgba(148,163,184,0.7)", marginTop: 6 }}>
              {fiScore >= 100
                ? "Financially Independent"
                : "You're " + fiScore.toFixed(1) + "% of the way to Financial Independence"}
            </div>
          </div>

          {/* Progress bar with milestone markers */}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <div style={{ height: 10, borderRadius: 5, background: "rgba(15,23,42,0.6)", overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: Math.min(100, fiScore) + "%" }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{ height: "100%", borderRadius: 5, background: barColor }}
              />
            </div>
            {/* Milestone tick marks */}
            <div style={{ position: "relative", height: 20, marginTop: 4 }}>
              {FI_MILESTONES.map((pct) => (
                <div
                  key={pct}
                  style={{
                    position: "absolute",
                    left: pct + "%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <div style={{
                    width: 1,
                    height: 6,
                    background: fiScore >= pct ? barColor : "rgba(51,65,85,0.5)",
                  }} />
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: fiScore >= pct ? "rgba(255,255,255,0.6)" : "rgba(148,163,184,0.4)",
                  }}>
                    {pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginBottom: 3 }}>FI Target</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9" }}>{fmt$(annualExpenses * 25)}</div>
            </div>
            <div style={{ background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginBottom: 3 }}>Annual Expenses</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9" }}>{fmt$(annualExpenses)}</div>
            </div>
            <div style={{ background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginBottom: 3 }}>Est. Years to FI</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: yearsToFI === null ? "#10b981" : "#f1f5f9" }}>
                {yearsToFI === null ? (netWorth >= annualExpenses * 25 ? "Already FI" : "—") : yearsToFI + " yrs"}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(148,163,184,0.45)", fontSize: 13 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🏁</div>
          <div>Set your annual expenses to calculate your FI score</div>
          <div style={{ fontSize: 11, marginTop: 4, color: "rgba(148,163,184,0.3)" }}>
            Based on the 4% safe withdrawal rule (25× annual expenses)
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Milestone Timeline ───────────────────────────────────────────────────────

function MilestoneTimeline({ snapshots, netWorth }) {
  const { hit, next } = useMemo(
    () => calcNetWorthMilestones(snapshots, netWorth),
    [snapshots, netWorth]
  );

  const hasDebtFree = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    for (const s of sorted) {
      if (s.liabilities === 0 && s.assets > 0) return s.date;
    }
    return null;
  }, [snapshots]);

  if (hit.length === 0 && !next && !hasDebtFree) return null;

  return (
    <div style={S.card}>
      <div style={S.sectionHeader}>
        <div style={S.sectionTitle}>🏆 Net Worth Milestones</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {hit.map((m, i) => (
          <div key={m.amount} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg,#10b981,#14b8a6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, boxShadow: "0 0 12px #10b98140",
              }}>
                ✓
              </div>
              {(i < hit.length - 1 || hasDebtFree || next) && (
                <div style={{ width: 1, flex: 1, minHeight: 12, background: "rgba(45, 212, 191,0.2)", margin: "3px 0" }} />
              )}
            </div>
            <div style={{ paddingBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>First {m.label}</div>
              {m.date && (
                <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginTop: 2 }}>
                  {fmtDateLong(m.date)}
                </div>
              )}
            </div>
          </div>
        ))}

        {hasDebtFree && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13,
              }}>
                🎉
              </div>
              {next && (
                <div style={{ width: 1, flex: 1, minHeight: 12, background: "rgba(45, 212, 191,0.2)", margin: "3px 0" }} />
              )}
            </div>
            <div style={{ paddingBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>Debt-Free</div>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginTop: 2 }}>
                {fmtDateLong(hasDebtFree)}
              </div>
            </div>
          </div>
        )}

        {next && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "rgba(45, 212, 191,0.15)",
                border: "2px dashed rgba(45, 212, 191,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13,
              }}>
                ◎
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(45, 212, 191,0.9)" }}>
                Next: {next.label}
              </div>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginTop: 2 }}>
                {fmt$(next.remaining)} away
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function NetWorthHero({ netWorth, totalAssets, totalLiabilities, snapshots }) {
  const isPositive = netWorth >= 0;

  const trend = useMemo(() => {
    if (snapshots.length < 2) return null;
    const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));
    const last = sorted[1];
    const diff = netWorth - last.netWorth;
    return { diff, label: monthLabel(last.date) };
  }, [snapshots, netWorth]);

  return (
    <div style={S.heroCard}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(148,163,184,0.5)", marginBottom: 10 }}>
        Net Worth
      </div>
      <motion.div
        key={netWorth}
        initial={{ scale: 0.96, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          fontSize: 42,
          fontWeight: 900,
          fontFamily: "'Syne', serif",
          color: isPositive ? "#22c55e" : "#ef4444",
          lineHeight: 1.1,
          marginBottom: 8,
        }}
      >
        {fmt$(netWorth)}
      </motion.div>

      {trend && (
        <div style={{
          fontSize: 13,
          color: trend.diff >= 0 ? "#22c55e" : "#ef4444",
          marginBottom: 16,
          fontWeight: 600,
        }}>
          {trend.diff >= 0 ? "↑" : "↓"} {fmt$(Math.abs(trend.diff))} vs {trend.label}
        </div>
      )}

      <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 4 }}>
            Total Assets
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#22c55e" }}>{fmt$(totalAssets)}</div>
        </div>
        <div style={{ width: 1, background: "rgba(51,65,85,0.5)", alignSelf: "stretch" }} />
        <div>
          <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 4 }}>
            Total Liabilities
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#ef4444" }}>{fmt$(totalLiabilities)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Snapshot Helper ──────────────────────────────────────────────────────────

function upsertSnapshot(snapshots, netWorth, assets, liabilities) {
  const today = todayStr();
  const existing = snapshots.find((s) => s.date === today);
  const snap = { date: today, netWorth, assets, liabilities };
  if (existing) {
    return snapshots.map((s) => (s.date === today ? snap : s));
  }
  return [...snapshots, snap];
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function NetWorthTab({ data, onChange }) {
  const assets = data.netWorthAssets || [];
  const liabilities = data.netWorthLiabilities || [];
  const snapshots = data.netWorthSnapshots || [];

  const totalAssets = useMemo(() => assets.reduce((s, a) => s + (Number(a.value) || 0), 0), [assets]);
  const totalLiabilities = useMemo(() => liabilities.reduce((s, l) => s + (Number(l.balance) || 0), 0), [liabilities]);
  const netWorth = totalAssets - totalLiabilities;

  const save = useCallback(
    (patch) => {
      onChange((prev) => {
        const newData = { ...(prev || {}), ...patch };
        const newAssets = newData.netWorthAssets || [];
        const newLiabs = newData.netWorthLiabilities || [];
        const nwAssets = newAssets.reduce((s, a) => s + (Number(a.value) || 0), 0);
        const nwLiabs = newLiabs.reduce((s, l) => s + (Number(l.balance) || 0), 0);
        const nw = nwAssets - nwLiabs;
        const newSnaps = upsertSnapshot(newData.netWorthSnapshots || [], nw, nwAssets, nwLiabs);
        return { ...newData, netWorthSnapshots: newSnaps };
      });
    },
    [onChange]
  );

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Syne', serif", fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>
          Net Worth
        </h1>
        <p style={{ fontSize: 13, color: "rgba(100,116,139,0.8)", marginTop: 4 }}>
          Track assets, liabilities, and your financial trajectory
        </p>
      </div>

      <NetWorthHero
        netWorth={netWorth}
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
        snapshots={snapshots}
      />

      <NetWorthSVGChart snapshots={snapshots} />

      <BreakdownDonuts assets={assets} liabilities={liabilities} />

      <FIScoreBar netWorth={netWorth} data={data} onChange={onChange} />

      <MilestoneTimeline snapshots={snapshots} netWorth={netWorth} />

      <AssetsSection
        assets={assets}
        onChange={(updated) => save({ netWorthAssets: updated })}
      />

      <LiabilitiesSection
        liabilities={liabilities}
        onChange={(updated) => save({ netWorthLiabilities: updated })}
      />

      <AllocationBreakdown assets={assets} />
    </div>
  );
}

// ─── Dashboard Widget ─────────────────────────────────────────────────────────

export function NetWorthDashWidget({ data, onNavigate }) {
  const assets = data.netWorthAssets || [];
  const liabilities = data.netWorthLiabilities || [];
  const snapshots = data.netWorthSnapshots || [];

  const totalAssets = assets.reduce((s, a) => s + (Number(a.value) || 0), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + (Number(l.balance) || 0), 0);
  const netWorth = totalAssets - totalLiabilities;
  const isPositive = netWorth >= 0;

  const trend = useMemo(() => {
    if (snapshots.length < 2) return null;
    const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));
    return netWorth - sorted[1].netWorth;
  }, [snapshots, netWorth]);

  const assetsRatio = totalAssets + totalLiabilities > 0
    ? (totalAssets / (totalAssets + totalLiabilities)) * 100
    : 50;

  return (
    <motion.div
      onClick={onNavigate}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        background: "rgba(17,24,39,0.75)",
        border: "1px solid rgba(45, 212, 191,0.2)",
        borderRadius: 16,
        padding: "16px 18px",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(148,163,184,0.5)", marginBottom: 8 }}>
        Net Worth
      </div>

      <div style={{
        fontSize: 28,
        fontWeight: 900,
        fontFamily: "'Syne', serif",
        color: isPositive ? "#22c55e" : "#ef4444",
        lineHeight: 1.1,
        marginBottom: 6,
      }}>
        {fmt$(netWorth)}
      </div>

      {trend !== null && (
        <div style={{ fontSize: 12, color: trend >= 0 ? "#22c55e" : "#ef4444", fontWeight: 600, marginBottom: 10 }}>
          {trend >= 0 ? "↑" : "↓"} {fmt$(Math.abs(trend))} vs last snapshot
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(148,163,184,0.45)", marginBottom: 4 }}>
          <span>Assets {fmtAbbrev(totalAssets)}</span>
          <span>Liabilities {fmtAbbrev(totalLiabilities)}</span>
        </div>
        <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "rgba(239,68,68,0.3)" }}>
          <div style={{ width: assetsRatio + "%", background: "#22c55e", borderRadius: "3px 0 0 3px", transition: "width 0.4s" }} />
        </div>
      </div>

      <div style={{ fontSize: 11, color: "rgba(45, 212, 191,0.7)", fontWeight: 600 }}>
        View details →
      </div>
    </motion.div>
  );
}
