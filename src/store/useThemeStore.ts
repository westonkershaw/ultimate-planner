import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: ThemeMode;
  accentColor: string;
}

interface ThemeActions {
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  getEffectiveTheme: () => 'dark' | 'light';
}

export type ThemeStore = ThemeState & ThemeActions;

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  const effective = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(effective);
  root.setAttribute('data-theme', effective);
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      accentColor: '#6366f1',

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      setAccentColor: (color) => set({ accentColor: color }),

      getEffectiveTheme: () => {
        const { theme } = get();
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
      },
    }),
    {
      name: 'up_theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);
