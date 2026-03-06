/**
 * Request signing utilities for API security
 * Implements HMAC-SHA256 request signing with timestamp and nonce
 * @packageDocumentation
 */

import { getCookie } from '../../utils/security';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const SIGNATURE_SECRET = import.meta.env.VITE_REQUEST_SIGNING_SECRET || '';

/**
 * Computes HMAC-SHA256 signature for request signing
 *
 * @param secretKey - The secret key for signing
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - Request path
 * @param timestamp - Unix timestamp
 * @param nonce - Unique nonce value
 * @param body - Request body (optional)
 * @returns Promise<string> - Hex-encoded signature
 */
async function computeSignature(
  secretKey: string,
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body: string = '',
): Promise<string> {
  const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(message);

  return crypto.subtle
    .importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    .then((key) => crypto.subtle.sign('HMAC', key, messageData))
    .then((signature) => {
      const hashArray = Array.from(new Uint8Array(signature));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    });
}

/**
 * Generates a cryptographically secure random nonce
 *
 * @returns A 32-character hex-encoded nonce
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Gets current Unix timestamp in seconds
 *
 * @returns Unix timestamp as string
 */
function getTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * Makes a signed fetch request with HMAC-SHA256 signature
 *
 * Adds X-Timestamp, X-Nonce, and X-Signature headers for request verification.
 * Also includes Authorization and X-CSRF-Token headers when available.
 *
 * @param endpoint - API endpoint path
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Promise<Response> - Fetch response
 *
 * @example
 * const response = await signedFetch('/api/resumes', {
 *   method: 'POST',
 *   body: JSON.stringify({ title: 'My Resume' })
 * });
 */
export async function signedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  if (!SIGNATURE_SECRET) {
    return fetch(`${API_URL}${endpoint}`, options);
  }

  const method = options.method || 'GET';
  const timestamp = getTimestamp();
  const nonce = generateNonce();

  let bodyStr = '';
  if (options.body) {
    bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const signature = await computeSignature(
    SIGNATURE_SECRET,
    method,
    endpoint,
    timestamp,
    nonce,
    bodyStr,
  );

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': signature,
  };

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && bodyStr) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  // Get access token from httpOnly cookie (set by backend on login)
  // Note: With httpOnly cookies, the browser automatically sends the token
  // However, for signedFetch we may still need it for the signature calculation
  const token = getCookie('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Get CSRF token from cookie for state-changing requests
  const csrfToken = getCookie('csrf_token');
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    body: bodyStr || options.body,
    credentials: 'include',
  });
}

/**
 * Typed API client with signedFetch
 *
 * Provides convenience methods for common HTTP operations with automatic signing.
 *
 * @example
 * // GET request
 * const resumes = await api.get('/api/resumes');
 *
 * @example
 * // POST request
 * const newResume = await api.post('/api/resumes', { title: 'My Resume' });
 */
export const api = {
  get: (endpoint: string, options?: RequestInit) =>
    signedFetch(endpoint, { ...options, method: 'GET' }),

  post: (endpoint: string, body?: unknown, options?: RequestInit) =>
    signedFetch(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: (endpoint: string, body?: unknown, options?: RequestInit) =>
    signedFetch(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: (endpoint: string, options?: RequestInit) =>
    signedFetch(endpoint, { ...options, method: 'DELETE' }),

  patch: (endpoint: string, body?: unknown, options?: RequestInit) =>
    signedFetch(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
};
