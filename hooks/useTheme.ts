import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

/** Key for storing theme preference in localStorage */
const THEME_STORAGE_KEY = 'resumeai_theme';

/**
 * Custom hook for managing theme (dark mode) state
 * Supports localStorage persistence and system preference detection
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    // Check localStorage first
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored && (stored === 'light' || stored === 'dark')) {
      return stored;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Store preference
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't set a preference
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  /**
   * Set a specific theme
   */
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };
}
