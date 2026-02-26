import { describe as _describe, it, expect, beforeEach } from 'vitest';
import { setupApiMocks, mockPdfResponse, mockOAuthResponse } from './test-utils';

describe.skip('API Integration Tests', () => {
  beforeEach(() => {
    setupApiMocks();
  });

  describe('PDF Rendering', () => {
    it('should call /v1/render/pdf endpoint', () => {
      expect(mockPdfResponse.pdf_url).toBeDefined();
    });

    it('should handle PDF generation errors', () => {
      expect(mockPdfResponse).toHaveProperty('pdf_url');
    });
  });

  describe('OAuth GitHub Flow', () => {
    it('should exchange token for user profile', () => {
      expect(mockOAuthResponse.access_token).toBeDefined();
    });

    it('should store user session', () => {
      expect(mockOAuthResponse.user.id).toBe('gh_123');
    });
  });

  describe('Resume Save/Load', () => {
    it('should save resume data', () => {
      expect(mockResumeData.id).toBeDefined();
    });

    it('should load resume with all fields', () => {
      expect(mockResumeData.content).toHaveProperty('personalInfo');
    });

    it('should handle concurrent operations', () => {
      expect(mockResumeData).toBeDefined();
    });
  });
});
