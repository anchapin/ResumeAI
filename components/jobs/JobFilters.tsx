/**
 * JobFilters Component
 * 
 * Search filters panel for job search.
 * 
 * @example
 * <JobFilters
 *   filters={filters}
 *   onChange={handleFilterChange}
 * />
 */

import React, { useState, useEffect } from 'react';
import type { JobSearchFilters } from '../../types/jobs';

export interface JobFiltersProps {
  filters: JobSearchFilters;
  onChange: (filters: JobSearchFilters) => void;
  onReset: () => void;
}

export function JobFilters({ filters, onChange, onReset }: JobFiltersProps) {
  const [localFilters, setLocalFilters] = useState<JobSearchFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  /**
   * Handle filter change.
   */
  const handleChange = (key: keyof JobSearchFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  /**
   * Check if filters are active.
   */
  const hasActiveFilters = () => {
    return (
      localFilters.query ||
      localFilters.remote !== undefined ||
      localFilters.location ||
      localFilters.minSalary ||
      localFilters.employmentType ||
      localFilters.experienceLevel
    );
  };

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
          Filters
        </h3>
        {hasActiveFilters() && (
          <button
            onClick={onReset}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              cursor: 'pointer',
              fontSize: '13px',
              padding: '4px 8px',
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Search Query */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#666' }}>
          Search
        </label>
        <input
          type="text"
          value={localFilters.query || ''}
          onChange={(e) => handleChange('query', e.target.value)}
          placeholder="Job title, company, skills..."
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Remote Toggle */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={localFilters.remote || false}
            onChange={(e) => handleChange('remote', e.target.checked ? true : undefined)}
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: '14px', color: '#333' }}>Remote Only</span>
        </label>
      </div>

      {/* Location */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#666' }}>
          Location
        </label>
        <input
          type="text"
          value={localFilters.location || ''}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="City, state, or country"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Min Salary */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#666' }}>
          Min Salary (USD)
        </label>
        <input
          type="number"
          value={localFilters.minSalary || ''}
          onChange={(e) => handleChange('minSalary', e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="50000"
          min="0"
          step="1000"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Employment Type */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#666' }}>
          Employment Type
        </label>
        <select
          value={localFilters.employmentType || ''}
          onChange={(e) => handleChange('employmentType', e.target.value || undefined)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
          }}
        >
          <option value="">Any</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
        </select>
      </div>

      {/* Experience Level */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#666' }}>
          Experience Level
        </label>
        <select
          value={localFilters.experienceLevel || ''}
          onChange={(e) => handleChange('experienceLevel', e.target.value || undefined)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
          }}
        >
          <option value="">Any</option>
          <option value="entry">Entry Level</option>
          <option value="mid">Mid Level</option>
          <option value="senior">Senior Level</option>
          <option value="executive">Executive</option>
        </select>
      </div>

      {/* Active Filters */}
      {hasActiveFilters() && (
        <div style={{ paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            Active Filters:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {localFilters.remote && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                borderRadius: '12px',
                fontSize: '12px',
              }}>
                Remote ✕
              </span>
            )}
            {localFilters.location && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                borderRadius: '12px',
                fontSize: '12px',
              }}>
                {localFilters.location} ✕
              </span>
            )}
            {localFilters.minSalary && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                borderRadius: '12px',
                fontSize: '12px',
              }}>
                ${localFilters.minSalary.toLocaleString()}+ ✕
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default JobFilters;
