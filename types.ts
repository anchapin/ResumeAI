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
  TEAMS = 'teams',
  VERSIONS = 'versions',
  SHARE = 'share',
  IMPORT = 'import',
  BULK = 'bulk',
  SALARY_RESEARCH = 'salary-research',
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

// ATS Compatibility Checker Types

export interface ATSCategoryScore {
  name: string;
  points_earned: number;
  points_possible: number;
  details: string[];
  suggestions: string[];
  percentage: number;
}

export interface ATSReport {
  total_score: number;
  total_possible: number;
  overall_percentage: number;
  summary: string;
  recommendations: string[];
  categories: {
    format_parsing: ATSCategoryScore;
    keywords: ATSCategoryScore;
    section_structure: ATSCategoryScore;
    contact_info: ATSCategoryScore;
    readability: ATSCategoryScore;
  };
}

// LinkedIn Integration Types

export interface LinkedInProfile {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  headline?: string;
  email?: string;
  emailAddress?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience?: LinkedInExperience[];
  positions?: LinkedInExperience[];
  education?: LinkedInEducation[];
  educations?: LinkedInEducation[];
  projects?: LinkedInProject[];
  connectedAt?: string;
}

export interface LinkedInExperience {
  company?: string;
  companyName?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  current?: boolean;
  location?: string;
  locationName?: string;
  timePeriod?: {
    startDate?: { month?: number; year?: number };
    endDate?: { month?: number; year?: number };
  };
}

export interface LinkedInEducation {
  institution?: string;
  schoolName?: string;
  degree?: string;
  degreeName?: string;
  field?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  activities?: string;
  timePeriod?: {
    startDate?: { year?: number };
    endDate?: { year?: number };
  };
}

export interface LinkedInProject {
  id?: number;
  name?: string;
  description?: string;
  url?: string;
  languages?: string[];
  stars?: number;
  forks?: number;
}

export interface GitHubRepository {
  id: number;
  name: string;
  description: string | null;
  url: string;
  languages: string[];
  stars: number;
  forks: number;
  topics: string[];
}

// Salary Research & Offer Comparison Types

export interface SalaryResearchRequest {
  jobTitle: string;
  location: string;
  company?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
}

export interface SalaryRange {
  min: number;
  median: number;
  max: number;
  currency: string;
}

export interface SalaryInsight {
  category: string;
  title: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
}

export interface SalaryResearchResponse {
  jobTitle: string;
  location: string;
  company?: string;
  experienceLevel?: string;
  salaryRange: SalaryRange;
  insights: SalaryInsight[];
  factors: {
    experience: string;
    education: string;
    industry: string;
    location: string;
  };
  recommendations: string[];
}

export interface JobOffer {
  id: number;
  companyName: string;
  jobTitle: string;
  location: string;
  baseSalary: number;
  currency: string;
  bonus?: number;
  equity?: {
    type: string;
    value: number;
    vesting: string;
  };
  benefits: string[];
  growthPotential?: number;
  workLifeBalance?: number;
  cultureScore?: number;
  startDate?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'negotiating';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComparisonPriority {
  salary: number;
  growth: number;
  workLifeBalance: number;
  benefits: number;
  culture: number;
}

export interface OfferScore {
  offerId: number;
  totalScore: number;
  breakdown: {
    salary: number;
    growth: number;
    workLifeBalance: number;
    benefits: number;
    culture: number;
  };
  reasoning: string;
  pros: string[];
  cons: string[];
}

export interface OfferComparison {
  offers: JobOffer[];
  priorities: ComparisonPriority;
  scores: OfferScore[];
  winnerId: number;
  insights: string[];
  recommendation?: {
    topOfferId: number;
    reason: string;
  };
  createdAt?: string;
}

export interface ExportFormat {
  format: 'pdf' | 'csv' | 'json';
}

// Team Collaboration Types
export interface Team {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
}

export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: MemberRole;
}

export interface TeamActivity {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  createdAt: string;
}

export interface TeamResume {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  updatedAt: string;
  sharedAt: string;
  permissions: 'view' | 'edit' | 'comment';
}

export interface BulkOperationType {
  type: 'delete' | 'export' | 'tag';
}

export interface BulkOperationResult {
  success: boolean;
  count: number;
  errors?: string[];
}
