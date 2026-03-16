/**
 * Jobs Types
 */

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location?: string;
  remote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  description?: string;
  url: string;
  applyUrl?: string;
  postedDate?: string;
  employmentType: string;
  experienceLevel: string;
  skills: string[];
  sourceId: string;
}

export interface JobSearchFilters {
  query?: string;
  remote?: boolean;
  location?: string;
  minSalary?: number;
  employmentType?: string;
  experienceLevel?: string;
  limit?: number;
  offset?: number;
}

export interface JobSearchResponse {
  jobs: JobPosting[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface SavedJob {
  id: number;
  jobId: string;
  savedAt: string;
  notes?: string;
  status: string;
  job: JobPosting;
}

export interface SavedJobsResponse {
  savedJobs: SavedJob[];
  total: number;
}

export interface JobSource {
  id: string;
  name: string;
  type: string;
  url: string;
  isActive: boolean;
  lastFetched?: string;
  fetchFrequency: number;
  jobsFetched: number;
}

export interface UseJobSearchReturn {
  jobs: JobPosting[];
  isLoading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  search: (filters: JobSearchFilters) => Promise<void>;
  loadMore: () => Promise<void>;
}

export interface UseSavedJobsReturn {
  savedJobs: SavedJob[];
  isLoading: boolean;
  error: string | null;
  fetchSaved: () => Promise<void>;
  saveJob: (jobId: string, notes?: string) => Promise<void>;
  removeJob: (savedId: number) => Promise<void>;
  updateNotes: (savedId: number, notes: string) => Promise<void>;
}
