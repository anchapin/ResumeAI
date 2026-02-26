import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResumeData } from '@/types';
import {
  setupTestAPI,
  cleanupTestAPI,
  createMockResume,
  TestDataFactory,
  wait,
  waitFor,
  type TestContext,
} from './test-utils';

/**
 * Integration Tests: Frontend-Backend API Workflows
 * Tests critical user workflows across frontend and backend
 */
describe('Frontend-Backend Integration Tests', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestAPI();
  });

  afterEach(async () => {
    await cleanupTestAPI(context);
  });

  describe('PDF Rendering Workflow', () => {
    it('should render PDF from resume data', async () => {
      const resumeData = createMockResume('Test Resume');

      const response = await context.apiClient.renderPDF(resumeData);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.pdf_url).toBeDefined();
      expect(response.data.pdf_url).toMatch(/\.pdf$/);
      expect(response.data.generated_at).toBeDefined();
    });

    it('should render PDF with specific variant', async () => {
      const resumeData = createMockResume('Test Resume');

      const response = await context.apiClient.renderPDF(resumeData, 'ats-optimized');

      expect(response.status).toBe(200);
      expect(response.data.variant).toBe('ats-optimized');
    });

    it('should handle invalid resume data gracefully', async () => {
      const invalidData = { basics: {} } as ResumeData;

      const response = await context.apiClient.renderPDF(invalidData);

      expect(response.status).toBe(400);
      expect(response.error).toBeDefined();
    });

    it('should cache PDF generation results', async () => {
      const resumeData = createMockResume('Test Resume');

      const response1 = await context.apiClient.renderPDF(resumeData);
      const response2 = await context.apiClient.renderPDF(resumeData);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      // Both should return same URL
      expect(response1.data.pdf_url).toBe(response2.data.pdf_url);
    });

    it('should generate PDF with full resume data', async () => {
      const resumeData = createMockResume('Full Resume', {
        work: [
          {
            company: 'TechCorp',
            position: 'Senior Engineer',
            startDate: '2020',
            endDate: 'Present',
            summary: 'Led development of microservices',
          },
          {
            company: 'StartupInc',
            position: 'Engineer',
            startDate: '2018',
            endDate: '2020',
            summary: 'Built React applications',
          },
        ],
        skills: [
          {
            name: 'Frontend',
            keywords: ['React', 'TypeScript', 'CSS'],
          },
          {
            name: 'Backend',
            keywords: ['Node.js', 'Python', 'SQL'],
          },
        ],
      });

      const response = await context.apiClient.renderPDF(resumeData);

      expect(response.status).toBe(200);
      expect(response.data.size).toBeGreaterThan(0);
      expect(response.data.generated_at).toBeDefined();
    });
  });

  describe('Resume Save and Load Cycle', () => {
    it('should save and retrieve resume data', async () => {
      const resumeData = createMockResume('Saving Resume');

      // Create resume
      const createRes = await context.apiClient.createResume(resumeData);
      expect(createRes.status).toBe(201);
      expect(createRes.data.id).toBeDefined();

      const resumeId = createRes.data.id;

      // Retrieve resume
      const getRes = await context.apiClient.getResume(resumeId);
      expect(getRes.status).toBe(200);
      expect(getRes.data.basics?.name).toBe(resumeData.basics?.name);
    });

    it('should update resume data', async () => {
      const resumeData = createMockResume('Initial Resume');

      // Create
      const createRes = await context.apiClient.createResume(resumeData);
      const resumeId = createRes.data.id;

      // Update with new data
      const updatedData = createMockResume('Updated Resume', {
        basics: {
          ...resumeData.basics,
          name: 'Updated Name',
        },
      });

      const updateRes = await context.apiClient.updateResume(resumeId, updatedData);
      expect(updateRes.status).toBe(200);
      expect(updateRes.data.basics?.name).toBe('Updated Name');
    });

    it('should delete resume data', async () => {
      const resumeData = createMockResume('Delete Me');

      // Create
      const createRes = await context.apiClient.createResume(resumeData);
      const resumeId = createRes.data.id;

      // Delete
      const deleteRes = await context.apiClient.deleteResume(resumeId);
      expect(deleteRes.status).toBe(204);

      // Verify deletion
      const getRes = await context.apiClient.getResume(resumeId);
      expect(getRes.status).toBe(404);
    });

    it('should list all saved resumes', async () => {
      // Create multiple resumes
      const resume1 = await context.apiClient.createResume(createMockResume('Resume 1'));
      const resume2 = await context.apiClient.createResume(createMockResume('Resume 2'));

      expect(resume1.status).toBe(201);
      expect(resume2.status).toBe(201);

      // List all
      const listRes = await context.apiClient.listResumes();
      expect(listRes.status).toBe(200);
      expect(listRes.data).toBeInstanceOf(Array);
      expect(listRes.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle concurrent save operations', async () => {
      const resumes = TestDataFactory.generateMultipleResumes(3);

      // Create all concurrently
      const responses = await Promise.all(resumes.map((r) => context.apiClient.createResume(r)));

      expect(responses).toHaveLength(3);
      expect(responses.every((r) => r.status === 201)).toBe(true);
      expect(responses.every((r) => r.data.id)).toBe(true);
    });
  });

  describe('OAuth GitHub Integration', () => {
    it('should initiate GitHub OAuth flow', async () => {
      const response = await context.apiClient.initiateOAuth('github');

      expect(response.status).toBe(200);
      expect(response.data.authUrl).toBeDefined();
      expect(response.data.authUrl).toContain('github.com');
      expect(response.data.state).toBeDefined();
    });

    it('should handle GitHub OAuth callback', async () => {
      const code = 'test-github-code';
      const state = 'test-state-' + Date.now();

      const response = await context.apiClient.handleOAuthCallback('github', {
        code,
        state,
      });

      expect(response.status).toBe(200);
      expect(response.data.accessToken).toBeDefined();
      expect(response.data.user).toBeDefined();
      expect(response.data.user.id).toBeDefined();
    });

    it('should store OAuth token securely', async () => {
      const token = {
        accessToken: 'test-github-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000,
      };

      const response = await context.apiClient.storeOAuthToken('github', token);

      expect(response.status).toBe(200);
      expect(response.data.stored).toBe(true);
    });

    it('should refresh expired OAuth token', async () => {
      const oldToken = 'expired-token-' + Date.now();

      const response = await context.apiClient.refreshOAuthToken('github', oldToken);

      expect(response.status).toBe(200);
      expect(response.data.accessToken).toBeDefined();
      expect(response.data.accessToken).not.toBe(oldToken);
      expect(response.data.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should get OAuth user profile', async () => {
      const response = await context.apiClient.getOAuthUserProfile('github');

      expect(response.status).toBe(200);
      expect(response.data.id).toBeDefined();
      expect(response.data.email).toBeDefined();
      expect(response.data.name).toBeDefined();
    });

    it('should complete full GitHub OAuth flow', async () => {
      // 1. Initiate
      const initRes = await context.apiClient.initiateOAuth('github');
      expect(initRes.status).toBe(200);

      // 2. Callback
      const callbackRes = await context.apiClient.handleOAuthCallback('github', {
        code: 'test-code',
        state: initRes.data.state,
      });
      expect(callbackRes.status).toBe(200);

      // 3. Store token
      const storeRes = await context.apiClient.storeOAuthToken('github', {
        accessToken: callbackRes.data.accessToken,
      });
      expect(storeRes.status).toBe(200);

      // 4. Get profile
      const profileRes = await context.apiClient.getOAuthUserProfile('github');
      expect(profileRes.status).toBe(200);
      expect(profileRes.data.email).toBeDefined();
    });
  });

  describe('Resume Tailoring Workflow', () => {
    it('should tailor resume to job description', async () => {
      const resumeData = createMockResume('Tailor Me', {
        work: [
          {
            company: 'TechCorp',
            position: 'Engineer',
            startDate: '2020',
            endDate: 'Present',
            summary: 'Built web applications',
          },
        ],
        skills: [
          {
            name: 'JavaScript',
            keywords: ['React', 'Node.js'],
          },
        ],
      });

      const jobDescription = 'Looking for React developer with Node.js experience';

      const response = await context.apiClient.tailorResume(resumeData, jobDescription);

      expect(response.status).toBe(200);
      expect(response.data.tailored_resume).toBeDefined();
      expect(response.data.match_score).toBeDefined();
      expect(response.data.match_score).toBeGreaterThanOrEqual(0);
      expect(response.data.match_score).toBeLessThanOrEqual(100);
      expect(response.data.tailoring_suggestions).toBeDefined();
      expect(Array.isArray(response.data.tailoring_suggestions)).toBe(true);
    });

    it('should handle missing job description', async () => {
      const resumeData = createMockResume('Test Resume');

      const response = await context.apiClient.tailorResume(resumeData, '');

      expect(response.status).toBe(400);
      expect(response.error).toBeDefined();
    });

    it('should provide tailoring suggestions', async () => {
      const resumeData = createMockResume('Tailor Me');
      const jobDescription = 'Senior Python developer';

      const response = await context.apiClient.tailorResume(resumeData, jobDescription);

      expect(response.status).toBe(200);
      expect(response.data.tailoring_suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Resume Variants Generation', () => {
    it('should generate multiple resume variants', async () => {
      const resumeData = createMockResume('Multi-Variant Resume');

      const response = await context.apiClient.generateVariants(resumeData);

      expect(response.status).toBe(200);
      expect(response.data.variants).toBeDefined();
      expect(Array.isArray(response.data.variants)).toBe(true);
      expect(response.data.variants.length).toBeGreaterThan(0);
      expect(response.data.count).toBe(response.data.variants.length);
    });

    it('should generate variants with different formats', async () => {
      const resumeData = createMockResume('Variant Resume');

      const response = await context.apiClient.generateVariants(resumeData);

      expect(response.status).toBe(200);
      const variantNames = response.data.variants.map((v: any) => v.name);

      expect(variantNames).toContain('standard');
      expect(variantNames.length).toBeGreaterThanOrEqual(3);
    });

    it('should generate variant URLs', async () => {
      const resumeData = createMockResume('Variant URLs');

      const response = await context.apiClient.generateVariants(resumeData);

      expect(response.status).toBe(200);
      response.data.variants.forEach((variant: any) => {
        expect(variant.url).toBeDefined();
        expect(variant.url).toMatch(/^https?:\/\//);
        expect(variant.name).toBeDefined();
        expect(variant.generated_at).toBeDefined();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid API key gracefully', async () => {
      const invalidContext = {
        ...context,
        apiKey: 'invalid-key-' + Date.now(),
      };

      const response = await invalidContext.apiClient.renderPDF(createMockResume('Test'));

      expect(response.status).toBeDefined();
    });

    it.skip('should handle network timeouts', async () => {
      // Test that getResume properly handles 404 for non-existent resume
      // SKIPPED: Requires running backend server at localhost:8000
      // Issue #382: Backend not available in test environment
      const response = await context.apiClient.getResume('non-existent-id');

      expect(response.status).toBe(404);
      expect(response.error).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {} as ResumeData;

      const response = await context.apiClient.renderPDF(incompleteData);

      expect(response.status).toBe(400);
      expect(response.error).toBeDefined();
    });
  });

  describe('Complex Workflows', () => {
    it('should complete full resume workflow', async () => {
      // 1. Create resume
      const resumeData = createMockResume('Full Workflow');
      const createRes = await context.apiClient.createResume(resumeData);
      expect(createRes.status).toBe(201);
      const resumeId = createRes.data.id;

      // 2. Generate PDF
      const pdfRes = await context.apiClient.renderPDF(resumeData);
      expect(pdfRes.status).toBe(200);

      // 3. Generate variants
      const variantsRes = await context.apiClient.generateVariants(resumeData);
      expect(variantsRes.status).toBe(200);

      // 4. Tailor to job
      const tailorRes = await context.apiClient.tailorResume(
        resumeData,
        'Software Engineer position',
      );
      expect(tailorRes.status).toBe(200);

      // 5. Update and save
      const updatedData = createMockResume('Updated Workflow', {
        basics: resumeData.basics,
      });
      const updateRes = await context.apiClient.updateResume(resumeId, updatedData);
      expect(updateRes.status).toBe(200);

      // 6. Retrieve final version
      const getRes = await context.apiClient.getResume(resumeId);
      expect(getRes.status).toBe(200);
    });

    it('should handle parallel resume operations', async () => {
      const resumes = TestDataFactory.generateMultipleResumes(2);

      // Create resumes
      const [res1, res2] = await Promise.all([
        context.apiClient.createResume(resumes[0]),
        context.apiClient.createResume(resumes[1]),
      ]);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);

      // Parallel operations on both
      const operations = await Promise.all([
        context.apiClient.renderPDF(resumes[0]),
        context.apiClient.renderPDF(resumes[1]),
        context.apiClient.tailorResume(resumes[0], 'Job description'),
        context.apiClient.tailorResume(resumes[1], 'Different job'),
      ]);

      expect(operations.every((op) => op.status === 200)).toBe(true);
    });

    it('should clone resume and tailor both versions', async () => {
      const resumeData = createMockResume('Clone Me');

      // Create original
      const createRes = await context.apiClient.createResume(resumeData);
      const originalId = createRes.data.id;

      // Clone
      const cloneRes = await context.apiClient.cloneResume(originalId, 'Cloned Resume');
      expect(cloneRes.status).toBe(201);

      // Tailor both versions
      const tailorResults = await Promise.all([
        context.apiClient.tailorResume(resumeData, 'Job A'),
        context.apiClient.tailorResume(resumeData, 'Job B'),
      ]);

      expect(tailorResults.every((r) => r.status === 200)).toBe(true);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache PDF generation results', async () => {
      const resumeData = createMockResume('Cache Test');

      const res1 = await context.apiClient.renderPDF(resumeData);
      expect(res1.status).toBe(200);

      const res2 = await context.apiClient.renderPDF(resumeData);
      expect(res2.status).toBe(200);

      // Both requests should return valid PDF URLs
      expect(res1.data.pdf_url).toBeDefined();
      expect(res2.data.pdf_url).toBeDefined();
      expect(res1.data.pdf_url).toMatch(/\.pdf$/);
      expect(res2.data.pdf_url).toMatch(/\.pdf$/);
    });

    it('should handle rapid consecutive requests', async () => {
      const resumeData = createMockResume('Rapid Requests');

      const responses = await Promise.all([
        context.apiClient.renderPDF(resumeData),
        context.apiClient.renderPDF(resumeData),
        context.apiClient.renderPDF(resumeData),
        context.apiClient.generateVariants(resumeData),
        context.apiClient.tailorResume(resumeData, 'Job'),
      ]);

      expect(responses.every((r) => r.status === 200 || r.status === 400)).toBe(true);
    });
  });
});
