/**
 * Feature Flag Hook for React
 *
 * Provides easy access to feature flags from the frontend.
 * Uses localStorage cache with API fallback.
 */

import { useState, useEffect, useCallback } from 'react';

export interface FeatureFlag {
  name: string;
  active: boolean;
}

export interface UseFeatureFlagsOptions {
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** API base URL */
  apiUrl?: string;
  /** Headers for API requests */
  headers?: Record<string, string>;
}

const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Hook to check if a feature flag is active
 */
export function useFeatureFlag(flagName: string, options: UseFeatureFlagsOptions = {}): boolean {
  const { apiUrl = DEFAULT_API_URL, headers = {} } = options;
  const [isActive, setIsActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkFlag = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/feature-flags/${flagName}/evaluate`, {
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsActive(data.active);
          // Cache in localStorage
          localStorage.setItem(
            `ff_${flagName}`,
            JSON.stringify({
              active: data.active,
              timestamp: Date.now(),
            }),
          );
        }
      } catch (error) {
        // Fallback to cached value
        const cached = localStorage.getItem(`ff_${flagName}`);
        if (cached) {
          const { active } = JSON.parse(cached);
          setIsActive(active);
        }
      } finally {
        setLoading(false);
      }
    };

    checkFlag();
  }, [flagName, apiUrl, JSON.stringify(headers)]);

  return isActive;
}

/**
 * Hook to get multiple feature flags at once
 */
export function useFeatureFlags(
  flagNames: string[],
  options: UseFeatureFlagsOptions = {},
): Record<string, boolean> {
  const { apiUrl = DEFAULT_API_URL, headers = {} } = options;
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/feature-flags/batch-evaluate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({ flags: flagNames }),
        });

        if (response.ok) {
          const data = await response.json();
          setFlags(data.results);
        }
      } catch (error) {
        console.error('Failed to fetch feature flags:', error);
        // Fallback to cached values
        const cachedFlags: Record<string, boolean> = {};
        flagNames.forEach((name) => {
          const cached = localStorage.getItem(`ff_${name}`);
          if (cached) {
            cachedFlags[name] = JSON.parse(cached).active;
          }
        });
        setFlags(cachedFlags);
      } finally {
        setLoading(false);
      }
    };

    fetchFlags();
  }, [flagNames.join(','), apiUrl, JSON.stringify(headers)]);

  return flags;
}

/**
 * Hook to list all available feature flags
 */
export function useAllFeatureFlags(options: UseFeatureFlagsOptions = {}): {
  flags: FeatureFlag[];
  loading: boolean;
  error: Error | null;
} {
  const { apiUrl = DEFAULT_API_URL, headers = {} } = options;
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/feature-flags`, {
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFlags(
          data.map((f: { name: string; status: string }) => ({
            name: f.name,
            active: f.status === 'active',
          })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [apiUrl, JSON.stringify(headers)]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  return { flags, loading, error };
}

/**
 * Component wrapper for feature flag gating
 */
interface FeatureFlagGateProps {
  /** Flag name to check */
  flag: string;
  /** Children to render if flag is active */
  children: React.ReactNode;
  /** Children to render if flag is inactive (optional) */
  fallback?: React.ReactNode;
  /** Show loading state while checking flag */
  showLoading?: boolean;
  /** Loading component */
  loadingComponent?: React.ReactNode;
}

export function FeatureFlagGate({
  flag,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = null,
}: FeatureFlagGateProps) {
  const isActive = useFeatureFlag(flag);

  if (showLoading && !isActive) {
    return <>{loadingComponent}</>;
  }

  return <>{isActive ? children : fallback}</>;
}

/**
 * Example usage:
 *
 * // Check single flag
 * const isNewDashboard = useFeatureFlag('new_dashboard');
 *
 * // Check multiple flags
 * const flags = useFeatureFlags(['new_dashboard', 'dark_mode']);
 *
 * // List all flags
 * const { flags: allFlags, loading } = useAllFeatureFlags();
 *
 * // Gate content
 * <FeatureFlagGate flag="new_dashboard">
 *   <NewDashboardComponent />
 * </FeatureFlagGate>
 */
