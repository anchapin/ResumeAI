/**
 * JobSearch Component
 * 
 * Main job search interface with filters and results.
 * 
 * @example
 * <JobSearch
 *   onJobSelect={handleJobSelect}
 * />
 */

import React, { useState, useCallback } from 'react';
import { useJobSearch } from '../../src/hooks/useJobSearch';
import { JobCard } from './JobCard';
import { JobFilters } from './JobFilters';
import type { JobPosting, JobSearchFilters } from '../../types/jobs';

export interface JobSearchProps {
  onJobSelect?: (job: JobPosting) => void;
  onJobSave?: (jobId: string) => void;
  initialFilters?: JobSearchFilters;
}

export function JobSearch({
  onJobSelect,
  onJobSave,
  initialFilters,
}: JobSearchProps) {
  const {
    jobs,
    isLoading,
    error,
    total,
    hasMore,
    search,
    loadMore,
  } = useJobSearch(initialFilters);

  const [filters, setFilters] = useState<JobSearchFilters>(initialFilters || {});

  /**
   * Handle filter changes.
   */
  const handleFilterChange = useCallback((newFilters: JobSearchFilters) => {
    setFilters(newFilters);
    search(newFilters);
  }, [search]);

  /**
   * Handle job select.
   */
  const handleJobClick = useCallback((job: JobPosting) => {
    onJobSelect?.(job);
  }, [onJobSelect]);

  /**
   * Handle job save.
   */
  const handleSave = useCallback((jobId: string) => {
    onJobSave?.(jobId);
  }, [onJobSave]);

  return (
    <div style={{ display: 'flex', gap: '24px', padding: '24px' }}>
      {/* Filters Sidebar */}
      <aside style={{ width: '280px', flexShrink: 0 }}>
        <JobFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={() => {
            const emptyFilters: JobSearchFilters = {};
            setFilters(emptyFilters);
            search(emptyFilters);
          }}
        />
      </aside>

      {/* Results */}
      <main style={{ flex: 1 }}>
        {/* Results Header */}
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
            {total} Jobs Found
          </h2>
          {isLoading && (
            <div style={{ color: '#666', fontSize: '14px' }}>
              Loading...
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c00',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && jobs.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px',
              color: '#666',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>
              No jobs found
            </div>
            <div style={{ fontSize: '14px' }}>
              Try adjusting your filters
            </div>
          </div>
        )}

        {/* Jobs List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onClick={() => handleJobClick(job)}
              onSave={() => handleSave(job.id)}
            />
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              onClick={loadMore}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                backgroundColor: isLoading ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {isLoading ? 'Loading...' : 'Load More Jobs'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default JobSearch;
