import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { toast } from 'react-toastify';
import GitHubSettings from '../components/GitHubSettings';
import { LinkedInSettings } from '../components/LinkedInSettings';

/** Mock usage data - in production this would come from the API */
interface UsageData {
  period: string;
  pdfGenerations: number;
  aiTailoring: number;
  variantsGenerated: number;
  totalRequests: number;
}

/** API Key interfaces */
interface APIKeyInfo {
  id: number;
  key_prefix: string;
  name: string;
  description?: string;
  created_at: string;
  last_used?: string;
  is_active: boolean;
  is_revoked: boolean;
  request_count: number;
  rate_limit: string;
  rate_limit_daily: number;
  expires_at?: string;
}

interface APIKeyCreateResponse {
  id: number;
  api_key: string;
  name: string;
  key_prefix: string;
  created_at: string;
  rate_limit: string;
  rate_limit_daily: number;
  expires_at?: string;
}

interface APIKeyListResponse {
  keys: APIKeyInfo[];
  total: number;
}

/** Generate mock usage history */
const generateMockUsageHistory = (): UsageData[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((period, idx) => ({
    period,
    pdfGenerations: Math.floor(Math.random() * 50) + 10,
    aiTailoring: Math.floor(Math.random() * 30) + 5,
    variantsGenerated: Math.floor(Math.random() * 20) + 5,
    totalRequests: 0,
  })).map(item => ({
    ...item,
    totalRequests: item.pdfGenerations + item.aiTailoring + item.variantsGenerated,
  })).reverse();
};

/** Mock current usage stats */
const currentUsageStats = {
  pdfGenerations: 127,
  aiTailoring: 89,
  variantsGenerated: 45,
  totalRequests: 261,
  monthlyLimit: 500,
  resetDate: 'March 1, 2026',
};

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Get JWT token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('resumeai_access_token');
}

/**
 * Fetch API keys from backend
 */
async function fetchAPIKeys(): Promise<APIKeyInfo[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api-keys`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Not authenticated');
    }
    throw new Error('Failed to fetch API keys');
  }

  const data: APIKeyListResponse = await response.json();
  return data.keys;
}

/**
 * Create a new API key
 */
async function createAPIKey(params: {
  name: string;
  description?: string;
  rate_limit?: string;
  rate_limit_daily?: number;
  expires_in_days?: number;
}): Promise<APIKeyCreateResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api-keys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create API key' }));
    throw new Error(error.detail || 'Failed to create API key');
  }

  return response.json();
}

/**
 * Revoke an API key
 */
async function revokeAPIKey(keyId: number): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api-keys/${keyId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to revoke API key' }));
    throw new Error(error.detail || 'Failed to revoke API key');
  }
}

/**
 * @component
 * @description Settings page component for managing user preferences and account settings
 * @returns {JSX.Element} The rendered settings page component
 *
 * @example
 * ```tsx
 * <Settings />
 * ```
 */
const Settings: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  // API Key state
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isApiKeySaved, setIsApiKeySaved] = useState<boolean>(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // User-specific API Keys state
  const [userApiKeys, setUserApiKeys] = useState<APIKeyInfo[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(false);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyDescription, setNewKeyDescription] = useState<string>('');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState<string>('100/minute');
  const [newKeyDailyLimit, setNewKeyDailyLimit] = useState<number>(1000);
  const [newKeyExpiresInDays, setNewKeyExpiresInDays] = useState<number | ''>('');
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Usage tracking state
  const [usageHistory] = useState<UsageData[]>(generateMockUsageHistory);
  const [usageAlertThreshold, setUsageAlertThreshold] = useState<number>(80);

  // Calculate usage percentage
  const usagePercentage = useMemo(() => {
    return Math.round((currentUsageStats.totalRequests / currentUsageStats.monthlyLimit) * 100);
  }, []);

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('RESUMEAI_API_KEY');
    if (storedKey) {
      setApiKey(storedKey);
      setIsApiKeySaved(true);
    }
  }, []);

  // Load user's API keys
  const loadUserApiKeys = useCallback(async () => {
    setIsLoadingKeys(true);
    setApiKeysError(null);
    try {
      const keys = await fetchAPIKeys();
      setUserApiKeys(keys);
    } catch (err) {
      setApiKeysError(err instanceof Error ? err.message : 'Failed to load API keys');
      setUserApiKeys([]);
    } finally {
      setIsLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    loadUserApiKeys();
  }, [loadUserApiKeys]);

  // Handle API key save
  const handleSaveApiKey = () => {
    setApiKeyError(null);

    // Basic validation
    if (!apiKey.trim()) {
      setApiKeyError('API key is required');
      return;
    }

    if (apiKey.length < 10) {
      setApiKeyError('API key seems too short. Please check and try again.');
      return;
    }

    // Save to localStorage
    localStorage.setItem('RESUMEAI_API_KEY', apiKey.trim());
    setIsApiKeySaved(true);
    toast.success('API key saved successfully');
  };

  // Handle API key removal
  const handleRemoveApiKey = () => {
    localStorage.removeItem('RESUMEAI_API_KEY');
    setApiKey('');
    setIsApiKeySaved(false);
    setApiKeyError(null);
    toast.info('API key removed');
  };

  // Handle create new API key
  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setIsCreatingKey(true);
    try {
      const result = await createAPIKey({
        name: newKeyName,
        description: newKeyDescription || undefined,
        rate_limit: newKeyRateLimit,
        rate_limit_daily: newKeyDailyLimit,
        expires_in_days: typeof newKeyExpiresInDays === 'number' ? newKeyExpiresInDays : undefined,
      });
      setCreatedApiKey(result.api_key);
      setNewKeyName('');
      setNewKeyDescription('');
      setNewKeyRateLimit('100/minute');
      setNewKeyDailyLimit(1000);
      setNewKeyExpiresInDays('');
      await loadUserApiKeys();
      toast.success('API key created successfully. Copy it now - you won\'t see it again!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setIsCreatingKey(false);
    }
  };

  // Handle revoke API key
  const handleRevokeApiKey = async (keyId: number, keyPrefix: string) => {
    if (!confirm(`Are you sure you want to revoke the API key "${keyPrefix}..."? This action cannot be undone.`)) {
      return;
    }

    try {
      await revokeAPIKey(keyId);
      await loadUserApiKeys();
      toast.success('API key revoked successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  };

  // Close create modal and reset state
  const handleCloseCreateModal = () => {
    setShowCreateKeyModal(false);
    setCreatedApiKey(null);
    setNewKeyName('');
    setNewKeyDescription('');
    setNewKeyRateLimit('100/minute');
    setNewKeyDailyLimit(1000);
    setNewKeyExpiresInDays('');
  };

  // Copy API key to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success('API key copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <h2 className="text-slate-800 font-bold text-xl">Settings</h2>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
          </button>
          <div
            className="w-9 h-9 rounded-full bg-slate-200 bg-cover bg-center border border-slate-200 shadow-sm"
            style={{ backgroundImage: 'url("https://picsum.photos/100/100")' }}
          ></div>
        </div>
      </header>

      <div className="p-8 max-w-[1000px] mx-auto space-y-8">
        {/* API Key Management - Master Key */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">Master API Key</h3>
            <p className="text-sm text-slate-500">Configure the master API key for backend authentication</p>
          </div>
          <div className="p-6 space-y-4">
            {/* API Key Status Indicator */}
            <div className="flex items-center gap-2 mb-4">
              {isApiKeySaved ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  API Key Configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  API Key Not Set
                </span>
              )}
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key (e.g., rai_xxxxx...)"
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showApiKey ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Get your API key from the backend dashboard. Required for PDF generation and AI tailoring features.
              </p>
            </div>

            {/* Error Message */}
            {apiKeyError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {apiKeyError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveApiKey}
                className="px-5 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
              >
                Save API Key
              </button>
              {isApiKeySaved && (
                <button
                  onClick={handleRemoveApiKey}
                  className="px-5 py-2 rounded-lg border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors"
                >
                  Remove API Key
                </button>
              )}
            </div>
          </div>
        </section>

        {/* GitHub Connection Settings */}
        <GitHubSettings />

        {/* LinkedIn Connection Settings */}
        <LinkedInSettings />

        {/* User-Specific API Keys Management */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Your API Keys</h3>
              <p className="text-sm text-slate-500">Generate and manage personal API keys for API access</p>
            </div>
            <button
              onClick={() => setShowCreateKeyModal(true)}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New API Key
            </button>
          </div>
          <div className="p-6">
            {/* Loading State */}
            {isLoadingKeys && (
              <div className="flex items-center justify-center py-8">
                <span className="material-symbols-outlined animate-spin text-primary-600 text-3xl">progress_activity</span>
              </div>
            )}

            {/* Error State */}
            {apiKeysError && !isLoadingKeys && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-lg">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {apiKeysError}
              </div>
            )}

            {/* Empty State */}
            {!isLoadingKeys && !apiKeysError && userApiKeys.length === 0 && (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">key</span>
                <p className="text-slate-500 font-medium mb-2">No API keys yet</p>
                <p className="text-slate-400 text-sm mb-4">Create your first API key to access the API</p>
                <button
                  onClick={() => setShowCreateKeyModal(true)}
                  className="px-4 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors"
                >
                  Create API Key
                </button>
              </div>
            )}

            {/* API Keys List */}
            {!isLoadingKeys && userApiKeys.length > 0 && (
              <div className="space-y-3">
                {userApiKeys.map((key) => (
                  <div
                    key={key.id}
                    className={`p-4 rounded-lg border ${
                      key.is_revoked || !key.is_active
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-slate-200 hover:border-primary-300'
                    } transition-colors`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                            {key.key_prefix}...
                          </span>
                          <span className="text-sm font-bold text-slate-900">{key.name}</span>
                          {key.is_revoked ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              Revoked
                            </span>
                          ) : !key.is_active ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                              Inactive
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        {key.description && (
                          <p className="text-sm text-slate-500 mb-2">{key.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            Created {formatDate(key.created_at)}
                          </span>
                          {key.last_used && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">history</span>
                              Last used {formatDate(key.last_used)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">analytics</span>
                            {key.request_count} requests
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span>Rate: {key.rate_limit}</span>
                          <span>Daily: {key.rate_limit_daily}</span>
                          {key.expires_at && (
                            <span className="text-amber-600">
                              Expires {formatDate(key.expires_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      {!key.is_revoked && key.is_active && (
                        <button
                          onClick={() => handleRevokeApiKey(key.id, key.key_prefix)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 font-medium text-xs hover:bg-red-50 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">block</span>
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Profile Settings */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">Profile Information</h3>
            <p className="text-sm text-slate-500">Update your personal details and public profile</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-slate-200 bg-cover bg-center border border-slate-200 shadow-sm flex-shrink-0 relative group cursor-pointer" style={{ backgroundImage: 'url("https://picsum.photos/100/100")' }}>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <span className="material-symbols-outlined">edit</span>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">First Name</label>
                    <input
                      type="text"
                      defaultValue="Alex"
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Last Name</label>
                    <input
                      type="text"
                      defaultValue="Rivera"
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    defaultValue="alex.rivera@example.com"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                  />
                </div>
                <div className="pt-2">
                    <button className="px-5 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20">
                        Save Changes
                    </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">App Preferences</h3>
            <p className="text-sm text-slate-500">Manage your workspace and notification settings</p>
          </div>
          <div className="p-6 divide-y divide-slate-100">
            <div className="flex items-center justify-between py-4 first:pt-0">
                <div>
                    <h4 className="text-sm font-bold text-slate-900">Email Notifications</h4>
                    <p className="text-sm text-slate-500">Receive updates about your job applications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
            </div>
            <div className="flex items-center justify-between py-4">
                <div>
                    <h4 className="text-sm font-bold text-slate-900">Dark Mode</h4>
                    <p className="text-sm text-slate-500">Switch between light and dark themes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isDark}
                      onChange={toggleTheme}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
            </div>
             <div className="flex items-center justify-between py-4 last:pb-0">
                <div>
                    <h4 className="text-sm font-bold text-slate-900">Auto-Save</h4>
                    <p className="text-sm text-slate-500">Automatically save changes in the editor</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
            </div>
          </div>
        </section>

        {/* Usage Tracking Dashboard */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">Usage & Limits</h3>
            <p className="text-sm text-slate-500">Track your API usage and manage limits</p>
          </div>
          <div className="p-6 space-y-6">
            {/* Current Usage Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-primary-600">{currentUsageStats.pdfGenerations}</div>
                <div className="text-sm text-slate-500 mt-1">PDF Generations</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-amber-600">{currentUsageStats.aiTailoring}</div>
                <div className="text-sm text-slate-500 mt-1">AI Tailoring</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{currentUsageStats.variantsGenerated}</div>
                <div className="text-sm text-slate-500 mt-1">Variants Generated</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-slate-700">{currentUsageStats.totalRequests}</div>
                <div className="text-sm text-slate-500 mt-1">Total Requests</div>
              </div>
            </div>

            {/* Usage Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Monthly Usage</span>
                <span className="text-slate-500">
                  {currentUsageStats.totalRequests} / {currentUsageStats.monthlyLimit} requests ({usagePercentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePercentage >= 90 ? 'bg-red-500' :
                    usagePercentage >= 70 ? 'bg-amber-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500">
                Usage resets on {currentUsageStats.resetDate}
              </p>
            </div>

            {/* Usage Alert Threshold */}
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Usage Alert Threshold</h4>
                <p className="text-sm text-slate-500">Get notified when usage exceeds this percentage</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={usageAlertThreshold}
                  onChange={(e) => setUsageAlertThreshold(Number(e.target.value))}
                  className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-bold text-slate-700 w-12 text-right">{usageAlertThreshold}%</span>
              </div>
            </div>

            {/* Usage History Chart */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 mb-4">Usage History (Last 6 Months)</h4>
              <div className="h-40 flex items-end gap-2">
                {usageHistory.map((month, idx) => {
                  const maxRequests = Math.max(...usageHistory.map(m => m.totalRequests));
                  const heightPercent = maxRequests > 0 ? (month.totalRequests / maxRequests) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-primary-100 rounded-t-lg relative group" style={{ height: `${heightPercent}%`, minHeight: '8px' }}>
                        <div className="absolute bottom-0 left-0 right-0 bg-primary-500 rounded-t-lg" style={{ height: '100%' }}></div>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {month.totalRequests} requests
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{month.period}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary-500 rounded"></div>
                  <span className="text-xs text-slate-500">Total Requests</span>
                </div>
              </div>
            </div>

            {/* Export Usage Report */}
            <div className="pt-4 border-t border-slate-100">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export Usage Report
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-red-50 bg-red-50/30">
            <h3 className="text-lg font-bold text-red-700">Danger Zone</h3>
            <p className="text-sm text-red-600/70">Irreversible actions for your account</p>
          </div>
          <div className="p-6">
             <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-bold text-slate-900">Delete Account</h4>
                    <p className="text-sm text-slate-500">Permanently remove your data and all resumes</p>
                </div>
                <button className="px-5 py-2 rounded-lg border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors">
                    Delete Account
                </button>
            </div>
          </div>
        </section>
      </div>

      {/* Create API Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900">
                {createdApiKey ? 'API Key Created' : 'Create New API Key'}
              </h3>
              <button
                onClick={handleCloseCreateModal}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {createdApiKey ? (
                /* Success State - Show the created key */
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg">
                    <span className="material-symbols-outlined">check_circle</span>
                    <span className="font-medium">API key created successfully!</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Your API Key</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={createdApiKey}
                        readOnly
                        className="w-full px-4 py-3 pr-24 rounded-lg border border-slate-300 bg-slate-50 font-mono text-sm text-slate-900"
                      />
                      <button
                        onClick={() => copyToClipboard(createdApiKey)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1 ${
                          isCopied
                            ? 'bg-green-100 text-green-700'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <span className="material-symbols-outlined text-[14px]">
                              check
                            </span>
                            <span>Copied</span>
                          </>
                        ) : (
                          'Copy'
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded">
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      <span>Store this key securely. You won't be able to see it again!</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCloseCreateModal}
                    className="w-full px-4 py-3 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Form State */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Name *</label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Development Key, Production Key"
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                      maxLength={100}
                    />
                    <p className="text-xs text-slate-500">A descriptive name to identify this key</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Description (optional)</label>
                    <textarea
                      value={newKeyDescription}
                      onChange={(e) => setNewKeyDescription(e.target.value)}
                      placeholder="Describe what this key is for..."
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 resize-none"
                      rows={2}
                      maxLength={500}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Rate Limit</label>
                      <select
                        value={newKeyRateLimit}
                        onChange={(e) => setNewKeyRateLimit(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 bg-white"
                      >
                        <option value="50/minute">50/minute</option>
                        <option value="100/minute">100/minute</option>
                        <option value="200/minute">200/minute</option>
                        <option value="500/minute">500/minute</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Daily Limit</label>
                      <input
                        type="number"
                        value={newKeyDailyLimit}
                        onChange={(e) => setNewKeyDailyLimit(Number(e.target.value))}
                        min={10}
                        max={100000}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Expiration (optional)</label>
                    <select
                      value={newKeyExpiresInDays === '' ? '' : String(newKeyExpiresInDays)}
                      onChange={(e) => setNewKeyExpiresInDays(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 bg-white"
                    >
                      <option value="">Never expires</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="180">180 days</option>
                      <option value="365">1 year</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      onClick={handleCloseCreateModal}
                      className="flex-1 px-4 py-3 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateApiKey}
                      disabled={isCreatingKey || !newKeyName.trim()}
                      className="flex-1 px-4 py-3 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isCreatingKey && (
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      )}
                      {isCreatingKey ? 'Creating...' : 'Create API Key'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
