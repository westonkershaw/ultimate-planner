import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, KeyRound, LogOut, Monitor } from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
}

function loadSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem('up_sessions') ?? '[]') as Session[];
  } catch {
    return [];
  }
}

function describeCurrent(): Session {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const device = ua.includes('Mobile') ? '📱 Mobile' : '💻 Desktop';
  const browser =
    ua.includes('Chrome') ? 'Chrome'
    : ua.includes('Firefox') ? 'Firefox'
    : ua.includes('Safari') ? 'Safari'
    : 'Browser';
  return { id: 'current', device, browser, location: 'Current session', lastActive: 'Now' };
}

export default function SecuritySection() {
  const user = useAuthStore((s) => s.user);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const doSignOut = useAuthStore((s) => s.signOut);
  const addToast = useUIStore((s) => s.addToast);

  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [resetting, setResetting] = useState(false);

  const sendReset = async () => {
    if (!user?.email) {
      addToast('No email on file', 'warning');
      return;
    }
    setResetting(true);
    const { error } = await resetPassword(user.email);
    setResetting(false);
    addToast(error ?? 'Reset link sent — check your email.', error ? 'error' : 'success');
  };

  const revoke = (id: string) => {
    const next = sessions.filter((s) => s.id !== id);
    localStorage.setItem('up_sessions', JSON.stringify(next));
    setSessions(next);
    addToast('Session revoked', 'success');
  };

  const revokeAll = () => {
    localStorage.removeItem('up_sessions');
    setSessions([]);
    addToast('All other sessions signed out', 'success');
  };

  const all = [describeCurrent(), ...sessions.filter((s) => s.id !== 'current')];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      aria-labelledby="security-heading"
    >
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-slate-500" />
        <h2 id="security-heading" className="text-xs font-medium text-slate-500 uppercase tracking-wider">Security</h2>
      </div>

      {/* Password */}
      <div className="p-4 rounded-xl border border-slate-800/40 bg-slate-900/30 space-y-3">
        <div className="flex items-center gap-3">
          <KeyRound size={16} className="text-indigo-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-200">Change password</div>
            <div className="text-[11px] text-slate-500 mt-0.5">We'll email a secure reset link.</div>
          </div>
        </div>
        <button
          onClick={sendReset}
          disabled={resetting}
          className={[
            'w-full py-2 rounded-lg border text-xs font-medium transition-colors',
            resetting
              ? 'border-slate-800 text-slate-500 cursor-wait'
              : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20',
          ].join(' ')}
        >
          {resetting ? 'Sending…' : 'Send password reset email'}
        </button>
      </div>

      {/* Sessions */}
      <div className="p-4 rounded-xl border border-slate-800/40 bg-slate-900/30 space-y-3">
        <div className="flex items-center gap-2">
          <Monitor size={14} className="text-indigo-400" />
          <span className="text-sm font-medium text-slate-200">Active sessions</span>
        </div>
        <div className="divide-y divide-slate-800/40">
          {all.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              <span className="text-lg">{s.device}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-200 font-medium flex items-center gap-2">
                  {s.browser}
                  {s.id === 'current' && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded px-1.5 py-0.5">Current</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{s.location} · {s.lastActive}</div>
              </div>
              {s.id !== 'current' && (
                <button
                  onClick={() => revoke(s.id)}
                  className="text-[11px] text-rose-300 px-2 py-1 rounded border border-rose-500/25 hover:bg-rose-500/10 transition-colors"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
        {sessions.length > 0 && (
          <button
            onClick={revokeAll}
            className="w-full py-1.5 rounded-lg border border-rose-500/25 bg-rose-500/[0.05] text-xs text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            Sign out all other sessions
          </button>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={() => doSignOut()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-800/60 bg-slate-900/40 text-sm text-slate-300 hover:border-rose-500/30 hover:text-rose-300 transition-colors"
      >
        <LogOut size={14} /> Sign out
      </button>
    </motion.section>
  );
}
