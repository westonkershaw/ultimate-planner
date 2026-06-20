import { useState, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store';

type Mode = 'login' | 'signup' | 'forgot';

interface FieldProps {
  type: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}

function Field({ type, label, value, onChange, autoComplete }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/50 transition-colors"
      />
    </label>
  );
}

export default function AuthScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [mode, setMode] = useState<Mode>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setInfo('');

    if (mode === 'forgot') {
      if (!email.trim()) return setError('Enter your email address.');
      setSubmitting(true);
      const { error: err } = await resetPassword(email.trim());
      setSubmitting(false);
      if (err) return setError(err);
      setInfo('Reset link sent — check your email.');
      setMode('login');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) return setError('Enter a valid email.');
    if (pass.length < (mode === 'signup' ? 8 : 6)) return setError(`Password must be at least ${mode === 'signup' ? 8 : 6} characters.`);
    if (mode === 'signup' && (!firstName.trim() || !lastName.trim())) return setError('Enter your first and last name.');

    setSubmitting(true);
    const result = mode === 'login'
      ? await signIn(email.trim(), pass)
      : await signUp(email.trim(), pass, firstName.trim(), lastName.trim());
    setSubmitting(false);
    if (result.error) setError(result.error);
  }, [mode, email, pass, firstName, lastName, signIn, signUp, resetPassword]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#08090d] px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xl font-bold">
            ✦
          </div>
          <h1 className="mt-3 font-syne text-xl font-bold text-slate-100 tracking-tight">Ultimate Life Planner</h1>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'login' && 'Sign in to continue'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <AnimatePresence initial={false}>
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-3 overflow-hidden"
              >
                <Field type="text" label="First name" value={firstName} onChange={setFirstName} autoComplete="given-name" />
                <Field type="text" label="Last name" value={lastName} onChange={setLastName} autoComplete="family-name" />
              </motion.div>
            )}
          </AnimatePresence>

          <Field type="email" label="Email" value={email} onChange={setEmail} autoComplete="email" />

          {mode !== 'forgot' && (
            <Field
              type="password"
              label="Password"
              value={pass}
              onChange={setPass}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          )}

          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/[0.06] border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {info && (
            <div className="text-xs text-emerald-300 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-lg px-3 py-2">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={[
              'w-full py-2.5 rounded-xl text-sm font-semibold transition-colors',
              submitting
                ? 'bg-indigo-500/30 text-indigo-300 cursor-wait'
                : 'bg-indigo-500 hover:bg-indigo-400 text-white',
            ].join(' ')}
          >
            {submitting ? 'Working…' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('signup'); setError(''); }} className="hover:text-slate-300 transition-colors">
                Create account
              </button>
              <button onClick={() => { setMode('forgot'); setError(''); }} className="hover:text-slate-300 transition-colors">
                Forgot password?
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button onClick={() => { setMode('login'); setError(''); }} className="hover:text-slate-300 transition-colors">
              Already have an account? Sign in
            </button>
          )}
          {mode === 'forgot' && (
            <button onClick={() => { setMode('login'); setError(''); }} className="hover:text-slate-300 transition-colors">
              ← Back to sign in
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
