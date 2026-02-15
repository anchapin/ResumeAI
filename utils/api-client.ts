/**
 * API client for advanced features
 */

import {
  ResumeMetadata,
  ResumeVersion,
  Comment,
  ShareLink,
  FormatOptions,
  UserSettings,
  ResumeData,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Get API key from localStorage
 */
function getAPIKey(): string | null {
  return localStorage.getItem('RESUMEAI_API_KEY');
}

/**
 * Get common headers
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const apiKey = getAPIKey();
  if (apiKey) {
    headers['X-API-KEY'] = apiKey;
  }
  return headers;
}

// ============ Resume CRUD ============

/**
 * Create a new resume
 */
export async function createResume(
  title: string,
  data: ResumeData,
  tags: string[] = []
): Promise<any> {
  const response = await fetch(`${API_URL}/resumes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ title, data, tags }),
  });

  if (!response.ok) {
    throw new Error('Failed to create resume');
  }

  return response.json();
}

/**
 * List resumes with optional filtering
 */
export async function listResumes(filters?: {
  search?: string;
  tag?: string;
  skip?: number;
  limit?: number;
}): Promise<ResumeMetadata[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.tag) params.append('tag', filters.tag);
  if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
  if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());

  const response = await fetch(`${API_URL}/resumes?${params}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to list resumes');
  }

  return response.json();
}

/**
 * Get a specific resume
 */
export async function getResume(resumeId: number): Promise<any> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get resume');
  }

  return response.json();
}

/**
 * Update a resume
 */
export async function updateResume(
  resumeId: number,
  updates: {
    title?: string;
    data?: ResumeData;
    tags?: string[];
    change_description?: string;
  }
): Promise<any> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Failed to update resume');
  }

  return response.json();
}

/**
 * Delete a resume
 */
export async function deleteResume(resumeId: number): Promise<void> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete resume');
  }
}

// ============ Versioning ============

/**
 * List all versions of a resume
 */
export async function listResumeVersions(resumeId: number): Promise<ResumeVersion[]> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/versions`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to list versions');
  }

  return response.json();
}

/**
 * Get a specific version
 */
export async function getResumeVersion(
  resumeId: number,
  versionId: number
): Promise<ResumeVersion> {
  const response = await fetch(
    `${API_URL}/resumes/${resumeId}/versions/${versionId}`,
    {
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get version');
  }

  return response.json();
}

/**
 * Restore a resume to a previous version
 */
export async function restoreResumeVersion(
  resumeId: number,
  versionId: number
): Promise<any> {
  const response = await fetch(
    `${API_URL}/resumes/${resumeId}/versions/${versionId}/restore`,
    {
      method: 'POST',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to restore version');
  }

  return response.json();
}

// ============ Comments ============

/**
 * List comments for a resume
 */
export async function listComments(resumeId: number): Promise<Comment[]> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/comments`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to list comments');
  }

  return response.json();
}

/**
 * Create a comment
 */
export async function createComment(
  resumeId: number,
  comment: {
    author_name: string;
    author_email: string;
    content: string;
    section?: string;
  }
): Promise<Comment> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/comments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(comment),
  });

  if (!response.ok) {
    throw new Error('Failed to create comment');
  }

  return response.json();
}

/**
 * Resolve a comment
 */
export async function resolveComment(commentId: number): Promise<Comment> {
  const response = await fetch(`${API_URL}/comments/${commentId}/resolve`, {
    method: 'PATCH',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to resolve comment');
  }

  return response.json();
}

// ============ Sharing ============

/**
 * Share a resume
 */
export async function shareResume(
  resumeId: number,
  options: {
    permissions?: 'view' | 'comment' | 'edit';
    expires_at?: string;
    max_views?: number;
    password?: string;
  }
): Promise<ShareLink> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/share`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    throw new Error('Failed to share resume');
  }

  return response.json();
}

/**
 * Access a shared resume
 */
export async function accessSharedResume(
  shareToken: string,
  password?: string
): Promise<any> {
  const params = new URLSearchParams();
  if (password) params.append('password', password);

  const response = await fetch(`${API_URL}/share/${shareToken}?${params}`);

  if (!response.ok) {
    throw new Error('Failed to access shared resume');
  }

  return response.json();
}

// ============ Bulk Operations ============

/**
 * Perform bulk operations on resumes
 */
export async function bulkOperation(
  resumeIds: number[],
  operation: 'delete' | 'export' | 'duplicate' | 'tag',
  options?: {
    tags?: string[];
    export_format?: string;
  }
): Promise<{ successful: number[]; failed: Array<{ id: number; error: string }> }> {
  const response = await fetch(`${API_URL}/resumes/bulk`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      resume_ids: resumeIds,
      operation,
      tags: options?.tags,
      export_format: options?.export_format,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to perform bulk operation');
  }

  return response.json();
}

// ============ User Settings ============

/**
 * Get user settings
 */
export async function getUserSettings(
  userIdentifier: string
): Promise<UserSettings> {
  const response = await fetch(`${API_URL}/settings/${userIdentifier}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get settings');
  }

  return response.json();
}

/**
 * Update user settings
 */
export async function updateUserSettings(
  userIdentifier: string,
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  const response = await fetch(`${API_URL}/settings/${userIdentifier}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    throw new Error('Failed to update settings');
  }

  return response.json();
}
