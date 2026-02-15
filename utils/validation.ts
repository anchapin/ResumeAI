/**
 * Client-side validation utilities for ResumeAI application
 */

// Input validation functions
const validateInput = (input, type = 'string', options = {}) => {
  if (input === null || input === undefined) {
    throw new Error('Input cannot be null or undefined');
  }

  switch (type) {
    case 'string':
      if (typeof input !== 'string') {
        throw new Error('Input must be a string');
      }
      
      // Sanitize string input
      const sanitized = sanitizeString(input);
      
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
    
    case 'email':
      if (typeof input !== 'string') {
        throw new Error('Email must be a string');
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input)) {
        throw new Error('Invalid email format');
      }
      
      return sanitizeString(input);
    
    case 'number':
      if (typeof input === 'string') {
        input = parseFloat(input);
      }
      
      if (isNaN(input)) {
        throw new Error('Input must be a valid number');
      }
      
      if (options.min !== undefined && input < options.min) {
        throw new Error(`Number must be greater than or equal to ${options.min}`);
      }
      
      if (options.max !== undefined && input > options.max) {
        throw new Error(`Number must be less than or equal to ${options.max}`);
      }
      
      return input;
    
    case 'array':
      if (!Array.isArray(input)) {
        throw new Error('Input must be an array');
      }
      
      if (options.maxItems && input.length > options.maxItems) {
        throw new Error(`Array exceeds maximum items of ${options.maxItems}`);
      }
      
      if (options.minItems && input.length < options.minItems) {
        throw new Error(`Array has fewer items than minimum of ${options.minItems}`);
      }
      
      return input.map(item => validateInput(item, options.itemType, options.itemOptions));
    
    case 'object':
      if (typeof input !== 'object' || Array.isArray(input) || input === null) {
        throw new Error('Input must be an object');
      }
      
      return input;
    
    default:
      return input;
  }
};

// Sanitize string input to prevent injection attacks
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  
  // Remove potentially dangerous characters/patterns
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
};

// Validate string against a pattern
const isValidString = (str, pattern) => {
  if (!pattern) return true;
  
  if (pattern instanceof RegExp) {
    return pattern.test(str);
  }
  
  return new RegExp(pattern).test(str);
};

// Validate resume data structure
const validateResumeData = (resumeData) => {
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
    
    resumeData.experience.forEach((exp, index) => {
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
    
    resumeData.education.forEach((edu, index) => {
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
    
    resumeData.projects.forEach((proj, index) => {
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
const validateJobApplicationData = (jobData) => {
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
  sanitizeString,
  isValidString,
  validateResumeData,
  validateJobApplicationData
};