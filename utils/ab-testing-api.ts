import { API_URL } from './config';

export interface ResumeVariant {
  id: number;
  user_id: number;
  name: string;
  variant_key: string;  // A, B, C, etc.
  description?: string | null;
  base_resume_id?: number | null;
  data: Record<string, unknown>;
  is_active: boolean;
  is_paused: boolean;
  pause_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VariantPerformance {
  variant_id: number;
  variant_key: string;
  name: string;
  applications: number;
  interviews: number;
  offers: number;
  interview_rate: number;
  offer_rate: number;
  is_paused: boolean;
}

export interface VariantComparison {
  variants: VariantPerformance[];
  best_variant: string | null;
  is_significant: boolean;
  p_value: number | null;
  confidence: number | null;
  recommendation: string;
}

export interface SignificanceResult {
  is_significant: boolean;
  p_value: number;
  chi_squared: number;
  confidence: number;
  variant_a_rate: number;
  variant_b_rate: number;
  recommendation: string;
}

export interface AutoPauseRecommendation {
  variant_id: number;
  variant_key: string;
  should_pause: boolean;
  reason: string;
  confidence: number;
  performance_vs_best: number;
}

export interface VariantCreate {
  name: string;
  variant_key: string;
  description?: string;
  base_resume_id?: number;
  data: Record<string, unknown>;
}

export interface VariantUpdate {
  name?: string;
  description?: string;
  data?: Record<string, unknown>;
  is_active?: boolean;
  is_paused?: boolean;
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
 * Create a new resume variant.
 */
export async function createVariant(data: VariantCreate): Promise<ResumeVariant> {
  const response = await fetch(`${API_URL}/api/v1/variants`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to create variant: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * List all resume variants.
 */
export async function listVariants(includePerformance = true): Promise<{
  variants: ResumeVariant[];
  performance: VariantPerformance[];
}> {
  const response = await fetch(
    `${API_URL}/api/v1/variants?include_performance=${includePerformance}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to list variants: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get a specific variant by ID.
 */
export async function getVariant(id: number): Promise<ResumeVariant> {
  const response = await fetch(`${API_URL}/api/v1/variants/${id}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get variant: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update a variant.
 */
export async function updateVariant(id: number, data: VariantUpdate): Promise<ResumeVariant> {
  const response = await fetch(`${API_URL}/api/v1/variants/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to update variant: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Delete (deactivate) a variant.
 */
export async function deleteVariant(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/variants/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to delete variant: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }
}

/**
 * Compare all variants.
 */
export async function compareVariants(): Promise<VariantComparison> {
  const response = await fetch(`${API_URL}/api/v1/variants/compare`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to compare variants: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get statistical significance for a variant.
 */
export async function getVariantSignificance(
  variantId: number,
  baselineVariantId?: number
): Promise<SignificanceResult> {
  const queryParams = baselineVariantId ? `?baseline_variant_id=${baselineVariantId}` : '';
  const response = await fetch(
    `${API_URL}/api/v1/variants/${variantId}/significance${queryParams}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get significance: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get auto-pause recommendations.
 */
export async function getAutoPauseRecommendations(): Promise<{
  recommendations: AutoPauseRecommendation[];
}> {
  const response = await fetch(`${API_URL}/api/v1/variants/auto-pause/recommendations`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to get recommendations: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Pause a variant.
 */
export async function pauseVariant(id: number, reason?: string): Promise<{ status: string; variant_id: number }> {
  const queryParams = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  const response = await fetch(`${API_URL}/api/v1/variants/${id}/pause${queryParams}`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to pause variant: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Resume a paused variant.
 */
export async function resumeVariant(id: number): Promise<{ status: string; variant_id: number }> {
  const response = await fetch(`${API_URL}/api/v1/variants/${id}/resume`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: APIError = {
      message: errorData.detail || `Failed to resume variant: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
