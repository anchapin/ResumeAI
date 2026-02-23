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
    return { connected: false };
  }

  try {
    const response = await fetch(`${API_URL}/github/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return { connected: false };
    }

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub connection status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching GitHub connection status:', error);
    // If the endpoint doesn't exist yet, return not connected
    return { connected: false };
  }
}

/**
 * Get GitHub OAuth connect URL
 */
async function getGitHubConnectUrl(): Promise<{ authorization_url: string; state: string }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/github/connect`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get GitHub connect URL' }));
    throw new Error(error.detail || 'Failed to get GitHub connect URL');
  }

  return response.json();
}

/**
 * Process GitHub OAuth callback
 */
async function processGitHubCallback(code: string, state: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/github/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to connect GitHub' }));
    throw new Error(error.detail || 'Failed to connect GitHub');
  }
}

/**
 * Disconnect GitHub account
 */
async function disconnectGitHub(): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/github/disconnect`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.json().catch(() => ({ detail: 'Failed to disconnect GitHub' }));
    throw new Error(error.detail || 'Failed to disconnect GitHub');
  }
}

/**
 * @component
 * @description GitHub connection settings component for managing GitHub OAuth connections
 * @returns {JSX.Element} The rendered GitHub settings component
 *
 * @example
 * ```tsx
 * <GitHubSettings />
 * ```
 */
const GitHubSettings: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<GitHubConnectionStatus>({
    connected: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load connection status
  const loadConnectionStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await fetchGitHubConnectionStatus();
      setConnectionStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connection status');
      setConnectionStatus({ connected: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load connection status on mount
  useEffect(() => {
    loadConnectionStatus();

    // Check for OAuth callback parameters
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const errorParam = params.get('error');

    if (errorParam) {
      // Handle OAuth error
      const errorDescription = params.get('error_description') || 'Failed to connect GitHub';
      toast.error(`GitHub connection failed: ${errorDescription}`);
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (code && state) {
      // Handle successful OAuth callback
      setIsConnecting(true);
      processGitHubCallback(code, state)
        .then(() => {
          toast.success('GitHub connected successfully!');
          // Clear URL parameters
          window.history.replaceState({}, '', window.location.pathname);
          // Reload connection status after a short delay
          setTimeout(() => {
            loadConnectionStatus();
          }, 500);
        })
        .catch((err) => {
          const errorMessage = err instanceof Error ? err.message : 'Failed to connect GitHub';
          setError(errorMessage);
          toast.error(errorMessage);
        })
        .finally(() => {
          setIsConnecting(false);
        });
    }
  }, [loadConnectionStatus]);

  // Handle GitHub connection
  const handleConnectGitHub = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const { authorization_url } = await getGitHubConnectUrl();
      // Redirect to GitHub OAuth
      window.location.href = authorization_url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect GitHub';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsConnecting(false);
    }
  };

  // Handle GitHub disconnection
  const handleDisconnectGitHub = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account? This will revoke access to your GitHub data.')) {
      return;
    }

    setIsDisconnecting(true);
    setError(null);

    try {
      await disconnectGitHub();
      setConnectionStatus({ connected: false });
      toast.success('GitHub account disconnected successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect GitHub';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-lg font-bold text-slate-900">GitHub Connection</h3>
        <p className="text-sm text-slate-500">Connect your GitHub account to import projects and contributions</p>
      </div>
      <div className="p-6">
        {/* Loading State */}
        {isLoading && !isConnecting && (
          <div className="flex items-center justify-center py-8">
            <span
              className="material-symbols-outlined animate-spin text-primary-600 text-3xl"
              aria-label="Loading"
              role="status"
            >
              progress_activity
            </span>
          </div>
        )}

        {/* Connecting State */}
        {isConnecting && (
          <div className="flex flex-col items-center justify-center py-8">
            <span
              className="material-symbols-outlined animate-spin text-primary-600 text-4xl mb-4"
              aria-label="Connecting"
              role="status"
            >
              progress_activity
            </span>
            <p className="text-slate-600 font-medium">Connecting to GitHub...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && !isConnecting && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-lg mb-4">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        {/* Connected State */}
        {!isLoading && !isConnecting && connectionStatus.connected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-[24px]">check_circle</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Connected as @{connectionStatus.github_username}</span>
                  <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Active
                  </span>
                </div>
                {connectionStatus.connected_at && (
                  <p className="text-sm text-slate-600 mt-1">
                    Connected on {formatDate(connectionStatus.connected_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Connected Account Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-500 text-[20px]">person</span>
                  <div>
                    <p className="text-sm text-slate-500">GitHub Username</p>
                    <p className="font-medium text-slate-900">@{connectionStatus.github_username}</p>
                  </div>
                </div>
              </div>

              {connectionStatus.github_user_id && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-500 text-[20px]">badge</span>
                    <div>
                      <p className="text-sm text-slate-500">GitHub User ID</p>
                      <p className="font-mono text-sm text-slate-900">{connectionStatus.github_user_id}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Disconnect Button */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={handleDisconnectGitHub}
                disabled={isDisconnecting}
                className="px-5 py-2 rounded-lg border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDisconnecting ? (
                  <>
                    <span
                      className="material-symbols-outlined animate-spin text-[18px]"
                      aria-label="Disconnecting"
                      role="status"
                    >
                      progress_activity
                    </span>
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">link_off</span>
                    Disconnect GitHub
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Not Connected State */}
        {!isLoading && !isConnecting && !connectionStatus.connected && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <h4 className="font-bold text-slate-900 mb-2">Connect your GitHub account</h4>
              <p className="text-slate-500 text-sm mb-4">
                Link your GitHub account to import your projects, repositories, and contributions to your resume.
              </p>
              <button
                onClick={handleConnectGitHub}
                disabled={isConnecting}
                className="px-6 py-3 rounded-lg bg-[#24292e] text-white font-bold text-sm hover:bg-[#3c444d] transition-colors shadow-lg flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                {isConnecting ? 'Connecting...' : 'Connect with GitHub'}
              </button>
            </div>

            {/* Benefits List */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h5 className="font-bold text-slate-900 text-sm mb-3">What you can do with GitHub connected:</h5>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="material-symbols-outlined text-primary-600 text-[18px] mt-0.5">check</span>
                  Import repositories to your resume
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="material-symbols-outlined text-primary-600 text-[18px] mt-0.5">check</span>
                  Add contribution graphs and activity stats
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="material-symbols-outlined text-primary-600 text-[18px] mt-0.5">check</span>
                  Showcase your open source projects
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="material-symbols-outlined text-primary-600 text-[18px] mt-0.5">check</span>
                  Link directly to your GitHub profile
                </li>
              </ul>
            </div>

            {/* Security Note */}
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50 p-3 rounded-lg">
              <span className="material-symbols-outlined text-blue-600 text-[16px] mt-0.5">info</span>
              <p>
                We only request read access to your public profile and email. Your data is securely stored and never shared with third parties.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default GitHubSettings;
