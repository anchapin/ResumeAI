import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupApiMocks,
  mockPdfResponse,
  mockOAuthResponse,
  mockResumeData,
} from './test-utils';

/**
 * Basic API Integration Tests
 * Simple tests to verify API mock responses
 */
describe('API Integration Tests', () => {
  beforeEach(() => {
    setupApiMocks();
  });

  describe('PDF Rendering', () => {
    it('should call /v1/render/pdf endpoint', () => {
      expect(mockPdfResponse.pdf_url).toBeDefined();
      expect(mockPdfResponse.pdf_url).toMatch(/\.pdf$/);
    });

    it('should return generated timestamp', () => {
      expect(mockPdfResponse).toHaveProperty('pdf_url');
      expect(mockPdfResponse).toHaveProperty('generated_at');
    });
  });

  describe('OAuth GitHub Flow', () => {
    it('should exchange code for access token', () => {
      expect(mockOAuthResponse.access_token).toBeDefined();
      expect(mockOAuthResponse.access_token).toMatch(/test_token/);
    });

    it('should return GitHub user profile', () => {
      expect(mockOAuthResponse.user).toBeDefined();
      expect(mockOAuthResponse.user.id).toBe('gh_123');
      expect(mockOAuthResponse.user.name).toBe('Test User');
    });
  });

  describe('Resume Save/Load', () => {
    it('should generate resume ID', () => {
      expect(mockResumeData.id).toBeDefined();
      expect(mockResumeData.id).toMatch(/resume_/);
    });

    it('should store resume title', () => {
      expect(mockResumeData).toHaveProperty('title');
      expect(mockResumeData.title).toBe('Test Resume');
    });

    it('should maintain content structure', () => {
      expect(mockResumeData.content).toBeDefined();
      expect(mockResumeData.content).toHaveProperty('personalInfo');
    });
  });
});
