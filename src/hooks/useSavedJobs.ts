/**
 * useSavedJobs Hook
 * 
 * Hook for managing saved jobs.
 * 
 * @example
 * const {
 *   savedJobs,
 *   saveJob,
 *   removeJob,
 * } = useSavedJobs();
 */

import { useCallback, useState, useEffect } from 'react';
import {
  getSavedJobs,
  saveJob as saveJobApi,
  removeSavedJob as removeJobApi,
} from '../../utils/jobs-api';
import type { SavedJob, UseSavedJobsReturn } from '../../types/jobs';

export function useSavedJobs(): UseSavedJobsReturn {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch saved jobs.
   */
  const fetchSaved = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getSavedJobs();
      setSavedJobs(response.savedJobs);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to fetch saved jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save a job.
   */
  const saveJob = useCallback(async (jobId: string, notes?: string) => {
    try {
      const result = await saveJobApi(jobId, notes);
      
      // Optimistic update
      setSavedJobs((prev) => [
        ...prev,
        {
          id: result.savedJobId,
          jobId,
          savedAt: new Date().toISOString(),
          notes: notes || undefined,
          status: 'saved',
          job: {} as any, // Would fetch job details
        },
      ]);
    } catch (err) {
      const error = err as Error;
      throw error;
    }
  }, []);

  /**
   * Remove a saved job.
   */
  const removeJob = useCallback(async (savedId: number) => {
    try {
      await removeJobApi(savedId);
      
      // Optimistic update
      setSavedJobs((prev) => prev.filter((job) => job.id !== savedId));
    } catch (err) {
      const error = err as Error;
      throw error;
    }
  }, []);

  /**
   * Update notes for a saved job.
   */
  const updateNotes = useCallback(async (savedId: number, notes: string) => {
    // Would need an API endpoint for this
    // For now, optimistic update
    setSavedJobs((prev) =>
      prev.map((job) =>
        job.id === savedId ? { ...job, notes } : job
      )
    );
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  return {
    savedJobs,
    isLoading,
    error,
    fetchSaved,
    saveJob,
    removeJob,
    updateNotes,
  };
}

export default useSavedJobs;
