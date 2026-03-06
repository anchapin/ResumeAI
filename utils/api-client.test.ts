import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getHeaders, convertToAPIData } from './api-client';
import { SimpleResumeData } from '../types';
import { getCookie } from './security';

// Mock getCookie from security
vi.mock('./security', () => ({
  getCookie: vi.fn(),
}));

// Mock fetch globally
global.fetch = vi.fn();

const mockSimpleResume: SimpleResumeData = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-1234',
  location: 'San Francisco, CA',
  role: 'Senior Developer',
  summary: 'Experienced software engineer',
  experience: [
    {
      id: 'exp-1',
      company: 'TechCorp',
      role: 'Senior Developer',
      startDate: '2020-01',
      endDate: '',
      current: true,
      description: 'Led backend development',
      tags: ['Node.js', 'TypeScript'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'University of Tech',
      area: 'Computer Science',
      studyType: 'Bachelor',
      startDate: '2016',
      endDate: '2020',
      courses: ['Data Structures', 'Algorithms'],
    },
  ],
  skills: ['JavaScript', 'React', 'Node.js'],
  projects: [
    {
      id: 'proj-1',
      name: 'Portfolio',
      description: 'Personal portfolio website',
      url: 'https://example.com',
      startDate: '2021',
      endDate: '',
      highlights: ['Responsive design'],
      roles: ['Full Stack'],
    },
  ],
};

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getCookie).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getHeaders', () => {
    it('returns default headers with Content-Type', () => {
      localStorage.clear();
      const headers = getHeaders();

      expect((headers as any)['Content-Type']).toBe('application/json');
    });

    it('includes Bearer token when JWT token exists and is valid', () => {
      // Mock getCookie to return a valid JWT token from cookie
      const mockPayload = { exp: Math.floor(Date.now() / 1000) + 3600 };
      const mockToken = `header.${btoa(JSON.stringify(mockPayload))}.signature`;
      vi.mocked(getCookie).mockReturnValue(mockToken);

      const headers = getHeaders();

      expect((headers as any)['Authorization']).toBe(`Bearer ${mockToken}`);
    });

    it('excludes expired tokens', () => {
      // Mock an expired JWT
      const mockPayload = {
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour in past
      };
      const mockToken = `header.${Buffer.from(JSON.stringify(mockPayload)).toString('base64')}.signature`;
      localStorage.setItem('resume_ai_auth_token', mockToken);

      const headers = getHeaders();

      expect((headers as any)['Authorization']).toBeUndefined();
    });

    it('falls back to API key when JWT is not available', () => {
      const apiKey = 'test-api-key-123';
      localStorage.setItem('RESUMEAI_API_KEY', apiKey);

      const headers = getHeaders();

      expect((headers as any)['X-API-KEY']).toBe(apiKey);
    });

    it('prefers JWT token over API key', () => {
      // Mock getCookie to return a valid JWT token from cookie
      const mockPayload = {
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const mockToken = `header.${btoa(JSON.stringify(mockPayload))}.signature`;
      vi.mocked(getCookie).mockReturnValue(mockToken);

      localStorage.setItem('RESUMEAI_API_KEY', 'api-key');

      const headers = getHeaders();

      expect((headers as any)['Authorization']).toBe(`Bearer ${mockToken}`);
      expect((headers as any)['X-API-KEY']).toBeUndefined();
    });

    it('handles invalid JWT tokens gracefully', () => {
      localStorage.setItem('resume_ai_auth_token', 'invalid-token-format');

      const headers = getHeaders();

      expect((headers as any)['Authorization']).toBeUndefined();
      expect((headers as any)['Content-Type']).toBe('application/json');
    });

    it('handles malformed JWT payload', () => {
      const badToken = 'header.invalid-base64!!!.signature';
      localStorage.setItem('resume_ai_auth_token', badToken);

      const headers = getHeaders();

      expect((headers as any)['Authorization']).toBeUndefined();
    });

    it('does not include Authorization or API key when neither exists', () => {
      localStorage.clear();

      const headers = getHeaders();

      expect((headers as any)['Authorization']).toBeUndefined();
      expect((headers as any)['X-API-KEY']).toBeUndefined();
      expect((headers as any)['Content-Type']).toBe('application/json');
    });
  });

  describe('convertToAPIData', () => {
    it('converts basics correctly', () => {
      const result = convertToAPIData(mockSimpleResume);

      expect(result.basics?.name).toBe('John Doe');
      expect(result.basics?.email).toBe('john@example.com');
      expect(result.basics?.phone).toBe('555-1234');
      expect(result.basics?.summary).toBe('Experienced software engineer');
    });

    it('converts location correctly', () => {
      const result = convertToAPIData(mockSimpleResume);

      expect(result.basics?.location?.city).toBe('San Francisco, CA');
    });

    it('converts work experience correctly', () => {
      const result = convertToAPIData(mockSimpleResume);

      expect(result.work).toHaveLength(1);
      expect(result.work?.[0]?.company).toBe('TechCorp');
      expect(result.work?.[0]?.position).toBe('Senior Developer');
      expect(result.work?.[0]?.startDate).toBe('2020-01');
      expect(result.work?.[0]?.summary).toBe('Led backend development');
    });

    it('converts education correctly', () => {
      const result = convertToAPIData(mockSimpleResume);

      expect(result.education).toHaveLength(1);
      expect(result.education?.[0]?.institution).toBe('University of Tech');
      expect(result.education?.[0]?.area).toBe('Computer Science');
      expect(result.education?.[0]?.studyType).toBe('Bachelor');
      expect(result.education?.[0]?.startDate).toBe('2016');
      expect(result.education?.[0]?.endDate).toBe('2020');
      expect(result.education?.[0]?.courses).toEqual(['Data Structures', 'Algorithms']);
    });

    it('converts skills correctly', () => {
      const result = convertToAPIData(mockSimpleResume);

      expect(result.skills).toHaveLength(3);
      expect(result.skills?.[0]?.name).toBe('JavaScript');
      expect(result.skills?.[1]?.name).toBe('React');
      expect(result.skills?.[2]?.name).toBe('Node.js');
    });

    it('converts projects correctly', () => {
      const result = convertToAPIData(mockSimpleResume);

      expect(result.projects).toHaveLength(1);
      expect(result.projects?.[0]?.name).toBe('Portfolio');
      expect(result.projects?.[0]?.description).toBe('Personal portfolio website');
      expect(result.projects?.[0]?.url).toBe('https://example.com');
      expect(result.projects?.[0]?.highlights).toEqual(['Responsive design']);
      expect(result.projects?.[0]?.roles).toEqual(['Full Stack']);
    });

    it('handles empty work experience', () => {
      const resume: SimpleResumeData = { ...mockSimpleResume, experience: [] };
      const result = convertToAPIData(resume);

      expect(result.work).toEqual([]);
    });

    it('handles empty education', () => {
      const resume: SimpleResumeData = { ...mockSimpleResume, education: [] };
      const result = convertToAPIData(resume);

      expect(result.education).toEqual([]);
    });

    it('handles empty skills', () => {
      const resume: SimpleResumeData = { ...mockSimpleResume, skills: [] };
      const result = convertToAPIData(resume);

      expect(result.skills).toEqual([]);
    });

    it('handles empty projects', () => {
      const resume: SimpleResumeData = { ...mockSimpleResume, projects: [] };
      const result = convertToAPIData(resume);

      expect(result.projects).toEqual([]);
    });

    it('handles missing optional fields', () => {
      const minimumResume: SimpleResumeData = {
        name: 'John',
        email: 'john@example.com',
        phone: '',
        location: '',
        role: '',
        summary: '',
        experience: [],
        education: [],
        skills: [],
        projects: [],
      };

      const result = convertToAPIData(minimumResume);

      expect(result.basics?.name).toBe('John');
      expect(result.basics?.email).toBe('john@example.com');
      expect(result.work).toEqual([]);
      expect(result.education).toEqual([]);
      expect(result.skills).toEqual([]);
    });

    it('preserves all data fields in conversion', () => {
      const result = convertToAPIData(mockSimpleResume);

      expect(result).toHaveProperty('basics');
      expect(result).toHaveProperty('work');
      expect(result).toHaveProperty('education');
      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('projects');
    });

    it('handles multiple experiences', () => {
      const resume: SimpleResumeData = {
        ...mockSimpleResume,
        experience: [
          ...mockSimpleResume.experience,
          {
            id: 'exp-2',
            company: 'StartupCo',
            role: 'Developer',
            startDate: '2018-06',
            endDate: '2020-01',
            current: false,
            description: 'Built MVP',
            tags: ['React'],
          },
        ],
      };

      const result = convertToAPIData(resume);

      expect(result.work).toHaveLength(2);
      expect(result.work?.[0]?.company).toBe('TechCorp');
      expect(result.work?.[1]?.company).toBe('StartupCo');
    });

    it('handles multiple educations', () => {
      const resume: SimpleResumeData = {
        ...mockSimpleResume,
        education: [
          ...mockSimpleResume.education,
          {
            id: 'edu-2',
            institution: 'Bootcamp',
            area: 'Web Development',
            studyType: 'Certificate',
            startDate: '2016-09',
            endDate: '2017-03',
            courses: [],
          },
        ],
      };

      const result = convertToAPIData(resume);

      expect(result.education).toHaveLength(2);
      expect(result.education?.[0]?.institution).toBe('University of Tech');
      expect(result.education?.[1]?.institution).toBe('Bootcamp');
    });

    it('handles current work experience correctly', () => {
      const resume: SimpleResumeData = {
        ...mockSimpleResume,
        experience: [
          {
            id: 'exp-1',
            company: 'Current Company',
            role: 'Developer',
            startDate: '2023-01',
            endDate: '', // Empty for current role
            current: true,
            description: 'Current position',
            tags: [],
          },
        ],
      };

      const result = convertToAPIData(resume);

      expect(result.work?.[0]?.endDate).toBe('');
    });
  });

  describe('edge cases', () => {
    it('handles special characters in names', () => {
      const resume: SimpleResumeData = {
        ...mockSimpleResume,
        name: "O'Brien-Smith",
      };

      const result = convertToAPIData(resume);

      expect(result.basics?.name).toBe("O'Brien-Smith");
    });

    it('handles very long descriptions', () => {
      const longDescription = 'A'.repeat(10000);
      const resume: SimpleResumeData = {
        ...mockSimpleResume,
        summary: longDescription,
      };

      const result = convertToAPIData(resume);

      expect(result.basics?.summary).toBe(longDescription);
    });

    it('handles special characters in URLs', () => {
      const resume: SimpleResumeData = {
        ...mockSimpleResume,
        projects: [
          {
            ...mockSimpleResume.projects[0],
            url: 'https://example.com/path?query=value&other=123#anchor',
          },
        ],
      };

      const result = convertToAPIData(resume);

      expect(result.projects?.[0]?.url).toBe(
        'https://example.com/path?query=value&other=123#anchor',
      );
    });

    it('handles empty strings in all fields', () => {
      const emptyResume: SimpleResumeData = {
        name: '',
        email: '',
        phone: '',
        location: '',
        role: '',
        summary: '',
        experience: [],
        education: [],
        skills: [],
        projects: [],
      };

      const result = convertToAPIData(emptyResume);

      expect(result.basics?.name).toBe('');
      expect(result.basics?.email).toBe('');
    });
  });

  describe('type safety', () => {
    it('returns correct types', () => {
      const result = convertToAPIData(mockSimpleResume);

      expect(typeof result).toBe('object');
      expect(Array.isArray(result.work)).toBe(true);
      expect(Array.isArray(result.education)).toBe(true);
      expect(Array.isArray(result.skills)).toBe(true);
      expect(typeof result.basics).toBe('object');
    });

    it('basics object has correct structure', () => {
      const result = convertToAPIData(mockSimpleResume);

      expect(result.basics).toBeDefined();
      if (result.basics) {
        expect('name' in result.basics).toBe(true);
        expect('email' in result.basics).toBe(true);
      }
    });

    it('work items have correct structure', () => {
      const result = convertToAPIData(mockSimpleResume);

      if (result.work && result.work.length > 0) {
        const workItem = result.work[0];
        expect('company' in workItem).toBe(true);
        expect('position' in workItem).toBe(true);
        expect('startDate' in workItem).toBe(true);
      }
    });
  });
});
