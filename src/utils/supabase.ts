import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  isPro: boolean;
  createdAt?: string;
}

const SB_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SB_ANON = import.meta.env.VITE_SUPABASE_ANON ?? '';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  if (!SB_URL || !SB_ANON) return null;
  _client = createClient(SB_URL, SB_ANON, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _client;
}

export function isSupabaseEnabled(): boolean {
  return !!SB_URL && !!SB_ANON;
}

// ── Local fallback (matches monolith's `up_users` registry) ────────────────

interface LocalUserRecord {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  pass: string;
  isPro?: boolean;
}

function readLocalRegistry(): Record<string, LocalUserRecord> {
  try {
    return JSON.parse(localStorage.getItem('up_users') ?? '{}') as Record<string, LocalUserRecord>;
  } catch {
    return {};
  }
}

function writeLocalRegistry(reg: Record<string, LocalUserRecord>): void {
  localStorage.setItem('up_users', JSON.stringify(reg));
}

// ── Auth API ──────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    const u = data.user;
    if (!u) return { user: null, error: 'Login failed.' };
    type Profile = { is_pro?: boolean; first_name?: string; last_name?: string };
    let prof: Profile | null = null;
    try {
      const { data: p } = await sb.from('profiles').select('is_pro,first_name,last_name').eq('id', u.id).single();
      prof = p as Profile | null;
    } catch { /* ignore */ }
    return {
      user: {
        id: u.id,
        email: u.email ?? email,
        firstName: prof?.first_name ?? '',
        lastName: prof?.last_name ?? '',
        name: `${prof?.first_name ?? ''} ${prof?.last_name ?? ''}`.trim() || (u.email ?? email),
        isPro: !!prof?.is_pro,
        createdAt: u.created_at,
      },
      error: null,
    };
  }
  // Local fallback
  const reg = readLocalRegistry();
  const u = reg[email.toLowerCase()];
  if (!u) return { user: null, error: 'No account found. Please sign up.' };
  if (u.pass !== password) return { user: null, error: 'Incorrect password.' };
  return {
    user: { id: u.id, name: u.name, email: u.email, isPro: !!u.isPro, firstName: u.firstName ?? u.name, lastName: u.lastName ?? '' },
    error: null,
  };
}

export async function signUp(
  email: string, password: string, firstName: string, lastName: string,
): Promise<{ user: AuthUser | null; error: string | null }> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    if (error) return { user: null, error: error.message };
    const u = data.user;
    if (!u) return { user: null, error: 'Signup failed.' };
    return {
      user: {
        id: u.id,
        email: u.email ?? email,
        name: `${firstName} ${lastName}`.trim(),
        firstName, lastName,
        isPro: false,
        createdAt: u.created_at,
      },
      error: null,
    };
  }
  // Local fallback
  const reg = readLocalRegistry();
  const key = email.toLowerCase();
  if (reg[key]) return { user: null, error: 'An account with that email already exists.' };
  const id = 'local-' + Math.random().toString(36).slice(2, 10);
  reg[key] = { id, email, name: `${firstName} ${lastName}`.trim(), firstName, lastName, pass: password, isPro: false };
  writeLocalRegistry(reg);
  return {
    user: { id, name: reg[key].name, email, firstName, lastName, isPro: false },
    error: null,
  };
}

export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Password reset requires cloud sync (not configured).' };
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut().catch(() => undefined);
}

export async function restoreSession(): Promise<AuthUser | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return null;
    const u = session.user;
    type Profile = { is_pro?: boolean; first_name?: string; last_name?: string };
    let prof: Profile | null = null;
    try {
      const { data } = await sb.from('profiles').select('is_pro,first_name,last_name').eq('id', u.id).single();
      prof = data as Profile | null;
    } catch { /* ignore */ }
    return {
      id: u.id,
      email: u.email ?? '',
      firstName: prof?.first_name ?? '',
      lastName: prof?.last_name ?? '',
      name: `${prof?.first_name ?? ''} ${prof?.last_name ?? ''}`.trim() || (u.email ?? ''),
      isPro: !!prof?.is_pro,
      createdAt: u.created_at,
    };
  } catch {
    return null;
  }
}
