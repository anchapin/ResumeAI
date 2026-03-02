import { useCallback, useRef } from 'react';
import { useStore } from '../store/store';
import { TokenManager, getCsrfToken } from '../utils/security';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // CSRF token is now read from cookie in getSecurityHeaders
  return headers;
}

export const useAuth = () => {
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isAuthLoading);
  const error = useStore((state) => state.authError);
  const setUser = useStore((state) => state.setUser);
  const setAuthLoading = useStore((state) => state.setAuthLoading);
  const setAuthError = useStore((state) => state.setAuthError);

  const refreshTokenRef = useRef<string | null>(null);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return userData;
      } else {
        TokenManager.removeToken();
        refreshTokenRef.current = null;
        setUser(null);
      }
    } catch {
      setUser(null);
    }
    return null;
  };

  const login = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      setAuthLoading(true);
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Login failed');
        }

        const data = await response.json();
        // Store refresh token in memory (not localStorage for security)
        refreshTokenRef.current = data.refresh_token;

        const userData = await fetchCurrentUser();
        return userData;
      } catch (err: any) {
        const message = err.message || 'Login failed';
        setAuthError(message);
        throw err;
      } finally {
        setAuthLoading(false);
      }
    },
    [setAuthError, setAuthLoading],
  );

  const register = useCallback(
    async (email: string, username: string, password: string, fullName?: string) => {
      setAuthError(null);
      setAuthLoading(true);
      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email,
            username,
            password,
            full_name: fullName,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Registration failed');
        }

        return await response.json();
      } catch (err: any) {
        const message = err.message || 'Registration failed';
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
      // Use refresh token from memory to revoke it server-side
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refresh_token: refreshTokenRef.current || '' }),
      }).catch(() => {});
    } finally {
      TokenManager.removeToken();
      refreshTokenRef.current = null;
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
