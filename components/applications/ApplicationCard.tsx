/**
 * ApplicationCard Component
 * 
 * Displays a single job application.
 * 
 * @example
 * <ApplicationCard
 *   application={application}
 *   onStatusChange={handleStatusChange}
 * />
 */

import React, { useState } from 'react';
import type { JobApplication, ApplicationStatus } from '../../types/applications';

export interface ApplicationCardProps {
  application: JobApplication;
  onClick?: () => void;
  onStatusChange?: (status: ApplicationStatus) => void;
  onDelete?: () => void;
}

// Status color coding
const STATUS_COLORS: Record<ApplicationStatus, string> = {
  draft: '#6c757d',
  applied: '#007bff',
  screening: '#17a2b8',
  interviewing: '#ffc107',
  offer: '#28a745',
  accepted: '#28a745',
  rejected: '#dc3545',
  withdrawn: '#6c757d',
  archived: '#6c757d',
};

// Status labels
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  applied: 'Applied',
  screening: 'Screening',
  interviewing: 'Interviewing',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  archived: 'Archived',
};

export function ApplicationCard({
  application,
  onClick,
  onStatusChange,
  onDelete,
}: ApplicationCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  /**
   * Handle status select.
   */
  const handleStatusSelect = (status: ApplicationStatus) => {
    onStatusChange?.(status);
    setShowStatusMenu(false);
  };

  /**
   * Format date.
   */
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        e.currentTarget.style.borderColor = '#007bff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#e0e0e0';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#333' }}>
            Job #{application.jobId}
          </h3>
          <div style={{ fontSize: '13px', color: '#666' }}>
            {application.externalSource ? `via ${application.externalSource}` : 'Direct Application'}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowStatusMenu(!showStatusMenu);
            }}
            style={{
              padding: '4px 12px',
              backgroundColor: STATUS_COLORS[application.status] + '20',
              color: STATUS_COLORS[application.status],
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {STATUS_LABELS[application.status]} ▼
          </button>

          {/* Status Menu */}
          {showStatusMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 100,
                minWidth: '150px',
              }}
            >
              {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusSelect(status);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: application.status === status ? STATUS_COLORS[status] + '20' : 'white',
                    color: STATUS_COLORS[status],
                    border: 'none',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meta Info */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666', marginBottom: '12px' }}>
        <span>📅 Applied: {formatDate(application.submittedAt)}</span>
        {application.responseTimeDays && (
          <span>⏱️ Response: {application.responseTimeDays} days</span>
        )}
        <span>📊 Days in status: {application.daysInStatus}</span>
      </div>

      {/* Notes Preview */}
      {application.notes && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#666',
            marginBottom: '12px',
          }}
        >
          <strong>Notes:</strong> {application.notes.substring(0, 100)}
          {application.notes.length > 100 && '...'}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ fontSize: '12px', color: '#999' }}>
          {application.autofilled && '✨ Auto-filled'}
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              padding: '4px 12px',
              backgroundColor: 'white',
              color: '#dc3545',
              border: '1px solid #dc3545',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default ApplicationCard;
