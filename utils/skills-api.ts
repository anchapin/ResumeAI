/**
 * Skills API Client
 * 
 * API client for skills extraction, matching, and gap analysis.
 */

import { API_URL } from './config';
import { fetchWithRetry } from './api-client';
import type {
  SkillsExtractRequest,
  SkillsExtractResponse,
  SkillsMatchRequest,
  SkillsMatchResponse,
  SkillsGapResponse,
  CategoriesResponse,
  SkillsSearchResponse,
} from '../types/skills';

export interface SkillsApiError {
  message: string;
  status?: number;
}

/**
 * Extract skills from job description text.
 */
export async function extractSkills(
  request: SkillsExtractRequest,
  signal?: AbortSignal
): Promise<SkillsExtractResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/skills/extract`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: SkillsApiError = {
      message: errorData.detail || `Failed to extract skills: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Match skills between job description and resume.
 */
export async function matchSkills(
  request: SkillsMatchRequest,
  signal?: AbortSignal
): Promise<SkillsMatchResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/skills/match`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    },
    {
      maxRetries: 2,
      timeoutMs: 30000,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: SkillsApiError = {
      message: errorData.detail || `Failed to match skills: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Analyze skills gap between job description and resume.
 */
export async function getSkillsGap(
  jdText: string,
  resumeText: string,
  signal?: AbortSignal
): Promise<SkillsGapResponse> {
  const params = new URLSearchParams({
    jd_text: jdText,
    resume_text: resumeText,
  });

  const response = await fetchWithRetry(
    `${API_URL}/api/v1/skills/gap?${params}`,
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
    const error: SkillsApiError = {
      message: errorData.detail || `Failed to analyze skills gap: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get all skill categories.
 */
export async function getCategories(
  signal?: AbortSignal
): Promise<CategoriesResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/skills/categories`,
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
    const error: SkillsApiError = {
      message: errorData.detail || `Failed to get categories: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Search for skills by name or synonym.
 */
export async function searchSkills(
  query: string,
  limit = 10,
  signal?: AbortSignal
): Promise<SkillsSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  const response = await fetchWithRetry(
    `${API_URL}/api/v1/skills/search?${params}`,
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
    const error: SkillsApiError = {
      message: errorData.detail || `Skills search failed: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
