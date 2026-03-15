import { API_URL } from './config';

export interface ATSIssue {
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  element: string;
  description: string;
  page?: number | null;
  fix: string;
}

export interface ATSCheckResponse {
  file_type: string;
  ats_score: number;
  is_parseable: boolean;
  word_count: number;
  issues: ATSIssue[];
  parsed_text: string;
  calculation_time_ms: number;
}

export interface ATSError {
  message: string;
  status?: number;
}

/**
 * Check ATS compatibility of a resume file.
 */
export async function checkATSCompatibility(
  file: File,
  signal?: AbortSignal
): Promise<ATSCheckResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/v1/ats/check`, {
    method: 'POST',
    body: formData,
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ATSError = {
      message: errorData.detail || `ATS check failed: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get score interpretation.
 */
export async function getScoreInterpretation(
  score: number
): Promise<{ interpretation: string; message: string; recommendation: string }> {
  const response = await fetch(`${API_URL}/api/v1/ats/score/${score}/interpretation`);

  if (!response.ok) {
    throw new Error('Failed to get score interpretation');
  }

  return response.json();
}

/**
 * Get fix recommendations for issues.
 */
export async function getFixRecommendations(
  issues: ATSIssue[]
): Promise<Array<{ issue_type: string; priority: string; fix: string; estimated_impact: number }>> {
  const response = await fetch(`${API_URL}/api/v1/ats/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(issues),
  });

  if (!response.ok) {
    throw new Error('Failed to get recommendations');
  }

  return response.json();
}

/**
 * Get score category label.
 */
export function getScoreCategory(score: number): string {
  if (score >= 80) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 20) return 'poor';
  return 'critical';
}

/**
 * Get score category color classes.
 */
export function getScoreColorClasses(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-50';
  if (score >= 50) return 'text-yellow-600 bg-yellow-50';
  if (score >= 20) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
}
