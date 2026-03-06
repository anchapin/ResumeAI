import DOMPurify from 'dompurify';

/**
 * Security configuration and utilities for ResumeAI frontend
 */

// Security configuration
const SECURITY_CONFIG = {
  // JWT token storage key
  TOKEN_STORAGE_KEY: 'resume_ai_auth_token',

  // Maximum allowed file size (10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  // Allowed file types for uploads
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'text/plain',
    'application/json',
    'image/jpeg',
    'image/png',
  ],

  // Input validation rules
  INPUT_VALIDATION: {
    NAME_MAX_LENGTH: 100,
    EMAIL_MAX_LENGTH: 254,
    PHONE_MAX_LENGTH: 20,
    LOCATION_MAX_LENGTH: 100,
    ROLE_MAX_LENGTH: 100,
    SUMMARY_MAX_LENGTH: 5000,
    EXPERIENCE_COMPANY_MAX_LENGTH: 200,
    EXPERIENCE_ROLE_MAX_LENGTH: 200,
    EXPERIENCE_DESCRIPTION_MAX_LENGTH: 2000,
    EDUCATION_INSTITUTION_MAX_LENGTH: 200,
    EDUCATION_AREA_MAX_LENGTH: 200,
    EDUCATION_STUDY_TYPE_MAX_LENGTH: 100,
    SKILL_MAX_LENGTH: 50,
    PROJECT_NAME_MAX_LENGTH: 200,
    PROJECT_DESCRIPTION_MAX_LENGTH: 2000,
    PROJECT_URL_MAX_LENGTH: 500,
    COURSE_MAX_LENGTH: 100,
    TAG_MAX_LENGTH: 50,
    HIGHLIGHT_MAX_LENGTH: 200,
  },

  // Maximum number of items allowed
  MAX_ITEM_COUNTS: {
    EXPERIENCE_ENTRIES: 20,
    EDUCATION_ENTRIES: 10,
    SKILLS: 50,
    PROJECTS: 20,
    EXPERIENCE_TAGS: 20,
    EDUCATION_COURSES: 20,
    PROJECT_ROLES: 10,
    PROJECT_HIGHLIGHTS: 10,
  },
};

// Cookie management utilities
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

const setCookie = (name: string, value: string, days: number = 7): void => {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
};

const deleteCookie = (name: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
};

// Token management - now uses httpOnly cookies (browser handles automatically)
const TokenManager = {
  setToken: (_token: string): void => {
    // No-op: tokens are now stored in httpOnly cookies by the backend
    // Browser automatically sends cookies with requests
  },

  getToken: (): string | null => {
    // Tokens are in httpOnly cookies, cannot be accessed via JavaScript
    // The browser automatically sends them with requests
    // We'll rely on 401 responses to detect token expiration
    return null;
  },

  removeToken: (): void => {
    // No-op: cookies are cleared via the logout endpoint
    // This just clears any residual localStorage state
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY);
    }
  },

  isTokenExpired: (_token: string): boolean => {
    // Cannot check token expiration since we can't read httpOnly cookies
    // Rely on API responses to detect expired tokens
    return false;
  },

  getTokenExpiration: (_token: string): number | null => {
    // Cannot read from httpOnly cookies
    return null;
  },
};

/**
 * Get JWT access token from cookie first, fallback to localStorage
 * This provides backward compatibility while transitioning to httpOnly cookies
 */
function getAuthToken(): string | null {
  // First try to get from cookie (httpOnly - more secure)
  const cookieToken = getCookie('access_token');
  if (cookieToken) {
    return cookieToken;
  }

  // Fallback to localStorage for backward compatibility
  return localStorage.getItem('resumeai_access_token');
}

// Get CSRF token from cookie
/**
 * Get CSRF token from cookie for request verification
 * @returns CSRF token string or null if not available
 */
const getCsrfToken = (): string | null => {
  return getCookie('csrf_token');
};

// Security headers for API requests
/**
 * Get security headers for API requests
 * @returns Record of header name to value mappings
 */
const getSecurityHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };

  // Add CSRF token from cookie for state-changing requests
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  // Note: Authorization header is not needed when using httpOnly cookies
  // The browser automatically sends cookies with requests

  return headers;
};

// API request wrapper with security measures
/**
 * Make a secure API call with automatic CSRF token and security headers
 * @param url - The API endpoint URL
 * @param options - Fetch options
 * @returns Promise<Response> - The fetch response
 */
const secureApiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Merge security headers with provided options
  const secureOptions: RequestInit = {
    ...options,
    credentials: 'include', // Important: include cookies in cross-origin requests
    headers: {
      ...getSecurityHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, secureOptions);

    // Check for authentication errors
    if (response.status === 401) {
      // Token might be expired, clear any residual state
      TokenManager.removeToken();
    }

    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Input sanitization utilities
/**
 * Sanitize user input to prevent XSS attacks
 * @param input - Raw user input to sanitize
 * @returns Sanitized string safe for display/storage
 */
const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return input;
  }

  // Use DOMPurify for robust XSS sanitization
  // This provides comprehensive protection against XSS attacks
  // We strip all HTML tags and attributes to ensure maximum security
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    FORCE_BODY: true,
  });
};

// Validate file upload
/**
 * Validate a file for upload based on size and type restrictions
 * @param file - The file to validate
 * @returns Object with isValid boolean and optional error message
 */
const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${(SECURITY_CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)}MB`,
    };
  }

  // Check file type
  if (!SECURITY_CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${SECURITY_CONFIG.ALLOWED_FILE_TYPES.join(', ')}`,
    };
  }

  return { isValid: true };
};

export {
  SECURITY_CONFIG,
  TokenManager,
  getSecurityHeaders,
  secureApiCall,
  sanitizeInput,
  validateFileUpload,
  getCsrfToken,
  getCookie,
  setCookie,
  deleteCookie,
  getAuthToken,
};
