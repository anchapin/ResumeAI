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

export interface ResumeData {
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
  SETTINGS = 'settings',
}