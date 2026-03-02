import { useEffect } from 'react';
import { useStore } from '../store/store';
import { Theme } from '../store/store';

const THEME_STORAGE_KEY = 'resumeai_theme';

export function useTheme() {
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const toggleTheme = useStore((state) => state.toggleTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored && (stored === 'light' || stored === 'dark')) {
      setTheme(stored);
      return;
    }

    if (window.matchMedia) {
      const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (darkQuery.matches) {
        setTheme('dark');
      } else {
        setTheme('light');
      }
    }

    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (!stored) {
          setTheme(e.matches ? 'dark' : 'light');
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      }
    }
  }, [setTheme]);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };
}
