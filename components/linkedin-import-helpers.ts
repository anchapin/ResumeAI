import { showErrorToast } from '../utils/toast';
import { LinkedInProfile, GitHubRepository, SimpleResumeData, ResumeData } from '../types';

/**
 * OAuth resource cleanup - extracted to reduce component complexity
 */
export const cleanupOAuthResources = (
  intervalRef: { current: ReturnType<typeof setInterval> | null },
  handlerRef: { current: ((event: MessageEvent) => void) | null },
  windowRef: Window | null,
): void => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  if (handlerRef.current) {
    window.removeEventListener('message', handlerRef.current);
    handlerRef.current = null;
  }
  if (windowRef && !windowRef.closed) {
    windowRef.close();
  }
};

/**
 * Type for OAuth handlers that component provides
 */
export interface OAuthHandlers {
  onSuccess: (code: string, state: string) => void;
  onError: (error: string) => void;
}

/**
 * Create OAuth message handler - extracted to reduce component complexity
 */
export const createOAuthMessageHandler = (handlers: OAuthHandlers) => {
  return (event: MessageEvent) => {
    // Early return for cross-origin messages
    if (event.origin !== window.location.origin) return;

    // Route message based on type
    if (event.data.type === 'LINKEDIN_OAUTH_SUCCESS') {
      handlers.onSuccess(event.data.code, event.data.state);
    } else if (event.data.type === 'LINKEDIN_OAUTH_ERROR') {
      handlers.onError(event.data.error);
    }
  };
};

/**
 * Setup OAuth popup monitoring - extracted to reduce component complexity
 */
export const setupPopupMonitor = (
  popup: Window,
  intervalRef: { current: ReturnType<typeof setInterval> | null },
  handlerRef: { current: ((event: MessageEvent) => void) | null },
  onCloseWithoutConnection: () => void,
): void => {
  intervalRef.current = setInterval(() => {
    if (popup.closed) {
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Remove listener
      if (handlerRef.current) {
        window.removeEventListener('message', handlerRef.current);
        handlerRef.current = null;
      }
      // Notify if not connected
      onCloseWithoutConnection();
    }
  }, 500);
};

/**
 * Populate edited form fields from LinkedIn profile
 */
export const populateFormFieldsFromProfile = (
  profile: LinkedInProfile,
  setEditedName: (name: string) => void,
  setEditedEmail: (email: string) => void,
  setEditedPhone: (phone: string) => void,
  setEditedLocation: (location: string) => void,
  setEditedRole: (role: string) => void,
  setEditedSummary: (summary: string) => void,
  setEditedSkills: (skills: string[]) => void,
): void => {
  const fullName = profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
  setEditedName(fullName);
  setEditedEmail(profile.email || profile.emailAddress || '');
  setEditedPhone(profile.phone || '');
  setEditedLocation(profile.location || '');
  setEditedRole(profile.headline || '');
  setEditedSummary(profile.summary || '');

  const skills = profile.skills || [];
  setEditedSkills(Array.isArray(skills) ? skills : []);
};

/**
 * File type detection utilities for LinkedIn import
 */

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  isSingleFile: boolean;
  isJson: boolean;
  isZip: boolean;
  isCsv: boolean;
  maxSize: number;
}

/**
 * Check if a file is a valid JSON file
 */
export const isJsonFile = (file: File): boolean => {
  return file.type === 'application/json' || file.name.endsWith('.json');
};

/**
 * Check if a file is a valid ZIP file
 */
export const isZipFile = (file: File): boolean => {
  return (
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    file.name.endsWith('.zip')
  );
};

/**
 * Check if a file is a CSV file
 */
export const isCsvFile = (file: File): boolean => {
  return file.name.toLowerCase().endsWith('.csv');
};

/**
 * Get the maximum allowed file size based on file type
 */
export const getMaxFileSize = (isZip: boolean): number => {
  return isZip ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
};

/**
 * Validate a single file for import
 * Returns validation result with error message if invalid
 */
export const validateSingleFile = (file: File): FileValidationResult => {
  const isJson = isJsonFile(file);
  const isZip = isZipFile(file);
  const isCsv = isCsvFile(file);

  if (!isJson && !isZip && !isCsv) {
    return {
      isValid: false,
      error: 'Please select a valid file (JSON, ZIP) or a folder of CSVs.',
      isSingleFile: true,
      isJson: false,
      isZip: false,
      isCsv: false,
      maxSize: 0,
    };
  }

  const maxSize = getMaxFileSize(isZip);
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit.`,
      isSingleFile: true,
      isJson,
      isZip,
      isCsv,
      maxSize,
    };
  }

  return {
    isValid: true,
    isSingleFile: true,
    isJson,
    isZip,
    isCsv,
    maxSize,
  };
};

/**
 * Validate multiple files for import (e.g., folder upload)
 * Returns validation result with error message if invalid
 */
export const validateMultipleFiles = (files: File[]): FileValidationResult => {
  let totalSize = 0;
  for (const f of files) {
    totalSize += f.size;
  }

  if (totalSize > 20 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'Total upload size exceeds 20MB limit.',
      isSingleFile: false,
      isJson: false,
      isZip: false,
      isCsv: false,
      maxSize: 20 * 1024 * 1024,
    };
  }

  const hasCsv = files.some((f) => isCsvFile(f));
  if (!hasCsv) {
    return {
      isValid: false,
      error: 'Selected files do not contain any CSV files.',
      isSingleFile: false,
      isJson: false,
      isZip: false,
      isCsv: false,
      maxSize: 20 * 1024 * 1024,
    };
  }

  return {
    isValid: true,
    isSingleFile: false,
    isJson: false,
    isZip: false,
    isCsv: true,
    maxSize: 20 * 1024 * 1024,
  };
};

/**
 * Validate files for import - handles both single and multiple file cases
 * Shows error toast if validation fails
 * @returns true if validation passes, false otherwise
 */
export const validateFilesForImport = (files: File | FileList): boolean => {
  const fileList =
    files instanceof FileList
      ? Array.from(files)
      : Array.isArray(files)
        ? files
        : [files];

  if (fileList.length === 0) {
    return false;
  }

  if (fileList.length === 1) {
    const result = validateSingleFile(fileList[0]);
    if (!result.isValid && result.error) {
      showErrorToast(result.error);
      return false;
    }
  } else {
    const result = validateMultipleFiles(fileList);
    if (!result.isValid && result.error) {
      showErrorToast(result.error);
      return false;
    }
  }

  return true;
};

/**
 * Convert FileList to array
 */
export const normalizeFileList = (files: File | FileList): File[] => {
  return files instanceof FileList
    ? Array.from(files)
    : Array.isArray(files)
      ? files
      : [files];
};

// ============================================
// Data transformation functions for LinkedIn import
// ============================================

/**
 * Transform LinkedIn experience data to SimpleResumeData format
 */
export const transformExperience = (
  experience: LinkedInProfile['experience'],
): SimpleResumeData['experience'] => {
  if (!experience) return [];
  return experience.map((exp, idx) => ({
    id: `li-exp-${idx}`,
    company: exp.company || '',
    role: exp.title || '',
    startDate: exp.startDate || '',
    endDate: exp.endDate || '',
    current: exp.current || !exp.endDate,
    description: exp.description || '',
    tags: [],
  }));
};

/**
 * Transform LinkedIn education data to SimpleResumeData format
 */
export const transformEducation = (
  education: LinkedInProfile['education'],
): SimpleResumeData['education'] => {
  if (!education) return [];
  return education.map((edu, idx) => ({
    id: `li-edu-${idx}`,
    institution: edu.institution || '',
    area: edu.field || '',
    studyType: edu.degree || '',
    startDate: edu.startDate || '',
    endDate: edu.endDate || '',
    courses: [],
  }));
};

/**
 * Transform GitHub repositories to SimpleResumeData projects format
 */
export const transformProjects = (
  selectedRepoIds: number[],
  repos: GitHubRepository[],
): SimpleResumeData['projects'] => {
  return selectedRepoIds.map((repoId) => {
    const repo = repos.find((r) => r.id === repoId);
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
  });
};

/**
 * Build imported data object from OAuth flow
 */
export const buildImportedDataFromOAuth = (
  editedName: string,
  editedEmail: string,
  editedPhone: string,
  editedLocation: string,
  editedRole: string,
  editedSummary: string,
  editedSkills: string[],
  linkedInProfile: LinkedInProfile | null,
  selectedRepoIds: number[],
  githubRepos: GitHubRepository[],
): Partial<SimpleResumeData> => {
  return {
    name: editedName,
    email: editedEmail,
    phone: editedPhone,
    location: editedLocation,
    role: editedRole,
    summary: editedSummary,
    skills: editedSkills,
    experience: transformExperience(linkedInProfile?.experience || []),
    education: transformEducation(linkedInProfile?.education || []),
    projects: transformProjects(selectedRepoIds, githubRepos),
  };
};

/**
 * Transform resume data from file import to SimpleResumeData format
 */
export const transformFileImportData = (
  resumeData: ResumeData,
): Partial<SimpleResumeData> => {
  return {
    name: resumeData.basics?.name || '',
    email: resumeData.basics?.email || '',
    phone: resumeData.basics?.phone || '',
    location: resumeData.location?.city || resumeData.location?.region || '',
    role: resumeData.basics?.label || '',
    summary: resumeData.basics?.summary || '',
    skills: resumeData.skills?.map((s) => s.name || '').filter(Boolean) || [],
    experience:
      resumeData.work?.map((work) => ({
        id: Math.random().toString(36).substring(2, 9),
        company: work.company || '',
        role: work.position || '',
        startDate: work.startDate || '',
        endDate: work.endDate || '',
        current: !work.endDate,
        description: work.summary || '',
        tags: [],
      })) || [],
    education:
      resumeData.education?.map((edu) => ({
        id: Math.random().toString(36).substring(2, 9),
        institution: edu.institution || '',
        area: edu.area || '',
        studyType: edu.studyType || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        courses: edu.courses || [],
      })) || [],
    projects:
      resumeData.projects?.map((proj) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: proj.name || '',
        description: proj.description || '',
        url: proj.url || '',
        roles: proj.roles || [],
        startDate: proj.startDate || '',
        endDate: proj.endDate || '',
        highlights: proj.highlights || [],
      })) || [],
  };
};
