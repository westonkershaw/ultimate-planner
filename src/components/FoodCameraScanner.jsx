import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RECENT_KEY = 'up_recent_scans';
const MAX_RECENT = 5;

function saveRecent(meal) {
  try {
    const prev = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const next = [meal, ...prev.filter(r => r.name !== meal.name)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

// How many grams is 1 unit of each measurement
// (volume units use water-density approximations — close enough for food logging)
const UNIT_GRAMS = {
  g:    1,
  oz:   28.35,
  cup:  240,
  tbsp: 15,
  tsp:  5,
  lb:   453.6,
};

const UNIT_LABELS = [
  { value: 'g',    label: 'g' },
  { value: 'oz',   label: 'oz' },
  { value: 'cup',  label: 'cup' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'tsp',  label: 'tsp' },
  { value: 'lb',   label: 'lb' },
];

// USDA returns macros per 100 g — scale to whatever amount the user enters
function scaleMacros(result, qty, unit) {
  if (!result) return result;
  const grams = (parseFloat(qty) || 100) * (UNIT_GRAMS[unit] || 1);
  const mult = grams / 100;
  const s = v => (typeof v === 'number' ? Math.round(v * mult) : v);
  return {
    ...result,
    calories: s(result.calories),
    protein:  s(result.protein),
    carbs:    s(result.carbs),
    fat:      s(result.fat),
    fiber:    s(result.fiber),
  };
}

// Compress image to max 800px and return base64 JPEG
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
        else { width = Math.round((width / height) * MAX); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(7,13,26,0.97)',
    backdropFilter: 'blur(20px)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 20, fontFamily: "'DM Sans',sans-serif",
    overflowY: 'auto',
  },
  card: {
    background: 'rgba(15,23,42,0.95)',
    border: '1px solid rgba(51,65,85,0.5)',
    borderRadius: 20, padding: '24px 20px',
    width: '100%', maxWidth: 420,
  },
  btn: (bg, extra = {}) => ({
    background: bg, border: 'none', borderRadius: 12,
    color: '#fff', padding: '12px 20px',
    cursor: 'pointer', fontSize: 14, fontWeight: 700,
    fontFamily: "'DM Sans',sans-serif", width: '100%',
    marginTop: 10, ...extra,
  }),
  tab: (active) => ({
    flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
    background: active ? '#14b8a6' : 'transparent',
    color: active ? '#fff' : 'rgba(148,163,184,0.6)',
    fontSize: 13, fontWeight: 700, borderRadius: 8,
    fontFamily: "'DM Sans',sans-serif", transition: 'all 0.18s',
  }),
};

// ── Barcode lookup via OpenFoodFacts ──────────────────────────────────────────
async function lookupBarcode(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const n = p.nutriments || {};
  return {
    name: p.product_name || p.generic_name || 'Unknown product',
    calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
    protein: Math.round(n.proteins_100g || 0),
    carbs: Math.round(n.carbohydrates_100g || 0),
    fat: Math.round(n.fat_100g || 0),
    fiber: Math.round(n.fiber_100g || 0),
    serving: p.serving_size || '100g',
    brand: p.brands || '',
  };
}

export default function FoodCameraScanner({ onResult, onClose }) {
  const [mode, setMode] = useState('camera');
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [qty, setQty] = useState('100');
  const [unit, setUnit] = useState('g');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentFoods] = useState(() => loadRecent());
  const [scanPhase, setScanPhase] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeStream, setBarcodeStream] = useState(null);
  const barcodeVideoRef = useRef(null);
  const barcodeInputRef = useRef(null);
  // Two separate inputs to avoid iOS Safari capture attribute bug
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (mode === 'search') setTimeout(() => searchRef.current?.focus(), 100);
    if (mode === 'barcode') setTimeout(() => barcodeInputRef.current?.focus(), 100);
  }, [mode]);

  // Barcode camera scanning with BarcodeDetector API
  useEffect(() => {
    if (mode !== 'barcode' || scanning) return;
    let cancelled = false;
    let stream = null;
    let animId = null;

    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    if (!hasBarcodeDetector) return; // fall back to manual entry

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        setBarcodeStream(stream);
        if (barcodeVideoRef.current) {
          barcodeVideoRef.current.srcObject = stream;
          await barcodeVideoRef.current.play();
        }
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] });
        const scan = async () => {
          if (cancelled || !barcodeVideoRef.current) return;
          try {
            const barcodes = await detector.detect(barcodeVideoRef.current);
            if (barcodes.length > 0 && !cancelled) {
              const code = barcodes[0].rawValue;
              setBarcodeInput(code);
              stream.getTracks().forEach(t => t.stop());
              setBarcodeStream(null);
              handleBarcodeLookup(code);
              return;
            }
          } catch { /* ignore frame errors */ }
          animId = requestAnimationFrame(scan);
        };
        animId = requestAnimationFrame(scan);
      } catch {
        // Camera denied or unavailable — user can type manually
      }
    })();

    return () => {
      cancelled = true;
      if (animId) cancelAnimationFrame(animId);
      if (stream) stream.getTracks().forEach(t => t.stop());
      setBarcodeStream(null);
    };
  }, [mode, scanning]);

  // Cleanup barcode stream on unmount
  useEffect(() => {
    return () => {
      if (barcodeStream) barcodeStream.getTracks().forEach(t => t.stop());
    };
  }, [barcodeStream]);

  async function handleBarcodeLookup(code) {
    if (!code?.trim()) return;
    setError(null);
    setResult(null);
    setAlternatives([]);
    setQty('100');
    setUnit('g');
    setScanning(true);
    setScanPhase('looking_up');
    try {
      const data = await lookupBarcode(code.trim());
      if (!data) {
        setError(`No product found for barcode "${code}". Try the Search tab.`);
      } else {
        setResult(data);
        setQty('100');
        setUnit('g');
      }
    } catch (err) {
      setError(err.message || 'Barcode lookup failed. Try again.');
    } finally {
      setScanning(false);
      setScanPhase('');
    }
  }

  async function handleFile(file) {
    if (!file) return;
    setError(null);
    setResult(null);
    setAlternatives([]);
    setQty('100');
    setUnit('g');

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    setScanning(true);
    setScanPhase('recognizing');
    try {
      // Compress before sending — better quality for Clarifai
      const base64 = await compressImage(file);
      setScanPhase('looking_up');

      const res = await fetch('/api/food-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');

      if (data.notRecognized || !data.name) {
        setError('Could not identify the food. Try the Search tab or a clearer photo.');
      } else {
        setResult(data);
        setAlternatives(data.alternatives || []);
        setQty('100');
        setUnit('g');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setScanning(false);
      setScanPhase('');
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setError(null);
    setResult(null);
    setAlternatives([]);
    setQty('100');
    setUnit('g');
    setScanning(true);
    setScanPhase('looking_up');
    try {
      const res = await fetch('/api/food-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: searchQuery.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      if (!data.name) {
        setError(`No results found for "${searchQuery}". Try a different term.`);
      } else {
        setResult(data);
        setAlternatives(data.alternatives || []);
        setQty('100');
        setUnit('g');
      }
    } catch (err) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setScanning(false);
      setScanPhase('');
    }
  }

  function handleUse() {
    const final = scaleMacros(result, qty, unit);
    saveRecent({ name: final.name, calories: final.calories, protein: final.protein, carbs: final.carbs, fat: final.fat });
    onResult(final);
  }

  function reset() {
    setResult(null);
    if (preview) { URL.revokeObjectURL(preview); }
    setPreview(null);
    setError(null);
    setAlternatives([]);
    setQty('100');
    setUnit('g');
    setSearchQuery('');
    setBarcodeInput('');
    if (barcodeStream) { barcodeStream.getTracks().forEach(t => t.stop()); setBarcodeStream(null); }
  }

  const scaled = scaleMacros(result, qty, unit);

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.22 }}
        style={S.card}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 26 }}>📷</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', fontFamily: "'Syne',serif" }}>AI Food Scanner</div>
            <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', marginTop: 1 }}>Snap a photo or search to get macros</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(148,163,184,0.5)', cursor: 'pointer', fontSize: 22, padding: 4, lineHeight: 1 }} aria-label="Close">×</button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: 4, marginBottom: 16 }}>
          <button style={S.tab(mode === 'camera')} onClick={() => { setMode('camera'); reset(); }}>📷 Camera</button>
          <button style={S.tab(mode === 'barcode')} onClick={() => { setMode('barcode'); reset(); setBarcodeInput(''); }}>📊 Barcode</button>
          <button style={S.tab(mode === 'search')} onClick={() => { setMode('search'); reset(); }}>🔍 Search</button>
        </div>

        {/* Barcode mode */}
        {mode === 'barcode' && !scanning && !result && (
          <div style={{ marginBottom: 12 }}>
            {/* Live camera viewfinder (only if BarcodeDetector available) */}
            {typeof window !== 'undefined' && 'BarcodeDetector' in window && (
              <div style={{ marginBottom: 12, borderRadius: 12, overflow: 'hidden', position: 'relative', background: '#000' }}>
                <video
                  ref={barcodeVideoRef}
                  playsInline
                  muted
                  style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
                />
                {!barcodeStream && !barcodeInput && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,13,26,0.8)' }}>
                    <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)', textAlign: 'center', padding: '0 20px' }}>
                      📷 Starting camera…<br />Point at a barcode
                    </div>
                  </div>
                )}
                {barcodeStream && (
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '70%', height: 2, background: 'rgba(45, 212, 191,0.6)', borderRadius: 2 }} />
                  </div>
                )}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', textAlign: 'center', marginBottom: 8 }}>
              {typeof window !== 'undefined' && 'BarcodeDetector' in window
                ? 'Or enter the barcode number manually:'
                : 'Type the barcode number from the package:'}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleBarcodeLookup(barcodeInput); }} style={{ display: 'flex', gap: 8 }}>
              <input
                ref={barcodeInputRef}
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 0049000006346"
                inputMode="numeric"
                style={{
                  flex: 1, background: 'rgba(15,23,42,0.7)',
                  border: '1px solid rgba(45, 212, 191,0.3)', borderRadius: 10,
                  padding: '10px 14px', color: '#f1f5f9', fontSize: 14,
                  fontFamily: "'DM Sans',sans-serif", outline: 'none',
                  letterSpacing: '1px',
                }}
              />
              <button
                type="submit"
                disabled={!barcodeInput.trim()}
                style={{
                  background: '#14b8a6', border: 'none', borderRadius: 10,
                  color: '#fff', padding: '10px 18px', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                  opacity: !barcodeInput.trim() ? 0.5 : 1,
                }}
              >
                Look Up
              </button>
            </form>
          </div>
        )}

        {/* Barcode loading */}
        {scanning && mode === 'barcode' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', justifyContent: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid rgba(45, 212, 191,0.3)', borderTop: '2px solid #14b8a6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#a5b4fc' }}>Looking up barcode…</span>
          </div>
        )}

        {/* Search mode */}
        {mode === 'search' && !scanning && (
          <form onSubmit={handleSearch} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="e.g. kiwi, chicken breast..."
                style={{
                  flex: 1, background: 'rgba(15,23,42,0.7)',
                  border: '1px solid rgba(45, 212, 191,0.3)', borderRadius: 10,
                  padding: '10px 14px', color: '#f1f5f9', fontSize: 14,
                  fontFamily: "'DM Sans',sans-serif", outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                style={{
                  background: '#14b8a6', border: 'none', borderRadius: 10,
                  color: '#fff', padding: '10px 18px', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                  opacity: !searchQuery.trim() ? 0.5 : 1,
                }}
              >
                Go
              </button>
            </div>
          </form>
        )}

        {/* Image preview */}
        {preview && mode === 'camera' && (
          <div style={{ marginBottom: 14, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
            <img src={preview} alt="Food" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
            {scanning && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,13,26,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                  <motion.div
                    animate={{ y: ['0%', '100%', '0%'] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                    style={{ height: 2, background: 'linear-gradient(90deg,transparent,#14b8a6,transparent)', width: '100%' }}
                  />
                </div>
                <div style={{ width: 30, height: 30, border: '2.5px solid rgba(45, 212, 191,0.3)', borderTop: '2.5px solid #14b8a6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600 }}>
                  {scanPhase === 'recognizing' ? '🔍 Identifying food…' : '📊 Looking up nutrition…'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search loading */}
        {scanning && mode === 'search' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', justifyContent: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid rgba(45, 212, 191,0.3)', borderTop: '2px solid #14b8a6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#a5b4fc' }}>Searching USDA database…</span>
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#f87171', lineHeight: 1.5 }}
            >
              ⚠️ {error}
              {mode === 'camera' && (
                <div style={{ marginTop: 6 }}>
                  <span
                    style={{ color: '#a5b4fc', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}
                    onClick={() => { setMode('search'); setError(null); setSearchQuery(''); }}
                  >
                    Search by name instead →
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result card */}
        <AnimatePresence>
          {result && !scanning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(45, 212, 191,0.08)', border: '1px solid rgba(45, 212, 191,0.25)', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: result.brand ? 1 : 4 }}>🍽️ {result.name}</div>
              {result.brand && (
                <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', marginBottom: 4 }}>{result.brand}</div>
              )}
              <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', marginBottom: 10 }}>
                per {qty || '100'} {unit}
                {result.serving && result.serving !== '100g' && (
                  <span style={{ marginLeft: 6, opacity: 0.5 }}>(USDA: {result.serving})</span>
                )}
              </div>

              {/* Amount + unit selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  style={{
                    width: 72, padding: '7px 10px', borderRadius: 8,
                    background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(45, 212, 191,0.35)',
                    color: '#f1f5f9', fontSize: 14, fontWeight: 700,
                    fontFamily: "'DM Sans',sans-serif", outline: 'none', textAlign: 'center',
                  }}
                />
                <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
                  {UNIT_LABELS.map(u => (
                    <button
                      key={u.value}
                      onClick={() => {
                        // Auto-convert qty so the total grams stay the same
                        const currentGrams = (parseFloat(qty) || 100) * (UNIT_GRAMS[unit] || 1);
                        const newQty = currentGrams / (UNIT_GRAMS[u.value] || 1);
                        setQty(parseFloat(newQty.toFixed(2)).toString());
                        setUnit(u.value);
                      }}
                      style={{
                        padding: '6px 10px', borderRadius: 7, cursor: 'pointer',
                        background: unit === u.value ? '#14b8a6' : 'rgba(15,23,42,0.6)',
                        color: unit === u.value ? '#fff' : 'rgba(148,163,184,0.6)',
                        fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                        border: `1px solid ${unit === u.value ? '#14b8a6' : 'rgba(51,65,85,0.4)'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Macro grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[
                  { label: 'Cal', value: scaled.calories, color: '#f97b4f' },
                  { label: 'Protein', value: scaled.protein ? `${scaled.protein}g` : '—', color: '#14b8a6' },
                  { label: 'Carbs', value: scaled.carbs ? `${scaled.carbs}g` : '—', color: '#fbbf24' },
                  { label: 'Fat', value: scaled.fat ? `${scaled.fat}g` : '—', color: '#34d399' },
                ].map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    style={{ textAlign: 'center', background: 'rgba(15,23,42,0.5)', borderRadius: 8, padding: '8px 4px' }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 800, color: m.color }}>{m.value !== '' && m.value != null ? m.value : '—'}</div>
                    <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.5)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', marginTop: 2 }}>{m.label}</div>
                  </motion.div>
                ))}
              </div>

              {scaled.fiber ? (
                <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(148,163,184,0.5)', textAlign: 'right' }}>
                  Fiber: {scaled.fiber}g
                </div>
              ) : null}

              <button onClick={handleUse} style={{ ...S.btn('linear-gradient(135deg,#14b8a6,#8b5cf6)'), marginTop: 12 }}>
                ✓ Log This Meal →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alternatives */}
        {alternatives.length > 0 && !scanning && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Other matches
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {alternatives.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => { setResult(alt); setAlternatives([]); setQty('100'); setUnit('g'); }}
                  style={{
                    background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)',
                    borderRadius: 10, padding: '9px 14px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                >
                  <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600, textAlign: 'left' }}>{alt.name}</span>
                  <span style={{ fontSize: 12, color: 'rgba(249,123,79,0.8)', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                    {alt.calories ? `${alt.calories} cal` : '—'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Camera buttons — two separate inputs to avoid iOS Safari bug */}
        {mode === 'camera' && !scanning && (
          <>
            {/* Separate input for camera capture */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
              style={{ display: 'none' }}
            />
            {/* Separate input for gallery (no capture attr) */}
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
              style={{ display: 'none' }}
            />
            <button onClick={() => cameraRef.current.click()} style={S.btn('linear-gradient(135deg,#f97b4f,#f59e0b)')}>
              📷 Take Photo
            </button>
            <button onClick={() => galleryRef.current.click()} style={S.btn('rgba(45, 212, 191,0.15)')}>
              🖼️ Choose from Library
            </button>
            {result && (
              <button onClick={reset} style={{ ...S.btn('transparent'), color: 'rgba(148,163,184,0.5)', marginTop: 4, border: '1px solid rgba(51,65,85,0.4)' }}>
                Scan Another
              </button>
            )}
          </>
        )}

        {/* Recent foods */}
        {!scanning && !result && recentFoods.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Recent</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {recentFoods.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { setResult(r); setAlternatives([]); setQty('100'); }}
                  style={{
                    background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.3)',
                    borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                >
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{r.name}</span>
                  <span style={{ fontSize: 12, color: 'rgba(249,123,79,0.7)', fontWeight: 700 }}>{r.calories ? `${r.calories} cal` : ''}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: 'rgba(148,163,184,0.35)' }}>
          {mode === 'barcode' ? 'Open Food Facts · Barcode Scanner' : 'Clarifai Vision · USDA FoodData Central'}
        </div>
      </motion.div>
    </div>
  );
}
