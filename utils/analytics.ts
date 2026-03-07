/**
 * Product Analytics Instrumentation
 * Tracks user interactions and product usage for analytics
 */

import { scrubObject } from './logScrubber';

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'page_view'
  | 'button_click'
  | 'form_submit'
  | 'export'
  | 'import'
  | 'error'
  | 'feature_used'
  | 'session_start'
  | 'session_end';

/**
 * Analytics event data
 */
export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  timestamp: string;
  userId?: string;
  sessionId: string;
  properties: Record<string, unknown>;
  metadata?: {
    url?: string;
    userAgent?: string;
    referrer?: string;
  };
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  enabled: boolean;
  endpoint: string;
  sampleRate: number; // 0-1, percentage of events to send
  flushInterval: number; // milliseconds
  maxQueueSize: number;
}

/**
 * Default analytics configuration
 */
const defaultConfig: AnalyticsConfig = {
  enabled: import.meta?.env?.DEV === false, // Only enabled in production by default
  endpoint: '/api/v1/analytics/events',
  sampleRate: 1.0, // 100% in development, can be lowered in production
  flushInterval: 5000, // 5 seconds
  maxQueueSize: 100,
};

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Analytics tracker class
 */
class AnalyticsTracker {
  private config: AnalyticsConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private flushTimer?: ReturnType<typeof setInterval>;
  private isFlushing = false;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.sessionId = generateSessionId();

    // Auto-flush at interval
    if (this.config.enabled) {
      this.startAutoFlush();
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart auto-flush if enabled state changed
    if (this.config.enabled && !this.flushTimer) {
      this.startAutoFlush();
    } else if (!this.config.enabled && this.flushTimer) {
      this.stopAutoFlush();
    }
  }

  /**
   * Set user ID for tracking
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Clear user ID (on logout)
   */
  public clearUserId(): void {
    this.userId = undefined;
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.config.flushInterval);
  }

  /**
   * Stop auto-flush timer
   */
  private stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Track an analytics event
   */
  public track(eventType: AnalyticsEventType, properties: Record<string, unknown> = {}): void {
    if (!this.config.enabled) {
      return;
    }

    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    const event: AnalyticsEvent = {
      eventType,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
      properties: scrubObject(properties), // Scrub any sensitive data
      metadata: typeof window !== 'undefined' ? {
        url: window.location?.href,
        userAgent: navigator?.userAgent,
        referrer: document?.referrer,
      } : undefined,
    };

    // Add to queue
    this.eventQueue.push(event);

    // Flush if queue is full
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      this.flush().catch(console.error);
    }
  }

  /**
   * Flush events to the analytics endpoint
   */
  public async flush(): Promise<void> {
    if (this.isFlushing || this.eventQueue.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
        keepalive: true, // Ensure request completes even if page unloads
      });

      if (!response.ok) {
        // Re-queue events on failure
        this.eventQueue = [...events, ...this.eventQueue];
        console.warn('[Analytics] Failed to send events, re-queued');
      }
    } catch (error) {
      // Re-queue events on error
      console.error('[Analytics] Error sending events:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Track page view
   */
  public trackPageView(pageName: string, properties: Record<string, unknown> = {}): void {
    this.track('page_view', { pageName, ...properties });
  }

  /**
   * Track button click
   */
  public trackButtonClick(buttonId: string, properties: Record<string, unknown> = {}): void {
    this.track('button_click', { buttonId, ...properties });
  }

  /**
   * Track form submission
   */
  public trackFormSubmit(formId: string, properties: Record<string, unknown> = {}): void {
    this.track('form_submit', { formId, ...properties });
  }

  /**
   * Track export action
   */
  public trackExport(format: 'pdf' | 'json' | 'docx', properties: Record<string, unknown> = {}): void {
    this.track('export', { format, ...properties });
  }

  /**
   * Track import action
   */
  public trackImport(source: 'linkedin' | 'file' | 'manual', properties: Record<string, unknown> = {}): void {
    this.track('import', { source, ...properties });
  }

  /**
   * Track error
   */
  public trackError(errorType: string, properties: Record<string, unknown> = {}): void {
    this.track('error', { errorType, ...properties });
  }

  /**
   * Track feature usage
   */
  public trackFeatureUsed(featureName: string, properties: Record<string, unknown> = {}): void {
    this.track('feature_used', { featureName, ...properties });
  }

  /**
   * Track session start
   */
  public trackSessionStart(): void {
    this.track('session_start', { sessionDuration: 0 });
  }

  /**
   * Track session end
   */
  public trackSessionEnd(): void {
    this.track('session_end', { eventCount: this.eventQueue.length });
  }

  /**
   * End the current session and start a new one
   */
  public newSession(): void {
    this.trackSessionEnd();
    this.sessionId = generateSessionId();
    this.trackSessionStart();
  }

  /**
   * Cleanup - stop timers and flush remaining events
   */
  public destroy(): void {
    this.stopAutoFlush();
    this.flush().catch(console.error);
  }
}

// Export singleton instance
export const analytics = new AnalyticsTracker();

// Also export the class for testing or multiple instances
export { AnalyticsTracker };

// Convenience functions for common tracking
export const trackPageView = (pageName: string, props?: Record<string, unknown>) =>
  analytics.trackPageView(pageName, props);

export const trackButtonClick = (buttonId: string, props?: Record<string, unknown>) =>
  analytics.trackButtonClick(buttonId, props);

export const trackFormSubmit = (formId: string, props?: Record<string, unknown>) =>
  analytics.trackFormSubmit(formId, props);

export const trackExport = (format: 'pdf' | 'json' | 'docx', props?: Record<string, unknown>) =>
  analytics.trackExport(format, props);

export const trackImport = (source: 'linkedin' | 'file' | 'manual', props?: Record<string, unknown>) =>
  analytics.trackImport(source, props);

export const trackError = (errorType: string, props?: Record<string, unknown>) =>
  analytics.trackError(errorType, props);

export const trackFeatureUsed = (featureName: string, props?: Record<string, unknown>) =>
  analytics.trackFeatureUsed(featureName, props);
