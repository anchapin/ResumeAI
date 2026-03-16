/**
 * useApplicationStats Hook
 * 
 * Hook for fetching application statistics.
 * 
 * @example
 * const {
 *   stats,
 *   funnel,
 *   conversionRates,
 * } = useApplicationStats();
 */

import { useCallback, useState, useEffect } from 'react';
import {
  getApplicationStats,
  getApplicationFunnel,
  getConversionRates,
  getTimeToResponse,
} from '../../utils/applications-api';
import type {
  ApplicationStats,
  FunnelData,
  ConversionRates,
  TimeToResponse,
  UseApplicationStatsReturn,
} from '../../types/applications';

export function useApplicationStats(): UseApplicationStatsReturn {
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [conversionRates, setConversionRates] = useState<ConversionRates | null>(null);
  const [timeToResponse, setTimeToResponse] = useState<TimeToResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch statistics.
   */
  const fetchStats = useCallback(async (days: number = 90) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getApplicationStats(days);
      setStats(data);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch funnel data.
   */
  const fetchFunnel = useCallback(async (days: number = 90) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getApplicationFunnel(days);
      setFunnel(data);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch funnel');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch conversion rates.
   */
  const fetchConversionRates = useCallback(async (days: number = 90) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getConversionRates(days);
      setConversionRates(data);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch conversion rates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch time to response.
   */
  const fetchTimeToResponse = useCallback(async (days: number = 90) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getTimeToResponse(days);
      setTimeToResponse(data);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch time to response');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch all on mount
  useEffect(() => {
    fetchStats();
    fetchFunnel();
    fetchConversionRates();
    fetchTimeToResponse();
  }, []);

  return {
    stats,
    funnel,
    conversionRates,
    timeToResponse,
    isLoading,
    error,
    fetchStats,
    fetchFunnel,
    fetchConversionRates,
    fetchTimeToResponse,
  };
}

export default useApplicationStats;
