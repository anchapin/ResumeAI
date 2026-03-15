import { API_URL } from '../utils/config';

export interface MatchScoreRequest {
  resume_text: string;
  job_description: string;
  include_comparison?: boolean;
}

export interface MatchScoreResponse {
  match_score: number;
  semantic_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  missing_skills: string[];
  semantic_matches: Record<string, string>;
  suggestions: string[];
  calculation_time_ms: number;
}

export interface MatchScoreError {
  message: string;
  status?: number;
}

/**
 * Calculate match score between resume and job description.
 */
export async function calculateMatchScore(
  request: MatchScoreRequest,
  signal?: AbortSignal
): Promise<MatchScoreResponse> {
  const response = await fetch(`${API_URL}/api/v1/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: MatchScoreError = {
      message: errorData.detail || `Failed to calculate match score: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Calculate match score with retry logic.
 */
export async function calculateMatchScoreWithRetry(
  request: MatchScoreRequest,
  maxRetries = 2
): Promise<MatchScoreResponse> {
  let lastError: MatchScoreError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const result = await calculateMatchScore(request, controller.signal);
      clearTimeout(timeoutId);

      return result;
    } catch (error) {
      lastError = error as MatchScoreError;

      // Don't retry on client errors (4xx)
      if (lastError.status && lastError.status >= 400 && lastError.status < 500) {
        throw lastError;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Unknown error calculating match score');
}

/**
 * Get score category label.
 */
export function getScoreCategory(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Get score category color.
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-50';
  if (score >= 60) return 'text-blue-600 bg-blue-50';
  if (score >= 40) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}
