/**
 * Log scrubbing utilities to remove sensitive information from logs
 */

// Patterns that match sensitive data
const SENSITIVE_PATTERNS = [
  // API Keys (generic patterns)
  { pattern: /api[_-]?key["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})/gi, replacement: 'api_key: [REDACTED]' },
  // Bearer tokens
  { pattern: /Bearer\s+[a-zA-Z0-9_\-\.]+/gi, replacement: 'Bearer [REDACTED]' },
  // JWT tokens
  { pattern: /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g, replacement: '[JWT_REDACTED]' },
  // Passwords in key-value format
  { pattern: /password["']?\s*[:=]\s*["']?([^"'\s]{4,})/gi, replacement: 'password: [REDACTED]' },
  // Secret keys
  { pattern: /secret[_-]?key["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})/gi, replacement: 'secret_key: [REDACTED]' },
  // Authorization headers
  { pattern: /Authorization:\s*[^\s]+/gi, replacement: 'Authorization: [REDACTED]' },
  // Private keys
  { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, replacement: '[PRIVATE_KEY_REDACTED]' },
  // AWS keys
  { pattern: /(?:AKIA|A3T|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g, replacement: '[AWS_KEY_REDACTED]' },
  // Credit card numbers (basic pattern)
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CREDIT_CARD_REDACTED]' },
  // Social Security Numbers
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, replacement: '[SSN_REDACTED]' },
  // Email addresses (optional - might want to keep for debugging)
  { pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL_REDACTED]' },
  // Bearer token shorthand
  { pattern: /token["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{20,})/gi, replacement: 'token: [REDACTED]' },
  // Access tokens
  { pattern: /access[_-]?token["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})/gi, replacement: 'access_token: [REDACTED]' },
  // Refresh tokens
  { pattern: /refresh[_-]?token["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})/gi, replacement: 'refresh_token: [REDACTED]' },
];

/**
 * Redacts sensitive information from a string
 * @param input - The input string to scrub
 * @returns The scrubbed string with sensitive data replaced
 */
export function scrubSensitiveData(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  let result = input;

  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Redacts sensitive information from an object
 * Handles nested objects, arrays, and various data types
 * @param data - The object to scrub
 * @param knownKeys - Additional keys to treat as sensitive (optional)
 * @returns A new object with sensitive data redacted
 */
export function scrubObject<T extends object>(data: T, knownKeys?: string[]): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Default sensitive key patterns
  const sensitiveKeyPatterns = [
    /key$/i,
    /token$/i,
    /secret$/i,
    /password$/i,
    /credential/i,
    /auth/i,
    /private/i,
    /ssn/i,
    /credit_?card/i,
  ];

  const additionalSensitiveKeys = knownKeys || [];

  const isSensitiveKey = (key: string): boolean => {
    return (
      sensitiveKeyPatterns.some((pattern) => pattern.test(key)) ||
      additionalSensitiveKeys.includes(key.toLowerCase())
    );
  };

  const scrub = (obj: unknown): unknown => {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return scrubSensitiveData(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => scrub(item));
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (isSensitiveKey(key)) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = scrub(value);
        }
      }
      return result;
    }

    return obj;
  };

  return scrub(data) as T;
}

/**
 * Creates a log scrubber function for a specific logger context
 * @param context - The logging context (e.g., 'API', 'Auth')
 * @returns A function that scrubs log messages
 */
export function createLogScrubber(context?: string): (message: string, ...args: unknown[]) => unknown[] {
  return (message: string, ...args: unknown[]): unknown[] => {
    const scrubbedMessage = scrubSensitiveData(message);
    const scrubbedArgs = args.map((arg) => {
      if (typeof arg === 'string') {
        return scrubSensitiveData(arg);
      }
      if (typeof arg === 'object' && arg !== null) {
        return scrubObject(arg as object);
      }
      return arg;
    });
    return [scrubbedMessage, ...scrubbedArgs];
  };
}
