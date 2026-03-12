/* eslint-disable complexity */
/**
 * Resume Import Dialog Helper Functions
 *
 * Extracted helper functions for data transformation, validation, and OAuth handling.
 * This module reduces complexity in ResumeImportDialog.tsx by separating concerns
 * and providing reusable, testable logic.
 */

import { SimpleResumeData, GitHubRepository, LinkedInProfile } from '../types';
import { showErrorToast } from '../utils/toast';

// ============================================================================
// OAuth Resource Cleanup
// ============================================================================

export interface OAuthRefs {
  current: ReturnType<typeof setInterval> | null;
}

/**
 * Cleanup OAuth resources (interval, event listener, popup window)
 * Prevents memory leaks and dangling references.
 */
export const cleanupOAuthResources = (
  oauthCheckIntervalRef: OAuthRefs,
  messageHandlerRef: { current: ((event: MessageEvent) => void) | null },
  oauthWindow: Window | null,
) => {
  if (oauthCheckIntervalRef.current) {
    clearInterval(oauthCheckIntervalRef.current);
    oauthCheckIntervalRef.current = null;
  }
  if (messageHandlerRef.current) {
    window.removeEventListener('message', messageHandlerRef.current);
    messageHandlerRef.current = null;
  }
  if (oauthWindow && !oauthWindow.closed) {
    oauthWindow.close();
  }
};

// ============================================================================
// OAuth Event Handling
// ============================================================================

/**
 * Setup the message listener for OAuth completion
 * Validates origin for security and routes to success/error handlers
 */
export const setupOAuthMessageListener = (
  onSuccess: (code: string, state: string) => void,
  onError: (error: string) => void,
): ((event: MessageEvent) => void) => {
  return (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;

    if (event.data.type === 'LINKEDIN_OAUTH_SUCCESS') {
      onSuccess(event.data.code, event.data.state);
    } else if (event.data.type === 'LINKEDIN_OAUTH_ERROR') {
      onError(event.data.error);
    }
  };
};

/**
 * Setup popup close detection and cleanup
 * Monitors OAuth popup and cleans up resources when closed
 */
export const setupOAuthPopupCheck = (
  popup: Window,
  messageHandler: (event: MessageEvent) => void,
  oauthCheckIntervalRef: OAuthRefs,
  messageHandlerRef: { current: ((event: MessageEvent) => void) | null },
  linkedInConnected: boolean,
) => {
  oauthCheckIntervalRef.current = setInterval(() => {
    if (popup.closed) {
      if (oauthCheckIntervalRef.current) {
        clearInterval(oauthCheckIntervalRef.current);
        oauthCheckIntervalRef.current = null;
      }
      window.removeEventListener('message', messageHandler);
      messageHandlerRef.current = null;
      if (!linkedInConnected) {
        showErrorToast('OAuth window was closed');
      }
    }
  }, 500);
};

// ============================================================================
// Data Transformation Helpers
// ============================================================================

/**
 * Transform LinkedIn experience to resume format
 */
const buildLinkedInExperience = (linkedInProfile: LinkedInProfile | null) =>
  linkedInProfile?.experience?.map((exp, idx) => ({
    id: `li-exp-${idx}`,
    company: exp.company || '',
    role: exp.title || '',
    startDate: exp.startDate || '',
    endDate: exp.endDate || '',
    current: exp.current || !exp.endDate,
    description: exp.description || '',
    tags: [],
  })) || [];

/**
 * Transform LinkedIn education to resume format
 */
const buildLinkedInEducation = (linkedInProfile: LinkedInProfile | null) =>
  linkedInProfile?.education?.map((edu, idx) => ({
    id: `li-edu-${idx}`,
    institution: edu.institution || '',
    area: edu.field || '',
    studyType: edu.degree || '',
    startDate: edu.startDate || '',
    endDate: edu.endDate || '',
    courses: [],
  })) || [];

/**
 * Build import data from LinkedIn OAuth profile
 * Maps profile fields to resume data structure
 */
export const buildLinkedInImportData = (
  profile: {
    name: string;
    email: string;
    phone: string;
    location: string;
    role: string;
    summary: string;
    skills: string[];
  },
  linkedInProfile: LinkedInProfile | null,
  projects: Partial<SimpleResumeData>['projects'],
): Partial<SimpleResumeData> => ({
  name: profile.name,
  email: profile.email,
  phone: profile.phone,
  location: profile.location,
  role: profile.role,
  summary: profile.summary,
  skills: profile.skills,
  experience: buildLinkedInExperience(linkedInProfile),
  education: buildLinkedInEducation(linkedInProfile),
  projects,
});

/**
 * Build import data from resume file (PDF/DOCX)
 * Extracts and structures resume data
 */
export const buildResumeFileImportData = (resumeData: any): Partial<SimpleResumeData> => ({
  name: resumeData.basics?.name || '',
  email: resumeData.basics?.email || '',
  phone: resumeData.basics?.phone || '',
  location: resumeData.location?.city || resumeData.location?.region || '',
  role: resumeData.basics?.label || '',
  summary: resumeData.basics?.summary || '',
  skills: resumeData.skills?.map((s: any) => s.name || '').filter(Boolean) || [],
  experience:
    resumeData.work?.map((work: any) => ({
      id: generateId(),
      company: work.company || '',
      role: work.position || '',
      startDate: work.startDate || '',
      endDate: work.endDate || '',
      current: !work.endDate,
      description: work.summary || '',
      tags: [],
    })) || [],
  education:
    resumeData.education?.map((edu: any) => ({
      id: generateId(),
      institution: edu.institution || '',
      area: edu.area || '',
      studyType: edu.studyType || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || '',
      courses: edu.courses || [],
    })) || [],
  projects:
    resumeData.projects?.map((proj: any) => ({
      id: generateId(),
      name: proj.name || '',
      description: proj.description || '',
      url: proj.url || '',
      roles: proj.roles || [],
      startDate: proj.startDate || '',
      endDate: proj.endDate || '',
      highlights: proj.highlights || [],
    })) || [],
});

/**
 * Build import data from LinkedIn export file
 * Same structure as resume file data
 */
export const buildLinkedInFileImportData = (resumeData: any): Partial<SimpleResumeData> => {
  return buildResumeFileImportData(resumeData);
};

/**
 * Build GitHub project data for import
 * Maps GitHub repo to resume project structure
 */
export const buildGithubProjectData = (
  repoId: number,
  githubRepos: GitHubRepository[],
): Partial<SimpleResumeData>['projects'][0] => {
  const repo = githubRepos.find((r) => r.id === repoId);
  return {
    id: `gh-${repoId}`,
    name: repo?.name || '',
    description: repo?.description || '',
    url: repo?.url || '',
    roles: repo?.languages || [],
    startDate: '',
    endDate: '',
    highlights: repo?.topics || [],
  };
};

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate resume file (PDF/DOCX)
 * Returns error message if invalid, null if valid
 */
export const validateResumeFile = (file: File): string | null => {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc') {
    return 'Please select a valid PDF or Word document.';
  }
  return null;
};

/**
 * Validate file import (LinkedIn export)
 * Checks file types and sizes
 * Returns error message if invalid, null if valid
 */
export const validateFileImport = (fileList: File[]): string | null => {
  if (fileList.length === 1) {
    const file = fileList[0];
    const isJson = file.type === 'application/json' || file.name.endsWith('.json');
    const isZip =
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed' ||
      file.name.endsWith('.zip');
    const isCsv = file.name.endsWith('.csv');

    if (!isJson && !isZip && !isCsv) {
      return 'Please select a valid file (JSON, ZIP) or a folder of CSVs.';
    }

    const maxSize = isZip ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return `File size exceeds ${maxSize / (1024 * 1024)}MB limit.`;
    }
  } else {
    let totalSize = 0;
    for (const f of fileList) totalSize += f.size;
    if (totalSize > 20 * 1024 * 1024) {
      return 'Total upload size exceeds 20MB limit.';
    }

    const hasCsv = fileList.some((f) => f.name.toLowerCase().endsWith('.csv'));
    if (!hasCsv) {
      return 'Selected files do not contain any CSV files.';
    }
  }

  return null;
};

// ============================================================================
// Utility Helpers
// ============================================================================

/**
 * Generate a random ID for imported entities
 * Uses same pattern as original code for consistency
 */
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};
