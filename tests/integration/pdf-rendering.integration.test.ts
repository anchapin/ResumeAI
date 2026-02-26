import { describe as _describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { TestContext } from './test-utils';
import { setupTestAPI, cleanupTestAPI, createMockResume } from './test-utils';

describe.skip('PDF Rendering Integration Tests', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestAPI();
  });

  afterAll(async () => {
    await cleanupTestAPI(context);
  });

  describe('PDF Generation', () => {
    it('should generate PDF from resume data', async () => {
      const mockResume = createMockResume('PDF Test');
      const response = await context.apiClient.generatePDF(mockResume);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.format).toBe('pdf');
      expect(response.data.size).toBeGreaterThan(0);
    });

    it('should generate PDF with custom styling', async () => {
      const mockResume = createMockResume('Styled PDF');
      const response = await context.apiClient.generatePDF(mockResume, {
        theme: 'modern',
        fontSize: 11,
        margin: 0.75,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.theme).toBe('modern');
    });

    it('should handle different resume formats', async () => {
      const formats = ['standard', 'academic', 'creative'];

      for (const format of formats) {
        const mockResume = createMockResume(`PDF ${format}`);
        const response = await context.apiClient.generatePDF(mockResume, { format });

        expect(response.status).toBe(200);
        expect(response.data.format).toBe('pdf');
      }
    });
  });

  describe('PDF Preview', () => {
    it('should generate preview thumbnail', async () => {
      const mockResume = createMockResume('Preview Test');
      const response = await context.apiClient.generatePreview(mockResume);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.thumbnail).toBeDefined();
      expect(response.data.width).toBe(612); // Letter width in points
      expect(response.data.height).toBe(792); // Letter height in points
    });
  });

  describe('PDF Download', () => {
    it('should download generated PDF', async () => {
      const mockResume = createMockResume('Download Test');
      const generated = await context.apiClient.generatePDF(mockResume);

      const response = await context.apiClient.downloadPDF(generated.data.id);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('PDF Error Handling', () => {
    it('should handle invalid resume data', async () => {
      const invalidResume = { name: '' }; // Missing required fields
      const response = await context.apiClient.generatePDF(invalidResume);

      expect(response.status).toBe(400);
      expect(response.error).toBeDefined();
    });

    it('should handle rendering failures gracefully', async () => {
      const complexResume = createMockResume('Complex PDF', {
        sections: Array(100).fill({ title: 'Section', content: 'X'.repeat(10000) }),
      });

      const response = await context.apiClient.generatePDF(complexResume);
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('PDF Caching', () => {
    it('should cache PDF for same resume', async () => {
      const mockResume = createMockResume('Cache Test');

      const first = await context.apiClient.generatePDF(mockResume);
      const second = await context.apiClient.generatePDF(mockResume);

      expect(first.data.id).toBe(second.data.id);
      expect(second.cached).toBe(true);
    });

    it('should invalidate cache on resume update', async () => {
      const mockResume = createMockResume('Cache Invalidate');
      const created = await context.apiClient.createResume(mockResume);

      const pdf1 = await context.apiClient.generatePDF(created.data);

      await context.apiClient.updateResume(created.data.id, {
        ...created.data,
        title: 'Updated Title',
      });

      const pdf2 = await context.apiClient.generatePDF(created.data);
      expect(pdf1.data.id).not.toBe(pdf2.data.id);
    });
  });
});
