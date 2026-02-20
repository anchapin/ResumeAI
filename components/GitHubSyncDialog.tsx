import React, { useState, useEffect } from 'react';
import {
  GitHubConnectionStatus,
  GitHubRepository,
  GitHubProject,
  GitHubSyncOptions,
} from '../types';
import {
  getGitHubConnectionStatus,
  getGitHubOAuthUrl,
  getGitHubRepositories,
  syncGitHubProjects,
  disconnectGitHub,
} from '../utils/api-client';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface GitHubSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (projects: GitHubProject[]) => void;
  authMode?: 'oauth' | 'cli';
}

/**
 * GitHub Sync Dialog component for connecting GitHub and importing repositories
 *
 * @component
 * @description Provides UI for GitHub OAuth connection and repository selection for syncing
 * @param {GitHubSyncDialogProps} props - Component props
 * @returns {JSX.Element} The rendered GitHub sync dialog component
 *
 * @example
 * ```tsx
 * <GitHubSyncDialog
 *   isOpen={true}
 *   onClose={() => setShowDialog(false)}
 *   onSyncComplete={(projects) => console.log(projects)}
 * />
 * ```
 */
const GitHubSyncDialog: React.FC<GitHubSyncDialogProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
  authMode = 'oauth',
}) => {
  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState<GitHubConnectionStatus>({
    connected: false,
    auth_mode: 'none',
  });
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);

  // Repository state
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepositories, setSelectedRepositories] = useState<Set<number>>(
    new Set()
  );
  const [loadingRepositories, setLoadingRepositories] = useState<boolean>(false);

  // Sync state
  const [syncing, setSyncing] = useState<boolean>(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Sync options
  const [syncOptions, setSyncOptions] = useState<GitHubSyncOptions>({
    include_private: false,
    include_forks: false,
  });

  // Check for OAuth callback on mount
  useEffect(() => {
    if (!isOpen) return;

    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('github_oauth') === 'success';
    const oauthError = urlParams.get('github_oauth_error');

    if (oauthSuccess) {
      showSuccessToast('GitHub connected successfully!');
      // Remove the query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh connection status
      fetchConnectionStatus();
    } else if (oauthError) {
      showErrorToast(`GitHub connection failed: ${oauthError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Initial load
      fetchConnectionStatus();
    }
  }, [isOpen]);

  // Fetch connection status
  const fetchConnectionStatus = async () => {
    try {
      setLoadingStatus(true);
      setError(null);
      const status = await getGitHubConnectionStatus();
      setConnectionStatus(status);

      // If connected, fetch repositories
      if (status.connected && status.auth_mode !== 'none') {
        await fetchRepositories();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to check GitHub connection';
      setError(errorMessage);
      console.error('Error fetching GitHub connection status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Fetch repositories
  const fetchRepositories = async () => {
    try {
      setLoadingRepositories(true);
      setError(null);
      const repos = await getGitHubRepositories(syncOptions);
      setRepositories(repos);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch repositories';
      setError(errorMessage);
      console.error('Error fetching repositories:', err);
    } finally {
      setLoadingRepositories(false);
    }
  };

  // Handle GitHub OAuth connection
  const handleConnect = () => {
    try {
      const oauthUrl = getGitHubOAuthUrl();
      // Redirect to OAuth endpoint
      window.location.href = oauthUrl;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to initiate GitHub OAuth flow';
      showErrorToast(errorMessage);
      console.error('Error initiating GitHub OAuth:', err);
    }
  };

  // Handle GitHub disconnection
  const handleDisconnect = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect your GitHub account? This will revoke access to your repositories.'
      )
    ) {
      return;
    }

    try {
      await disconnectGitHub();

      setConnectionStatus({
        connected: false,
        auth_mode: 'none',
      });

      setRepositories([]);
      setSelectedRepositories(new Set());

      showSuccessToast('GitHub disconnected successfully');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to disconnect GitHub';
      setError(errorMessage);
      showErrorToast(errorMessage);
      console.error('Error disconnecting GitHub:', err);
    }
  };

  // Toggle repository selection
  const toggleRepositorySelection = (repoId: number) => {
    const newSelection = new Set(selectedRepositories);
    if (newSelection.has(repoId)) {
      newSelection.delete(repoId);
    } else {
      newSelection.add(repoId);
    }
    setSelectedRepositories(newSelection);
  };

  // Toggle all repositories
  const toggleAllRepositories = () => {
    if (selectedRepositories.size === repositories.length) {
      setSelectedRepositories(new Set());
    } else {
      setSelectedRepositories(
        new Set(repositories.map((repo) => repo.id))
      );
    }
  };

  // Handle sync
  const handleSync = async () => {
    if (selectedRepositories.size === 0) {
      showErrorToast('Please select at least one repository');
      return;
    }

    try {
      setSyncing(true);
      setError(null);

      const projects = await syncGitHubProjects(
        Array.from(selectedRepositories)
      );

      showSuccessToast(
        `Successfully synced ${projects.length} project${projects.length !== 1 ? 's' : ''}!`
      );

      onSyncComplete?.(projects);

      // Keep dialog open but show success state
      setSelectedRepositories(new Set());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sync projects';
      setError(errorMessage);
      showErrorToast(errorMessage);
      console.error('Error syncing projects:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Reset dialog state when closed
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setRepositories([]);
      setSelectedRepositories(new Set());
      setSyncing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-labelledby="github-sync-dialog-title"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h2
              id="github-sync-dialog-title"
              className="text-xl font-bold text-slate-900"
            >
              Sync GitHub Projects
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Import your GitHub repositories as resume projects
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Connection Status */}
          {loadingStatus ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="material-symbols-outlined text-[48px] text-slate-300 animate-spin mb-4">
                progress_activity
              </span>
              <p className="text-slate-600">Checking GitHub connection...</p>
            </div>
          ) : !connectionStatus.connected || connectionStatus.auth_mode === 'none' ? (
            /* Not Connected State */
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[48px] text-slate-400">
                  link_off
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                GitHub Not Connected
              </h3>
              <p className="text-slate-600 text-center mb-6 max-w-md">
                Connect your GitHub account to import your repositories as projects
                in your resume.
              </p>
              {authMode === 'cli' ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-600 text-[20px]">
                      warning
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-amber-900 font-medium">
                        CLI Mode Enabled
                      </p>
                      <p className="text-sm text-amber-800 mt-1">
                        GitHub authentication is configured to use the CLI tool. Please
                        use the CLI to authenticate and sync your projects.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="px-6 py-3 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-lg flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">add_link</span>
                  Connect GitHub
                </button>
              )}
            </div>
          ) : (
            /* Connected State */
            <div className="space-y-6">
              {/* Connection Info */}
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-600 text-[24px]">
                    check_circle
                  </span>
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Connected as{' '}
                      <span className="font-bold">
                        {connectionStatus.username || 'Unknown'}
                      </span>
                    </p>
                    <p className="text-xs text-green-700 mt-0.5">
                      {connectionStatus.auth_mode === 'oauth' ? 'OAuth' : 'CLI'} mode
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {/* Sync Options */}
              <div className="flex items-center gap-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncOptions.include_private}
                    onChange={(e) =>
                      setSyncOptions({
                        ...syncOptions,
                        include_private: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700">Include private</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncOptions.include_forks}
                    onChange={(e) =>
                      setSyncOptions({
                        ...syncOptions,
                        include_forks: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700">Include forks</span>
                </label>
              </div>

              {/* Repository List */}
              {loadingRepositories ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="material-symbols-outlined text-[48px] text-slate-300 animate-spin mb-4">
                    progress_activity
                  </span>
                  <p className="text-slate-600">Loading repositories...</p>
                </div>
              ) : repositories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="material-symbols-outlined text-[48px] text-slate-300 mb-4">
                    folder_off
                  </span>
                  <p className="text-slate-600">No repositories found</p>
                  <button
                    onClick={fetchRepositories}
                    className="mt-4 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select All */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          selectedRepositories.size === repositories.length &&
                          repositories.length > 0
                        }
                        onChange={toggleAllRepositories}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-bold text-slate-700">
                        {selectedRepositories.size} of {repositories.length} selected
                      </span>
                    </label>
                    <button
                      onClick={fetchRepositories}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        refresh
                      </span>
                      Refresh
                    </button>
                  </div>

                  {/* Repository Items */}
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {repositories.map((repo) => (
                      <div
                        key={repo.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedRepositories.has(repo.id)
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                        onClick={() => toggleRepositorySelection(repo.id)}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selectedRepositories.has(repo.id)}
                            onChange={() => toggleRepositorySelection(repo.id)}
                            className="mt-1 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-outlined text-[16px] text-slate-500">
                                folder
                              </span>
                              <h4 className="font-bold text-slate-900 truncate">
                                {repo.name}
                              </h4>
                              {repo.private && (
                                <span className="material-symbols-outlined text-[16px] text-slate-500">
                                  lock
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              {repo.language && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                  {repo.language}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">
                                  star
                                </span>
                                {repo.stargazers_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">
                                  fork_right
                                </span>
                                {repo.forks_count}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <span className="material-symbols-outlined text-red-600 text-[20px] mt-0.5">
                error
              </span>
              <div className="flex-1">
                <p className="text-sm text-red-800 font-medium">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {connectionStatus.connected &&
          connectionStatus.auth_mode !== 'none' &&
          !loadingRepositories && (
            <div className="p-6 border-t border-slate-200 shrink-0">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSync}
                  disabled={selectedRepositories.size === 0 || syncing}
                  className="px-5 py-2.5 rounded-lg bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {syncing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">
                        progress_activity
                      </span>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        sync
                      </span>
                      Sync {selectedRepositories.size}{' '}
                      {selectedRepositories.size === 1 ? 'Project' : 'Projects'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default GitHubSyncDialog;
