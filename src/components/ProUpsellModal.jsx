import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Constants ────────────────────────────────────────────────────────────────

const SPRING = { type: 'spring', stiffness: 400, damping: 30 };

const FEATURES = [
  { icon: '✦', label: 'AI Life Coach', desc: 'Personalized guidance based on your data' },
  { icon: '✦', label: 'Unlimited Key Indicators & Goals', desc: 'Track every metric that matters' },
  { icon: '✦', label: 'Google Calendar Sync', desc: 'Keep your schedule in perfect alignment' },
  { icon: '✦', label: 'Advanced Analytics & Insights', desc: 'Deep patterns across all life areas' },
  { icon: '✦', label: 'Recurring Tasks & Smart Filters', desc: 'Automate the routine, focus on what matters' },
];

// ── Styles ───────────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: 'rgba(12,17,32,0.98)',
    border: '1px solid rgba(45, 212, 191,0.25)',
    borderRadius: '24px',
    padding: '32px',
    boxShadow: '0 0 80px rgba(45, 212, 191,0.12), 0 40px 80px rgba(0,0,0,0.7)',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#94a3b8',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '18px',
    lineHeight: 1,
    transition: 'background 0.15s, color 0.15s',
  },
  badge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    background: 'linear-gradient(90deg, #14b8a6, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '12px',
  },
  h2: {
    fontFamily: "'Syne', system-ui, sans-serif",
    fontSize: '24px',
    fontWeight: 700,
    color: '#f1f5f9',
    margin: '0 0 8px 0',
    lineHeight: 1.2,
  },
  subtext: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 24px 0',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '12px',
  },
  featureIcon: {
    color: '#14b8a6',
    fontSize: '14px',
    marginTop: '2px',
    flexShrink: 0,
  },
  featureLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e2e8f0',
    margin: '0 0 2px 0',
  },
  featureDesc: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '24px',
    marginBottom: '20px',
  },
  monthlyCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    cursor: 'pointer',
  },
  lifetimeCard: {
    background: 'linear-gradient(135deg, rgba(45, 212, 191,0.2), rgba(14, 148, 136,0.15))',
    border: '1px solid rgba(45, 212, 191,0.5)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    cursor: 'pointer',
    position: 'relative',
  },
  bestValueBadge: {
    position: 'absolute',
    top: '-10px',
    right: '12px',
    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
    borderRadius: '20px',
    padding: '3px 10px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#000',
  },
  tierLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  priceLarge: {
    fontSize: '32px',
    fontWeight: 800,
    color: '#f1f5f9',
    lineHeight: 1,
  },
  priceLargeGradient: {
    fontSize: '32px',
    fontWeight: 800,
    lineHeight: 1,
    background: 'linear-gradient(90deg, #14b8a6, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  priceSmall: {
    fontSize: '13px',
    color: '#64748b',
  },
  priceSub: {
    fontSize: '12px',
    color: '#64748b',
  },
  savingsCallout: {
    fontSize: '12px',
    color: '#34d399',
    fontWeight: 600,
  },
  ghostBtn: {
    width: '100%',
    padding: '10px 0',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color: '#cbd5e1',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'background 0.15s',
  },
  primaryBtn: {
    width: '100%',
    padding: '11px 0',
    background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '4px',
    letterSpacing: '0.02em',
    boxShadow: '0 4px 20px rgba(45, 212, 191,0.35)',
  },
  trustRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    color: '#475569',
    fontSize: '12px',
    textAlign: 'center',
  },
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.06)',
    margin: '20px 0',
  },
};

// ── Feature list item ────────────────────────────────────────────────────────

function FeatureItem({ feature, index }) {
  return (
    <motion.div
      style={S.featureItem}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING, delay: 0.12 + index * 0.05 }}
    >
      <span style={S.featureIcon}>{feature.icon}</span>
      <div>
        <p style={S.featureLabel}>{feature.label}</p>
        <p style={S.featureDesc}>{feature.desc}</p>
      </div>
    </motion.div>
  );
}

// ── ProUpsellModal ───────────────────────────────────────────────────────────

function ProUpsellModal({ open, onClose, onUpgrade, userName }) {
  // Keyboard dismiss
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  // Body scroll lock
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleOverlayClick = useCallback(
    (e) => { if (e.target === e.currentTarget) onClose(); },
    [onClose]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Upgrade to Ultimate Life Planner Pro"
          style={S.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            style={S.card}
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={SPRING}
          >
            {/* Close button */}
            <motion.button
              style={S.closeBtn}
              aria-label="Close"
              onClick={onClose}
              whileHover={{ background: 'rgba(255,255,255,0.1)', color: '#f1f5f9' }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING}
            >
              ×
            </motion.button>

            {/* Header */}
            <div>
              <span style={S.badge}>✦ Ultimate Life Planner Pro</span>
              <h2 style={S.h2}>
                {userName ? `${userName}, unlock` : 'Unlock'} Your Full Potential
              </h2>
              <p style={S.subtext}>
                Join thousands leveling up every area of their life
              </p>
            </div>

            {/* Feature list */}
            <div role="list" aria-label="Pro features">
              {FEATURES.map((f, i) => (
                <FeatureItem key={f.label} feature={f} index={i} />
              ))}
            </div>

            <div style={S.divider} />

            {/* Pricing tiers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '10px',
                marginTop: '24px',
                marginBottom: '20px',
              }}
            >
              {/* Monthly card */}
              <motion.div
                style={S.monthlyCard}
                whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING}
              >
                <span style={S.tierLabel}>Monthly</span>
                <div style={S.priceRow}>
                  <span style={{ ...S.priceLarge, fontSize: '26px' }}>$4.99</span>
                  <span style={S.priceSmall}>/mo</span>
                </div>
                <span style={S.priceSub}>Cancel anytime</span>
                <motion.button
                  style={S.ghostBtn}
                  onClick={() => onUpgrade('monthly')}
                  whileHover={{ background: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING}
                >
                  Start Monthly
                </motion.button>
              </motion.div>

              {/* Yearly card (hero) */}
              <motion.div
                style={S.lifetimeCard}
                whileHover={{
                  scale: 1.02,
                  boxShadow: '0 0 30px rgba(45, 212, 191,0.3)',
                }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING}
              >
                <span style={S.bestValueBadge}>Best Value</span>
                <span style={{ ...S.tierLabel, color: '#a78bfa' }}>Yearly</span>
                <div style={S.priceRow}>
                  <span style={{ ...S.priceLargeGradient, fontSize: '26px' }}>$49.99</span>
                  <span style={S.priceSmall}>/yr</span>
                </div>
                <span style={S.savingsCallout}>Save 17% · ~$4.17/mo</span>
                <motion.button
                  style={S.primaryBtn}
                  onClick={() => onUpgrade('yearly')}
                  whileHover={{
                    boxShadow: '0 0 30px rgba(45, 212, 191,0.5)',
                    background: 'linear-gradient(135deg, #7c7ff5, #9d6ef8)',
                  }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING}
                >
                  Start Yearly
                </motion.button>
              </motion.div>

              {/* Lifetime card */}
              <motion.div
                style={S.monthlyCard}
                whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING}
              >
                <span style={S.tierLabel}>Lifetime</span>
                <div style={S.priceRow}>
                  <span style={{ ...S.priceLarge, fontSize: '26px' }}>$79</span>
                  <span style={S.priceSmall}> once</span>
                </div>
                <span style={S.priceSub}>Pay once, own forever</span>
                <motion.button
                  style={S.ghostBtn}
                  onClick={() => onUpgrade('lifetime')}
                  whileHover={{ background: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING}
                >
                  Get Lifetime
                </motion.button>
              </motion.div>
            </div>

            {/* Trust signals */}
            <div style={S.trustRow}>
              <span>🔒</span>
              <span>Secure payment · Cancel anytime · 30-day guarantee</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ProUpsellModal;

// ── Demo harness ─────────────────────────────────────────────────────────────

export function ProUpsellDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        padding: 40,
        background: '#070d1a',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 24,
      }}
    >
      <motion.button
        onClick={() => setOpen(true)}
        style={{
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
          border: 'none',
          borderRadius: '12px',
          color: '#fff',
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(45, 212, 191,0.4)',
          letterSpacing: '0.02em',
        }}
        whileHover={{ scale: 1.04, boxShadow: '0 6px 28px rgba(45, 212, 191,0.55)' }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        Open Upgrade Modal
      </motion.button>

      <ProUpsellModal
        open={open}
        onClose={() => setOpen(false)}
        onUpgrade={(plan) => {
          alert(`Selected: ${plan}`);
          setOpen(false);
        }}
        userName="Weston"
      />
    </div>
  );
}
