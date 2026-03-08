/**
 * Error-to-Insight Pipeline
 * Captures errors and generates actionable insights
 */

import { scrubObject } from './logScrubber';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error category types
 */
export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'validation'
  | 'rendering'
  | 'storage'
  | 'api'
  | 'unknown';

/**
 * Error insight data structure
 */
export interface ErrorInsight {
  id: string;
  timestamp: string;
  error: Error;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  insights: string[];
  suggestedActions: string[];
  frequency: number;
  firstSeen: string;
  lastSeen: string;
}

/**
 * Error tracking configuration
 */
export interface ErrorTrackingConfig {
  enabled: boolean;
  endpoint: string;
  sampleRate: number;
  maxQueueSize: number;
  categories: ErrorCategory[];
  severityThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

/**
 * Default configuration
 */
const defaultConfig: ErrorTrackingConfig = {
  enabled: import.meta?.env?.DEV === false,
  endpoint: '/api/v1/analytics/errors',
  sampleRate: 1.0,
  maxQueueSize: 50,
  categories: ['network', 'authentication', 'validation', 'rendering', 'storage', 'api', 'unknown'],
  severityThresholds: {
    low: 1,
    medium: 5,
    high: 10,
    critical: 20,
  },
};

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Categorize error based on message and stack
 */
function categorizeError(error: Error, context: Record<string, unknown>): ErrorCategory {
  const message = (error.message || '').toLowerCase();
  const stack = (error.stack || '').toLowerCase();
  const contextStr = JSON.stringify(context).toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('offline')
  ) {
    return 'network';
  }

  // Authentication errors
  if (
    message.includes('auth') ||
    message.includes('token') ||
    message.includes('login') ||
    message.includes('unauthorized') ||
    message.includes('permission')
  ) {
    return 'authentication';
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    message.includes('schema')
  ) {
    return 'validation';
  }

  // Rendering errors
  if (
    message.includes('render') ||
    message.includes('component') ||
    message.includes('mount') ||
    message.includes('dom')
  ) {
    return 'rendering';
  }

  // Storage errors
  if (
    message.includes('storage') ||
    message.includes('localstorage') ||
    message.includes('indexeddb') ||
    message.includes('quota')
  ) {
    return 'storage';
  }

  // API errors
  if (
    message.includes('api') ||
    message.includes('server') ||
    message.includes('status') ||
    contextStr.includes('api')
  ) {
    return 'api';
  }

  return 'unknown';
}

/**
 * Determine error severity based on error type and context
 */
function determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
  const message = (error.message || '').toLowerCase();

  // Critical errors
  if (
    message.includes('out of memory') ||
    message.includes('fatal') ||
    message.includes('crash')
  ) {
    return 'critical';
  }

  // High severity
  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('security') ||
    message.includes('authentication')
  ) {
    return 'high';
  }

  // Medium severity
  if (
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('network')
  ) {
    return 'medium';
  }

  // Default to low
  return 'low';
}

/**
 * Generate insights based on error
 */
function generateInsights(error: Error, category: ErrorCategory, severity: ErrorSeverity): string[] {
  const insights: string[] = [];
  const message = error.message.toLowerCase();

  // Category-based insights
  switch (category) {
    case 'network':
      insights.push('User may have connectivity issues');
      insights.push('Consider implementing offline mode');
      if (message.includes('timeout')) {
        insights.push('API timeout may indicate server load issues');
      }
      break;

    case 'authentication':
      insights.push('User session may have expired');
      insights.push('Check token refresh mechanism');
      if (message.includes('invalid')) {
        insights.push('Token may be corrupted or tampered');
      }
      break;

    case 'validation':
      insights.push('Form validation may need improvement');
      insights.push('User input may not match expected format');
      break;

    case 'rendering':
      insights.push('Component may have state issues');
      insights.push('Check for memory leaks');
      break;

    case 'storage':
      insights.push('User storage may be full');
      insights.push('Consider implementing storage cleanup');
      break;

    case 'api':
      insights.push('Backend may be experiencing issues');
      insights.push('Check API response times');
      break;

    default:
      insights.push('Error requires investigation');
  }

  // Severity-based insights
  if (severity === 'critical' || severity === 'high') {
    insights.push('High priority - investigate immediately');
  }

  return insights;
}

/**
 * Generate suggested actions
 */
function generateSuggestedActions(category: ErrorCategory): string[] {
  const actions: string[] = [];

  switch (category) {
    case 'network':
      actions.push('Implement retry with exponential backoff');
      actions.push('Add offline detection and user notification');
      break;

    case 'authentication':
      actions.push('Review token expiration logic');
      actions.push('Implement silent token refresh');
      break;

    case 'validation':
      actions.push('Improve client-side validation');
      actions.push('Add better error messages for users');
      break;

    case 'rendering':
      actions.push('Check component lifecycle methods');
      actions.push('Review state management');
      break;

    case 'storage':
      actions.push('Implement storage quota monitoring');
      actions.push('Add automatic cleanup of old data');
      break;

    case 'api':
      actions.push('Add API error handling middleware');
      actions.push('Implement request queue for retries');
      break;

    default:
      actions.push('Add error boundary');
      actions.push('Implement error logging');
  }

  return actions;
}

/**
 * Error-to-Insight Pipeline class
 */
class ErrorInsightPipeline {
  private config: ErrorTrackingConfig;
  private errorHistory: Map<string, ErrorInsight> = new Map();
  private errorQueue: ErrorInsight[] = [];
  private userId?: string;
  private sessionId?: string;

  constructor(config: Partial<ErrorTrackingConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Set user ID
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Set session ID
   */
  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Track an error and generate insights
   */
  public track(error: Error, context: Record<string, unknown> = {}): ErrorInsight {
    const errorKey = this.getErrorKey(error);
    const now = new Date().toISOString();
    const category = categorizeError(error, context);
    const severity = determineSeverity(error, category);

    // Check if we've seen this error before
    let insight: ErrorInsight;

    if (this.errorHistory.has(errorKey)) {
      const existing = this.errorHistory.get(errorKey)!;
      insight = {
        ...existing,
        frequency: existing.frequency + 1,
        lastSeen: now,
      };
    } else {
      insight = {
        id: generateErrorId(),
        timestamp: now,
        error,
        message: error.message,
        stack: error.stack,
        severity,
        category,
        context: scrubObject(context),
        userId: this.userId,
        sessionId: this.sessionId,
        insights: generateInsights(error, category, severity),
        suggestedActions: generateSuggestedActions(category),
        frequency: 1,
        firstSeen: now,
        lastSeen: now,
      };
    }

    // Store in history
    this.errorHistory.set(errorKey, insight);

    // Queue for sending
    if (this.config.enabled && Math.random() <= this.config.sampleRate) {
      this.errorQueue.push(insight);

      if (this.errorQueue.length >= this.config.maxQueueSize) {
        this.flush().catch(console.error);
      }
    }

    return insight;
  }

  /**
   * Get error key for deduplication
   */
  private getErrorKey(error: Error): string {
    // Create a hash from error message and stack
    const key = `${error.message.substring(0, 50)}_${(error.stack || '').substring(0, 50)}`;
    return key.replace(/\s+/g, '_');
  }

  /**
   * Flush error queue to endpoint
   */
  public async flush(): Promise<void> {
    if (this.errorQueue.length === 0) {
      return;
    }

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors }),
        keepalive: true,
      });

      if (!response.ok) {
        this.errorQueue = [...errors, ...this.errorQueue];
      }
    } catch {
      this.errorQueue = [...errors, ...this.errorQueue];
    }
  }

  /**
   * Get error frequency
   */
  public getErrorFrequency(errorKey: string): number {
    const insight = this.errorHistory.get(errorKey);
    return insight?.frequency || 0;
  }

  /**
   * Get all tracked errors
   */
  public getAllErrors(): ErrorInsight[] {
    return Array.from(this.errorHistory.values());
  }

  /**
   * Get high-frequency errors
   */
  public getHighFrequencyErrors(): ErrorInsight[] {
    return Array.from(this.errorHistory.values()).filter(
      (error) => error.frequency >= this.config.severityThresholds.high,
    );
  }

  /**
   * Clear error history
   */
  public clear(): void {
    this.errorHistory.clear();
    this.errorQueue = [];
  }
}

// Export singleton
export const errorInsights = new ErrorInsightPipeline();

// Also export class for multiple instances
export { ErrorInsightPipeline };

// Convenience tracking function
export const trackError = (error: Error, context?: Record<string, unknown>) =>
  errorInsights.track(error, context);
