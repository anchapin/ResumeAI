import { useState, useCallback, useEffect } from 'react';
import { TokenManager } from '../utils/security';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  is_verified: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = TokenManager.getToken();
  if (token && !TokenManager.isTokenExpired(token)) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Check existing token on mount
  useEffect(() => {
    const token = TokenManager.getToken();
    if (token && !TokenManager.isTokenExpired(token)) {
      fetchCurrentUser().finally(() => setIsLoading(false));
    } else {
      if (token) TokenManager.removeToken();
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const userData: AuthUser = await response.json();
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

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

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
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (email: string, username: string, password: string, fullName?: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('resumeai_refresh_token');
      if (refreshToken) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ refresh_token: refreshToken }),
        }).catch(() => {});
      }
    } finally {
      TokenManager.removeToken();
      localStorage.removeItem('resumeai_refresh_token');
      setUser(null);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

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
