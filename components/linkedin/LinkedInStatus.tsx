/**
 * LinkedInStatus Component
 * 
 * Displays LinkedIn connection status.
 * 
 * @example
 * <LinkedInStatus connection={connection} />
 */

import React from 'react';
import type { LinkedInConnection } from '../../types/linkedin';

export interface LinkedInStatusProps {
  connection: LinkedInConnection;
  onRefresh?: () => void;
}

export function LinkedInStatus({ connection, onRefresh }: LinkedInStatusProps) {
  if (!connection.isConnected) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <StatusIcon status="disconnected" />
        <div>
          <div style={{ fontWeight: 600, color: '#666' }}>
            Not connected to LinkedIn
          </div>
          <div style={{ fontSize: '13px', color: '#999' }}>
            Connect your LinkedIn account to import your profile
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#e8f5e9',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <StatusIcon status="connected" />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: '#2e7d32' }}>
          Connected to LinkedIn
        </div>
        <div style={{ fontSize: '13px', color: '#666' }}>
          {connection.lastSyncedAt ? (
            <>Last synced: {formatDate(connection.lastSyncedAt)}</>
          ) : (
            <>Connected: {formatDate(connection.connectedAt || '')}</>
          )}
        </div>
        {connection.scopes.length > 0 && (
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            Permissions: {connection.scopes.join(', ')}
          </div>
        )}
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          style={{
            padding: '8px 16px',
            backgroundColor: 'white',
            color: '#2e7d32',
            border: '1px solid #2e7d32',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Refresh
        </button>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: 'connected' | 'disconnected' }) {
  if (status === 'connected') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#2e7d32">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.25 17.292l-4.5-4.364 1.857-1.858 2.643 2.506 5.643-5.784 1.857 1.857-7.5 7.643z"/>
      </svg>
    );
  }

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#999">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1 17h2v-2h-2v2zm0-4h2V7h-2v6z"/>
    </svg>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default LinkedInStatus;
