import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: false,
  toggle: () => {
    set((state) => {
      const next = !state.isDark;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('smartroad_theme', next ? 'dark' : 'light');
      return { isDark: next };
    });
  },
  init: () => {
    const saved = localStorage.getItem('smartroad_theme');
    const isDark = saved === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    set({ isDark });
  },
}));
