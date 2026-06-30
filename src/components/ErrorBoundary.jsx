import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to Sentry if available
    if (window.__sentry_captureException) {
      window.__sentry_captureException(error, { extra: errorInfo });
    }
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#08090d', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 32,
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: 480, textAlign: 'center',
            background: 'rgba(15,17,26,0.9)', border: '1px solid rgba(45, 212, 191,0.3)',
            borderRadius: 16, padding: 40
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>😵</div>
            <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
              The app hit an unexpected error. Your data is safe — it's stored locally on your device.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); window.location.reload(); }}
              style={{
                background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
                color: 'white', border: 'none', borderRadius: 10,
                padding: '12px 28px', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', marginBottom: 16
              }}
            >
              Reload App
            </button>
            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>
              If this keeps happening, email{' '}
              <a href="mailto:weston.kershaw@gmail.com" style={{ color: '#14b8a6' }}>
                weston.kershaw@gmail.com
              </a>
            </p>
            {this.state.error && (
              <pre style={{
                marginTop: 24, textAlign: 'left', background: '#0d1117',
                border: '1px solid #1e293b', borderRadius: 8, padding: 16,
                color: '#ef4444', fontSize: 12, overflow: 'auto', maxHeight: 200
              }}>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
