/**
 * useAlerts Hook
 * 
 * Hook for managing job alerts.
 * 
 * @example
 * const {
 *   alerts,
 *   createAlert,
 *   updateAlert,
 *   deleteAlert,
 * } = useAlerts();
 */

import { useCallback, useState, useEffect } from 'react';
import {
  getAlerts,
  createAlert as createAlertApi,
  updateAlert as updateAlertApi,
  deleteAlert as deleteAlertApi,
  pauseAlert as pauseAlertApi,
  resumeAlert as resumeAlertApi,
} from '../../utils/alerts-api';
import type { JobAlert, CreateAlertData, UpdateAlertData, UseAlertsReturn } from '../../types/alerts';

export function useAlerts(): UseAlertsReturn {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all alerts.
   */
  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getAlerts();
      setAlerts(response.alerts);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch alerts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new alert.
   */
  const createAlert = useCallback(async (data: CreateAlertData): Promise<JobAlert> => {
    setIsLoading(true);
    setError(null);

    try {
      const alert = await createAlertApi(data);
      setAlerts((prev) => [...prev, alert]);
      return alert;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to create alert');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update an alert.
   */
  const updateAlert = useCallback(async (id: number, data: UpdateAlertData): Promise<JobAlert> => {
    setIsLoading(true);
    setError(null);

    try {
      const alert = await updateAlertApi(id, data);
      setAlerts((prev) => prev.map((a) => (a.id === id ? alert : a)));
      return alert;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to update alert');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete an alert.
   */
  const deleteAlert = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteAlertApi(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to delete alert');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Pause an alert.
   */
  const pauseAlert = useCallback(async (id: number): Promise<void> => {
    try {
      await pauseAlertApi(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: false } : a))
      );
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to pause alert');
      throw err;
    }
  }, []);

  /**
   * Resume a paused alert.
   */
  const resumeAlert = useCallback(async (id: number): Promise<void> => {
    try {
      await resumeAlertApi(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: true } : a))
      );
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to resume alert');
      throw err;
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    isLoading,
    error,
    fetchAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
    pauseAlert,
    resumeAlert,
  };
}

export default useAlerts;
