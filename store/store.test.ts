import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store/store';
import { AuthUser } from '../store/store';

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      user: null,
      isAuthenticated: false,
      isAuthLoading: true,
      authError: null,
      resumeData: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '',
        location: '',
        role: '',
        summary: '',
        skills: [],
        experience: [],
        education: [],
        projects: [],
      },
      isResumeLoaded: false,
      saveStatus: 'idle',
      resumeError: null,
      theme: 'light',
      showShortcuts: false,
    });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useStore());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAuthLoading).toBe(true);
    expect(result.current.authError).toBeNull();
    expect(result.current.theme).toBe('light');
    expect(result.current.showShortcuts).toBe(false);
    expect(result.current.saveStatus).toBe('idle');
  });

  it('sets user correctly', () => {
    const { result } = renderHook(() => useStore());
    const user: AuthUser = {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      is_active: true,
      is_verified: true,
    };

    act(() => {
      result.current.setUser(user);
    });

    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('toggles theme correctly', () => {
    const { result } = renderHook(() => useStore());

    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
  });

  it('sets theme correctly', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
  });

  it('toggles shortcuts correctly', () => {
    const { result } = renderHook(() => useStore());

    expect(result.current.showShortcuts).toBe(false);

    act(() => {
      result.current.toggleShortcuts();
    });

    expect(result.current.showShortcuts).toBe(true);

    act(() => {
      result.current.toggleShortcuts();
    });

    expect(result.current.showShortcuts).toBe(false);
  });

  it('sets shortcuts correctly', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.setShowShortcuts(true);
    });

    expect(result.current.showShortcuts).toBe(true);
  });

  it('sets auth error correctly', () => {
    const { result } = renderHook(() => useStore());
    const errorMessage = 'Authentication failed';

    act(() => {
      result.current.setAuthError(errorMessage);
    });

    expect(result.current.authError).toBe(errorMessage);
  });

  it('clears auth error correctly', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.setAuthError('Some error');
    });

    expect(result.current.authError).toBe('Some error');

    act(() => {
      result.current.clearAuthError();
    });

    expect(result.current.authError).toBeNull();
  });

  it('sets resume save status correctly', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.setSaveStatus('saving');
    });

    expect(result.current.saveStatus).toBe('saving');

    act(() => {
      result.current.setSaveStatus('saved');
    });

    expect(result.current.saveStatus).toBe('saved');
  });
});
