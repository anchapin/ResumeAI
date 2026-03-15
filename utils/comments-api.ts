import { API_URL } from './config';

export interface Comment {
  id: number;
  resume_id: number;
  user_id: number | null;
  parent_id: number | null;
  author_name: string;
  author_email: string;
  content: string;
  section: string | null;
  position: Record<string, unknown> | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  replies: Comment[];
}

export interface CommentCreate {
  resume_id: number;
  content: string;
  section?: string;
  position?: Record<string, unknown>;
  parent_id?: number;
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
 * Get all comments for a resume.
 */
export async function getResumeComments(
  resumeId: number,
  includeResolved = false
): Promise<Comment[]> {
  const params = includeResolved ? '?include_resolved=true' : '';
  const response = await fetch(`${API_URL}/api/v1/comments/resume/${resumeId}${params}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get comments: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Create a new comment or reply.
 */
export async function createComment(data: CommentCreate): Promise<Comment> {
  const response = await fetch(`${API_URL}/api/v1/comments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to create comment: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update a comment.
 */
export async function updateComment(commentId: number, content: string): Promise<Comment> {
  const response = await fetch(`${API_URL}/api/v1/comments/${commentId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to update comment: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Delete a comment.
 */
export async function deleteComment(commentId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/comments/${commentId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to delete comment: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }
}

/**
 * Resolve a comment.
 */
export async function resolveComment(commentId: number): Promise<Comment> {
  const response = await fetch(`${API_URL}/api/v1/comments/${commentId}/resolve`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to resolve comment: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Unresolve a comment.
 */
export async function unresolveComment(commentId: number): Promise<Comment> {
  const response = await fetch(`${API_URL}/api/v1/comments/${commentId}/unresolve`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to unresolve comment: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
