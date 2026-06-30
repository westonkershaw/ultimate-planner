import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Spinner SVG — fixed 20x20, no external deps
// ---------------------------------------------------------------------------
function SpinnerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <circle
        cx="10"
        cy="10"
        r="8"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2"
      />
      <path
        d="M10 2a8 8 0 0 1 8 8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 10 10"
          to="360 10 10"
          dur="0.75s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Checkmark SVG — fixed 20x20
// ---------------------------------------------------------------------------
function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path
        d="M4 10.5l4.5 4.5 7.5-9"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Keyframe styles — injected once into <head>
// ---------------------------------------------------------------------------
const STYLE_ID = "login-page-keyframes";

const KEYFRAME_CSS = `
  @keyframes gradientDrift {
    0%   { background-position: 0% 0%;    }
    25%  { background-position: 80% 20%;  }
    50%  { background-position: 100% 80%; }
    75%  { background-position: 20% 100%; }
    100% { background-position: 0% 0%;    }
  }

  @keyframes loginCardFloat {
    0%, 100% { transform: translateY(0px);  }
    50%       { transform: translateY(-4px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .login-bg-animate  { animation: none !important; }
    .login-card-float  { animation: none !important; }
  }
`;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement("style");
  tag.id = STYLE_ID;
  tag.textContent = KEYFRAME_CSS;
  document.head.appendChild(tag);
}

// ---------------------------------------------------------------------------
// Shared style tokens
// ---------------------------------------------------------------------------
const S = {
  inputBase: {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 10,
    padding: "12px 16px",
    color: "#e2e8f0",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(148,163,184,0.8)",
    marginBottom: 6,
    letterSpacing: "0.02em",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
};

// ---------------------------------------------------------------------------
// Animated field wrapper — slides in from above for sign-up fields
// ---------------------------------------------------------------------------
function AnimatedField({ children, id }) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={S.fieldGroup}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Focused input — tracks focus state to apply indigo glow
// forwardRef so parent can call .focus() on the underlying input
// ---------------------------------------------------------------------------
const FocusInput = React.forwardRef(function FocusInput(
  { id, type = "text", placeholder, value, onChange, autoComplete, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);

  const focusStyle = focused
    ? {
        borderColor: "rgba(45, 212, 191,0.6)",
        boxShadow: "0 0 0 3px rgba(45, 212, 191,0.15)",
      }
    : {};

  return (
    <motion.input
      ref={ref}
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...S.inputBase, ...focusStyle }}
      whileFocus={{
        borderColor: "rgba(45, 212, 191,0.6)",
        boxShadow: "0 0 0 3px rgba(45, 212, 191,0.15)",
      }}
      {...rest}
    />
  );
});

// ---------------------------------------------------------------------------
// Main LoginPage component
// ---------------------------------------------------------------------------

/**
 * @param {{ onAuth: (user: object) => void, defaultMode?: "login" | "signup" }} props
 */
export default function LoginPage({ onAuth, defaultMode = "login" }) {
  // Inject keyframes once on mount
  useEffect(() => {
    injectStyles();
  }, []);

  const [mode, setMode] = useState(defaultMode);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // "idle" | "loading" | "success" | "error"
  const [submitState, setSubmitState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const firstFieldRef = useRef(null);

  // Focus first field when mode switches
  useEffect(() => {
    const t = setTimeout(() => firstFieldRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [mode]);

  const handleToggleMode = useCallback(() => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setErrorMsg("");
    setSubmitState("idle");
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (submitState === "loading" || submitState === "success") return;

      setErrorMsg("");

      // Basic validation
      if (!email.trim()) {
        setErrorMsg("Email is required.");
        setSubmitState("error");
        return;
      }
      if (!password.trim()) {
        setErrorMsg("Password is required.");
        setSubmitState("error");
        return;
      }
      if (mode === "signup" && (!firstName.trim() || !lastName.trim())) {
        setErrorMsg("Please enter your first and last name.");
        setSubmitState("error");
        return;
      }

      setSubmitState("loading");

      // Mock auth — 1500ms simulated network delay
      await new Promise((res) => setTimeout(res, 1500));

      // Simulate occasional error for UX demonstration
      // (In real use this would come from the auth provider)
      const isPro = email.toLowerCase().includes("pro@");
      const name =
        mode === "signup"
          ? `${firstName.trim()} ${lastName.trim()}`
          : "Weston Kershaw";

      const user = {
        id: "mock-1",
        name,
        email: email.trim(),
        isPro,
      };

      setSubmitState("success");

      // Brief success pause then call onAuth
      await new Promise((res) => setTimeout(res, 600));

      if (typeof onAuth === "function") {
        onAuth(user);
      }
    },
    [submitState, email, password, firstName, lastName, mode, onAuth]
  );

  const isSignup = mode === "signup";
  const buttonLabel = isSignup ? "Create Account" : "Log In";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      className="login-bg-animate"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background:
          "radial-gradient(ellipse 120% 120% at 50% 50%, #1a1040 0%, #0a0f1e 40%, #070d1a 100%)",
        backgroundSize: "300% 300%",
        animation: "gradientDrift 18s ease-in-out infinite",
        overflowY: "auto",
        zIndex: 9999,
      }}
      role="main"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Glassmorphic card                                                    */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border:
            submitState === "error"
              ? "1px solid rgba(239,68,68,0.25)"
              : "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset",
          overflow: "hidden",
          transition: "border-color 0.3s",
        }}
        aria-label="Authentication card"
      >
        {/* Inner padding */}
        <div style={{ padding: "36px 32px 32px" }}>
          {/* -------------------------------------------------------------- */}
          {/* Logo + value prop + mode heading                                 */}
          {/* -------------------------------------------------------------- */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                fontFamily: "'Syne', system-ui, sans-serif",
                fontWeight: 800,
                fontSize: 22,
                color: "#f1f5f9",
                letterSpacing: "-0.5px",
                lineHeight: 1.2,
              }}
            >
              ✦ Ultimate Life Planner
            </div>

            {/* Value prop — only shown to new users on the login screen */}
            {!isSignup && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: "#94a3b8",
                  lineHeight: 1.5,
                  letterSpacing: "0.01em",
                }}
              >
                Goals, habits, health &amp; finances — all in one place.
              </div>
            )}

            {/* Mode heading */}
            <div
              style={{
                marginTop: isSignup ? 16 : 20,
                fontFamily: "'Syne', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: "#e2e8f0",
                letterSpacing: "-0.3px",
              }}
            >
              {isSignup ? "Create your free account" : "Welcome back"}
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Form                                                             */}
          {/* -------------------------------------------------------------- */}
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label={isSignup ? "Sign up form" : "Log in form"}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Sign-up extra fields — animated in/out */}
              <AnimatePresence initial={false}>
                {isSignup && (
                  <>
                    <AnimatedField id="firstName-field">
                      <label htmlFor="firstName" style={S.label}>
                        First Name
                      </label>
                      <FocusInput
                        id="firstName"
                        ref={firstFieldRef}
                        placeholder="Jane"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                        aria-required="true"
                      />
                    </AnimatedField>
                    <AnimatedField id="lastName-field">
                      <label htmlFor="lastName" style={S.label}>
                        Last Name
                      </label>
                      <FocusInput
                        id="lastName"
                        placeholder="Smith"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                        aria-required="true"
                      />
                    </AnimatedField>
                  </>
                )}
              </AnimatePresence>

              {/* Email — always present */}
              <div style={S.fieldGroup}>
                <label htmlFor="email" style={S.label}>
                  Email
                </label>
                <FocusInput
                  id="email"
                  type="email"
                  ref={isSignup ? undefined : firstFieldRef}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  aria-required="true"
                />
              </div>

              {/* Password — always present */}
              <div style={S.fieldGroup}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 6,
                  }}
                >
                  <label htmlFor="password" style={{ ...S.label, marginBottom: 0 }}>
                    Password
                  </label>
                  {!isSignup && (
                    <button
                      type="button"
                      onClick={() => {}}
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(129,140,248,0.75)",
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: "pointer",
                        padding: 0,
                        fontFamily: "inherit",
                        letterSpacing: "0.01em",
                      }}
                      aria-label="Reset forgotten password"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <FocusInput
                  id="password"
                  type="password"
                  placeholder={isSignup ? "At least 8 characters" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  aria-required="true"
                  aria-describedby={isSignup ? "password-hint" : undefined}
                />
                {isSignup && (
                  <span
                    id="password-hint"
                    style={{
                      fontSize: 11,
                      color: "rgba(148,163,184,0.55)",
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    Minimum 8 characters. You can change this anytime.
                  </span>
                )}
              </div>

              {/* ----------------------------------------------------------
                  Submit button — fixed dimensions, AnimatePresence for inner swap
              ---------------------------------------------------------- */}
              <motion.button
                type="submit"
                disabled={submitState === "loading" || submitState === "success"}
                whileHover={
                  submitState === "idle" || submitState === "error"
                    ? { scale: 1.015, filter: "brightness(1.08)" }
                    : {}
                }
                whileTap={
                  submitState === "idle" || submitState === "error"
                    ? { scale: 0.985 }
                    : {}
                }
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{
                  position: "relative",
                  width: "100%",
                  height: 46,
                  background:
                    submitState === "success"
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : "linear-gradient(135deg, #14b8a6, #8b5cf6)",
                  border: "none",
                  borderRadius: 12,
                  color: "white",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor:
                    submitState === "loading" || submitState === "success"
                      ? "not-allowed"
                      : "pointer",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.4s ease",
                  letterSpacing: "0.01em",
                }}
                aria-label={
                  submitState === "loading"
                    ? "Authenticating, please wait"
                    : submitState === "success"
                    ? "Authentication successful"
                    : buttonLabel
                }
                aria-busy={submitState === "loading"}
                aria-live="polite"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {submitState === "loading" && (
                    <motion.span
                      key="spinner"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SpinnerIcon />
                    </motion.span>
                  )}

                  {submitState === "success" && (
                    <motion.span
                      key="check"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckIcon />
                    </motion.span>
                  )}

                  {(submitState === "idle" || submitState === "error") && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {buttonLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* ----------------------------------------------------------
                  Error message — slides down
              ---------------------------------------------------------- */}
              <AnimatePresence initial={false}>
                {errorMsg && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    role="alert"
                    aria-live="assertive"
                    style={{
                      fontSize: 13,
                      color: "#fca5a5",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      lineHeight: 1.5,
                    }}
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>

          {/* -------------------------------------------------------------- */}
          {/* Social auth buttons (Google + Apple)                            */}
          {/* -------------------------------------------------------------- */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "20px 0 16px",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", letterSpacing: "0.04em" }}>
              OR CONTINUE WITH
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {/* Google */}
            <motion.button
              type="button"
              onClick={() => typeof onAuth === "function" && onAuth({ id: "google-mock", name: "Google User", email: "user@gmail.com", isPro: false })}
              whileHover={{ scale: 1.02, filter: "brightness(1.1)" }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{
                flex: 1,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 10,
                color: "#e2e8f0",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s",
              }}
              aria-label="Continue with Google"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Google
            </motion.button>

            {/* Apple */}
            <motion.button
              type="button"
              onClick={() => typeof onAuth === "function" && onAuth({ id: "apple-mock", name: "Apple User", email: "user@icloud.com", isPro: false })}
              whileHover={{ scale: 1.02, filter: "brightness(1.1)" }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{
                flex: 1,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 10,
                color: "#e2e8f0",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s",
              }}
              aria-label="Continue with Apple"
            >
              <svg width="16" height="18" viewBox="0 0 16 18" fill="none" aria-hidden="true">
                <path d="M13.21 9.558c-.02-2.063 1.686-3.065 1.762-3.114-.96-1.403-2.455-1.595-2.985-1.616-1.267-.13-2.48.751-3.122.751-.643 0-1.628-.735-2.678-.714-1.373.02-2.646.8-3.352 2.024-1.433 2.48-.366 6.151 1.027 8.161.683.987 1.496 2.093 2.564 2.054 1.03-.041 1.417-.66 2.662-.66 1.245 0 1.593.66 2.678.638 1.107-.02 1.806-.998 2.483-1.987.784-1.138 1.106-2.24 1.124-2.297-.024-.011-2.155-.825-2.163-3.24z" fill="white"/>
                <path d="M11.178 3.265c.567-.686.951-1.638.847-2.587-.818.033-1.806.545-2.39 1.231-.525.607-.984 1.578-.861 2.506.912.071 1.838-.463 2.404-1.15z" fill="white"/>
              </svg>
              Apple
            </motion.button>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Guest mode link                                                  */}
          {/* -------------------------------------------------------------- */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => typeof onAuth === "function" && onAuth({ id: "guest", name: "Guest", email: "", isPro: false })}
              style={{
                background: "none",
                border: "none",
                color: "rgba(148,163,184,0.6)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                padding: "4px 8px",
                fontFamily: "inherit",
                textDecoration: "underline",
                textDecorationColor: "rgba(148,163,184,0.3)",
                textUnderlineOffset: 2,
              }}
              aria-label="Try the app without creating an account"
            >
              Try without an account
            </button>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Mode toggle link                                                 */}
          {/* -------------------------------------------------------------- */}
          <div
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "rgba(148,163,184,0.75)",
            }}
          >
            {isSignup ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={handleToggleMode}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2dd4bf",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 13,
                    padding: 0,
                    fontFamily: "inherit",
                    textDecoration: "underline",
                    textDecorationColor: "rgba(129,140,248,0.4)",
                    textUnderlineOffset: 2,
                  }}
                  aria-label="Switch to log in"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                No account yet?{" "}
                <button
                  type="button"
                  onClick={handleToggleMode}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2dd4bf",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 13,
                    padding: 0,
                    fontFamily: "inherit",
                    textDecoration: "underline",
                    textDecorationColor: "rgba(129,140,248,0.4)",
                    textUnderlineOffset: 2,
                  }}
                  aria-label="Switch to sign up"
                >
                  Sign up free
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
