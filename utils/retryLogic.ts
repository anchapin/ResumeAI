/**
 * Retry logic with exponential backoff for API calls
 * Handles transient failures with exponential backoff and jitter
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  backoffMultiplier?: number;
  jitterFraction?: number; // 0-1, percentage of delay to add as jitter
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 100, // 100ms
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  jitterFraction: 0.1, // 10% jitter
};

// Status codes that should trigger retry
const RETRYABLE_STATUS_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

export interface RetryError extends Error {
  statusCode?: number;
  attemptCount: number;
  lastAttemptError?: Error;
}

/**
 * Calculate exponential backoff delay with jitter
 * @param attemptNumber 0-indexed attempt number
 * @param config retry configuration
 * @returns delay in milliseconds
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  config: Required<RetryConfig>,
): number {
  // exponential: initialDelay * (backoffMultiplier ^ attemptNumber)
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attemptNumber);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

  // add jitter: random variance of 0 to jitterFraction * delay
  const jitter = Math.random() * (cappedDelay * config.jitterFraction);
  return Math.floor(cappedDelay + jitter);
}

/**
 * Check if a status code should trigger a retry
 */
export function isRetryableStatus(statusCode: number): boolean {
  return RETRYABLE_STATUS_CODES.has(statusCode);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a fetch request with exponential backoff
 * @param url fetch URL
 * @param options fetch options
 * @param config retry configuration
 * @returns Response object
 * @throws RetryError if all retries exhausted
 */
export async function retryWithBackoff(
  url: string,
  options: RequestInit = {},
  config: RetryConfig = {},
): Promise<Response> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If status is OK or non-retryable error, return response
      if (response.ok || !isRetryableStatus(response.status)) {
        return response;
      }

      // Store response for potential error message
      lastResponse = response;

      // If retryable status and not last attempt, retry
      if (attempt < mergedConfig.maxRetries) {
        const delay = calculateBackoffDelay(attempt, mergedConfig);
        console.warn(
          `Retryable status ${response.status} for ${options.method || 'GET'} ${url}. ` +
            `Attempt ${attempt + 1}/${mergedConfig.maxRetries}, retrying in ${delay}ms`,
        );
        await sleep(delay);
        continue;
      }

      // Last attempt with retryable status, throw error
      const error = new Error(
        `Failed after ${mergedConfig.maxRetries + 1} attempts: HTTP ${response.status}`,
      ) as RetryError;
      error.attemptCount = mergedConfig.maxRetries + 1;
      error.statusCode = response.status;
      throw error;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If not last attempt, retry on network error
      if (attempt < mergedConfig.maxRetries) {
        const delay = calculateBackoffDelay(attempt, mergedConfig);
        console.warn(
          `Network error for ${options.method || 'GET'} ${url}: ${lastError.message}. ` +
            `Attempt ${attempt + 1}/${mergedConfig.maxRetries}, retrying in ${delay}ms`,
        );
        await sleep(delay);
        continue;
      }

      // Last attempt with error, throw
      const error2 = new Error(
        `Failed after ${mergedConfig.maxRetries + 1} attempts: ${lastError.message}`,
      ) as RetryError;
      error2.attemptCount = mergedConfig.maxRetries + 1;
      error2.lastAttemptError = lastError;
      throw error2;
    }
  }

  // Should not reach here
  const error = new Error(`Failed after ${mergedConfig.maxRetries + 1} attempts`) as RetryError;
  error.attemptCount = mergedConfig.maxRetries + 1;
  error.lastAttemptError = lastError || undefined;
  throw error;
}

/**
 * Wrapper for fetch that applies retry logic
 * Returns Response for successful requests (including 4xx errors except 408/429)
 * Throws RetryError only after exhausting retries
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config?: RetryConfig,
): Promise<Response> {
  return retryWithBackoff(url, options, config);
}
