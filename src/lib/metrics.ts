/**
 * Metrics Collection for ResumeAI
 *
 * Provides client-side metrics collection for:
 * - Performance metrics (Core Web Vitals)
 * - Custom application metrics
 * - User interaction tracking
 * - API performance metrics
 *
 * Metrics are collected and can be sent to the backend for aggregation.
 */

import { StorageManager } from './storage';

export type MetricType =
  | 'counter'
  | 'gauge'
  | 'histogram'
  | 'timing';

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  labels?: Record<string, string>;
}

const METRICS_ENABLED_KEY = 'resumeai_metrics_enabled';
const METRICS_BUFFER_KEY = 'resumeai_metrics_buffer';
const MAX_BUFFER_SIZE = 100;

// Core Web Vitals thresholds (ms)
export const WEB_VITALS_THRESHODS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Check if metrics collection is enabled
 */
export function isMetricsEnabled(): boolean {
  const stored = StorageManager.getItem<string>(METRICS_ENABLED_KEY);
  return stored === 'true';
}

/**
 * Enable or disable metrics collection
 */
export function setMetricsEnabled(enabled: boolean): void {
  StorageManager.setItem(METRICS_ENABLED_KEY, enabled ? 'true' : 'false', {
    compress: false,
    checkQuota: false,
  });
}

/**
 * Get all buffered metrics
 */
export function getBufferedMetrics(): Metric[] {
  const stored = localStorage.getItem(METRICS_BUFFER_KEY);
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
 * Add a metric to the buffer
 */
function addMetricToBuffer(metric: Metric): void {
  if (!isMetricsEnabled()) {
    return;
  }

  const metrics = getBufferedMetrics();
  metrics.push(metric);

  // Keep only recent metrics to avoid localStorage limits
  const trimmedMetrics = metrics.slice(-MAX_BUFFER_SIZE);
  localStorage.setItem(METRICS_BUFFER_KEY, JSON.stringify(trimmedMetrics));

  // Log in development for debugging
  if (import.meta.env.DEV) {
    console.log('[Metrics]', metric);
  }
}

/**
 * Record a counter metric
 */
export function incrementCounter(
  name: string,
  labels?: Record<string, string>,
): void {
  addMetricToBuffer({
    name,
    type: 'counter',
    value: 1,
    labels,
    timestamp: Date.now(),
  });
}

/**
 * Record a gauge metric
 */
export function setGauge(
  name: string,
  value: number,
  labels?: Record<string, string>,
): void {
  addMetricToBuffer({
    name,
    type: 'gauge',
    value,
    labels,
    timestamp: Date.now(),
  });
}

/**
 * Record a histogram/timing metric
 */
export function recordTiming(
  name: string,
  value: number,
  labels?: Record<string, string>,
): void {
  addMetricToBuffer({
    name,
    type: 'histogram',
    value,
    labels,
    timestamp: Date.now(),
  });
}

/**
 * Record performance timing from Performance API
 */
export function recordPerformanceTiming(
  name: string,
  duration: number,
  labels?: Record<string, string>,
): void {
  recordTiming(`frontend_${name}_duration_seconds`, duration / 1000, labels);
}

/**
 * Clear all buffered metrics
 */
export function clearMetricsBuffer(): void {
  localStorage.removeItem(METRICS_BUFFER_KEY);
}

/**
 * Core Web Vitals performance observer
 */
export function initWebVitals(): void {
  if (!isMetricsEnabled()) {
    return;
  }

  // Only run in browser environment
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  // Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
        renderTime?: number;
        loadTime?: number;
      };
      const lcpValue = lastEntry.renderTime || lastEntry.loadTime || 0;

      recordTiming(
        'frontend_lcp_duration_seconds',
        lcpValue / 1000,
        getWebVitalRating(lcpValue, 'LCP'),
      );
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('LCP observer not supported');
  }

  // First Input Delay (FID) / Interaction to Next Paint (INP)
  try {
    const inpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
        processingStart?: number;
        duration?: number;
      };
      const inpValue = lastEntry.processingStart
        ? lastEntry.processingStart - (lastEntry as PerformanceEventTiming).startTime
        : lastEntry.duration || 0;

      recordTiming(
        'frontend_inp_duration_seconds',
        inpValue / 1000,
        getWebVitalRating(inpValue, 'FID'),
      );
    });
    inpObserver.observe({ entryTypes: ['first-input', 'event'] });
  } catch (e) {
    console.warn('INP observer not supported');
  }

  // Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as PerformanceEntry & {
          value?: number;
          hadRecentInput?: boolean;
        };
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value || 0;
        }
      }

      recordTiming(
        'frontend_cls_score',
        clsValue,
        getWebVitalRating(clsValue * 1000, 'CLS'),
      );
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    console.warn('CLS observer not supported');
  }

  // First Contentful Paint (FCP)
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries[0] as PerformanceEntry & { renderTime?: number };
      const fcpValue = fcpEntry.renderTime || 0;

      recordTiming(
        'frontend_fcp_duration_seconds',
        fcpValue / 1000,
        getWebVitalRating(fcpValue, 'FCP'),
      );
    });
    fcpObserver.observe({ entryTypes: ['paint'] });
  } catch (e) {
    console.warn('FCP observer not supported');
  }
}

/**
 * Get rating based on Web Vitals thresholds
 */
function getWebVitalRating(
  value: number,
  metric: keyof typeof WEB_VITALS_THRESHODS,
): Record<string, string> {
  const thresholds = WEB_VITALS_THRESHODS[metric];
  let rating: string;

  if (metric === 'CLS') {
    // CLS is already a score, convert from ms
    const clsValue = value * 1000;
    if (clsValue <= thresholds.good) {
      rating = 'good';
    } else if (clsValue <= thresholds.poor) {
      rating = 'needs-improvement';
    } else {
      rating = 'poor';
    }
  } else {
    if (value <= thresholds.good) {
      rating = 'good';
    } else if (value <= thresholds.poor) {
      rating = 'needs-improvement';
    } else {
      rating = 'poor';
    }
  }

  return { rating };
}

/**
 * Track page load performance
 */
export function trackPageLoad(pageName: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const timing = performance.timing;
  const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
  const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
  const domInteractive = timing.domInteractive - timing.navigationStart;

  recordPerformanceTiming(`${pageName}_page_load`, pageLoadTime);
  recordPerformanceTiming(`${pageName}_dom_content_loaded`, domContentLoaded);
  recordPerformanceTiming(`${pageName}_dom_interactive`, domInteractive);

  // Record connection type if available
  const connection = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
  if (connection) {
    setGauge('frontend_network_effective_type', 0, {
      effectiveType: connection.effectiveType || 'unknown',
    });
  }
}

/**
 * Track API request performance
 */
export function trackApiRequest(
  endpoint: string,
  method: string,
  statusCode: number,
  durationMs: number,
): void {
  recordPerformanceTiming('api_request', durationMs, {
    endpoint,
    method,
    status: statusCode.toString(),
  });

  // Track success/failure
  if (statusCode >= 200 && statusCode < 300) {
    incrementCounter('frontend_api_requests_success_total', {
      endpoint,
      method,
    });
  } else {
    incrementCounter('frontend_api_requests_error_total', {
      endpoint,
      method,
      status: statusCode.toString(),
    });
  }
}

/**
 * Track React component render performance
 */
export function trackComponentRender(
  componentName: string,
  renderDurationMs: number,
): void {
  recordPerformanceTiming(`${componentName}_render`, renderDurationMs);
}

/**
 * Track user interactions
 */
export function trackUserInteraction(
  element: string,
  action: 'click' | 'focus' | 'blur' | 'submit',
  labels?: Record<string, string>,
): void {
  incrementCounter('frontend_user_interactions_total', {
    element,
    action,
    ...labels,
  });
}

/**
 * Track error occurrences
 */
export function trackError(
  errorType: string,
  context?: string,
): void {
  incrementCounter('frontend_errors_total', {
    errorType,
    context: context || 'unknown',
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(
  feature: string,
  action: 'use' | 'enable' | 'disable' | 'configure',
): void {
  incrementCounter('frontend_feature_usage_total', {
    feature,
    action,
  });
}

/**
 * Track session metrics
 */
export function trackSessionMetrics(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Track viewport dimensions
  setGauge('frontend_viewport_width', window.innerWidth);
  setGauge('frontend_viewport_height', window.innerHeight);

  // Track device pixel ratio
  setGauge('frontend_device_pixel_ratio', window.devicePixelRatio);

  // Track online status
  setGauge('frontend_online_status', navigator.onLine ? 1 : 0);
}

// Predefined metric names for consistency
export const METRIC_NAMES = {
  // Page metrics
  PAGE_VIEW: 'frontend_page_views_total',
  PAGE_LOAD: 'frontend_page_load_duration_seconds',
  PAGE_ERROR: 'frontend_page_errors_total',

  // API metrics
  API_REQUEST: 'frontend_api_requests_total',
  API_REQUEST_DURATION: 'frontend_api_request_duration_seconds',
  API_ERROR: 'frontend_api_errors_total',

  // User interaction metrics
  BUTTON_CLICK: 'frontend_button_clicks_total',
  FORM_SUBMIT: 'frontend_form_submits_total',
  NAVIGATION: 'frontend_navigation_total',

  // Error metrics
  JS_ERROR: 'frontend_js_errors_total',
  RUNTIME_ERROR: 'frontend_runtime_errors_total',

  // Performance metrics
  WEB_VITALS: 'frontend_web_vitals_score',
  COMPONENT_RENDER: 'frontend_component_render_duration_seconds',

  // Feature metrics
  FEATURE_USE: 'frontend_feature_usage_total',

  // Session metrics
  SESSION_VIEWPORT: 'frontend_viewport_dimensions',
  SESSION_ONLINE: 'frontend_session_online_status',
} as const;
