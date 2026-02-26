/**
 * Fetch utility with timeout support using AbortController.
 * Provides a mechanism to abort fetch requests after a specified duration.
 */

/**
 * Creates an AbortController with a timeout.
 *
 * @param timeoutMs - Timeout duration in milliseconds
 * @returns AbortController that will abort after the specified timeout
 *
 * @example
 * const controller = createTimeoutAbortController(5000);
 * const response = await fetch(url, { signal: controller.signal });
 */
export function createTimeoutAbortController(timeoutMs: number): AbortController {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  // Store timeout ID on controller for potential cleanup
  (controller as any).__timeoutId = timeoutId;

  return controller;
}

/**
 * Clears the timeout associated with an AbortController created by createTimeoutAbortController.
 *
 * @param controller - The AbortController to clean up
 */
export function clearTimeoutAbortController(controller: AbortController): void {
  const timeoutId = (controller as any).__timeoutId;
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
    delete (controller as any).__timeoutId;
  }
}

/**
 * Fetch wrapper with timeout support.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (0 = no timeout)
 * @returns Promise that resolves with the response or rejects on timeout
 *
 * @example
 * const response = await fetchWithTimeout('/api/data', {}, 5000);
 */
export async function fetchWithTimeout(
  url: string | URL,
  options: RequestInit = {},
  timeoutMs: number = 0,
): Promise<Response> {
  // If no timeout specified, just use regular fetch
  if (timeoutMs <= 0) {
    return fetch(url, options);
  }

  const controller = createTimeoutAbortController(timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    // Always clean up the timeout
    clearTimeoutAbortController(controller);
  }
}

/**
 * Check if an error is a timeout error.
 *
 * @param error - The error to check
 * @returns True if the error is a timeout error
 *
 * @example
 * try {
 *   await fetchWithTimeout(url, {}, 5000);
 * } catch (error) {
 *   if (isTimeoutError(error)) {
 *     console.log('Request timed out');
 *   }
 * }
 */
export function isTimeoutError(error: any): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error?.name === 'TimeoutError') {
    return true;
  }
  if (error?.message?.includes('timeout') || error?.message?.includes('Timeout')) {
    return true;
  }
  return false;
}

/**
 * Standard timeout values for different types of operations.
 */
export const TIMEOUT_CONFIG = Object.freeze({
  /** Timeout for quick operations like metadata fetches */
  QUICK: 5000,

  /** Timeout for standard API calls */
  STANDARD: 10000,

  /** Timeout for longer operations like PDF generation */
  PDF_GENERATION: 15000,

  /** Timeout for AI operations like tailoring */
  AI_OPERATION: 15000,

  /** No timeout */
  NONE: 0,
});
