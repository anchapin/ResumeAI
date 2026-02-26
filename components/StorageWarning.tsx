import React from 'react';
import { useStorageQuota } from '../src/hooks/useStorageQuota';

/**
 * StorageWarning Component
 * Displays visual warning when localStorage approaches capacity
 * Shows yellow warning at 80% and red alert at 95%
 */
const StorageWarning: React.FC = () => {
  const { stats, isWarning, isCritical, refresh } = useStorageQuota();

  if (!stats || (!isWarning && !isCritical)) {
    return null;
  }

  const usagePercent = Math.round(stats.usagePercent);
  const usageMB = (stats.usedBytes / 1024 / 1024).toFixed(1);
  const totalMB = (stats.totalBytes / 1024 / 1024).toFixed(1);

  const bgColor = isCritical
    ? 'bg-red-50 border-red-200'
    : 'bg-yellow-50 border-yellow-200';
  const textColor = isCritical ? 'text-red-800' : 'text-yellow-800';
  const iconColor = isCritical ? 'text-red-500' : 'text-yellow-500';
  const progressBg = isCritical ? 'bg-red-200' : 'bg-yellow-200';
  const progressFill = isCritical ? 'bg-red-500' : 'bg-yellow-500';
  const badge = isCritical ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';

  const handleRefresh = async () => {
    await refresh();
  };

  const handleManageStorage = () => {
    window.location.hash = '#settings';
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 max-w-sm border rounded-lg shadow-lg p-4 ${bgColor} ${textColor} animate-in slide-in-from-bottom-2 fade-in`}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <span className={`material-symbols-outlined ${iconColor} text-[24px]`}>
            {isCritical ? 'storage_alert' : 'warning'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-2">
            {isCritical ? 'Storage Critical' : 'Storage Warning'}
          </h3>
          <p className="text-xs mb-3 leading-relaxed">
            {isCritical
              ? 'Your storage is almost full. Please clear some data soon.'
              : 'Your storage usage is getting high. Consider clearing old data.'}
          </p>

          {/* Progress bar */}
          <div className="mb-2">
            <div className={`h-2 rounded-full ${progressBg} overflow-hidden`}>
              <div
                className={`h-full ${progressFill} transition-all duration-300`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between gap-2 text-xs mb-3">
            <span className="font-medium">
              {usageMB} MB / {totalMB} MB
            </span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${badge}`}>
              {usagePercent}%
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                isCritical
                  ? 'hover:bg-red-100 text-red-700'
                  : 'hover:bg-yellow-100 text-yellow-700'
              }`}
            >
              Refresh
            </button>
            {isCritical && (
              <button
                onClick={handleManageStorage}
                className="text-xs px-3 py-1.5 rounded font-medium bg-red-200 text-red-800 hover:bg-red-300 transition-colors"
              >
                Manage Storage
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageWarning;
