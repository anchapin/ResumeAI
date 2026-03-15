/**
 * GitHub API client functions for frontend.
 *
 * Provides utilities for interacting with GitHub repositories
 * through the ResumeAI backend API.
 */

import { getAuthToken } from './security';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * GitHub repository owner information
 */
export interface GitHubOwner {
  login: string;
  avatar_url: string;
  html_url: string;
  id: number;
  type: string;
}

/**
 * GitHub repository information
 */
export interface GitHubRepository {
  id: number;
  node_id: string | null;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  updated_at: string;
  created_at: string;
  pushed_at: string;
  private: boolean;
  fork: boolean;
  owner: GitHubOwner;
  homepage: string | null;
  size: number;
  open_issues_count: number;
  default_branch: string;
  archived: boolean;
  disabled: boolean;
  visibility: string | null;
  license: Record<string, unknown> | null;
}

/**
 * GitHub repository list response
 */
export interface GitHubRepoListResponse {
  repositories: GitHubRepository[];
  total_count: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

/**
 * GitHub README response
 */
export interface GitHubReadmeResponse {
  name: string;
  path: string;
  content: string;
  encoding: string;
  html_url: string;
  download_url: string;
}

/**
 * Parameters for fetching GitHub repositories
 */
export interface GitHubRepoListParams {
  page?: number;
  per_page?: number;
  type?: 'all' | 'owner' | 'member';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
}

/**
 * Fetch GitHub repositories for the current user.
 *
 * @param params - Query parameters for filtering and pagination
 * @returns Promise resolving to repository list response
 * @throws Error if fetch fails or user is not authenticated
 */
export async function fetchGitHubRepositories(
  params: GitHubRepoListParams = {},
): Promise<GitHubRepoListResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params.type) queryParams.append('type', params.type);
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.direction) queryParams.append('direction', params.direction);

  const response = await fetch(`${API_URL}/api/v1/github/repositories?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch repositories' }));
    throw new Error(error.detail || 'Failed to fetch GitHub repositories');
  }

  return response.json();
}

/**
 * Fetch details for a specific GitHub repository.
 *
 * @param owner - Repository owner username
 * @param repo - Repository name
 * @returns Promise resolving to repository details
 * @throws Error if fetch fails or repository not found
 */
export async function fetchGitHubRepository(
  owner: string,
  repo: string,
): Promise<GitHubRepository> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_URL}/api/v1/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch repository' }));
    throw new Error(error.detail || 'Failed to fetch GitHub repository');
  }

  return response.json();
}

/**
 * Fetch README content for a specific GitHub repository.
 *
 * @param owner - Repository owner username
 * @param repo - Repository name
 * @returns Promise resolving to README content
 * @throws Error if fetch fails or README not found
 */
export async function fetchGitHubReadme(owner: string, repo: string): Promise<GitHubReadmeResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${API_URL}/api/v1/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch README' }));
    throw new Error(error.detail || 'Failed to fetch GitHub README');
  }

  return response.json();
}

/**
 * Check if user has GitHub connection.
 *
 * @returns Promise resolving to connection status
 */
export async function checkGitHubConnection(): Promise<{
  authenticated: boolean;
  username?: string;
  github_user_id?: string;
  connected_at?: string;
  error?: string;
}> {
  const token = getAuthToken();
  if (!token) {
    return { authenticated: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/github/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { authenticated: false, error: 'Failed to check connection status' };
    }

    return response.json();
  } catch (error) {
    console.error('Error checking GitHub connection:', error);
    return { authenticated: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
