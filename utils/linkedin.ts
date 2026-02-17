/**
 * LinkedIn Import/Export Utility Functions
 * 
 * Provides functionality to import LinkedIn profile data and export resumes
 * in LinkedIn-compatible formats.
 */

import { ResumeData } from '../types';

/**
 * LinkedIn field mappings to internal resume format
 */
export const LINKEDIN_FIELD_MAPPINGS = {
  // Contact information
  firstName: 'first_name',
  lastName: 'last_name',
  headline: 'headline',
  locationName: 'location',
  industryName: 'industry',
  summary: 'summary',
  emailAddress: 'email',
  phoneNumbers: 'phones',
  
  // Experience
  positions: 'experience',
  
  // Education
  educations: 'education',
  
  // Skills
  skills: 'skills',
  
  // Languages
  languages: 'languages',
  
  // Certifications
  certifications: 'certifications',
  
  // Projects
  projects: 'projects',
};

/**
 * Import LinkedIn profile data from JSON export
 * @param linkedinData - Raw LinkedIn export data
 * @returns ResumeData compatible object
 */
export function importFromLinkedIn(linkedinData: any): Partial<ResumeData> {
  const result: Partial<ResumeData> = {};
  
  // Extract name
  if (linkedinData.firstName || linkedinData.lastName) {
    result.name = `${linkedinData.firstName || ''} ${linkedinData.lastName || ''}`.trim();
  }
  
  // Extract headline as role
  if (linkedinData.headline) {
    result.role = linkedinData.headline;
  }
  
  // Extract summary
  if (linkedinData.summary) {
    result.summary = linkedinData.summary;
  }
  
  // Extract email
  if (linkedinData.emailAddress) {
    result.email = linkedinData.emailAddress;
  }
  
  // Extract phone
  if (linkedinData.phoneNumbers && linkedinData.phoneNumbers.length > 0) {
    result.phone = linkedinData.phoneNumbers[0]?.phoneNumber || '';
  }
  
  // Extract location
  if (linkedinData.locationName) {
    result.location = linkedinData.locationName;
  }
  
  // Extract experience
  if (linkedinData.positions) {
    result.work = parseLinkedInPositions(linkedinData.positions);
  }
  
  // Extract education
  if (linkedinData.educations) {
    result.education = parseLinkedInEducation(linkedinData.educations);
  }
  
  // Extract skills
  if (linkedinData.skills) {
    result.skills = parseLinkedInSkills(linkedinData.skills);
  }
  
  // Extract languages
  if (linkedinData.languages) {
    result.languages = parseLinkedInLanguages(linkedinData.languages);
  }
  
  return result;
}

/**
 * Parse LinkedIn positions to work experience format
 */
function parseLinkedInPositions(positions: any[]): WorkExperience[] {
  if (!Array.isArray(positions)) return [];
  
  return positions.map((pos) => ({
    id: generateId(),
    company: pos.companyName || '',
    role: pos.title || '',
    startDate: parseLinkedInDate(pos.timePeriod?.startDate),
    endDate: pos.timePeriod?.endDate ? parseLinkedInDate(pos.timePeriod.endDate) : 'Present',
    current: !pos.timePeriod?.endDate,
    description: pos.description || '',
    location: pos.locationName || '',
  }));
}

/**
 * Parse LinkedIn education to education format
 */
function parseLinkedInEducation(educations: any[]): Education[] {
  if (!Array.isArray(educations)) return [];
  
  return educations.map((edu) => ({
    id: generateId(),
    institution: edu.schoolName || '',
    area: edu.fieldOfStudy || '',
    studyType: edu.degreeName || '',
    startDate: edu.timePeriod?.startDate?.year?.toString() || '',
    endDate: edu.timePeriod?.endDate?.year?.toString() || '',
  }));
}

/**
 * Parse LinkedIn skills to skills format
 */
function parseLinkedInSkills(skills: any[]): string[] {
  if (!Array.isArray(skills)) return [];
  
  return skills
    .map((skill) => (typeof skill === 'string' ? skill : skill.name))
    .filter(Boolean);
}

/**
 * Parse LinkedIn languages
 */
function parseLinkedInLanguages(languages: any[]): Language[] {
  if (!Array.isArray(languages)) return [];
  
  return languages.map((lang) => ({
    name: lang.name || '',
    proficiency: lang.proficiency || '',
  }));
}

/**
 * Parse LinkedIn date to YYYY-MM format
 */
function parseLinkedInDate(dateObj: { month?: number; year?: number }): string {
  if (!dateObj) return '';
  if (dateObj.month && dateObj.year) {
    return `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}`;
  }
  if (dateObj.year) {
    return dateObj.year.toString();
  }
  return '';
}

/**
 * Generate a simple ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Export resume data to LinkedIn profile format
 * @param resumeData - Resume data to export
 * @returns LinkedIn-compatible profile object
 */
export function exportToLinkedInFormat(resumeData: ResumeData): LinkedInProfile {
  const profile: LinkedInProfile = {
    firstName: '',
    lastName: '',
    headline: '',
    summary: '',
    locationName: '',
    positions: [],
    educations: [],
    skills: [],
  };
  
  // Split name
  if (resumeData.name) {
    const nameParts = resumeData.name.split(' ');
    profile.firstName = nameParts[0] || '';
    profile.lastName = nameParts.slice(1).join(' ') || '';
  }
  
  // Headline/role
  profile.headline = resumeData.role || '';
  
  // Summary
  profile.summary = resumeData.summary || '';
  
  // Location
  profile.locationName = resumeData.location || '';
  
  // Email
  if (resumeData.email) {
    profile.emailAddress = resumeData.email;
  }
  
  // Phone
  if (resumeData.phone) {
    profile.phoneNumbers = [{ phoneNumber: resumeData.phone }];
  }
  
  // Work experience
  if (resumeData.work) {
    profile.positions = resumeData.work.map((exp) => ({
      companyName: exp.company || '',
      title: exp.role || '',
      description: exp.description || '',
      locationName: exp.location || '',
      timePeriod: {
        startDate: formatDateForLinkedIn(exp.startDate),
        endDate: exp.current ? undefined : formatDateForLinkedIn(exp.endDate),
      },
    }));
  }
  
  // Education
  if (resumeData.education) {
    profile.educations = resumeData.education.map((edu) => ({
      schoolName: edu.institution || '',
      fieldOfStudy: edu.area || '',
      degreeName: edu.studyType || '',
      timePeriod: {
        startDate: { year: parseInt(edu.startDate) || undefined },
        endDate: { year: parseInt(edu.endDate) || undefined },
      },
    }));
  }
  
  // Skills
  if (resumeData.skills) {
    const skills = Array.isArray(resumeData.skills) 
      ? resumeData.skills 
      : Object.values(resumeData.skills).flat();
    profile.skills = skills.map((s) => ({ name: typeof s === 'string' ? s : s.name || '' }));
  }
  
  return profile;
}

/**
 * Format date for LinkedIn
 */
function formatDateForLinkedIn(dateStr: string): { month?: number; year?: number } {
  if (!dateStr || dateStr === 'Present') return {};
  
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    return {
      year: parseInt(parts[0]),
      month: parts[1] ? parseInt(parts[1]) : undefined,
    };
  }
  
  const year = parseInt(dateStr);
  return isNaN(year) ? {} : { year };
}

/**
 * Download LinkedIn profile as JSON file
 * @param resumeData - Resume data to export
 */
export function downloadLinkedInProfile(resumeData: ResumeData): void {
  const profile = exportToLinkedInFormat(resumeData);
  const json = JSON.stringify(profile, null, 2);
  
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'linkedin-profile.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate LinkedIn import data
 */
export function validateLinkedInData(data: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!data) {
    errors.push('No data provided');
    return { valid: false, errors, warnings };
  }
  
  // Check for required fields
  if (!data.firstName && !data.lastName) {
    warnings.push('No name found in LinkedIn data');
  }
  
  if (!data.emailAddress) {
    warnings.push('No email found in LinkedIn data');
  }
  
  // Check for positions
  if (!data.positions || !Array.isArray(data.positions)) {
    warnings.push('No work experience found in LinkedIn data');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Interface for LinkedIn profile format
 */
export interface LinkedInProfile {
  firstName: string;
  lastName: string;
  headline?: string;
  summary?: string;
  locationName?: string;
  emailAddress?: string;
  phoneNumbers?: Array<{ phoneNumber: string }>;
  positions?: Array<{
    companyName: string;
    title: string;
    description?: string;
    locationName?: string;
    timePeriod?: {
      startDate?: { month?: number; year?: number };
      endDate?: { month?: number; year?: number };
    };
  }>;
  educations?: Array<{
    schoolName: string;
    fieldOfStudy?: string;
    degreeName?: string;
    timePeriod?: {
      startDate?: { year?: number };
      endDate?: { year?: number };
    };
  }>;
  skills?: Array<{ name: string }>;
}

/**
 * Work experience type (local)
 */
interface WorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  location?: string;
}

/**
 * Education type (local)
 */
interface Education {
  id: string;
  institution: string;
  area: string;
  studyType: string;
  startDate: string;
  endDate: string;
}

/**
 * Language type (local)
 */
interface Language {
  name: string;
  proficiency: string;
}
