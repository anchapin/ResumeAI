import { ResumeData } from '@/types';

export interface TestContext {
  apiClient: MockAPIClient;
  baseURL: string;
  apiKey: string;
}

export interface MockAPIClient {
  createResume: (resume: Partial<any>) => Promise<APIResponse>;
  getResume: (id: string, options?: any) => Promise<APIResponse>;
  updateResume: (id: string, resume: Partial<any>) => Promise<APIResponse>;
  deleteResume: (id: string) => Promise<APIResponse>;
  listResumes: () => Promise<APIResponse>;
  cloneResume: (id: string, newTitle: string) => Promise<APIResponse>;
  generatePDF: (resume: Partial<any>, options?: any) => Promise<APIResponse>;
  generatePreview: (resume: Partial<any>) => Promise<APIResponse>;
  downloadPDF: (pdfId: string) => Promise<APIResponse>;
  initiateOAuth: (provider: string, options?: any) => Promise<APIResponse>;
  handleOAuthCallback: (provider: string, params: any) => Promise<APIResponse>;
  storeOAuthToken: (provider: string, token: any) => Promise<APIResponse>;
  refreshOAuthToken: (provider: string, oldToken: string) => Promise<APIResponse>;
  revokeOAuthToken: (provider: string) => Promise<APIResponse>;
  getOAuthUserProfile: (provider: string) => Promise<APIResponse>;
  syncOAuthProfile: (provider: string) => Promise<APIResponse>;
  linkOAuthAccounts: (providers: string[]) => Promise<APIResponse>;
  renderPDF: (resumeData: ResumeData, variant?: string) => Promise<APIResponse>;
  tailorResume: (resumeData: ResumeData, jobDescription: string) => Promise<APIResponse>;
  generateVariants: (resumeData: ResumeData) => Promise<APIResponse>;
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
    apiKey: 'test-api-key-' + Date.now(),
  };
}

/**
 * Cleanup test API context
 */
export async function cleanupTestAPI(context: TestContext): Promise<void> {
  // Clear any test data
  await context.apiClient.listResumes().then((res) => {
    if (res.data?.length) {
      res.data.forEach((resume: any) => {
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
  const renderPdfCache: Map<string, string> = new Map();
  let restorationCount = 0;

  return {
    async createResume(resume: Partial<any>) {
      if (!resume.basics?.name) {
        return { status: 400, error: 'Resume name (basics.name) is required' };
      }

      const id = 'resume-' + Date.now() + '-' + Math.random();
      const created = { ...resume, id, createdAt: new Date().toISOString() };
      storage.set(id, created);

      return { status: 201, data: created };
    },

    async getResume(id: string, options?: any) {
      if (options?.timeout) {
        await new Promise((resolve) => setTimeout(resolve, options.timeout + 100));
      }

      const resume = storage.get(id);
      if (!resume) {
        return { status: 404, error: 'Resume not found' };
      }

      return { status: 200, data: resume };
    },

    async updateResume(id: string, resume: Partial<ResumeData>) {
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
        createdAt: new Date().toISOString(),
      };

      storage.set(cloned.id, cloned);
      return { status: 201, data: cloned };
    },

    async generatePDF(resume: Partial<any>, options?: any) {
      if (!resume.basics?.name) {
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
        size: Math.floor(Math.random() * 100000) + 50000,
      };

      pdfCache.set(cacheKey, pdf);
      return { status: 200, data: pdf };
    },

    async generatePreview(resume: Partial<any>) {
      if (!resume.basics?.name) {
        return { status: 400, error: 'Invalid resume data' };
      }

      return {
        status: 200,
        data: {
          thumbnail: 'data:image/png;base64,iVBORw0KGgo...',
          width: 612,
          height: 792,
        },
      };
    },

    async downloadPDF(pdfId: string) {
      return {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename=resume.pdf',
        },
        data: new ArrayBuffer(1000),
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
          requestedScopes: options?.scopes || ['user:email'],
        },
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
            name: 'Test User',
          },
        },
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
          expiresAt: Date.now() + 3600000,
        },
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
          avatar: `https://example.com/avatar/${provider}.jpg`,
        },
      };
    },

    async syncOAuthProfile(provider: string) {
      return {
        status: 200,
        data: {
          synced: true,
          lastSync: new Date().toISOString(),
        },
      };
    },

    async linkOAuthAccounts(providers: string[]) {
      return {
        status: 200,
        data: {
          accounts: providers.map((p) => ({ provider: p, linked: true })),
        },
      };
    },

    async renderPDF(resumeData: ResumeData, variant?: string) {
      if (!resumeData.basics?.name) {
        return { status: 400, error: 'Invalid resume data' };
      }

      try {
        // Create cache key from resume data and variant
        const cacheKey = JSON.stringify({ resume: resumeData, variant });

        // Check cache first
        if (renderPdfCache.has(cacheKey)) {
          const cachedUrl = renderPdfCache.get(cacheKey)!;
          const pdfBuffer = Buffer.from('PDF_MOCK_DATA');
          return {
            status: 200,
            data: {
              pdf_url: cachedUrl,
              size: pdfBuffer.length,
              generated_at: new Date().toISOString(),
              variant: variant || 'standard',
            },
            cached: true,
          };
        }

        // Generate new PDF URL and cache it
        const pdfUrl = 'https://storage.example.com/resume-' + Date.now() + '.pdf';
        renderPdfCache.set(cacheKey, pdfUrl);

        const pdfBuffer = Buffer.from('PDF_MOCK_DATA');
        return {
          status: 200,
          data: {
            pdf_url: pdfUrl,
            size: pdfBuffer.length,
            generated_at: new Date().toISOString(),
            variant: variant || 'standard',
          },
        };
      } catch (error) {
        return { status: 500, error: 'PDF generation failed' };
      }
    },

    async tailorResume(resumeData: ResumeData, jobDescription: string) {
      if (!resumeData.basics?.name || !jobDescription) {
        return { status: 400, error: 'Missing required fields' };
      }

      try {
        return {
          status: 200,
          data: {
            tailored_resume: {
              ...resumeData,
              work: (resumeData.work || []).map((item) => ({
                ...item,
                summary: item.summary ? item.summary + ' (tailored)' : 'tailored',
              })),
            },
            match_score: Math.random() * 100,
            tailoring_suggestions: [
              'Added relevant skills to experience',
              'Reordered sections for better ATS compatibility',
            ],
          },
        };
      } catch (error) {
        return { status: 500, error: 'Tailoring failed' };
      }
    },

    async generateVariants(resumeData: ResumeData) {
      if (!resumeData.basics?.name) {
        return { status: 400, error: 'Invalid resume data' };
      }

      try {
        return {
          status: 200,
          data: {
            variants: [
              {
                name: 'standard',
                url: 'https://storage.example.com/resume-standard.pdf',
                generated_at: new Date().toISOString(),
              },
              {
                name: 'ats-optimized',
                url: 'https://storage.example.com/resume-ats.pdf',
                generated_at: new Date().toISOString(),
              },
              {
                name: 'creative',
                url: 'https://storage.example.com/resume-creative.pdf',
                generated_at: new Date().toISOString(),
              },
            ],
            count: 3,
          },
        };
      } catch (error) {
        return { status: 500, error: 'Variant generation failed' };
      }
    },
  };
}

/**
 * Create a mock resume for testing
 */
export function createMockResume(title: string, overrides?: any): Partial<ResumeData> {
  return {
    title,
    basics: {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1-555-0000',
      url: 'https://example.com',
      label: 'Software Engineer',
      summary: 'Test resume summary',
    },
    work: [
      {
        company: 'Tech Co',
        position: 'Software Engineer',
        startDate: '2020-01-01',
        endDate: '2023-12-31',
        summary: 'Sample work experience',
      },
    ],
    education: [
      {
        institution: 'University',
        studyType: 'Bachelor of Science',
        area: 'Computer Science',
        startDate: '2016',
        endDate: '2020',
      },
    ],
    skills: [
      {
        name: 'JavaScript',
        keywords: ['TypeScript', 'Node.js', 'React'],
      },
    ],
    ...overrides,
  };
}

/**
 * Create a test factory for generating test data
 */
export class TestDataFactory {
  static generateResume(overrides?: Partial<any>): any {
    return {
      id: 'test-' + Date.now(),
      basics: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1-555-0000',
      },
      work: [],
      education: [],
      skills: [],
      ...overrides,
    };
  }

  static generateMultipleResumes(count: number): any[] {
    return Array.from({ length: count }, (_, i) =>
      this.generateResume({
        basics: {
          ...this.generateResume().basics,
          name: `Test User ${i + 1}`,
        },
      }),
    );
  }
}

/**
 * Wait helper for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100,
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await wait(interval);
  }
}

// Integration test utilities
export const mockPdfResponse = {
  pdf_url: 'https://storage.example.com/resume.pdf',
  generated_at: new Date().toISOString(),
};

export const mockOAuthResponse = {
  access_token: 'test_token_123',
  user: { id: 'gh_123', name: 'Test User' },
};

export const mockResumeData = {
  id: 'resume_123',
  title: 'Test Resume',
  content: { personalInfo: { name: 'John Doe' } },
};

export function setupApiMocks() {
  global.fetch = () =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockPdfResponse),
    }) as any;
}
