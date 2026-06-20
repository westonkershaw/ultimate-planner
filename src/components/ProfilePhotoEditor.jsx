import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, Trash2, X } from 'lucide-react';

export default function ProfilePhotoEditor({ currentPhoto, onSave, onClose }) {
  const [preview, setPreview] = useState(currentPhoto || null);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToastMsg('Photo must be under 5MB'); setTimeout(() => setToastMsg(''), 3000);
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Resize to max 400x400 to save storage
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 400;
        const scale = Math.min(max / img.width, max / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setPreview(canvas.toDataURL('image/jpeg', 0.85));
        setLoading(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  const S = {
    overlay: { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(7,9,13,0.92)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: { background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '28px 24px', maxWidth: 360, width: '100%' },
    btn: (bg, color, border) => ({ background: bg, border: border || 'none', borderRadius: 12, padding: '11px 16px', color, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 8 }),
  };

  return (
    <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Edit profile photo">
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#ef4444', color: '#fff', padding: '12px 20px', borderRadius: 8, zIndex: 10000, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}>
          {toastMsg}
        </div>
      )}
      <motion.div style={S.card} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: "'Syne',serif", fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>Profile Photo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(100,116,139,0.6)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Avatar Preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative', width: 120, height: 120 }}>
            {preview ? (
              <img
                src={preview}
                alt="Profile preview"
                style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(99,102,241,0.5)' }}
              />
            ) : (
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '3px dashed rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                👤
              </div>
            )}
            {loading && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            )}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Actions */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

        <button style={S.btn('rgba(99,102,241,0.15)', '#818cf8', '1px solid rgba(99,102,241,0.3)')} onClick={() => cameraRef.current?.click()}>
          <Camera size={15} /> Take Photo
        </button>
        <button style={S.btn('rgba(15,23,42,0.8)', 'rgba(203,213,225,0.85)', '1px solid rgba(51,65,85,0.5)')} onClick={() => fileRef.current?.click()}>
          <Upload size={15} /> Choose from Library
        </button>
        {preview && preview !== currentPhoto && (
          <button style={S.btn('rgba(248,113,113,0.1)', '#f87171', '1px solid rgba(248,113,113,0.25)')} onClick={() => setPreview(currentPhoto || null)}>
            <Trash2 size={15} /> Reset
          </button>
        )}
        {currentPhoto && (
          <button style={{ ...S.btn('transparent', 'rgba(248,113,113,0.6)', 'none'), marginTop: 4, fontSize: 12 }} onClick={() => { setPreview(null); }}>
            Remove photo
          </button>
        )}

        {/* Save */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button style={{ ...S.btn('transparent', 'rgba(100,116,139,0.6)', '1px solid rgba(51,65,85,0.4)'), flex: 1, marginTop: 0 }} onClick={onClose}>Cancel</button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ ...S.btn('linear-gradient(135deg,#6366f1,#8b5cf6)', '#fff', 'none'), flex: 2, marginTop: 0 }}
            onClick={() => { onSave(preview); onClose(); }}
            disabled={loading}
          >
            Save Photo
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
