/**
 * Application Tracking API Client
 * 
 * Client functions for interacting with the application tracking API endpoints.
 */

// Simple fetch wrapper with retry support
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err) {
      lastError = err as Error;
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw lastError || new Error('Fetch failed after retries');
}

// Types
export type TrackingApplicationStatus = 
  | 'draft'
  | 'pending'
  | 'applied'
  | 'screening'
  | 'interviewing'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'archived';

export interface Note {
  id: string;
  content: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  message: string;
  remind_at: string;
  triggered: boolean;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface TrackingApplication {
  id: string;
  job_title: string;
  company: string;
  job_url?: string;
  status: TrackingApplicationStatus;
  applied_date?: string;
  notes: Note[];
  attachments: string[];
  reminders: Reminder[];
  timeline: TimelineEvent[];
  created_at: string;
  updated_at: string;
}

export interface DueReminder {
  application_id: string;
  job_title: string;
  company: string;
  reminder: {
    id: string;
    message: string;
    remind_at: string;
  };
}

export interface CreateApplicationData {
  job_title: string;
  company: string;
  job_url?: string;
  status?: TrackingApplicationStatus;
  applied_date?: string;
}

export interface UpdateApplicationData {
  job_title?: string;
  company?: string;
  job_url?: string;
  status?: TrackingApplicationStatus;
  applied_date?: string;
}

// API Base URL
const TRACKING_API_URL = '/api/v1/applications';

// Helper for getting auth header
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const apiKey = localStorage.getItem('RESUMEAI_API_KEY');
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  
  return headers;
}

// Aliases matching hook expectations
export const getApplications = getTrackingApplications;
export const getApplication = getTrackingApplication;
export const createApplication = createTrackingApplication;
export const updateApplication = updateTrackingApplication;
export const deleteApplication = deleteTrackingApplication;
export const getApplicationTimeline = getTimelineEvents;
export const getAllTimeline = getTimelineEvents;

// Application CRUD
export async function getTrackingApplications(
  status?: TrackingApplicationStatus
): Promise<TrackingApplication[]> {
  let url = TRACKING_API_URL;
  if (status) {
    url += `?status=${encodeURIComponent(status)}`;
  }
  
  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch applications: ${response.statusText}`);
  }
  
  return response.json();
}

export async function getTrackingApplication(
  id: string
): Promise<TrackingApplication> {
  const response = await fetchWithRetry(`${TRACKING_API_URL}/${id}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch application: ${response.statusText}`);
  }
  
  return response.json();
}

export async function createTrackingApplication(
  data: CreateApplicationData
): Promise<TrackingApplication> {
  const response = await fetchWithRetry(TRACKING_API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create application: ${response.statusText}`);
  }
  
  return response.json();
}

export async function updateTrackingApplication(
  id: string,
  data: UpdateApplicationData
): Promise<TrackingApplication> {
  const response = await fetchWithRetry(`${TRACKING_API_URL}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update application: ${response.statusText}`);
  }
  
  return response.json();
}

export async function deleteTrackingApplication(id: string): Promise<void> {
  const response = await fetchWithRetry(`${TRACKING_API_URL}/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete application: ${response.statusText}`);
  }
}

// Notes
export async function addNote(
  appId: string,
  content: string
): Promise<TrackingApplication> {
  const response = await fetchWithRetry(`${TRACKING_API_URL}/${appId}/notes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(content),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add note: ${response.statusText}`);
  }
  
  return response.json();
}

export async function deleteNote(
  appId: string,
  noteId: string
): Promise<TrackingApplication> {
  const response = await fetchWithRetry(
    `${TRACKING_API_URL}/${appId}/notes/${noteId}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to delete note: ${response.statusText}`);
  }
  
  return response.json();
}

// Reminders
export async function addReminder(
  appId: string,
  message: string,
  remindAt: string
): Promise<TrackingApplication> {
  const response = await fetchWithRetry(`${TRACKING_API_URL}/${appId}/reminders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ message, remind_at: remindAt }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add reminder: ${response.statusText}`);
  }
  
  return response.json();
}

export async function deleteReminder(
  appId: string,
  reminderId: string
): Promise<TrackingApplication> {
  const response = await fetchWithRetry(
    `${TRACKING_API_URL}/${appId}/reminders/${reminderId}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to delete reminder: ${response.statusText}`);
  }
  
  return response.json();
}

export async function triggerReminder(
  appId: string,
  reminderId: string
): Promise<void> {
  const response = await fetchWithRetry(
    `${TRACKING_API_URL}/reminders/${appId}/${reminderId}/trigger`,
    {
      method: 'POST',
      headers: getHeaders(),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to trigger reminder: ${response.statusText}`);
  }
}

export async function getDueReminders(): Promise<DueReminder[]> {
  const response = await fetchWithRetry(`${TRACKING_API_URL}/reminders/due`, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch due reminders: ${response.statusText}`);
  }
  
  return response.json();
}

// Timeline
export async function getTimelineEvents(
  appId?: string
): Promise<TimelineEvent[]> {
  let url = `${TRACKING_API_URL}/timeline/all`;
  if (appId) {
    url = `${TRACKING_API_URL}/${appId}/timeline`;
  }
  
  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch timeline: ${response.statusText}`);
  }
  
  return response.json();
}
