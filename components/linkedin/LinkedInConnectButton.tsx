/**
 * LinkedInConnectButton Component
 * 
 * Button to connect/disconnect LinkedIn account.
 * Uses official LinkedIn branding.
 * 
 * @example
 * <LinkedInConnectButton
 *   onConnect={handleConnect}
 *   onDisconnect={handleDisconnect}
 * />
 */

import React from 'react';
import { useLinkedInOAuth } from '../../src/hooks/useLinkedInOAuth';

export interface LinkedInConnectButtonProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
  disabled?: boolean;
}

export function LinkedInConnectButton({
  onConnect,
  onDisconnect,
  disabled,
}: LinkedInConnectButtonProps) {
  const { isConnecting, isConnected, initiateOAuth, disconnect, error } = useLinkedInOAuth();

  const handleConnect = async () => {
    try {
      await initiateOAuth();
      onConnect?.();
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect LinkedIn?')) {
      try {
        await disconnect();
        onDisconnect?.();
      } catch (err) {
        // Error handled by hook
      }
    }
  };

  if (isConnected) {
    return (
      <button
        onClick={handleDisconnect}
        disabled={isConnecting || disabled}
        style={{
          padding: '10px 20px',
          backgroundColor: '#f5f5f5',
          color: '#666',
          border: '1px solid #ddd',
          borderRadius: '6px',
          cursor: isConnecting || disabled ? 'not-allowed' : 'pointer',
          opacity: isConnecting || disabled ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        {isConnecting ? (
          <>
            <LoadingSpinner />
            Disconnecting...
          </>
        ) : (
          <>
            <LinkedInIcon />
            Disconnect LinkedIn
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting || disabled}
      style={{
        padding: '10px 20px',
        backgroundColor: '#0077b5',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: isConnecting || disabled ? 'not-allowed' : 'pointer',
        opacity: isConnecting || disabled ? 0.6 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: 600,
      }}
    >
      {isConnecting ? (
        <>
          <LoadingSpinner />
          Connecting...
        </>
      ) : (
        <>
          <LinkedInIcon />
          Connect with LinkedIn
        </>
      )}
      {error && (
        <span style={{ color: '#f44336', fontSize: '12px', marginLeft: '8px' }}>
          {error}
        </span>
      )}
    </button>
  );
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      style={{ animation: 'spin 1s linear infinite' }}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"/>
    </svg>
  );
}

export default LinkedInConnectButton;
