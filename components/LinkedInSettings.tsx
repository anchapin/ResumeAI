import React, { useState, useEffect, memo } from 'react';
import { LinkedInProfile } from '../types';
import { importLinkedInProfile, disconnectLinkedIn } from '../utils/api-client';
import { toast } from 'react-toastify';

// LinkedIn brand colors
const LINKEDIN_BRAND_PRIMARY = '#0077b5';
const LINKEDIN_BRAND_HOVER = '#006097';

/**
 * LinkedIn Connection Settings Component
 *
 * Displays LinkedIn connection status, profile info, and disconnect functionality
 */
export const LinkedInSettings: React.FC = memo(() => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    setIsLoading(true);
    try {
      const linkedInProfile = await importLinkedInProfile();
      setProfile(linkedInProfile);
      setIsConnected(true);
    } catch (error) {
      // User is not connected to LinkedIn
      setProfile(null);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect your LinkedIn account? This will revoke access to your profile data.',
      )
    ) {
      return;
    }

    setIsDisconnecting(true);
    try {
      await disconnectLinkedIn();
      setIsConnected(false);
      setProfile(null);
      toast.success('LinkedIn account disconnected successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect LinkedIn');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
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
        <h3 className="text-lg font-bold text-slate-900">LinkedIn Connection</h3>
        <p className="text-sm text-slate-500">Manage your LinkedIn profile integration</p>
      </div>
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="material-symbols-outlined animate-spin text-primary-600 text-3xl">
              progress_activity
            </span>
          </div>
        ) : !isConnected ? (
          <div className="text-center py-8">
            <div
              style={{ background: `${LINKEDIN_BRAND_PRIMARY}10` }}
              className="size-16 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <span
                style={{ color: LINKEDIN_BRAND_PRIMARY }}
                className="material-symbols-outlined text-3xl"
              >
                link_off
              </span>
            </div>
            <p className="text-slate-500 font-medium mb-2">Not connected to LinkedIn</p>
            <p className="text-sm text-slate-400 mb-4">
              Connect your LinkedIn account to import your profile data and sync your experience
            </p>
            <button
              style={{ backgroundColor: LINKEDIN_BRAND_PRIMARY }}
              className="px-4 py-2 rounded-lg text-white font-bold text-sm transition-colors flex items-center gap-2 mx-auto"
              aria-label="Connect with LinkedIn"
            >
              <span className="material-symbols-outlined text-[18px]">link</span>
              Connect with LinkedIn
            </button>
            <p className="text-xs text-slate-400 mt-4">
              You can also connect from the Editor using the "Import from LinkedIn" button
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-600 text-2xl">
                  check_circle
                </span>
                <div>
                  <p className="font-bold text-green-900">Connected</p>
                  <p className="text-sm text-green-700">Your LinkedIn account is linked</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDisconnecting && (
                  <span className="material-symbols-outlined animate-spin text-[16px]">
                    progress_activity
                  </span>
                )}
                Disconnect
              </button>
            </div>

            {/* Profile Summary */}
            {profile && (
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900">Profile Summary</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Name</p>
                    <p className="font-medium text-slate-900">
                      {profile.fullName ||
                        `${profile.firstName || ''} ${profile.lastName || ''}`.trim()}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Headline</p>
                    <p className="font-medium text-slate-900">
                      {profile.headline || 'Not specified'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Email</p>
                    <p className="font-medium text-slate-900">{profile.email || 'Not specified'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Location</p>
                    <p className="font-medium text-slate-900">
                      {profile.location || 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Experience Summary */}
                {profile.experience && profile.experience.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                      Experience
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {profile.experience.slice(0, 3).map((exp, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-[16px] mt-0.5">
                            work
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">{exp.title}</p>
                            <p className="text-sm text-slate-600">{exp.company}</p>
                          </div>
                        </div>
                      ))}
                      {profile.experience.length > 3 && (
                        <p className="text-xs text-slate-500">
                          +{profile.experience.length - 3} more positions
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Education Summary */}
                {profile.education && profile.education.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Education</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {profile.education.slice(0, 3).map((edu, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-[16px] mt-0.5">
                            school
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">{edu.institution}</p>
                            <p className="text-sm text-slate-600">
                              {edu.degree} in {edu.field}
                            </p>
                          </div>
                        </div>
                      ))}
                      {profile.education.length > 3 && (
                        <p className="text-xs text-slate-500">
                          +{profile.education.length - 3} more education entries
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Skills Summary */}
                {profile.skills && profile.skills.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                      Skills ({profile.skills.length})
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {profile.skills.slice(0, 10).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600"
                        >
                          {skill}
                        </span>
                      ))}
                      {profile.skills.length > 10 && (
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-medium text-slate-500">
                          +{profile.skills.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Connected Date */}
                {profile.connectedAt && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    Connected on {formatDate(profile.connectedAt)}
                  </div>
                )}
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={checkConnectionStatus}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh Connection
            </button>
          </div>
        )}
      </div>
    </section>
  );
});

export default LinkedInSettings;
