import React, { useState, useEffect } from 'react';
import {
  VersionInfo,
  VersionDiff,
  listVersions,
  getVersion,
  restoreVersion,
  deleteVersion,
  compareVersions,
  createVersion,
} from '../../utils/version-history-api';

interface VersionHistoryPanelProps {
  resumeId: number;
  onClose?: () => void;
  onRestore?: (versionNumber: number) => void;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  resumeId,
  onClose,
  onRestore,
}) => {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<VersionInfo | null>(null);
  const [comparingVersion, setComparingVersion] = useState<VersionInfo | null>(null);
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [resumeId]);

  const loadVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listVersions(resumeId);
      setVersions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVersion = async (version: VersionInfo) => {
    setSelectedVersion(version);
    try {
      const detail = await getVersion(resumeId, version.id);
      console.log('Version data:', detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version');
    }
  };

  const handleCompare = async (version: VersionInfo) => {
    if (!selectedVersion) {
      setSelectedVersion(version);
      return;
    }

    if (selectedVersion.id === version.id) {
      setComparingVersion(null);
      setDiff(null);
      return;
    }

    setComparingVersion(version);
    try {
      const versionDiff = await compareVersions(
        resumeId,
        selectedVersion.id,
        version.id
      );
      setDiff(versionDiff);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare versions');
    }
  };

  const handleRestore = async (versionId: number, versionNumber: number) => {
    if (!confirm(`Restore to version ${versionNumber}? This will create a new version with the restored data.`)) {
      return;
    }

    try {
      const result = await restoreVersion(resumeId, versionId);
      onRestore?.(result.new_version);
      loadVersions();
      setSelectedVersion(null);
      setComparingVersion(null);
      setDiff(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version');
    }
  };

  const handleDelete = async (versionId: number, versionNumber: number) => {
    if (!confirm(`Delete version ${versionNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteVersion(resumeId, versionId);
      loadVersions();
      if (selectedVersion?.id === versionId) {
        setSelectedVersion(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete version');
    }
  };

  const handleCreateVersion = async (versionName?: string, changeDescription?: string) => {
    try {
      await createVersion(resumeId, { version_name: versionName, change_description: changeDescription });
      loadVersions();
      setShowCreateDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create version');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Version History ({versions.length})
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
          >
            Save Version
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Diff View */}
      {diff && comparingVersion && selectedVersion && (
        <div className="mx-4 mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">
              Comparing v{selectedVersion.version_number} → v{comparingVersion.version_number}
            </h4>
            <button
              onClick={() => {
                setDiff(null);
                setComparingVersion(null);
              }}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium text-green-700 mb-2">
                Added ({diff.added.length})
              </h5>
              {diff.added.length === 0 ? (
                <p className="text-sm text-gray-500">No additions</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {diff.added.map((item) => (
                    <li key={item} className="text-green-700">+ {item}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h5 className="text-sm font-medium text-red-700 mb-2">
                Removed ({diff.removed.length})
              </h5>
              {diff.removed.length === 0 ? (
                <p className="text-sm text-gray-500">No removals</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {diff.removed.map((item) => (
                    <li key={item} className="text-red-700">- {item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {diff.modified.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-yellow-700 mb-2">
                Modified ({diff.modified.length})
              </h5>
              <ul className="text-sm space-y-1">
                {diff.modified.map((item) => (
                  <li key={item} className="text-yellow-700">~ {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Versions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-gray-500">Loading versions...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No versions yet</p>
            <p className="text-sm mt-1">Save your first version to track changes</p>
          </div>
        ) : (
          versions.map((version) => (
            <VersionItem
              key={version.id}
              version={version}
              isSelected={selectedVersion?.id === version.id}
              isComparing={comparingVersion?.id === version.id}
              onSelect={() => handleSelectVersion(version)}
              onCompare={() => handleCompare(version)}
              onRestore={() => handleRestore(version.id, version.version_number)}
              onDelete={() => handleDelete(version.id, version.version_number)}
              formatDate={formatDate}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface VersionItemProps {
  version: VersionInfo;
  isSelected: boolean;
  isComparing: boolean;
  onSelect: () => void;
  onCompare: () => void;
  onRestore: () => void;
  onDelete: () => void;
  formatDate: (dateString: string) => string;
}

const VersionItem: React.FC<VersionItemProps> = ({
  version,
  isSelected,
  isComparing,
  onSelect,
  onCompare,
  onRestore,
  onDelete,
  formatDate,
}) => {
  return (
    <div
      className={`border rounded-lg p-4 transition ${
        isSelected
          ? 'bg-blue-50 border-blue-300'
          : isComparing
          ? 'bg-purple-50 border-purple-300'
          : 'bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1" onClick={onSelect}>
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-gray-900">
              Version {version.version_number}
            </span>
            {version.version_name && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                {version.version_name}
              </span>
            )}
          </div>
          {version.change_description && (
            <p className="text-sm text-gray-600 mb-1">{version.change_description}</p>
          )}
          <p className="text-xs text-gray-500">{formatDate(version.created_at)}</p>
        </div>

        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={onCompare}
            className={`p-1.5 rounded transition ${
              isComparing
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-400 hover:text-blue-600'
            }`}
            title={isSelected ? 'Selected for comparison' : 'Compare with this version'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          <button
            onClick={onRestore}
            className="p-1.5 text-gray-400 hover:text-green-600 rounded transition"
            title="Restore to this version"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {version.version_number > 1 && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded transition"
              title="Delete version"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface CreateVersionDialogProps {
  onClose: () => void;
  onCreate: (versionName?: string, changeDescription?: string) => void;
}

const CreateVersionDialog: React.FC<CreateVersionDialogProps> = ({ onClose, onCreate }) => {
  const [versionName, setVersionName] = useState('');
  const [changeDescription, setChangeDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(
      versionName.trim() || undefined,
      changeDescription.trim() || undefined
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Save New Version
            </h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="versionName" className="block text-sm font-medium text-gray-700 mb-1">
                  Version Name (optional)
                </label>
                <input
                  type="text"
                  id="versionName"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Before adding new job"
                />
              </div>

              <div>
                <label htmlFor="changeDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Change Description (optional)
                </label>
                <textarea
                  id="changeDescription"
                  value={changeDescription}
                  onChange={(e) => setChangeDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe what changed in this version..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Save Version
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
