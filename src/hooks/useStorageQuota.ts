import { useState, useEffect, useCallback } from 'react';
import { getStorageQuota } from '../lib/storage';

export interface StorageStats {
  usedBytes: number;
  totalBytes: number;
  usagePercent: number;
  canStore: boolean;
}

export interface UseStorageQuotaReturn {
  stats: StorageStats | null;
  isWarning: boolean;
  isCritical: boolean;
  refresh: () => void;
}

/**
 * Hook for monitoring localStorage quota usage
 * Periodically checks storage stats and returns warning states
 * @param warningThreshold - Percentage at which to show warning (default 80)
 * @param criticalThreshold - Percentage at which to show critical alert (default 95)
 * @param pollInterval - How often to check storage in ms (default 30000)
 */
export function useStorageQuota(
  warningThreshold: number = 80,
  criticalThreshold: number = 95,
  pollInterval: number = 30000,
): UseStorageQuotaReturn {
  const [stats, setStats] = useState<StorageStats | null>(null);

  const refresh = useCallback(async () => {
    try {
      const quota = await getStorageQuota();
      const newStats: StorageStats = {
        usedBytes: quota.estimatedUsage,
        totalBytes: quota.estimatedQuota,
        usagePercent: quota.percentUsed,
        canStore: quota.percentUsed < 95,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error refreshing storage stats:', error);
    }
  }, []);

  useEffect(() => {
    // Initial check
    refresh();

    // Set up interval for periodic checks
    const interval = setInterval(refresh, pollInterval);

    return () => clearInterval(interval);
  }, [refresh, pollInterval]);

  const isWarning = stats ? stats.usagePercent >= warningThreshold : false;
  const isCritical = stats ? stats.usagePercent >= criticalThreshold : false;

  return {
    stats,
    isWarning,
    isCritical,
    refresh,
  };
}
