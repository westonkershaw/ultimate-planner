import React, { useCallback } from 'react';
import { motion, useAnimationControls } from 'framer-motion';

// ── Constants ────────────────────────────────────────────────────────────────

const SPRING = { type: 'spring', stiffness: 400, damping: 30 };

// Shake sequence: rapid side-to-side, respects prefers-reduced-motion
const SHAKE_KEYFRAMES = {
  x: [0, -6, 6, -5, 5, -3, 3, 0],
  transition: { duration: 0.45, ease: 'easeInOut' },
};

// ── Inline mode ──────────────────────────────────────────────────────────────

function InlineLockedFeature({ featureName, onUpgradeClick, children }) {
  const controls = useAnimationControls();

  const handleClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Respect prefers-reduced-motion
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReduced) {
        controls.start(SHAKE_KEYFRAMES);
      }

      onUpgradeClick();
    },
    [controls, onUpgradeClick]
  );

  return (
    <motion.div
      animate={controls}
      onClick={handleClick}
      aria-label={`${featureName} — Pro feature. Click to upgrade.`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
      style={{
        position: 'relative',
        display: 'inline-flex',
        cursor: 'not-allowed',
        userSelect: 'none',
      }}
    >
      {/* Children at reduced opacity, non-interactive */}
      <div
        style={{
          opacity: 0.4,
          pointerEvents: 'none',
          display: 'contents',
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Lock badge overlay */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRING}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(12,17,32,0.88)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '20px',
          padding: '3px 10px 3px 7px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: '11px' }}>🔒</span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textTransform: 'uppercase',
          }}
        >
          Pro
        </span>
      </motion.div>
    </motion.div>
  );
}

// ── Banner mode ──────────────────────────────────────────────────────────────

function BannerLockedFeature({ featureName, onUpgradeClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      whileHover={{
        borderColor: 'rgba(99,102,241,0.5)',
        background: 'rgba(99,102,241,0.12)',
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: '10px',
        padding: '10px 14px',
        gap: '12px',
        transition: 'background 0.15s',
      }}
    >
      {/* Left: lock icon + feature name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '14px' }}>🔒</span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#cbd5e1',
          }}
        >
          {featureName}
        </span>
      </div>

      {/* Right: upgrade CTA */}
      <motion.button
        onClick={onUpgradeClick}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.97 }}
        transition={SPRING}
        style={{
          background: 'none',
          border: 'none',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 700,
          color: '#818cf8',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
          letterSpacing: '0.01em',
        }}
        aria-label={`Upgrade to Pro to unlock ${featureName}`}
      >
        Upgrade to Pro →
      </motion.button>
    </motion.div>
  );
}

// ── LockedFeature (main export) ──────────────────────────────────────────────

function LockedFeature({ mode = 'inline', featureName, onUpgradeClick, children }) {
  if (mode === 'banner') {
    return (
      <BannerLockedFeature
        featureName={featureName}
        onUpgradeClick={onUpgradeClick}
      />
    );
  }

  return (
    <InlineLockedFeature
      featureName={featureName}
      onUpgradeClick={onUpgradeClick}
    >
      {children}
    </InlineLockedFeature>
  );
}

export default LockedFeature;
