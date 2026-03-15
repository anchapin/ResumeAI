/**
 * useAlertPreferences Hook
 * 
 * Hook for managing notification preferences.
 * 
 * @example
 * const {
 *   preferences,
 *   updatePreferences,
 * } = useAlertPreferences();
 */

import { useCallback, useState, useEffect } from 'react';
import {
  getPreferences,
  updatePreferences as updatePreferencesApi,
} from '../../utils/alerts-api';
import type { AlertPreferences, UpdatePreferencesData, UseAlertPreferencesReturn } from '../../types/alerts';

export function useAlertPreferences(): UseAlertPreferencesReturn {
  const [preferences, setPreferences] = useState<AlertPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch preferences.
   */
  const fetchPreferences = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const prefs = await getPreferences();
      setPreferences(prefs);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch preferences');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update preferences.
   */
  const updatePreferences = useCallback(async (data: UpdatePreferencesData): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const prefs = await updatePreferencesApi(data);
      setPreferences(prefs);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to update preferences');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    fetchPreferences,
    updatePreferences,
  };
}

export default useAlertPreferences;
