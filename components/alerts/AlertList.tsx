/**
 * AlertList Component
 * 
 * Displays list of user's job alerts.
 * 
 * @example
 * <AlertList
 *   onCreateAlert={handleCreate}
 *   onEditAlert={handleEdit}
 * />
 */

import React, { useState } from 'react';
import { useAlerts } from '../../src/hooks/useAlerts';
import type { JobAlert } from '../../types/alerts';

export interface AlertListProps {
  onCreateAlert?: () => void;
  onEditAlert?: (alert: JobAlert) => void;
}

export function AlertList({ onCreateAlert, onEditAlert }: AlertListProps) {
  const { alerts, isLoading, error, pauseAlert, resumeAlert, deleteAlert } = useAlerts();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  /**
   * Handle pause/resume.
   */
  const handleToggle = async (alert: JobAlert) => {
    try {
      if (alert.isActive) {
        await pauseAlert(alert.id);
      } else {
        await resumeAlert(alert.id);
      }
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    }
  };

  /**
   * Handle delete.
   */
  const handleDelete = async (id: number) => {
    try {
      await deleteAlert(id);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  /**
   * Format frequency display.
   */
  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'instant':
        return '⚡ Instant';
      case 'daily':
        return '📅 Daily';
      case 'weekly':
        return '📆 Weekly';
      default:
        return frequency;
    }
  };

  if (isLoading && alerts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#666' }}>
        Loading alerts...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c00',
        }}
      >
        {error}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px',
          color: '#666',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
        <div style={{ fontSize: '16px', marginBottom: '8px' }}>
          No job alerts yet
        </div>
        <div style={{ fontSize: '14px', marginBottom: '16px' }}>
          Create an alert to get notified about new jobs
        </div>
        {onCreateAlert && (
          <button
            onClick={onCreateAlert}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Create Your First Alert
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
          Your Alerts ({alerts.length})
        </h2>
        {onCreateAlert && (
          <button
            onClick={onCreateAlert}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            + New Alert
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              padding: '16px',
              backgroundColor: 'white',
              border: `1px solid ${alert.isActive ? '#e0e0e0' : '#f0f0f0'}`,
              borderRadius: '8px',
              opacity: alert.isActive ? 1 : 0.7,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#333' }}>
                  {alert.name}
                </h3>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {formatFrequency(alert.frequency)}
                </div>
              </div>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: alert.isActive ? '#e8f5e9' : '#ffebee',
                  color: alert.isActive ? '#2e7d32' : '#c62828',
                }}
              >
                {alert.isActive ? 'Active' : 'Paused'}
              </span>
            </div>

            {/* Filters Summary */}
            {(alert.query || alert.remote !== undefined || alert.location) && (
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#666' }}>
                {alert.query && <span>{alert.query}</span>}
                {alert.remote && <span> • Remote only</span>}
                {alert.location && <span> • {alert.location}</span>}
                {alert.minSalary && <span> • ${alert.minSalary.toLocaleString()}+</span>}
              </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '12px', color: '#999' }}>
                {alert.lastSentAt
                  ? `Last sent: ${new Date(alert.lastSentAt).toLocaleDateString()}`
                  : 'Never sent'}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleToggle(alert)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: alert.isActive ? '#f5f5f5' : '#28a745',
                    color: alert.isActive ? '#666' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {alert.isActive ? 'Pause' : 'Resume'}
                </button>
                {onEditAlert && (
                  <button
                    onClick={() => onEditAlert(alert)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#f5f5f5',
                      color: '#666',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => setConfirmDelete(alert.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#fee',
                    color: '#c00',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Delete Confirmation */}
            {confirmDelete === alert.id && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#fee',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '13px', color: '#c00' }}>
                  Are you sure you want to delete this alert?
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#c00',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'white',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlertList;
