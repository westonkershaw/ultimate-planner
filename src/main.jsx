import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.user) delete event.user.email;
    return event;
  },
});

window.__sentry_captureException = Sentry.captureException;

import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

// Disable service worker in native app WebView — Workbox can intercept
// WKWebView navigation and cause a permanent white screen
if ('serviceWorker' in navigator && window.ReactNativeWebView) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  });
}

// ── Shell selector ─────────────────────────────────────────────────────────
// The redesigned TS shell (App.tsx) is now the default. The legacy monolith
// (App.jsx) remains available as an escape hatch via ?next=0 (persists in
// localStorage); ?next=1 re-opts into the new shell.
const SHELL_KEY = 'up_shell';
const params = new URLSearchParams(window.location.search);
if (params.has('next')) {
  const v = params.get('next');
  if (v === '0' || v === 'off') localStorage.setItem(SHELL_KEY, 'legacy');
  else localStorage.setItem(SHELL_KEY, 'next');
}
const useNextShell = localStorage.getItem(SHELL_KEY) !== 'legacy';

async function mount() {
  const AppModule = useNextShell
    ? await import('./App.tsx')
    : await import('./App.jsx');
  const App = AppModule.default;

  ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

mount();
