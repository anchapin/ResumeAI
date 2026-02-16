import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';

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
  
  // Load API key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('RESUMEAI_API_KEY');
    if (storedKey) {
      setApiKey(storedKey);
      setIsApiKeySaved(true);
    }
  }, []);
  
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
  };
  
  // Handle API key removal
  const handleRemoveApiKey = () => {
    localStorage.removeItem('RESUMEAI_API_KEY');
    setApiKey('');
    setIsApiKeySaved(false);
    setApiKeyError(null);
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
        {/* API Key Management */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">API Key Configuration</h3>
            <p className="text-sm text-slate-500">Manage your API key for backend authentication</p>
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
                  placeholder="Enter your API key (e.g., resume-api-xxxxx)"
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
    </div>
  );
};

export default Settings;
