/* eslint-disable */
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { timeToSlotIndex, blockDurationSlots, formatSlotTime } from "../utils/math";
import { isConnected as isGcalConnected, syncCalendar, requestCalendarAccess, clearToken, createEvent, updateEvent, deleteEvent, getStoredToken } from "../utils/googleCalendar";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCenter,
} from "@dnd-kit/core";

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS       = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY_SHORT  = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
const HOUR_START = 0;   // midnight — full day like Google Calendar
const HOUR_END   = 24;
const HOUR_H     = 64;  // px per hour
const GUTTER_W   = 48;  // time label column width
const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const COLORS = ["#4285f4","#0f9d58","#db4437","#f4b400","#ab47bc","#00acc1","#ff7043","#607d8b"];

const DUR_OPTS = [
  { label: "30m", hours: 0, mins: 30 },
  { label: "1h",  hours: 1, mins: 0  },
  { label: "1.5h",hours: 1, mins: 30 },
  { label: "2h",  hours: 2, mins: 0  },
];

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayName = () => DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

const nowFraction = () => {
  const n = new Date();
  return n.getHours() + n.getMinutes() / 60;
};

// Returns Monday-anchored week dates for a given reference Date
const getWeekDates = (refDate) => {
  const d = new Date(refDate);
  const dow = d.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return DAYS.map((_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + mondayOffset + i);
    return x;
  });
};

const fmtHour = (h) => {
  if (h === 0)  return "12 AM";
  if (h < 12)  return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
};

const fmtBlockTime = (h, m) => {
  const suffix = h < 12 ? "AM" : "PM";
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hh} ${suffix}` : `${hh}:${String(m).padStart(2,"0")} ${suffix}`;
};

const yToTime = (yPx, containerTop) => {
  const relY = yPx - containerTop;
  const rawHour = relY / HOUR_H;
  const hour = Math.max(0, Math.min(23, Math.floor(rawHour)));
  const minuteRaw = (rawHour - hour) * 60;
  const minute = minuteRaw < 30 ? 0 : 30;
  return { hour, minute };
};

// ─── Add-Event Popup ──────────────────────────────────────────────────────────
function AddEventPopup({ day, hour, minute, anchorX, anchorY, containerRect, onSave, onCancel }) {
  const [title,   setTitle]   = useState("");
  const [dur,     setDur]     = useState(DUR_OPTS[1]);
  const [color,   setColor]   = useState(COLORS[0]);
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const endTotal = hour * 60 + minute + dur.hours * 60 + dur.mins;
  const endH = Math.min(23, Math.floor(endTotal / 60));
  const endM = endTotal % 60;

  const save = () => {
    if (!title.trim()) return;
    onSave({
      id: uid(), day, title: title.trim(), color,
      startHour: hour, startMin: minute,
      endHour: endH, endMin: endM,
    });
  };

  // Position popup near click but keep inside viewport
  const popW = 260;
  const popH = 220;
  let left = anchorX - (containerRect?.left ?? 0) + 8;
  let top  = anchorY - (containerRect?.top  ?? 0) + 8;
  if (containerRect) {
    if (left + popW > containerRect.width)  left = containerRect.width  - popW - 8;
    if (top  + popH > containerRect.height) top  = containerRect.height - popH - 8;
    if (left < 0) left = 8;
    if (top  < 0) top  = 8;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={e => e.stopPropagation()}
      style={{
        position: "absolute", left, top, zIndex: 200,
        width: popW,
        background: "#1e2128",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: "14px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Time label */}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
        {fmtBlockTime(hour, minute)} — {fmtBlockTime(endH, endM)} · {day}
      </div>

      {/* Title input */}
      <input
        ref={ref}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onCancel(); }}
        placeholder="Add title"
        style={{
          width: "100%", boxSizing: "border-box",
          background: "transparent",
          border: "none",
          borderBottom: "2px solid #4285f4",
          outline: "none",
          color: "#fff",
          fontSize: 15,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          padding: "4px 0 6px",
          marginBottom: 12,
        }}
      />

      {/* Duration */}
      <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
        {DUR_OPTS.map(o => (
          <button
            key={o.label}
            onClick={() => setDur(o)}
            style={{
              flex: 1, padding: "4px 0",
              borderRadius: 6,
              fontSize: 11, fontWeight: 600,
              cursor: "pointer",
              border: "1px solid",
              background:  dur === o ? "#4285f4" : "rgba(66,133,244,0.1)",
              borderColor: dur === o ? "#4285f4" : "rgba(66,133,244,0.25)",
              color:       dur === o ? "#fff"    : "#8ab4f8",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >{o.label}</button>
        ))}
      </div>

      {/* Colors */}
      <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 16, height: 16, borderRadius: "50%",
              cursor: "pointer", background: c, padding: 0,
              border: color === c ? "2px solid #fff" : "2px solid transparent",
              boxSizing: "border-box",
            }}
          />
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={save}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: "#4285f4", border: "none", color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >Add</button>
        <button
          onClick={onCancel}
          style={{
            padding: "7px 14px", borderRadius: 8,
            fontSize: 13, cursor: "pointer",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.55)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >Cancel</button>
      </div>
    </motion.div>
  );
}

// ─── Drag overlay preview (shown while dragging) ─────────────────────────────
function DragOverlayCard({ block }) {
  if (!block) return null;
  const heightPx = Math.max(24, ((block.endHour + block.endMin / 60) - (block.startHour + block.startMin / 60)) * HOUR_H - 2);
  const compact  = heightPx < 36;
  const timeStr = `${fmtBlockTime(block.startHour, block.startMin)} – ${fmtBlockTime(block.endHour, block.endMin)}`;

  return (
    <div
      style={{
        width: 140,
        height: Math.min(heightPx, 80),
        borderRadius: 8,
        padding: compact ? "2px 8px" : "6px 10px",
        overflow: "hidden",
        background: block.color,
        borderLeft: `4px solid ${block.color}`,
        boxSizing: "border-box",
        userSelect: "none",
        boxShadow: "0 12px 32px rgba(0,0,0,0.55), 0 0 0 2px rgba(99,102,241,0.5)",
        opacity: 0.92,
        transform: "scale(1.04)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {compact ? (
        <div style={{
          fontSize: 11, fontWeight: 600, color: "#fff",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          lineHeight: 1.3,
        }}>
          {block.title}
        </div>
      ) : (
        <>
          <div style={{
            fontSize: 12, fontWeight: 700, color: "#fff",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}>
            {block.title}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2, fontWeight: 500 }}>
            {timeStr}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Event Card (draggable) ──────────────────────────────────────────────────
function EventCard({ block, onDelete, onEdit, isDragging: isDraggingProp }) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: block.id,
    data: { block },
  });

  useEffect(() => {
    if (!menu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menu]);

  // Close menu when drag starts
  useEffect(() => {
    if (isDragging) setMenu(false);
  }, [isDragging]);

  const topPx   = (block.startHour + block.startMin / 60) * HOUR_H;
  const heightPx = Math.max(24, ((block.endHour + block.endMin / 60) - (block.startHour + block.startMin / 60)) * HOUR_H - 2);
  const compact  = heightPx < 36;

  const timeStr = `${fmtBlockTime(block.startHour, block.startMin)} – ${fmtBlockTime(block.endHour, block.endMin)}`;

  // When being dragged, apply transform offset; when overlay is active, ghost original
  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : {};

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={e => {
        if (isDragging) return;
        e.stopPropagation();
        setMenu(v => !v);
      }}
      style={{
        position: "absolute",
        top: topPx + 1,
        left: 2,
        right: 2,
        height: heightPx,
        borderRadius: 8,
        padding: compact ? "2px 8px" : "6px 10px",
        overflow: "hidden",
        zIndex: isDragging ? 50 : 10,
        cursor: isDragging ? "grabbing" : "grab",
        background: block.color,
        borderLeft: `4px solid ${block.color}`,
        boxSizing: "border-box",
        userSelect: "none",
        transition: isDragging ? "none" : "box-shadow 0.15s, filter 0.15s, opacity 0.15s",
        boxShadow: isDragging ? "0 12px 32px rgba(0,0,0,0.5)" : "0 1px 3px rgba(0,0,0,0.3)",
        opacity: isDragging ? 0.35 : 1,
        touchAction: "none",
        ...dragStyle,
      }}
      onMouseEnter={e => { if (!isDragging) { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)"; } }}
      onMouseLeave={e => { if (!isDragging) { e.currentTarget.style.filter = "brightness(1)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)"; } }}
    >
      {compact ? (
        <div style={{
          fontSize: 11, fontWeight: 600, color: "#fff",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          lineHeight: 1.3,
        }}>
          {block.title}, {timeStr}
        </div>
      ) : (
        <>
          <div style={{
            fontSize: 12, fontWeight: 700, color: "#fff",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}>
            {block.title}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2, fontWeight: 500 }}>
            {timeStr}
          </div>
        </>
      )}

      <AnimatePresence>
        {menu && !isDragging && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", top: "100%", left: 0,
              zIndex: 100,
              minWidth: 140,
              background: "#1e2128",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            <button
              onClick={() => { onEdit(block); setMenu(false); }}
              style={{
                display: "block", width: "100%", padding: "9px 14px",
                textAlign: "left", background: "none", border: "none",
                color: "#e8eaed", fontSize: 13,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >Edit</button>
            <button
              onClick={() => { onDelete(block.id); setMenu(false); }}
              style={{
                display: "block", width: "100%", padding: "9px 14px",
                textAlign: "left", background: "none", border: "none",
                color: "#f28b82", fontSize: 13,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(242,139,130,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >Delete</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mini Month Calendar (Google Calendar style) ─────────────────────────────
function MiniCalendar({ weekOffset, onWeekOffsetChange, selectedDay, onDayChange, onViewChange }) {
  const today = new Date();
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [displayYear, setDisplayYear] = useState(today.getFullYear());

  const firstDay = new Date(displayYear, displayMonth, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();

  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const prevMonth = () => {
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear(displayYear - 1); }
    else setDisplayMonth(displayMonth - 1);
  };
  const nextMonth = () => {
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear(displayYear + 1); }
    else setDisplayMonth(displayMonth + 1);
  };

  const handleDateClick = (day) => {
    const clicked = new Date(displayYear, displayMonth, day);
    const dow = clicked.getDay();
    const dayName = DAYS[dow === 0 ? 6 : dow - 1];
    // Calculate week offset from current week
    const diff = Math.round((clicked - today) / (7 * 24 * 60 * 60 * 1000));
    onWeekOffsetChange(diff);
    onDayChange(dayName);
    onViewChange("day");
  };

  // Build grid cells
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ padding: "12px 10px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Month header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)", fontFamily: "'DM Sans', sans-serif" }}>
          {MONTHS[displayMonth]} {displayYear}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 4 }}>‹</button>
          <button onClick={nextMonth} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 4 }}>›</button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, marginBottom: 2 }}>
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.3)", padding: "2px 0", fontFamily: "'DM Sans', sans-serif" }}>{d}</div>
        ))}
      </div>

      {/* Date grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const isToday = day === todayDate && displayMonth === todayMonth && displayYear === todayYear;
          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              style={{
                width: 24, height: 24, margin: "1px auto",
                borderRadius: "50%",
                border: "none",
                background: isToday ? "#4285f4" : "transparent",
                color: isToday ? "#fff" : "rgba(255,255,255,0.6)",
                fontSize: 11, fontWeight: isToday ? 700 : 400,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = "transparent"; }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Task Sidebar (inline, no animation wrapper — parent handles animation) ──
function TaskSidebar({ weekDays }) {
  const tasks = useMemo(() =>
    DAYS.flatMap(day => (weekDays?.[day]?.tasks || []).filter(t => !t.done).map(t => ({ ...t, day })))
  , [weekDays]);

  return (
    <div style={{ padding: "8px 12px" }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Unscheduled tasks
      </div>

      {!tasks.length && (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", paddingTop: 12 }}>
          All tasks scheduled
        </div>
      )}

      {DAYS.map(day => {
        const dt = tasks.filter(t => t.day === day);
        if (!dt.length) return null;
        return (
          <div key={day} style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase", letterSpacing: "0.8px",
              marginBottom: 5,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {day.slice(0, 3)}
            </div>
            {dt.map(t => (
              <div
                key={t.id}
                draggable
                onDragStart={e => e.dataTransfer.setData("text/plain", JSON.stringify(t))}
                style={{
                  display: "flex", alignItems: "center",
                  padding: "6px 9px",
                  borderRadius: 6,
                  fontSize: 11, fontWeight: 500,
                  cursor: "grab", userSelect: "none",
                  background: "rgba(66,133,244,0.1)",
                  border: "1px solid rgba(66,133,244,0.2)",
                  color: "#8ab4f8",
                  marginBottom: 4,
                  overflow: "hidden",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.title}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Droppable Day Column ─────────────────────────────────────────────────────
function DroppableDayColumn({ dayKey, isToday, children, style, onClick, onLegacyDragOver, onLegacyDragLeave, onLegacyDrop }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dayKey}`,
    data: { dayKey },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: isOver
          ? "rgba(99,102,241,0.12)"
          : isToday ? "rgba(66,133,244,0.04)" : "transparent",
        transition: "background 0.15s ease",
      }}
      onClick={onClick}
      onDragOver={onLegacyDragOver}
      onDragLeave={onLegacyDragLeave}
      onDrop={onLegacyDrop}
    >
      {children}
      {/* DnD-kit drop highlight overlay */}
      {isOver && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(99,102,241,0.08)",
          border: "2px dashed rgba(99,102,241,0.4)",
          borderRadius: 4,
          pointerEvents: "none",
          zIndex: 5,
        }} />
      )}
    </div>
  );
}

// ─── Edit Event Modal (full edit: title, time, day, color) ───────────────────
function EditEventModal({ block, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(block.title || "");
  const [day, setDay] = useState(block.day);
  const [startHour, setStartHour] = useState(block.startHour);
  const [startMin, setStartMin] = useState(block.startMin);
  const [endHour, setEndHour] = useState(block.endHour);
  const [endMin, setEndMin] = useState(block.endMin);
  const [color, setColor] = useState(block.color || COLORS[0]);

  const buildTimeOptions = () => {
    const opts = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        opts.push({ h, m, label: fmtBlockTime(h, m) });
      }
    }
    return opts;
  };
  const timeOpts = useMemo(buildTimeOptions, []);

  const startTotal = startHour * 60 + startMin;
  const endTotal = endHour * 60 + endMin;
  const duration = endTotal - startTotal;
  const valid = title.trim() && endTotal > startTotal;

  const handleStartChange = (val) => {
    const [h, m] = val.split(":").map(Number);
    setStartHour(h);
    setStartMin(m);
    // auto-adjust end to maintain duration (capped at 23:45)
    const newEnd = Math.min(h * 60 + m + Math.max(duration, 15), 24 * 60 - 15);
    setEndHour(Math.floor(newEnd / 60));
    setEndMin(newEnd % 60);
  };

  const handleEndChange = (val) => {
    const [h, m] = val.split(":").map(Number);
    setEndHour(h);
    setEndMin(m);
  };

  const handleSave = () => {
    if (!valid) return;
    onSave({ ...block, title: title.trim(), day, startHour, startMin, endHour, endMin, color });
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    outline: "none",
    color: "#fff",
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    padding: "9px 12px",
  };

  const selectStyle = {
    ...inputStyle,
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: 28,
    cursor: "pointer",
  };

  const labelStyle = { fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 300,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: "#1e2128",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 14,
          padding: 24,
          width: 340,
          maxWidth: "90vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e8eaed" }}>Edit event</div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}
          >✕</button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>Title</div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
            autoFocus
            placeholder="Event title"
            style={inputStyle}
          />
        </div>

        {/* Day */}
        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>Day</div>
          <select value={day} onChange={e => setDay(e.target.value)} style={selectStyle}>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Time row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Start</div>
            <select
              value={`${startHour}:${startMin}`}
              onChange={e => handleStartChange(e.target.value)}
              style={selectStyle}
            >
              {timeOpts.map(o => (
                <option key={`s-${o.h}-${o.m}`} value={`${o.h}:${o.m}`}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>End</div>
            <select
              value={`${endHour}:${endMin}`}
              onChange={e => handleEndChange(e.target.value)}
              style={selectStyle}
            >
              {timeOpts.filter(o => o.h * 60 + o.m > startTotal).map(o => (
                <option key={`e-${o.h}-${o.m}`} value={`${o.h}:${o.m}`}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration display */}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>
          Duration: {duration >= 60 ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ""}` : `${duration}m`}
        </div>

        {/* Color */}
        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Color</div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  cursor: "pointer", background: c, padding: 0,
                  border: color === c ? "2.5px solid #fff" : "2.5px solid transparent",
                  boxSizing: "border-box",
                  transition: "transform 0.1s, border-color 0.15s",
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSave}
            disabled={!valid}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: valid ? "pointer" : "not-allowed",
              background: valid ? "#4285f4" : "rgba(66,133,244,0.3)", border: "none", color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              opacity: valid ? 1 : 0.6,
              transition: "background 0.15s",
            }}
          >Save</button>
          <button
            onClick={() => onDelete(block.id)}
            style={{
              padding: "9px 14px", borderRadius: 8,
              fontSize: 13, cursor: "pointer",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#f87171",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)"; }}
          >Delete</button>
          <button
            onClick={onClose}
            style={{
              padding: "9px 14px", borderRadius: 8,
              fontSize: 13, cursor: "pointer",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.55)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────
function CalendarGrid({ columns, blocks, weekDates, onChange, isMobile }) {
  const gutterW = isMobile ? 36 : GUTTER_W;
  const [form,       setForm]       = useState(null);   // { day, hour, minute, anchorX, anchorY }
  const [editing,    setEditing]    = useState(null);
  const [dropTarget, setDropTarget] = useState(null);   // { day }
  const [nowFrac,    setNowFrac]    = useState(nowFraction);
  const [activeBlock, setActiveBlock] = useState(null); // block being dragged via dnd-kit
  const scrollRef = useRef(null);
  const gridBodyRef = useRef(null);

  // DnD-kit sensors: pointer (desktop) + touch (mobile) with activation distance
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Current-time updater
  useEffect(() => {
    const tick = () => setNowFrac(nowFraction());
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const target = Math.max(0, (nowFrac - 1) * HOUR_H - 40);
      scrollRef.current.scrollTop = target;
    }
  }, []);

  const byDay = useMemo(() => {
    const m = {};
    columns.forEach(c => (m[c.key] = []));
    (blocks || []).forEach(b => { if (m[b.key] != null || m[b.day] != null) (m[b.day] || (m[b.day] = [])).push(b); });
    columns.forEach(c => { if (!m[c.key]) m[c.key] = []; });
    (blocks || []).forEach(b => { if (m[b.day] !== undefined) { if (!m[b.day].includes(b)) m[b.day].push(b); } });
    // rebuild cleanly
    const clean = {};
    columns.forEach(c => (clean[c.key] = (blocks || []).filter(b => b.day === c.key)));
    return clean;
  }, [columns, blocks]);

  // ─── GCal auto-sync helpers ──────────────────────────────────────────────
  const blockToGcalEvent = (block, dates) => {
    const dayIdx = DAYS.indexOf(block.day);
    const date = dates?.[dayIdx];
    if (!date) return null;
    const start = new Date(date);
    start.setHours(block.startHour, block.startMin, 0, 0);
    const end = new Date(date);
    end.setHours(block.endHour, block.endMin, 0, 0);
    return {
      summary: block.title,
      start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      extendedProperties: { private: { ultimatePlannerBlockId: block.id } },
    };
  };

  const gcalPush = async (block, dates) => {
    if (!getStoredToken()) return;
    const ev = blockToGcalEvent(block, dates);
    if (!ev) return;
    try {
      const created = await createEvent(ev);
      onChange(p => ({ ...p, timeBlocks: (p.timeBlocks || []).map(b => b.id === block.id ? { ...b, gcalId: created.id, synced: true } : b) }));
    } catch (err) { console.warn("[GCal] Push failed:", err); }
  };

  const gcalUpdate = async (block, dates) => {
    if (!getStoredToken() || !block.gcalId) return;
    const ev = blockToGcalEvent(block, dates);
    if (!ev) return;
    try { await updateEvent(block.gcalId, ev); } catch (err) { console.warn("[GCal] Update failed:", err); }
  };

  const gcalDelete = async (block) => {
    if (!getStoredToken() || !block?.gcalId) return;
    try { await deleteEvent(block.gcalId); } catch (err) { console.warn("[GCal] Delete failed:", err); }
  };

  // ─── Block CRUD ─────────────────────────────────────────────────────────
  const addBlock = (b) => {
    onChange(p => ({ ...p, timeBlocks: [...(p.timeBlocks || []), b] }));
    gcalPush(b, weekDates);
  };

  const delBlock = (id) => {
    const block = (blocks || []).find(b => b.id === id);
    onChange(p => ({ ...p, timeBlocks: (p.timeBlocks || []).filter(b => b.id !== id) }));
    gcalDelete(block);
  };

  const saveEditedBlock = (updatedBlock) => {
    onChange(p => ({ ...p, timeBlocks: (p.timeBlocks || []).map(b => b.id === updatedBlock.id ? updatedBlock : b) }));
    setEditing(null);
    gcalUpdate(updatedBlock, weekDates);
  };

  // ─── DnD-kit event handlers ──────────────────────────────────────────────
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    const block = active.data?.current?.block;
    if (block) {
      setActiveBlock(block);
      setForm(null); // close any open popup
    }
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over, delta } = event;
    setActiveBlock(null);

    if (!over) return; // dropped outside any column

    const block = active.data?.current?.block;
    if (!block) return;

    const targetDayKey = over.data?.current?.dayKey;
    if (!targetDayKey) return;

    // Calculate new time based on vertical delta (pixel movement -> hour offset)
    const deltaHours = delta.y / HOUR_H;
    const oldStartTotal = block.startHour * 60 + block.startMin;
    const oldEndTotal   = block.endHour * 60 + block.endMin;
    const duration      = oldEndTotal - oldStartTotal;

    // Snap to 15-minute increments
    const newStartRaw = oldStartTotal + deltaHours * 60;
    const newStartSnapped = Math.round(newStartRaw / 15) * 15;
    const newStart = Math.max(0, Math.min(24 * 60 - duration, newStartSnapped));
    const newEnd   = newStart + duration;

    const newStartHour = Math.floor(newStart / 60);
    const newStartMin  = newStart % 60;
    const newEndHour   = Math.floor(newEnd / 60);
    const newEndMin    = newEnd % 60;

    // Only update if something changed
    if (targetDayKey === block.day && newStartHour === block.startHour && newStartMin === block.startMin) {
      return;
    }

    const movedBlock = { ...block, day: targetDayKey, startHour: newStartHour, startMin: newStartMin, endHour: newEndHour, endMin: newEndMin };
    onChange(p => ({
      ...p,
      timeBlocks: (p.timeBlocks || []).map(b =>
        b.id === block.id ? movedBlock : b
      ),
    }));
    gcalUpdate(movedBlock, weekDates);
  }, [onChange, weekDates]);

  const handleDragCancel = useCallback(() => {
    setActiveBlock(null);
  }, []);

  const onDrop = (e, dayKey) => {
    e.preventDefault();
    setDropTarget(null);
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const task = JSON.parse(raw);
    const rect = gridBodyRef.current?.getBoundingClientRect();
    const { hour, minute } = yToTime(e.clientY, rect?.top ?? 0);
    const endMin = hour * 60 + minute + 60;
    addBlock({
      id: uid(), day: dayKey, title: task.title, color: COLORS[0],
      startHour: hour, startMin: minute,
      endHour: Math.min(23, Math.floor(endMin / 60)), endMin: endMin % 60,
    });
  };

  const handleSlotClick = (e, dayKey) => {
    if (form) { setForm(null); return; }
    const rect = gridBodyRef.current?.getBoundingClientRect();
    const { hour, minute } = yToTime(e.clientY, rect?.top ?? 0);
    setForm({ day: dayKey, hour, minute, anchorX: e.clientX, anchorY: e.clientY });
  };

  // Hours array for rendering
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  const todayDow = new Date().getDay(); // 0=Sun
  const todayIdx = todayDow === 0 ? 6 : todayDow - 1;
  const todayColIdx = columns.findIndex(c => c.isToday);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#0f1117" }}>

      {/* ── Column headers ── */}
      <div style={{
        display: "flex",
        position: "sticky", top: 0, zIndex: 30,
        background: "#0f1117",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}>
        {/* Gutter spacer */}
        <div style={{ width: gutterW, flexShrink: 0 }} />

        {columns.map(col => (
          <div
            key={col.key}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 4px 8px",
              borderLeft: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div style={{
              fontSize: 11, fontWeight: 500,
              color: col.isToday ? "#8ab4f8" : "rgba(255,255,255,0.4)",
              textTransform: "uppercase", letterSpacing: "0.5px",
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: 4,
            }}>
              {col.shortLabel}
            </div>
            <div style={{
              display: "inline-flex",
              alignItems: "center", justifyContent: "center",
              width: 32, height: 32,
              borderRadius: "50%",
              background: col.isToday ? "#4285f4" : "transparent",
              fontSize: 20, fontWeight: col.isToday ? 700 : 400,
              color: col.isToday ? "#fff" : "rgba(255,255,255,0.72)",
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1,
            }}>
              {col.dateNum}
            </div>
          </div>
        ))}
      </div>

      {/* ── Scrollable body ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative" }}>
        <div
          ref={gridBodyRef}
          style={{
            display: "flex",
            position: "relative",
            height: HOUR_H * 24,
          }}
        >

          {/* Time gutter */}
          <div style={{ width: gutterW, flexShrink: 0, position: "relative" }}>
            {hours.map(h => (
              <div
                key={h}
                style={{
                  position: "absolute",
                  top: h * HOUR_H - 7,
                  right: 8,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}
              >
                {h > 0 ? fmtHour(h) : ""}
              </div>
            ))}
          </div>

          {/* Day columns (droppable) */}
          {columns.map((col, ci) => (
            <DroppableDayColumn
              key={col.key}
              dayKey={col.key}
              isToday={col.isToday}
              style={{
                flex: 1,
                position: "relative",
                borderLeft: "1px solid rgba(255,255,255,0.07)",
                cursor: activeBlock ? "default" : "crosshair",
              }}
              onClick={e => { if (!activeBlock) handleSlotClick(e, col.key); }}
              onLegacyDragOver={e => { e.preventDefault(); setDropTarget(col.key); }}
              onLegacyDragLeave={() => setDropTarget(null)}
              onLegacyDrop={e => onDrop(e, col.key)}
            >
              {/* Hour & half-hour lines */}
              {hours.map(h => (
                <React.Fragment key={h}>
                  {/* Full-hour line */}
                  <div style={{
                    position: "absolute",
                    top: h * HOUR_H,
                    left: 0, right: 0,
                    height: 1,
                    background: "rgba(255,255,255,0.08)",
                    pointerEvents: "none",
                  }} />
                  {/* Half-hour line */}
                  <div style={{
                    position: "absolute",
                    top: h * HOUR_H + HOUR_H / 2,
                    left: 0, right: 0,
                    height: 1,
                    borderTop: "1px dashed rgba(255,255,255,0.04)",
                    pointerEvents: "none",
                  }} />
                </React.Fragment>
              ))}

              {/* Legacy HTML5 drop highlight (for sidebar task drag) */}
              {dropTarget === col.key && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(66,133,244,0.08)",
                  pointerEvents: "none", zIndex: 5,
                }} />
              )}

              {/* Events (draggable) */}
              {(byDay[col.key] || []).map(b => (
                <EventCard
                  key={b.id}
                  block={b}
                  onDelete={delBlock}
                  onEdit={b => { setEditing(b); }}
                />
              ))}

              {/* Add-event popup */}
              <AnimatePresence>
                {form && form.day === col.key && (
                  <AddEventPopup
                    key="add-popup"
                    day={col.key}
                    hour={form.hour}
                    minute={form.minute}
                    anchorX={form.anchorX}
                    anchorY={form.anchorY}
                    containerRect={gridBodyRef.current?.getBoundingClientRect()}
                    onSave={b => { addBlock(b); setForm(null); }}
                    onCancel={() => setForm(null)}
                  />
                )}
              </AnimatePresence>
            </DroppableDayColumn>
          ))}

          {/* Current-time indicator */}
          {todayColIdx >= 0 && nowFrac >= 0 && nowFrac <= 24 && (() => {
            const colWidth = 100 / columns.length;
            const leftPct  = todayColIdx * colWidth;
            const topPx    = nowFrac * HOUR_H;
            return (
              <>
                {/* Circle */}
                <div style={{
                  position: "absolute",
                  top: topPx - 5,
                  left: `calc(${gutterW}px + ${leftPct}% - 5px)`,
                  width: 10, height: 10,
                  borderRadius: "50%",
                  background: "#ea4335",
                  zIndex: 20,
                  pointerEvents: "none",
                }} />
                {/* Line */}
                <div style={{
                  position: "absolute",
                  top: topPx,
                  left: `calc(${gutterW}px + ${leftPct}%)`,
                  width: `${colWidth}%`,
                  height: 2,
                  background: "#ea4335",
                  zIndex: 20,
                  pointerEvents: "none",
                }} />
              </>
            );
          })()}

        </div>
      </div>

      {/* ── Edit dialog ── */}
      <AnimatePresence>
        {editing && (
          <EditEventModal
            block={editing}
            onSave={saveEditedBlock}
            onDelete={(id) => { delBlock(id); setEditing(null); }}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>

    {/* Drag overlay: floating preview that follows the cursor during drag */}
    <DragOverlay dropAnimation={{
      duration: 200,
      easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
    }}>
      {activeBlock ? <DragOverlayCard block={activeBlock} /> : null}
    </DragOverlay>
    </DndContext>
  );
}

// ─── Header Bar ───────────────────────────────────────────────────────────────
function HeaderBar({ view, onViewChange, weekOffset, onWeekOffsetChange, selectedDay, onDayChange, weekDates, isMobile, onSync, syncing, gcalConnected, onGcalConnect, onGcalDisconnect, connecting }) {
  const startDate = weekDates[0];
  const endDate   = weekDates[6];

  let dateRangeText;
  if (startDate.getMonth() === endDate.getMonth()) {
    dateRangeText = `${MONTHS[startDate.getMonth()]} ${startDate.getDate()}–${endDate.getDate()}, ${endDate.getFullYear()}`;
  } else {
    dateRangeText = `${MONTHS_SHORT[startDate.getMonth()]} ${startDate.getDate()} – ${MONTHS_SHORT[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }

  if (view === "day") {
    const idx = DAYS.indexOf(selectedDay);
    const d = weekDates[idx] ?? weekDates[0];
    dateRangeText = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  const navBtnStyle = {
    width: 32, height: 32,
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.7)",
    fontSize: 16, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
    transition: "background 0.15s",
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: isMobile ? 4 : 8,
      padding: isMobile ? "8px 10px" : "8px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      background: "#0f1117",
      flexShrink: 0,
      fontFamily: "'DM Sans', sans-serif",
      flexWrap: isMobile ? "wrap" : "nowrap",
    }}>
      {/* Nav arrows + Today */}
      <button
        onClick={() => onWeekOffsetChange(0)}
        style={{
          padding: isMobile ? "4px 8px" : "5px 12px", borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "transparent", color: "rgba(255,255,255,0.75)",
          fontSize: isMobile ? 11 : 13, fontWeight: 500, cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        Today
      </button>

      <button
        onClick={() => onWeekOffsetChange(weekOffset - 1)}
        style={navBtnStyle}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        ‹
      </button>
      <button
        onClick={() => onWeekOffsetChange(weekOffset + 1)}
        style={navBtnStyle}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        ›
      </button>

      {/* Date range */}
      <div style={{
        fontSize: isMobile ? 13 : 16, fontWeight: 500,
        color: "rgba(255,255,255,0.85)",
        fontFamily: "'DM Sans', sans-serif",
        flex: 1,
        marginLeft: 4,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {dateRangeText}
      </div>

      {/* Day picker (day view only) */}
      {view === "day" && (
        <div style={{ display: "flex", gap: isMobile ? 2 : 3, marginRight: isMobile ? 0 : 8, ...(isMobile ? { order: 10, width: '100%', justifyContent: 'center', marginTop: 4 } : {}) }}>
          {DAYS.map((d, i) => (
            <button
              key={d}
              onClick={() => onDayChange(d)}
              style={{
                padding: isMobile ? "5px 0" : "4px 8px",
                borderRadius: 16,
                border: "none",
                background: selectedDay === d ? "#4285f4" : "transparent",
                color: selectedDay === d ? "#fff" : "rgba(255,255,255,0.55)",
                fontSize: isMobile ? 10 : 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "background 0.15s",
                ...(isMobile ? { flex: 1, textAlign: 'center' } : {}),
              }}
              onMouseEnter={e => { if (selectedDay !== d) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={e => { if (selectedDay !== d) e.currentTarget.style.background = "transparent"; }}
            >
              {isMobile ? DAY_SHORT[i][0] : DAY_SHORT[i]}
            </button>
          ))}
        </div>
      )}

      {/* Google Calendar connect / sync / disconnect */}
      {gcalConnected ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={onSync}
            disabled={syncing}
            title="Sync with Google Calendar"
            style={{
              padding: "5px 10px", borderRadius: 6,
              border: "1px solid rgba(66,133,244,0.3)",
              background: syncing ? "rgba(66,133,244,0.15)" : "rgba(66,133,244,0.08)",
              color: "#8ab4f8",
              fontSize: 12, fontWeight: 500, cursor: syncing ? "default" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", gap: 4,
              transition: "all 0.15s",
              opacity: syncing ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!syncing) e.currentTarget.style.background = "rgba(66,133,244,0.2)"; }}
            onMouseLeave={e => { if (!syncing) e.currentTarget.style.background = "rgba(66,133,244,0.08)"; }}
          >
            <span style={{ fontSize: 14, ...(syncing ? { animation: "spin 1s linear infinite" } : {}) }}>↻</span>
            {!isMobile && (syncing ? "Syncing…" : "Sync")}
          </button>
          <button
            onClick={onGcalDisconnect}
            title="Disconnect Google Calendar"
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent",
              color: "rgba(255,255,255,0.35)",
              fontSize: 11, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={onGcalConnect}
          disabled={connecting}
          title="Connect Google Calendar"
          style={{
            padding: isMobile ? "5px 8px" : "5px 12px", borderRadius: 8,
            border: "1px solid rgba(66,133,244,0.35)",
            background: "rgba(66,133,244,0.1)",
            color: "#8ab4f8",
            fontSize: 12, fontWeight: 600, cursor: connecting ? "default" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.15s",
            opacity: connecting ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!connecting) { e.currentTarget.style.background = "rgba(66,133,244,0.2)"; e.currentTarget.style.borderColor = "rgba(66,133,244,0.5)"; }}}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(66,133,244,0.1)"; e.currentTarget.style.borderColor = "rgba(66,133,244,0.35)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={connecting ? { animation: "spin 1s linear infinite" } : {}}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="none"/>
            <path d="M19.6 10.2H12.2v3.7h4.3c-.4 2-2.1 3.4-4.3 3.4-2.6 0-4.7-2.1-4.7-4.7s2.1-4.7 4.7-4.7c1.2 0 2.2.4 3 1.1l2.7-2.7C16.3 4.8 14.3 4 12.2 4 7.7 4 4 7.7 4 12.2s3.7 8.2 8.2 8.2c4.7 0 7.8-3.3 7.8-8 0-.5-.1-1.1-.2-1.6z" fill="#8ab4f8"/>
          </svg>
          {connecting ? "Connecting…" : (isMobile ? "GCal" : "Google Calendar")}
        </button>
      )}

      {/* Week / Day toggle */}
      <div style={{
        display: "flex",
        background: "rgba(255,255,255,0.06)",
        borderRadius: 20,
        padding: 2,
      }}>
        {[["week","Week"],["day","Day"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            style={{
              padding: "5px 16px",
              borderRadius: 18,
              border: "none",
              background: view === id ? "rgba(255,255,255,0.12)" : "transparent",
              color: view === id ? "#fff" : "rgba(255,255,255,0.5)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
          >{label}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Mobile detection hook ────────────────────────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function TimeBlockingTab({ data, onChange }) {
  const isMobile = useIsMobile();
  const [view,        setView]        = useState(isMobile ? "day" : "week");
  const [weekOffset,  setWeekOffset]  = useState(0);
  const [selectedDay, setSelectedDay] = useState(todayName());
  const [sidebar,     setSidebar]     = useState(!isMobile);
  const [syncing,     setSyncing]     = useState(false);
  const [connecting,  setConnecting]  = useState(false);
  const [gcalConnected, setGcalConnected] = useState(isGcalConnected());
  const [syncToast,   setSyncToast]   = useState(null);

  const GCAL_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem("up_gcal_client_id") || "";

  const handleGcalConnect = useCallback(async () => {
    if (connecting || !GCAL_CLIENT_ID) return;
    setConnecting(true);
    try {
      await requestCalendarAccess(GCAL_CLIENT_ID);
      setGcalConnected(true);
      setSyncToast("Connected to Google Calendar");
      setTimeout(() => setSyncToast(null), 3000);
    } catch (err) {
      console.warn("[TimeBlockingTab] Connect error:", err);
      setSyncToast("Failed to connect: " + (err.message || "Unknown error"));
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setConnecting(false);
    }
  }, [connecting, GCAL_CLIENT_ID]);

  const handleGcalDisconnect = useCallback(() => {
    clearToken();
    setGcalConnected(false);
    setSyncToast("Disconnected from Google Calendar");
    setTimeout(() => setSyncToast(null), 3000);
  }, []);

  const handleGcalSync = useCallback(async () => {
    if (syncing || !gcalConnected) return;
    setSyncing(true);
    try {
      const weekDatesList = [];
      const base = new Date();
      base.setDate(base.getDate() + weekOffset * 7);
      const dow = base.getDay();
      const monOff = dow === 0 ? -6 : 1 - dow;
      for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + monOff + i);
        weekDatesList.push(d);
      }
      const result = await syncCalendar(data?.timeBlocks || [], weekDatesList, onChange);
      setSyncToast(`Synced: ${result.pushed} pushed, ${result.pulled} pulled`);
      setTimeout(() => setSyncToast(null), 3000);
    } catch (err) {
      console.warn("[TimeBlockingTab] Sync error:", err);
      setSyncToast("Sync failed: " + (err.message || "Unknown error"));
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setSyncing(false);
    }
  }, [syncing, gcalConnected, weekOffset, data?.timeBlocks, onChange]);

  // Auto-switch to day view when resizing to mobile
  useEffect(() => {
    if (isMobile && view === "week") setView("day");
    if (isMobile && sidebar) setSidebar(false);
  }, [isMobile]);

  const blocks = data?.timeBlocks || [];

  // Compute week dates based on offset from current week
  const weekDates = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDates(base);
  }, [weekOffset]);

  const today = todayName();

  // Build column descriptors
  const weekCols = useMemo(() =>
    DAYS.map((d, i) => ({
      key: d,
      shortLabel: DAY_SHORT[i],
      dateNum: weekDates[i]?.getDate() ?? "",
      isToday: d === today && weekOffset === 0,
    }))
  , [weekDates, today, weekOffset]);

  const dayIdx  = DAYS.indexOf(selectedDay);
  const dayCols = useMemo(() => [{
    key: selectedDay,
    shortLabel: DAY_SHORT[dayIdx],
    dateNum: weekDates[dayIdx]?.getDate() ?? "",
    isToday: selectedDay === today && weekOffset === 0,
  }], [selectedDay, dayIdx, weekDates, today, weekOffset]);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%",
      background: "#0f1117",
      fontFamily: "'DM Sans', sans-serif",
      minHeight: 0,
    }}>
      {/* Header */}
      <HeaderBar
        view={view}
        onViewChange={setView}
        weekOffset={weekOffset}
        onWeekOffsetChange={setWeekOffset}
        selectedDay={selectedDay}
        onDayChange={setSelectedDay}
        weekDates={weekDates}
        isMobile={isMobile}
        onSync={handleGcalSync}
        syncing={syncing}
        gcalConnected={gcalConnected}
        onGcalConnect={handleGcalConnect}
        onGcalDisconnect={handleGcalDisconnect}
        connecting={connecting}
      />

      {/* Sync toast */}
      <AnimatePresence>
        {syncToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)",
              zIndex: 100, padding: "6px 16px", borderRadius: 8,
              background: syncToast.includes("fail") || syncToast.includes("Failed") ? "rgba(239,68,68,0.9)" : "rgba(66,133,244,0.9)",
              color: "#fff", fontSize: 12, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              whiteSpace: "nowrap",
            }}
          >
            {syncToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* Sidebar toggle button — hidden on mobile */}
        {!isMobile && (
          <div style={{
            position: "absolute",
            top: 56,
            left: 4,
            zIndex: 50,
          }}>
            <button
              onClick={() => setSidebar(v => !v)}
              title="Toggle task sidebar"
              style={{
                width: 28, height: 28,
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.45)",
                cursor: "pointer",
                fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
            >
              ☰
            </button>
          </div>
        )}

        {/* Combined sidebar: Mini Calendar + Tasks */}
        <AnimatePresence>
          {sidebar && !isMobile && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{
                borderRight: "1px solid rgba(255,255,255,0.07)",
                overflowY: "auto",
                overflowX: "hidden",
                flexShrink: 0,
                background: "#0f1117",
              }}
            >
              <div style={{ minWidth: 200 }}>
                {/* Mini month calendar */}
                <MiniCalendar
                  weekOffset={weekOffset}
                  onWeekOffsetChange={setWeekOffset}
                  selectedDay={selectedDay}
                  onDayChange={setSelectedDay}
                  onViewChange={setView}
                />

                {/* Create button */}
                <div style={{ padding: "8px 12px" }}>
                  <button
                    onClick={() => {
                      // Switch to day view and trigger a click at the current time
                      setView("day");
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      width: "100%", padding: "10px 14px",
                      background: "rgba(66,133,244,0.1)",
                      border: "1px solid rgba(66,133,244,0.25)",
                      borderRadius: 10, cursor: "pointer",
                      color: "#8ab4f8", fontSize: 13, fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(66,133,244,0.18)"; e.currentTarget.style.borderColor = "rgba(66,133,244,0.4)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(66,133,244,0.1)"; e.currentTarget.style.borderColor = "rgba(66,133,244,0.25)"; }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                    Create
                  </button>
                </div>

                {/* Unscheduled tasks */}
                <TaskSidebar weekDays={data?.weekDays} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${view}-${weekOffset}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}
            >
              <CalendarGrid
                columns={view === "week" ? weekCols : dayCols}
                blocks={blocks}
                weekDates={weekDates}
                onChange={onChange}
                isMobile={isMobile}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard widget ─────────────────────────────────────────────────────────
export function TimeBlockWidget({ data }) {
  const today  = todayName();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const upcoming = useMemo(() =>
    [...(data?.timeBlocks || [])]
      .filter(b => b.day === today)
      .sort((a, b) => (a.startHour * 60 + a.startMin) - (b.startHour * 60 + b.startMin))
      .filter(b => (b.endHour * 60 + b.endMin) > nowMin)
      .slice(0, 3)
  , [data, today]);

  const card = {
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(51,65,85,0.5)",
    borderRadius: 14,
  };
  const lbl = {
    fontSize: 11, fontWeight: 700,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase", letterSpacing: "0.8px",
  };

  return (
    <div style={{ ...card, padding: "14px 16px" }}>
      <div style={{ ...lbl, marginBottom: 10 }}>Today's Schedule</div>
      {!upcoming.length ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>No upcoming blocks today</div>
      ) : upcoming.map(b => (
        <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 3, height: 32, borderRadius: 2, background: b.color, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{b.title}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>
              {formatSlotTime(b.startHour, b.startMin)} – {formatSlotTime(b.endHour, b.endMin)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
