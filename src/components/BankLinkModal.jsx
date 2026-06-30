import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BankLinkModal({ onClose, onImport, addToast }) {
  const [step, setStep] = useState('intro'); // intro | connecting | connected | importing
  const [accounts, setAccounts] = useState([]);
  const [txCount, setTxCount] = useState(0);
  const S = {
    overlay: { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(7,9,13,0.92)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: { background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(45, 212, 191,0.2)', borderRadius: 20, padding: '32px 28px', maxWidth: 420, width: '100%' },
    title: { fontFamily: "'Syne',serif", fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px' },
    sub: { fontSize: 13, color: 'rgba(100,116,139,0.85)', margin: '0 0 24px', lineHeight: 1.6 },
    btn: (bg, color) => ({ background: bg, border: 'none', borderRadius: 12, padding: '12px 20px', color, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', marginTop: 8 }),
  };

  async function startLink() {
    setStep('connecting');
    try {
      // Create link token
      const r = await fetch('/api/plaid-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_link_token' }),
      });
      const { link_token, error } = await r.json();
      if (error || !link_token) throw new Error(error?.message || 'Failed to create link token');

      // Load Plaid Link script
      await new Promise((resolve, reject) => {
        if (window.Plaid) return resolve();
        const s = document.createElement('script');
        s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });

      // Open Plaid Link
      const handler = window.Plaid.create({
        token: link_token,
        onSuccess: async (public_token) => {
          try {
            // Exchange token
            const er = await fetch('/api/plaid-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'exchange_token', publicToken: public_token }),
            });
            const { access_token } = await er.json();
            if (!access_token) throw new Error('Token exchange failed');

            // Store access token (in prod: server-side only)
            localStorage.setItem('up_plaid_token', access_token);

            // Fetch transactions
            const tr = await fetch('/api/plaid-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get_transactions', accessToken: access_token }),
            });
            const { transactions, accounts: accts } = await tr.json();
            setAccounts(accts || []);
            setTxCount((transactions || []).length);
            setStep('connected');
            onImport && onImport(transactions || [], accts || []);
          } catch (e) {
            addToast('Bank link failed: ' + e.message, '❌');
            setStep('intro');
          }
        },
        onExit: () => { setStep('intro'); },
      });
      handler.open();
    } catch (e) {
      addToast('Could not start bank link: ' + e.message, '❌');
      setStep('intro');
    }
  }

  return (
    <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Link bank account">
      <motion.div style={S.card} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h2 style={S.title}>🏦 Link Bank Account</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(100,116,139,0.6)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p style={S.sub}>Securely connect your bank to automatically import transactions. Powered by Plaid — used by thousands of apps.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {[
                  { icon: '🔒', text: 'Bank-level 256-bit encryption' },
                  { icon: '📊', text: 'Imports last 30 days of transactions' },
                  { icon: '🏷️', text: 'Auto-categorizes spending' },
                  { icon: '🔄', text: 'Re-sync anytime from Finance settings' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', background: 'rgba(45, 212, 191,0.06)', borderRadius: 10 }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span style={{ fontSize: 13, color: '#cbd5e1' }}>{text}</span>
                  </div>
                ))}
              </div>
              <button style={S.btn('#14b8a6', '#fff')} onClick={startLink}>Connect Bank Account →</button>
              <button style={{ ...S.btn('transparent', 'rgba(100,116,139,0.6)'), border: '1px solid rgba(51,65,85,0.4)', marginTop: 8 }} onClick={onClose}>Not now</button>
            </motion.div>
          )}
          {step === 'connecting' && (
            <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏦</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Connecting to your bank…</div>
              <div style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)' }}>Complete the steps in the Plaid window</div>
            </motion.div>
          )}
          {step === 'connected' && (
            <motion.div key="connected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#34d399', marginBottom: 6 }}>Bank Connected!</div>
                <div style={{ fontSize: 13, color: 'rgba(100,116,139,0.85)' }}>
                  Imported <strong style={{ color: '#f1f5f9' }}>{txCount} transactions</strong> from {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                </div>
              </div>
              {accounts.map(a => (
                <div key={a.account_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(15,23,42,0.6)', borderRadius: 10, marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#f1f5f9' }}>{a.name}</span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>${(a.balances?.current || 0).toLocaleString()}</span>
                </div>
              ))}
              <button style={{ ...S.btn('#14b8a6', '#fff'), marginTop: 16 }} onClick={onClose}>Done →</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
