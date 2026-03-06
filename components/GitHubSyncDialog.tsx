import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * GitHub connection status interface
 */
interface GitHubConnectionStatus {
  connected: boolean;
  github_username?: string;
  github_user_id?: string;
  connected_at?: string;
}

/**
 * GitHub repository interface
 */
interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updatedAt: string;
  private: boolean;
}

/**
 * Props for GitHubSyncDialog component
 */
interface GitHubSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (repositories: GitHubRepository[]) => void;
  redirectUri?: string;
}

/**
 * Get JWT token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('resumeai_access_token');
}

/**
 * Fetch GitHub connection status from backend
 */
async function fetchGitHubConnectionStatus(): Promise<GitHubConnectionStatus> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/v1/github/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    return { connected: false };
  }

  if (!response.ok) {
    throw new Error('Failed to check GitHub connection status');
  }

  return response.json();
}

/**
 * Get GitHub OAuth connect URL
 */
async function getGitHubConnectUrl(
  redirectUri?: string,
): Promise<{ authorization_url: string; state: string }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  let url = `${API_URL}/api/v1/github/connect`;
  if (redirectUri) {
    url += `?redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: 'Failed to get GitHub connect URL' }));
    throw new Error(error.detail || 'Failed to get GitHub connect URL');
  }

  return response.json();
}

/**
 * Fetch user's GitHub repositories
 */
async function fetchGitHubRepositories(): Promise<GitHubRepository[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/v1/github/repositories`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch repositories' }));
    throw new Error(error.detail || 'Failed to fetch repositories');
  }

  const data = await response.json();
  return data.repositories || [];
}

/**
 * GitHub Sync Dialog Component
 *
 * Allows users to sync their GitHub repositories to their resume.
 * Checks OAuth connection status and prompts connection if needed.
 */
export const GitHubSyncDialog: React.FC<GitHubSyncDialogProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
  redirectUri,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<GitHubConnectionStatus | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepositories, setSelectedRepositories] = useState<Set<number>>(new Set());
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isLoadingRepositories, setIsLoadingRepositories] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load repositories from GitHub - must be defined first since checkConnectionStatus uses it
  const loadRepositories = useCallback(async () => {
    setIsLoadingRepositories(true);
    setError(null);

    try {
      const repos = await fetchGitHubRepositories();
      setRepositories(repos);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load repositories';
      setError(errorMessage);
    } finally {
      setIsLoadingRepositories(false);
    }
  }, []);

  // Check connection status - must be defined after loadRepositories since it uses it
  const checkConnectionStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setError(null);
    setRepositories([]);
    setSelectedRepositories(new Set());

    try {
      const status = await fetchGitHubConnectionStatus();
      setConnectionStatus(status);

      if (status.connected) {
        // Load repositories if connected
        await loadRepositories();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check connection status';
      setError(errorMessage);
      setConnectionStatus(null);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [loadRepositories]);

  // Check OAuth connection status on dialog open
  useEffect(() => {
    if (isOpen) {
      checkConnectionStatus();
    }
  }, [isOpen, checkConnectionStatus]);

  // Handle GitHub connection
  const handleConnectGitHub = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const { authorization_url } = await getGitHubConnectUrl(redirectUri);
      // Redirect to GitHub OAuth
      window.location.href = authorization_url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect GitHub';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsConnecting(false);
    }
  };

  // Toggle repository selection
  const toggleRepository = (repoId: number) => {
    const newSelected = new Set(selectedRepositories);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else {
      newSelected.add(repoId);
    }
    setSelectedRepositories(newSelected);
  };

  // Handle sync selected repositories
  const handleSync = async () => {
    if (selectedRepositories.size === 0) {
      toast.error('Please select at least one repository');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const selectedRepos = repositories.filter((repo) => selectedRepositories.has(repo.id));

      // Call onSyncComplete callback with selected repositories
      if (onSyncComplete) {
        onSyncComplete(selectedRepos);
      }

      toast.success(`${selectedRepositories.size} repository(ies) synced successfully`);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync repositories';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Updated today';
    if (diffDays === 1) return 'Updated yesterday';
    if (diffDays < 7) return `Updated ${diffDays} days ago`;
    if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `Updated ${Math.floor(diffDays / 30)} months ago`;
    return `Updated ${Math.floor(diffDays / 365)} years ago`;
  };

  // Format stars/forks for display
  const formatNumber = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#24292e] size-10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Sync GitHub Repositories</h2>
              <p className="text-sm text-slate-500">
                {connectionStatus?.connected
                  ? `Connected as @${connectionStatus.github_username}`
                  : 'Connect your GitHub account to sync repositories'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={isSyncing || isConnecting}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-4 min-h-0">
          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-lg">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {/* Loading Status */}
          {isLoadingStatus && (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary-600 text-4xl mb-4">
                progress_activity
              </span>
              <p className="text-slate-600 font-medium">Checking GitHub connection...</p>
            </div>
          )}

          {/* Not Connected State */}
          {!isLoadingStatus && !connectionStatus?.connected && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <h4 className="font-bold text-slate-900 mb-2">Connect your GitHub account</h4>
              <p className="text-slate-500 text-sm mb-4">
                You need to connect your GitHub account to sync your repositories to your resume.
              </p>
              <button
                onClick={handleConnectGitHub}
                disabled={isConnecting}
                className="px-6 py-3 rounded-lg bg-[#24292e] text-white font-bold text-sm hover:bg-[#3c444d] transition-colors shadow-lg flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                {isConnecting ? 'Connecting...' : 'Connect with GitHub'}
              </button>
            </div>
          )}

          {/* Loading Repositories */}
          {!isLoadingStatus && connectionStatus?.connected && isLoadingRepositories && (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary-600 text-4xl mb-4">
                progress_activity
              </span>
              <p className="text-slate-600 font-medium">Loading your repositories...</p>
            </div>
          )}

          {/* Repositories List */}
          {!isLoadingStatus &&
            connectionStatus?.connected &&
            !isLoadingRepositories &&
            repositories.length === 0 && (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">
                  folder_open
                </span>
                <p className="text-slate-500 font-medium mb-2">No repositories found</p>
                <p className="text-slate-400 text-sm">
                  Create repositories on GitHub to sync them with your resume
                </p>
              </div>
            )}

          {/* Repositories List */}
          {!isLoadingStatus &&
            connectionStatus?.connected &&
            !isLoadingRepositories &&
            repositories.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Your Repositories</h4>
                  <button
                    onClick={() => setSelectedRepositories(new Set(repositories.map((r) => r.id)))}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Select All
                  </button>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {repositories.map((repo) => (
                    <div
                      key={repo.id}
                      onClick={() => toggleRepository(repo.id)}
                      className={`
                      p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${
                        selectedRepositories.has(repo.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }
                    `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-bold text-slate-900 truncate">{repo.name}</h5>
                            {repo.private && (
                              <span className="material-symbols-outlined text-amber-500 text-[16px]">
                                lock
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mb-2 line-clamp-2">
                            {repo.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            {repo.language && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                                {repo.language}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">star</span>
                              {formatNumber(repo.stargazers_count)}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                account_tree
                              </span>
                              {formatNumber(repo.forks_count)}
                            </span>
                            <span>{formatDate(repo.updatedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedRepositories.has(repo.id)
                                ? 'border-primary-500 bg-primary-500'
                                : 'border-slate-300'
                            }`}
                          >
                            {selectedRepositories.has(repo.id) && (
                              <span className="material-symbols-outlined text-white text-[16px]">
                                check
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedRepositories.size > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                    {selectedRepositories.size} repository
                    {selectedRepositories.size !== 1 ? 'ies' : ''} selected
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
            disabled={isSyncing || isConnecting || isLoadingRepositories}
          >
            Cancel
          </button>
          <button
            onClick={handleSync}
            disabled={
              selectedRepositories.size === 0 || isSyncing || isConnecting || isLoadingRepositories
            }
            className="px-5 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSyncing ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  progress_activity
                </span>
                Syncing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">sync</span>
                Sync Selected ({selectedRepositories.size})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GitHubSyncDialog;
