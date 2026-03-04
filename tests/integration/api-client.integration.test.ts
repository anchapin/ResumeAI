import { describe as _describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { TestContext } from './test-utils';
import { setupTestAPI, cleanupTestAPI, createMockResume } from './test-utils';

describe('API Client Integration Tests', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestAPI();
  });

  afterAll(async () => {
    await cleanupTestAPI(context);
  });

  describe('Resume CRUD Operations', () => {
    it('should create a new resume via API', async () => {
      const mockResume = createMockResume('Create Test');
      const response = await context.apiClient.createResume(mockResume);

      expect(response.data.id).toBeDefined();
      expect(response.status).toBe(201);
      expect(response.data.title).toBe('Create Test');
    });

    it('should read resume by ID', async () => {
      const mockResume = createMockResume('Read Test');
      const created = await context.apiClient.createResume(mockResume);
      const response = await context.apiClient.getResume(created.data.id);

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(created.data.id);
      expect(response.data.title).toBe('Read Test');
    });

    it('should update existing resume', async () => {
      const mockResume = createMockResume('Update Test');
      const created = await context.apiClient.createResume(mockResume);

      const updated = await context.apiClient.updateResume(created.data.id, {
        ...created.data,
        title: 'Updated Title',
      });

      expect(updated.status).toBe(200);
      expect(updated.data.title).toBe('Updated Title');
    });

    it('should delete resume', async () => {
      const mockResume = createMockResume('Delete Test');
      const created = await context.apiClient.createResume(mockResume);

      const response = await context.apiClient.deleteResume(created.data.id);
      expect(response.status).toBe(204);
    });

    it('should list all resumes', async () => {
      const mockResume = createMockResume('List Test');
      await context.apiClient.createResume(mockResume);

      const response = await context.apiClient.listResumes();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });
  });

  describe('Resume Cloning', () => {
    it('should clone an existing resume', async () => {
      const original = createMockResume('Clone Source');
      const created = await context.apiClient.createResume(original);

      const cloned = await context.apiClient.cloneResume(created.data.id, 'Cloned Resume');

      expect(cloned.status).toBe(201);
      expect(cloned.data.title).toBe('Cloned Resume');
      expect(cloned.data.id).not.toBe(created.data.id);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent IDs', async () => {
      const response = await context.apiClient.getResume('non-existent-id');
      expect(response.status).toBe(404);
      expect(response.error).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const invalidResume = { title: '' }; // Missing required fields
      const response = await context.apiClient.createResume(invalidResume);

      expect(response.status).toBe(400);
      expect(response.error).toBeDefined();
    });

    // Note: Network timeout testing requires actual HTTP client mocking
    // The mock API client runs synchronously, so timeout tests don't apply
  });
});
