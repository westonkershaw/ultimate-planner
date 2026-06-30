/* eslint-disable */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import CalendarEditForm, { fmtTime, buildTimeOptions } from "./CalendarEditForm.jsx";

const SPRING = { type: "spring", stiffness: 400, damping: 30 };

/**
 * Full-screen modal for editing a calendar item (task, event, or meal).
 *
 * Props:
 *   item     -- calendar item with _k, _day, _date, _h, _m, _dur, etc.
 *   onSave   -- (item, updates) => void
 *   onDelete -- (item) => void
 *   onClose  -- () => void
 */
export default function CalendarEditModal({ item, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(item.title || item.name || "");
  const [startTime, setStartTime] = useState(`${item._h}:${item._m}`);
  const [endTime, setEndTime] = useState(() => {
    const endM = item._h * 60 + item._m + (item._dur || 60);
    return `${Math.floor(endM / 60) % 24}:${endM % 60}`;
  });
  const [type, setType] = useState(item.type || "work");
  const [notes, setNotes] = useState(item.notes || "");
  const [color, setColor] = useState(item.color || item._clr || "#4f9cf9");

  const inputRef = useRef(null);
  const timeOpts = useMemo(buildTimeOptions, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const [sH, sM] = startTime.split(":").map(Number);
  const [eH, eM] = endTime.split(":").map(Number);
  const startTotal = sH * 60 + sM;
  const endTotal = eH * 60 + eM;
  const duration = endTotal - startTotal;
  const valid = title.trim() && endTotal > startTotal;

  const handleStartChange = (val) => {
    setStartTime(val);
    const [h, m] = val.split(":").map(Number);
    const newEnd = Math.min(h * 60 + m + Math.max(duration, 15), 24 * 60 - 15);
    setEndTime(`${Math.floor(newEnd / 60)}:${newEnd % 60}`);
  };

  const handleSave = () => {
    if (!valid) return;
    const updates = {
      title: title.trim(), startTime: fmtTime(sH, sM),
      endTime: fmtTime(eH, eM), time: fmtTime(sH, sM),
      type, notes, color,
    };
    if (item._k === "meal") updates.name = title.trim();
    onSave(item, updates);
  };

  const kind = item._k || "event";
  const kindLabel = kind === "task" ? "Task" : kind === "meal" ? "Meal" : "Event";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 12, opacity: 0 }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f1117",
          border: "1px solid rgba(51,65,85,0.6)",
          borderRadius: 16, padding: 24,
          width: 380, maxWidth: "92vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(45, 212, 191,0.06)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: kind === "task" ? "rgba(79,156,249,0.15)" : kind === "meal" ? "rgba(52,201,138,0.15)" : "rgba(192,132,252,0.15)",
              color: kind === "task" ? "#4f9cf9" : kind === "meal" ? "#34c98a" : "#c084fc",
              borderRadius: 6, padding: "3px 8px", textTransform: "uppercase", letterSpacing: "0.5px",
            }}>
              {kindLabel}
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>Edit {kindLabel}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 18, cursor: "pointer", padding: "2px 6px", borderRadius: 6 }}>&times;</button>
        </div>

        <CalendarEditForm
          title={title} setTitle={setTitle}
          startTime={startTime} onStartChange={handleStartChange}
          endTime={endTime} setEndTime={setEndTime}
          startTotal={startTotal} duration={duration}
          type={type} setType={setType}
          color={color} setColor={setColor}
          notes={notes} setNotes={setNotes}
          kind={kind} onSave={handleSave}
          inputRef={inputRef} timeOpts={timeOpts}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSave} disabled={!valid} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
            cursor: valid ? "pointer" : "not-allowed",
            background: valid ? "linear-gradient(135deg, #14b8a6, #0e9488)" : "rgba(45, 212, 191,0.2)",
            border: "none", color: "#fff", fontFamily: "'DM Sans', sans-serif",
            opacity: valid ? 1 : 0.5, transition: "all 0.15s",
          }}>Save Changes</button>
          <button onClick={() => onDelete(item)} style={{
            padding: "10px 16px", borderRadius: 10, fontSize: 13, cursor: "pointer",
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
            color: "#f87171", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
          }}>Delete</button>
          <button onClick={onClose} style={{
            padding: "10px 16px", borderRadius: 10, fontSize: 13, cursor: "pointer",
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif",
          }}>Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
