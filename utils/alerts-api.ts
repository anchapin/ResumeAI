/**
 * Job Alerts API Client
 */

import { API_URL } from './config';
import { fetchWithRetry } from './api-client';
import type {
  JobAlert,
  CreateAlertData,
  UpdateAlertData,
  AlertPreferences,
  UpdatePreferencesData,
  AlertsListResponse,
} from '../types/alerts';

export interface AlertsApiError {
  message: string;
  status?: number;
}

/**
 * Get all user alerts.
 */
export async function getAlerts(
  activeOnly?: boolean,
  signal?: AbortSignal
): Promise<AlertsListResponse> {
  const params = new URLSearchParams();
  if (activeOnly) params.append('active_only', 'true');

  const response = await fetchWithRetry(
    `${API_URL}/api/v1/alerts?${params.toString()}`,
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
    const error: AlertsApiError = {
      message: errorData.detail || `Failed to get alerts: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get a specific alert.
 */
export async function getAlert(
  alertId: number,
  signal?: AbortSignal
): Promise<JobAlert> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/alerts/${alertId}`,
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
    const error: AlertsApiError = {
      message: errorData.detail || `Failed to get alert: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Create a new alert.
 */
export async function createAlert(
  data: CreateAlertData,
  signal?: AbortSignal
): Promise<JobAlert> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/alerts`,
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
    const error: AlertsApiError = {
      message: errorData.detail || `Failed to create alert: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update an alert.
 */
export async function updateAlert(
  alertId: number,
  data: UpdateAlertData,
  signal?: AbortSignal
): Promise<JobAlert> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/alerts/${alertId}`,
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
    const error: AlertsApiError = {
      message: errorData.detail || `Failed to update alert: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Delete an alert.
 */
export async function deleteAlert(
  alertId: number,
  signal?: AbortSignal
): Promise<{ success: boolean }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/alerts/${alertId}`,
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
    const error: AlertsApiError = {
      message: errorData.detail || `Failed to delete alert: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Pause an alert.
 */
export async function pauseAlert(
  alertId: number,
  signal?: AbortSignal
): Promise<{ success: boolean }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/alerts/${alertId}/pause`,
    {
      method: 'POST',
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
    const error: AlertsApiError = {
      message: errorData.detail || `Failed to pause alert: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Resume a paused alert.
 */
export async function resumeAlert(
  alertId: number,
  signal?: AbortSignal
): Promise<{ success: boolean }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/alerts/${alertId}/resume`,
    {
      method: 'POST',
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
    const error: AlertsApiError = {
      message: errorData.detail || `Failed to resume alert: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get notification preferences.
 */
export async function getPreferences(
  signal?: AbortSignal
): Promise<AlertPreferences> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/alerts/preferences`,
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
    const error: AlertsApiError = {
      message: errorData.detail || `Failed to get preferences: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update notification preferences.
 */
export async function updatePreferences(
  data: UpdatePreferencesData,
  signal?: AbortSignal
): Promise<AlertPreferences> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/alerts/preferences`,
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
    const error: AlertsApiError = {
      message: errorData.detail || `Failed to update preferences: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
