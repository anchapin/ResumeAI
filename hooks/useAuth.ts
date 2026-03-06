import { useCallback } from 'react';
import { useStore } from '../store/store';
import { TokenManager, setCookie, deleteCookie, getCookie } from '../utils/security';
import { api } from '../src/lib/requestSigning';

/**
 * Default API URL for the ResumeAI backend
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Generates authentication headers for API requests.
 * Includes Content-Type and Authorization header if valid token exists.
 * @returns Record containing HTTP headers
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = TokenManager.getToken();
  if (token && !TokenManager.isTokenExpired(token)) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Custom hook for authentication operations.
 * Provides login, register, logout, and user state management.
 * @returns Object containing user, auth state, and auth methods
 */
export const useAuth = () => {
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isAuthLoading);
  const error = useStore((state) => state.authError);
  const setUser = useStore((state) => state.setUser);
  const setAuthLoading = useStore((state) => state.setAuthLoading);
  const setAuthError = useStore((state) => state.setAuthError);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get('/api/v1/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return userData;
      } else {
        TokenManager.removeToken();
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      setUser(null);
    }
    return null;
  }, [setUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      setAuthLoading(true);
      try {
        const response = await api.post('/api/v1/auth/login', { email, password });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Login failed');
        }

        const data = await response.json();
        TokenManager.setToken(data.access_token);
        setCookie('refresh_token', data.refresh_token, 30); // 30 days for refresh token

        const userData = await fetchCurrentUser();
        return userData;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setAuthError(message);
        throw err;
      } finally {
        setAuthLoading(false);
      }
    },
    [setAuthError, setAuthLoading, fetchCurrentUser],
  );

  const register = useCallback(
    async (email: string, username: string, password: string, fullName?: string) => {
      setAuthError(null);
      setAuthLoading(true);
      try {
        const response = await api.post('/api/v1/auth/register', {
          email,
          username,
          password,
          full_name: fullName,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Registration failed');
        }

        return await response.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setAuthError(message);
        throw err;
      } finally {
        setAuthLoading(false);
      }
    },
    [setAuthError, setAuthLoading],
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = getCookie('refresh_token');
      if (refreshToken) {
        await api.post('/api/v1/auth/logout', { refresh_token: refreshToken }).catch(() => {});
      }
    } finally {
      TokenManager.removeToken();
      deleteCookie('refresh_token');
      setUser(null);
    }
  }, [setUser]);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, [setAuthError]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };
};
