/**
 * Applications API Client
 */

import { API_URL } from './config';
import { fetchWithRetry } from './api-client';
import {
  JobApplication,
  CreateApplicationData,
  UpdateApplicationData,
  ApplicationsFilters,
  ApplicationsListResponse,
  ApplicationStats,
  FunnelData,
  ConversionRates,
  TimeToResponse,
  AutoFillResponse,
  ApplicationStatus,
  ApplicationPriority,
} from '../types/applications';

// Re-export types for convenience
export type { 
  JobApplication, 
  CreateApplicationData, 
  UpdateApplicationData, 
  AutoFillData, 
  AutoFillResponse,
  ApplicationStatus,
  ApplicationPriority,
} from '../types/applications';

export interface ApplicationsApiError {
  message: string;
  status?: number;
}

export interface StatusConfigItem {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const STATUS_CONFIG: Record<ApplicationStatus, StatusConfigItem> = {
  draft: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-200', icon: 'file' },
  applied: { label: 'Applied', color: 'text-blue-600', bgColor: 'bg-blue-200', icon: 'send' },
  screening: { label: 'Screening', color: 'text-yellow-600', bgColor: 'bg-yellow-200', icon: 'search' },
  interviewing: { label: 'Interviewing', color: 'text-purple-600', bgColor: 'bg-purple-200', icon: 'users' },
  offer: { label: 'Offer', color: 'text-green-600', bgColor: 'bg-green-200', icon: 'check-circle' },
  accepted: { label: 'Accepted', color: 'text-green-700', bgColor: 'bg-green-300', icon: 'check' },
  rejected: { label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-200', icon: 'x' },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-500', bgColor: 'bg-gray-200', icon: 'arrow-left' },
  archived: { label: 'Archived', color: 'text-gray-400', bgColor: 'bg-gray-100', icon: 'archive' },
};

export interface PriorityConfigItem {
  label: string;
  color: string;
  bgColor: string;
}

export const PRIORITY_CONFIG: Record<ApplicationPriority, PriorityConfigItem> = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-200' },
  medium: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-200' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-200' },
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-200' },
};

/**
 * Get all applications.
 */
export async function getApplications(
  filters?: ApplicationsFilters,
  signal?: AbortSignal
): Promise<ApplicationsListResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.source) params.append('source', filters.source);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));

  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications?${params.toString()}`,
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
    const error: ApplicationsApiError = {
      message: errorData.detail || `Failed to get applications: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get a specific application.
 */
export async function getApplication(
  appId: number,
  signal?: AbortSignal
): Promise<JobApplication> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/${appId}`,
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
    const error: ApplicationsApiError = {
      message: errorData.detail || `Failed to get application: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Create a new application.
 */
export async function createApplication(
  data: CreateApplicationData,
  signal?: AbortSignal
): Promise<JobApplication> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal,
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApplicationsApiError = {
      message: errorData.detail || `Failed to create application: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update an application.
 */
export async function updateApplication(
  appId: number,
  data: UpdateApplicationData,
  signal?: AbortSignal
): Promise<JobApplication> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/${appId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal,
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApplicationsApiError = {
      message: errorData.detail || `Failed to update application: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Delete an application.
 */
export async function deleteApplication(
  appId: number,
  signal?: AbortSignal
): Promise<{ success: boolean }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/${appId}`,
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
    const error: ApplicationsApiError = {
      message: errorData.detail || `Failed to delete application: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update application status.
 */
export async function updateApplicationStatus(
  appId: number,
  status: string,
  signal?: AbortSignal
): Promise<JobApplication> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/${appId}/status`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
      signal,
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApplicationsApiError = {
      message: errorData.detail || `Failed to update status: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get application statistics.
 */
export async function getApplicationStats(
  days?: number,
  signal?: AbortSignal
): Promise<ApplicationStats> {
  const params = new URLSearchParams();
  if (days) params.append('days', String(days));

  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/stats?${params.toString()}`,
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
    const error: ApplicationsApiError = {
      message: errorData.detail || `Failed to get stats: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get application funnel data.
 */
export async function getApplicationFunnel(
  days?: number,
  signal?: AbortSignal
): Promise<FunnelData> {
  const params = new URLSearchParams();
  if (days) params.append('days', String(days));

  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/funnel?${params.toString()}`,
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
    const error: ApplicationsApiError = {
      message: errorData.detail || `Failed to get funnel: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get conversion rates.
 */
export async function getConversionRates(
  days?: number,
  signal?: AbortSignal
): Promise<ConversionRates> {
  const params = new URLSearchParams();
  if (days) params.append('days', String(days));

  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/conversion?${params.toString()}`,
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
    const error: ApplicationsApiError = {
      message: errorData.detail || `Failed to get conversion rates: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get time to response metrics.
 */
export async function getTimeToResponse(
  days?: number,
  signal?: AbortSignal
): Promise<TimeToResponse> {
  const params = new URLSearchParams();
  if (days) params.append('days', String(days));

  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/time-to-response?${params.toString()}`,
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
    const error: ApplicationsApiError = {
      message: errorData.detail || `Failed to get time to response: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Auto-fill application from resume.
 */
export async function autofillApplication(
  jobId: string,
  signal?: AbortSignal
): Promise<AutoFillResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/autofill`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ job_id: jobId }),
      signal,
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApplicationsApiError = {
      message: errorData.detail || `Failed to auto-fill: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
