import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { useStore } from '../store/store';
import { TokenManager, getCookie } from '../utils/security';

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
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
  getCookie: vi.fn(),
  getAuthToken: vi.fn(),
}));

// Mock api from requestSigning
vi.mock('../src/lib/requestSigning', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

import { api } from '../src/lib/requestSigning';

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
    (useStore as any).mockImplementation((selector: any) => selector(mockStoreState));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('successfully logs in a user', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      const mockTokens = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
      };

      (api.post as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      });
      (api.get as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(TokenManager.setToken).toHaveBeenCalledWith(mockTokens.access_token);
      expect(mockStoreState.setUser).toHaveBeenCalledWith(mockUser);
    });

    it('handles login errors gracefully', async () => {
      const errorResponse = { detail: 'Invalid credentials' };
      (api.post as any).mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse,
      });

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
  });

  describe('register', () => {
    it('successfully registers a new user', async () => {
      const mockResponse = { id: 1, email: 'newuser@example.com' };
      (api.post as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

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
  });

  describe('logout', () => {
    it('successfully logs out a user', async () => {
      // Set refresh token in cookie (new implementation uses cookies)
      vi.mocked(getCookie).mockReturnValue('refresh-token-123');

      (api.post as any).mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(TokenManager.removeToken).toHaveBeenCalled();
      expect(mockStoreState.setUser).toHaveBeenCalledWith(null);
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
  });
});
