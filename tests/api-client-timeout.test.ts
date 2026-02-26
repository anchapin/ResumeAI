/**
 * Integration tests for API client with timeout behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generatePDF,
  tailorResume,
  getVariants,
  checkATSScore,
  convertToAPIData,
} from '../utils/api-client';
import { isTimeoutError } from '../utils/fetch-timeout';
import type { ResumeDataForAPI, SimpleResumeData } from '../types';

// Mock the fetch-timeout module
vi.mock('../utils/fetch-timeout', () => ({
  fetchWithTimeout: vi.fn(),
  TIMEOUT_CONFIG: {
    QUICK: 5000,
    STANDARD: 10000,
    PDF_GENERATION: 15000,
    AI_OPERATION: 15000,
    NONE: 0,
  },
  isTimeoutError: vi.fn((error) => {
    return error?.name === 'AbortError' || error?.name === 'TimeoutError';
  }),
  createTimeoutAbortController: vi.fn(),
  clearTimeoutAbortController: vi.fn(),
}));

// Mock resume data
const mockResumeData: ResumeDataForAPI = {
  basics: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-1234',
    summary: 'Software engineer',
    location: { city: 'San Francisco' },
  },
  work: [
    {
      company: 'Tech Corp',
      position: 'Engineer',
      startDate: '2020-01-01',
      endDate: '2024-01-01',
      summary: 'Worked on projects',
    },
  ],
  education: [
    {
      institution: 'University',
      area: 'CS',
      studyType: 'BS',
      startDate: '2016',
      endDate: '2020',
    },
  ],
  skills: [{ name: 'JavaScript' }],
  projects: [],
};

describe('API Client with Timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePDF', () => {
    it('should use PDF_GENERATION timeout', async () => {
      const { fetchWithTimeout } = await import('../utils/fetch-timeout');
      const mockResponse = new Response(new Blob(), { status: 200 });
      vi.mocked(fetchWithTimeout).mockResolvedValueOnce(mockResponse);

      await generatePDF(mockResumeData, 'modern');

      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('/v1/render/pdf'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
        15000, // PDF_GENERATION timeout
      );
    });

    it('should throw error on timeout', async () => {
      const { fetchWithTimeout } = await import('../utils/fetch-timeout');
      const error = new DOMException('Aborted', 'AbortError');
      vi.mocked(fetchWithTimeout).mockRejectedValueOnce(error);

      await expect(generatePDF(mockResumeData, 'modern')).rejects.toThrow();
    });

    it('should throw error on non-ok response', async () => {
      const { fetchWithTimeout } = await import('../utils/fetch-timeout');
      const mockResponse = new Response(JSON.stringify({ detail: 'PDF generation failed' }), {
        status: 500,
      });
      vi.mocked(fetchWithTimeout).mockResolvedValueOnce(mockResponse);

      await expect(generatePDF(mockResumeData, 'modern')).rejects.toThrow();
    });
  });

  describe('tailorResume', () => {
    it('should use AI_OPERATION timeout', async () => {
      const { fetchWithTimeout } = await import('../utils/fetch-timeout');
      const mockResponse = new Response(
        JSON.stringify({
          resume_data: mockResumeData,
          keywords: ['keyword1'],
          suggestions: ['suggestion1'],
        }),
        { status: 200 },
      );
      vi.mocked(fetchWithTimeout).mockResolvedValueOnce(mockResponse);

      await tailorResume(mockResumeData, 'Job Description');

      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('/v1/tailor'),
        expect.objectContaining({ method: 'POST' }),
        15000, // AI_OPERATION timeout
      );
    });

    it('should handle timeout gracefully', async () => {
      const { fetchWithTimeout } = await import('../utils/fetch-timeout');
      const error = new DOMException('Aborted', 'AbortError');
      vi.mocked(fetchWithTimeout).mockRejectedValueOnce(error);

      await expect(tailorResume(mockResumeData, 'Job Description')).rejects.toThrow();
    });
  });

  describe('getVariants', () => {
    it('should use STANDARD timeout', async () => {
      const { fetchWithTimeout } = await import('../utils/fetch-timeout');
      const mockResponse = new Response(
        JSON.stringify({
          variants: [
            {
              name: 'modern',
              display_name: 'Modern',
              description: 'Modern template',
              category: 'standard',
              style: 'clean',
              features: [],
              recommended_for: [],
              color_schemes: [],
            },
          ],
        }),
        { status: 200 },
      );
      vi.mocked(fetchWithTimeout).mockResolvedValueOnce(mockResponse);

      await getVariants();

      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('/v1/variants'),
        expect.objectContaining({ headers: expect.any(Object) }),
        10000, // STANDARD timeout
      );
    });
  });

  describe('checkATSScore', () => {
    it('should use AI_OPERATION timeout', async () => {
      const { fetchWithTimeout } = await import('../utils/fetch-timeout');
      const mockResponse = new Response(
        JSON.stringify({
          score: 85,
          missing_keywords: [],
          formatting_issues: [],
          recommendations: [],
        }),
        { status: 200 },
      );
      vi.mocked(fetchWithTimeout).mockResolvedValueOnce(mockResponse);

      await checkATSScore(mockResumeData, 'Job Description');

      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('/v1/ats/check'),
        expect.objectContaining({ method: 'POST' }),
        15000, // AI_OPERATION timeout
      );
    });
  });

  describe('isTimeoutError', () => {
    it('should identify AbortError as timeout', () => {
      const error = new DOMException('Aborted', 'AbortError');
      const { isTimeoutError: check } = vi.mocked(isTimeoutError);
      const result = isTimeoutError(error);
      expect(result).toBe(true);
    });

    it('should not identify other errors as timeout', () => {
      const error = new Error('Network error');
      const result = isTimeoutError(error);
      expect(result).toBe(false);
    });
  });
});
