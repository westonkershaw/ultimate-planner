/* eslint-disable */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Star, Shield, Infinity, Brain, Calendar, Bell, Smartphone } from "lucide-react";

const RC_API_KEY = import.meta.env.VITE_REVENUECAT_API_KEY || "";

// ─── RevenueCat Web SDK loader ────────────────────────────────────────────────
let _rc = null;
async function getRC(userId) {
  if (_rc) return _rc;
  if (!RC_API_KEY) return null;
  try {
    const { Purchases } = await import("@revenuecat/purchases-js");
    _rc = Purchases.configure(RC_API_KEY, userId);
    return _rc;
  } catch (e) {
    console.error("RevenueCat init failed:", e);
    return null;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Brain, label: "AI Planning Coach", desc: "Claude AI that knows your goals and keeps you accountable" },
  { icon: Infinity, label: "Unlimited Everything", desc: "Indicators, goals, tasks, journals, habits — zero caps" },
  { icon: Calendar, label: "iCal Export", desc: "Export tasks, goals & deadlines to any calendar app" },
  { icon: Shield, label: "No Ads — Ever", desc: "Completely ad-free, always" },
  { icon: Zap, label: "Advanced Analytics", desc: "Indicator trends, finance insights, health charts" },
  { icon: Bell, label: "Daily Motivation", desc: "Morning inspiration from your personal library" },
  { icon: Smartphone, label: "All Platforms", desc: "iOS, Android, Mac, Windows, Web — one subscription" },
  { icon: Star, label: "Early Access", desc: "New features before everyone else" },
];


const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "16px", overflowY: "auto",
  },
  modal: {
    background: "linear-gradient(180deg, #0d0f1a 0%, #08090d 100%)",
    border: "1px solid rgba(45, 212, 191,0.2)",
    borderRadius: 24, width: "100%", maxWidth: 560,
    maxHeight: "92vh", overflowY: "auto",
    boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(45, 212, 191,0.15)",
    position: "relative",
  },
  closeBtn: {
    position: "absolute", top: 16, right: 16, zIndex: 10,
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, color: "rgba(255,255,255,0.5)", cursor: "pointer",
    width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
  },
  header: { padding: "36px 28px 24px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)",
    borderRadius: 20, padding: "4px 14px", marginBottom: 16,
    fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: "0.8px", textTransform: "uppercase",
  },
  title: {
    fontFamily: "'Syne', serif", fontSize: 28, fontWeight: 900,
    color: "#f1f5f9", lineHeight: 1.2, marginBottom: 8,
  },
  subtitle: { fontSize: 14, color: "rgba(148,163,184,0.7)", lineHeight: 1.6 },
  plans: { padding: "20px 28px" },
  planCard: (selected, popular) => ({
    borderRadius: 14, padding: "14px 16px", cursor: "pointer",
    border: selected ? "2px solid #14b8a6" : popular ? "1.5px solid rgba(251,191,36,0.4)" : "1px solid rgba(51,65,85,0.5)",
    background: selected ? "rgba(45, 212, 191,0.1)" : popular ? "rgba(251,191,36,0.05)" : "rgba(15,23,42,0.5)",
    display: "flex", alignItems: "center", gap: 12, marginBottom: 10,
    transition: "all 0.18s", position: "relative",
    boxShadow: selected ? "0 0 0 1px rgba(45, 212, 191,0.3), 0 4px 16px rgba(45, 212, 191,0.15)" : "none",
  }),
  planRadio: (selected) => ({
    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
    border: selected ? "5px solid #14b8a6" : "2px solid rgba(100,116,139,0.5)",
    background: "transparent", transition: "all 0.15s",
  }),
  ctaBtn: (loading) => ({
    width: "100%", padding: "17px 0", borderRadius: 14, border: "none",
    background: loading ? "rgba(45, 212, 191,0.4)" : "linear-gradient(135deg, #14b8a6, #0e9488)",
    color: loading ? "rgba(255,255,255,0.5)" : "#fff",
    fontSize: 16, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: loading ? "none" : "0 8px 32px rgba(45, 212, 191,0.5)",
    marginTop: 4, transition: "all 0.2s",
  }),
  featureRow: {
    display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14,
  },
  featureIcon: {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    background: "rgba(45, 212, 191,0.12)", border: "1px solid rgba(45, 212, 191,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  trust: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
    fontSize: 11, color: "rgba(100,116,139,0.7)", marginTop: 10, flexWrap: "wrap",
  },
};

// ─── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, selected, onClick }) {
  return (
    <div style={S.planCard(selected, plan.popular)} onClick={onClick}>
      {plan.popular && (
        <div style={{
          position: "absolute", top: -10, left: 16,
          background: "linear-gradient(135deg,#fbbf24,#d97706)",
          color: "#000", fontSize: 9, fontWeight: 900,
          padding: "3px 12px", borderRadius: 20, letterSpacing: "0.5px"
        }}>BEST VALUE</div>
      )}
      <div style={S.planRadio(selected)} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{plan.label}</div>
        {plan.save && (
          <div style={{ fontSize: 11, color: "#34c98a", fontWeight: 600 }}>{plan.save}</div>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: plan.popular ? "#fbbf24" : "#f1f5f9", fontFamily: "'Syne',serif" }}>
          {plan.price}
        </div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)" }}>{plan.period}</div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PaywallModal({ authUser, onClose, onSuccess }) {
  const [selectedPlan, setSelectedPlan] = useState("yearly");
  const [loading, setLoading] = useState(false);
  const [rcLoading, setRcLoading] = useState(true);
  const [offerings, setOfferings] = useState(null);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [tab, setTab] = useState("plans"); // plans | features

  // Static plan definitions — used as fallback if no RC offerings loaded
  const STATIC_PLANS = [
    { id: "monthly", label: "Monthly", price: "$4.99", period: "/month", save: "", popular: false, rcId: "monthly" },
    { id: "yearly", label: "Yearly", price: "$49.99", period: "/year", save: "Save 17% — ~$4.17/mo", popular: true, rcId: "annual" },
    { id: "lifetime", label: "Lifetime", price: "$79", period: "one-time", save: "Never pay again", popular: false, rcId: "lifetime" },
  ];

  // Try to load RevenueCat offerings
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!RC_API_KEY || !authUser?.id) { setRcLoading(false); return; }
      try {
        const rc = await getRC(authUser.id);
        if (!rc || cancelled) { setRcLoading(false); return; }
        const off = await rc.getOfferings();
        if (!cancelled) setOfferings(off);
      } catch (e) {
        console.warn("RC offerings load failed:", e);
      } finally {
        if (!cancelled) setRcLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [authUser?.id]);

  // Get the packages from RC offerings or fall back to static
  const rcPackages = offerings?.current?.availablePackages || [];
  const plans = rcPackages.length > 0
    ? rcPackages.map((pkg) => ({
        id: pkg.identifier,
        label: pkg.packageType === "ANNUAL" ? "Yearly" : pkg.packageType === "MONTHLY" ? "Monthly" : pkg.packageType === "LIFETIME" ? "Lifetime" : pkg.identifier,
        price: pkg.storeProduct?.priceString || "—",
        period: pkg.packageType === "ANNUAL" ? "/year" : pkg.packageType === "MONTHLY" ? "/month" : "one-time",
        save: pkg.packageType === "ANNUAL" ? "Save 37%" : pkg.packageType === "LIFETIME" ? "Best value" : "",
        popular: pkg.packageType === "ANNUAL",
        rcPkg: pkg,
      }))
    : STATIC_PLANS;

  const handlePurchase = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError("");

    const plan = plans.find((p) => p.id === selectedPlan) || plans[0];

    // RevenueCat web purchase
    if (RC_API_KEY && plan.rcPkg) {
      try {
        const rc = await getRC(authUser?.id);
        if (!rc) throw new Error("RevenueCat not initialized");
        const result = await rc.purchase({ rcPackage: plan.rcPkg });
        const isPro = !!result.customerInfo?.entitlements?.active?.["pro"];
        if (isPro) {
          onSuccess({ isPro: true, plan: plan.id, customerId: result.customerInfo.originalAppUserId });
        } else {
          // Purchase went through but entitlement not found — verify server-side
          const verify = await fetch(`/api/revenuecat?userId=${encodeURIComponent(authUser?.id || "")}`)
            .then((r) => r.json());
          if (verify.isPro) {
            onSuccess({ isPro: true, plan: plan.id });
          } else {
            setError("Purchase complete but Pro not activated yet. Please try refreshing.");
          }
        }
      } catch (err) {
        if (err?.userCancelled) {
          // User closed the payment sheet — not an error
        } else {
          setError(err?.message || "Purchase failed. Please try again.");
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // No RC key configured — show error instead of granting Pro
    setError("Payment system is being configured. Please try again later or contact weston.kershaw@gmail.com");
    setLoading(false);
  }, [loading, selectedPlan, plans, authUser?.id, onSuccess]);

  const visibleFeatures = showAll ? FEATURES : FEATURES.slice(0, 4);

  return (
    <div style={S.overlay} onClick={onClose}>
      <motion.div
        style={S.modal}
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button style={S.closeBtn} onClick={onClose}><X size={14} /></button>

        {/* Header */}
        <div style={S.header}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg,#14b8a6,#0e9488)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 0 32px rgba(45, 212, 191,0.45)" }}>
            <Zap size={26} color="#fff" fill="#fff" />
          </div>
          <div style={S.badge}><Star size={10} />Ultimate Life Planner Pro</div>
          <div style={S.title}>Unlock Your Full Potential</div>
          <div style={S.subtitle}>
            AI coaching, unlimited goals, iCal export,<br />and everything you need to actually achieve your goals.
          </div>
          {/* College student story card */}
          <div style={{background: 'linear-gradient(135deg, rgba(45, 212, 191,0.12), rgba(14, 148, 136,0.08))', border: '1px solid rgba(45, 212, 191,0.25)', borderRadius: 12, padding: '16px 20px', marginTop: 20, textAlign: 'center'}}>
            <div style={{fontSize: 28, marginBottom: 8}}>👨‍💻</div>
            <p style={{color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: '0 0 6px'}}>
              Built by a college student, for people who want more from life
            </p>
            <p style={{color: '#94a3b8', fontSize: 13, margin: 0, lineHeight: 1.5}}>
              Your Pro subscription directly supports a student developer building the most comprehensive productivity app ever made. Every dollar goes back into making this app better for you. 🙏
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 28px" }}>
          {[["plans", "Choose Plan"], ["features", "What's Included"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: "12px 16px", fontSize: 13, fontWeight: tab === id ? 700 : 500,
                color: tab === id ? "#2dd4bf" : "rgba(148,163,184,0.5)",
                borderBottom: tab === id ? "2px solid #14b8a6" : "2px solid transparent",
                fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s",
              }}
            >{label}</button>
          ))}
        </div>

        {tab === "plans" && (
          <div style={S.plans}>
            {/* Plan cards */}
            {rcLoading ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(148,163,184,0.5)", fontSize: 13 }}>
                Loading plans…
              </div>
            ) : (
              plans.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  selected={selectedPlan === p.id}
                  onClick={() => setSelectedPlan(p.id)}
                />
              ))
            )}

            {/* CTA */}
            <button
              style={S.ctaBtn(loading || rcLoading)}
              onClick={handlePurchase}
              disabled={loading || rcLoading}
            >
              {loading ? "Processing…" : RC_API_KEY ? "Subscribe Now →" : "Start Free Trial →"}
            </button>

            {error && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, fontSize: 12, color: "#f87171" }}>
                {error}
              </div>
            )}

            {/* Trust badges */}
            <div style={S.trust}>
              <span>🔒 Secure checkout</span>
              <span>·</span>
              <span>↩ Cancel anytime</span>
              <span>·</span>
              <span>⚡ Instant access</span>
              {RC_API_KEY && <><span>·</span><span>Powered by RevenueCat</span></>}
            </div>

          </div>
        )}

        {tab === "features" && (
          <div style={{ padding: "20px 28px" }}>
            {visibleFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} style={S.featureRow}>
                  <div style={S.featureIcon}><Icon size={16} color="#2dd4bf" /></div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: "rgba(148,163,184,0.6)", lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                </div>
              );
            })}
            {!showAll && (
              <button
                onClick={() => setShowAll(true)}
                style={{ background: "transparent", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 10, color: "rgba(148,163,184,0.6)", cursor: "pointer", fontSize: 12, padding: "8px 16px", width: "100%", fontFamily: "'DM Sans',sans-serif" }}
              >
                Show all {FEATURES.length} features ↓
              </button>
            )}
            <button
              style={{ ...S.ctaBtn(false), marginTop: 20 }}
              onClick={() => setTab("plans")}
            >
              See Plans →
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
