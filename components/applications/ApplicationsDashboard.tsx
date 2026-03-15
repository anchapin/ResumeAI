/**
 * ApplicationsDashboard Component
 * 
 * Main dashboard for viewing and managing applications.
 * 
 * @example
 * <ApplicationsDashboard
 *   onApplicationSelect={handleSelect}
 * />
 */

import React, { useState } from 'react';
import { useApplications } from '../../src/hooks/useApplications';
import { ApplicationCard } from './ApplicationCard';
import type { JobApplication, ApplicationStatus, ApplicationsFilters } from '../../types/applications';

export interface ApplicationsDashboardProps {
  onApplicationSelect?: (app: JobApplication) => void;
}

export function ApplicationsDashboard({ onApplicationSelect }: ApplicationsDashboardProps) {
  const {
    applications,
    isLoading,
    error,
    total,
    fetchApplications,
    deleteApplication,
    updateStatus,
  } = useApplications();

  const [filters, setFilters] = useState<ApplicationsFilters>({});
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');

  /**
   * Handle status filter change.
   */
  const handleStatusFilter = (status: ApplicationStatus | '') => {
    setStatusFilter(status);
    const newFilters = status ? { ...filters, status } : filters;
    if (!status) delete newFilters.status;
    setFilters(newFilters);
    fetchApplications(newFilters);
  };

  /**
   * Handle delete.
   */
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      await deleteApplication(id);
    }
  };

  /**
   * Handle status change.
   */
  const handleStatusChange = async (id: number, status: ApplicationStatus) => {
    await updateStatus(id, status);
  };

  if (isLoading && applications.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#666' }}>
        Loading applications...
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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#333' }}>
            My Applications
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            {total} application{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <FilterButton
          label="All"
          active={statusFilter === ''}
          onClick={() => handleStatusFilter('')}
        />
        <FilterButton
          label="Applied"
          active={statusFilter === 'applied'}
          onClick={() => handleStatusFilter('applied')}
        />
        <FilterButton
          label="Interviewing"
          active={statusFilter === 'interviewing'}
          onClick={() => handleStatusFilter('interviewing')}
        />
        <FilterButton
          label="Offers"
          active={statusFilter === 'offer'}
          onClick={() => handleStatusFilter('offer')}
        />
        <FilterButton
          label="Rejected"
          active={statusFilter === 'rejected'}
          onClick={() => handleStatusFilter('rejected')}
        />
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            color: '#666',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            No applications yet
          </div>
          <div style={{ fontSize: '14px' }}>
            Track your job applications to stay organized
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onClick={() => onApplicationSelect?.(app)}
              onStatusChange={(status) => handleStatusChange(app.id, status)}
              onDelete={() => handleDelete(app.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterButton({ label, active, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        backgroundColor: active ? '#007bff' : 'white',
        color: active ? 'white' : '#666',
        border: `1px solid ${active ? '#007bff' : '#ddd'}`,
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: active ? 600 : 400,
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = active ? '#0056b3' : '#f5f5f5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = active ? '#007bff' : 'white';
      }}
    >
      {label}
    </button>
  );
}

export default ApplicationsDashboard;
