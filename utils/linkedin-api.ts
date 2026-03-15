/**
 * LinkedIn API Client
 */

import { API_URL } from './config';
import { fetchWithRetry } from './api-client';
import type {
  LinkedInProfile,
  LinkedInConnection,
  OAuthInitResponse,
  OAuthCallbackResponse,
} from '../types/linkedin';

export interface LinkedInApiError {
  message: string;
  status?: number;
}

/**
 * Initiate LinkedIn OAuth connection.
 */
export async function initiateLinkedInAuth(): Promise<OAuthInitResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/linkedin/connect`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: LinkedInApiError = {
      message: errorData.detail || `Failed to initiate OAuth: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Handle LinkedIn OAuth callback.
 */
export async function handleLinkedInCallback(
  code: string,
  state: string
): Promise<OAuthCallbackResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/linkedin/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: LinkedInApiError = {
      message: errorData.detail || `OAuth callback failed: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get LinkedIn connection status.
 */
export async function getLinkedInStatus(): Promise<LinkedInConnection> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/linkedin/status`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: LinkedInApiError = {
      message: errorData.detail || `Failed to get status: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Disconnect LinkedIn account.
 */
export async function disconnectLinkedIn(): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/linkedin/disconnect`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: LinkedInApiError = {
      message: errorData.detail || `Failed to disconnect: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get LinkedIn profile data.
 */
export async function getLinkedInProfile(): Promise<LinkedInProfile> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/linkedin/profile`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: LinkedInApiError = {
      message: errorData.detail || `Failed to get profile: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Refresh LinkedIn profile data.
 */
export async function refreshLinkedInProfile(): Promise<{ success: boolean; profile: LinkedInProfile }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/linkedin/refresh`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: LinkedInApiError = {
      message: errorData.detail || `Failed to refresh profile: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
