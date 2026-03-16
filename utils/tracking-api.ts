/**
 * Application Tracking API Client
 * 
 * API client for job application tracking (notes, reminders, timeline).
 */

import { API_URL } from './config';
import { fetchWithRetry } from './api-client';

export type TrackingApplicationStatus = 
  | 'applied'
  | 'interviewing'
  | 'rejected'
  | 'offered'
  | 'withdrawn'
  | 'pending';

export interface ApplicationNote {
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
  notes: ApplicationNote[];
  attachments: string[];
  reminders: Reminder[];
  timeline: TimelineEvent[];
  created_at: string;
  updated_at: string;
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

export interface CreateNoteData {
  content: string;
}

export interface CreateReminderData {
  message: string;
  remind_at: string;
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

const API_PREFIX = '/api/v1/applications';

export async function getApplications(status?: TrackingApplicationStatus): Promise<TrackingApplication[]> {
  const params = status ? `?status=${status}` : '';
  const response = await fetchWithRetry(`${API_URL}${API_PREFIX}${params}`);
  return response.json();
}

export async function getApplication(id: string): Promise<TrackingApplication> {
  const response = await fetchWithRetry(`${API_URL}${API_PREFIX}/${id}`);
  return response.json();
}

export async function createApplication(data: CreateApplicationData): Promise<TrackingApplication> {
  const response = await fetchWithRetry(`${API_URL}${API_PREFIX}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateApplication(id: string, data: UpdateApplicationData): Promise<TrackingApplication> {
  const response = await fetchWithRetry(`${API_URL}${API_PREFIX}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteApplication(id: string): Promise<void> {
  await fetchWithRetry(`${API_URL}${API_PREFIX}/${id}`, {
    method: 'DELETE',
  });
}

export async function addNote(appId: string, data: CreateNoteData): Promise<TrackingApplication> {
  const response = await fetchWithRetry(`${API_URL}${API_PREFIX}/${appId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function addReminder(appId: string, data: CreateReminderData): Promise<TrackingApplication> {
  const response = await fetchWithRetry(`${API_URL}${API_PREFIX}/${appId}/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function getApplicationTimeline(appId: string): Promise<TimelineEvent[]> {
  const response = await fetchWithRetry(`${API_URL}${API_PREFIX}/${appId}/timeline`);
  return response.json();
}

export async function getAllTimeline(): Promise<TimelineEvent[]> {
  const response = await fetchWithRetry(`${API_URL}${API_PREFIX}/timeline/all`);
  return response.json();
}

export async function getDueReminders(): Promise<DueReminder[]> {
  const response = await fetchWithRetry(`${API_URL}${API_PREFIX}/reminders/due`);
  return response.json();
}

export async function triggerReminder(appId: string, reminderId: string): Promise<void> {
  await fetchWithRetry(`${API_URL}${API_PREFIX}/reminders/${appId}/${reminderId}/trigger`, {
    method: 'POST',
  });
}

// Status configuration for UI
export const TRACKING_STATUS_CONFIG: Record<TrackingApplicationStatus, { label: string; color: string; bgColor: string }> = {
  applied: { label: 'Applied', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  interviewing: { label: 'Interviewing', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  rejected: { label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-100' },
  offered: { label: 'Offered', color: 'text-green-600', bgColor: 'bg-green-100' },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  pending: { label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
};
