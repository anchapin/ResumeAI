/* eslint-disable complexity */
/**
 * Client-side validation utilities for ResumeAI application
 */

// Type definitions for validation options
interface StringOptions {
  maxLength?: number;
  minLength?: number;
  pattern?: string | RegExp;
}

interface NumberOptions {
  min?: number;
  max?: number;
}

interface ArrayOptions {
  maxItems?: number;
  minItems?: number;
  itemType?: string;
  itemOptions?: StringOptions | NumberOptions;
}

// Type for job application data validation
interface JobApplicationData {
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
}

// Validate string input - extracted for complexity reduction
const validateStringInput = (
  input: string,
  options: StringOptions,
): string => {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Sanitize string input
  const sanitized: string = sanitizeString(input) as string;

  // Apply length constraints
  if (options.maxLength && sanitized.length > options.maxLength) {
    throw new Error(`Input exceeds maximum length of ${options.maxLength}`);
  }

  if (options.minLength && sanitized.length < options.minLength) {
    throw new Error(`Input is shorter than minimum length of ${options.minLength}`);
  }

  // Check for malicious patterns
  if (!isValidString(sanitized, options.pattern)) {
    throw new Error('Input contains invalid characters or patterns');
  }

  return sanitized;
};

// Validate email input - extracted for complexity reduction
const validateEmailInput = (input: string): string => {
  // Trim whitespace before validation
  const trimmedEmail = input.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    throw new Error('Invalid email format');
  }

  // Return sanitized but preserve trimmed value
  return sanitizeString(trimmedEmail);
};

// Validate number input - extracted for complexity reduction
const validateNumberInput = (
  input: unknown,
  options: NumberOptions,
): number => {
  let numInput = input;
  if (typeof numInput === 'string') {
    numInput = parseFloat(numInput);
  }

  if (isNaN(numInput as number)) {
    throw new Error('Input must be a valid number');
  }

  if (options.min !== undefined && (numInput as number) < options.min) {
    throw new Error(`Number must be greater than or equal to ${options.min}`);
  }

  if (options.max !== undefined && (numInput as number) > options.max) {
    throw new Error(`Number must be less than or equal to ${options.max}`);
  }

  return numInput as number;
};

// Input validation functions
/**
 * Validates and sanitizes input based on type and options
 * @param input - The input to validate
 * @param type - The type of input (string, number, email, array, object)
 * @param options - Validation options specific to the type
 * @returns The validated/sanitized input
 * @throws Error if validation fails
 */
const validateInput = (
  input: unknown,
  type: string = 'string',
  options: StringOptions | NumberOptions | ArrayOptions = {},
): unknown => {
  // For object type, we need to handle null differently
  if (type === 'object') {
    if (input === null || input === undefined) {
      throw new Error('Input must be an object');
    }
    if (typeof input !== 'object' || Array.isArray(input)) {
      throw new Error('Input must be an object');
    }
    return input;
  }

  // For array type, we need to handle non-array input differently
  if (type === 'array') {
    if (!Array.isArray(input)) {
      throw new Error('Input must be an array');
    }

    const arrayOpts = options as ArrayOptions;
    if (arrayOpts.maxItems && input.length > arrayOpts.maxItems) {
      throw new Error(`Array exceeds maximum items of ${arrayOpts.maxItems}`);
    }

    if (arrayOpts.minItems && input.length < arrayOpts.minItems) {
      throw new Error(`Array has fewer items than minimum of ${arrayOpts.minItems}`);
    }

    // Only validate items if itemType is explicitly specified
    if (arrayOpts.itemType) {
      return input.map((item: unknown) =>
        validateInput(item, arrayOpts.itemType!, arrayOpts.itemOptions),
      );
    }

    return input;
  }

  // For other types, check for null/undefined
  if (input === null || input === undefined) {
    throw new Error('Input cannot be null or undefined');
  }

  switch (type) {
    case 'string':
      return validateStringInput(input as string, options as StringOptions);

    case 'email':
      return validateEmailInput(input as string);

    case 'number':
      return validateNumberInput(input, options as NumberOptions);

    default:
      return input;
  }
};

// Sanitize string input to prevent injection attacks
/**
 * Sanitizes a string by removing potentially dangerous characters and patterns
 * @param str - The string to sanitize
 * @returns The sanitized string, or original input if not a string
 */
const sanitizeString = (str: unknown): string | unknown => {
  if (typeof str !== 'string') {
    return str;
  }

  // Remove potentially dangerous characters/patterns
  // Event handlers (onXXX=) should be removed but preserve the = and value
  const result = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+/gi, '') // Remove event handler names (onclick, onmouseover, etc.)
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/&#x27;/g, "'");

  return result;
};

// Validate string against a pattern
/**
 * Validates a string against an optional pattern
 * @param str - The string to validate
 * @param pattern - Optional regex pattern or pattern string
 * @returns True if valid or no pattern provided
 */
const isValidString = (str: string, pattern?: string | RegExp | null): boolean => {
  if (!pattern) return true;

  if (pattern instanceof RegExp) {
    return pattern.test(str);
  }

  return new RegExp(pattern).test(str);
};

// Validate resume data structure
/**
 * Validates resume data structure and field values
 * @param resumeData - The resume data to validate
 * @returns True if validation passes
 * @throws Error if validation fails
 */
const validateResumeData = (resumeData: Record<string, unknown> | null): boolean => {
  if (!resumeData) {
    throw new Error('Resume data is required');
  }

  // Validate personal information
  if (resumeData.name) {
    validateInput(resumeData.name, 'string', { maxLength: 100 });
  }

  if (resumeData.email) {
    validateInput(resumeData.email, 'email');
  }

  if (resumeData.phone) {
    validateInput(resumeData.phone, 'string', { maxLength: 20 });
  }

  if (resumeData.location) {
    validateInput(resumeData.location, 'string', { maxLength: 100 });
  }

  if (resumeData.role) {
    validateInput(resumeData.role, 'string', { maxLength: 100 });
  }

  if (resumeData.summary) {
    validateInput(resumeData.summary, 'string', { maxLength: 5000 });
  }

  // Validate experience entries
  if (resumeData.experience) {
    validateInput(resumeData.experience, 'array', { maxItems: 20, itemType: 'object' });

    const experience = resumeData.experience as Array<Record<string, unknown>>;
    experience.forEach((exp) => {
      if (exp.company) {
        validateInput(exp.company, 'string', { maxLength: 200 });
      }
      if (exp.role) {
        validateInput(exp.role, 'string', { maxLength: 200 });
      }
      if (exp.description) {
        validateInput(exp.description, 'string', { maxLength: 2000 });
      }
      if (exp.tags) {
        validateInput(exp.tags, 'array', { maxItems: 20, itemOptions: { maxLength: 50 } });
      }
    });
  }

  // Validate education entries
  if (resumeData.education) {
    validateInput(resumeData.education, 'array', { maxItems: 10, itemType: 'object' });

    const education = resumeData.education as Array<Record<string, unknown>>;
    education.forEach((edu) => {
      if (edu.institution) {
        validateInput(edu.institution, 'string', { maxLength: 200 });
      }
      if (edu.area) {
        validateInput(edu.area, 'string', { maxLength: 200 });
      }
      if (edu.studyType) {
        validateInput(edu.studyType, 'string', { maxLength: 100 });
      }
      if (edu.courses) {
        validateInput(edu.courses, 'array', { maxItems: 20, itemOptions: { maxLength: 100 } });
      }
    });
  }

  // Validate skills
  if (resumeData.skills) {
    validateInput(resumeData.skills, 'array', { maxItems: 50, itemOptions: { maxLength: 50 } });
  }

  // Validate projects
  if (resumeData.projects) {
    validateInput(resumeData.projects, 'array', { maxItems: 20, itemType: 'object' });

    const projects = resumeData.projects as Array<Record<string, unknown>>;
    projects.forEach((proj) => {
      if (proj.name) {
        validateInput(proj.name, 'string', { maxLength: 200 });
      }
      if (proj.description) {
        validateInput(proj.description, 'string', { maxLength: 2000 });
      }
      if (proj.url) {
        validateInput(proj.url, 'string', { maxLength: 500 });
      }
      if (proj.roles) {
        validateInput(proj.roles, 'array', { maxItems: 10, itemOptions: { maxLength: 100 } });
      }
      if (proj.highlights) {
        validateInput(proj.highlights, 'array', { maxItems: 10, itemOptions: { maxLength: 200 } });
      }
    });
  }

  return true;
};

// Validate job application data
/**
 * Validates job application data structure and field values
 * @param jobData - The job application data to validate
 * @returns True if validation passes
 * @throws Error if validation fails
 */
const validateJobApplicationData = (jobData: JobApplicationData | null): boolean => {
  if (!jobData) {
    throw new Error('Job application data is required');
  }

  if (jobData.jobTitle) {
    validateInput(jobData.jobTitle, 'string', { maxLength: 200 });
  }

  if (jobData.companyName) {
    validateInput(jobData.companyName, 'string', { maxLength: 200 });
  }

  if (jobData.jobDescription) {
    validateInput(jobData.jobDescription, 'string', { maxLength: 5000 });
  }

  return true;
};

export {
  validateInput,
  validateStringInput,
  validateEmailInput,
  validateNumberInput,
  sanitizeString,
  isValidString,
  validateResumeData,
  validateJobApplicationData,
};
