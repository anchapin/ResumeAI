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

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

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
  const response = await fetch(`${API_URL}/v1/render/pdf`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_data: resumeData, variant }),
  });
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
  const response = await fetch(`${API_URL}/v1/variants?${params}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch variants');
  const data: VariantsResponse = await response.json();
  return data.variants;
}

export interface TailoredResumeResponse { resume_data: ResumeDataForAPI; keywords: string[]; suggestions: string[]; }

export async function tailorResume(resumeData: ResumeDataForAPI, jobDescription: string, companyName?: string, jobTitle?: string): Promise<TailoredResumeResponse> {
  const response = await fetch(`${API_URL}/v1/tailor`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_data: resumeData, job_description: jobDescription, company_name: companyName, job_title: jobTitle }),
  });
  if (!response.ok) { const error = await response.json().catch(() => ({ detail: 'Resume tailoring failed' })); throw new Error(error.detail || 'Failed to tailor resume'); }
  return response.json();
}

export async function createResume(title: string, data: ResumeData, tags: string[] = []): Promise<any> {
  const response = await fetch(`${API_URL}/resumes`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ title, data, tags }) });
  if (!response.ok) throw new Error('Failed to create resume');
  return response.json();
}

export async function listResumes(filters?: { search?: string; tag?: string; skip?: number; limit?: number; }): Promise<ResumeMetadata[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.tag) params.append('tag', filters.tag);
  if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
  if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
  const response = await fetch(`${API_URL}/resumes?${params}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to list resumes');
  return response.json();
}

export async function getResume(resumeId: number): Promise<any> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get resume');
  return response.json();
}

export async function updateResume(resumeId: number, updates: { title?: string; data?: ResumeData; tags?: string[]; change_description?: string; }): Promise<any> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(updates) });
  if (!response.ok) throw new Error('Failed to update resume');
  return response.json();
}

export async function deleteResume(resumeId: number): Promise<void> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}`, { method: 'DELETE', headers: getHeaders() });
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
  const response = await fetch(`${API_URL}/v1/ats/check`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_data: resumeData, job_description: jobDescription }),
  });
  if (!response.ok) { const error = await response.json().catch(() => ({ detail: 'ATS check failed' })); throw new Error(error.detail || 'Failed to check ATS score'); }
  return response.json();
}

// LinkedIn Integration API Functions

/**
 * Initiate LinkedIn OAuth flow
 * Opens a popup window for user authentication
 */
export async function connectLinkedIn(): Promise<string> {
  const response = await fetch(`${API_URL}/linkedin/connect`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to initiate LinkedIn connection' }));
    throw new Error(error.detail || 'Failed to connect to LinkedIn');
  }
  const data = await response.json();
  return data.auth_url;
}

/**
 * Handle LinkedIn OAuth callback
 * Exchanges authorization code for access token
 */
export async function handleLinkedInCallback(code: string, state: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch(`${API_URL}/linkedin/callback`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'OAuth callback failed' }));
    throw new Error(error.detail || 'Failed to complete OAuth');
  }
  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  };
}

/**
 * Import LinkedIn profile data
 * Fetches and parses user's LinkedIn profile
 */
export async function importLinkedInProfile(): Promise<LinkedInProfile> {
  const response = await fetch(`${API_URL}/linkedin/profile`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to import LinkedIn profile' }));
    throw new Error(error.detail || 'Failed to import LinkedIn profile');
  }
  return response.json();
}

/**
 * Fetch GitHub repositories linked to LinkedIn profile
 * Returns list of repositories for project selection
 */
export async function fetchGitHubRepositories(): Promise<GitHubRepository[]> {
  const response = await fetch(`${API_URL}/linkedin/projects`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch GitHub repositories' }));
    throw new Error(error.detail || 'Failed to fetch GitHub repositories');
  }
  return response.json();
}

/**
 * Disconnect LinkedIn account
 * Revokes access token and clears connection
 */
export async function disconnectLinkedIn(): Promise<void> {
  const response = await fetch(`${API_URL}/linkedin/disconnect`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to disconnect LinkedIn' }));
    throw new Error(error.detail || 'Failed to disconnect LinkedIn');
  }
}

// Salary Research & Offer Comparison API Functions

/**
 * Research salary based on job title, location, and company
 * Returns salary range, insights, and recommendations
 */
export async function researchSalary(request: SalaryResearchRequest): Promise<SalaryResearchResponse> {
  const response = await fetch(`${API_URL}/api/salary/research`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Salary research failed' }));
    throw new Error(error.detail || 'Failed to research salary');
  }
  return response.json();
}

/**
 * Create a new job offer
 */
export async function createOffer(offer: Omit<JobOffer, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobOffer> {
  const response = await fetch(`${API_URL}/api/salary/offers`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(offer),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create offer' }));
    throw new Error(error.detail || 'Failed to create offer');
  }
  return response.json();
}

/**
 * Update an existing job offer
 */
export async function updateOffer(offerId: number, updates: Partial<JobOffer>): Promise<JobOffer> {
  const response = await fetch(`${API_URL}/api/salary/offers/${offerId}`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to update offer' }));
    throw new Error(error.detail || 'Failed to update offer');
  }
  return response.json();
}

/**
 * Delete a job offer
 */
export async function deleteOffer(offerId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/salary/offers/${offerId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to delete offer' }));
    throw new Error(error.detail || 'Failed to delete offer');
  }
}

/**
 * List all job offers
 */
export async function listOffers(filters?: { status?: string; sortBy?: string }): Promise<JobOffer[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.sortBy) params.append('sort_by', filters.sortBy);

  const response = await fetch(`${API_URL}/api/salary/offers?${params}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to list offers' }));
    throw new Error(error.detail || 'Failed to list offers');
  }
  return response.json();
}

/**
 * Compare multiple job offers with weighted scoring
 * Returns scored comparison with recommendations
 */
export async function compareOffers(offerIds: number[], priorities?: ComparisonPriority): Promise<OfferComparison> {
  const response = await fetch(`${API_URL}/api/salary/offers/compare`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offer_ids: offerIds,
      priorities: priorities,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to compare offers' }));
    throw new Error(error.detail || 'Failed to compare offers');
  }
  return response.json();
}

/**
 * Update comparison priorities
 */
export async function updatePriorities(priorities: ComparisonPriority): Promise<ComparisonPriority> {
  const response = await fetch(`${API_URL}/api/salary/offers/priorities`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(priorities),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to update priorities' }));
    throw new Error(error.detail || 'Failed to update priorities');
  }
  return response.json();
}

/**
 * Get default comparison priorities
 */
export async function getDefaultPriorities(): Promise<ComparisonPriority> {
  const response = await fetch(`${API_URL}/api/salary/offers/priorities/default`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get default priorities' }));
    throw new Error(error.detail || 'Failed to get default priorities');
  }
  return response.json();
}

