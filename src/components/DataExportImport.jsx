import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Helpers ──────────────────────────────────────────────────────────────────

function toCSV(headers, rows) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

function downloadFile(content, filename, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const vals = line.match(/("(?:[^"]|"")*"|[^,]*)/g) || [];
    const obj = {};
    headers.forEach((h, i) => obj[h] = (vals[i] || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    return obj;
  });
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

// ── Style tokens ─────────────────────────────────────────────────────────────

const FONT = "'DM Sans',sans-serif";

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: '#0d1117',
    border: '1px solid rgba(51,65,85,0.6)',
    borderRadius: 20, width: '100%', maxWidth: 600,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    overflow: 'hidden', boxShadow: '0 0 60px rgba(0,0,0,0.6)',
    fontFamily: FONT,
  },
  header: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid rgba(51,65,85,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: 0,
  },
  body: {
    flex: 1, overflowY: 'auto', padding: '16px 24px',
  },
  sectionLabel: {
    fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12,
  },
  card: {
    background: 'rgba(15,23,42,0.5)',
    border: '1px solid rgba(51,65,85,0.35)',
    borderRadius: 14, padding: '16px 18px', marginBottom: 14,
  },
  btn: (bg, color = '#fff') => ({
    background: bg, border: 'none', borderRadius: 10,
    color, padding: '10px 20px', fontSize: 13, fontWeight: 700,
    fontFamily: FONT, cursor: 'pointer', transition: 'opacity 0.2s',
  }),
  btnOutline: {
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(51,65,85,0.5)',
    borderRadius: 10, color: 'rgba(148,163,184,0.8)',
    padding: '10px 20px', fontSize: 13, fontWeight: 700,
    fontFamily: FONT, cursor: 'pointer', transition: 'all 0.2s',
  },
  toast: {
    position: 'fixed', bottom: 24, right: 24,
    background: '#6366f1', color: '#fff',
    padding: '12px 20px', borderRadius: 8, zIndex: 10000,
    fontSize: 13, fontWeight: 600, fontFamily: FONT,
    boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
  },
};

const ANIM = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { type: 'spring', stiffness: 400, damping: 30 },
};

// ── Main Component ───────────────────────────────────────────────────────────

export default function DataExportImport({ data, onChange, onClose }) {
  const [tab, setTab] = useState('export'); // export | import
  const [toastMsg, setToastMsg] = useState('');
  const [importPreview, setImportPreview] = useState(null); // { type, rows, raw }
  const [importType, setImportType] = useState(null); // 'tasks' | 'transactions' | 'json'
  const fileRef = useRef(null);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  // ── Export functions ─────────────────────────────────────────────────────

  function exportTasks() {
    const weekDays = data?.weekDays || {};
    const headers = ['day', 'title', 'done', 'priority', 'date'];
    const rows = [];
    Object.entries(weekDays).forEach(([day, dayData]) => {
      (dayData?.tasks || []).forEach(t => {
        rows.push([
          day,
          t.title || t.text || t.name || '',
          t.done ? 'true' : 'false',
          t.priority || 'medium',
          t.dueDate || t.date || todayStr(),
        ]);
      });
    });
    if (rows.length === 0) { showToast('No tasks to export.'); return; }
    downloadFile(toCSV(headers, rows), `tasks_${todayStr()}.csv`);
    showToast(`Exported ${rows.length} tasks.`);
  }

  function exportTransactions() {
    const txns = data?.transactions || [];
    const headers = ['date', 'description', 'amount', 'category'];
    const rows = txns.map(t => [
      t.date || '',
      t.name || t.merchant || t.description || '',
      t.type === 'income' ? t.amount : -(t.amount || 0),
      t.category || 'other',
    ]);
    if (rows.length === 0) { showToast('No transactions to export.'); return; }
    downloadFile(toCSV(headers, rows), `transactions_${todayStr()}.csv`);
    showToast(`Exported ${rows.length} transactions.`);
  }

  function exportKIs() {
    const kis = data?.kis || [];
    const headers = ['name', 'category', 'dailyLogs'];
    const rows = kis.map(k => {
      const logs = k.dailyLog || k.logs || {};
      const logStr = Object.entries(logs)
        .map(([date, val]) => `${date}:${val}`)
        .join(';');
      return [k.name || '', k.category || '', logStr];
    });
    if (rows.length === 0) { showToast('No habits/KIs to export.'); return; }
    downloadFile(toCSV(headers, rows), `habits_${todayStr()}.csv`);
    showToast(`Exported ${rows.length} habits/KIs.`);
  }

  function exportSleepLogs() {
    const logs = data?.sleepLog || [];
    const headers = ['date', 'bedTime', 'wakeTime', 'quality', 'notes'];
    const rows = logs.map(e => [
      e.date || '',
      e.bedTime || e.bedtime || '',
      e.wakeTime || e.wakeTime || '',
      e.quality || 0,
      e.notes || '',
    ]);
    if (rows.length === 0) { showToast('No sleep logs to export.'); return; }
    downloadFile(toCSV(headers, rows), `sleep_logs_${todayStr()}.csv`);
    showToast(`Exported ${rows.length} sleep logs.`);
  }

  function exportMeals() {
    const meals = data?.meals || data?.mealLog || [];
    const headers = ['date', 'mealType', 'name', 'calories', 'protein', 'carbs', 'fat', 'notes'];
    const rows = meals.map(m => [
      m.date || '',
      m.mealType || m.type || '',
      m.name || m.title || '',
      m.calories || m.kcal || 0,
      m.protein || 0,
      m.carbs || 0,
      m.fat || 0,
      m.notes || '',
    ]);
    if (rows.length === 0) { showToast('No meals to export.'); return; }
    downloadFile(toCSV(headers, rows), `meals_${todayStr()}.csv`);
    showToast(`Exported ${rows.length} meals.`);
  }

  function exportWorkouts() {
    const workouts = data?.workouts || data?.workoutLog || [];
    const headers = ['date', 'name', 'type', 'duration', 'exercises', 'notes'];
    const rows = workouts.map(w => [
      w.date || '',
      w.name || w.title || '',
      w.type || w.category || '',
      w.duration || '',
      Array.isArray(w.exercises) ? w.exercises.map(ex => `${ex.name || ''}:${ex.sets || ''}x${ex.reps || ''}`).join('; ') : '',
      w.notes || '',
    ]);
    if (rows.length === 0) { showToast('No workouts to export.'); return; }
    downloadFile(toCSV(headers, rows), `workouts_${todayStr()}.csv`);
    showToast(`Exported ${rows.length} workouts.`);
  }

  function exportAllJSON() {
    if (!data) { showToast('No data available.'); return; }
    const safe = { ...data };
    delete safe.profilePhoto; // strip large base64 blobs
    downloadFile(JSON.stringify(safe, null, 2), `ultimate_planner_backup_${todayStr()}.json`, 'application/json');
    showToast('Full backup exported as JSON.');
  }

  // ── Import functions ───────────────────────────────────────────────────

  function handleFileSelect(type) {
    setImportType(type);
    setImportPreview(null);
    fileRef.current?.click();
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result || '';
        if (importType === 'json') {
          const parsed = JSON.parse(text);
          setImportPreview({
            type: 'json',
            rows: [],
            raw: parsed,
            summary: `${Object.keys(parsed).length} top-level keys`,
          });
        } else {
          const rows = parseCSV(text);
          if (!rows.length) { showToast('CSV appears empty or has only headers.'); return; }
          setImportPreview({ type: importType, rows, raw: null });
        }
      } catch (err) {
        showToast('Failed to parse file: ' + err.message);
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  }

  function confirmImport() {
    if (!importPreview) return;

    if (importPreview.type === 'json') {
      const restored = importPreview.raw;
      if (restored && typeof restored === 'object') {
        onChange(prev => ({ ...prev, ...restored }));
        showToast('Full data restore complete.');
      }
      setImportPreview(null);
      return;
    }

    if (importPreview.type === 'tasks') {
      const newTasks = importPreview.rows;
      onChange(prev => {
        const wd = { ...(prev?.weekDays || {}) };
        newTasks.forEach(row => {
          const day = row.day || 'Monday';
          if (!wd[day]) wd[day] = { tasks: [], events: [], notes: '', dayNote: '' };
          wd[day] = {
            ...wd[day],
            tasks: [
              ...(wd[day].tasks || []),
              {
                id: Math.random().toString(36).slice(2, 9),
                title: row.title || '',
                text: row.title || '',
                done: row.done === 'true',
                priority: row.priority || 'medium',
                dueDate: row.date || '',
              },
            ],
          };
        });
        return { ...prev, weekDays: wd };
      });
      showToast(`Imported ${newTasks.length} tasks.`);
      setImportPreview(null);
      return;
    }

    if (importPreview.type === 'transactions') {
      const newTxns = importPreview.rows.map((row, i) => {
        const amt = parseFloat(row.amount) || 0;
        return {
          id: `import_${Date.now()}_${i}`,
          date: row.date || todayStr(),
          name: row.description || '',
          merchant: row.description || '',
          amount: Math.abs(amt),
          type: amt < 0 ? 'expense' : 'income',
          category: row.category || 'other',
          source: 'csv_import',
        };
      });
      onChange(prev => ({
        ...prev,
        transactions: [...(prev?.transactions || []), ...newTxns],
      }));
      showToast(`Imported ${newTxns.length} transactions.`);
      setImportPreview(null);
      return;
    }

    if (importPreview.type === 'sleepLogs') {
      const newLogs = importPreview.rows.map((row, i) => ({
        id: `import_${Date.now()}_${i}`,
        date: row.date || todayStr(),
        bedTime: row.bedTime || '',
        wakeTime: row.wakeTime || '',
        quality: parseInt(row.quality) || 3,
        notes: row.notes || '',
      }));
      onChange(prev => {
        const existing = prev?.sleepLog || [];
        const existingDates = new Set(existing.map(e => e.date));
        const toAdd = newLogs.filter(e => !existingDates.has(e.date));
        return { ...prev, sleepLog: [...existing, ...toAdd] };
      });
      showToast(`Imported ${newLogs.length} sleep logs.`);
      setImportPreview(null);
      return;
    }

    if (importPreview.type === 'meals') {
      const newMeals = importPreview.rows.map((row, i) => ({
        id: `import_${Date.now()}_${i}`,
        date: row.date || todayStr(),
        mealType: row.mealType || row.type || 'other',
        name: row.name || '',
        calories: parseFloat(row.calories) || 0,
        protein: parseFloat(row.protein) || 0,
        carbs: parseFloat(row.carbs) || 0,
        fat: parseFloat(row.fat) || 0,
        notes: row.notes || '',
        source: 'csv_import',
      }));
      onChange(prev => ({
        ...prev,
        meals: [...(prev?.meals || []), ...newMeals],
      }));
      showToast(`Imported ${newMeals.length} meals.`);
      setImportPreview(null);
      return;
    }

    if (importPreview.type === 'workouts') {
      const newWorkouts = importPreview.rows.map((row, i) => ({
        id: `import_${Date.now()}_${i}`,
        date: row.date || todayStr(),
        name: row.name || '',
        type: row.type || '',
        duration: row.duration || '',
        notes: row.notes || '',
        source: 'csv_import',
      }));
      onChange(prev => ({
        ...prev,
        workouts: [...(prev?.workouts || []), ...newWorkouts],
      }));
      showToast(`Imported ${newWorkouts.length} workouts.`);
      setImportPreview(null);
      return;
    }
  }

  function cancelImport() {
    setImportPreview(null);
    setImportType(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const EXPORT_OPTIONS = [
    { label: 'Tasks', desc: 'All weekly tasks as CSV', icon: '\u2705', action: exportTasks },
    { label: 'Transactions', desc: 'Finance transactions as CSV', icon: '\uD83D\uDCB5', action: exportTransactions },
    { label: 'Habits / KIs', desc: 'Key indicators and daily logs', icon: '\uD83C\uDF31', action: exportKIs },
    { label: 'Sleep Logs', desc: 'Sleep times, quality, and notes', icon: '\uD83D\uDCA4', action: exportSleepLogs },
    { label: 'Meals', desc: 'Meal log with macros', icon: '\uD83C\uDF7D\uFE0F', action: exportMeals },
    { label: 'Workouts', desc: 'Workout sessions and exercises', icon: '\uD83C\uDFCB\uFE0F', action: exportWorkouts },
    { label: 'Full Backup (JSON)', desc: 'Everything — restore-ready', icon: '\uD83D\uDCBE', action: exportAllJSON },
  ];

  const IMPORT_OPTIONS = [
    { label: 'Tasks CSV', desc: 'Columns: day, title, done, priority, date', icon: '\u2705', type: 'tasks' },
    { label: 'Transactions CSV', desc: 'Columns: date, description, amount, category', icon: '\uD83D\uDCB5', type: 'transactions' },
    { label: 'Sleep Logs CSV', desc: 'Columns: date, bedTime, wakeTime, quality, notes', icon: '\uD83D\uDCA4', type: 'sleepLogs' },
    { label: 'Meals CSV', desc: 'Columns: date, mealType, name, calories, protein, carbs, fat', icon: '\uD83C\uDF7D\uFE0F', type: 'meals' },
    { label: 'Workouts CSV', desc: 'Columns: date, name, type, duration, notes', icon: '\uD83C\uDFCB\uFE0F', type: 'workouts' },
    { label: 'Full Restore (JSON)', desc: 'Restore from a full backup file', icon: '\uD83D\uDCBE', type: 'json' },
  ];

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={S.toast}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={S.modal}
      >
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={{ fontFamily: "'Syne',serif", fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>
              {'\uD83D\uDCC1'} Data Export / Import
            </div>
            <div style={{ fontSize: 12, color: 'rgba(100,116,139,0.8)', marginTop: 3 }}>
              Back up your data or import from CSV files
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer', padding: 4 }}
          >
            {'\u2715'}
          </button>
        </div>

        {/* Tab pills */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 24px 0', flexShrink: 0 }}>
          {['export', 'import'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setImportPreview(null); }}
              style={{
                background: tab === t ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                color: tab === t ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${tab === t ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`,
                padding: '6px 16px', borderRadius: 20, fontSize: 13,
                fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
                transition: 'all 0.2s',
              }}
            >
              {t === 'export' ? '\u2B07\uFE0F Export' : '\u2B06\uFE0F Import'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={S.body}>
          <AnimatePresence mode="wait">
            {tab === 'export' && (
              <motion.div key="export" {...ANIM}>
                <div style={S.sectionLabel}>Choose data to export</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {EXPORT_OPTIONS.map(opt => (
                    <button
                      key={opt.label}
                      onClick={opt.action}
                      style={{
                        ...S.card,
                        marginBottom: 0,
                        display: 'flex', alignItems: 'center', gap: 14,
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(51,65,85,0.35)'}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'rgba(99,102,241,0.12)',
                        border: '1px solid rgba(99,102,241,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0,
                      }}>
                        {opt.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)', marginTop: 2 }}>{opt.desc}</div>
                      </div>
                      <div style={{ fontSize: 16, color: 'rgba(99,102,241,0.6)' }}>{'\u2192'}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {tab === 'import' && !importPreview && (
              <motion.div key="import-select" {...ANIM}>
                <div style={S.sectionLabel}>Choose data type to import</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {IMPORT_OPTIONS.map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => handleFileSelect(opt.type)}
                      style={{
                        ...S.card,
                        marginBottom: 0,
                        display: 'flex', alignItems: 'center', gap: 14,
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(51,65,85,0.35)'}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'rgba(52,201,138,0.12)',
                        border: '1px solid rgba(52,201,138,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0,
                      }}>
                        {opt.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)', marginTop: 2 }}>{opt.desc}</div>
                      </div>
                      <div style={{ fontSize: 16, color: 'rgba(52,201,138,0.6)' }}>{'\u2191'}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {tab === 'import' && importPreview && (
              <motion.div key="import-preview" {...ANIM}>
                <div style={S.sectionLabel}>
                  Import Preview — {importPreview.type === 'json' ? 'Full Restore' : importPreview.type}
                </div>

                {/* JSON preview */}
                {importPreview.type === 'json' && (
                  <div style={S.card}>
                    <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600, marginBottom: 8 }}>
                      {'\u26A0\uFE0F'} This will merge the backup into your current data.
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(100,116,139,0.8)', lineHeight: 1.6 }}>
                      Detected {importPreview.summary}. Keys include:{' '}
                      <span style={{ color: '#a5b4fc' }}>
                        {Object.keys(importPreview.raw).slice(0, 8).join(', ')}
                        {Object.keys(importPreview.raw).length > 8 ? ', ...' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* CSV preview */}
                {importPreview.type !== 'json' && (
                  <div style={S.card}>
                    <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600, marginBottom: 10 }}>
                      {importPreview.rows.length} row{importPreview.rows.length !== 1 ? 's' : ''} found
                    </div>
                    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                      {importPreview.rows.slice(0, 20).map((row, i) => {
                        const cols = Object.entries(row);
                        return (
                          <div
                            key={i}
                            style={{
                              display: 'flex', gap: 8, padding: '6px 0',
                              borderBottom: '1px solid rgba(51,65,85,0.2)',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ fontSize: 10, color: 'rgba(99,102,241,0.6)', minWidth: 20, fontWeight: 700 }}>
                              {i + 1}
                            </div>
                            {cols.map(([key, val]) => (
                              <div key={key} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                                <span style={{ color: 'rgba(100,116,139,0.5)' }}>{key}:</span>{' '}
                                <span style={{ color: '#e2e8f0' }}>{String(val).slice(0, 30)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {importPreview.rows.length > 20 && (
                        <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.6)', padding: '8px 0', textAlign: 'center' }}>
                          ... and {importPreview.rows.length - 20} more rows
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={cancelImport} style={S.btnOutline}>
                    {'\u2190'} Back
                  </button>
                  <button
                    onClick={confirmImport}
                    style={{ ...S.btn('linear-gradient(135deg,#34c98a,#22c55e)'), flex: 1 }}
                  >
                    Confirm Import ({importPreview.type === 'json'
                      ? 'restore'
                      : `${importPreview.rows.length} rows`})
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Hidden file input for import (also accessible from import tab) */}
      <input
        ref={fileRef}
        type="file"
        accept={importType === 'json' ? '.json' : '.csv,.CSV'}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
