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
  gpa?: string;
  description?: string;
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
  tags?: string[];
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
  LOGIN = 'login',
  REGISTER = 'register',
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
  INTERVIEW_PRACTICE = 'interview-practice',
  BILLING = 'billing',
  WEBHOOKS = 'webhooks',
}

// Advanced Features Types

export interface ResumeMetadata {
  id: number;
  title: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
}

export interface ResumeVersion {
  id: number;
  resumeId: number;
  versionNumber: number;
  data: ResumeData;
  changeDescription: string | null;
  createdAt: string;
}

export interface Comment {
  id: number;
  resumeId: number;
  authorName: string;
  authorEmail: string;
  content: string;
  section: string | null;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShareLink {
  shareToken: string;
  shareUrl: string;
  permissions: string;
  expiresAt: string | null;
  maxViews: number | null;
}

export interface FormatOptions {
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  colorTheme: string;
  layout: 'single' | 'double';
  showSectionDividers: boolean;
  sectionOrder: string[] | null;
}

export interface UserSettings {
  keyboardShortcutsEnabled: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  screenReaderOptimized: boolean;
  defaultFont: string;
  defaultFontSize: number;
  defaultSpacing: string;
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
  colorTheme?: string;
}

// ATS Compatibility Checker Types

export interface ATSCategoryScore {
  name: string;
  pointsEarned: number;
  pointsPossible: number;
  details: string[];
  suggestions: string[];
  percentage: number;
}

export interface ATSReport {
  totalScore: number;
  totalPossible: number;
  overallPercentage: number;
  summary: string;
  recommendations: string[];
  categories: {
    formatParsing: ATSCategoryScore;
    keywords: ATSCategoryScore;
    sectionStructure: ATSCategoryScore;
    contactInfo: ATSCategoryScore;
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
  id: number;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  resumeCount?: number;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  isOwner?: boolean;
  joinedAt: string;
}

export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'member';

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
  type?: string;
  description?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TeamResume {
  id: string;
  resumeId: string;
  title: string;
  resumeTitle: string;
  ownerId: string;
  ownerName: string;
  sharedByUserName: string;
  updatedAt: string;
  sharedAt: string;
  permissions: 'view' | 'edit' | 'comment';
}

export type BulkOperationType = 'delete' | 'export' | 'tag';

export interface BulkOperationResult {
  success?: boolean;
  count?: number;
  successful?: number[];
  failed?: Array<{ id: number; error: string }>;
  errors?: string[];
}

// Interview Practice Types

export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'domain';
  difficulty: 'easy' | 'medium' | 'hard';
  tips?: string[];
}

export interface InterviewAnswer {
  id: string;
  questionId: string;
  answer: string;
  videoUrl?: string;
  recordingDuration?: number;
  timestamp: string;
}

export interface InterviewFeedback {
  id: string;
  answerId: string;
  score: number; // 1-10
  strengths: string[];
  improvements: string[];
  summary: string;
  suggestedAnswer?: string;
}

export interface InterviewSession {
  id: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  status: 'in_progress' | 'completed' | 'paused';
  jobTitle?: string;
  company?: string;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  feedback?: InterviewFeedback[];
  completionPercentage: number;
  averageScore?: number;
}

export interface GenerateQuestionsRequest {
  jobTitle?: string;
  job_title?: string;
  company?: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  categories?: string[];
}

export interface BillingPlan {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  price_cents: number;
  currency: string;
  interval: string;
  features: string[];
  max_resumes_per_month: number;
  max_ai_tailorings_per_month: number;
  max_templates: number;
  include_priority_support: boolean;
  include_custom_domains: boolean;
  is_popular: boolean;
}

export interface Subscription {
  id: number;
  user_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | 'inactive';
  plan?: BillingPlan;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  resumes_generated_this_period: number;
  ai_tailorings_this_period: number;
  created_at: string;
}

export interface PaymentMethod {
  id: number;
  type: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  billing_name?: string;
  is_default: boolean;
}

export interface Invoice {
  id: number;
  amount_cents: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  description?: string;
  created_at: string;
  paid_at?: string;
  invoice_pdf_url?: string;
}

export interface UsageStats {
  allowed: boolean;
  limit?: number;
  used: number;
  remaining?: number;
}

export interface BillingUsage {
  resume_generated: UsageStats;
  ai_tailored: UsageStats;
}

export interface CheckoutSessionRequest {
  plan_name: string;
  success_url: string;
  cancel_url: string;
  trial_period_days?: number;
}

export interface CheckoutSessionResponse {
  session_id: string;
  url: string;
}

export interface PortalSessionRequest {
  return_url: string;
}

export interface PortalSessionResponse {
  url: string;
}
