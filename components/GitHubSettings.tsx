import React, { useState, useEffect } from 'react';
import {
  GitHubConnectionStatus,
} from '../types';
import {
  getGitHubConnectionStatus,
  disconnectGitHub,
  getGitHubOAuthUrl,
} from '../utils/api-client';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface GitHubSettingsProps {
  onConnectionChange?: (status: GitHubConnectionStatus) => void;
}

/**
 * GitHub Settings component for managing GitHub OAuth connection
 *
 * @component
 * @description Provides UI for connecting/disconnecting GitHub account and viewing connection status
 * @param {GitHubSettingsProps} props - Component props
 * @returns {JSX.Element} The rendered GitHub settings component
 *
 * @example
 * ```tsx
 * <GitHubSettings onConnectionChange={(status) => console.log(status)} />
 * ```
 */
const GitHubSettings: React.FC<GitHubSettingsProps> = ({ onConnectionChange }) => {
  // State for connection status
  const [connectionStatus, setConnectionStatus] = useState<GitHubConnectionStatus>({
    connected: false,
    auth_mode: 'none',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check for OAuth callback on mount
  useEffect(() => {
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
  }, []);

  // Fetch connection status
  const fetchConnectionStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await getGitHubConnectionStatus();
      setConnectionStatus(status);
      onConnectionChange?.(status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check GitHub connection status';
      setError(errorMessage);
      console.error('Error fetching GitHub connection status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle GitHub OAuth connection
  const handleConnect = () => {
    try {
      const oauthUrl = getGitHubOAuthUrl();
      // Redirect to OAuth endpoint
      window.location.href = oauthUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate GitHub OAuth flow';
      showErrorToast(errorMessage);
      console.error('Error initiating GitHub OAuth:', err);
    }
  };

  // Handle GitHub disconnection
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account? This will revoke access to your repositories.')) {
      return;
    }

    try {
      setDisconnecting(true);
      setError(null);

      await disconnectGitHub();

      setConnectionStatus({
        connected: false,
        auth_mode: 'none',
      });

      onConnectionChange?.({
        connected: false,
        auth_mode: 'none',
      });

      showSuccessToast('GitHub disconnected successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect GitHub';
      setError(errorMessage);
      showErrorToast(errorMessage);
      console.error('Error disconnecting GitHub:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-lg font-bold text-slate-900">GitHub Integration</h3>
        <p className="text-sm text-slate-500">Connect your GitHub account to sync your projects</p>
      </div>

      <div className="p-6 space-y-4">
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2 mb-4">
          {loading ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
              <span className="material-symbols-outlined text-[16px] animate-spin">
                progress_activity
              </span>
              Checking status...
            </span>
          ) : connectionStatus.connected ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Connected as {connectionStatus.username}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
              <span className="material-symbols-outlined text-[16px]">link_off</span>
              Not Connected
            </span>
          )}
        </div>

        {/* Auth Mode Badge */}
        {!loading && connectionStatus.auth_mode !== 'none' && (
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium uppercase tracking-wide">
              {connectionStatus.auth_mode === 'oauth' ? 'OAuth' : 'CLI'}
            </span>
            {connectionStatus.auth_mode === 'cli' && (
              <span className="text-xs text-slate-500">
                CLI mode enabled. Use the CLI tool for GitHub operations.
              </span>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="material-symbols-outlined text-red-600 text-[20px] mt-0.5">
              error
            </span>
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">Connection Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Connection Details */}
        {connectionStatus.connected && !loading && (
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Username</span>
              <span className="font-medium text-slate-900">{connectionStatus.username || 'N/A'}</span>
            </div>

            {connectionStatus.scopes && connectionStatus.scopes.length > 0 && (
              <div className="text-sm">
                <span className="text-slate-600">Permissions: </span>
                <span className="font-medium text-slate-900">
                  {connectionStatus.scopes.join(', ')}
                </span>
              </div>
            )}

            {connectionStatus.last_synced_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Last synced</span>
                <span className="font-medium text-slate-900">
                  {new Date(connectionStatus.last_synced_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          {!connectionStatus.connected && !loading ? (
            <button
              onClick={handleConnect}
              className="px-5 py-2.5 rounded-lg bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_link</span>
              Connect GitHub
            </button>
          ) : connectionStatus.connected && !loading ? (
            <>
              <button
                onClick={fetchConnectionStatus}
                disabled={disconnecting}
                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Refresh Status
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-5 py-2.5 rounded-lg border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {disconnecting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">link_off</span>
                    Disconnect
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              disabled
              className="px-5 py-2.5 rounded-lg bg-slate-200 text-slate-400 font-bold text-sm cursor-not-allowed"
            >
              Loading...
            </button>
          )}
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="material-symbols-outlined text-blue-600 text-[20px]">
            info
          </span>
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-medium">About GitHub Integration</p>
            <p className="text-sm text-blue-800 mt-1">
              Connect your GitHub account to import your repositories as projects in your resume.
              We use OAuth 2.0 for secure authentication and only request the necessary permissions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GitHubSettings;
