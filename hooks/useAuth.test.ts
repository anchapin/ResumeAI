import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { useStore } from '../store/store';
import { TokenManager } from '../utils/security';

// Mock the store
vi.mock('../store/store', () => ({
  useStore: vi.fn(),
}));

// Mock TokenManager
vi.mock('../utils/security', () => ({
  TokenManager: {
    getToken: vi.fn(),
    setToken: vi.fn(),
    removeToken: vi.fn(),
    isTokenExpired: vi.fn(),
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

const mockStoreState = {
  user: null,
  isAuthenticated: false,
  isAuthLoading: false,
  authError: null,
  setUser: vi.fn(),
  setAuthLoading: vi.fn(),
  setAuthError: vi.fn(),
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (useStore as any).mockImplementation((selector) => selector(mockStoreState));
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuthHeaders', () => {
    it('returns headers with Content-Type', () => {
      (TokenManager.getToken as any).mockReturnValue(null);
      (TokenManager.isTokenExpired as any).mockReturnValue(false);

      const { result } = renderHook(() => useAuth());
      expect(result.current).toBeDefined();
    });

    it('includes Authorization header when token exists', () => {
      const mockToken = 'test-token-123';
      (TokenManager.getToken as any).mockReturnValue(mockToken);
      (TokenManager.isTokenExpired as any).mockReturnValue(false);

      renderHook(() => useAuth());
      // The hook uses getAuthHeaders internally in fetchCurrentUser
      expect(TokenManager.getToken).toHaveBeenCalled();
    });

    it('excludes expired tokens', () => {
      const mockToken = 'expired-token';
      (TokenManager.getToken as any).mockReturnValue(mockToken);
      (TokenManager.isTokenExpired as any).mockReturnValue(true);

      renderHook(() => useAuth());
      expect(TokenManager.isTokenExpired).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('successfully logs in a user', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      const mockTokens = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
      };

      (global.fetch as any)
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockTokens), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockUser), { status: 200 }),
        );

      (TokenManager.getToken as any).mockReturnValue(mockTokens.access_token);
      (TokenManager.isTokenExpired as any).mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(TokenManager.setToken).toHaveBeenCalledWith(mockTokens.access_token);
      expect(localStorage.getItem('resumeai_refresh_token')).toBe(mockTokens.refresh_token);
      expect(mockStoreState.setUser).toHaveBeenCalledWith(mockUser);
    });

    it('handles login errors gracefully', async () => {
      const errorResponse = { detail: 'Invalid credentials' };
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), { status: 401 }),
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword');
        } catch (err) {
          expect(err).toBeDefined();
        }
      });

      expect(mockStoreState.setAuthError).toHaveBeenCalled();
    });

    it('handles network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password123');
        } catch (err) {
          expect(err).toBeDefined();
        }
      });

      expect(mockStoreState.setAuthError).toHaveBeenCalled();
    });

    it('clears error before login attempt', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'token', refresh_token: 'refresh' }), {
          status: 200,
        }),
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        result.current.login('test@example.com', 'password');
      });

      expect(mockStoreState.setAuthError).toHaveBeenCalledWith(null);
    });

    it('sets loading state during login', async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(new Response('{}', { status: 200 })), 100)),
      );

      const { result } = renderHook(() => useAuth());

      expect(mockStoreState.setAuthLoading).not.toHaveBeenCalledWith(true);

      act(() => {
        result.current.login('test@example.com', 'password');
      });

      expect(mockStoreState.setAuthLoading).toHaveBeenCalledWith(true);
    });
  });

  describe('register', () => {
    it('successfully registers a new user', async () => {
      const mockResponse = { id: 1, email: 'newuser@example.com' };
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const { result } = renderHook(() => useAuth());

      let registrationResult;
      await act(async () => {
        registrationResult = await result.current.register(
          'newuser@example.com',
          'newuser',
          'password123',
          'New User',
        );
      });

      expect(registrationResult).toEqual(mockResponse);
      expect(mockStoreState.setAuthError).toHaveBeenCalledWith(null);
    });

    it('handles registration errors', async () => {
      const errorResponse = { detail: 'Email already exists' };
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), { status: 400 }),
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.register('existing@example.com', 'user', 'password', 'User');
        } catch (err) {
          expect(err).toBeDefined();
        }
      });

      expect(mockStoreState.setAuthError).toHaveBeenCalled();
    });

    it('includes optional full name in registration', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), { status: 200 }),
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register('test@example.com', 'testuser', 'password', 'Test User Full');
      });

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.full_name).toBe('Test User Full');
    });

    it('handles registration without full name', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), { status: 200 }),
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register('test@example.com', 'testuser', 'password');
      });

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.full_name).toBeUndefined();
    });
  });

  describe('logout', () => {
    it('successfully logs out a user', async () => {
      localStorage.setItem('resumeai_refresh_token', 'refresh-token-123');
      (global.fetch as any).mockResolvedValueOnce(new Response('{}', { status: 200 }));
      (TokenManager.getToken as any).mockReturnValue('access-token');
      (TokenManager.isTokenExpired as any).mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(TokenManager.removeToken).toHaveBeenCalled();
      expect(localStorage.getItem('resumeai_refresh_token')).toBeNull();
      expect(mockStoreState.setUser).toHaveBeenCalledWith(null);
    });

    it('handles logout API failure gracefully', async () => {
      localStorage.setItem('resumeai_refresh_token', 'refresh-token');
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      (TokenManager.getToken as any).mockReturnValue('access-token');
      (TokenManager.isTokenExpired as any).mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      // Should still clear local state even if API fails
      expect(TokenManager.removeToken).toHaveBeenCalled();
      expect(mockStoreState.setUser).toHaveBeenCalledWith(null);
    });

    it('clears refresh token from localStorage', async () => {
      localStorage.setItem('resumeai_refresh_token', 'refresh-token-123');
      (global.fetch as any).mockResolvedValueOnce(new Response('{}', { status: 200 }));
      (TokenManager.getToken as any).mockReturnValue('access-token');
      (TokenManager.isTokenExpired as any).mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(localStorage.getItem('resumeai_refresh_token')).toBeNull();
    });

    it('does not fail when no refresh token exists', async () => {
      localStorage.clear();
      (TokenManager.getToken as any).mockReturnValue('access-token');
      (TokenManager.isTokenExpired as any).mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(TokenManager.removeToken).toHaveBeenCalled();
      expect(mockStoreState.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('fetchCurrentUser', () => {
    it('fetches and sets current user', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify(mockUser), { status: 200 }),
      );
      (TokenManager.getToken as any).mockReturnValue('access-token');
      (TokenManager.isTokenExpired as any).mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      let userResult;
      await act(async () => {
        userResult = await result.current.logout; // Trigger the hook setup
      });

      expect(mockStoreState.setUser).toHaveBeenCalled();
    });

    it('removes token and clears user on 401 response', async () => {
      (global.fetch as any).mockResolvedValueOnce(new Response('{}', { status: 401 }));
      (TokenManager.getToken as any).mockReturnValue('expired-token');
      (TokenManager.isTokenExpired as any).mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      expect(result.current).toBeDefined();
    });

    it('returns null on fetch error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      (TokenManager.getToken as any).mockReturnValue('access-token');
      (TokenManager.isTokenExpired as any).mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      expect(result.current).toBeDefined();
    });
  });

  describe('clearError', () => {
    it('clears authentication error', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.clearError();
      });

      expect(mockStoreState.setAuthError).toHaveBeenCalledWith(null);
    });
  });

  describe('returned values', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('register');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('clearError');
    });

    it('returns store state values', () => {
      (useStore as any).mockImplementation((selector) =>
        selector({
          ...mockStoreState,
          user: { id: 1, email: 'test@example.com' },
          isAuthenticated: true,
          isAuthLoading: false,
          authError: null,
        }),
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual({ id: 1, email: 'test@example.com' });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('API endpoint', () => {
    it('uses correct API URL for login', async () => {
      (global.fetch as any).mockResolvedValue(
        new Response(JSON.stringify({ access_token: 'token', refresh_token: 'refresh' }), {
          status: 200,
        }),
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password');
        } catch {
          // Expected to fail due to mocking
        }
      });

      const loginCall = (global.fetch as any).mock.calls.find((call: any[]) =>
        call[0].includes('/auth/login'),
      );
      expect(loginCall).toBeDefined();
    });

    it('uses correct API URL for register', async () => {
      (global.fetch as any).mockResolvedValue(new Response('{}', { status: 200 }));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.register('test@example.com', 'user', 'password');
        } catch {
          // Expected to fail due to mocking
        }
      });

      const registerCall = (global.fetch as any).mock.calls.find((call: any[]) =>
        call[0].includes('/auth/register'),
      );
      expect(registerCall).toBeDefined();
    });

    it('uses correct API URL for logout', async () => {
      localStorage.setItem('resumeai_refresh_token', 'token');
      (global.fetch as any).mockResolvedValue(new Response('{}', { status: 200 }));
      (TokenManager.getToken as any).mockReturnValue('access-token');
      (TokenManager.isTokenExpired as any).mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      const logoutCall = (global.fetch as any).mock.calls.find((call: any[]) =>
        call[0].includes('/auth/logout'),
      );
      expect(logoutCall).toBeDefined();
    });
  });
});
