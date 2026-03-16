import { API_URL } from './config';

export interface VersionInfo {
  id: number;
  version_number: number;
  version_name: string | null;
  change_description: string | null;
  created_at: string;
  created_by: number | null;
}

export interface VersionDetail extends VersionInfo {
  resume_id: number;
  data: Record<string, unknown>;
}

export interface VersionDiff {
  from_version: number;
  to_version: number;
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
}

export interface VersionCreate {
  version_name?: string;
  change_description?: string;
}

export interface VersionUpdate {
  version_name?: string;
  change_description?: string;
}

export interface APIError {
  message: string;
  status?: number;
}

/**
 * Get API key from localStorage.
 */
function getApiKey(): string | null {
  return localStorage.getItem('api_key');
}

/**
 * Get headers for API requests.
 */
function getHeaders(): HeadersInit {
  const apiKey = getApiKey();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  return headers;
}

/**
 * List all versions of a resume.
 */
export async function listVersions(resumeId: number): Promise<VersionInfo[]> {
  const response = await fetch(`${API_URL}/api/v1/resumes/${resumeId}/versions`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to list versions: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get details of a specific version.
 */
export async function getVersion(resumeId: number, versionId: number): Promise<VersionDetail> {
  const response = await fetch(`${API_URL}/api/v1/resumes/${resumeId}/versions/${versionId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get version: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Create a new version snapshot.
 */
export async function createVersion(resumeId: number, data?: VersionCreate): Promise<VersionInfo> {
  const response = await fetch(`${API_URL}/api/v1/resumes/${resumeId}/versions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data || {}),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to create version: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Restore a resume to a previous version.
 */
export async function restoreVersion(resumeId: number, versionId: number): Promise<{
  status: string;
  restored_from_version: number;
  new_version: number;
}> {
  const response = await fetch(`${API_URL}/api/v1/resumes/${resumeId}/versions/${versionId}/restore`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to restore version: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Delete a version.
 */
export async function deleteVersion(resumeId: number, versionId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/resumes/${resumeId}/versions/${versionId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to delete version: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }
}

/**
 * Compare two versions.
 */
export async function compareVersions(
  resumeId: number,
  fromId: number,
  toId: number
): Promise<VersionDiff> {
  const response = await fetch(
    `${API_URL}/api/v1/resumes/${resumeId}/versions/${fromId}/compare/${toId}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to compare versions: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update version metadata.
 */
export async function updateVersion(
  resumeId: number,
  versionId: number,
  data: VersionUpdate
): Promise<VersionInfo> {
  const response = await fetch(`${API_URL}/api/v1/resumes/${resumeId}/versions/${versionId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to update version: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
