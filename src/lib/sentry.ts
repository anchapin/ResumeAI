/**
 * Sentry Error Tracking Configuration for ResumeAI
 * 
 * This module provides centralized Sentry integration for:
 * - Frontend error tracking
 * - User context attachment
 * - Request/session context
 * - Custom tags and breadcrumbs
 * 
 * Setup:
 * 1. Create account at https://sentry.io
 * 2. Create new project for ResumeAI frontend
 * 3. Copy DSN to .env.local as VITE_SENTRY_DSN
 * 4. Configure environment variables as needed
 */

import * as Sentry from '@sentry/react';

/**
 * Sentry configuration options
 */
export interface SentryConfig {
  dsn: string | undefined;
  environment: string;
  release: string;
  sampleRate: number;
  tracesSampleRate: number;
  enableTracing: boolean;
}

/**
 * Get Sentry configuration from environment
 */
function getSentryConfig(): SentryConfig {
  return {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE || 'development',
    release: `resumeai@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    sampleRate: parseFloat(import.meta.env.VITE_SENTRY_SAMPLE_RATE || '1.0'),
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACE_RATE || '0.1'),
    enableTracing: import.meta.env.DEV === false, // Only enable in production
  };
}

/**
 * Initialize Sentry with React error boundary
 */
export function initSentry() {
  const config = getSentryConfig();
  
  // Don't initialize if no DSN is configured
  if (!config.dsn) {
    console.warn('Sentry DSN not configured. Error tracking is disabled.');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    sampleRate: config.sampleRate,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    tracesSampleRate: config.tracesSampleRate,
    
    // Ignore certain errors
    ignoreErrors: [
      // Network errors (already handled by app)
      /^Network Error$/,
      /fetch failed/i,
      // Browser extensions
      /Extension context invalidated/i,
      /ResizeObserver/i,
      // Third-party script errors
      /Loading chunk \d+ failed/i,
    ],
    
    // Filter events before sending
    beforeSend(event: Sentry.ErrorEvent, hint: Sentry.EventHint) {
      // Don't send errors from development mode
      if (config.environment === 'development') {
        return null;
      }
      
      // Add app-specific tags
      event.tags = {
        ...event.tags,
        app: 'ResumeAI',
        frontend: 'react',
      };
      
      // Filter out certain errors
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore specific known benign errors
        if (error.message.includes('ResizeObserver')) {
          return null;
        }
      }
      
      return event;
    },
  });
  
  console.log(`Sentry initialized in ${config.environment} environment`);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
} | null): void {
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  category: string = 'action',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set custom tags for error tracking
 */
export function setTags(tags: Record<string, string>): void {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value);
  });
}

/**
 * Set extra context for error tracking
 */
export function setExtraContext(context: Record<string, unknown>): void {
  Object.entries(context).forEach(([key, value]) => {
    Sentry.setExtra(key, value);
  });
}

/**
 * Capture custom error with context
 */
export function captureError(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: Sentry.SeverityLevel;
  },
): string | undefined {
  if (context?.tags) {
    setTags(context.tags);
  }
  
  if (context?.extra) {
    setExtraContext(context.extra);
  }
  
  return Sentry.captureException(error, {
    level: context?.level,
  });
}

/**
 * Capture custom message with context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
): string | undefined {
  return Sentry.captureMessage(message, level);
}

/**
 * Create Sentry error boundary component wrapper
 */
export function withSentryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactElement | undefined,
): React.ComponentType<P> {
  return Sentry.withErrorBoundary(Component, {
    fallback,
    showDialog: false, // Set to true for production to allow users to report issues
  });
}

/**
 * Transaction tracing for performance monitoring
 */
export function startTransaction<T>(
  name: string,
  op: string,
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op,
    },
    fn,
  );
}

// Re-export Sentry for direct usage when needed
export { Sentry };
