import { useCallback } from 'react';
import { useStore } from '../store/store';
import { TokenManager } from '../utils/security';
import { api } from '../src/lib/requestSigning';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = TokenManager.getToken();
  if (token && !TokenManager.isTokenExpired(token)) {
    headers['Authorization'] = `Bearer ${token}`;
  }
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

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return userData;
      } else {
        TokenManager.removeToken();
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
        const response = await api.post('/auth/login', { email, password });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Login failed');
        }

        const data = await response.json();
        TokenManager.setToken(data.access_token);
        localStorage.setItem('resumeai_refresh_token', data.refresh_token);

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
        const response = await api.post('/auth/register', {
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
      const refreshToken = localStorage.getItem('resumeai_refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {});
      }
    } finally {
      TokenManager.removeToken();
      localStorage.removeItem('resumeai_refresh_token');
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
