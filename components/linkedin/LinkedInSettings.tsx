/**
 * LinkedInSettings Component
 * 
 * LinkedIn integration settings panel.
 * 
 * @example
 * <LinkedInSettings userId={userId} />
 */

import React from 'react';
import { useLinkedInOAuth } from '../../src/hooks/useLinkedInOAuth';
import { useLinkedInProfile } from '../../src/hooks/useLinkedInProfile';
import LinkedInConnectButton from './LinkedInConnectButton';
import LinkedInStatus from './LinkedInStatus';
import ProfileImportPreview from './ProfileImportPreview';

export interface LinkedInSettingsProps {
  userId: string;
}

export function LinkedInSettings({ userId }: LinkedInSettingsProps) {
  const { isConnected, initiateOAuth, disconnect } = useLinkedInOAuth();
  const { profile, isLoading, fetchProfile, refreshProfile } = useLinkedInProfile();
  const [showImportPreview, setShowImportPreview] = React.useState(false);
  const [importSections, setImportSections] = React.useState<{
    basics: boolean;
    work: boolean;
    education: boolean;
    skills: boolean;
  } | null>(null);

  const handleConnect = async () => {
    // After connecting, fetch profile
    setTimeout(() => {
      fetchProfile();
      setShowImportPreview(true);
    }, 1000);
  };

  const handleDisconnect = () => {
    setShowImportPreview(false);
    setImportSections(null);
  };

  const handleImport = (sections: typeof importSections) => {
    setImportSections(sections);
    setShowImportPreview(false);
    // Would trigger actual import here
    console.log('Importing sections:', sections);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#333' }}>
          LinkedIn Integration
        </h2>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Connect your LinkedIn account to import your profile and sync your
          professional information.
        </p>
      </div>

      {/* Connection Status */}
      <div style={{ marginBottom: '24px' }}>
        <LinkedInConnectButton
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      </div>

      {isConnected && (
        <>
          {/* Status */}
          <div style={{ marginBottom: '24px' }}>
            <LinkedInStatus
              connection={{ isConnected: true, scopes: [] }}
              onRefresh={refreshProfile}
            />
          </div>

          {/* Profile Preview */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Loading profile...
            </div>
          )}

          {profile && !showImportPreview && (
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={() => setShowImportPreview(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0077b5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Import Profile to Resume
              </button>
            </div>
          )}

          {/* Import Preview Modal */}
          {showImportPreview && profile && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
              onClick={() => setShowImportPreview(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <ProfileImportPreview
                  profile={profile}
                  onImport={handleImport}
                  onCancel={() => setShowImportPreview(false)}
                />
              </div>
            </div>
          )}

          {/* Sync Settings */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#333' }}>
              Sync Settings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" defaultChecked />
                <span style={{ fontSize: '14px', color: '#666' }}>
                  Auto-sync profile data
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" defaultChecked />
                <span style={{ fontSize: '14px', color: '#666' }}>
                  Sync job titles and companies
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" />
                <span style={{ fontSize: '14px', color: '#666' }}>
                  Sync skills and endorsements
                </span>
              </label>
            </div>
          </div>

          {/* Privacy */}
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#fff3e0',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#e65100',
            }}
          >
            <strong>Privacy Notice:</strong> Your LinkedIn data is stored securely
            and encrypted at rest. You can disconnect your account at any time,
            which will revoke our access and remove stored tokens. Imported
            profile data remains in your resume unless manually removed.
          </div>
        </>
      )}
    </div>
  );
}

export default LinkedInSettings;
