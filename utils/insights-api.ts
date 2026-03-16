import { API_URL } from './config';

export interface TrendDataPoint {
  date: string;
  count: number;
  cumulative: number;
}

export interface TrendsResponse {
  applied: TrendDataPoint[];
  interviewing: TrendDataPoint[];
  offers: TrendDataPoint[];
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  conversion_rate: number;
}

export interface FunnelResponse {
  stages: FunnelStage[];
  total_applications: number;
}

export interface CompanyInsight {
  company_name: string;
  application_count: number;
  latest_status: string;
  days_in_pipeline: number;
}

export interface SourceBreakdown {
  source: string;
  count: number;
  percentage: number;
  interview_rate: number;
}

export interface InsightsSummary {
  total_applications: number;
  active_applications: number;
  interview_rate: number;
  offer_rate: number;
  avg_days_to_response: number | null;
  top_companies: CompanyInsight[];
  source_breakdown: SourceBreakdown[];
  salary_range: {
    min: number | null;
    max: number | null;
    avg_min: number | null;
    avg_max: number | null;
  };
}

export interface SkillData {
  skill: string;
  count: number;
}

export interface SkillsResponse {
  skills: SkillData[];
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
 * Get application trends over time.
 */
export async function getApplicationTrends(days: number = 90): Promise<TrendsResponse> {
  const response = await fetch(
    `${API_URL}/api/v1/insights/trends?days=${days}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get trends: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get application funnel data.
 */
export async function getApplicationFunnel(): Promise<FunnelResponse> {
  const response = await fetch(`${API_URL}/api/v1/insights/funnel`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get funnel data: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get insights summary.
 */
export async function getInsightsSummary(days: number = 90): Promise<InsightsSummary> {
  const response = await fetch(
    `${API_URL}/api/v1/insights/summary?days=${days}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get insights: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get skills distribution from job descriptions.
 */
export async function getSkillsDistribution(): Promise<SkillsResponse> {
  const response = await fetch(`${API_URL}/api/v1/insights/skills`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get skills data: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
