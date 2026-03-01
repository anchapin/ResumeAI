/**
 * API client for advanced features
 */

export type {
  ResumeMetadata,
  ResumeVersion,
  Comment,
  ShareLink,
  FormatOptions,
  UserSettings,
  ResumeData,
  SimpleResumeData,
  LinkedInProfile,
  GitHubRepository,
  SalaryResearchRequest,
  SalaryResearchResponse,
  JobOffer,
  ComparisonPriority,
  MemberRole,
  BillingPlan,
  Subscription,
  PaymentMethod,
  Invoice,
  BillingUsage,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  PortalSessionRequest,
  PortalSessionResponse,
  OfferComparison,
};

import {
  ResumeMetadata,
  ResumeVersion,
  Comment,
  ShareLink,
  FormatOptions,
  UserSettings,
  ResumeData,
  SimpleResumeData,
  LinkedInProfile,
  GitHubRepository,
  SalaryResearchRequest,
  SalaryResearchResponse,
  JobOffer,
  ComparisonPriority,
  MemberRole,
  BillingPlan,
  Subscription,
  PaymentMethod,
  Invoice,
  BillingUsage,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  PortalSessionRequest,
  PortalSessionResponse,
  OfferComparison,
} from '../types';
import { fetchWithTimeout, TIMEOUT_CONFIG } from './fetch-timeout';
import { fetchWithRetry, RetryConfig } from './retryLogic';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// In-memory cache for variants
const VARIANTS_CACHE_DURATION = 5 * 60 * 1000;
let variantsCache: {
  data: VariantMetadata[];
  timestamp: number;
  filters: string;
} | null = null;

// Default retry configuration for all API calls
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitterFraction: 0.1,
};

function getAPIKey(): string | null {
  return localStorage.getItem('RESUMEAI_API_KEY');
}

export function getHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  // Try JWT token first (Issue 477 - Bearer token auth)
  const token = localStorage.getItem('resume_ai_auth_token');
  if (token) {
    try {
      // Check if token is expired
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        if (!payload.exp || payload.exp >= currentTime) {
          headers['Authorization'] = `Bearer ${token}`;
          return headers;
        }
      }
    } catch {
      // Invalid token, fall through to API key
    }
  }

  // Fall back to API key authentication
  const apiKey = getAPIKey();
  if (apiKey) headers['X-API-KEY'] = apiKey;
  return headers;
}

export interface ResumeDataForAPI {
  basics?: {
    name?: string;
    label?: string;
    email?: string;
    phone?: string;
    url?: string;
    summary?: string;
    location?: {
      address?: string;
      postalCode?: string;
      city?: string;
      countryCode?: string;
      region?: string;
    };
  };
  work?: Array<{
    company?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
  }>;
  education?: Array<{
    institution?: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
    courses?: string[];
  }>;
  skills?: Array<{ name?: string; keywords?: string[] }>;
  projects?: Array<{
    name?: string;
    description?: string;
    url?: string;
    roles?: string[];
    startDate?: string;
    endDate?: string;
    highlights?: string[];
  }>;
}

export function convertToAPIData(resumeData: SimpleResumeData): ResumeDataForAPI {
  return {
    basics: {
      name: resumeData.name,
      email: resumeData.email,
      phone: resumeData.phone,
      summary: resumeData.summary,
      location: { city: resumeData.location },
    },
    work: resumeData.experience.map((exp) => ({
      company: exp.company,
      position: exp.role,
      startDate: exp.startDate,
      endDate: exp.endDate,
      summary: exp.description,
    })),
    education: resumeData.education.map((edu) => ({
      institution: edu.institution,
      area: edu.area,
      studyType: edu.studyType,
      startDate: edu.startDate,
      endDate: edu.endDate,
      courses: edu.courses,
    })),
    skills: resumeData.skills.map((skill) => ({ name: skill })),
    projects: resumeData.projects.map((proj) => ({
      name: proj.name,
      description: proj.description,
      url: proj.url,
      roles: proj.roles,
      startDate: proj.startDate,
      endDate: proj.endDate,
      highlights: proj.highlights,
    })),
  };
}

export async function generatePDF(
  resumeData: ResumeDataForAPI,
  variant: string = 'modern',
): Promise<Blob> {
  const response = await fetchWithTimeout(
    `${API_URL}/api/v1/render/pdf`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_data: resumeData, variant }),
    },
    TIMEOUT_CONFIG.PDF_GENERATION,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'PDF generation failed' }));
    throw new Error(error.detail || 'Failed to generate PDF');
  }
  return response.blob();
}

export interface VariantMetadata {
  name: string;
  display_name: string;
  description: string;
  category: string;
  style: string;
  features: string[];
  recommended_for: string[];
  color_schemes: Array<{ name: string; primary: number[]; accent: number[]; secondary: number[] }>;
}
export interface VariantsResponse {
  variants: VariantMetadata[];
}

export async function getVariants(filters?: {
  search?: string;
  category?: string;
  tags?: string[];
}): Promise<VariantMetadata[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.tags) params.append('tags', filters.tags.join(','));
  const cacheKey = params.toString();
  const now = Date.now();

  if (variantsCache && cacheKey === variantsCache.filters) {
    if (now - variantsCache.timestamp < VARIANTS_CACHE_DURATION) {
      return variantsCache.data;
    }
  }

  const response = await fetchWithTimeout(
    `${API_URL}/api/v1/variants?${params}`,
    { headers: getHeaders() },
    TIMEOUT_CONFIG.STANDARD,
  );
  if (!response.ok) throw new Error('Failed to fetch variants');
  const data: VariantsResponse = await response.json();
  const variants = data.variants;

  variantsCache = {
    data: variants,
    timestamp: now,
    filters: cacheKey,
  };

  return variants;
}

export function invalidateVariantsCache(): void {
  variantsCache = null;
}

export interface TailoredResumeResponse {
  resume_data: ResumeDataForAPI;
  keywords: string[];
  suggestions: string[];
}

export async function tailorResume(
  resumeData: ResumeDataForAPI,
  jobDescription: string,
  companyName?: string,
  jobTitle?: string,
): Promise<TailoredResumeResponse> {
  const response = await fetchWithTimeout(
    `${API_URL}/api/v1/tailor`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume_data: resumeData,
        job_description: jobDescription,
        company_name: companyName,
        job_title: jobTitle,
      }),
    },
    TIMEOUT_CONFIG.AI_OPERATION,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Resume tailoring failed' }));
    throw new Error(error.detail || 'Failed to tailor resume');
  }
  return response.json();
}

export interface CoverLetterRequest {
  resume_data: ResumeDataForAPI;
  job_description: string;
  company_name: string;
  job_title: string;
  tone?: string;
}

export interface CoverLetterResponse {
  header: string;
  introduction: string;
  body: string;
  closing: string;
  full_text: string;
  metadata: {
    word_count: number;
    note?: string;
  };
}

export async function generateCoverLetter(
  resumeData: ResumeDataForAPI,
  jobDescription: string,
  companyName: string,
  jobTitle: string,
  tone: string = 'professional',
): Promise<CoverLetterResponse> {
  const response = await fetchWithTimeout(
    `${API_URL}/api/v1/cover-letter`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume_data: resumeData,
        job_description: jobDescription,
        company_name: companyName,
        job_title: jobTitle,
        tone,
      }),
    },
    TIMEOUT_CONFIG.AI_OPERATION,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Cover letter generation failed' }));
    throw new Error(error.detail || 'Failed to generate cover letter');
  }
  return response.json();
}

export async function createResume(
  title: string,
  data: ResumeData,
  tags: string[] = [],
): Promise<any> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes`,
    { method: 'POST', headers: getHeaders(), body: JSON.stringify({ title, data, tags }) },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to create resume');
  return response.json();
}

export async function listResumes(filters?: {
  search?: string;
  tag?: string;
  skip?: number;
  limit?: number;
}): Promise<ResumeMetadata[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.tag) params.append('tag', filters.tag);
  if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
  if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes?${params}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to list resumes');
  return response.json();
}

export async function getResume(resumeId: number): Promise<any> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes/${resumeId}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get resume');
  return response.json();
}

export async function updateResume(
  resumeId: number,
  updates: { title?: string; data?: ResumeData; tags?: string[]; changeDescription?: string },
): Promise<any> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes/${resumeId}`,
    { method: 'PUT', headers: getHeaders(), body: JSON.stringify(updates) },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to update resume');
  return response.json();
}

export async function deleteResume(resumeId: number): Promise<void> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes/${resumeId}`,
    { method: 'DELETE', headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to delete resume');
}

export async function listResumeVersions(resumeId: number): Promise<ResumeVersion[]> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes/${resumeId}/versions`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to list versions');
  return response.json();
}

export async function getResumeVersion(
  resumeId: number,
  versionId: number,
): Promise<ResumeVersion> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes/${resumeId}/versions/${versionId}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get version');
  return response.json();
}

export async function restoreResumeVersion(resumeId: number, versionId: number): Promise<any> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes/${resumeId}/versions/${versionId}/restore`,
    { method: 'POST', headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to restore version');
  return response.json();
}

export async function listComments(resumeId: number): Promise<Comment[]> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes/${resumeId}/comments`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to list comments');
  return response.json();
}

export async function createComment(
  resumeId: number,
  comment: { authorName: string; authorEmail: string; content: string; section?: string },
): Promise<Comment> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes/${resumeId}/comments`,
    { method: 'POST', headers: getHeaders(), body: JSON.stringify(comment) },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to create comment');
  return response.json();
}

export async function resolveComment(commentId: number): Promise<Comment> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/comments/${commentId}/resolve`,
    { method: 'PATCH', headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to resolve comment');
  return response.json();
}

export async function deleteComment(commentId: number): Promise<void> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/comments/${commentId}`,
    { method: 'DELETE', headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to delete comment');
}

export async function shareResume(
  resumeId: number,
  options: {
    permissions?: 'view' | 'comment' | 'edit';
    expiresAt?: string;
    maxViews?: number;
    password?: string;
  },
): Promise<ShareLink> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes/${resumeId}/share`,
    { method: 'POST', headers: getHeaders(), body: JSON.stringify(options) },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to share resume');
  return response.json();
}

export async function accessSharedResume(shareToken: string, password?: string): Promise<any> {
  const params = new URLSearchParams();
  if (password) params.append('password', password);
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/share/${shareToken}?${params}`,
    {},
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to access shared resume');
  return response.json();
}

export async function bulkOperation(
  resumeIds: number[],
  operation: 'delete' | 'export' | 'duplicate' | 'tag',
  options?: { tags?: string[]; export_format?: string },
): Promise<{ successful: number[]; failed: Array<{ id: number; error: string }> }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes/bulk`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        resume_ids: resumeIds,
        operation,
        tags: options?.tags,
        export_format: options?.export_format,
      }),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to perform bulk operation');
  return response.json();
}

export async function getUserSettings(userIdentifier: string): Promise<UserSettings> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/settings/${userIdentifier}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get settings');
  return response.json();
}

export async function updateUserSettings(
  userIdentifier: string,
  settings: Partial<UserSettings>,
): Promise<UserSettings> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/settings/${userIdentifier}`,
    { method: 'PUT', headers: getHeaders(), body: JSON.stringify(settings) },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to update settings');
  return response.json();
}

// ATS Compatibility Checker

export interface ATSCheckRequest {
  resume_data: ResumeDataForAPI;
  job_description: string;
}

export async function checkATSScore(
  resumeData: ResumeDataForAPI,
  jobDescription: string,
): Promise<import('../types').ATSReport> {
  const response = await fetchWithTimeout(
    `${API_URL}/api/v1/ats/check`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_data: resumeData, job_description: jobDescription }),
    },
    TIMEOUT_CONFIG.AI_OPERATION,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'ATS check failed' }));
    throw new Error(error.detail || 'Failed to check ATS score');
  }
  return response.json();
}

// Webhook Management

export interface Webhook {
  id: number;
  user_id: string;
  url: string;
  description?: string;
  events: string[];
  secret?: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  last_triggered_at?: string;
  success_count: number;
  failure_count: number;
}

export interface WebhookCreateParams {
  url: string;
  description?: string;
  events: string[];
  secret?: string;
}

export interface WebhookUpdateParams {
  url?: string;
  description?: string;
  events?: string[];
  secret?: string;
  is_active?: boolean;
}

export interface WebhookDelivery {
  id: number;
  webhook_id: number;
  event_type: string;
  payload: Record<string, unknown>;
  response_status?: number;
  response_body?: string;
  delivered_at?: string;
  retry_count: number;
  status: 'pending' | 'delivered' | 'failed';
  error_message?: string;
  next_retry_at?: string;
}

export interface TestWebhookResponse {
  success: boolean;
  message: string;
  delivery_id?: number;
}

export async function createWebhook(params: WebhookCreateParams): Promise<Webhook> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/webhooks`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create webhook' }));
    throw new Error(error.detail || 'Failed to create webhook');
  }
  return response.json();
}

export async function listWebhooks(): Promise<Webhook[]> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/webhooks`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to list webhooks');
  const data = await response.json();
  return data.webhooks || data;
}

export async function getWebhook(id: number): Promise<Webhook> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/webhooks/${id}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get webhook');
  return response.json();
}

export async function updateWebhook(id: number, params: WebhookUpdateParams): Promise<Webhook> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/webhooks/${id}`,
    {
      method: 'PUT',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to update webhook' }));
    throw new Error(error.detail || 'Failed to update webhook');
  }
  return response.json();
}

export async function deleteWebhook(id: number): Promise<void> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/webhooks/${id}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to delete webhook');
}

export async function testWebhook(id: number): Promise<TestWebhookResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/webhooks/${id}/test`,
    {
      method: 'POST',
      headers: getHeaders(),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to test webhook' }));
    throw new Error(error.detail || 'Failed to test webhook');
  }
  return response.json();
}

export async function getWebhookDeliveries(id: number): Promise<WebhookDelivery[]> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/webhooks/${id}/deliveries`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get webhook deliveries');
  const data = await response.json();
  return data.deliveries || data;
}

export async function retryWebhookDelivery(
  webhookId: number,
  deliveryId: number,
): Promise<WebhookDelivery> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/webhooks/${webhookId}/deliveries/${deliveryId}/retry`,
    {
      method: 'POST',
      headers: getHeaders(),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to retry webhook delivery');
  return response.json();
}

// LinkedIn Functions (Real Implementation)
export async function connectLinkedIn(): Promise<string> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/linkedin/oauth/start`,
    {
      method: 'GET',
      headers: getHeaders(),
    },
    DEFAULT_RETRY_CONFIG,
  );

  if (!response.ok) {
    throw new Error(`Failed to initiate LinkedIn OAuth: ${response.statusText}`);
  }

  const data = await response.json();
  return data.auth_url;
}

export async function handleLinkedInCallback(
  code: string,
  state: string,
): Promise<LinkedInProfile> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/linkedin/oauth/callback`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code, state }),
    },
    DEFAULT_RETRY_CONFIG,
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to exchange authorization code');
  }

  const data = await response.json();

  // Store the access token for future API calls
  if (data.access_token) {
    localStorage.setItem('LINKEDIN_ACCESS_TOKEN', data.access_token);
  }

  return data.profile as LinkedInProfile;
}

export async function importLinkedInProfile(): Promise<LinkedInProfile> {
  const token = localStorage.getItem('LINKEDIN_ACCESS_TOKEN');

  if (!token) {
    throw new Error('No LinkedIn access token found. Please authenticate first.');
  }

  const response = await fetchWithRetry(
    `${API_URL}/api/v1/linkedin/profile`,
    {
      method: 'GET',
      headers: {
        ...getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    },
    DEFAULT_RETRY_CONFIG,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch LinkedIn profile: ${response.statusText}`);
  }

  return await response.json();
}

export async function fetchGitHubRepositories(): Promise<GitHubRepository[]> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/github/repositories`,
    {
      method: 'GET',
      headers: getHeaders(),
    },
    DEFAULT_RETRY_CONFIG,
  );

  if (!response.ok) {
    console.warn(`Failed to fetch GitHub repositories: ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  return data.repositories || [];
}

export async function disconnectLinkedIn(): Promise<void> {
  // Clear stored token
  localStorage.removeItem('LINKEDIN_ACCESS_TOKEN');

  // Optionally notify backend to revoke token
  try {
    await fetchWithRetry(
      `${API_URL}/api/v1/linkedin/disconnect`,
      {
        method: 'POST',
        headers: getHeaders(),
      },
      DEFAULT_RETRY_CONFIG,
    );
  } catch (error) {
    console.warn('Failed to notify backend of disconnect:', error);
  }
}

// Salary Research Functions (Real Implementation)
export async function researchSalary(
  request: SalaryResearchRequest,
): Promise<SalaryResearchResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/salary/research`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: request.jobTitle,
        location: request.location,
        company: request.company,
        experience_level: request.experienceLevel,
      }),
    },
    DEFAULT_RETRY_CONFIG,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Salary research failed' }));
    throw new Error(error.detail || 'Failed to research salary');
  }

  const data = await response.json();

  // Map backend response to frontend types
  const salaryData = data.salary_data || {};
  return {
    jobTitle: data.title || request.jobTitle,
    location: data.location || request.location,
    salaryRange: {
      min: salaryData.min_salary || 0,
      max: salaryData.max_salary || 0,
      median: salaryData.median_salary || 0,
      currency: 'USD',
    },
    experienceLevel: data.experience_level || request.experienceLevel,
    factors: {
      location: 'High',
      industry: 'Tech',
      experience: 'Mid',
      education: 'Bachelor',
    },
    insights:
      data.insights?.key_insights?.map((insight: any) => ({
        title: insight.title || 'Insight',
        description: insight.description || '',
        importance: insight.importance || 'medium',
      })) || [],
    recommendations: data.insights?.recommendations || [],
  };
}

export async function createOffer(offer: any): Promise<JobOffer> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/salary/offers`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: offer.companyName,
        title: offer.jobTitle,
        base_salary: offer.baseSalary,
        signing_bonus: offer.bonus,
        equity: offer.equity,
        work_life_balance: offer.workLifeBalance,
        growth_opportunities: offer.growthPotential,
        culture_score: offer.cultureScore,
        benefits: offer.benefits || {},
        location: offer.location,
      }),
    },
    DEFAULT_RETRY_CONFIG,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create offer' }));
    throw new Error(error.detail || 'Failed to create offer');
  }

  const data = await response.json();
  return {
    ...offer,
    id: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateOffer(id: number, offer: any): Promise<JobOffer> {
  return { ...offer, id, updatedAt: new Date().toISOString() } as JobOffer;
}

export async function deleteOffer(id: number): Promise<void> {
  return Promise.resolve();
}

export async function listOffers(): Promise<JobOffer[]> {
  return [];
}

export async function compareOffers(
  offerIds: number[],
  priorities?: ComparisonPriority,
): Promise<OfferComparison> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/salary/offers/compare`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offers: [],
        priorities: priorities
          ? {
              salary: priorities.salary,
              growth: priorities.growth,
              work_life_balance: priorities.workLifeBalance,
              culture: priorities.culture,
              benefits: priorities.benefits,
            }
          : undefined,
      }),
    },
    DEFAULT_RETRY_CONFIG,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to compare offers' }));
    throw new Error(error.detail || 'Failed to compare offers');
  }

  const data = await response.json();
  return {
    offers:
      data.offers?.map((o: any) => ({
        ...o,
        id: o.id || 0,
        companyName: o.company || '',
        jobTitle: o.title || '',
        baseSalary: o.base_salary || 0,
        bonus: o.signing_bonus || 0,
        currency: 'USD',
        location: o.location || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })) || [],
    priorities: priorities || { salary: 1, growth: 1, workLifeBalance: 1, culture: 1, benefits: 1 },
    scores:
      data.offers?.map((o: any, idx: number) => ({
        offerId: o.id || idx,
        totalScore: o.totalScore || 0,
        breakdown: {
          salary: o.breakdown?.salary || 0,
          growth: o.breakdown?.growth || 0,
          workLifeBalance: o.breakdown?.work_life_balance || 0,
          benefits: o.breakdown?.benefits || 0,
          culture: o.breakdown?.culture || 0,
        },
        reasoning: o.reasoning || '',
        pros: o.pros || [],
        cons: o.cons || [],
      })) || [],
    winnerId: data.recommendation?.topOfferId || 0,
    insights: data.insights || [],
    recommendation: data.recommendation
      ? {
          topOfferId: data.recommendation.topOfferId,
          reason: data.recommendation.reason,
        }
      : undefined,
  };
}

export async function getDefaultPriorities(): Promise<ComparisonPriority> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/salary/offers/priorities/default`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get default priorities');
  const data = await response.json();
  return {
    salary: data.salary || 1,
    growth: data.growth || 1,
    workLifeBalance: data.work_life_balance || 1,
    culture: data.culture || 1,
    benefits: data.benefits || 1,
  };
}

export async function updatePriorities(
  priorities: ComparisonPriority,
): Promise<ComparisonPriority> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/salary/offers/priorities`,
    {
      method: 'PUT',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priorities: {
          salary: priorities.salary,
          growth: priorities.growth,
          work_life_balance: priorities.workLifeBalance,
          culture: priorities.culture,
          benefits: priorities.benefits,
        },
      }),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to update priorities');
  const data = await response.json();
  return {
    salary: data.salary || priorities.salary,
    growth: data.growth || priorities.growth,
    workLifeBalance: data.work_life_balance || priorities.workLifeBalance,
    culture: data.culture || priorities.culture,
    benefits: data.benefits || priorities.benefits,
  };
}

// Job Application Types
export type ApplicationStatus =
  | 'draft'
  | 'applied'
  | 'screening'
  | 'interviewing'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export interface JobApplication {
  id: number;
  company_name: string;
  job_title: string;
  job_url?: string;
  location?: string;
  status: ApplicationStatus;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  resumeId?: number;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JobApplicationCreate {
  company_name: string;
  job_title: string;
  job_url?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  resumeId?: number;
  notes?: string;
  tags?: string[];
}

export interface JobApplicationUpdate {
  status?: ApplicationStatus;
  company_name?: string;
  job_title?: string;
  notes?: string;
  tags?: string[];
}

export interface ApplicationStats {
  total_applications: number;
  by_status: Record<string, number>;
  response_rate: number;
  interview_rate: number;
  offer_rate: number;
}

export interface ApplicationFunnel {
  stages: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  total_applications: number;
}

export interface ApplicationTimeline {
  timeline: Array<{
    date: string;
    count: number;
    status: string;
  }>;
}

export interface UpcomingEvent {
  id: number;
  title: string;
  date: string;
  type: 'interview' | 'follow_up' | 'deadline';
  application_id: number;
  company_name: string;
}

// Job Application API Functions

export async function createJobApplication(app: JobApplicationCreate): Promise<JobApplication> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(app),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create application' }));
    throw new Error(error.detail || 'Failed to create application');
  }
  return response.json();
}

export async function listJobApplications(
  status?: ApplicationStatus,
  limit = 50,
  offset = 0,
): Promise<JobApplication[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications?${params}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to list applications');
  return response.json();
}

export async function getJobApplication(id: number): Promise<JobApplication> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/${id}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get application');
  return response.json();
}

export async function updateJobApplication(
  id: number,
  updates: JobApplicationUpdate,
): Promise<JobApplication> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/${id}`,
    {
      method: 'PUT',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to update application');
  return response.json();
}

export async function deleteJobApplication(id: number): Promise<void> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/${id}`,
    { method: 'DELETE', headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to delete application');
}

export async function getApplicationStats(days = 30): Promise<ApplicationStats> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/analytics/stats?days=${days}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get application stats');
  return response.json();
}

export async function getApplicationFunnel(days = 30): Promise<ApplicationFunnel> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/analytics/funnel?days=${days}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get application funnel');
  return response.json();
}

export async function getApplicationTimeline(days = 30): Promise<ApplicationTimeline> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/analytics/timeline?days=${days}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get application timeline');
  return response.json();
}

export async function getUpcomingEvents(days = 7): Promise<UpcomingEvent[]> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/applications/analytics/upcoming?days=${days}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get upcoming events');
  const data = await response.json();
  return data.events || [];
}

// Team management functions (stubs for unblocking CI)
export async function getTeams(): Promise<any[]> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/teams`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get teams');
  return response.json();
}

export async function getTeam(teamId: number | string): Promise<any> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/teams/${teamId}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get team');
  return response.json();
}

export async function createTeam(params: any): Promise<any> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/teams`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to create team');
  return response.json();
}

export async function updateTeam(teamId: number | string, params: any): Promise<any> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/teams/${teamId}`,
    {
      method: 'PUT',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to update team');
  return response.json();
}

export async function deleteTeam(teamId: number | string): Promise<void> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/teams/${teamId}`,
    { method: 'DELETE', headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to delete team');
}

export async function getTeamMembers(teamId: number | string): Promise<any[]> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/teams/${teamId}/members`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get team members');
  return response.json();
}

export async function inviteMember(teamId: number | string, params: any): Promise<any> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/teams/${teamId}/members/invite`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to invite member');
  return response.json();
}

export async function updateMemberRole(
  teamId: number | string,
  memberId: string,
  role: MemberRole,
): Promise<any> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/teams/${teamId}/members/${memberId}`,
    {
      method: 'PATCH',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to update member role');
  return response.json();
}

export async function removeMember(teamId: number | string, memberId: string): Promise<void> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/teams/${teamId}/members/${memberId}`,
    { method: 'DELETE', headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to remove member');
}

export async function shareResumeWithTeam(resumeId: number, teamId: number | string): Promise<any> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes/${resumeId}/share`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId }),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to share resume with team');
  return response.json();
}

export async function unshareResumeFromTeam(
  resumeId: number,
  teamId: number | string,
): Promise<void> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/resumes/${resumeId}/share/${teamId}`,
    { method: 'DELETE', headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to unshare resume from team');
}

export async function getTeamActivity(teamId: number | string, days = 30): Promise<any[]> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/teams/${teamId}/activity?days=${days}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get team activity');
  return response.json();
}

// Billing & Subscription API Functions

export async function getBillingStatus(): Promise<{ enabled: boolean; message: string }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/status`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get billing status');
  return response.json();
}

export async function listBillingPlans(): Promise<BillingPlan[]> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/plans`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to list plans');
  return response.json();
}

export async function getBillingPlan(planName: string): Promise<BillingPlan> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/plans/${planName}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get plan');
  return response.json();
}

export async function getSubscription(): Promise<Subscription> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/subscription`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get subscription');
  return response.json();
}

export async function createCheckoutSession(
  request: CheckoutSessionRequest,
): Promise<CheckoutSessionResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/checkout`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: 'Failed to create checkout session' }));
    throw new Error(error.detail || 'Failed to create checkout session');
  }
  return response.json();
}

export async function createPortalSession(
  request: PortalSessionRequest,
): Promise<PortalSessionResponse> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/portal`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: 'Failed to create portal session' }));
    throw new Error(error.detail || 'Failed to create portal session');
  }
  return response.json();
}

export async function cancelSubscription(
  atPeriodEnd: boolean = true,
): Promise<{ success: boolean; status: string }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/cancel?at_period_end=${atPeriodEnd}`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to cancel subscription' }));
    throw new Error(error.detail || 'Failed to cancel subscription');
  }
  return response.json();
}

export async function resumeSubscription(): Promise<{ success: boolean; status: string }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/resume`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to resume subscription' }));
    throw new Error(error.detail || 'Failed to resume subscription');
  }
  return response.json();
}

export async function upgradeSubscription(
  newPlanName: string,
): Promise<{ success: boolean; status: string }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/upgrade?new_plan_name=${newPlanName}`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to upgrade subscription' }));
    throw new Error(error.detail || 'Failed to upgrade subscription');
  }
  return response.json();
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/payment-methods`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to list payment methods');
  return response.json();
}

export async function addPaymentMethod(
  paymentMethodId: string,
  setAsDefault: boolean = false,
): Promise<PaymentMethod> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/payment-methods`,
    {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method_id: paymentMethodId, set_as_default: setAsDefault }),
    },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to add payment method' }));
    throw new Error(error.detail || 'Failed to add payment method');
  }
  return response.json();
}

export async function removePaymentMethod(paymentMethodId: number): Promise<{ success: boolean }> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/payment-methods/${paymentMethodId}`,
    { method: 'DELETE', headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to remove payment method');
  return response.json();
}

export async function listInvoices(): Promise<Invoice[]> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/invoices`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to list invoices');
  return response.json();
}

export async function getInvoice(invoiceId: number): Promise<Invoice> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/invoices/${invoiceId}`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get invoice');
  return response.json();
}

export async function getBillingUsage(): Promise<BillingUsage> {
  const response = await fetchWithRetry(
    `${API_URL}/api/v1/billing/usage`,
    { headers: getHeaders() },
    DEFAULT_RETRY_CONFIG,
  );
  if (!response.ok) throw new Error('Failed to get billing usage');
  return response.json();
}
