import React, { useState, useEffect } from 'react';
import { StorageManager, getStorageQuota } from '../lib/storage';
import { toast } from 'react-toastify';

interface StorageWarningProps {
  onStorageCleaned?: () => void;
}

/**
 * StorageWarning Component
 * Displays storage quota usage and offers cleanup options
 */
export const StorageWarning: React.FC<StorageWarningProps> = ({
  onStorageCleaned
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{
    percentUsed: number;
    used: number;
    quota: number;
  } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const checkQuota = async () => {
      const quota = await getStorageQuota();
      if (quota.percentUsed > 80) {
        setIsOpen(true);
        setQuotaInfo({
          percentUsed: quota.percentUsed,
          used: quota.estimatedUsage,
          quota: quota.estimatedQuota
        });
      }
    };

    checkQuota();
    // Check every 30 seconds
    const interval = setInterval(checkQuota, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleClearOldData = async () => {
    setIsClearing(true);
    try {
      // Clear all resumeai_ prefixed items except current resume
      const keysToKeep = ['resumeai_master_profile']; // Keep the main resume
      
      for (const key in localStorage) {
        if (key.startsWith('resumeai_') && !keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      }

      toast.success('Storage cleaned successfully');
      setIsOpen(false);
      onStorageCleaned?.();

      // Refresh quota info
      const quota = await getStorageQuota();
      setQuotaInfo({
        percentUsed: quota.percentUsed,
        used: quota.estimatedUsage,
        quota: quota.estimatedQuota
      });
    } catch (error) {
      toast.error('Failed to clear storage');
      console.error('Storage cleanup error:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure? This will delete all saved data.')) {
      return;
    }

    setIsClearing(true);
    try {
      StorageManager.clear();
      toast.success('All storage cleared');
      setIsOpen(false);
      onStorageCleaned?.();
    } catch (error) {
      toast.error('Failed to clear storage');
      console.error('Storage clear error:', error);
    } finally {
      setIsClearing(false);
    }
  };

  if (!isOpen || !quotaInfo) {
    return null;
  }

  const isCritical = quotaInfo.percentUsed > 95;
  const bgColor = isCritical ? 'bg-red-50' : 'bg-yellow-50';
  const borderColor = isCritical ? 'border-red-200' : 'border-yellow-200';
  const textColor = isCritical ? 'text-red-800' : 'text-yellow-800';
  const accentColor = isCritical ? 'text-red-600' : 'text-yellow-600';

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 ${bgColor} border ${borderColor} ${textColor} px-4 py-3 rounded-lg shadow-lg max-w-md`}
    >
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined ${accentColor} text-2xl flex-shrink-0 mt-0.5`}>
          {isCritical ? 'warning' : 'info'}
        </span>
        <div className="flex-1">
          <h3 className="font-semibold mb-2">
            {isCritical ? 'Storage Critical' : 'Storage Getting Full'}
          </h3>
          <p className="text-sm mb-3">
            Your storage is {quotaInfo.percentUsed}% full ({formatBytes(quotaInfo.used)} of{' '}
            {formatBytes(quotaInfo.quota)})
          </p>

          {/* Storage usage bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
            <div
              className={`h-full ${isCritical ? 'bg-red-500' : 'bg-yellow-500'} rounded-full transition-all`}
              style={{ width: `${Math.min(quotaInfo.percentUsed, 100)}%` }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleClearOldData}
              disabled={isClearing}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                isClearing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : `bg-${isCritical ? 'red' : 'yellow'}-500 text-white hover:bg-${isCritical ? 'red' : 'yellow'}-600`
              }`}
            >
              {isClearing ? 'Clearing...' : 'Clean Storage'}
            </button>
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="px-3 py-1 rounded text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
            >
              {isClearing ? 'Clearing...' : 'Clear All'}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageWarning;
