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

// Token management utilities
const TokenManager = {
  /**
   * Store authentication token
   * @param token - JWT token to store
   */
  setToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY, token);
    }
  },

  /**
   * Get stored authentication token
   * @returns Stored token or null if not found
   */
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY);
    }
    return null;
  },

  /**
   * Remove stored authentication token
   */
  removeToken: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY);
    }
  },

  /**
   * Check if token is expired
   * @param token - JWT token to check
   * @returns True if token is expired, false otherwise
   */
  isTokenExpired: (token: string): boolean => {
    try {
      // Split token to get payload
      const parts = token.split('.');
      if (parts.length !== 3) {
        return true; // Invalid token format
      }

      // Decode payload (second part)
      const payload = JSON.parse(atob(parts[1]));

      // Check expiration
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp && payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Assume expired on error
    }
  },

  /**
   * Get token expiration time
   * @param token - JWT token to check
   * @returns Expiration timestamp or null if invalid
   */
  getTokenExpiration: (token: string): number | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
      console.error('Error getting token expiration:', error);
      return null;
    }
  },
};

// Security headers for API requests
const getSecurityHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };

  // Add authorization header if token exists
  const token = TokenManager.getToken();
  if (token && !TokenManager.isTokenExpired(token)) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

// API request wrapper with security measures
const secureApiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Merge security headers with provided options
  const secureOptions: RequestInit = {
    ...options,
    headers: {
      ...getSecurityHeaders(),
      ...options.headers,
    },
  };

  // Add CSRF token if available (in a real app, you'd get this from a meta tag or cookie)
  // const csrfToken = getCsrfToken();
  // if (csrfToken) {
  //   (secureOptions.headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
  // }

  try {
    const response = await fetch(url, secureOptions);

    // Check for authentication errors
    if (response.status === 401) {
      // Token might be expired, remove it
      TokenManager.removeToken();
      // In a real app, you might redirect to login
    }

    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Input sanitization utilities
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
};
