/**
 * Feature Flag React Hook
 * 
 * Provides a hook for evaluating feature flags in React components.
 * Supports gradual rollouts and A/B testing.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  FeatureFlag,
  FeatureFlagConfig,
  FeatureFlagContext,
  FeatureFlagEvaluation,
  FeatureFlagKey,
} from '../lib/feature-flags';

// API base URL - should be configured based on environment
const API_BASE = '/api/v1';

/**
 * Cache duration for feature flags (in milliseconds)
 * Default: 5 minutes
 */
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000;

interface UseFeatureFlagsOptions {
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Cache duration in milliseconds */
  cacheDuration?: number;
  /** Initial flags to use before fetching from server */
  initialFlags?: FeatureFlagConfig | null;
  /** Callback when flags are loaded */
  onFlagsLoaded?: (flags: FeatureFlagConfig) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

interface UseFeatureFlagOptions {
  /** User context for feature flag evaluation */
  context?: FeatureFlagContext;
  /** Default value if flag is not found */
  defaultValue?: boolean;
}

/**
 * Hook to fetch and manage feature flag configuration
 */
export function useFeatureFlags(options: UseFeatureFlagsOptions = {}) {
  const {
    refreshInterval,
    cacheDuration = DEFAULT_CACHE_DURATION,
    initialFlags = null,
    onFlagsLoaded,
    onError,
  } = options;

  const [flags, setFlags] = useState<FeatureFlagConfig | null>(initialFlags);
  const [loading, setLoading] = useState(!initialFlags);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && flags && cacheDuration) {
      const cacheAge = Date.now() - flags.timestamp;
      if (cacheAge < cacheDuration) {
        return flags;
      }
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/feature-flags`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch feature flags: ${response.statusText}`);
      }
      
      const data: FeatureFlagConfig = await response.json();
      setFlags(data);
      setError(null);
      onFlagsLoaded?.(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      // Return cached flags if available
      return flags;
    } finally {
      setLoading(false);
    }
  }, [flags, cacheDuration, onFlagsLoaded, onError]);

  // Initial fetch
  useEffect(() => {
    if (!initialFlags) {
      fetchFlags();
    }
  }, []);

  // Auto-refresh if interval is set
  useEffect(() => {
    if (!refreshInterval) return;

    const intervalId = setInterval(() => {
      fetchFlags(true);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchFlags]);

  // Helper functions
  const getFlag = useCallback((key: string): FeatureFlag | undefined => {
    return flags?.flags.find(f => f.key === key);
  }, [flags]);

  const isEnabled = useCallback((key: string, context?: FeatureFlagContext): boolean => {
    const flag = getFlag(key);
    if (!flag) return false;
    
    if (!flag.enabled) return false;
    
    // If rollout is 100%, always enabled
    if (flag.rolloutPercentage >= 100) return true;
    
    // If rollout is 0%, always disabled
    if (flag.rolloutPercentage <= 0) return false;
    
    // Check targeting rules
    if (flag.targeting) {
      // Check user-specific targeting
      if (flag.targeting.users?.length && context?.userId) {
        if (flag.targeting.users.includes(context.userId)) {
          return true;
        }
      }
      
      // Check group targeting
      if (flag.targeting.groups?.length && context?.groups?.length) {
        if (context.groups.some(group => flag.targeting?.groups?.includes(group))) {
          return true;
        }
      }
    }
    
    // Use percentage-based rollout with consistent hashing
    return evaluateRollout(key, flag.rolloutPercentage, context);
  }, [getFlag]);

  const evaluateFlag = useCallback(async (
    key: string, 
    context?: FeatureFlagContext
  ): Promise<FeatureFlagEvaluation | null> => {
    try {
      const response = await fetch(
        `${API_BASE}/feature-flags/${key}/evaluate?` + 
        new URLSearchParams({
          ...(context?.userId && { user_id: context.userId }),
          ...(context?.email && { email: context.email }),
          ...(context?.groups?.length && { groups: context.groups.join(',') }),
          ...(context?.sessionId && { session_id: context.sessionId }),
        })
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to evaluate feature flag: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      // Fallback to local evaluation
      const flag = getFlag(key);
      if (!flag) return null;
      
      return {
        key,
        enabled: isEnabled(key, context),
      };
    }
  }, [getFlag, isEnabled]);

  return {
    flags,
    loading,
    error,
    refresh: () => fetchFlags(true),
    getFlag,
    isEnabled,
    evaluateFlag,
  };
}

/**
 * Hook to check if a specific feature flag is enabled
 */
export function useFeatureFlag(
  flagKey: string | FeatureFlagKey,
  options: UseFeatureFlagOptions = {}
) {
  const { context, defaultValue = false } = options;
  const { isEnabled, loading, error, flags } = useFeatureFlags();

  // Subscribe to specific flag changes
  const [enabled, setEnabled] = useState(() => isEnabled(flagKey, context));

  useEffect(() => {
    if (flags) {
      setEnabled(isEnabled(flagKey, context));
    }
  }, [flags, flagKey, context, isEnabled]);

  return {
    enabled,
    loading,
    error,
  };
}

/**
 * Hook to evaluate a feature flag with A/B testing support
 */
export function useFeatureFlagVariant(
  flagKey: string | FeatureFlagKey,
  options: UseFeatureFlagOptions = {}
) {
  const { context } = options;
  const { evaluateFlag, loading, error, flags } = useFeatureFlags();

  const [evaluation, setEvaluation] = useState<FeatureFlagEvaluation | null>(null);

  useEffect(() => {
    if (flags) {
      evaluateFlag(flagKey, context).then(setEvaluation);
    }
  }, [flags, flagKey, context, evaluateFlag]);

  return {
    enabled: evaluation?.enabled ?? false,
    variant: evaluation?.variant,
    config: evaluation?.config,
    loading,
    error,
  };
}

/**
 * Hook to get all enabled feature flags for the current user
 */
export function useEnabledFeatures(context?: FeatureFlagContext) {
  const { flags, isEnabled, loading, error } = useFeatureFlags();

  const enabledFlags = useMemo(() => {
    if (!flags) return [];
    
    return flags.flags
      .filter(flag => isEnabled(flag.key, context))
      .map(flag => flag.key);
  }, [flags, context, isEnabled]);

  return {
    enabledFlags,
    loading,
    error,
  };
}

/**
 * Evaluate percentage-based rollout using consistent hashing
 * This ensures the same user always gets the same result
 */
function evaluateRollout(
  key: string, 
  percentage: number, 
  context?: FeatureFlagContext
): boolean {
  // Create hash input from flag key and user context
  let hashInput = key;
  
  if (context?.userId) {
    hashInput += `:${context.userId}`;
  } else if (context?.sessionId) {
    hashInput += `:${context.sessionId}`;
  } else if (context?.ip) {
    hashInput += `:${context.ip}`;
  }

  // Generate hash value
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Map hash to 0-100 range
  const hashValue = Math.abs(hash) % 100;
  
  return hashValue < percentage;
}

export type { UseFeatureFlagsOptions, UseFeatureFlagOptions };
