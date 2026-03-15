/**
 * Writing Assistant API Client
 * 
 * API client for the AI-powered writing assistant feature.
 * Provides real-time grammar, style, and enhancement suggestions.
 */

import { API_URL } from './config';
import { fetchWithRetry } from './api-client';
import type {
  SuggestionRequest,
  SuggestionResponse,
  GrammarCheckRequest,
  GrammarCheckResponse,
  EnhancementRequest,
  EnhancementResponse,
  QuantifyRequest,
  QualityAssessmentRequest,
  QualityAssessmentResponse,
  SuggestionHistoryResponse,
  UpdateSuggestionStatusRequest,
} from '../types/writing-assistant';

export interface WritingAssistantError {
  message: string;
  status?: number;
}

/**
 * Get writing suggestions for text.
 */
export async function getWritingSuggestions(
  request: SuggestionRequest,
  signal?: AbortSignal
): Promise<SuggestionResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/writing/suggest`,
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
    const error: WritingAssistantError = {
      message: errorData.detail || `Failed to get suggestions: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Check text for grammar and spelling errors.
 */
export async function checkGrammar(
  request: GrammarCheckRequest,
  signal?: AbortSignal
): Promise<GrammarCheckResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/writing/grammar`,
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
    const error: WritingAssistantError = {
      message: errorData.detail || `Grammar check failed: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Enhance text with AI-powered suggestions.
 */
export async function enhanceText(
  request: EnhancementRequest,
  signal?: AbortSignal
): Promise<EnhancementResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/writing/enhance`,
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
    const error: WritingAssistantError = {
      message: errorData.detail || `Enhancement failed: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Add quantifiable metrics to an achievement bullet.
 */
export async function quantifyAchievement(
  request: QuantifyRequest,
  signal?: AbortSignal
): Promise<EnhancementResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/writing/quantify`,
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
    const error: WritingAssistantError = {
      message: errorData.detail || `Quantification failed: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Assess the quality of a resume section.
 */
export async function assessQuality(
  request: QualityAssessmentRequest,
  signal?: AbortSignal
): Promise<QualityAssessmentResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/writing/quality`,
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
    const error: WritingAssistantError = {
      message: errorData.detail || `Quality assessment failed: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get user's suggestion history.
 */
export async function getSuggestionHistory(
  limit = 50,
  status?: string,
  signal?: AbortSignal
): Promise<SuggestionHistoryResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    ...(status && { status }),
  });

  const response = await fetchWithRetry(
    `${API_URL}/api/v1/writing/history?${params}`,
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
    const error: WritingAssistantError = {
      message: errorData.detail || `Failed to get history: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update the status of a suggestion.
 */
export async function updateSuggestionStatus(
  request: UpdateSuggestionStatusRequest,
  signal?: AbortSignal
): Promise<{ success: boolean; suggestion_id: string; status: string }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/writing/history/update`,
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
    const error: WritingAssistantError = {
      message: errorData.detail || `Failed to update status: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Get writing assistant statistics.
 */
export async function getWritingStats(signal?: AbortSignal): Promise<{
  total_suggestions: number;
  accepted: number;
  rejected: number;
  acceptance_rate: number;
  common_types: string[];
}> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/writing/stats`,
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
    const error: WritingAssistantError = {
      message: errorData.detail || `Failed to get stats: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}
