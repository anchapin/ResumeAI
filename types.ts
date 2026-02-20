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

// Education entry type (matching JSON Resume standard)
export interface EducationEntry {
  id: string;
  institution: string;
  area: string;
  studyType: string;
  startDate: string;
  endDate: string;
  courses?: string[];
}

// Project entry type (matching JSON Resume standard)
export interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  url?: string;
  roles?: string[];
  startDate: string;
  endDate: string;
  highlights?: string[];
}

// For backward compatibility with existing frontend code
export interface SimpleResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  role: string;
  summary: string;
  skills: string[];
  experience: WorkExperience[];
  education: EducationEntry[];
  projects: ProjectEntry[];
}

export enum Route {
  DASHBOARD = 'dashboard',
  EDITOR = 'editor',
  WORKSPACE = 'workspace',
  APPLICATIONS = 'applications',
  SETTINGS = 'settings',
  VERSIONS = 'versions',
  SHARE = 'share',
  IMPORT = 'import',
  BULK = 'bulk',
}

// Advanced Features Types

export interface ResumeMetadata {
  id: number;
  title: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  version_count: number;
}

export interface ResumeVersion {
  id: number;
  resume_id: number;
  version_number: number;
  data: ResumeData;
  change_description: string | null;
  created_at: string;
}

export interface Comment {
  id: number;
  resume_id: number;
  author_name: string;
  author_email: string;
  content: string;
  section: string | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShareLink {
  share_token: string;
  share_url: string;
  permissions: string;
  expires_at: string | null;
  max_views: number | null;
}

export interface FormatOptions {
  font_family: string;
  font_size: number;
  line_spacing: number;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  color_theme: string;
  layout: 'single' | 'double';
  show_section_dividers: boolean;
  section_order: string[] | null;
}

export interface UserSettings {
  keyboard_shortcuts_enabled: boolean;
  high_contrast_mode: boolean;
  reduced_motion: boolean;
  screen_reader_optimized: boolean;
  default_font: string;
  default_font_size: number;
  default_spacing: string;
}

export interface KeyboardShortcut {
  key: string;
  action: string;
  category: string;
}

export interface TemplateFilter {
  search?: string;
  tags?: string[];
  category?: string;
  industry?: string;
  layout?: 'single' | 'double';
  color_theme?: string;
}

// GitHub Integration Types

export interface GitHubConnectionStatus {
  connected: boolean;
  username?: string;
  auth_mode: 'oauth' | 'cli' | 'none';
  scopes?: string[];
  last_synced_at?: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  private: boolean;
  html_url: string;
}

export interface GitHubProject {
  repo: GitHubRepository;
  role: string;
  start_date?: string;
  end_date?: string;
  highlights: string[];
}

export interface GitHubSyncOptions {
  include_private?: boolean;
  include_forks?: boolean;
  language_filter?: string;
  min_stars?: number;
}