/**
 * useApplications Hook
 * 
 * Hook for managing job applications.
 * 
 * @example
 * const {
 *   applications,
 *   createApplication,
 *   updateStatus,
 * } = useApplications();
 */

import { useCallback, useState, useEffect } from 'react';
import {
  getApplications,
  createApplication as createApplicationApi,
  updateApplication as updateApplicationApi,
  deleteApplication as deleteApplicationApi,
  updateApplicationStatus as updateStatusApi,
} from '../../utils/applications-api';
import type {
  JobApplication,
  CreateApplicationData,
  UpdateApplicationData,
  ApplicationsFilters,
  UseApplicationsReturn,
} from '../../types/applications';

export function useApplications(initialFilters?: ApplicationsFilters): UseApplicationsReturn {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<ApplicationsFilters>(initialFilters || {});

  /**
   * Fetch applications.
   */
  const fetchApplications = useCallback(async (newFilters?: ApplicationsFilters) => {
    setIsLoading(true);
    setError(null);

    const fetchFilters = newFilters || filters;
    setFilters(fetchFilters);

    try {
      const response = await getApplications(fetchFilters);
      setApplications(response.applications);
      setTotal(response.total);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch applications');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  /**
   * Create application.
   */
  const createApplication = useCallback(async (data: CreateApplicationData): Promise<JobApplication> => {
    setIsLoading(true);
    setError(null);

    try {
      const application = await createApplicationApi(data);
      setApplications((prev) => [...prev, application]);
      setTotal((prev) => prev + 1);
      return application;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to create application');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update application.
   */
  const updateApplication = useCallback(async (id: number, data: UpdateApplicationData): Promise<JobApplication> => {
    setIsLoading(true);
    setError(null);

    try {
      const application = await updateApplicationApi(id, data);
      setApplications((prev) => prev.map((a) => (a.id === id ? application : a)));
      return application;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to update application');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete application.
   */
  const deleteApplication = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteApplicationApi(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to delete application');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update status.
   */
  const updateStatus = useCallback(async (id: number, status: string): Promise<JobApplication> => {
    setIsLoading(true);
    setError(null);

    try {
      const application = await updateStatusApi(id, status);
      setApplications((prev) => prev.map((a) => (a.id === id ? application : a)));
      return application;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to update status');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchApplications();
  }, []);

  return {
    applications,
    isLoading,
    error,
    total,
    fetchApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    updateStatus,
  };
}

export default useApplications;
