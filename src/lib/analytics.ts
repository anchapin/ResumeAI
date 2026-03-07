import { StorageManager } from './storage';

/**
 * Product Analytics Instrumentation
 *
 * Provides a simple interface for tracking user events and behaviors.
 * Currently uses localStorage for event storage - can be extended to
 * integrate with analytics providers like Google Analytics, Mixpanel, etc.
 */

export type EventCategory =
  | 'navigation'
  | 'resume'
  | 'editor'
  | 'export'
  | 'settings'
  | 'auth'
  | 'error';

export interface AnalyticsEvent {
  name: string;
  category: EventCategory;
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
}

const ANALYTICS_ENABLED_KEY = 'resumeai_analytics_enabled';
const ANALYTICS_EVENTS_KEY = 'resumeai_analytics_events';

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  const stored = StorageManager.getItem<string>(ANALYTICS_ENABLED_KEY);
  return stored === 'true';
}

/**
 * Enable or disable analytics collection
 */
export function setAnalyticsEnabled(enabled: boolean): void {
  StorageManager.setItem(ANALYTICS_ENABLED_KEY, enabled ? 'true' : 'false', {
    compress: false,
    checkQuota: false,
  });
}

/**
 * Track an analytics event
 */
export function trackEvent(
  name: string,
  category: EventCategory,
  properties?: Record<string, string | number | boolean>
): void {
  if (!isAnalyticsEnabled()) {
    return;
  }

  const event: AnalyticsEvent = {
    name,
    category,
    properties,
    timestamp: Date.now(),
  };

  // Store event locally (in production, this would send to an analytics service)
  const events = getStoredEvents();
  events.push(event);

  // Keep only last 100 events to avoid localStorage limits
  const trimmedEvents = events.slice(-100);
  localStorage.setItem(ANALYTICS_EVENTS_KEY, JSON.stringify(trimmedEvents));

  // Log in development for debugging
  if (import.meta.env.DEV) {
    console.log('[Analytics]', event);
  }
}

/**
 * Get all stored analytics events
 */
export function getStoredEvents(): AnalyticsEvent[] {
  const stored = localStorage.getItem(ANALYTICS_EVENTS_KEY);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Clear all stored analytics events
 */
export function clearAnalyticsEvents(): void {
  localStorage.removeItem(ANALYTICS_EVENTS_KEY);
}

/**
 * Common navigation events
 */
export const navigationEvents = {
  pageView: (page: string) =>
    trackEvent('page_view', 'navigation', { page }),
  navigate: (from: string, to: string) =>
    trackEvent('navigate', 'navigation', { from, to }),
};

/**
 * Common resume events
 */
export const resumeEvents = {
  create: (templateId?: string) =>
    trackEvent('resume_create', 'resume', { templateId: templateId ?? '' }),
  open: (resumeId: string) =>
    trackEvent('resume_open', 'resume', { resumeId }),
  save: (resumeId: string) =>
    trackEvent('resume_save', 'resume', { resumeId }),
  delete: (resumeId: string) =>
    trackEvent('resume_delete', 'resume', { resumeId }),
  duplicate: (sourceId: string, newId: string) =>
    trackEvent('resume_duplicate', 'resume', { sourceId, newId }),
};

/**
 * Common editor events
 */
export const editorEvents = {
  startEdit: (section: string) =>
    trackEvent('editor_start_edit', 'editor', { section }),
  updateField: (field: string, section: string) =>
    trackEvent('editor_update_field', 'editor', { field, section }),
  addSection: (sectionType: string) =>
    trackEvent('editor_add_section', 'editor', { sectionType }),
  removeSection: (sectionType: string) =>
    trackEvent('editor_remove_section', 'editor', { sectionType }),
  reorderSections: () =>
    trackEvent('editor_reorder_sections', 'editor'),
};

/**
 * Common export events
 */
export const exportEvents = {
  startExport: (format: 'pdf' | 'json' | 'package') =>
    trackEvent('export_start', 'export', { format }),
  completeExport: (format: 'pdf' | 'json' | 'package', success: boolean) =>
    trackEvent('export_complete', 'export', { format, success }),
  download: (format: string) =>
    trackEvent('export_download', 'export', { format }),
};

/**
 * Common settings events
 */
export const settingsEvents = {
  update: (setting: string, value: string) =>
    trackEvent('settings_update', 'settings', { setting, value }),
  toggleTheme: (theme: 'light' | 'dark') =>
    trackEvent('settings_toggle_theme', 'settings', { theme }),
  updateApiKey: (success: boolean) =>
    trackEvent('settings_update_api_key', 'settings', { success }),
};

/**
 * Common auth events
 */
export const authEvents = {
  login: (method: string) =>
    trackEvent('auth_login', 'auth', { method }),
  logout: () =>
    trackEvent('auth_logout', 'auth'),
  signup: (method: string) =>
    trackEvent('auth_signup', 'auth', { method }),
};

/**
 * Common error events
 */
export const errorEvents = {
  occur: (errorType: string, message: string, context?: string) =>
    trackEvent('error_occur', 'error', { errorType, message, context: context ?? '' }),
  handle: (errorType: string, handled: boolean) =>
    trackEvent('error_handle', 'error', { errorType, handled }),
};
