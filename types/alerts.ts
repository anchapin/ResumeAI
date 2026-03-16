/**
 * Job Alerts Types
 */

export interface JobAlert {
  id: number;
  name: string;
  query?: string;
  remote?: boolean;
  location?: string;
  minSalary?: number;
  employmentType?: string;
  experienceLevel?: string;
  frequency: 'instant' | 'daily' | 'weekly';
  isActive: boolean;
  lastSentAt?: string;
  createdAt: string;
}

export interface CreateAlertData {
  name: string;
  query?: string;
  remote?: boolean;
  location?: string;
  minSalary?: number;
  employmentType?: string;
  experienceLevel?: string;
  frequency?: 'instant' | 'daily' | 'weekly';
}

export interface UpdateAlertData {
  name?: string;
  query?: string;
  remote?: boolean;
  location?: string;
  minSalary?: number;
  employmentType?: string;
  experienceLevel?: string;
  frequency?: 'instant' | 'daily' | 'weekly';
  isActive?: boolean;
}

export interface AlertPreferences {
  emailEnabled: boolean;
  emailAddress?: string;
  smsEnabled: boolean;
  phoneNumber?: string;
  phoneCountryCode: string;
  dailyDigest: boolean;
  weeklyDigest: boolean;
  instantAlerts: boolean;
  timezone: string;
}

export interface UpdatePreferencesData {
  emailEnabled?: boolean;
  emailAddress?: string;
  smsEnabled?: boolean;
  phoneNumber?: string;
  phoneCountryCode?: string;
  dailyDigest?: boolean;
  weeklyDigest?: boolean;
  instantAlerts?: boolean;
  timezone?: string;
}

export interface AlertsListResponse {
  alerts: JobAlert[];
  total: number;
}

export interface UseAlertsReturn {
  alerts: JobAlert[];
  isLoading: boolean;
  error: string | null;
  fetchAlerts: () => Promise<void>;
  createAlert: (data: CreateAlertData) => Promise<JobAlert>;
  updateAlert: (id: number, data: UpdateAlertData) => Promise<JobAlert>;
  deleteAlert: (id: number) => Promise<void>;
  pauseAlert: (id: number) => Promise<void>;
  resumeAlert: (id: number) => Promise<void>;
}

export interface UseAlertPreferencesReturn {
  preferences: AlertPreferences | null;
  isLoading: boolean;
  error: string | null;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (data: UpdatePreferencesData) => Promise<void>;
}
