/**
 * useJobSearch Hook
 * 
 * Hook for searching jobs with filters and pagination.
 * 
 * @example
 * const {
 *   jobs,
 *   isLoading,
 *   search,
 *   loadMore,
 * } = useJobSearch();
 */

import { useCallback, useState, useRef } from 'react';
import { searchJobs } from '../../utils/jobs-api';
import type { JobPosting, JobSearchFilters, UseJobSearchReturn } from '../../types/jobs';

export function useJobSearch(initialFilters: JobSearchFilters = {}): UseJobSearchReturn {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState<JobSearchFilters>(initialFilters);

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Search for jobs.
   */
  const search = useCallback(async (newFilters: JobSearchFilters) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);
    setFilters(newFilters);

    try {
      const response = await searchJobs(
        { ...newFilters, offset: 0 },
        abortControllerRef.current.signal
      );

      setJobs(response.jobs);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        setError(error.message || 'Failed to search jobs');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load more jobs (pagination).
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    const nextOffset = filters.offset || 0 + (filters.limit || 50);

    try {
      const response = await searchJobs({
        ...filters,
        offset: nextOffset,
      });

      setJobs((prev) => [...prev, ...response.jobs]);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to load more jobs');
    }
  }, [filters, hasMore, isLoading]);

  return {
    jobs,
    isLoading,
    error,
    total,
    hasMore,
    search,
    loadMore,
  };
}

export default useJobSearch;
