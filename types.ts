// Frontend-specific types (for internal use)
export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  tags: string[];
}

export interface ApplicationStats {
  sent: number;
  sentGrowth: number;
  interviewRate: number;
  interviewGrowth: number;
  pending: number;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: 'Applied' | 'Interview' | 'Offer' | 'Rejected';
  dateApplied: string;
  logo: string;
}

// JSON Resume standard format (matches backend API models)
export interface Location {
  address?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  region?: string;
}

export interface Profile {
  network?: string;
  username?: string;
  url?: string;
}

export interface Skill {
  name?: string;
  keywords?: string[];
}

export interface WorkItem {
  company?: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

export interface EducationItem {
  institution?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  courses?: string[];
}

export interface ProjectItem {
  name?: string;
  description?: string;
  url?: string;
  roles?: string[];
  startDate?: string;
  endDate?: string;
  highlights?: string[];
}

export interface BasicInfo {
  name?: string;
  label?: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
}

// JSON Resume standard format (for API communication)
export interface ResumeData {
  basics?: BasicInfo;
  location?: Location;
  profiles?: Profile[];
  work?: WorkItem[];
  volunteer?: Record<string, unknown>[];
  education?: EducationItem[];
  awards?: Record<string, unknown>[];
  certificates?: Record<string, unknown>[];
  publications?: Record<string, unknown>[];
  skills?: Skill[];
  languages?: Record<string, unknown>[];
  interests?: Record<string, unknown>[];
  references?: Record<string, unknown>[];
  projects?: ProjectItem[];
}

// For backward compatibility with existing frontend code
export interface SimpleResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  role: string;
  experience: WorkExperience[];
}

export enum Route {
  DASHBOARD = 'dashboard',
  EDITOR = 'editor',
  WORKSPACE = 'workspace',
  APPLICATIONS = 'applications',
  SETTINGS = 'settings',
}