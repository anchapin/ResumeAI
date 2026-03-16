import { API_URL } from './config';

export interface SalaryEstimate {
  role_title: string;
  experience_level: string;
  location: string | null;
  salary_min: number;
  salary_median: number;
  salary_max: number;
  salary_currency: string;
  salary_period: string;
  confidence: 'low' | 'medium' | 'high';
  source: string | null;
}

export interface SalaryRange {
  role: string;
  ranges: {
    [level: string]: {
      min: number;
      median: number;
      max: number;
    };
  };
}

export interface ResumeStrengthResult {
  overall_score: number;
  percentile: number;
  percentile_label: string;
  category_scores: {
    skills_match: number;
    experience: number;
    education: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface SkillsGapItem {
  skill: string;
  category: string;
  required: boolean;
  has_skill: boolean;
  demand_score: number;
  priority: 'high' | 'medium' | 'low';
  learning_resources: string[];
}

export interface SkillsGapAnalysis {
  target_role: string;
  current_skills: string[];
  required_skills: string[];
  missing_skills: SkillsGapItem[];
  transferable_skills: SkillsGapItem[];
  gap_percentage: number;
  priority_recommendations: string[];
}

export interface MarketDemandItem {
  skill: string;
  demand_score: number;
  job_postings: number;
  growth_rate: number;
  trend: 'growing' | 'stable' | 'declining';
}

export interface MarketInsights {
  role_title: string;
  top_skills: MarketDemandItem[];
  emerging_skills: MarketDemandItem[];
  declining_skills: MarketDemandItem[];
  market_summary: string;
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
 * Get salary estimate for a role.
 */
export async function getSalaryEstimate(
  roleTitle: string,
  experienceLevel: string,
  location?: string
): Promise<SalaryEstimate> {
  const params = new URLSearchParams({
    role_title: roleTitle,
    experience_level: experienceLevel,
  });
  if (location) params.set('location', location);

  const response = await fetch(`${API_URL}/api/v1/benchmarks/salary/estimate?${params}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get salary estimate: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get salary range across all experience levels.
 */
export async function getSalaryRange(roleTitle: string): Promise<SalaryRange> {
  const response = await fetch(
    `${API_URL}/api/v1/benchmarks/salary/range?role_title=${encodeURIComponent(roleTitle)}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get salary range: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Calculate resume strength percentile.
 */
export async function calculateResumeStrength(params: {
  years_experience: number;
  skills: string[];
  education_level: number;
  target_role: string;
}): Promise<ResumeStrengthResult> {
  const queryParams = new URLSearchParams({
    years_experience: params.years_experience.toString(),
    skills: params.skills.join(','),
    education_level: params.education_level.toString(),
    target_role: params.target_role,
  });

  const response = await fetch(
    `${API_URL}/api/v1/benchmarks/resume/strength?${queryParams}`,
    {
      method: 'POST',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to calculate resume strength: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Analyze skills gap for target role.
 */
export async function analyzeSkillsGap(
  skills: string[],
  targetRole: string
): Promise<SkillsGapAnalysis> {
  const queryParams = new URLSearchParams({
    skills: skills.join(','),
    target_role: targetRole,
  });

  const response = await fetch(
    `${API_URL}/api/v1/benchmarks/skills/gap?${queryParams}`,
    {
      method: 'POST',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to analyze skills gap: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get market insights for a role.
 */
export async function getMarketInsights(roleTitle: string): Promise<MarketInsights> {
  const response = await fetch(
    `${API_URL}/api/v1/benchmarks/market/insights?role_title=${encodeURIComponent(roleTitle)}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get market insights: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get skills demand data.
 */
export async function getSkillsDemand(skill?: string): Promise<{
  skills: MarketDemandItem[];
} | MarketDemandItem> {
  const params = skill ? `?skill=${encodeURIComponent(skill)}` : '';
  const response = await fetch(`${API_URL}/api/v1/benchmarks/skills/demand${params}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get skills demand: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
