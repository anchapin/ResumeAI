 
/**
 * LinkedIn Import/Export Utility Functions
 *
 * Provides functionality to import LinkedIn profile data and export resumes
 * in LinkedIn-compatible formats.
 *
 * Supports multiple LinkedIn export formats:
 * - LinkedIn Data Export (JSON format from Settings > Data privacy)
 * - LinkedIn Profile Scraper API format
 * - Manual JSON format with common field names
 */

import {
  ResumeData,
  Skill,
  WorkItem,
  EducationItem,
  LinkedInImportData,
  LinkedInExperienceInput,
  LinkedInEducationInput,
  LinkedInSkillInput,
  LinkedInLanguageInput,
  LinkedInCertificationInput,
  LinkedInProjectInput,
} from '../types';

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
 * Detect the format of LinkedIn export data
 */
function detectLinkedInFormat(
  data: LinkedInImportData,
): 'standard' | 'scraper' | 'minimal' | 'unknown' {
  if (data.firstName !== undefined || data.lastName !== undefined) {
    return 'standard';
  }
  if (data.fullName !== undefined || data.profileUrl !== undefined) {
    return 'scraper';
  }
  if (data.name !== undefined && (data.experience !== undefined || data.education !== undefined)) {
    return 'minimal';
  }
  return 'unknown';
}

/**
 * Import LinkedIn profile data from JSON export
 * @param linkedinData - Raw LinkedIn export data
 * @returns ResumeData compatible object
 */
export function importFromLinkedIn(linkedinData: LinkedInImportData): Partial<ResumeData> {
  const format = detectLinkedInFormat(linkedinData);

  if (format === 'scraper') {
    return importFromLinkedInScraperFormat(linkedinData);
  } else if (format === 'minimal') {
    return importFromLinkedInMinimalFormat(linkedinData);
  } else {
    return importFromLinkedInStandardFormat(linkedinData);
  }
}

/**
 * Import standard LinkedIn export format
 */
function importFromLinkedInStandardFormat(linkedinData: LinkedInImportData): Partial<ResumeData> {
  const result: Partial<ResumeData> = {};

  // Extract name
  if (linkedinData.firstName !== undefined || linkedinData.lastName !== undefined) {
    result.basics = {
      name: `${linkedinData.firstName || ''} ${linkedinData.lastName || ''}`.trim(),
    };
  }

  // Extract headline as label (role)
  if (linkedinData.headline) {
    result.basics = result.basics || {};
    result.basics.label = linkedinData.headline;
  }

  // Extract summary
  if (linkedinData.summary) {
    result.basics = result.basics || {};
    result.basics.summary = linkedinData.summary;
  }

  // Extract email
  if (linkedinData.emailAddress) {
    result.basics = result.basics || {};
    result.basics.email = linkedinData.emailAddress;
  }

  // Extract phone
  if (
    linkedinData.phoneNumbers &&
    Array.isArray(linkedinData.phoneNumbers) &&
    linkedinData.phoneNumbers.length > 0
  ) {
    result.basics = result.basics || {};
    result.basics.phone = linkedinData.phoneNumbers[0]?.phoneNumber || '';
  }

  // Extract location
  if (linkedinData.locationName) {
    result.location = { city: linkedinData.locationName };
  }

  // Extract experience
  if (linkedinData.positions && Array.isArray(linkedinData.positions)) {
    result.work = parseLinkedInPositions(linkedinData.positions);
  }

  // Extract education
  if (linkedinData.educations && Array.isArray(linkedinData.educations)) {
    result.education = parseLinkedInEducation(linkedinData.educations);
  }

  // Extract skills
  if (linkedinData.skills && Array.isArray(linkedinData.skills)) {
    result.skills = parseLinkedInSkills(linkedinData.skills);
  }

  // Extract languages
  if (linkedinData.languages && Array.isArray(linkedinData.languages)) {
    result.languages = parseLinkedInLanguages(linkedinData.languages);
  }

  // Extract certifications
  if (linkedinData.certifications && Array.isArray(linkedinData.certifications)) {
    result.certificates = parseLinkedInCertifications(linkedinData.certifications);
  }

  // Extract projects
  if (linkedinData.projects && Array.isArray(linkedinData.projects)) {
    result.projects = parseLinkedInProjects(linkedinData.projects);
  }

  return result;
}

/**
 * Import LinkedIn scraper API format
 */
function importFromLinkedInScraperFormat(linkedinData: LinkedInImportData): Partial<ResumeData> {
  const result: Partial<ResumeData> = {};

  // Extract name
  if (linkedinData.fullName) {
    result.basics = { name: linkedinData.fullName };
  } else if (linkedinData.name) {
    result.basics = { name: linkedinData.name };
  }

  // Extract headline
  if (linkedinData.headline) {
    result.basics = result.basics || {};
    result.basics.label = linkedinData.headline;
  }

  // Extract summary (could be 'summary' or 'about')
  if (linkedinData.summary || linkedinData.about) {
    result.basics = result.basics || {};
    result.basics.summary = linkedinData.summary || linkedinData.about;
  }

  // Extract email
  if (linkedinData.email) {
    result.basics = result.basics || {};
    result.basics.email = linkedinData.email;
  }

  // Extract phone
  if (linkedinData.phone) {
    result.basics = result.basics || {};
    result.basics.phone = linkedinData.phone;
  }

  // Extract location (can be string or object)
  const location = linkedinData.location || linkedinData.city;
  if (location) {
    if (typeof location === 'object') {
      result.location = {
        city: location.city || location.name,
        region: location.region,
        countryCode: location.countryCode,
      };
    } else {
      result.location = { city: location };
    }
  }

  // Extract experience
  if (linkedinData.experience && Array.isArray(linkedinData.experience)) {
    result.work = parseScraperExperience(linkedinData.experience);
  }

  // Extract education
  if (linkedinData.education && Array.isArray(linkedinData.education)) {
    result.education = parseScraperEducation(linkedinData.education);
  }

  // Extract skills
  if (linkedinData.skills && Array.isArray(linkedinData.skills)) {
    result.skills = parseScraperSkills(linkedinData.skills);
  }

  return result;
}

/**
 * Import minimal/custom LinkedIn format
 */
function importFromLinkedInMinimalFormat(linkedinData: LinkedInImportData): Partial<ResumeData> {
  const result: Partial<ResumeData> = {};

  // Extract name
  if (linkedinData.name) {
    result.basics = { name: linkedinData.name };
  }

  // Extract headline (could be 'headline', 'title', or 'role')
  const headline = linkedinData.headline || linkedinData.title || linkedinData.role;
  if (headline) {
    result.basics = result.basics || {};
    result.basics.label = headline;
  }

  // Extract summary (could be 'summary', 'bio', or 'about')
  const summary = linkedinData.summary || linkedinData.bio || linkedinData.about;
  if (summary) {
    result.basics = result.basics || {};
    result.basics.summary = summary;
  }

  // Extract email
  if (linkedinData.email) {
    result.basics = result.basics || {};
    result.basics.email = linkedinData.email;
  }

  // Extract phone
  if (linkedinData.phone) {
    result.basics = result.basics || {};
    result.basics.phone = linkedinData.phone;
  }

  // Extract location
  const location = linkedinData.location;
  if (location) {
    if (typeof location === 'string') {
      result.location = { city: location };
    } else if (location.city || location.name) {
      result.location = {
        city: location.city,
        region: location.region,
        countryCode: location.countryCode,
      };
    }
  }

  // Extract experience
  if (linkedinData.experience && Array.isArray(linkedinData.experience)) {
    result.work = parseMinimalExperience(linkedinData.experience);
  }

  // Extract education
  if (linkedinData.education && Array.isArray(linkedinData.education)) {
    result.education = parseMinimalEducation(linkedinData.education);
  }

  // Extract skills
  if (linkedinData.skills && Array.isArray(linkedinData.skills)) {
    result.skills = parseMinimalSkills(linkedinData.skills);
  }

  return result;
}

/**
 * Parse LinkedIn positions to work experience format
 */
function parseLinkedInPositions(positions: LinkedInExperienceInput[]): WorkItem[] {
  if (!Array.isArray(positions)) return [];

  return positions.map((pos) => ({
    company: pos.companyName || '',
    position: pos.title || '',
    startDate: parseLinkedInDate(pos.timePeriod?.startDate),
    endDate: pos.timePeriod?.endDate ? parseLinkedInDate(pos.timePeriod.endDate) : '',
    summary: pos.description || '',
  }));
}

/**
 * Parse LinkedIn education to education format
 */
function parseLinkedInEducation(educations: LinkedInEducationInput[]): EducationItem[] {
  if (!Array.isArray(educations)) return [];

  return educations.map((edu) => ({
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
function parseLinkedInSkills(skills: LinkedInSkillInput[]): Skill[] {
  if (!Array.isArray(skills)) return [];

  return skills
    .map((skill) => ({ name: typeof skill === 'string' ? skill : skill.name || '' }))
    .filter((s) => s.name);
}

/**
 * Parse LinkedIn languages
 */
function parseLinkedInLanguages(languages: LinkedInLanguageInput[]): Record<string, unknown>[] {
  if (!Array.isArray(languages)) return [];

  return languages.map((lang) => ({
    name: lang.name || '',
    proficiency: lang.proficiency || '',
  }));
}

/**
 * Parse LinkedIn certifications
 */
function parseLinkedInCertifications(
  certifications: LinkedInCertificationInput[],
): Record<string, unknown>[] {
  if (!Array.isArray(certifications)) return [];

  return certifications.map((cert) => ({
    name: cert.name || cert.certificationName || '',
    issuer: cert.authority || cert.issuer || cert.organization || '',
    startDate: cert.timePeriod?.startDate ? parseLinkedInDate(cert.timePeriod.startDate) : '',
    endDate: cert.timePeriod?.endDate ? parseLinkedInDate(cert.timePeriod.endDate) : '',
    url: cert.displaySource || '',
  }));
}

/**
 * Parse LinkedIn projects
 */
function parseLinkedInProjects(projects: LinkedInProjectInput[]): Record<string, unknown>[] {
  if (!Array.isArray(projects)) return [];

  return projects.map((proj) => ({
    name: proj.name || '',
    description: proj.description || '',
    url: proj.url || '',
  }));
}

/**
 * Parse LinkedIn date to YYYY-MM format
 */
function parseLinkedInDate(dateObj?: { month?: number; year?: number }): string {
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
 * Parse scraper API experience format
 */
function parseScraperExperience(experience: LinkedInExperienceInput[]): WorkItem[] {
  if (!Array.isArray(experience)) return [];

  return experience.map((exp) => ({
    company: exp.companyName || exp.company || '',
    position: exp.title || exp.position || '',
    startDate: normalizeDate(exp.startDate),
    endDate:
      exp.endDate && !['present', 'current', 'now'].includes(String(exp.endDate).toLowerCase())
        ? normalizeDate(exp.endDate)
        : '',
    summary: exp.description || exp.summary || '',
  }));
}

/**
 * Parse scraper API education format
 */
function parseScraperEducation(education: LinkedInEducationInput[]): EducationItem[] {
  if (!Array.isArray(education)) return [];

  return education.map((edu) => ({
    institution: edu.schoolName || edu.institution || '',
    area: edu.fieldOfStudy || edu.area || '',
    studyType: edu.degreeName || edu.degree || '',
    startDate: normalizeDate(edu.startDate),
    endDate: normalizeDate(edu.endDate),
  }));
}

/**
 * Parse scraper API skills format
 */
function parseScraperSkills(skills: LinkedInSkillInput[]): Skill[] {
  if (!Array.isArray(skills)) return [];

  return skills
    .map((skill) => {
      if (typeof skill === 'string') return { name: skill };
      if (typeof skill === 'object') return { name: skill.name || skill.skill || '' };
      return { name: '' };
    })
    .filter((s) => s.name);
}

/**
 * Parse minimal format experience
 */
function parseMinimalExperience(experience: LinkedInExperienceInput[]): WorkItem[] {
  if (!Array.isArray(experience)) return [];

  return experience.map((exp) => ({
    company: exp.company || '',
    position: exp.role || exp.position || exp.title || '',
    startDate: normalizeDate(exp.startDate || exp.start_date || exp.from),
    endDate:
      (exp.endDate || exp.end_date || exp.to) &&
      !['present', 'current', 'now'].includes(
        String(exp.endDate || exp.end_date || exp.to).toLowerCase(),
      )
        ? normalizeDate(exp.endDate || exp.end_date || exp.to)
        : '',
    summary: exp.description || exp.summary || exp.details || '',
  }));
}

/**
 * Parse minimal format education
 */
function parseMinimalEducation(education: LinkedInEducationInput[]): EducationItem[] {
  if (!Array.isArray(education)) return [];

  return education.map((edu) => ({
    institution: edu.institution || edu.school || edu.university || '',
    area: edu.area || edu.major || edu.field_of_study || '',
    studyType: edu.studyType || edu.degree || edu.degree_type || '',
    startDate: normalizeDate(edu.startDate || edu.start_date || edu.from),
    endDate: normalizeDate(edu.endDate || edu.end_date || edu.to),
  }));
}

/**
 * Parse minimal format skills
 */
function parseMinimalSkills(skills: LinkedInSkillInput[]): Skill[] {
  if (!Array.isArray(skills)) return [];

  return skills
    .map((skill) => {
      if (typeof skill === 'string') return { name: skill };
      if (typeof skill === 'object')
        return { name: skill.name || skill.skill || skill.title || '' };
      return { name: '' };
    })
    .filter((s) => s.name);
}

/**
 * Normalize various date formats to YYYY-MM format
 */
function normalizeDate(dateStr: string | number | undefined): string {
  if (!dateStr) return '';

  const str = String(dateStr).trim();

  // Already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(str)) return str;

  // Just year
  if (/^\d{4}$/.test(str)) return str;

  // Month name year format (Jan 2020, January 2020)
  const monthNames: Record<string, string> = {
    jan: '01',
    january: '01',
    feb: '02',
    february: '02',
    mar: '03',
    march: '03',
    apr: '04',
    april: '04',
    may: '05',
    jun: '06',
    june: '06',
    jul: '07',
    july: '07',
    aug: '08',
    august: '08',
    sep: '09',
    september: '09',
    oct: '10',
    october: '10',
    nov: '11',
    november: '11',
    dec: '12',
    december: '12',
  };

  const monthMatch = str.match(/^(\w+)\s+(\d{4})$/i);
  if (monthMatch) {
    const [, monthStr, year] = monthMatch;
    const month = monthNames[monthStr.toLowerCase()];
    if (month) return `${year}-${month}`;
  }

  // MM/YYYY or M/YYYY format
  const slashMatch = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}`;
  }

  // YYYY-MM-DD format
  const fullDateMatch = str.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (fullDateMatch) {
    const [, year, month] = fullDateMatch;
    return `${year}-${month}`;
  }

  return str;
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

  const basics = resumeData.basics;

  // Split name
  if (basics?.name) {
    const nameParts = basics.name.split(' ');
    profile.firstName = nameParts[0] || '';
    profile.lastName = nameParts.slice(1).join(' ') || '';
  }

  // Headline/role (label)
  profile.headline = basics?.label || '';

  // Summary
  profile.summary = basics?.summary || '';

  // Location
  profile.locationName = resumeData.location?.city || resumeData.location?.region || '';

  // Email
  if (basics?.email) {
    profile.emailAddress = basics.email;
  }

  // Phone
  if (basics?.phone) {
    profile.phoneNumbers = [{ phoneNumber: basics.phone }];
  }

  // Work experience
  if (resumeData.work) {
    profile.positions = resumeData.work.map((exp) => ({
      companyName: exp.company || '',
      title: exp.position || exp.company || '',
      description: exp.summary || '',
      locationName: '',
      timePeriod: {
        startDate: formatDateForLinkedIn(exp.startDate || ''),
        endDate: exp.endDate ? formatDateForLinkedIn(exp.endDate) : undefined,
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
        startDate: { year: edu.startDate ? parseInt(edu.startDate, 10) : undefined },
        endDate: { year: edu.endDate ? parseInt(edu.endDate, 10) : undefined },
      },
    }));
  }

  // Skills
  if (resumeData.skills) {
    profile.skills = resumeData.skills.map((s) => ({ name: s.name || '' }));
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
export function validateLinkedInData(data: LinkedInImportData): {
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
