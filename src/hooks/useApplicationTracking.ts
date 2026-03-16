/**
 * useApplicationTracking Hook
 * 
 * Hook for managing job application tracking with notes, reminders, and timeline.
 * 
 * @example
 * const {
 *   applications,
 *   isLoading,
 *   error,
 *   createApplication,
 *   updateApplication,
 *   deleteApplication,
 *   addNote,
 *   addReminder,
 *   getDueReminders,
 * } = useApplicationTracking();
 */

import { useCallback, useState, useEffect } from 'react';
import * as trackingApi from '../utils/tracking-api';
import type {
  TrackingApplication,
  TrackingApplicationStatus,
  CreateApplicationData,
  UpdateApplicationData,
  DueReminder,
  TimelineEvent,
} from '../utils/tracking-api';

export interface UseApplicationTrackingReturn {
  // State
  applications: TrackingApplication[];
  currentApplication: TrackingApplication | null;
  dueReminders: DueReminder[];
  timeline: TimelineEvent[];
  isLoading: boolean;
  error: string | null;
  
  // Application CRUD
  fetchApplications: (status?: TrackingApplicationStatus) => Promise<void>;
  fetchApplication: (id: string) => Promise<TrackingApplication | undefined>;
  createApplication: (data: CreateApplicationData) => Promise<TrackingApplication>;
  updateApplication: (id: string, data: UpdateApplicationData) => Promise<TrackingApplication>;
  deleteApplication: (id: string) => Promise<void>;
  
  // Notes
  addNote: (appId: string, content: string) => Promise<TrackingApplication>;
  
  // Reminders
  addReminder: (appId: string, message: string, remindAt: Date) => Promise<TrackingApplication>;
  getDueReminders: () => Promise<void>;
  triggerReminder: (appId: string, reminderId: string) => Promise<void>;
  
  // Timeline
  fetchTimeline: (appId?: string) => Promise<void>;
}

export function useApplicationTracking(): UseApplicationTrackingReturn {
  const [applications, setApplications] = useState<TrackingApplication[]>([]);
  const [currentApplication, setCurrentApplication] = useState<TrackingApplication | null>(null);
  const [dueReminders, setDueReminders] = useState<DueReminder[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all applications, optionally filtered by status.
   */
  const fetchApplications = useCallback(async (status?: TrackingApplicationStatus) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apps = await trackingApi.getApplications(status);
      setApplications(apps);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch applications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch a single application by ID.
   */
  const fetchApplication = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const app = await trackingApi.getApplication(id);
      setCurrentApplication(app);
      return app;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch application');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new application.
   */
  const createApplication = useCallback(async (data: CreateApplicationData): Promise<TrackingApplication> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const app = await trackingApi.createApplication(data);
      setApplications((prev) => [app, ...prev]);
      return app;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to create application');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update an existing application.
   */
  const updateApplication = useCallback(async (id: string, data: UpdateApplicationData): Promise<TrackingApplication> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const app = await trackingApi.updateApplication(id, data);
      setApplications((prev) => prev.map((a) => (a.id === id ? app : a)));
      if (currentApplication?.id === id) {
        setCurrentApplication(app);
      }
      return app;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to update application');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentApplication]);

  /**
   * Delete an application.
   */
  const deleteApplication = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await trackingApi.deleteApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      if (currentApplication?.id === id) {
        setCurrentApplication(null);
      }
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to delete application');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentApplication]);

  /**
   * Add a note to an application.
   */
  const addNote = useCallback(async (appId: string, content: string): Promise<TrackingApplication> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const app = await trackingApi.addNote(appId, content);
      setApplications((prev) => prev.map((a) => (a.id === appId ? app : a)));
      if (currentApplication?.id === appId) {
        setCurrentApplication(app);
      }
      return app;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to add note');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentApplication]);

  /**
   * Add a reminder to an application.
   */
  const addReminder = useCallback(async (
    appId: string,
    message: string,
    remindAt: Date
  ): Promise<TrackingApplication> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const app = await trackingApi.addReminder(appId, message, remindAt.toISOString());
      setApplications((prev) => prev.map((a) => (a.id === appId ? app : a)));
      if (currentApplication?.id === appId) {
        setCurrentApplication(app);
      }
      return app;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to add reminder');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentApplication]);

  /**
   * Get all due reminders.
   */
  const getDueReminders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const reminders = await trackingApi.getDueReminders();
      setDueReminders(reminders);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch due reminders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Mark a reminder as triggered.
   */
  const triggerReminder = useCallback(async (appId: string, reminderId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await trackingApi.triggerReminder(appId, reminderId);
      setDueReminders((prev) => 
        prev.filter((r) => r.reminder.id !== reminderId)
      );
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to trigger reminder');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch timeline events.
   */
  const fetchTimeline = useCallback(async (appId?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const events = appId
        ? await trackingApi.getApplicationTimeline(appId)
        : await trackingApi.getAllTimeline();
      setTimeline(events);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch timeline');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchApplications();
    getDueReminders();
  }, [fetchApplications, getDueReminders]);

  return {
    applications,
    currentApplication,
    dueReminders,
    timeline,
    isLoading,
    error,
    fetchApplications,
    fetchApplication,
    createApplication,
    updateApplication,
    deleteApplication,
    addNote,
    addReminder,
    getDueReminders,
    triggerReminder,
    fetchTimeline,
  };
}

export default useApplicationTracking;
