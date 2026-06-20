import { create } from 'zustand';
import {
  type AuthUser,
  signIn as sbSignIn,
  signUp as sbSignUp,
  signOut as sbSignOut,
  resetPassword as sbResetPassword,
  restoreSession,
} from '@/utils/supabase';

const AUTH_KEY = 'up_auth_v4';

function loadCached(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function persistUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}

interface AuthState {
  user: AuthUser | null;
  /** True until the initial session check completes. */
  hydrating: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  setUser: (user: AuthUser | null) => void;
  hydrate: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: loadCached(),
  hydrating: true,

  setUser: (user) => {
    persistUser(user);
    set({ user });
  },

  hydrate: async () => {
    const cached = loadCached();
    if (cached) set({ user: cached });
    const fresh = await restoreSession();
    if (fresh) {
      persistUser(fresh);
      set({ user: fresh });
    }
    set({ hydrating: false });
  },

  signIn: async (email, password) => {
    const { user, error } = await sbSignIn(email, password);
    if (user) get().setUser(user);
    return { error };
  },

  signUp: async (email, password, firstName, lastName) => {
    const { user, error } = await sbSignUp(email, password, firstName, lastName);
    if (user) get().setUser(user);
    return { error };
  },

  signOut: async () => {
    await sbSignOut();
    persistUser(null);
    set({ user: null });
  },

  resetPassword: async (email) => sbResetPassword(email),
}));
