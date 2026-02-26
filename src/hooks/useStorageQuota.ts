import { useState, useEffect, useCallback } from 'react';
import { getStorageQuota, checkStorageWarning, StorageManager } from '../lib/storage';

export interface StorageQuotaInfo {
  percentUsed: number;
  estimatedQuota: number;
  estimatedUsage: number;
  shouldWarn: boolean;
  isCritical: boolean;
}

/**
 * Hook to monitor storage quota and provide warnings
 * @param checkInterval - Interval in ms to check quota (default: 30000ms)
 * @returns Storage quota information and utilities
 */
export function useStorageQuota(checkInterval: number = 30000) {
  const [quotaInfo, setQuotaInfo] = useState<StorageQuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkQuota = useCallback(async () => {
    try {
      setError(null);
      const quota = await getStorageQuota();
      const warning = await checkStorageWarning();

      setQuotaInfo({
        percentUsed: quota.percentUsed,
        estimatedQuota: quota.estimatedQuota,
        estimatedUsage: quota.estimatedUsage,
        shouldWarn: warning.shouldWarn,
        isCritical: quota.percentUsed > 95
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check storage quota';
      setError(message);
      console.error('Storage quota check error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkQuota();
  }, [checkQuota]);

  // Set up periodic checks
  useEffect(() => {
    const interval = setInterval(checkQuota, checkInterval);
    return () => clearInterval(interval);
  }, [checkQuota, checkInterval]);

  const clearOldData = useCallback(async () => {
    try {
      const keysToKeep = ['resumeai_master_profile'];
      
      for (const key in localStorage) {
        if (key.startsWith('resumeai_') && !keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      }

      // Re-check quota after clearing
      await checkQuota();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear storage';
      setError(message);
      console.error('Storage clear error:', err);
      return false;
    }
  }, [checkQuota]);

  const clearAllStorage = useCallback(async () => {
    try {
      StorageManager.clear();
      
      // Re-check quota after clearing
      await checkQuota();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear all storage';
      setError(message);
      console.error('Storage clear all error:', err);
      return false;
    }
  }, [checkQuota]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return {
    quotaInfo,
    isLoading,
    error,
    checkQuota,
    clearOldData,
    clearAllStorage,
    formatBytes
  };
}
