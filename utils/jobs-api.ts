/**
 * Jobs API Client
 */

import { API_URL } from './config';
import { fetchWithRetry } from './api-client';
import type {
  JobPosting,
  JobSearchFilters,
  JobSearchResponse,
  SavedJobsResponse,
  JobSource,
} from '../types/jobs';

export interface JobsApiError {
  message: string;
  status?: number;
}

/**
 * Search for jobs.
 */
export async function searchJobs(
  filters: JobSearchFilters,
  signal?: AbortSignal
): Promise<JobSearchResponse> {
  const params = new URLSearchParams();

  if (filters.query) params.append('q', filters.query);
  if (filters.remote !== undefined) params.append('remote', String(filters.remote));
  if (filters.location) params.append('location', filters.location);
  if (filters.minSalary) params.append('min_salary', String(filters.minSalary));
  if (filters.employmentType) params.append('employment_type', filters.employmentType);
  if (filters.experienceLevel) params.append('experience_level', filters.experienceLevel);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const response = await fetchWithRetry(
    `${API_URL}/api/v1/jobs/search?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: JobsApiError = {
      message: errorData.detail || `Search failed: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  const data = await response.json();

  return {
    jobs: data.jobs,
    total: data.total,
    limit: data.limit,
    offset: data.offset,
    hasMore: data.has_more,
  };
}

/**
 * Get job recommendations.
 */
export async function getRecommendations(
  limit: number = 20,
  signal?: AbortSignal
): Promise<{ jobs: JobPosting[]; total: number }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/jobs/recommendations?limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: JobsApiError = {
      message: errorData.detail || `Failed to get recommendations: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Save a job.
 */
export async function saveJob(
  jobId: string,
  notes?: string,
  signal?: AbortSignal
): Promise<{ success: boolean; savedJobId: number }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/jobs/save`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ job_id: jobId, notes }),
      signal,
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: JobsApiError = {
      message: errorData.detail || `Failed to save job: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get saved jobs.
 */
export async function getSavedJobs(signal?: AbortSignal): Promise<SavedJobsResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/jobs/saved`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: JobsApiError = {
      message: errorData.detail || `Failed to get saved jobs: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  const data = await response.json();

  return {
    savedJobs: data.saved_jobs,
    total: data.total,
  };
}

/**
 * Remove a saved job.
 */
export async function removeSavedJob(
  savedId: number,
  signal?: AbortSignal
): Promise<{ success: boolean }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/jobs/saved/${savedId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: JobsApiError = {
      message: errorData.detail || `Failed to remove job: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get job sources.
 */
export async function getJobSources(signal?: AbortSignal): Promise<{ sources: JobSource[]; total: number }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/jobs/sources`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: JobsApiError = {
      message: errorData.detail || `Failed to get sources: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  const data = await response.json();

  return {
    sources: data.sources,
    total: data.total,
  };
}
