<<<<<<< HEAD
import type { Resume } from '@/types';

export interface TestContext {
  apiClient: MockAPIClient;
  baseURL: string;
  apiKey: string;
}

export interface MockAPIClient {
  createResume: (resume: Partial<Resume>) => Promise<APIResponse>;
  getResume: (id: string, options?: any) => Promise<APIResponse>;
  updateResume: (id: string, resume: Partial<Resume>) => Promise<APIResponse>;
  deleteResume: (id: string) => Promise<APIResponse>;
  listResumes: () => Promise<APIResponse>;
  cloneResume: (id: string, newTitle: string) => Promise<APIResponse>;
  generatePDF: (resume: Partial<Resume>, options?: any) => Promise<APIResponse>;
  generatePreview: (resume: Partial<Resume>) => Promise<APIResponse>;
  downloadPDF: (pdfId: string) => Promise<APIResponse>;
  initiateOAuth: (provider: string, options?: any) => Promise<APIResponse>;
  handleOAuthCallback: (provider: string, params: any) => Promise<APIResponse>;
  storeOAuthToken: (provider: string, token: any) => Promise<APIResponse>;
  refreshOAuthToken: (provider: string, oldToken: string) => Promise<APIResponse>;
  revokeOAuthToken: (provider: string) => Promise<APIResponse>;
  getOAuthUserProfile: (provider: string) => Promise<APIResponse>;
  syncOAuthProfile: (provider: string) => Promise<APIResponse>;
  linkOAuthAccounts: (providers: string[]) => Promise<APIResponse>;
}

export interface APIResponse {
  status: number;
  data?: any;
  error?: string;
  headers?: Record<string, string>;
  cached?: boolean;
}

/**
 * Setup test API context with mock client
 */
export async function setupTestAPI(): Promise<TestContext> {
  return {
    apiClient: createMockAPIClient(),
    baseURL: 'http://localhost:8000',
    apiKey: 'test-api-key-' + Date.now()
  };
}

/**
 * Cleanup test API context
 */
export async function cleanupTestAPI(context: TestContext): Promise<void> {
  // Clear any test data
  await context.apiClient.listResumes().then(res => {
    if (res.data?.length) {
      res.data.forEach(resume => {
        context.apiClient.deleteResume(resume.id);
      });
    }
  });
}

/**
 * Create mock API client for testing
 */
function createMockAPIClient(): MockAPIClient {
  const storage: Map<string, any> = new Map();
  const pdfCache: Map<string, any> = new Map();
  let restorationCount = 0;
  
  return {
    async createResume(resume: Partial<Resume>) {
      if (!resume.title) {
        return { status: 400, error: 'Title is required' };
      }
      
      const id = 'resume-' + Date.now() + '-' + Math.random();
      const created = { ...resume, id, createdAt: new Date().toISOString() };
      storage.set(id, created);
      
      return { status: 201, data: created };
    },

    async getResume(id: string, options?: any) {
      if (options?.timeout) {
        await new Promise(resolve => setTimeout(resolve, options.timeout + 100));
      }
      
      const resume = storage.get(id);
      if (!resume) {
        return { status: 404, error: 'Resume not found' };
      }
      
      return { status: 200, data: resume };
    },

    async updateResume(id: string, resume: Partial<Resume>) {
      if (!storage.has(id)) {
        return { status: 404, error: 'Resume not found' };
      }
      
      const updated = { ...storage.get(id), ...resume, updatedAt: new Date().toISOString() };
      storage.set(id, updated);
      pdfCache.delete(id); // Invalidate PDF cache
      
      return { status: 200, data: updated };
    },

    async deleteResume(id: string) {
      storage.delete(id);
      pdfCache.delete(id);
      return { status: 204 };
    },

    async listResumes() {
      return { status: 200, data: Array.from(storage.values()) };
    },

    async cloneResume(id: string, newTitle: string) {
      const original = storage.get(id);
      if (!original) {
        return { status: 404, error: 'Resume not found' };
      }
      
      const cloned = {
        ...original,
        id: 'resume-' + Date.now() + '-' + Math.random(),
        title: newTitle,
        createdAt: new Date().toISOString()
      };
      
      storage.set(cloned.id, cloned);
      return { status: 201, data: cloned };
    },

    async generatePDF(resume: Partial<Resume>, options?: any) {
      if (!resume.title) {
        return { status: 400, error: 'Invalid resume data' };
      }
      
      const cacheKey = JSON.stringify({ resume, options });
      if (pdfCache.has(cacheKey)) {
        const cached = pdfCache.get(cacheKey);
        return { status: 200, data: cached, cached: true };
      }
      
      const pdf = {
        id: 'pdf-' + Date.now(),
        format: options?.format || 'pdf',
        theme: options?.theme || 'standard',
        size: Math.floor(Math.random() * 100000) + 50000
      };
      
      pdfCache.set(cacheKey, pdf);
      return { status: 200, data: pdf };
    },

    async generatePreview(resume: Partial<Resume>) {
      if (!resume.title) {
        return { status: 400, error: 'Invalid resume data' };
      }
      
      return {
        status: 200,
        data: {
          thumbnail: 'data:image/png;base64,iVBORw0KGgo...',
          width: 612,
          height: 792
        }
      };
    },

    async downloadPDF(pdfId: string) {
      return {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename=resume.pdf'
        },
        data: new ArrayBuffer(1000)
      };
    },

    async initiateOAuth(provider: string, options?: any) {
      if (!['github', 'google', 'linkedin'].includes(provider)) {
        return { status: 400, error: 'Invalid provider' };
      }
      
      return {
        status: 200,
        data: {
          authUrl: `https://${provider}.com/oauth/authorize?state=test-state`,
          state: 'test-state',
          requestedScopes: options?.scopes || ['user:email']
        }
      };
    },

    async handleOAuthCallback(provider: string, params: any) {
      if (params.error) {
        return { status: 403, error: 'User denied permission' };
      }
      
      if (params.state !== 'valid-state' && params.state?.includes('invalid')) {
        return { status: 400, error: 'Invalid state parameter' };
      }
      
      if (params.code === 'invalid-code') {
        return { status: 401, error: 'Invalid authorization code' };
      }
      
      return {
        status: 200,
        data: {
          accessToken: 'oauth-token-' + Date.now(),
          user: {
            id: 'user-' + Date.now(),
            email: 'user@example.com',
            name: 'Test User'
          }
        }
      };
    },

    async storeOAuthToken(provider: string, token: any) {
      storage.set(`oauth-${provider}`, token);
      return { status: 200, data: { stored: true } };
    },

    async refreshOAuthToken(provider: string, oldToken: string) {
      return {
        status: 200,
        data: {
          accessToken: 'refreshed-token-' + Date.now(),
          refreshToken: 'refresh-' + Date.now(),
          expiresAt: Date.now() + 3600000
        }
      };
    },

    async revokeOAuthToken(provider: string) {
      storage.delete(`oauth-${provider}`);
      return { status: 200, data: { revoked: true } };
    },

    async getOAuthUserProfile(provider: string) {
      return {
        status: 200,
        data: {
          id: 'oauth-user-' + provider,
          email: `user+${provider}@example.com`,
          name: `${provider} User`,
          avatar: `https://example.com/avatar/${provider}.jpg`
        }
      };
    },

    async syncOAuthProfile(provider: string) {
      return {
        status: 200,
        data: {
          synced: true,
          lastSync: new Date().toISOString()
        }
      };
    },

    async linkOAuthAccounts(providers: string[]) {
      return {
        status: 200,
        data: {
          accounts: providers.map(p => ({ provider: p, linked: true }))
        }
      };
    }
  };
}

/**
 * Create a mock resume for testing
 */
export function createMockResume(title: string, overrides?: any): Partial<Resume> {
  return {
    id: 'mock-' + Date.now(),
    title,
    content: 'Mock resume content',
    sections: [
      {
        title: 'Experience',
        items: [
          {
            title: 'Software Engineer',
            company: 'Tech Co',
            startDate: '2020-01-01',
            endDate: '2023-12-31'
          }
        ]
      }
    ],
    ...overrides
  };
}

/**
 * Create a test factory for generating test data
 */
export class TestDataFactory {
  static generateResume(overrides?: Partial<Resume>): Resume {
    return {
      id: 'test-' + Date.now(),
      title: 'Test Resume',
      content: 'Test content',
      sections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    } as Resume;
  }

  static generateMultipleResumes(count: number): Resume[] {
    return Array.from({ length: count }, (_, i) =>
      this.generateResume({ title: `Resume ${i + 1}` })
    );
  }
}

/**
 * Wait helper for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await wait(interval);
  }
}
=======
// Integration test utilities
export const mockPdfResponse = {
  pdf_url: "https://storage.example.com/resume.pdf",
  generated_at: new Date().toISOString()
};

export const mockOAuthResponse = {
  access_token: "test_token_123",
  user: { id: "gh_123", name: "Test User" }
};

export const mockResumeData = {
  id: "resume_123",
  title: "Test Resume",
  content: { personalInfo: { name: "John Doe" } }
};

export function setupApiMocks() {
  global.fetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockPdfResponse)
  });
}
>>>>>>> feature/issue-383-api-integration-tests
