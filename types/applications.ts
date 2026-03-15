/**
 * Application Tracking Types
 */

export type ApplicationStatus =
  | 'draft'
  | 'applied'
  | 'screening'
  | 'interviewing'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'archived';

export type ApplicationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface JobApplication {
  id: number;
  userId: number;
  jobId: string;
  status: ApplicationStatus;
  externalId?: string;
  externalSource?: string;
  externalStatus?: string;
  submittedAt?: string;
  responseAt?: string;
  autofilled: boolean;
  notes?: string;
  daysInStatus: number;
  responseTimeDays?: number;
  // Additional fields used in components
  company_name?: string;
  job_title?: string;
  company?: string;
  role?: string;
  location?: string;
  priority?: 'low' | 'medium' | 'high';
  date_applied?: string;
  follow_up_date?: string;
  salary_min?: number;
  salary_max?: number;
  salary_period?: string;
  archived?: boolean;
  logo?: string;
  dateApplied?: string;
}

export interface CreateApplicationData {
  jobId: string;
  status?: ApplicationStatus;
  externalId?: string;
  externalSource?: string;
  externalStatus?: string;
  submittedAt?: string;
  notes?: string;
  autofilled?: boolean;
}

export interface UpdateApplicationData {
  status?: ApplicationStatus;
  externalStatus?: string;
  notes?: string;
  submittedAt?: string;
}

export interface ApplicationStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  interviewRate: number;
  offerRate: number;
  periodDays: number;
}

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  conversionRate?: number;
}

export interface FunnelData {
  stages: FunnelStage[];
  periodDays: number;
}

export interface ConversionRates {
  appliedToScreening: number;
  screeningToInterview: number;
  interviewToOffer: number;
  offerToAcceptance: number;
  overallConversion: number;
  periodDays: number;
}

export interface TimeToResponse {
  avgDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
  sampleSize: number;
  periodDays: number;
}

export interface AutoFillData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  linkedin?: string;
  github?: string;
  workExperience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
    highlights: string[];
  }>;
  educationHistory: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
  }>;
  skills: {
    technical: string[];
    languages: string[];
    frameworks: string[];
    tools: string[];
    soft: string[];
  };
  professionalSummary: string;
  coverLetterTemplate: string;
}

export interface AutoFillResponse {
  applicationData: AutoFillData;
  coverLetter: string;
}

export interface ApplicationsListResponse {
  applications: JobApplication[];
  total: number;
}

export interface UseApplicationsReturn {
  applications: JobApplication[];
  isLoading: boolean;
  error: string | null;
  total: number;
  fetchApplications: (filters?: ApplicationsFilters) => Promise<void>;
  createApplication: (data: CreateApplicationData) => Promise<JobApplication>;
  updateApplication: (id: number, data: UpdateApplicationData) => Promise<JobApplication>;
  deleteApplication: (id: number) => Promise<void>;
  updateStatus: (id: number, status: ApplicationStatus) => Promise<JobApplication>;
}

export interface ApplicationsFilters {
  status?: ApplicationStatus;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface UseApplicationStatsReturn {
  stats: ApplicationStats | null;
  funnel: FunnelData | null;
  conversionRates: ConversionRates | null;
  timeToResponse: TimeToResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchStats: (days?: number) => Promise<void>;
  fetchFunnel: (days?: number) => Promise<void>;
  fetchConversionRates: (days?: number) => Promise<void>;
  fetchTimeToResponse: (days?: number) => Promise<void>;
}
