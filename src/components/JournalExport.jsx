/* eslint-disable */
import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import { countWords, calcEntrySentiment } from "../utils/math";

// ─── Style tokens ────────────────────────────────────────────────────────────

const ACCENT = "#f59e0b";
const ACCENT_SOFT = "rgba(245,158,11,0.18)";
const ACCENT_BORDER = "rgba(245,158,11,0.4)";
const GOLD = "#fbbf24";
const FONT = "'DM Sans', sans-serif";

const MODAL_OVERLAY = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
};

const MODAL_BOX = {
  background: "#0d1117",
  border: "1px solid rgba(51,65,85,0.6)",
  borderRadius: 20, width: "100%", maxWidth: 520,
  maxHeight: "85vh", display: "flex", flexDirection: "column",
  overflow: "hidden", boxShadow: "0 0 60px rgba(0,0,0,0.6)",
  fontFamily: FONT,
};

const SECTION_LABEL = {
  fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10,
};

const BTN_PRIMARY = {
  background: `linear-gradient(135deg, ${ACCENT}, #f97316)`,
  border: "none", borderRadius: 10, color: "#fff",
  padding: "11px 20px", cursor: "pointer", fontSize: 13,
  fontWeight: 700, fontFamily: FONT, transition: "opacity 0.15s",
};

const BTN_GHOST = {
  background: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}`,
  borderRadius: 8, color: ACCENT, cursor: "pointer",
  fontSize: 12, fontWeight: 700, padding: "5px 12px", fontFamily: FONT,
};

const INPUT_STYLE = {
  background: "rgba(15,23,42,0.6)",
  border: "1px solid rgba(51,65,85,0.55)",
  borderRadius: 10, color: "#f1f5f9", padding: "10px 12px",
  fontSize: 13, fontFamily: FONT, outline: "none",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function getWeekStartSafe(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = (day === 0 ? 6 : day - 1); // Monday=0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return monday.toLocaleDateString("en-CA");
}

function getMonthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("en-CA");
}

function getSentimentLabel(text) {
  const score = calcEntrySentiment(text);
  if (score > 10) return "Positive";
  if (score < -10) return "Negative";
  return "Neutral";
}

function starStr(rating) {
  if (!rating) return "";
  return Array.from({ length: 5 }, (_, i) => i < rating ? "\u2605" : "\u2606").join("");
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

function generatePDF(entries, title = "My Journal") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  function addPage() {
    doc.addPage();
    y = margin;
  }

  function checkSpace(needed) {
    if (y + needed > pageH - 25) {
      addPage();
    }
  }

  function addFooter() {
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pages}`, pageW / 2, pageH - 10, { align: "center" });
      doc.text("Ultimate Life Planner", margin, pageH - 10);
      doc.text(new Date().toLocaleDateString(), pageW - margin, pageH - 10, { align: "right" });
    }
  }

  // Title page header
  doc.setFontSize(24);
  doc.setTextColor(40, 40, 40);
  doc.text(title, pageW / 2, y + 10, { align: "center" });
  y += 18;

  // Subtitle with date range
  if (entries.length > 0) {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const range = `${fmtDate(sorted[0].date)} — ${fmtDate(sorted[sorted.length - 1].date)}`;
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(range, pageW / 2, y, { align: "center" });
    y += 6;
    doc.text(`${entries.length} ${entries.length === 1 ? "entry" : "entries"}`, pageW / 2, y, { align: "center" });
    y += 10;
  }

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // Entries
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  for (const entry of sorted) {
    checkSpace(40);

    // Date header
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, "bold");
    doc.text(fmtDate(entry.date), margin, y);

    // Rating stars
    if (entry.rating) {
      doc.setFontSize(11);
      doc.setTextColor(200, 160, 40);
      doc.text(starStr(entry.rating), pageW - margin, y, { align: "right" });
    }
    y += 6;

    // Sentiment
    const sentiment = getSentimentLabel(entry.text);
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.setFont(undefined, "normal");
    const meta = [`${countWords(entry.text)} words`, sentiment];
    if (entry.tags && entry.tags.length > 0) meta.push(entry.tags.join(", "));
    doc.text(meta.join("  |  "), margin, y);
    y += 5;

    // Prompt
    if (entry.prompt) {
      checkSpace(8);
      doc.setFontSize(9);
      doc.setTextColor(180, 140, 60);
      doc.setFont(undefined, "italic");
      const promptLines = doc.splitTextToSize(`Prompt: ${entry.prompt}`, contentW);
      doc.text(promptLines, margin, y);
      y += promptLines.length * 4 + 2;
    }

    // Entry text
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.setFont(undefined, "normal");
    const textLines = doc.splitTextToSize(entry.text, contentW);
    for (let i = 0; i < textLines.length; i++) {
      checkSpace(5);
      doc.text(textLines[i], margin, y);
      y += 4.5;
    }
    y += 2;

    // Gratitude
    if (entry.gratitude) {
      checkSpace(8);
      doc.setFontSize(9);
      doc.setTextColor(140, 120, 80);
      doc.setFont(undefined, "italic");
      const gratLines = doc.splitTextToSize(`Gratitude: ${entry.gratitude}`, contentW);
      doc.text(gratLines, margin, y);
      y += gratLines.length * 4 + 2;
    }

    // Entry divider
    y += 4;
    checkSpace(4);
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(margin + 20, y, pageW - margin - 20, y);
    y += 8;
  }

  addFooter();
  doc.save(`journal-${todayStr()}.pdf`);
}

// ─── HTML Export (Google Docs compatible) ─────────────────────────────────────

function generateHTML(entries) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const entriesHTML = sorted.map((entry) => {
    const sentiment = getSentimentLabel(entry.text);
    const tags = (entry.tags || []).join(", ");
    const stars = starStr(entry.rating);
    return `
      <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #e5e7eb;">
        <h2 style="color:#1f2937;margin:0 0 4px 0;font-size:16px;">
          ${fmtDate(entry.date)}
          ${stars ? `<span style="color:#d97706;margin-left:12px;font-size:14px;">${stars}</span>` : ""}
        </h2>
        <p style="color:#9ca3af;font-size:12px;margin:0 0 8px 0;">
          ${countWords(entry.text)} words &bull; ${sentiment}${tags ? ` &bull; ${tags}` : ""}
        </p>
        ${entry.prompt ? `<p style="color:#b45309;font-size:13px;font-style:italic;margin:0 0 8px 0;">Prompt: ${entry.prompt}</p>` : ""}
        <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px 0;white-space:pre-wrap;">${entry.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        ${entry.gratitude ? `<p style="color:#92400e;font-size:13px;font-style:italic;margin:0;">Gratitude: ${entry.gratitude}</p>` : ""}
      </div>`;
  }).join("\n");

  const range = sorted.length > 0
    ? `${fmtDate(sorted[sorted.length - 1].date)} — ${fmtDate(sorted[0].date)}`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Journal</title>
  <style>
    body { font-family: 'Georgia', serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #1f2937; }
    h1 { text-align: center; color: #111827; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 8px; }
    .count { text-align: center; color: #9ca3af; font-size: 13px; margin-bottom: 32px; }
    hr { border: none; border-top: 1px solid #d1d5db; margin: 0 0 32px 0; }
    @media print {
      body { max-width: 100%; margin: 0; padding: 20px; }
      div { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>My Journal</h1>
  <p class="subtitle">${range}</p>
  <p class="count">${sorted.length} ${sorted.length === 1 ? "entry" : "entries"}</p>
  <hr>
  ${entriesHTML}
  <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:40px;">
    Exported from Ultimate Life Planner on ${fmtDate(todayStr())}
  </p>
</body>
</html>`;
}

function downloadHTML(entries) {
  const html = generateHTML(entries);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `journal-${todayStr()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Print ───────────────────────────────────────────────────────────────────

function printEntries(entries) {
  const html = generateHTML(entries);
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  // Wait for content to load then trigger print
  win.onload = () => {
    win.focus();
    win.print();
  };
  // Fallback for fast-rendering content
  setTimeout(() => {
    win.focus();
    win.print();
  }, 300);
  return true;
}

// ─── Copy to Clipboard ──────────────────────────────────────────────────────

async function copyToClipboard(entries) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const text = sorted.map((entry) => {
    const parts = [`--- ${fmtDate(entry.date)} ---`];
    if (entry.rating) parts.push(`Rating: ${starStr(entry.rating)}`);
    if (entry.prompt) parts.push(`Prompt: ${entry.prompt}`);
    parts.push("");
    parts.push(entry.text);
    if (entry.gratitude) parts.push(`\nGratitude: ${entry.gratitude}`);
    if (entry.tags && entry.tags.length > 0) parts.push(`Tags: ${entry.tags.join(", ")}`);
    parts.push(`\n${countWords(entry.text)} words | Sentiment: ${getSentimentLabel(entry.text)}`);
    return parts.join("\n");
  }).join("\n\n" + "=".repeat(50) + "\n\n");

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  }
}

// ─── Date Range Options ─────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { key: "all", label: "All Entries" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom Range" },
];

function filterByRange(journals, rangeKey, customFrom, customTo) {
  const sorted = [...journals].sort((a, b) => b.date.localeCompare(a.date));
  if (rangeKey === "all") return sorted;
  if (rangeKey === "week") {
    const weekStart = getWeekStartSafe(todayStr());
    return sorted.filter((e) => e.date >= weekStart);
  }
  if (rangeKey === "month") {
    const monthStart = getMonthStart();
    return sorted.filter((e) => e.date >= monthStart);
  }
  if (rangeKey === "custom") {
    return sorted.filter((e) => {
      if (customFrom && e.date < customFrom) return false;
      if (customTo && e.date > customTo) return false;
      return true;
    });
  }
  return sorted;
}

// ─── Export Modal Component ──────────────────────────────────────────────────

export default function JournalExportModal({ journals, onClose }) {
  const [range, setRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState(todayStr());
  const [feedback, setFeedback] = useState("");
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(
    () => filterByRange(journals, range, customFrom, customTo),
    [journals, range, customFrom, customTo]
  );

  const showFeedback = useCallback((msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 2500);
  }, []);

  async function handlePDF() {
    if (filtered.length === 0) return showFeedback("No entries to export.");
    setExporting(true);
    try {
      // Small delay to let UI update
      await new Promise((r) => setTimeout(r, 50));
      generatePDF(filtered);
      showFeedback("PDF downloaded!");
    } catch (err) {
      showFeedback("PDF generation failed. Try again.");
    } finally {
      setExporting(false);
    }
  }

  function handleGoogleDocs() {
    if (filtered.length === 0) return showFeedback("No entries to export.");
    downloadHTML(filtered);
    showFeedback("HTML downloaded — upload to Google Drive and open with Docs!");
  }

  function handlePrint() {
    if (filtered.length === 0) return showFeedback("No entries to print.");
    const ok = printEntries(filtered);
    if (!ok) showFeedback("Pop-up blocked — allow pop-ups and try again.");
  }

  async function handleCopy() {
    if (filtered.length === 0) return showFeedback("No entries to copy.");
    const ok = await copyToClipboard(filtered);
    if (ok) showFeedback("Copied to clipboard!");
  }

  const totalWords = useMemo(() => filtered.reduce((sum, e) => sum + countWords(e.text), 0), [filtered]);

  return (
    <motion.div
      style={MODAL_OVERLAY}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={MODAL_BOX}
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid rgba(51,65,85,0.4)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📤</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>Export Journal</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.4)", fontSize: 20,
              cursor: "pointer", padding: "4px 8px", lineHeight: 1,
            }}
            aria-label="Close export modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>

          {/* Date Range */}
          <div style={SECTION_LABEL}>Date Range</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                aria-pressed={range === opt.key}
                style={{
                  background: range === opt.key ? ACCENT_SOFT : "rgba(255,255,255,0.04)",
                  border: `1px solid ${range === opt.key ? ACCENT_BORDER : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 20, color: range === opt.key ? ACCENT : "rgba(255,255,255,0.5)",
                  cursor: "pointer", fontSize: 12, fontWeight: 700,
                  padding: "5px 14px", fontFamily: FONT, transition: "all 0.15s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          <AnimatePresence>
            {range === "custom" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ display: "flex", gap: 10, marginBottom: 12, overflow: "hidden" }}
              >
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 700, display: "block", marginBottom: 4 }}>FROM</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    max={customTo || todayStr()}
                    style={{ ...INPUT_STYLE, width: "100%", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 700, display: "block", marginBottom: 4 }}>TO</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    min={customFrom}
                    max={todayStr()}
                    style={{ ...INPUT_STYLE, width: "100%", boxSizing: "border-box" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview stats */}
          <div style={{
            background: "rgba(15,23,42,0.5)",
            border: "1px solid rgba(51,65,85,0.35)",
            borderRadius: 12, padding: "12px 16px", marginBottom: 18,
            display: "flex", justifyContent: "space-around", textAlign: "center",
          }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: GOLD }}>{filtered.length}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>
                {filtered.length === 1 ? "Entry" : "Entries"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>{totalWords.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>Words</div>
            </div>
            {filtered.length > 0 && (
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#2dd4bf" }}>
                  {filtered.filter((e) => e.rating > 0).length > 0
                    ? (filtered.reduce((s, e) => s + (e.rating || 0), 0) / filtered.filter((e) => e.rating > 0).length).toFixed(1)
                    : "—"}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" }}>Avg Rating</div>
              </div>
            )}
          </div>

          {/* Export buttons */}
          <div style={SECTION_LABEL}>Export As</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* PDF */}
            <button
              onClick={handlePDF}
              disabled={exporting || filtered.length === 0}
              style={{
                ...BTN_PRIMARY,
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 18px", borderRadius: 12, textAlign: "left",
                opacity: (exporting || filtered.length === 0) ? 0.5 : 1,
                cursor: (exporting || filtered.length === 0) ? "default" : "pointer",
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>📄</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {exporting ? "Generating..." : "Download PDF"}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, marginTop: 2 }}>
                  Formatted document with ratings, tags, and sentiment
                </div>
              </div>
            </button>

            {/* Google Docs */}
            <button
              onClick={handleGoogleDocs}
              disabled={filtered.length === 0}
              style={{
                background: "rgba(66,133,244,0.15)",
                border: "1px solid rgba(66,133,244,0.35)",
                borderRadius: 12, color: "#fff",
                padding: "14px 18px", cursor: filtered.length === 0 ? "default" : "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: FONT,
                display: "flex", alignItems: "center", gap: 12,
                textAlign: "left", transition: "opacity 0.15s",
                opacity: filtered.length === 0 ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>📝</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#93bbfc" }}>
                  Export for Google Docs
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 500, marginTop: 2 }}>
                  Downloads HTML — upload to Google Drive, open with Docs
                </div>
              </div>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              disabled={filtered.length === 0}
              style={{
                background: "rgba(45, 212, 191,0.12)",
                border: "1px solid rgba(45, 212, 191,0.3)",
                borderRadius: 12, color: "#fff",
                padding: "14px 18px", cursor: filtered.length === 0 ? "default" : "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: FONT,
                display: "flex", alignItems: "center", gap: 12,
                textAlign: "left", transition: "opacity 0.15s",
                opacity: filtered.length === 0 ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>🖨️</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#a5b4fc" }}>Print</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 500, marginTop: 2 }}>
                  Opens print dialog — also supports "Save as PDF"
                </div>
              </div>
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              disabled={filtered.length === 0}
              style={{
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 12, color: "#fff",
                padding: "14px 18px", cursor: filtered.length === 0 ? "default" : "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: FONT,
                display: "flex", alignItems: "center", gap: 12,
                textAlign: "left", transition: "opacity 0.15s",
                opacity: filtered.length === 0 ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>📋</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#86efac" }}>Copy to Clipboard</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 500, marginTop: 2 }}>
                  Paste into Google Docs, Notion, or any editor
                </div>
              </div>
            </button>
          </div>

          {/* Feedback toast */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  marginTop: 14, padding: "10px 16px",
                  background: "rgba(245,158,11,0.15)",
                  border: `1px solid ${ACCENT_BORDER}`,
                  borderRadius: 10, fontSize: 13, fontWeight: 700,
                  color: GOLD, textAlign: "center",
                }}
              >
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Export Button (inline trigger) ──────────────────────────────────────────

export function JournalExportButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...BTN_GHOST,
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 14px",
      }}
      aria-label="Export journal entries"
      title="Export / Print journal"
    >
      📤 Export
    </button>
  );
}
