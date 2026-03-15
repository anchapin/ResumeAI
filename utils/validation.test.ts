import { describe, it, expect } from 'vitest';
import {
  validateInput,
  sanitizeString,
  isValidString,
  validateResumeData,
  validateJobApplicationData,
} from './validation';

describe('validation utilities', () => {
  describe('validateInput', () => {
    describe('string validation', () => {
      it('should validate a valid string', () => {
        expect(validateInput('hello', 'string')).toBe('hello');
      });

      it('should throw error for null input', () => {
        expect(() => validateInput(null, 'string')).toThrow('Input cannot be null or undefined');
      });

      it('should throw error for undefined input', () => {
        expect(() => validateInput(undefined, 'string')).toThrow(
          'Input cannot be null or undefined',
        );
      });

      it('should throw error for non-string input', () => {
        expect(() => validateInput(123, 'string')).toThrow('Input must be a string');
      });

      it('should enforce maxLength', () => {
        expect(() => validateInput('hello world', 'string', { maxLength: 5 })).toThrow(
          'Input exceeds maximum length of 5',
        );
      });

      it('should enforce minLength', () => {
        expect(() => validateInput('hi', 'string', { minLength: 5 })).toThrow(
          'Input is shorter than minimum length of 5',
        );
      });

      it('should validate against pattern', () => {
        expect(validateInput('abc123', 'string', { pattern: /^[a-z0-9]+$/ })).toBe('abc123');
        expect(() => validateInput('ABC!', 'string', { pattern: /^[a-z0-9]+$/ })).toThrow(
          'Input contains invalid characters or patterns',
        );
      });
    });

    describe('email validation', () => {
      it('should validate a valid email', () => {
        expect(validateInput('test@example.com', 'email')).toBe('test@example.com');
      });

      it('should throw error for invalid email format', () => {
        expect(() => validateInput('invalid-email', 'email')).toThrow('Invalid email format');
        expect(() => validateInput('@example.com', 'email')).toThrow('Invalid email format');
        expect(() => validateInput('test@', 'email')).toThrow('Invalid email format');
      });

      it('should sanitize email input', () => {
        expect(validateInput('  test@example.com  ', 'email')).toBe('test@example.com');
      });
    });

    describe('number validation', () => {
      it('should validate a valid number', () => {
        expect(validateInput(42, 'number')).toBe(42);
      });

      it('should parse string numbers', () => {
        expect(validateInput('42.5', 'number')).toBe(42.5);
      });

      it('should throw error for invalid number', () => {
        expect(() => validateInput('not-a-number', 'number')).toThrow(
          'Input must be a valid number',
        );
      });

      it('should enforce min constraint', () => {
        expect(() => validateInput(5, 'number', { min: 10 })).toThrow(
          'Number must be greater than or equal to 10',
        );
      });

      it('should enforce max constraint', () => {
        expect(() => validateInput(100, 'number', { max: 50 })).toThrow(
          'Number must be less than or equal to 50',
        );
      });
    });

    describe('array validation', () => {
      it('should validate a valid array', () => {
        expect(validateInput([1, 2, 3], 'array')).toEqual([1, 2, 3]);
      });

      it('should throw error for non-array input', () => {
        expect(() => validateInput('not-an-array', 'array')).toThrow('Input must be an array');
      });

      it('should enforce maxItems', () => {
        expect(() => validateInput([1, 2, 3, 4, 5], 'array', { maxItems: 3 })).toThrow(
          'Array exceeds maximum items of 3',
        );
      });

      it('should enforce minItems', () => {
        expect(() => validateInput([1], 'array', { minItems: 3 })).toThrow(
          'Array has fewer items than minimum of 3',
        );
      });
    });

    describe('object validation', () => {
      it('should validate a valid object', () => {
        expect(validateInput({ key: 'value' }, 'object')).toEqual({ key: 'value' });
      });

      it('should throw error for array input', () => {
        expect(() => validateInput([1, 2, 3], 'object')).toThrow('Input must be an object');
      });

      it('should throw error for null input', () => {
        expect(() => validateInput(null, 'object')).toThrow('Input must be an object');
      });
    });
  });

  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>hello')).toBe('hello');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeString('javascript:alert("xss")')).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      expect(sanitizeString('onclick=alert("xss")')).toBe('=alert("xss")');
    });

    it('should decode HTML entities', () => {
      expect(sanitizeString('<script>')).toBe('<script>');
      expect(sanitizeString('>')).toBe('>');
      expect(sanitizeString('&')).toBe('&');
    });

    it('should return non-strings as-is', () => {
      expect(sanitizeString(123)).toBe('123');
      expect(sanitizeString(null)).toBe('null');
    });
  });

  describe('isValidString', () => {
    it('should return true for empty pattern', () => {
      expect(isValidString('hello', undefined)).toBe(true);
      expect(isValidString('hello', null)).toBe(true);
    });

    it('should validate against RegExp pattern', () => {
      expect(isValidString('abc123', /^[a-z0-9]+$/)).toBe(true);
      expect(isValidString('ABC!', /^[a-z0-9]+$/)).toBe(false);
    });

    it('should validate against string pattern', () => {
      expect(isValidString('hello world', '^hello')).toBe(true);
      expect(isValidString('goodbye', '^hello')).toBe(false);
    });
  });

  describe('validateResumeData', () => {
    it('should validate a valid resume data', () => {
      const validResume = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        location: 'New York',
        role: 'Developer',
        summary: 'A brief summary',
        skills: ['JavaScript', 'TypeScript'],
        experience: [
          {
            id: '1',
            company: 'Tech Corp',
            role: 'Developer',
            startDate: '2020',
            endDate: 'Present',
            current: true,
            description: 'Worked on stuff',
            tags: ['React'],
          },
        ],
        education: [
          {
            id: '1',
            institution: 'University',
            area: 'CS',
            studyType: 'Bachelor',
            startDate: '2016',
            endDate: '2020',
            courses: ['Data Structures'],
          },
        ],
        projects: [
          {
            id: '1',
            name: 'Project',
            description: 'A project',
            url: 'https://example.com',
            roles: ['Developer'],
            startDate: '2020',
            endDate: '2021',
            highlights: ['Built it'],
          },
        ],
      };
      expect(validateResumeData(validResume)).toBe(true);
    });

    it('should throw error for null resume data', () => {
      expect(() => validateResumeData(null)).toThrow('Resume data is required');
    });

    it('should validate field lengths', () => {
      const longName = 'a'.repeat(101);
      expect(() => validateResumeData({ name: longName })).toThrow();
    });

    it('should validate email format', () => {
      expect(() => validateResumeData({ email: 'invalid' })).toThrow();
    });
  });

  describe('validateJobApplicationData', () => {
    it('should validate valid job application data', () => {
      const validJob = {
        jobTitle: 'Developer',
        companyName: 'Tech Corp',
        jobDescription: 'Build things',
      };
      expect(validateJobApplicationData(validJob)).toBe(true);
    });

    it('should throw error for null data', () => {
      expect(() => validateJobApplicationData(null)).toThrow('Job application data is required');
    });

    it('should validate field lengths', () => {
      const longTitle = 'a'.repeat(201);
      expect(() => validateJobApplicationData({ jobTitle: longTitle })).toThrow();
    });
  });
});
