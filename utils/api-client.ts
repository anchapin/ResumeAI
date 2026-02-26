/**
 * API client for advanced features
 */

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
  OfferComparison,
} from '../types';
import { fetchWithRetry, RetryConfig } from './retryLogic';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Default retry configuration for API calls
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 10000,
};

function getAPIKey(): string | null {
  return localStorage.getItem('RESUMEAI_API_KEY');
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const apiKey = getAPIKey();
  if (apiKey) headers['X-API-KEY'] = apiKey;
  return headers;
}

export interface ResumeDataForAPI {
  basics?: { name?: string; label?: string; email?: string; phone?: string; url?: string; summary?: string; location?: { address?: string; postalCode?: string; city?: string; countryCode?: string; region?: string; }; };
  work?: Array<{ company?: string; position?: string; startDate?: string; endDate?: string; summary?: string; highlights?: string[]; }>;
  education?: Array<{ institution?: string; area?: string; studyType?: string; startDate?: string; endDate?: string; courses?: string[]; }>;
  skills?: Array<{ name?: string; keywords?: string[]; }>;
  projects?: Array<{ name?: string; description?: string; url?: string; roles?: string[]; startDate?: string; endDate?: string; highlights?: string[]; }>;
}

export function convertToAPIData(resumeData: SimpleResumeData): ResumeDataForAPI {
  return {
    basics: { name: resumeData.name, email: resumeData.email, phone: resumeData.phone, summary: resumeData.summary, location: { city: resumeData.location } },
    work: resumeData.experience.map(exp => ({ company: exp.company, position: exp.role, startDate: exp.startDate, endDate: exp.endDate, summary: exp.description })),
    education: resumeData.education.map(edu => ({ institution: edu.institution, area: edu.area, studyType: edu.studyType, startDate: edu.startDate, endDate: edu.endDate, courses: edu.courses })),
    skills: resumeData.skills.map(skill => ({ name: skill })),
    projects: resumeData.projects.map(proj => ({ name: proj.name, description: proj.description, url: proj.url, roles: proj.roles, startDate: proj.startDate, endDate: proj.endDate, highlights: proj.highlights })),
  };
}

export async function generatePDF(resumeData: ResumeDataForAPI, variant: string = 'modern'): Promise<Blob> {
  const response = await fetchWithRetry(`${API_URL}/v1/render/pdf`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_data: resumeData, variant }),
  }, DEFAULT_RETRY_CONFIG);
  if (!response.ok) { const error = await response.json().catch(() => ({ detail: 'PDF generation failed' })); throw new Error(error.detail || 'Failed to generate PDF'); }
  return response.blob();
}

export interface VariantMetadata { name: string; display_name: string; description: string; category: string; style: string; features: string[]; recommended_for: string[]; color_schemes: Array<{ name: string; primary: number[]; accent: number[]; secondary: number[] }>; }
export interface VariantsResponse { variants: VariantMetadata[]; }

export async function getVariants(filters?: { search?: string; category?: string; tags?: string[] }): Promise<VariantMetadata[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.tags) params.append('tags', filters.tags.join(','));
  const response = await fetchWithRetry(`${API_URL}/v1/variants?${params}`, { headers: getHeaders() }, DEFAULT_RETRY_CONFIG);
  if (!response.ok) throw new Error('Failed to fetch variants');
  const data: VariantsResponse = await response.json();
  return data.variants;
}

export interface TailoredResumeResponse { resume_data: ResumeDataForAPI; keywords: string[]; suggestions: string[]; }

export async function tailorResume(resumeData: ResumeDataForAPI, jobDescription: string, companyName?: string, jobTitle?: string): Promise<TailoredResumeResponse> {
  const response = await fetchWithRetry(`${API_URL}/v1/tailor`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_data: resumeData, job_description: jobDescription, company_name: companyName, job_title: jobTitle }),
  }, DEFAULT_RETRY_CONFIG);
  if (!response.ok) { const error = await response.json().catch(() => ({ detail: 'Resume tailoring failed' })); throw new Error(error.detail || 'Failed to tailor resume'); }
  return response.json();
}

export async function createResume(title: string, data: ResumeData, tags: string[] = []): Promise<any> {
  const response = await fetchWithRetry(`${API_URL}/resumes`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ title, data, tags }) }, DEFAULT_RETRY_CONFIG);
  if (!response.ok) throw new Error('Failed to create resume');
  return response.json();
}

export async function listResumes(filters?: { search?: string; tag?: string; skip?: number; limit?: number; }): Promise<ResumeMetadata[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.tag) params.append('tag', filters.tag);
  if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
  if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
  const response = await fetchWithRetry(`${API_URL}/resumes?${params}`, { headers: getHeaders() }, DEFAULT_RETRY_CONFIG);
  if (!response.ok) throw new Error('Failed to list resumes');
  return response.json();
}

export async function getResume(resumeId: number): Promise<any> {
  const response = await fetchWithRetry(`${API_URL}/resumes/${resumeId}`, { headers: getHeaders() }, DEFAULT_RETRY_CONFIG);
  if (!response.ok) throw new Error('Failed to get resume');
  return response.json();
}

export async function updateResume(resumeId: number, updates: { title?: string; data?: ResumeData; tags?: string[]; change_description?: string; }): Promise<any> {
  const response = await fetchWithRetry(`${API_URL}/resumes/${resumeId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(updates) }, DEFAULT_RETRY_CONFIG);
  if (!response.ok) throw new Error('Failed to update resume');
  return response.json();
}

export async function deleteResume(resumeId: number): Promise<void> {
  const response = await fetchWithRetry(`${API_URL}/resumes/${resumeId}`, { method: 'DELETE', headers: getHeaders() }, DEFAULT_RETRY_CONFIG);
  if (!response.ok) throw new Error('Failed to delete resume');
}

export async function listResumeVersions(resumeId: number): Promise<ResumeVersion[]> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/versions`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to list versions');
  return response.json();
}

export async function getResumeVersion(resumeId: number, versionId: number): Promise<ResumeVersion> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/versions/${versionId}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get version');
  return response.json();
}

export async function restoreResumeVersion(resumeId: number, versionId: number): Promise<any> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/versions/${versionId}/restore`, { method: 'POST', headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to restore version');
  return response.json();
}

export async function listComments(resumeId: number): Promise<Comment[]> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/comments`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to list comments');
  return response.json();
}

export async function createComment(resumeId: number, comment: { author_name: string; author_email: string; content: string; section?: string; }): Promise<Comment> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/comments`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(comment) });
  if (!response.ok) throw new Error('Failed to create comment');
  return response.json();
}

export async function resolveComment(commentId: number): Promise<Comment> {
  const response = await fetch(`${API_URL}/comments/${commentId}/resolve`, { method: 'PATCH', headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to resolve comment');
  return response.json();
}

export async function deleteComment(commentId: number): Promise<void> {
  const response = await fetch(`${API_URL}/comments/${commentId}`, { method: 'DELETE', headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to delete comment');
}

export async function shareResume(resumeId: number, options: { permissions?: 'view' | 'comment' | 'edit'; expires_at?: string; max_views?: number; password?: string; }): Promise<ShareLink> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/share`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(options) });
  if (!response.ok) throw new Error('Failed to share resume');
  return response.json();
}

export async function accessSharedResume(shareToken: string, password?: string): Promise<any> {
  const params = new URLSearchParams();
  if (password) params.append('password', password);
  const response = await fetch(`${API_URL}/share/${shareToken}?${params}`);
  if (!response.ok) throw new Error('Failed to access shared resume');
  return response.json();
}

export async function bulkOperation(resumeIds: number[], operation: 'delete' | 'export' | 'duplicate' | 'tag', options?: { tags?: string[]; export_format?: string; }): Promise<{ successful: number[]; failed: Array<{ id: number; error: string }> }> {
  const response = await fetch(`${API_URL}/resumes/bulk`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ resume_ids: resumeIds, operation, tags: options?.tags, export_format: options?.export_format }) });
  if (!response.ok) throw new Error('Failed to perform bulk operation');
  return response.json();
}

export async function getUserSettings(userIdentifier: string): Promise<UserSettings> {
  const response = await fetch(`${API_URL}/settings/${userIdentifier}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get settings');
  return response.json();
}

export async function updateUserSettings(userIdentifier: string, settings: Partial<UserSettings>): Promise<UserSettings> {
  const response = await fetch(`${API_URL}/settings/${userIdentifier}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(settings) });
  if (!response.ok) throw new Error('Failed to update settings');
  return response.json();
}

// ATS Compatibility Checker

export interface ATSCheckRequest {
  resume_data: ResumeDataForAPI;
  job_description: string;
}

export async function checkATSScore(resumeData: ResumeDataForAPI, jobDescription: string): Promise<import('../types').ATSReport> {
  const response = await fetchWithRetry(`${API_URL}/v1/ats/check`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_data: resumeData, job_description: jobDescription }),
  }, DEFAULT_RETRY_CONFIG);
  if (!response.ok) { const error = await response.json().catch(() => ({ detail: 'ATS check failed' })); throw new Error(error.detail || 'Failed to check ATS score'); }
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
  created_at: string;
  updated_at: string;
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
  const response = await fetch(`${API_URL}/v1/webhooks`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) { const error = await response.json().catch(() => ({ detail: 'Failed to create webhook' })); throw new Error(error.detail || 'Failed to create webhook'); }
  return response.json();
}

export async function listWebhooks(): Promise<Webhook[]> {
  const response = await fetch(`${API_URL}/v1/webhooks`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to list webhooks');
  const data = await response.json();
  return data.webhooks || data;
}

export async function getWebhook(id: number): Promise<Webhook> {
  const response = await fetch(`${API_URL}/v1/webhooks/${id}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get webhook');
  return response.json();
}

export async function updateWebhook(id: number, params: WebhookUpdateParams): Promise<Webhook> {
  const response = await fetch(`${API_URL}/v1/webhooks/${id}`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) { const error = await response.json().catch(() => ({ detail: 'Failed to update webhook' })); throw new Error(error.detail || 'Failed to update webhook'); }
  return response.json();
}

export async function deleteWebhook(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/v1/webhooks/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete webhook');
}

export async function testWebhook(id: number): Promise<TestWebhookResponse> {
  const response = await fetch(`${API_URL}/v1/webhooks/${id}/test`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!response.ok) { const error = await response.json().catch(() => ({ detail: 'Failed to test webhook' })); throw new Error(error.detail || 'Failed to test webhook'); }
  return response.json();
}

export async function getWebhookDeliveries(id: number): Promise<WebhookDelivery[]> {
  const response = await fetch(`${API_URL}/v1/webhooks/${id}/deliveries`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get webhook deliveries');
  const data = await response.json();
  return data.deliveries || data;
}

export async function retryWebhookDelivery(webhookId: number, deliveryId: number): Promise<WebhookDelivery> {
  const response = await fetch(`${API_URL}/v1/webhooks/${webhookId}/deliveries/${deliveryId}/retry`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to retry webhook delivery');
  return response.json();
}

// LinkedIn Functions (Real Implementation)
export async function connectLinkedIn(): Promise<string> {
  const response = await fetch(`${API_URL}/api/linkedin/oauth/start`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to initiate LinkedIn OAuth: ${response.statusText}`);
  }

  const data = await response.json();
  return data.auth_url;
}

export async function handleLinkedInCallback(code: string, state: string): Promise<LinkedInProfile> {
  const response = await fetch(`${API_URL}/api/linkedin/oauth/callback`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ code, state }),
  });

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

  const response = await fetch(`${API_URL}/api/linkedin/profile`, {
    method: 'GET',
    headers: {
      ...getHeaders(),
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch LinkedIn profile: ${response.statusText}`);
  }

  return await response.json();
}

export async function fetchGitHubRepositories(): Promise<GitHubRepository[]> {
  const response = await fetch(`${API_URL}/api/github/repositories`, {
    method: 'GET',
    headers: getHeaders(),
  });

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
    await fetch(`${API_URL}/api/linkedin/disconnect`, {
      method: 'POST',
      headers: getHeaders(),
    });
  } catch (error) {
    console.warn('Failed to notify backend of disconnect:', error);
  }
}

// Salary Research Functions (Stubs)
export async function researchSalary(request: SalaryResearchRequest): Promise<SalaryResearchResponse> {
  // Mock response
  return {
    jobTitle: request.jobTitle,
    location: request.location,
    salaryRange: { min: 100000, max: 150000, median: 125000, currency: 'USD' },
    experienceLevel: request.experienceLevel,
    factors: { location: 'High', industry: 'Tech', experience: 'Mid', education: 'Bachelor' },
    insights: [],
    recommendations: []
  };
}

export async function createOffer(offer: any): Promise<JobOffer> {
  return { ...offer, id: Math.random(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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

export async function compareOffers(offerIds: number[], priorities?: ComparisonPriority): Promise<OfferComparison> {
  return {
    offers: [],
    scores: [] as OfferScore[],
    winnerId: 0,
    insights: []
  };
}

export async function getDefaultPriorities(): Promise<ComparisonPriority> {
  return { salary: 1, growth: 1, workLifeBalance: 1, culture: 1, benefits: 1 };
}

export async function updatePriorities(priorities: ComparisonPriority): Promise<ComparisonPriority> {
  return priorities;
}

// Job Application Types
export type ApplicationStatus = 'draft' | 'applied' | 'screening' | 'interviewing' | 'offer' | 'accepted' | 'rejected' | 'withdrawn';

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
  resume_id?: number;
  notes?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface JobApplicationCreate {
  company_name: string;
  job_title: string;
  job_url?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  resume_id?: number;
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
  const response = await fetch(`${API_URL}/v1/applications`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(app),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create application' }));
    throw new Error(error.detail || 'Failed to create application');
  }
  return response.json();
}

export async function listJobApplications(status?: ApplicationStatus, limit = 50, offset = 0): Promise<JobApplication[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  
  const response = await fetch(`${API_URL}/v1/applications?${params}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to list applications');
  return response.json();
}

export async function getJobApplication(id: number): Promise<JobApplication> {
  const response = await fetch(`${API_URL}/v1/applications/${id}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get application');
  return response.json();
}

export async function updateJobApplication(id: number, updates: JobApplicationUpdate): Promise<JobApplication> {
  const response = await fetch(`${API_URL}/v1/applications/${id}`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update application');
  return response.json();
}

export async function deleteJobApplication(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/v1/applications/${id}`, { method: 'DELETE', headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to delete application');
}

export async function getApplicationStats(days = 30): Promise<ApplicationStats> {
  const response = await fetch(`${API_URL}/v1/applications/analytics/stats?days=${days}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get application stats');
  return response.json();
}

export async function getApplicationFunnel(days = 30): Promise<ApplicationFunnel> {
  const response = await fetch(`${API_URL}/v1/applications/analytics/funnel?days=${days}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get application funnel');
  return response.json();
}

export async function getApplicationTimeline(days = 30): Promise<ApplicationTimeline> {
  const response = await fetch(`${API_URL}/v1/applications/analytics/timeline?days=${days}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get application timeline');
  return response.json();
}

export async function getUpcomingEvents(days = 7): Promise<UpcomingEvent[]> {
  const response = await fetch(`${API_URL}/v1/applications/analytics/upcoming?days=${days}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get upcoming events');
  const data = await response.json();
  return data.events || [];
}

// Team Management API Functions

export interface CreateTeamPayload {
  name: string;
  description?: string;
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string;
}

export interface InviteMemberPayload {
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'member';
}

export async function getTeams(): Promise<any[]> {
  const response = await fetch(`${API_URL}/v1/teams`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get teams');
  return response.json();
}

export async function getTeam(teamId: number): Promise<any> {
  const response = await fetch(`${API_URL}/v1/teams/${teamId}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get team');
  return response.json();
}

export async function createTeam(payload: CreateTeamPayload): Promise<any> {
  const response = await fetch(`${API_URL}/v1/teams`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create team');
  return response.json();
}

export async function updateTeam(teamId: number, payload: UpdateTeamPayload): Promise<any> {
  const response = await fetch(`${API_URL}/v1/teams/${teamId}`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update team');
  return response.json();
}

export async function deleteTeam(teamId: number): Promise<void> {
  const response = await fetch(`${API_URL}/v1/teams/${teamId}`, { method: 'DELETE', headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to delete team');
}

export async function getTeamMembers(teamId: number): Promise<any[]> {
  const response = await fetch(`${API_URL}/v1/teams/${teamId}/members`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get team members');
  return response.json();
}

export async function inviteMember(teamId: number, payload: InviteMemberPayload): Promise<any> {
  const response = await fetch(`${API_URL}/v1/teams/${teamId}/members/invite`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to invite member');
  return response.json();
}

export async function updateMemberRole(teamId: number, userId: string, role: 'owner' | 'admin' | 'editor' | 'viewer'): Promise<any> {
  const response = await fetch(`${API_URL}/v1/teams/${teamId}/members/${userId}`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error('Failed to update member role');
  return response.json();
}

export async function removeMember(teamId: number, userId: string): Promise<void> {
  const response = await fetch(`${API_URL}/v1/teams/${teamId}/members/${userId}`, { method: 'DELETE', headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to remove member');
}

export async function getTeamActivity(teamId: number): Promise<any[]> {
  const response = await fetch(`${API_URL}/v1/teams/${teamId}/activity`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get team activity');
  return response.json();
}

export async function shareResumeWithTeam(teamId: number, resumeId: string, permissions: 'view' | 'edit' | 'comment'): Promise<any> {
  const response = await fetch(`${API_URL}/v1/teams/${teamId}/resumes`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_id: resumeId, permissions }),
  });
  if (!response.ok) throw new Error('Failed to share resume');
  return response.json();
}

export async function unshareResumeFromTeam(teamId: number, resumeId: string): Promise<void> {
  const response = await fetch(`${API_URL}/v1/teams/${teamId}/resumes/${resumeId}`, { method: 'DELETE', headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to unshare resume');
}
