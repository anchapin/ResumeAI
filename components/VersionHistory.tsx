import React, { useState, useEffect } from 'react';
import { ResumeVersion } from '../types';
import {
  listResumeVersions,
  restoreResumeVersion,
} from '../utils/api-client';
import { getVersionTimeAgo, formatVersionNumber } from '../utils/versioning';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface VersionHistoryProps {
  resumeId: number;
  onRestore?: (version: ResumeVersion) => void;
}

/**
 * Version history component for resumes
 */
const VersionHistory: React.FC<VersionHistoryProps> = ({
  resumeId,
  onRestore,
}) => {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    loadVersions();
  }, [resumeId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const data = await listResumeVersions(resumeId);
      setVersions(data);
    } catch (error) {
      showErrorToast('Failed to load version history');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: ResumeVersion) => {
    if (
      !confirm(
        `Are you sure you want to restore to ${formatVersionNumber(
          version.version_number
        )}? This will create a new version with the restored data.`
      )
    ) {
      return;
    }

    try {
      setRestoring(version.id);
      await restoreResumeVersion(resumeId, version.id);
      showSuccessToast(
        `Successfully restored to ${formatVersionNumber(version.version_number)}`
      );
      await loadVersions(); // Reload versions
      onRestore?.(version);
    } catch (error) {
      showErrorToast('Failed to restore version');
      console.error(error);
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500">
        <span className="material-symbols-outlined text-4xl mb-2">history</span>
        <p>No version history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Version History</h3>
      {versions.map((version, index) => (
        <div
          key={version.id}
          className={`bg-white rounded-xl border transition-all overflow-hidden ${
            index === 0
              ? 'border-primary-200 shadow-md ring-1 ring-primary-100'
              : 'border-slate-200'
          }`}
        >
          <div className="p-4 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-bold text-slate-900">
                  {formatVersionNumber(version.version_number)}
                </span>
                {index === 0 && (
                  <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-bold rounded-full">
                    Current
                  </span>
                )}
              </div>
              {version.change_description && (
                <p className="text-sm text-slate-600 mb-1">
                  {version.change_description}
                </p>
              )}
              <p className="text-xs text-slate-400">
                {getVersionTimeAgo(version.created_at)}
              </p>
            </div>
            {index !== 0 && (
              <button
                onClick={() => handleRestore(version)}
                disabled={restoring === version.id}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {restoring === version.id ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                    <span>Restoring...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">
                      restore
                    </span>
                    <span>Restore</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VersionHistory;
