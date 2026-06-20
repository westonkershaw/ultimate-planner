import React, { useEffect, useRef, useState } from 'react';

const APPLE_CLIENT_ID  = import.meta.env.VITE_APPLE_CLIENT_ID  || '';
const APPLE_REDIRECT   = import.meta.env.VITE_APPLE_REDIRECT_URI || window.location.origin;
const IS_NATIVE = typeof window !== 'undefined' && !!window.ReactNativeWebView;

// Loads the Apple JS SDK once and resolves when ready
let sdkReady = null;
function loadAppleSDK() {
  if (sdkReady) return sdkReady;
  sdkReady = new Promise((resolve, reject) => {
    if (window.AppleID) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    s.crossOrigin = 'anonymous';
    s.onload  = () => resolve();
    s.onerror = () => { sdkReady = null; reject(new Error('Apple SDK failed to load')); };
    document.head.appendChild(s);
  });
  return sdkReady;
}

export default function AppleAuthButton({ onSuccess, onError }) {
  const [loading, setLoading]   = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(IS_NATIVE || !!window.AppleID);
  const initialized = useRef(false);

  // Listen for native Apple Sign-In results via the RC bridge
  useEffect(() => {
    if (!IS_NATIVE) return;
    const prev = window.__rcBridge;
    window.__rcBridge = (msg) => {
      if (msg.type === 'APPLE_SIGN_IN_SUCCESS') {
        setLoading(false);
        onSuccess && onSuccess(msg.user);
      } else if (msg.type === 'APPLE_SIGN_IN_ERROR') {
        setLoading(false);
        onError && onError(new Error(msg.error));
      } else if (msg.type === 'APPLE_SIGN_IN_CANCELLED') {
        setLoading(false);
      } else if (prev) {
        prev(msg);
      }
    };
    return () => { window.__rcBridge = prev; };
  }, [onSuccess, onError]);

  useEffect(() => {
    if (IS_NATIVE || !APPLE_CLIENT_ID) return;
    loadAppleSDK()
      .then(() => {
        if (!initialized.current) {
          window.AppleID.auth.init({
            clientId:    APPLE_CLIENT_ID,
            scope:       'name email',
            redirectURI: APPLE_REDIRECT,
            usePopup:    true,
          });
          initialized.current = true;
        }
        setSdkLoaded(true);
      })
      .catch((e) => console.warn('Apple SDK load failed:', e));
  }, []);

  async function handleClick() {
    if (loading) return;

    // Native WebView: delegate to expo-apple-authentication
    if (IS_NATIVE) {
      setLoading(true);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'APPLE_SIGN_IN' }));
      return;
    }

    if (!window.AppleID) return;
    setLoading(true);
    try {
      const response = await window.AppleID.auth.signIn();
      const { authorization, user } = response;

      // Apple only sends name on first sign-in — cache it
      const firstName = user?.name?.firstName || '';
      const lastName  = user?.name?.lastName  || '';

      // Decode identity token (JWT) — no secret needed client-side
      const payload = JSON.parse(atob(authorization.id_token.split('.')[1]));

      const email = user?.email || payload.email || '';
      const appleUser = {
        id:        payload.sub,
        email,
        name:      [firstName, lastName].filter(Boolean).join(' ') || email,
        firstName,
        lastName,
        provider:  'apple',
        idToken:   authorization.id_token,
        createdAt: new Date().toISOString(),
      };

      // Cache name because Apple only sends it once
      if (firstName) {
        try {
          const cache = JSON.parse(localStorage.getItem('up_apple_users') || '{}');
          cache[payload.sub] = { firstName, lastName, email };
          localStorage.setItem('up_apple_users', JSON.stringify(cache));
        } catch { /* swallow — localStorage may be unavailable */ }
      } else {
        // Try to restore name from cache
        try {
          const cache = JSON.parse(localStorage.getItem('up_apple_users') || '{}');
          const cached = cache[payload.sub];
          if (cached) {
            appleUser.firstName = cached.firstName;
            appleUser.lastName  = cached.lastName;
            appleUser.name      = [cached.firstName, cached.lastName].filter(Boolean).join(' ') || email;
          }
        } catch { /* swallow — localStorage may be unavailable */ }
      }

      onSuccess && onSuccess(appleUser);
    } catch (err) {
      // User closed popup — not an error
      if (err?.error === 'popup_closed_by_user' || err?.error === 'user_cancelled_authorize') {
        setLoading(false);
        return;
      }
      onError && onError(err);
    }
    setLoading(false);
  }

  if (!APPLE_CLIENT_ID) {
    return (
      <div style={{
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        fontSize: 12,
        color: 'rgba(100,116,139,0.5)',
        textAlign: 'center',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Apple Sign-In not configured
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || (!IS_NATIVE && !sdkLoaded)}
      aria-label="Sign in with Apple"
      style={{
        width: '100%',
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        background: '#000',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        color: '#fff',
        fontSize: 14,
        fontWeight: 600,
        fontFamily: '-apple-system, "DM Sans", sans-serif',
        cursor: loading || !sdkLoaded ? 'not-allowed' : 'pointer',
        opacity: loading || !sdkLoaded ? 0.6 : 1,
        transition: 'opacity 0.2s',
        letterSpacing: '-0.1px',
      }}
    >
      {/* Apple logo SVG */}
      {!loading && (
        <svg width="17" height="20" viewBox="0 0 814 1000" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.6C46.5 790.5 0 663 0 541.8c0-207.6 141.4-317.3 280.2-317.3 74.3 0 136.5 48.8 179.4 48.8 41.4 0 112.1-51.9 198.5-51.9 31.9 0 108.2 2.6 168.5 76zm-234.8-147.3c33.8-40.8 56.8-97.7 56.8-154.6 0-7.7-.6-15.4-1.9-21.7-53.8 2-117.1 35.8-155.5 82.7-31.9 37.5-61.6 94.4-61.6 152.5 0 8.3 1.3 16.6 1.9 19.2 3.2.6 8.3 1.3 13.4 1.3 47.5 0 108.2-32.5 146.9-79.4z"/>
        </svg>
      )}
      {loading && (
        <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'authSpinner 0.7s linear infinite' }} />
      )}
      {loading ? (IS_NATIVE ? 'Connecting to Apple…' : 'Signing in…') : 'Sign in with Apple'}
    </button>
  );
}
