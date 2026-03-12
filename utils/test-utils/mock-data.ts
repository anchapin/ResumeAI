/**
 * Type-safe mock data generators
 * Create consistent test data with proper types
 */

/**
 * User mock data generator
 */
export const mockUserData = {
  base: () => ({
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date().toISOString(),
  }),

  admin: () => ({
    ...mockUserData.base(),
    role: 'admin',
  }),

  withCustom: (overrides: Record<string, any>) => ({
    ...mockUserData.base(),
    ...overrides,
  }),
};

/**
 * Resume mock data generator
 */
export const mockResumeData = {
  base: () => ({
    id: '1',
    userId: '123',
    title: 'Software Engineer Resume',
    content: {
      summary: 'Experienced software engineer',
      experience: [],
      education: [],
      skills: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  withExperience: (experience: any[]) => ({
    ...mockResumeData.base(),
    content: {
      ...mockResumeData.base().content,
      experience,
    },
  }),

  withCustom: (overrides: Record<string, any>) => ({
    ...mockResumeData.base(),
    ...overrides,
  }),
};

/**
 * API response mock data generator
 */
export const mockApiResponse = {
  success: <T,>(data: T) => ({
    ok: true,
    status: 200,
    data,
    error: null,
  }),

  error: (message: string, code: string = 'ERROR') => ({
    ok: false,
    status: 400,
    data: null,
    error: { message, code },
  }),

  paginated: <T,>(items: T[], page: number = 1, total: number = items.length) => ({
    ok: true,
    status: 200,
    data: {
      items,
      pagination: {
        page,
        pageSize: items.length,
        total,
        hasMore: page * items.length < total,
      },
    },
    error: null,
  }),
};

/**
 * Job application mock data generator
 */
export const mockJobApplicationData = {
  base: () => ({
    id: 1,
    company_name: 'Tech Corp',
    job_title: 'Senior Engineer',
    status: 'applied' as const,
    salary_currency: 'USD',
    salary_min: 120000,
    salary_max: 150000,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  withStatus: (status: string) => ({
    ...mockJobApplicationData.base(),
    status,
  }),

  batch: (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      ...mockJobApplicationData.base(),
      id: i + 1,
      company_name: `Company ${i + 1}`,
    })),

  withCustom: (overrides: Record<string, any>) => ({
    ...mockJobApplicationData.base(),
    ...overrides,
  }),
};

/**
 * Error object mock data generator
 */
export const mockErrorData = {
  network: () => ({
    code: 'NETWORK_ERROR',
    message: 'Network request failed',
    status: 0,
  }),

  timeout: () => ({
    code: 'TIMEOUT_ERROR',
    message: 'Request timed out',
    status: 408,
  }),

  validation: (field: string) => ({
    code: 'VALIDATION_ERROR',
    message: `Invalid ${field}`,
    field,
  }),

  unauthorized: () => ({
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    status: 401,
  }),

  notFound: (resource: string) => ({
    code: 'NOT_FOUND',
    message: `${resource} not found`,
    status: 404,
  }),

  serverError: () => ({
    code: 'SERVER_ERROR',
    message: 'Internal server error',
    status: 500,
  }),

  custom: (code: string, message: string, status: number = 400) => ({
    code,
    message,
    status,
  }),
};

/**
 * Stats mock data generator
 */
export const mockStatsData = {
  applicationStats: () => ({
    total_applications: 25,
    by_status: {
      applied: 15,
      interviewing: 8,
      offer: 2,
      rejected: 0,
    },
    response_rate: 0.8,
    interview_rate: 0.32,
    offer_rate: 0.08,
  }),

  applicationFunnel: () => ({
    total_applications: 25,
    stages: [
      { name: 'applied', count: 15, percentage: 60 },
      { name: 'interviewing', count: 8, percentage: 32 },
      { name: 'offer', count: 2, percentage: 8 },
    ],
  }),

  custom: (total: number, stages: any[]) => ({
    total_applications: total,
    stages,
  }),
};

/**
 * Navigation mock data generator
 */
export const mockNavigationData = {
  location: (path: string = '/') => ({
    pathname: path,
    search: '',
    hash: '',
    state: null,
  }),

  navigate: () => vi.fn(),

  params: (params: Record<string, string>) => params,
};

/**
 * Local storage mock data generator
 */
export const mockStorageData = {
  withItems: (items: Record<string, string>) => {
    const storage: Record<string, string> = {};
    Object.entries(items).forEach(([key, value]) => {
      storage[key] = value;
    });
    return storage;
  },

  empty: () => ({}),

  withToken: (token: string = 'mock-token') => ({
    'auth-token': token,
    'refresh-token': `${token}-refresh`,
  }),
};

// Re-export vi for convenience in test files
import { vi } from 'vitest';
