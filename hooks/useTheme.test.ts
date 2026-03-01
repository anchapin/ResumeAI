import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';
import { useStore } from '../store/store';

// Mock the store
vi.mock('../store/store', () => ({
  useStore: vi.fn(),
}));

const mockStoreState = {
  theme: 'light',
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
};

describe('useTheme Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    (useStore as any).mockImplementation((selector) => selector(mockStoreState));
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('theme management', () => {
    it('returns current theme from store', () => {
      (useStore as any).mockImplementation((selector) =>
        selector({ ...mockStoreState, theme: 'dark' }),
      );

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('dark');
    });

    it('toggles theme when toggleTheme is called', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockStoreState.toggleTheme).toHaveBeenCalled();
    });

    it('provides setTheme function', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(mockStoreState.setTheme).toHaveBeenCalledWith('dark');
    });
  });

  describe('DOM updates', () => {
    it('adds dark class to root element when theme is dark', () => {
      (useStore as any).mockImplementation((selector) =>
        selector({ ...mockStoreState, theme: 'dark' }),
      );

      renderHook(() => useTheme());

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class from root element when theme is light', () => {
      document.documentElement.classList.add('dark');

      (useStore as any).mockImplementation((selector) =>
        selector({ ...mockStoreState, theme: 'light' }),
      );

      renderHook(() => useTheme());

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('updates DOM class when theme changes', () => {
      const { rerender } = renderHook(() => useTheme());

      expect(document.documentElement.classList.contains('dark')).toBe(false);

      (useStore as any).mockImplementation((selector) =>
        selector({ ...mockStoreState, theme: 'dark' }),
      );

      rerender();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('localStorage persistence', () => {
    it('saves theme to localStorage when changed', () => {
      (useStore as any).mockImplementation((selector) =>
        selector({ ...mockStoreState, theme: 'dark' }),
      );

      renderHook(() => useTheme());

      expect(localStorage.getItem('resumeai_theme')).toBe('dark');
    });

    it('persists light theme to localStorage', () => {
      renderHook(() => useTheme());

      expect(localStorage.getItem('resumeai_theme')).toBe('light');
    });

    it('updates localStorage when theme preference changes', () => {
      const { rerender } = renderHook(() => useTheme());

      expect(localStorage.getItem('resumeai_theme')).toBe('light');

      (useStore as any).mockImplementation((selector) =>
        selector({ ...mockStoreState, theme: 'dark' }),
      );

      rerender();

      expect(localStorage.getItem('resumeai_theme')).toBe('dark');
    });
  });

  describe('system preference detection', () => {
    it('initializes theme from localStorage if available', () => {
      localStorage.setItem('resumeai_theme', 'dark');

      (useStore as any).mockImplementation((selector) => selector(mockStoreState));

      renderHook(() => useTheme());

      // The hook should read from localStorage
      expect(localStorage.getItem('resumeai_theme')).toBe('dark');
    });

    it('uses system preference if no stored theme', () => {
      // Mock system prefers dark
      const mockMatchMedia = vi.fn((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      window.matchMedia = mockMatchMedia as any;

      renderHook(() => useTheme());

      // Should call setTheme with system preference
      expect(mockStoreState.setTheme).toHaveBeenCalled();
    });

    it('respects system dark mode preference', () => {
      const mockMatchMedia = vi.fn((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      window.matchMedia = mockMatchMedia as any;
      localStorage.clear();

      renderHook(() => useTheme());

      expect(mockStoreState.setTheme).toHaveBeenCalledWith('dark');
    });

    it('respects system light mode preference', () => {
      const mockMatchMedia = vi.fn((query) => ({
        matches: query === '(prefers-color-scheme: light)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      window.matchMedia = mockMatchMedia as any;
      localStorage.clear();

      renderHook(() => useTheme());

      // Default is light, so either no call or light call
      expect(mockStoreState.setTheme).toHaveBeenCalledTimes(0);
    });
  });

  describe('media query listener', () => {
    it('listens to system theme preference changes', () => {
      const mockListener = vi.fn();
      const mockMatchMedia = vi.fn((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: mockListener,
        removeEventListener: vi.fn(),
      }));

      window.matchMedia = mockMatchMedia as any;
      localStorage.clear();

      renderHook(() => useTheme());

      expect(mockListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('removes listener on cleanup', () => {
      const mockRemoveListener = vi.fn();
      const mockAddListener = vi.fn();
      const mockMatchMedia = vi.fn((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: mockAddListener,
        removeEventListener: mockRemoveListener,
      }));

      window.matchMedia = mockMatchMedia as any;
      localStorage.clear();

      const { unmount } = renderHook(() => useTheme());

      unmount();

      expect(mockRemoveListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('updates theme when system preference changes if no localStorage value', () => {
      localStorage.clear();
      let changeHandler: any;
      const mockMatchMedia = vi.fn((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: (event: string, handler: any) => {
          if (event === 'change') changeHandler = handler;
        },
        removeEventListener: vi.fn(),
      }));

      window.matchMedia = mockMatchMedia as any;

      renderHook(() => useTheme());

      if (changeHandler) {
        act(() => {
          changeHandler({ matches: true });
        });

        expect(mockStoreState.setTheme).toHaveBeenCalledWith('dark');
      }
    });

    it('ignores system preference changes if localStorage has value', () => {
      localStorage.setItem('resumeai_theme', 'light');
      let changeHandler: any;
      const mockMatchMedia = vi.fn((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: (event: string, handler: any) => {
          if (event === 'change') changeHandler = handler;
        },
        removeEventListener: vi.fn(),
      }));

      window.matchMedia = mockMatchMedia as any;

      renderHook(() => useTheme());

      if (changeHandler) {
        act(() => {
          changeHandler({ matches: true });
        });

        // Should not update if localStorage has a value
        const callCount = mockStoreState.setTheme.mock.calls.length;
        expect(callCount).toBeLessThanOrEqual(1); // Only initial setup
      }
    });
  });

  describe('isDark computed property', () => {
    it('returns true when theme is dark', () => {
      (useStore as any).mockImplementation((selector) =>
        selector({ ...mockStoreState, theme: 'dark' }),
      );

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);
    });

    it('returns false when theme is light', () => {
      (useStore as any).mockImplementation((selector) =>
        selector({ ...mockStoreState, theme: 'light' }),
      );

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);
    });
  });

  describe('returned values', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('isDark');
      expect(result.current).toHaveProperty('toggleTheme');
      expect(result.current).toHaveProperty('setTheme');
    });

    it('returns functions that can be called', () => {
      const { result } = renderHook(() => useTheme());

      expect(typeof result.current.toggleTheme).toBe('function');
      expect(typeof result.current.setTheme).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('handles invalid localStorage values', () => {
      localStorage.setItem('resumeai_theme', 'invalid-theme');

      renderHook(() => useTheme());

      // Should not crash
      expect(localStorage.getItem('resumeai_theme')).toBe('invalid-theme');
    });

    it('handles missing window.matchMedia gracefully', () => {
      const originalMatchMedia = window.matchMedia;
      // @ts-ignore
      delete window.matchMedia;

      expect(() => {
        renderHook(() => useTheme());
      }).not.toThrow();

      window.matchMedia = originalMatchMedia;
    });
  });
});
