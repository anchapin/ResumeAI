/**
 * Tests for type-safe mock data generators
 */

import { describe, it, expect } from 'vitest';
import {
  mockUserData,
  mockResumeData,
  mockApiResponse,
  mockJobApplicationData,
  mockErrorData,
  mockStatsData,
  mockStorageData,
} from '../../utils/test-utils/mock-data';

describe('Mock Data Generators', () => {
  describe('mockUserData', () => {
    it('generates base user data', () => {
      const user = mockUserData.base();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('createdAt');
    });

    it('generates admin user data', () => {
      const admin = mockUserData.admin();

      expect(admin.role).toBe('admin');
      expect(admin).toHaveProperty('email');
    });

    it('generates user with custom overrides', () => {
      const user = mockUserData.withCustom({
        email: 'custom@example.com',
        isActive: true,
      });

      expect(user.email).toBe('custom@example.com');
      expect((user as any).isActive).toBe(true);
      expect(user).toHaveProperty('name');
    });
  });

  describe('mockResumeData', () => {
    it('generates base resume data', () => {
      const resume = mockResumeData.base();

      expect(resume).toHaveProperty('id');
      expect(resume).toHaveProperty('userId');
      expect(resume).toHaveProperty('title');
      expect(resume).toHaveProperty('content');
    });

    it('generates resume with experience', () => {
      const experience = [
        { title: 'Engineer', company: 'Tech Corp', years: 2 },
      ];
      const resume = mockResumeData.withExperience(experience);

      expect(resume.content.experience).toEqual(experience);
    });

    it('generates resume with custom data', () => {
      const resume = mockResumeData.withCustom({
        title: 'Custom Resume',
      });

      expect(resume.title).toBe('Custom Resume');
      expect(resume).toHaveProperty('userId');
    });
  });

  describe('mockApiResponse', () => {
    it('generates successful response', () => {
      const data = { id: 1, name: 'Test' };
      const response = mockApiResponse.success(data);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toEqual(data);
      expect(response.error).toBeNull();
    });

    it('generates error response', () => {
      const response = mockApiResponse.error('Invalid input', 'VALIDATION_ERROR');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(response.error?.code).toBe('VALIDATION_ERROR');
      expect(response.data).toBeNull();
    });

    it('generates paginated response', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const response = mockApiResponse.paginated(items, 1, 10);

      expect(response.data?.pagination.page).toBe(1);
      expect(response.data?.pagination.total).toBe(10);
      expect(response.data?.pagination.hasMore).toBe(true);
      expect(response.data?.items).toEqual(items);
    });

    it('calculates hasMore correctly', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const response = mockApiResponse.paginated(items, 5, 10);

      expect(response.data?.pagination.hasMore).toBe(false);
    });
  });

  describe('mockJobApplicationData', () => {
    it('generates base job application', () => {
      const app = mockJobApplicationData.base();

      expect(app).toHaveProperty('id');
      expect(app).toHaveProperty('company_name');
      expect(app).toHaveProperty('job_title');
      expect(app).toHaveProperty('status');
    });

    it('generates application with status', () => {
      const app = mockJobApplicationData.withStatus('interviewing');

      expect(app.status).toBe('interviewing');
      expect(app).toHaveProperty('company_name');
    });

    it('generates batch of applications', () => {
      const apps = mockJobApplicationData.batch(5);

      expect(apps).toHaveLength(5);
      expect(apps[0].id).toBe(1);
      expect(apps[4].id).toBe(5);
      expect(apps[0].company_name).toBe('Company 1');
    });

    it('generates application with custom data', () => {
      const app = mockJobApplicationData.withCustom({
        company_name: 'Custom Corp',
        salary_min: 100000,
      });

      expect(app.company_name).toBe('Custom Corp');
      expect(app.salary_min).toBe(100000);
    });
  });

  describe('mockErrorData', () => {
    it('generates network error', () => {
      const error = mockErrorData.network();

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toContain('Network');
    });

    it('generates timeout error', () => {
      const error = mockErrorData.timeout();

      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.status).toBe(408);
    });

    it('generates validation error', () => {
      const error = mockErrorData.validation('email');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('email');
    });

    it('generates unauthorized error', () => {
      const error = mockErrorData.unauthorized();

      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.status).toBe(401);
    });

    it('generates not found error', () => {
      const error = mockErrorData.notFound('User');

      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toContain('User');
      expect(error.status).toBe(404);
    });

    it('generates server error', () => {
      const error = mockErrorData.serverError();

      expect(error.code).toBe('SERVER_ERROR');
      expect(error.status).toBe(500);
    });

    it('generates custom error', () => {
      const error = mockErrorData.custom('CUSTOM', 'Custom error', 422);

      expect(error.code).toBe('CUSTOM');
      expect(error.message).toBe('Custom error');
      expect(error.status).toBe(422);
    });
  });

  describe('mockStatsData', () => {
    it('generates application stats', () => {
      const stats = mockStatsData.applicationStats();

      expect(stats).toHaveProperty('total_applications');
      expect(stats).toHaveProperty('by_status');
      expect(stats).toHaveProperty('response_rate');
      expect(stats.by_status.applied).toBeGreaterThan(0);
    });

    it('generates application funnel', () => {
      const funnel = mockStatsData.applicationFunnel();

      expect(funnel).toHaveProperty('total_applications');
      expect(funnel).toHaveProperty('stages');
      expect(funnel.stages).toHaveLength(3);
      expect(funnel.stages[0]).toHaveProperty('percentage');
    });

    it('generates custom stats', () => {
      const stages = [
        { name: 'stage1', count: 10, percentage: 50 },
        { name: 'stage2', count: 10, percentage: 50 },
      ];
      const stats = mockStatsData.custom(20, stages);

      expect(stats.total_applications).toBe(20);
      expect(stats.stages).toEqual(stages);
    });
  });

  describe('mockStorageData', () => {
    it('generates storage with items', () => {
      const storage = mockStorageData.withItems({
        key1: 'value1',
        key2: 'value2',
      });

      expect(storage.key1).toBe('value1');
      expect(storage.key2).toBe('value2');
    });

    it('generates empty storage', () => {
      const storage = mockStorageData.empty();

      expect(Object.keys(storage)).toHaveLength(0);
    });

    it('generates storage with token', () => {
      const storage = mockStorageData.withToken();

      expect(storage['auth-token']).toBeDefined();
      expect(storage['refresh-token']).toBeDefined();
    });

    it('generates storage with custom token', () => {
      const storage = mockStorageData.withToken('custom-token');

      expect(storage['auth-token']).toBe('custom-token');
      expect(storage['refresh-token']).toBe('custom-token-refresh');
    });
  });
});
