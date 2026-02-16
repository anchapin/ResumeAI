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
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Get API key from localStorage
 */
function getAPIKey(): string | null {
  return localStorage.getItem('RESUMEAI_API_KEY');
}

/**
 * Get common headers
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const apiKey = getAPIKey();
  if (apiKey) {
    headers['X-API-KEY'] = apiKey;
  }
  return headers;
}

// ============ PDF Generation ============

/**
 * Resume data for PDF generation (API format)
 */
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
  skills?: Array<{
    name?: string;
    keywords?: string[];
  }>;
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

/**
 * Convert SimpleResumeData to API format
 */
export function convertToAPIData(resumeData: SimpleResumeData): ResumeDataForAPI {
  return {
    basics: {
      name: resumeData.name,
      email: resumeData.email,
      phone: resumeData.phone,
      summary: resumeData.summary,
      location: { city: resumeData.location },
    },
    work: resumeData.experience.map(exp => ({
      company: exp.company,
      position: exp.role,
      startDate: exp.startDate,
      endDate: exp.endDate,
      summary: exp.description,
    })),
    education: resumeData.education.map(edu => ({
      institution: edu.institution,
      area: edu.area,
      studyType: edu.studyType,
      startDate: edu.startDate,
      endDate: edu.endDate,
      courses: edu.courses,
    })),
    skills: resumeData.skills.map(skill => ({ name: skill })),
    projects: resumeData.projects.map(proj => ({
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

/**
 * Generate PDF from resume data
 */
export async function generatePDF(
  resumeData: ResumeDataForAPI,
  variant: string = 'modern'
): Promise<Blob> {
  const response = await fetch(`${API_URL}/v1/render/pdf`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_data: resumeData, variant }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'PDF generation failed' }));
    throw new Error(error.detail || 'Failed to generate PDF');
  }

  return response.blob();
}

// ============ Template Variants ============

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

/**
 * Fetch available template variants
 */
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

// ============ Resume Tailoring ============

export interface TailoredResumeResponse {
  resume_data: ResumeDataForAPI;
  keywords: string[];
  suggestions: string[];
}

/**
 * Tailor resume to job description
 */
export async function tailorResume(
  resumeData: ResumeDataForAPI,
  jobDescription: string,
  companyName?: string,
  jobTitle?: string
): Promise<TailoredResumeResponse> {
  const response = await fetch(`${API_URL}/v1/tailor`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resume_data: resumeData,
      job_description: jobDescription,
      company_name: companyName,
      job_title: jobTitle,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Resume tailoring failed' }));
    throw new Error(error.detail || 'Failed to tailor resume');
  }

  return response.json();
}

// ============ Resume CRUD ============

export async function createResume(
  title: string,
  data: ResumeData,
  tags: string[] = []
): Promise<any> {
  const response = await fetch(`${API_URL}/resumes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ title, data, tags }),
  });

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

  const response = await fetch(`${API_URL}/resumes?${params}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to list resumes');
  return response.json();
}

export async function getResume(resumeId: number): Promise<any> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get resume');
  return response.json();
}

export async function updateResume(
  resumeId: number,
  updates: { title?: string; data?: ResumeData; tags?: string[]; change_description?: string; }
): Promise<any> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update resume');
  return response.json();
}

export async function deleteResume(resumeId: number): Promise<void> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}`, { method: 'DELETE', headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to delete resume');
}

// ============ Versioning ============

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

// ============ Comments ============

export async function listComments(resumeId: number): Promise<Comment[]> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/comments`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to list comments');
  return response.json();
}

export async function createComment(
  resumeId: number,
  comment: { author_name: string; author_email: string; content: string; section?: string; }
): Promise<Comment> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/comments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(comment),
  });
  if (!response.ok) throw new Error('Failed to create comment');
  return response.json();
}

export async function resolveComment(commentId: number): Promise<Comment> {
  const response = await fetch(`${API_URL}/comments/${commentId}/resolve`, { method: 'PATCH', headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to resolve comment');
  return response.json();
}

// ============ Sharing ============

export async function shareResume(
  resumeId: number,
  options: { permissions?: 'view' | 'comment' | 'edit'; expires_at?: string; max_views?: number; password?: string; }
): Promise<ShareLink> {
  const response = await fetch(`${API_URL}/resumes/${resumeId}/share`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(options),
  });
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

// ============ Bulk Operations ============

export async function bulkOperation(
  resumeIds: number[],
  operation: 'delete' | 'export' | 'duplicate' | 'tag',
  options?: { tags?: string[]; export_format?: string; }
): Promise<{ successful: number[]; failed: Array<{ id: number; error: string }> }> {
  const response = await fetch(`${API_URL}/resumes/bulk`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ resume_ids: resumeIds, operation, tags: options?.tags, export_format: options?.export_format }),
  });
  if (!response.ok) throw new Error('Failed to perform bulk operation');
  return response.json();
}

// ============ User Settings ============

export async function getUserSettings(userIdentifier: string): Promise<UserSettings> {
  const response = await fetch(`${API_URL}/settings/${userIdentifier}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to get settings');
  return response.json();
}

export async function updateUserSettings(userIdentifier: string, settings: Partial<UserSettings>): Promise<UserSettings> {
  const response = await fetch(`${API_URL}/settings/${userIdentifier}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error('Failed to update settings');
  return response.json();
}

// ============ PDF Generation ============

/**
 * Resume data for PDF generation (API format)
 */
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
  skills?: Array<{
    name?: string;
    keywords?: string[];
  }>;
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

/**
 * Convert SimpleResumeData to API format
 */
export function convertToAPIData(resumeData: SimpleResumeData): ResumeDataForAPI {
  return {
    basics: {
      name: resumeData.name,
      email: resumeData.email,
      phone: resumeData.phone,
      summary: resumeData.summary,
      location: {
        city: resumeData.location,
      },
    },
    work: resumeData.experience.map(exp => ({
      company: exp.company,
      position: exp.role,
      startDate: exp.startDate,
      endDate: exp.endDate,
      summary: exp.description,
    })),
    education: resumeData.education.map(edu => ({
      institution: edu.institution,
      area: edu.area,
      studyType: edu.studyType,
      startDate: edu.startDate,
      endDate: edu.endDate,
      courses: edu.courses,
    })),
    skills: resumeData.skills.map(skill => ({ name: skill })),
    projects: resumeData.projects.map(proj => ({
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

/**
 * Generate PDF from resume data
 */
export async function generatePDF(
  resumeData: ResumeDataForAPI,
  variant: string = 'modern'
): Promise<Blob> {
  const response = await fetch(`${API_URL}/v1/render/pdf`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resume_data: resumeData,
      variant,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'PDF generation failed' }));
    throw new Error(error.detail || 'Failed to generate PDF');
  }

  return response.blob();
}

// ============ Template Variants ============

/**
 * Variant metadata from API
 */
export interface VariantMetadata {
  name: string;
  display_name: string;
  description: string;
  category: string;
  style: string;
  features: string[];
  recommended_for: string[];
  color_schemes: Array<{
    name: string;
    primary: number[];
    accent: number[];
    secondary: number[];
  }>;
}

/**
 * Response from variants API
 */
export interface VariantsResponse {
  variants: VariantMetadata[];
}

/**
 * Fetch available template variants
 */
export async function getVariants(filters?: {
  search?: string;
  category?: string;
  tags?: string[];
}): Promise<VariantMetadata[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.tags) params.append('tags', filters.tags.join(','));

  const response = await fetch(`${API_URL}/v1/variants?${params}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch variants');
  }

  const data: VariantsResponse = await response.json();
  return data.variants;
}

// ============ Resume Tailoring ============

/**
 * Request body for tailoring
 */
export interface TailorRequest {
  resume_data: ResumeDataForAPI;
  job_description: string;
  company_name?: string;
  job_title?: string;
}

/**
 * Response from tailoring API
 */
export interface TailoredResumeResponse {
  resume_data: ResumeDataForAPI;
  keywords: string[];
  suggestions: string[];
}

/**
 * Tailor resume to job description
 */
export async function tailorResume(
  resumeData: ResumeDataForAPI,
  jobDescription: string,
  companyName?: string,
  jobTitle?: string
): Promise<TailoredResumeResponse> {
  const response = await fetch(`${API_URL}/v1/tailor`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resume_data: resumeData,
      job_description: jobDescription,
      company_name: companyName,
      job_title: jobTitle,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Resume tailoring failed' }));
    throw new Error(error.detail || 'Failed to tailor resume');
  }

  return response.json();
}
