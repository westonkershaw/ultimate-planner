import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Brain, BarChart2, Camera, DollarSign, Shield, Star } from 'lucide-react';

const SPRING = { type: 'spring', stiffness: 400, damping: 30 };

const PRICING_STYLES = `
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes floatUp {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-4px); }
}
@media (prefers-reduced-motion: reduce) {
  .price-shimmer { animation: none !important; }
  .float-icon    { animation: none !important; }
}
`;

const PLANS = [
  {
    key: 'monthly',
    label: 'Monthly',
    price: '$4.99',
    per: '/mo',
    note: 'Most flexible · helps fund new features',
    badge: null,
    highlight: false,
    ctaLabel: 'Start Monthly',
  },
  {
    key: 'yearly',
    label: 'Yearly',
    price: '$49.99',
    per: '/yr',
    note: 'Save 17%  ·  ~$4.17/mo',
    badge: 'BEST VALUE',
    highlight: true,
    ctaLabel: 'Start Yearly',
  },
  {
    key: 'lifetime',
    label: 'Lifetime',
    price: '$79',
    per: '',
    note: 'Pay once, own forever',
    badge: null,
    highlight: false,
    ctaLabel: 'Get Lifetime',
  },
];

const PRO_FEATURES = [
  { icon: Brain,      label: 'AI Coach',             desc: 'Daily personalised coaching, goal breakdowns & accountability nudges.' },
  { icon: BarChart2,  label: 'Advanced Analytics',   desc: '90-day trends, habit correlations, and weekly life-score breakdowns.' },
  { icon: Camera,     label: 'Food Scanner',          desc: 'Point your camera at any meal to log macros instantly.' },
  { icon: DollarSign, label: 'Finance Insights',      desc: 'Category trends, savings goals, and a bill-negotiation AI assistant.' },
  { icon: Zap,        label: 'Unlimited Everything',  desc: 'No limits on tasks, habits, goals, or journal entries.' },
];

const CONTEXT_FEATURES = {
  ai_coach:     { label: 'AI Coach',            items: ['Daily personalised coaching cards', 'Goal breakdown into weekly action steps', 'Accountability nudges when you fall off track'] },
  analytics:    { label: 'Advanced Analytics',  items: ['Habit trends over 12 weeks', 'Goal completion rate charts', 'Cross-dimension life score breakdown'] },
  food_scanner: { label: 'Food Scanner',        items: ['Snap a photo to log any meal instantly', 'Macro & calorie breakdown via AI Vision', 'Meal history with weekly nutrition trends'] },
  cloud_sync:   { label: 'Data Export',         items: ['Export all your data as CSV anytime', 'Full data backup in one click', 'Restore from any saved backup'] },
  finance:      { label: 'Finance Insights',    items: ['Spending category trends & sparklines', 'Savings goal liquid-fill progress', 'Bill negotiation AI assistant'] },
};

const FAQ_ITEMS = [
  { q: 'Can I cancel anytime?',         a: 'Yes — cancel from your account settings at any time, no questions asked.' },
  { q: "What's the 30-day guarantee?",  a: 'Not happy within 30 days? Email weston.kershaw@gmail.com for a full refund.' },
  { q: 'Does Lifetime include updates?', a: 'Yes. One payment, all future features and updates included forever.' },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function ContextBanner({ featureContext }) {
  const ctx = CONTEXT_FEATURES[featureContext];
  if (!ctx) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...SPRING, delay: 0.02 }}
      style={{
        background: 'linear-gradient(135deg,rgba(45, 212, 191,0.12),rgba(14, 148, 136,0.08))',
        border: '1px solid rgba(45, 212, 191,0.3)',
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>
        🔒 {ctx.label} is a Pro feature
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ctx.items.map((item) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={11} color="#34d399" />
            <span style={{ fontSize: 12, color: 'rgba(203,213,225,0.85)' }}>{item}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function PlanCard({ plan, selected, onSelect, disabled }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={() => !disabled && onSelect(plan.key)}
      aria-pressed={selected}
      style={{
        position: 'relative',
        flex: 1,
        padding: plan.highlight ? '18px 12px' : '16px 10px',
        borderRadius: 16,
        border: selected
          ? plan.highlight
            ? '2px solid #2dd4bf'
            : '2px solid rgba(45, 212, 191,0.55)'
          : plan.highlight
          ? '1.5px solid rgba(45, 212, 191,0.35)'
          : '1px solid rgba(255,255,255,0.08)',
        background: selected
          ? plan.highlight
            ? 'linear-gradient(160deg,rgba(45, 212, 191,0.2),rgba(14, 148, 136,0.14))'
            : 'rgba(45, 212, 191,0.1)'
          : plan.highlight
          ? 'linear-gradient(160deg,rgba(45, 212, 191,0.08),rgba(14, 148, 136,0.04))'
          : 'rgba(255,255,255,0.025)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s',
        boxShadow: plan.highlight && selected
          ? '0 0 28px rgba(45, 212, 191,0.22)'
          : plan.highlight
          ? '0 0 18px rgba(45, 212, 191,0.1)'
          : 'none',
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      {plan.badge && (
        <div style={{
          position: 'absolute',
          top: -9,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(90deg,#14b8a6,#8b5cf6)',
          color: '#fff',
          fontSize: 8,
          fontWeight: 900,
          letterSpacing: '0.08em',
          padding: '2px 8px',
          borderRadius: 20,
          whiteSpace: 'nowrap',
        }}>
          {plan.badge}
        </div>
      )}
      <div style={{ fontSize: 10, fontWeight: 700, color: plan.highlight ? '#a5b4fc' : 'rgba(148,163,184,0.65)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
        {plan.label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1, marginBottom: 4 }}>
        <span style={{ fontSize: plan.highlight ? 28 : 24, fontWeight: 900, color: plan.highlight ? '#e0e7ff' : '#f1f5f9', lineHeight: 1, fontFamily: "'Syne',serif" }}>
          {plan.price}
        </span>
        {plan.per && (
          <span style={{ fontSize: 10, color: 'rgba(100,116,139,0.7)', alignSelf: 'flex-end', marginBottom: 2 }}>
            {plan.per}
          </span>
        )}
      </div>
      <div style={{ fontSize: 10, color: plan.highlight ? 'rgba(165,180,252,0.7)' : 'rgba(148,163,184,0.5)', lineHeight: 1.4 }}>
        {plan.note}
      </div>
      {selected && (
        <div style={{ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', background: '#14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={9} color="#fff" />
        </div>
      )}
    </motion.button>
  );
}

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div style={{
      background: isOpen ? 'rgba(45, 212, 191,0.06)' : 'rgba(255,255,255,0.02)',
      border: isOpen ? '1px solid rgba(45, 212, 191,0.2)' : '1px solid rgba(255,255,255,0.05)',
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'all 0.15s',
    }}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 8 }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: isOpen ? '#e2e8f0' : 'rgba(203,213,225,0.8)', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>
          {item.q}
        </span>
        <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.18 }} style={{ fontSize: 16, color: 'rgba(100,116,139,0.6)', flexShrink: 0, lineHeight: 1 }}>+</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{ margin: 0, padding: '0 12px 10px', fontSize: 12, color: 'rgba(148,163,184,0.75)', lineHeight: 1.6, fontFamily: "'DM Sans',sans-serif" }}>
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── PricingModal ───────────────────────────────────────────────────────────────

export default function PricingModal({
  onClose,
  onUpgrade,
  onRestore,
  currentPlan: _currentPlan = 'free',
  currentUserEmail,
  featureContext,
}) {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openFAQ, setOpenFAQ] = useState(null);

  const handleKeyDown = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  async function handleCTA() {
    if (loading) return;
    if (onUpgrade) { onUpgrade(selectedPlan); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing: selectedPlan, email: currentUserEmail }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { setError(data.error || 'Payment setup failed. Try again.'); }
    } catch {
      setError('Could not connect to payment server.');
    }
    setLoading(false);
  }

  const activePlan = PLANS.find((p) => p.key === selectedPlan) || PLANS[1];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to Pro"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(4,6,10,0.88)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', overflowY: 'auto',
      }}
    >
      <style>{PRICING_STYLES}</style>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        style={{
          background: 'linear-gradient(160deg,#0b101c,#0f172a 50%,#0d0b1f)',
          border: '1px solid rgba(45, 212, 191,0.2)',
          borderRadius: 24,
          padding: '24px 20px 20px',
          maxWidth: 460,
          width: '100%',
          maxHeight: '94vh',
          overflowY: 'auto',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(45, 212, 191,0.06)',
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            {/* Social proof row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 1 }}>
                {[...Array(5)].map((_, i) => <Star key={i} size={11} color="#fbbf24" fill="#fbbf24" />)}
              </div>
              <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.65)', fontWeight: 600 }}>Loved by 1,000+ people</span>
            </div>
            {/* Title */}
            <div style={{ fontSize: 24, fontWeight: 900, color: '#f1f5f9', lineHeight: 1.1, marginBottom: 4, fontFamily: "'Syne',serif" }}>
              Unlock your full potential
            </div>
            <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.65)' }}>
              Everything you need to win every day.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, color: 'rgba(100,116,139,0.6)', width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Context banner ── */}
        {featureContext && featureContext !== 'default' && (
          <ContextBanner featureContext={featureContext} />
        )}

        {/* ── Pro features ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.06 }}
          style={{ marginBottom: 22 }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(45, 212, 191,0.75)', marginBottom: 10 }}>
            What you unlock
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PRO_FEATURES.map((feat) => {
              const FeatIcon = feat.icon;
              return (
                <div key={feat.label} style={{
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12, padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(45, 212, 191,0.14)', border: '1px solid rgba(45, 212, 191,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FeatIcon size={13} color="#2dd4bf" />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{feat.label}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', margin: 0, lineHeight: 1.5 }}>{feat.desc}</p>
                </div>
              );
            })}
            {/* "And much more" pill */}
            <div style={{
              background: 'rgba(45, 212, 191,0.06)', border: '1px solid rgba(45, 212, 191,0.15)',
              borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'rgba(165,180,252,0.7)', fontWeight: 600 }}>+ much more ✨</span>
            </div>
          </div>
        </motion.div>

        {/* ── Plan cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.12 }}
          style={{ marginBottom: 14 }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(45, 212, 191,0.75)', marginBottom: 10 }}>
            Choose your plan
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.key}
                plan={plan}
                selected={selectedPlan === plan.key}
                onSelect={setSelectedPlan}
                disabled={loading}
              />
            ))}
          </div>
        </motion.div>

        {/* ── CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.18 }}
        >
          <motion.button
            whileHover={loading ? {} : { scale: 1.02 }}
            whileTap={loading ? {} : { scale: 0.98 }}
            onClick={handleCTA}
            disabled={loading}
            style={{
              width: '100%', padding: '15px', borderRadius: 14, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg,#14b8a6 0%,#8b5cf6 100%)',
              color: '#fff', fontSize: 15, fontWeight: 800,
              boxShadow: loading ? 'none' : '0 8px 28px rgba(45, 212, 191,0.4)',
              marginBottom: 10, opacity: loading ? 0.7 : 1,
              fontFamily: "'DM Sans',sans-serif", letterSpacing: '0.01em',
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Loading…' : `${activePlan.ctaLabel} — ${activePlan.price}${activePlan.per} →`}
          </motion.button>

          {error && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#f87171', margin: '0 0 8px', fontWeight: 600 }}>{error}</p>
          )}

          {/* Trust row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Shield size={11} color="rgba(100,116,139,0.55)" />
              <span style={{ fontSize: 10, color: 'rgba(100,116,139,0.6)', fontWeight: 600 }}>30-day guarantee</span>
            </div>
            <span style={{ color: 'rgba(100,116,139,0.3)', fontSize: 10 }}>·</span>
            <span style={{ fontSize: 10, color: 'rgba(100,116,139,0.6)', fontWeight: 600 }}>Cancel anytime</span>
            <span style={{ color: 'rgba(100,116,139,0.3)', fontSize: 10 }}>·</span>
            <span style={{ fontSize: 10, color: 'rgba(100,116,139,0.6)', fontWeight: 600 }}>Secure payment</span>
          </div>
        </motion.div>

        {/* ── FAQ ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.22 }}
          style={{ marginBottom: 20 }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(45, 212, 191,0.75)', marginBottom: 10 }}>
            Questions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {FAQ_ITEMS.map((item, i) => (
              <FAQItem
                key={i}
                item={item}
                isOpen={openFAQ === i}
                onToggle={() => setOpenFAQ(openFAQ === i ? null : i)}
              />
            ))}
          </div>
        </motion.div>

        {/* ── Restore & legal ── */}
        <div style={{ textAlign: 'center' }}>
          {onRestore && (
            <button
              onClick={onRestore}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(45, 212, 191,0.55)', fontFamily: "'DM Sans',sans-serif", marginBottom: 8, display: 'block', width: '100%' }}
            >
              Restore purchases
            </button>
          )}
          <p style={{ fontSize: 10, color: 'rgba(100,116,139,0.5)', margin: '0 0 6px', lineHeight: 1.6 }}>
            💛 Your subscription directly funds new features — thank you for supporting indie development!
          </p>
          <p style={{ fontSize: 10, color: 'rgba(71,85,105,0.55)', margin: 0, lineHeight: 1.6 }}>
            By upgrading you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(45, 212, 191,0.6)', textDecoration: 'underline' }}>Terms</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(45, 212, 191,0.6)', textDecoration: 'underline' }}>Privacy Policy</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
