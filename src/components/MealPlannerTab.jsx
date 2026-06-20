/* eslint-disable */
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  calcMealLoggingStreak,
  calcRingProgress,
  calcMealQuality,
  calcWaterStreak,
  calcMealSpacing,
  calcBudgetRemaining,
} from "../utils/math";

// ─── Utilities ───────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDates(referenceDate) {
  const d = new Date(referenceDate + "T12:00:00");
  const day = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const nd = new Date(monday);
    nd.setDate(monday.getDate() + i);
    return dateStr(nd);
  });
}

function getDayLabel(dateString) {
  const d = new Date(dateString + "T12:00:00");
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

function getDateLabel(dateString) {
  const d = new Date(dateString + "T12:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function sumMacro(meals, key) {
  return (meals || []).reduce((acc, m) => acc + (Number(m[key]) || 0), 0);
}

function getDayMacros(dayData) {
  const slots = ["breakfast", "lunch", "dinner", "snacks"];
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  slots.forEach((slot) => {
    (dayData?.[slot] || []).forEach((m) => {
      totals.calories += Number(m.calories) || 0;
      totals.protein += Number(m.protein) || 0;
      totals.carbs += Number(m.carbs) || 0;
      totals.fat += Number(m.fat) || 0;
    });
  });
  totals.calories = Math.round(totals.calories);
  totals.protein = Math.round(totals.protein * 10) / 10;
  totals.carbs = Math.round(totals.carbs * 10) / 10;
  totals.fat = Math.round(totals.fat * 10) / 10;
  return totals;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const WATER_LOG_KEY = "up_waterLog";

// Hardcoded meal suggestion library (name, protein g, carbs g, fat g, calories)
const SUGGESTION_LIBRARY = [
  { name: "Chicken Breast (6oz)",   protein: 42, carbs: 0,  fat: 4,  calories: 200 },
  { name: "Greek Yogurt (1 cup)",   protein: 17, carbs: 9,  fat: 0,  calories: 100 },
  { name: "Cottage Cheese (1 cup)", protein: 25, carbs: 5,  fat: 5,  calories: 180 },
  { name: "Eggs (3 whole)",         protein: 18, carbs: 2,  fat: 14, calories: 210 },
  { name: "Tuna Can (5oz)",         protein: 30, carbs: 0,  fat: 2,  calories: 130 },
  { name: "Oatmeal (1 cup)",        protein: 6,  carbs: 54, fat: 4,  calories: 300 },
  { name: "Banana + Peanut Butter", protein: 5,  carbs: 40, fat: 8,  calories: 250 },
  { name: "Sweet Potato (medium)",  protein: 3,  carbs: 37, fat: 0,  calories: 160 },
  { name: "Brown Rice (1 cup)",     protein: 5,  carbs: 45, fat: 2,  calories: 215 },
  { name: "Balanced Plate",         protein: 40, carbs: 55, fat: 10, calories: 480 },
];

const PREP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PREP_SLOTS = ["breakfast", "lunch", "dinner"];
const EMPTY_PREP_GRID = Object.fromEntries(
  PREP_DAYS.map((d) => [d, { breakfast: "", lunch: "", dinner: "" }])
);

// ─── Styles ──────────────────────────────────────────────────────────────────
const ACCENT = "#22c55e";
const FONT = "'DM Sans', sans-serif";

const S = {
  wrap: {
    fontFamily: FONT,
    color: "#f1f5f9",
    minHeight: "100vh",
    padding: "20px 16px",
    boxSizing: "border-box",
  },
  card: {
    background: "rgba(17,24,39,0.7)",
    border: "1px solid rgba(51,65,85,0.4)",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 14,
  },
  dayCol: {
    background: "rgba(17,24,39,0.6)",
    borderRadius: 14,
    padding: 12,
    flex: "1 1 0",
    minWidth: 120,
    border: "1px solid rgba(51,65,85,0.3)",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  dayColActive: {
    border: "1px solid rgba(34,197,94,0.4)",
    background: "rgba(17,24,39,0.8)",
  },
  mealSlot: {
    background: "rgba(15,23,42,0.5)",
    borderRadius: 10,
    padding: 10,
  },
  input: {
    width: "100%",
    background: "rgba(15,23,42,0.9)",
    border: "1px solid rgba(51,65,85,0.7)",
    borderRadius: 10,
    padding: "9px 12px",
    color: "#f1f5f9",
    fontSize: 13,
    fontFamily: FONT,
    boxSizing: "border-box",
    outline: "none",
  },
  label: {
    fontSize: 11,
    color: "rgba(148,163,184,0.7)",
    fontWeight: 600,
    marginBottom: 4,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  btn: {
    background: ACCENT,
    border: "none",
    borderRadius: 10,
    color: "#fff",
    padding: "9px 18px",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: FONT,
    cursor: "pointer",
  },
  btnGhost: {
    background: "rgba(51,65,85,0.3)",
    border: "1px solid rgba(51,65,85,0.5)",
    borderRadius: 10,
    color: "#94a3b8",
    padding: "9px 18px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: FONT,
    cursor: "pointer",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: 10,
  },
  chip: {
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.25)",
    borderRadius: 8,
    padding: "4px 10px",
    fontSize: 12,
    color: ACCENT,
    cursor: "pointer",
    fontWeight: 600,
    fontFamily: FONT,
  },
  tabBtn: (active) => ({
    padding: "8px 18px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 13,
    background: active ? ACCENT : "rgba(51,65,85,0.2)",
    color: active ? "#fff" : "#94a3b8",
    transition: "all 0.15s",
  }),
};

// ─── Add Meal Modal ───────────────────────────────────────────────────────────
function AddMealModal({ open, onClose, onSave, favoriteMeals = [], targetSlot, prefill }) {
  const empty = { name: "", calories: "", protein: "", carbs: "", fat: "", notes: "", addToFavorites: false };
  const [form, setForm] = useState(empty);
  const [favPick, setFavPick] = useState("");

  // ── Food database search state ──────────────────────────────────────────────
  const [foodSearch, setFoodSearch] = useState("");
  const [foodResults, setFoodResults] = useState([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodError, setFoodError] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [portionAmt, setPortionAmt] = useState("100");
  const [portionUnit, setPortionUnit] = useState("g");
  const searchTimeoutRef = useRef(null);

  const UNIT_TO_G = { g: 1, oz: 28.35, cup: 240, tbsp: 15, tsp: 5, serving: 100 };
  const portionG = String((parseFloat(portionAmt) || 0) * (UNIT_TO_G[portionUnit] || 1));

  const searchFoods = async (query, signal) => {
    if (!query.trim() || query.length < 2) return [];

    // Try Vercel proxy first, fall back to USDA directly
    const tryProxy = async () => {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(query)}`, { signal });
      if (!res.ok) throw new Error(`proxy-${res.status}`);
      const data = await res.json();
      return data.foods || [];
    };

    const tryUSDA = async () => {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=DEMO_KEY`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`usda-${res.status}`);
      const data = await res.json();
      return (data.foods || []).map((f) => {
        const nuts = {};
        (f.foodNutrients || []).forEach((n) => { nuts[n.nutrientName] = n.value; });
        return {
          name: f.description + (f.brandOwner ? ` (${f.brandOwner})` : ''),
          calories: Math.round(nuts['Energy'] || 0),
          protein: Math.round((nuts['Protein'] || 0) * 10) / 10,
          carbs: Math.round((nuts['Carbohydrate, by difference'] || 0) * 10) / 10,
          fat: Math.round((nuts['Total lipid (fat)'] || 0) * 10) / 10,
          per100g: true,
        };
      });
    };

    try {
      return await tryProxy();
    } catch {
      // Proxy failed — go direct
      return await tryUSDA();
    }
  };

  useEffect(() => {
    if (!foodSearch.trim() || foodSearch.length < 2) {
      setFoodResults([]);
      setFoodLoading(false);
      setFoodError(false);
      return;
    }
    setFoodLoading(true);
    setFoodError(false);
    clearTimeout(searchTimeoutRef.current);
    const controller = new AbortController();
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchFoods(foodSearch, controller.signal);
        setFoodResults(results);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setFoodError(true);
        setFoodResults([]);
      } finally {
        setFoodLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(searchTimeoutRef.current);
      controller.abort();
    };
  }, [foodSearch]);

  // Reset search state when modal closes
  useEffect(() => {
    if (!open) {
      setFoodSearch("");
      setFoodResults([]);
      setFoodLoading(false);
      setFoodError(false);
      setSelectedFood(null);
      setPortionAmt("100");
      setPortionUnit("g");
    }
  }, [open]);

  const applyFoodResult = (food) => {
    setSelectedFood(food);
    setPortionAmt("100");
    setPortionUnit("g");
    // Pre-fill form with base 100g values
    setForm((f) => ({
      ...f,
      name: food.name,
      calories: String(food.calories),
      protein: String(food.protein),
      carbs: String(food.carbs),
      fat: String(food.fat),
    }));
    setFoodResults([]);
    setFoodSearch("");
    setFavPick("");
  };

  const applyPortion = () => {
    if (!selectedFood) return;
    const g = parseFloat(portionG) || 100;
    const scale = g / 100;
    setForm((f) => ({
      ...f,
      calories: String(Math.round(selectedFood.calories * scale)),
      protein: String(Math.round(selectedFood.protein * scale * 10) / 10),
      carbs: String(Math.round(selectedFood.carbs * scale * 10) / 10),
      fat: String(Math.round(selectedFood.fat * scale * 10) / 10),
    }));
  };

  const portionScale = parseFloat(portionG) / 100 || 1;
  const liveCalories = selectedFood ? Math.round(selectedFood.calories * portionScale) : null;
  const liveProtein = selectedFood ? Math.round(selectedFood.protein * portionScale * 10) / 10 : null;
  const liveCarbs = selectedFood ? Math.round(selectedFood.carbs * portionScale * 10) / 10 : null;
  const liveFat = selectedFood ? Math.round(selectedFood.fat * portionScale * 10) / 10 : null;

  // Pre-fill form from AI scanner result
  useEffect(() => {
    if (prefill && open) {
      setForm({
        name: prefill.name || "",
        calories: prefill.calories != null ? String(prefill.calories) : "",
        protein: prefill.protein != null ? String(prefill.protein) : "",
        carbs: prefill.carbs != null ? String(prefill.carbs) : "",
        fat: prefill.fat != null ? String(prefill.fat) : "",
        notes: "",
        addToFavorites: false,
      });
      setFavPick("");
    }
  }, [prefill, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const applyFav = (id) => {
    const fav = favoriteMeals.find((f) => f.id === id);
    if (!fav) return;
    setForm({
      name: fav.name || "",
      calories: fav.calories || "",
      protein: fav.protein || "",
      carbs: fav.carbs || "",
      fat: fav.fat || "",
      notes: fav.notes || "",
      addToFavorites: false,
    });
    setFavPick(id);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({
      id: uid(),
      name: form.name.trim(),
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      notes: form.notes.trim(),
      addToFavorites: form.addToFavorites,
    });
    setForm(empty);
    setFavPick("");
    setSelectedFood(null);
    setFoodSearch("");
    setFoodResults([]);
  };

  const handleClose = () => {
    setForm(empty);
    setFavPick("");
    setSelectedFood(null);
    setFoodSearch("");
    setFoodResults([]);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.93, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.93, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              background: "rgba(15,23,42,0.97)",
              border: "1px solid rgba(51,65,85,0.6)",
              borderRadius: 18,
              padding: 24,
              width: "100%",
              maxWidth: 440,
              fontFamily: FONT,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", marginBottom: 18 }}>
              Add Meal
              {targetSlot && (
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginLeft: 8 }}>
                  → {targetSlot.charAt(0).toUpperCase() + targetSlot.slice(1)}
                </span>
              )}
            </div>

            {/* ── Food Database Search ───────────────────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Search food database</label>
              <div style={{ position: "relative" }}>
                {/* Search icon */}
                <svg
                  width="15" height="15"
                  viewBox="0 0 24 24" fill="none"
                  stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                >
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  style={{ ...S.input, paddingLeft: 34 }}
                  placeholder="Search 2M+ foods... (e.g. 'chicken breast', 'banana')"
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  autoComplete="off"
                />
                {/* Dropdown */}
                {(foodLoading || foodError || foodResults.length > 0) && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "rgba(15,23,42,0.99)",
                    border: "1px solid rgba(51,65,85,0.7)",
                    borderRadius: 10,
                    zIndex: 1100,
                    overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}>
                    {foodLoading && (
                      <div style={{ padding: "12px 14px", fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                          </path>
                        </svg>
                        Searching...
                      </div>
                    )}
                    {foodError && (
                      <div style={{ padding: "12px 14px", fontSize: 13, color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
                        Search unavailable — check connection
                        <button onClick={() => { setFoodError(false); setFoodSearch(s => s + " "); setTimeout(() => setFoodSearch(s => s.trimEnd()), 0); }} style={{ fontSize: 12, color: "#6366f1", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Retry</button>
                      </div>
                    )}
                    {!foodLoading && !foodError && foodResults.map((food, i) => (
                      <button
                        key={i}
                        onClick={() => applyFoodResult(food)}
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          borderBottom: i < foodResults.length - 1 ? "1px solid rgba(51,65,85,0.35)" : "none",
                          padding: "10px 14px",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: FONT,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.07)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{
                          fontSize: 13,
                          color: "#f1f5f9",
                          fontWeight: 600,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: "1.35",
                          marginBottom: 4,
                        }}>
                          {food.name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {[
                            { label: `${food.calories} cal`, color: "#fbbf24" },
                            { label: `${food.protein}g protein`, color: "#60a5fa" },
                            { label: `${food.carbs}g carbs`, color: "#34d399" },
                            { label: `${food.fat}g fat`, color: "#f472b6" },
                          ].map((chip) => (
                            <span key={chip.label} style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: chip.color,
                              background: chip.color + "1a",
                              borderRadius: 5,
                              padding: "2px 6px",
                            }}>{chip.label}</span>
                          ))}
                          <span style={{ fontSize: 10, color: "#475569", marginLeft: 2 }}>per 100g</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Portion size with unit selector ───────────────────────────── */}
            {selectedFood && (
              <div style={{
                marginBottom: 14,
                padding: "10px 12px",
                background: "rgba(34,197,94,0.07)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>
                  Portion size
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    style={{ ...S.input, width: 72, textAlign: "center" }}
                    value={portionAmt}
                    onChange={(e) => setPortionAmt(e.target.value)}
                  />
                  <select
                    value={portionUnit}
                    onChange={(e) => {
                      const prev = UNIT_TO_G[portionUnit] || 1;
                      const next = UNIT_TO_G[e.target.value] || 1;
                      // Keep the gram total the same, recalculate amount in new unit
                      const totalG = (parseFloat(portionAmt) || 0) * prev;
                      setPortionAmt(String(Math.round((totalG / next) * 100) / 100));
                      setPortionUnit(e.target.value);
                    }}
                    style={{
                      ...S.input,
                      width: 84,
                      padding: "7px 8px",
                      cursor: "pointer",
                    }}
                  >
                    <option value="g">g</option>
                    <option value="oz">oz</option>
                    <option value="cup">cup</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                    <option value="serving">serving</option>
                  </select>
                  <div style={{ flex: 1, fontSize: 12, color: "#94a3b8", minWidth: 0 }}>
                    {liveCalories} cal · {liveProtein}g P · {liveCarbs}g C · {liveFat}g F
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                      = {Math.round(parseFloat(portionG) || 0)}g total
                    </div>
                  </div>
                  <button
                    style={{ ...S.btn, padding: "6px 12px", fontSize: 12 }}
                    onClick={applyPortion}
                  >
                    Use
                  </button>
                </div>
              </div>
            )}

            {/* ── Quick add suggestions ─────────────────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
              <div style={S.sectionHeader}>Quick add</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SUGGESTION_LIBRARY.map((s) => (
                  <button
                    key={s.name}
                    style={S.chip}
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        name: s.name,
                        calories: String(s.calories),
                        protein: String(s.protein),
                        carbs: String(s.carbs),
                        fat: String(s.fat),
                      }));
                      setSelectedFood(null);
                      setFoodSearch("");
                      setFoodResults([]);
                      setFavPick("");
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {favoriteMeals.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Quick add from favorites</label>
                <select
                  value={favPick}
                  onChange={(e) => applyFav(e.target.value)}
                  style={{ ...S.input, color: favPick ? "#f1f5f9" : "#64748b" }}
                >
                  <option value="">— Select a saved meal —</option>
                  {favoriteMeals.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.calories ? `(${f.calories} cal)` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Meal name *</label>
              <input
                style={S.input}
                placeholder="e.g. Oatmeal with berries"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Calories</label>
              <input
                style={S.input}
                type="number"
                placeholder="0"
                value={form.calories}
                onChange={(e) => set("calories", e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              {["protein", "carbs", "fat"].map((macro) => (
                <div key={macro} style={{ flex: 1 }}>
                  <label style={S.label}>{macro.charAt(0).toUpperCase() + macro.slice(1)} (g)</label>
                  <input
                    style={S.input}
                    type="number"
                    placeholder="0"
                    value={form[macro]}
                    onChange={(e) => set(macro, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Notes (optional)</label>
              <input
                style={S.input}
                placeholder="Any notes..."
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <input
                type="checkbox"
                id="addFav"
                checked={form.addToFavorites}
                onChange={(e) => set("addToFavorites", e.target.checked)}
                style={{ accentColor: ACCENT, width: 15, height: 15 }}
              />
              <label htmlFor="addFav" style={{ fontSize: 13, color: "#94a3b8", cursor: "pointer" }}>
                Add to Favorites ⭐
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={S.btnGhost} onClick={handleClose}>Cancel</button>
              <button
                style={{ ...S.btn, opacity: form.name.trim() ? 1 : 0.5 }}
                onClick={handleSave}
                disabled={!form.name.trim()}
              >
                Save Meal
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Meal Slot ────────────────────────────────────────────────────────────────
function MealSlotBlock({ slotName, meals = [], onAdd, onRemove, compact }) {
  const slotCals = meals.reduce((a, m) => a + (Number(m.calories) || 0), 0);

  return (
    <div style={S.mealSlot}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
          {slotName}
        </span>
        {slotCals > 0 && (
          <span style={{ fontSize: 10, color: ACCENT, fontWeight: 700 }}>{slotCals} cal</span>
        )}
      </div>
      {meals.length === 0 && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontStyle: "italic", padding: "3px 0 2px" }}>
          No meals logged yet
        </div>
      )}
      {meals.map((meal) => {
        const quality = calcMealQuality(meal.calories, meal.protein);
        const qColor = quality === "excellent" ? "#22c55e" : quality === "good" ? "#f59e0b" : "#f97316";
        const timeLabel = meal.timestamp
          ? new Date(meal.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : null;
        return (
          <div key={meal.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: "#cbd5e1", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {meal.name}
              {timeLabel && (
                <span style={{ fontSize: 10, color: "#475569", marginLeft: 5 }}>{timeLabel}</span>
              )}
            </span>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
              <div
                title={`Quality: ${quality}`}
                style={{ width: 6, height: 6, borderRadius: "50%", background: qColor, flexShrink: 0 }}
              />
              {meal.calories > 0 && (
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{meal.calories}</span>
              )}
              <button
                onClick={() => onRemove(meal.id)}
                style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 11, padding: "0 2px", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
      <button
        onClick={onAdd}
        style={{
          background: "none",
          border: "1px dashed rgba(34,197,94,0.3)",
          borderRadius: 6,
          color: ACCENT,
          fontSize: 11,
          padding: "3px 8px",
          cursor: "pointer",
          marginTop: 4,
          fontFamily: FONT,
          fontWeight: 600,
          width: "100%",
        }}
      >
        + Add
      </button>
    </div>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────
const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snacks"];

function DayColumn({ dateStr: ds, dayData, isSelected, isToday, calorieGoal, onSelectDay, onAddMeal, onRemoveMeal }) {
  const macros = getDayMacros(dayData);
  const diff = macros.calories - (calorieGoal || 2000);
  const calColor = Math.abs(diff) <= 200 ? ACCENT : diff > 200 ? "#ef4444" : "#94a3b8";

  return (
    <div
      style={{
        ...S.dayCol,
        ...(isSelected ? S.dayColActive : {}),
        cursor: "pointer",
      }}
      onClick={() => onSelectDay(ds)}
    >
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? ACCENT : "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {getDayLabel(ds)}
        </div>
        <div style={{ fontSize: 12, color: isToday ? ACCENT : "#64748b", fontWeight: 600 }}>
          {getDateLabel(ds)}
        </div>
      </div>

      {MEAL_SLOTS.map((slot) => (
        <MealSlotBlock
          key={slot}
          slotName={slot}
          meals={dayData?.[slot] || []}
          onAdd={(e) => { if (e && e.stopPropagation) e.stopPropagation(); onAddMeal(ds, slot); }}
          onRemove={(mealId) => onRemoveMeal(ds, slot, mealId)}
          compact
        />
      ))}

      <div style={{ textAlign: "center", marginTop: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: calColor }}>
          {macros.calories > 0 ? `${macros.calories} cal` : "—"}
        </span>
      </div>
    </div>
  );
}

// ─── Daily Macro Summary ──────────────────────────────────────────────────────
function MacroSummaryPanel({ dateStr: ds, dayData, calorieGoal, bodyWeight }) {
  const macros = getDayMacros(dayData);
  const proteinGoal = bodyWeight ? Math.round(bodyWeight * 0.8) : 120;
  const calGoal = calorieGoal || 2000;

  const stats = [
    { label: "Calories", value: macros.calories, goal: calGoal, unit: "kcal", color: ACCENT },
    { label: "Protein", value: macros.protein, goal: proteinGoal, unit: "g", color: "#6366f1" },
    { label: "Carbs", value: macros.carbs, goal: Math.round(calGoal * 0.5 / 4), unit: "g", color: "#f59e0b" },
    { label: "Fat", value: macros.fat, goal: Math.round(calGoal * 0.3 / 9), unit: "g", color: "#ef4444" },
  ];

  return (
    <div style={{ ...S.card, marginBottom: 0 }}>
      <div style={S.sectionHeader}>
        {getDayLabel(ds)} {getDateLabel(ds)} — Daily Macros
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              flex: "1 1 100px",
              background: "rgba(15,23,42,0.6)",
              borderRadius: 12,
              padding: "10px 14px",
              textAlign: "center",
              border: `1px solid ${s.color}22`,
            }}
          >
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>
              {s.value}
              <span style={{ fontSize: 11, fontWeight: 500, color: "#64748b", marginLeft: 2 }}>{s.unit}</span>
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
              goal: {s.goal}{s.unit}
            </div>
          </div>
        ))}
      </div>

      {stats.map((s) => {
        const pct = Math.min(100, s.goal > 0 ? Math.round((s.value / s.goal) * 100) : 0);
        return (
          <div key={s.label} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: "rgba(51,65,85,0.5)", borderRadius: 99, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ height: "100%", borderRadius: 99, background: s.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Grocery List ─────────────────────────────────────────────────────────────
function GroceryListSection({ groceryList = [], onChange, weekMealNames = [] }) {
  const [newItem, setNewItem] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = React.useRef(null);
  const showToast = React.useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }, []);
  React.useEffect(() => () => clearTimeout(toastTimer.current), []);

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange((d) => ({
      ...d,
      groceryList: [
        ...(d.groceryList || []),
        { id: uid(), item: trimmed, checked: false, addedAt: Date.now() },
      ],
    }));
    setNewItem("");
  };

  const toggleItem = (id) => {
    onChange((d) => ({
      ...d,
      groceryList: (d.groceryList || []).map((g) =>
        g.id === id ? { ...g, checked: !g.checked } : g
      ),
    }));
  };

  const clearChecked = () => {
    onChange((d) => ({
      ...d,
      groceryList: (d.groceryList || []).filter((g) => !g.checked),
    }));
  };

  const generateFromMeals = () => {
    const existing = new Set((groceryList || []).map((g) => g.item.toLowerCase()));
    const uniqueNames = [...new Set(weekMealNames.map((n) => n.trim()).filter(Boolean))];
    const newItems = uniqueNames
      .filter((name) => !existing.has(name.toLowerCase()))
      .map((name) => ({ id: uid(), item: name, checked: false, addedAt: Date.now() }));
    if (newItems.length === 0) {
      showToast("No new items to add.");
      return;
    }
    onChange((d) => ({
      ...d,
      groceryList: [...(d.groceryList || []), ...newItems],
    }));
    showToast(`Added ${newItems.length} item${newItems.length !== 1 ? "s" : ""} to grocery list`);
  };

  const checkedCount = (groceryList || []).filter((g) => g.checked).length;

  return (
    <div style={S.card}>
      {toast && (
        <div style={{
          background: "rgba(34,197,94,0.15)",
          border: "1px solid rgba(34,197,94,0.35)",
          borderRadius: 10,
          padding: "8px 14px",
          fontSize: 13,
          color: ACCENT,
          fontWeight: 700,
          marginBottom: 12,
          fontFamily: FONT,
        }}>
          ✓ {toast}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input
          style={{ ...S.input, flex: 1 }}
          placeholder="Add grocery item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <button style={{ ...S.btn, padding: "9px 16px" }} onClick={addItem}>Add</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          style={{ ...S.btnGhost, fontSize: 12, padding: "6px 12px" }}
          onClick={generateFromMeals}
        >
          🔄 Generate from meals
        </button>
        {checkedCount > 0 && (
          <button
            style={{ ...S.btnGhost, fontSize: 12, padding: "6px 12px" }}
            onClick={clearChecked}
          >
            🗑 Clear checked ({checkedCount})
          </button>
        )}
      </div>

      {(!groceryList || groceryList.length === 0) ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#475569", fontSize: 13 }}>
          No items yet. Add some or generate from this week's meals.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {groceryList.map((g) => (
            <motion.div
              key={g.id}
              layout
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: "rgba(15,23,42,0.4)",
                borderRadius: 10,
                border: g.checked ? "1px solid rgba(34,197,94,0.1)" : "1px solid rgba(51,65,85,0.3)",
              }}
            >
              <input
                type="checkbox"
                checked={g.checked}
                onChange={() => toggleItem(g.id)}
                style={{ accentColor: ACCENT, width: 15, height: 15, cursor: "pointer" }}
              />
              <span style={{
                fontSize: 13,
                color: g.checked ? "#475569" : "#cbd5e1",
                textDecoration: g.checked ? "line-through" : "none",
                flex: 1,
              }}>
                {g.item}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Favorite Meals Section ───────────────────────────────────────────────────
function FavoriteMealsSection({ favoriteMeals = [], onQuickAdd, onRemoveFav }) {
  if (!favoriteMeals || favoriteMeals.length === 0) return null;

  return (
    <div style={{ ...S.card, marginBottom: 14 }}>
      <div style={S.sectionHeader}>⭐ Saved Meals</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {favoriteMeals.map((fav) => (
          <div key={fav.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button style={S.chip} onClick={() => onQuickAdd(fav)} title={`${fav.calories || 0} cal`}>
              {fav.name}
              {fav.calories ? <span style={{ color: "#86efac", marginLeft: 4, fontSize: 11 }}>{fav.calories}</span> : null}
            </button>
            <button
              onClick={() => onRemoveFav(fav.id)}
              style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 11, padding: "2px 4px" }}
              title="Remove from favorites"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Macro Ring ──────────────────────────────────────────────────────────────
// Single circular SVG progress ring (56px diameter, 5px stroke).
// All math is delegated to calcRingProgress from math.ts.
function MacroRing({ value, goal, color, label, unit }) {
  const SIZE = 56;
  const STROKE = 5;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;

  const progress = calcRingProgress(value, goal);
  const offset = CIRC * (1 - progress);
  const isOver = value > goal && goal > 0;

  // Respect prefers-reduced-motion — skip animated offset
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${label}: ${value} of ${goal} ${unit}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="rgba(51,65,85,0.45)"
            strokeWidth={STROKE}
          />
          {/* Progress arc */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={isOver ? "#ef4444" : color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={prefersReduced ? offset : offset}
            style={
              prefersReduced
                ? {}
                : { transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)" }
            }
          />
        </svg>
        {/* Centre label */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            color: isOver ? "#ef4444" : "#f1f5f9",
            fontFamily: FONT,
          }}
        >
          {value}
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>
          {value} / {goal}{unit}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {label}
        </div>
      </div>
    </div>
  );
}

// ─── Nutrition Trend Bars (7-day) ─────────────────────────────────────────────
function NutritionTrendBars({ mealPlan, calorieGoal }) {
  const MAX_BAR_H = 60;
  const MAX_CAL = 2500;
  const TARGET = calorieGoal || 2000;

  // Build last 7 days
  const days = useMemo(() => {
    const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toLocaleDateString("en-CA");
      const cals = getDayMacros(mealPlan[key]).calories;
      const label = DAY_LABELS[d.getDay()];
      return { key, cals, label };
    });
  }, [mealPlan]);

  const targetLineY = MAX_BAR_H - Math.min(MAX_BAR_H, (TARGET / MAX_CAL) * MAX_BAR_H);

  return (
    <div style={{ ...S.card, marginBottom: 14 }}>
      <div style={S.sectionHeader}>7-Day Calorie Trend</div>
      <div style={{ position: "relative", paddingTop: 4 }}>
        {/* Dotted target line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: targetLineY + 4,
            borderTop: "1px dashed rgba(148,163,184,0.35)",
            pointerEvents: "none",
          }}
        />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: MAX_BAR_H + 20 }}>
          {days.map(({ key, cals, label }) => {
            const h = Math.min(MAX_BAR_H, cals > 0 ? Math.round((cals / MAX_CAL) * MAX_BAR_H) : 0);
            const diff = Math.abs(cals - TARGET);
            const barColor =
              cals === 0
                ? "rgba(51,65,85,0.4)"
                : diff <= 200
                ? "#22c55e"
                : cals > TARGET
                ? "#f59e0b"
                : "#3b82f6";

            return (
              <div
                key={key}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
                title={cals > 0 ? `${cals} cal` : "No data"}
              >
                <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, height: 12, display: "flex", alignItems: "flex-end" }}>
                  {cals > 0 ? cals : ""}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: h || 3,
                    background: barColor,
                    borderRadius: "3px 3px 0 0",
                    transition: "height 0.4s cubic-bezier(0.4,0,0.2,1)",
                    minHeight: 3,
                  }}
                />
                <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>{label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 9, color: "rgba(148,163,184,0.45)", marginTop: 4, textAlign: "right" }}>
          target: {TARGET} cal
        </div>
      </div>
    </div>
  );
}

// ─── Macro Pie Donut ──────────────────────────────────────────────────────────
function MacroPieDonut({ protein, carbs, fat }) {
  const SIZE = 80;
  const STROKE = 14;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;

  const pCal = protein * 4;
  const cCal = carbs * 4;
  const fCal = fat * 9;
  const total = pCal + cCal + fCal;

  const segments = [
    { label: "Protein", kcal: pCal, color: "#6366f1" },
    { label: "Carbs", kcal: cCal, color: "#14b8a6" },
    { label: "Fat", kcal: fCal, color: "#f43f5e" },
  ];

  // Build offsets
  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const pct = total > 0 ? seg.kcal / total : 0;
    const dash = pct * CIRC;
    const gap = CIRC - dash;
    const offset = CIRC * (1 - cumulative);
    cumulative += pct;
    return { ...seg, dash, gap, offset, pct };
  });

  if (total === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ width: SIZE, height: SIZE, borderRadius: "50%", background: "rgba(51,65,85,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 9, color: "#475569" }}>No data</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: "rotate(-90deg)" }}
        role="img"
        aria-label={`Macro breakdown: protein ${Math.round(arcs[0].pct * 100)}%, carbs ${Math.round(arcs[1].pct * 100)}%, fat ${Math.round(arcs[2].pct * 100)}%`}
      >
        {/* Track */}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(51,65,85,0.3)" strokeWidth={STROKE} />
        {arcs.map((arc, i) =>
          arc.pct > 0 ? (
            <circle
              key={i}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={arc.offset}
              style={{ transition: "stroke-dashoffset 0.5s ease, stroke-dasharray 0.5s ease" }}
            />
          ) : null
        )}
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", gap: 10 }}>
        {arcs.map((arc) => (
          <div key={arc.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: arc.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>
              {arc.label} {total > 0 ? Math.round(arc.pct * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Daily Macro Dashboard ────────────────────────────────────────────────────
const QUALITY_COLOR = { excellent: "#22c55e", good: "#f59e0b", fair: "#f97316" };
const QUALITY_LABEL = { excellent: "Excellent", good: "Good", fair: "Fair" };

function DailyMacroDashboard({ mealPlan, calorieGoal, proteinGoal, carbsGoal, fatGoal, todayStr: today, onQuickLog }) {
  const todayData = mealPlan[today];
  const macros = getDayMacros(todayData);

  const calTarget = calorieGoal || 2000;
  const pTarget = proteinGoal || 150;
  const cTarget = carbsGoal || 200;
  const fTarget = fatGoal || 65;

  const remaining = calTarget - macros.calories;
  const remainColor = remaining >= 0 ? "#22c55e" : "#ef4444";

  // Logging streak — delegated to math.ts
  const streak = useMemo(
    () =>
      calcMealLoggingStreak((ds) => {
        const d = mealPlan[ds];
        if (!d) return false;
        return MEAL_SLOTS.some((slot) => (d[slot] || []).length > 0);
      }),
    [mealPlan]
  );

  // Meal quality — delegated to math.ts
  const allMeals = useMemo(() => {
    if (!todayData) return [];
    return MEAL_SLOTS.flatMap((slot) => todayData[slot] || []);
  }, [todayData]);

  const avgQuality = useMemo(() => {
    if (allMeals.length === 0) return null;
    const scores = allMeals.map((m) => {
      const q = calcMealQuality(m.calories, m.protein);
      return q === "excellent" ? 3 : q === "good" ? 2 : 1;
    });
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= 2.5) return "excellent";
    if (avg >= 1.5) return "good";
    return "fair";
  }, [allMeals]);

  // Recent meals — last 3 unique names across all days
  const recentMeals = useMemo(() => {
    const seen = new Set();
    const result = [];
    const sortedDays = Object.keys(mealPlan).sort().reverse();
    for (const ds of sortedDays) {
      const day = mealPlan[ds];
      if (!day) continue;
      for (const slot of MEAL_SLOTS) {
        for (const meal of (day[slot] || []).slice().reverse()) {
          if (!seen.has(meal.name)) {
            seen.add(meal.name);
            result.push(meal);
            if (result.length >= 3) break;
          }
        }
        if (result.length >= 3) break;
      }
      if (result.length >= 3) break;
    }
    return result;
  }, [mealPlan]);

  return (
    <div style={{ ...S.card, marginBottom: 14 }}>
      {/* Streak + quality header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>
          {streak > 0
            ? `${streak} day logging streak`
            : "Start your streak today"}
        </div>
        {avgQuality && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: QUALITY_COLOR[avgQuality], fontWeight: 700 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: QUALITY_COLOR[avgQuality] }} />
            Today's Quality: {QUALITY_LABEL[avgQuality]}
          </div>
        )}
      </div>

      {/* 4 Rings */}
      <div
        style={{ display: "flex", justifyContent: "space-around", marginBottom: 14 }}
        role="region"
        aria-label="Today's macro progress"
      >
        <MacroRing value={macros.calories} goal={calTarget} color="#f59e0b" label="Calories" unit="cal" />
        <MacroRing value={macros.protein} goal={pTarget} color="#6366f1" label="Protein" unit="g" />
        <MacroRing value={macros.carbs} goal={cTarget} color="#14b8a6" label="Carbs" unit="g" />
        <MacroRing value={macros.fat} goal={fTarget} color="#f43f5e" label="Fat" unit="g" />
      </div>

      {/* Remaining calories */}
      <div
        style={{
          textAlign: "center",
          fontSize: 13,
          fontWeight: 700,
          color: remainColor,
          marginBottom: 14,
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {remaining >= 0
          ? `${remaining} cal remaining today`
          : `${Math.abs(remaining)} cal over target`}
      </div>

      {/* Trend + Donut side by side */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <NutritionTrendBars mealPlan={mealPlan} calorieGoal={calTarget} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 4 }}>
          <div style={{ ...S.sectionHeader, marginBottom: 8, textAlign: "center" }}>Macro Split</div>
          <MacroPieDonut protein={macros.protein} carbs={macros.carbs} fat={macros.fat} />
        </div>
      </div>

      {/* Recent meals quick-log chips */}
      {recentMeals.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={S.sectionHeader}>Recent Meals</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {recentMeals.map((meal) => (
              <button
                key={meal.name}
                style={{
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  borderRadius: 8,
                  padding: "5px 12px",
                  fontSize: 12,
                  color: "#818cf8",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: FONT,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
                onClick={() => onQuickLog && onQuickLog(meal)}
                data-meal-name={meal.name}
                data-meal-calories={meal.calories}
              >
                {meal.name}
                {meal.calories > 0 && (
                  <span style={{ color: "#6366f1", fontSize: 10 }}>{meal.calories} cal</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Water Tracker Widget ─────────────────────────────────────────────────────
function WaterTrackerWidget({ today: todayKey }) {
  // Persist waterLog in localStorage directly (not in app data blob)
  const [waterLog, setWaterLog] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(WATER_LOG_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [waterGoal, setWaterGoal] = useState(() => {
    const saved = parseInt(localStorage.getItem(WATER_LOG_KEY + "_goal") || "8", 10);
    return isNaN(saved) ? 8 : saved;
  });
  const [goalInput, setGoalInput] = useState(String(waterGoal));

  const saveLog = useCallback((nextLog) => {
    setWaterLog(nextLog);
    localStorage.setItem(WATER_LOG_KEY, JSON.stringify(nextLog));
  }, []);

  const todayEntry = waterLog.find((e) => e.date === todayKey);
  const todayGlasses = todayEntry ? todayEntry.glasses : 0;

  const addWater = useCallback((mlOrGlasses) => {
    const glassesToAdd = mlOrGlasses === "1L" ? 4 : mlOrGlasses === "500ml" ? 2 : 1;
    setWaterLog((prev) => {
      const idx = prev.findIndex((e) => e.date === todayKey);
      const next =
        idx >= 0
          ? prev.map((e, i) => (i === idx ? { ...e, glasses: e.glasses + glassesToAdd } : e))
          : [...prev, { date: todayKey, glasses: glassesToAdd }];
      localStorage.setItem(WATER_LOG_KEY, JSON.stringify(next));
      return next;
    });
  }, [todayKey]);

  const saveGoal = () => {
    const n = parseInt(goalInput, 10);
    if (!isNaN(n) && n > 0) {
      setWaterGoal(n);
      localStorage.setItem(WATER_LOG_KEY + "_goal", String(n));
    }
    setEditingGoal(false);
  };

  const streak = useMemo(
    () => calcWaterStreak(waterLog, waterGoal),
    [waterLog, waterGoal]
  );

  const remaining = Math.max(0, waterGoal - todayGlasses);
  let encouragement = "";
  if (todayGlasses >= waterGoal) {
    encouragement = "Goal reached! Great hydration today.";
  } else if (remaining === 1) {
    encouragement = "Almost there! Just 1 more glass to go.";
  } else if (remaining <= 3) {
    encouragement = "Almost there! " + remaining + " more to go.";
  } else {
    encouragement = "Keep sipping! " + remaining + " glasses to go.";
  }

  // prefers-reduced-motion: skip glass fill animation
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div style={{ ...S.card, marginBottom: 14 }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>💧</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>Water Intake</span>
          {streak > 0 && (
            <span style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.25)", borderRadius: 6, padding: "2px 8px" }}>
              {streak}d streak
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {editingGoal ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                style={{ ...S.input, width: 48, padding: "4px 8px", fontSize: 12, textAlign: "center" }}
                type="number"
                min="1"
                max="20"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveGoal()}
                autoFocus
              />
              <button style={{ ...S.btn, padding: "4px 10px", fontSize: 11 }} onClick={saveGoal}>OK</button>
            </div>
          ) : (
            <button
              style={{ ...S.btnGhost, padding: "4px 10px", fontSize: 11 }}
              onClick={() => { setGoalInput(String(waterGoal)); setEditingGoal(true); }}
            >
              Goal: {waterGoal} glasses
            </button>
          )}
        </div>
      </div>

      {/* Glass icons row */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}
        role="img"
        aria-label={"Water intake: " + todayGlasses + " of " + waterGoal + " glasses"}
      >
        {Array.from({ length: waterGoal }, (_, i) => {
          const filled = i < todayGlasses;
          return (
            <div
              key={i}
              title={filled ? "Logged" : "Not yet"}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: filled ? "rgba(56,189,248,0.25)" : "rgba(30,41,59,0.8)",
                border: filled ? "1px solid rgba(56,189,248,0.5)" : "1px solid rgba(51,65,85,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                transition: prefersReduced ? "none" : "background 0.2s, border-color 0.2s",
              }}
            >
              {filled ? "💧" : "○"}
            </div>
          );
        })}
      </div>

      {/* Count + encouragement */}
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, color: todayGlasses >= waterGoal ? "#38bdf8" : "#f1f5f9" }}>
          {todayGlasses} of {waterGoal} glasses
        </span>
        {" — "}{encouragement}
      </div>

      {/* Quick-add buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        {["+1 glass", "+500ml", "+1L"].map((label) => {
          const key = label === "+1 glass" ? "1glass" : label === "+500ml" ? "500ml" : "1L";
          return (
            <button
              key={label}
              style={{ ...S.btnGhost, padding: "6px 12px", fontSize: 12, borderColor: "rgba(56,189,248,0.3)", color: "#38bdf8" }}
              onClick={() => addWater(key === "1glass" ? "+1" : key)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Calorie Budget Bar ───────────────────────────────────────────────────────
function CalorieBudgetBar({ dayData, calorieGoal, proteinGoal, carbsGoal, fatGoal }) {
  const macros = getDayMacros(dayData);
  const hasTargets = calorieGoal > 0;

  if (!hasTargets) {
    return (
      <div style={{ ...S.card, marginBottom: 14, textAlign: "center" }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>
          Set your macro targets to see remaining budget →
        </span>
      </div>
    );
  }

  // Delegate to math.ts
  const budget = calcBudgetRemaining(
    { calories: macros.calories, protein: macros.protein, carbs: macros.carbs, fat: macros.fat },
    { calories: calorieGoal, protein: proteinGoal || 150, carbs: carbsGoal || 200, fat: fatGoal || 65 }
  );

  const calColor =
    budget.calories > 500
      ? "#22c55e"
      : budget.calories >= 100
      ? "#f59e0b"
      : budget.calories >= 0
      ? "#f97316"
      : "#ef4444";

  const pct = Math.round(budget.caloriePct * 100);

  const macroItems = [
    { label: "P", value: budget.protein, unit: "g", color: "#6366f1" },
    { label: "C", value: budget.carbs,   unit: "g", color: "#14b8a6" },
    { label: "F", value: budget.fat,     unit: "g", color: "#f43f5e" },
  ];

  return (
    <div style={{ ...S.card, marginBottom: 14 }}>
      <div style={S.sectionHeader}>Today's Budget Remaining</div>

      {/* Large remaining number */}
      <div
        style={{ textAlign: "center", marginBottom: 10 }}
        aria-live="polite"
        aria-atomic="true"
      >
        <span style={{ fontSize: 32, fontWeight: 900, color: calColor, lineHeight: 1 }}>
          {budget.calories >= 0 ? budget.calories : Math.abs(budget.calories)}
        </span>
        <span style={{ fontSize: 13, color: "#64748b", marginLeft: 6 }}>
          {budget.calories >= 0 ? "kcal remaining" : "kcal over budget"}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, background: "rgba(51,65,85,0.5)", borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: (pct > 100 ? 100 : pct) + "%" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            height: "100%",
            borderRadius: 99,
            background: budget.calories < 0 ? "#ef4444" : calColor,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: "#475569" }}>{macros.calories} logged</span>
        <span style={{ fontSize: 10, color: "#475569" }}>{calorieGoal} target</span>
      </div>

      {/* Remaining macros row */}
      <div style={{ display: "flex", gap: 12 }}>
        {macroItems.map((m) => (
          <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, color: m.color, fontWeight: 700 }}>{m.label}:</span>
            <span style={{ fontSize: 11, color: m.value >= 0 ? "#94a3b8" : "#ef4444", fontWeight: 600 }}>
              {m.value >= 0 ? "+" : ""}{m.value}{m.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Smart Meal Suggestions ───────────────────────────────────────────────────
function SmartMealSuggestions({ dayData, calorieGoal, proteinGoal, carbsGoal, fatGoal, onAddToLog }) {
  const macros = getDayMacros(dayData);
  const calTarget = calorieGoal || 2000;
  const pTarget = proteinGoal || 150;
  const cTarget = carbsGoal || 200;

  const proteinGap = pTarget - macros.protein;
  const carbsGap = cTarget - macros.carbs;
  const calRemaining = calTarget - macros.calories;

  // Pick up to 3 suggestions based on macro gaps
  const suggestions = useMemo(() => {
    const candidates = [];

    if (calRemaining > 800) {
      // Very low calories — suggest a complete meal first
      candidates.push(...SUGGESTION_LIBRARY.filter((m) => m.calories >= 400));
    }
    if (proteinGap > 20) {
      candidates.push(...SUGGESTION_LIBRARY.filter((m) => m.protein >= 15 && m.calories < 300));
    }
    if (carbsGap > 30) {
      candidates.push(...SUGGESTION_LIBRARY.filter((m) => m.carbs >= 30));
    }
    // Deduplicate by name and take first 3
    const seen = new Set();
    const unique = [];
    for (const c of candidates) {
      if (!seen.has(c.name)) {
        seen.add(c.name);
        unique.push(c);
      }
      if (unique.length >= 3) break;
    }
    // Fallback: if nothing yet, pick top 3 by protein
    if (unique.length === 0) {
      return [...SUGGESTION_LIBRARY].sort((a, b) => b.protein - a.protein).slice(0, 3);
    }
    return unique;
  }, [proteinGap, carbsGap, calRemaining]);

  if (suggestions.length === 0) return null;

  return (
    <div style={{ ...S.card, marginBottom: 14 }}>
      <div style={S.sectionHeader}>Suggestions for Today</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {suggestions.map((meal) => (
          <div
            key={meal.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(15,23,42,0.5)",
              borderRadius: 10,
              padding: "10px 12px",
              border: "1px solid rgba(51,65,85,0.3)",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 3 }}>
                {meal.name}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 600 }}>P {meal.protein}g</span>
                <span style={{ fontSize: 11, color: "#14b8a6", fontWeight: 600 }}>C {meal.carbs}g</span>
                <span style={{ fontSize: 11, color: "#f43f5e", fontWeight: 600 }}>F {meal.fat}g</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{meal.calories} kcal</span>
              </div>
            </div>
            <button
              style={{ ...S.btn, fontSize: 11, padding: "5px 12px", flexShrink: 0 }}
              onClick={() => onAddToLog && onAddToLog(meal)}
            >
              + Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Meal Timing Insights ─────────────────────────────────────────────────────
function MealTimingInsights({ dayData }) {
  // Delegate spacing math to math.ts
  const spacing = useMemo(() => calcMealSpacing(dayData), [dayData]);

  if (spacing.avgHoursBetween === null) return null;

  const isGood = spacing.avgHoursBetween <= 4.5 && spacing.largeGaps.length === 0;

  return (
    <div style={{ ...S.card, marginBottom: 14 }}>
      <div style={S.sectionHeader}>Meal Spacing</div>
      <div style={{ marginBottom: spacing.largeGaps.length > 0 ? 8 : 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: isGood ? "#22c55e" : "#f59e0b" }}>
          {"Avg " + spacing.avgHoursBetween + "h between meals " + (isGood ? "✓ Good spacing" : "")}
        </span>
      </div>
      {spacing.largeGaps.map((gap, i) => (
        <div key={i} style={{ fontSize: 12, color: "#f59e0b", marginBottom: 4 }}>
          {"⚠ Large gap between " + gap.fromSlot + " and " + gap.toSlot + " (" + gap.hours + "h)"}
        </div>
      ))}
    </div>
  );
}

// ─── Meal Prep Grid ───────────────────────────────────────────────────────────
function MealPrepGrid({ mealPlan, calorieGoal }) {
  const [open, setOpen] = useState(false);
  const [grid, setGrid] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("up_mealPrepGrid") || "null");
      return saved || EMPTY_PREP_GRID;
    } catch {
      return EMPTY_PREP_GRID;
    }
  });
  const [copyMsg, setCopyMsg] = useState("");
  const copyTimer = useRef(null);

  const updateCell = useCallback((day, slot, value) => {
    setGrid((prev) => {
      const next = { ...prev, [day]: { ...prev[day], [slot]: value } };
      localStorage.setItem("up_mealPrepGrid", JSON.stringify(next));
      return next;
    });
  }, []);

  const copyPlan = () => {
    const lines = ["Weekly Meal Plan", "================"];
    PREP_DAYS.forEach((d) => {
      lines.push("\n" + d);
      PREP_SLOTS.forEach((s) => {
        const val = grid[d]?.[s] || "—";
        lines.push("  " + s.charAt(0).toUpperCase() + s.slice(1) + ": " + val);
      });
    });
    const text = lines.join("\n");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        clearTimeout(copyTimer.current);
        setCopyMsg("Copied!");
        copyTimer.current = setTimeout(() => setCopyMsg(""), 2500);
      });
    }
  };

  // Check if a cell value matches a library entry (for macro preview)
  const getLibraryMatch = (cellValue) => {
    if (!cellValue) return null;
    const lower = cellValue.toLowerCase();
    return SUGGESTION_LIBRARY.find((m) => m.name.toLowerCase().includes(lower) || lower.includes(m.name.toLowerCase().split(" ")[0])) || null;
  };

  // Total planned calories per day
  const dayCalories = (day) => {
    let cals = 0;
    PREP_SLOTS.forEach((s) => {
      const match = getLibraryMatch(grid[day]?.[s] || "");
      if (match) cals += match.calories;
    });
    return cals;
  };

  return (
    <div style={{ ...S.card, marginBottom: 14 }}>
      {/* Collapsible header */}
      <button
        style={{
          background: "none",
          border: "none",
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          padding: 0,
          fontFamily: "'DM Sans', sans-serif",
        }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span style={{ ...S.sectionHeader, marginBottom: 0 }}>Meal Prep Planner</span>
        <span style={{ fontSize: 16, color: "#94a3b8", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ marginTop: 14 }}>
              {/* 7-col grid — scrollable */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", minWidth: 560, width: "100%", fontFamily: "'DM Sans', sans-serif" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 80, padding: "4px 8px", fontSize: 10, color: "#475569", textAlign: "left" }}>Slot</th>
                      {PREP_DAYS.map((d) => {
                        const cals = dayCalories(d);
                        return (
                          <th key={d} style={{ padding: "4px 6px", fontSize: 11, color: "#94a3b8", fontWeight: 700, textAlign: "center", minWidth: 80 }}>
                            {d}
                            {cals > 0 && (
                              <div style={{ fontSize: 9, color: cals > (calorieGoal || 2000) ? "#ef4444" : "#22c55e", fontWeight: 600 }}>
                                {cals} cal
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {PREP_SLOTS.map((slot) => (
                      <tr key={slot}>
                        <td style={{ padding: "4px 8px", fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "capitalize", verticalAlign: "top" }}>
                          {slot}
                        </td>
                        {PREP_DAYS.map((d) => {
                          const match = getLibraryMatch(grid[d]?.[slot] || "");
                          return (
                            <td key={d} style={{ padding: "3px 4px", verticalAlign: "top" }}>
                              <div style={{ position: "relative" }}>
                                <input
                                  style={{
                                    ...S.input,
                                    fontSize: 11,
                                    padding: "5px 7px",
                                    borderColor: match ? "rgba(34,197,94,0.35)" : "rgba(51,65,85,0.5)",
                                  }}
                                  placeholder="—"
                                  value={grid[d]?.[slot] || ""}
                                  onChange={(e) => updateCell(d, slot, e.target.value)}
                                />
                                {match && (
                                  <div style={{ fontSize: 9, color: "#22c55e", marginTop: 2, paddingLeft: 2 }}>
                                    {match.calories} cal
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Copy button */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                {copyMsg && (
                  <span style={{ fontSize: 12, color: ACCENT, fontWeight: 700, alignSelf: "center" }}>{copyMsg}</span>
                )}
                <button style={{ ...S.btnGhost, fontSize: 12, padding: "6px 14px" }} onClick={copyPlan}>
                  Copy Plan
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MealPlannerTab({ data, onChange }) {
  const today = todayStr();
  const weekDates = useMemo(() => getWeekDates(today), [today]);

  const [selectedDay, setSelectedDay] = useState(today);
  const [activeTab, setActiveTab] = useState("plan"); // "plan" | "grocery"
  const [modal, setModal] = useState(null); // { dateStr, slot } | null

  const mealPlan = data.mealPlan || {};
  const groceryList = data.groceryList || [];
  const favoriteMeals = data.favoriteMeals || [];
  const calorieGoal = data.calorieGoal || (data.bodyStats?.goal === "lose" ? 1600 : data.bodyStats?.goal === "gain" ? 2800 : 2000);
  const bodyWeight = data.bodyStats?.weight || 0;

  // Macro targets — prefer profile macros, fall back to safe defaults
  const proteinGoal = data.macroTargets?.protein || 150;
  const carbsGoal = data.macroTargets?.carbs || 200;
  const fatGoal = data.macroTargets?.fat || 65;

  // All meal names from this week (for grocery generation)
  const weekMealNames = useMemo(() => {
    const names = new Set();
    weekDates.forEach((d) => {
      const day = mealPlan[d];
      if (!day) return;
      MEAL_SLOTS.forEach((slot) => {
        (day[slot] || []).forEach((m) => names.add(m.name));
      });
    });
    return Array.from(names);
  }, [mealPlan, weekDates]);

  const openModal = (ds, slot) => {
    setModal({ dateStr: ds, slot });
  };

  // Auto-open modal pre-filled when AI scanner passes a meal
  useEffect(() => {
    if (data._scannedMeal) {
      setModal({ dateStr: today, slot: "lunch", prefill: data._scannedMeal });
      onChange((p) => { const n = { ...p }; delete n._scannedMeal; return n; });
    }
  }, [data._scannedMeal]);

  const closeModal = () => setModal(null);

  const saveMeal = (meal) => {
    if (!modal) return;
    const { dateStr: ds, slot } = modal;
    onChange((d) => {
      const plan = { ...(d.mealPlan || {}) };
      const day = { breakfast: [], lunch: [], dinner: [], snacks: [], ...(plan[ds] || {}) };
      day[slot] = [...(day[slot] || []), { id: meal.id, name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, notes: meal.notes, timestamp: Date.now() }];
      plan[ds] = day;

      let favs = d.favoriteMeals || [];
      if (meal.addToFavorites && !favs.find((f) => f.name.toLowerCase() === meal.name.toLowerCase())) {
        favs = [...favs, { id: uid(), name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, notes: meal.notes }];
      }

      return { ...d, mealPlan: plan, favoriteMeals: favs };
    });
    closeModal();
  };

  const removeMeal = (ds, slot, mealId) => {
    onChange((d) => {
      const plan = { ...(d.mealPlan || {}) };
      const day = { ...(plan[ds] || {}) };
      day[slot] = (day[slot] || []).filter((m) => m.id !== mealId);
      plan[ds] = day;
      return { ...d, mealPlan: plan };
    });
  };

  const quickAddFav = (fav) => {
    const slot = getCurrentNextSlot();
    onChange((d) => {
      const plan = { ...(d.mealPlan || {}) };
      const day = { breakfast: [], lunch: [], dinner: [], snacks: [], ...(plan[selectedDay] || {}) };
      day[slot] = [...(day[slot] || []), { id: uid(), name: fav.name, calories: fav.calories || 0, protein: fav.protein || 0, carbs: fav.carbs || 0, fat: fav.fat || 0, notes: fav.notes || "" }];
      plan[selectedDay] = day;
      return { ...d, mealPlan: plan };
    });
  };

  const removeFav = (favId) => {
    onChange((d) => ({
      ...d,
      favoriteMeals: (d.favoriteMeals || []).filter((f) => f.id !== favId),
    }));
  };

  const getCurrentNextSlot = () => {
    const hour = new Date().getHours();
    if (hour < 10) return "breakfast";
    if (hour < 13) return "lunch";
    if (hour < 18) return "dinner";
    return "snacks";
  };

  // Quick-log a recent meal directly to today's next slot (no modal)
  const quickLogRecentMeal = (meal) => {
    const slot = getCurrentNextSlot();
    onChange((d) => {
      const plan = { ...(d.mealPlan || {}) };
      const day = { breakfast: [], lunch: [], dinner: [], snacks: [], ...(plan[today] || {}) };
      day[slot] = [
        ...(day[slot] || []),
        { id: uid(), name: meal.name, calories: meal.calories || 0, protein: meal.protein || 0, carbs: meal.carbs || 0, fat: meal.fat || 0, notes: meal.notes || "" },
      ];
      plan[today] = day;
      return { ...d, mealPlan: plan };
    });
  };

  // Quick-log a suggestion from the meal library to today's next slot
  const quickLogSuggestion = useCallback((meal) => {
    const slot = getCurrentNextSlot();
    onChange((d) => {
      const plan = { ...(d.mealPlan || {}) };
      const day = { breakfast: [], lunch: [], dinner: [], snacks: [], ...(plan[today] || {}) };
      day[slot] = [
        ...(day[slot] || []),
        { id: uid(), name: meal.name, calories: meal.calories || 0, protein: meal.protein || 0, carbs: meal.carbs || 0, fat: meal.fat || 0, notes: "", timestamp: Date.now() },
      ];
      plan[today] = day;
      return { ...d, mealPlan: plan };
    });
  }, [today, onChange]);

  const selectedDayData = mealPlan[selectedDay];

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>
          🥗 Meal Planner
        </div>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          Week of {getDateLabel(weekDates[0])} – {getDateLabel(weekDates[6])}
        </div>
      </div>

      {/* Water Tracker — always visible at top */}
      <WaterTrackerWidget today={today} />

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button style={S.tabBtn(activeTab === "plan")} onClick={() => setActiveTab("plan")}>
          📅 Meal Plan
        </button>
        <button style={S.tabBtn(activeTab === "grocery")} onClick={() => setActiveTab("grocery")}>
          🛒 Grocery List
        </button>
      </div>

      {activeTab === "plan" && (
        <>
          {/* Calorie Budget Bar — prominent remaining budget for today */}
          <CalorieBudgetBar
            dayData={mealPlan[today]}
            calorieGoal={calorieGoal}
            proteinGoal={proteinGoal}
            carbsGoal={carbsGoal}
            fatGoal={fatGoal}
          />

          {/* Daily Macro Dashboard — streak, rings, trend, donut, recent meals */}
          <DailyMacroDashboard
            mealPlan={mealPlan}
            calorieGoal={calorieGoal}
            proteinGoal={proteinGoal}
            carbsGoal={carbsGoal}
            fatGoal={fatGoal}
            todayStr={today}
            onQuickLog={quickLogRecentMeal}
          />

          {/* Smart Meal Suggestions */}
          <SmartMealSuggestions
            dayData={mealPlan[today]}
            calorieGoal={calorieGoal}
            proteinGoal={proteinGoal}
            carbsGoal={carbsGoal}
            fatGoal={fatGoal}
            onAddToLog={quickLogSuggestion}
          />

          {/* Favorites quick-add */}
          <FavoriteMealsSection
            favoriteMeals={favoriteMeals}
            onQuickAdd={quickAddFav}
            onRemoveFav={removeFav}
          />

          {/* Week Grid — scrollable horizontally */}
          <div style={{ overflowX: "auto", marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 10, minWidth: 700 }}>
              {weekDates.map((ds) => (
                <DayColumn
                  key={ds}
                  dateStr={ds}
                  dayData={mealPlan[ds]}
                  isSelected={selectedDay === ds}
                  isToday={ds === today}
                  calorieGoal={calorieGoal}
                  onSelectDay={setSelectedDay}
                  onAddMeal={openModal}
                  onRemoveMeal={removeMeal}
                />
              ))}
            </div>
          </div>

          {/* Daily Macro Summary */}
          <MacroSummaryPanel
            dateStr={selectedDay}
            dayData={selectedDayData}
            calorieGoal={calorieGoal}
            bodyWeight={bodyWeight}
          />

          {/* Meal Timing Insights — only shown when selected day has timed meals */}
          <MealTimingInsights dayData={selectedDayData} />

          {/* Meal Prep Planner — collapsible weekly grid */}
          <MealPrepGrid mealPlan={mealPlan} calorieGoal={calorieGoal} />
        </>
      )}

      {activeTab === "grocery" && (
        <GroceryListSection
          groceryList={groceryList}
          onChange={onChange}
          weekMealNames={weekMealNames}
        />
      )}

      {/* Add Meal Modal */}
      <AddMealModal
        open={!!modal}
        onClose={closeModal}
        onSave={saveMeal}
        favoriteMeals={favoriteMeals}
        targetSlot={modal?.slot}
        prefill={modal?.prefill}
      />
    </div>
  );
}

// ─── Dashboard Widget ─────────────────────────────────────────────────────────
export function MealPlannerDashWidget({ data, onNavigate }) {
  const today = todayStr();
  const mealPlan = data.mealPlan || {};
  const todayData = mealPlan[today];
  const calorieGoal = data.calorieGoal || (data.bodyStats?.goal === "lose" ? 1600 : data.bodyStats?.goal === "gain" ? 2800 : 2000);

  const macros = getDayMacros(todayData);
  const pct = Math.min(100, calorieGoal > 0 ? Math.round((macros.calories / calorieGoal) * 100) : 0);

  const hour = new Date().getHours();
  const nextSlot = hour < 10 ? "Breakfast" : hour < 13 ? "Lunch" : hour < 18 ? "Dinner" : "Snacks";

  return (
    <div
      onClick={onNavigate}
      style={{
        ...S.card,
        cursor: "pointer",
        marginBottom: 0,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(34,197,94,0.35)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(51,65,85,0.4)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
            Today's Nutrition
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: ACCENT, marginTop: 2 }}>
            {macros.calories}
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginLeft: 4 }}>
              / {calorieGoal} kcal
            </span>
          </div>
        </div>
        <span style={{ fontSize: 20 }}>🥗</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: "rgba(51,65,85,0.5)", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            height: "100%",
            borderRadius: 99,
            background: pct > 110 ? "#ef4444" : ACCENT,
          }}
        />
      </div>

      {/* Macro chips */}
      {(macros.protein > 0 || macros.carbs > 0 || macros.fat > 0) && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {[
            { label: "P", value: macros.protein, color: "#6366f1" },
            { label: "C", value: macros.carbs, color: "#f59e0b" },
            { label: "F", value: macros.fat, color: "#ef4444" },
          ].map((m) => (
            <span key={m.label} style={{ fontSize: 11, color: m.color, fontWeight: 700 }}>
              {m.label} {m.value}g
            </span>
          ))}
        </div>
      )}

      {/* Next slot */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Next: <span style={{ color: "#94a3b8", fontWeight: 600 }}>{nextSlot}</span>
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(); }}
          style={{ ...S.btn, fontSize: 11, padding: "5px 12px" }}
        >
          + Log
        </button>
      </div>
    </div>
  );
}
