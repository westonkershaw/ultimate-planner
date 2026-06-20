import React, { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function GoogleAuthButton({ onSuccess, onError, mode = 'signin' }) {
  const btnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    // Load Google GIS script dynamically so it doesn't affect page load or WKWebView
    if (!window.google?.accounts?.id) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
    function handleCredential(response) {
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        const user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          firstName: payload.given_name,
          lastName: payload.family_name,
          picture: payload.picture,
          provider: 'google',
          credential: response.credential,
        };
        onSuccess && onSuccess(user);
      } catch (e) {
        onError && onError(e);
      }
    }
    function initGoogle() {
      if (!window.google?.accounts?.id || !GOOGLE_CLIENT_ID) return;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        if (btnRef.current) {
          window.google.accounts.id.renderButton(btnRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: btnRef.current.offsetWidth || 320,
            text: mode === 'signup' ? 'signup_with' : 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });
        }
      } catch (e) {
        console.warn('Google sign-in init failed:', e);
      }
    }
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) {
      const t = setTimeout(() => {
        initGoogle();
      }, 1000);
      return () => clearTimeout(t);
    }
    initGoogle();
  }, [mode, onSuccess, onError]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div style={{
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        fontSize: 12,
        color: 'rgba(100,116,139,0.7)',
        textAlign: 'center',
      }}>
        Google Sign-In requires VITE_GOOGLE_CLIENT_ID
      </div>
    );
  }

  return (
    <div
      ref={btnRef}
      style={{ width: '100%', minHeight: 44, borderRadius: 10, overflow: 'hidden' }}
      aria-label={mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
    />
  );
}
