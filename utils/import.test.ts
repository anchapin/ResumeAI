import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  importFromJSON,
  importFromPDF,
  importFromWord,
  importFromLinkedInUrl,
  importFromLinkedInFile,
  importFromLinkedIn,
  validateImportedData,
  detectFileFormat,
} from './import';
import { ResumeData } from '../types';

// Mock resume data for testing
const mockResumeData: any = {
  basics: {
    name: 'John Doe',
    label: 'Software Engineer',
    image: '',
    email: 'john@example.com',
    phone: '(555) 555-5555',
    url: 'https://johndoe.com',
    summary: 'Experienced software engineer',
    location: {
      address: '123 Main St',
      postalCode: '12345',
      city: 'Anytown',
      countryCode: 'US',
      region: 'State',
    },
    profiles: [
      {
        network: 'LinkedIn',
        username: 'johndoe',
        url: 'https://linkedin.com/in/johndoe',
      },
    ],
  },
  work: [
    {
      name: 'Company Inc',
      position: 'Software Engineer',
      startDate: '2020-01-01',
      endDate: '2023-12-31',
      summary: 'Worked on web applications',
      highlights: ['Led team', 'Improved performance'],
      url: '',
      location: '',
      isWorkingHere: false,
    },
  ],
  education: [
    {
      institution: 'University',
      studyType: 'Bachelor',
      area: 'Computer Science',
      startDate: '2016-09-01',
      endDate: '2020-05-31',
      score: '3.8',
      courses: ['Data Structures', 'Algorithms'],
    },
  ],
  skills: [
    {
      name: 'JavaScript',
      level: 'Expert',
      keywords: ['Frontend', 'Backend'],
    },
  ],
  projects: [],
  certificates: [],
};

describe('Import Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('importFromJSON', () => {
    it('should import from JSON string', async () => {
      const jsonString = JSON.stringify(mockResumeData);
      const result = await importFromJSON(jsonString);

      expect(result).toEqual(mockResumeData);
      expect(result.basics?.name).toBe('John Doe');
      expect(result.work).toHaveLength(1);
    });

    it('should import from JSON object', async () => {
      const result = await importFromJSON(mockResumeData);

      expect(result).toEqual(mockResumeData);
      expect(result.basics?.name).toBe('John Doe');
    });

    it('should throw on invalid JSON string', async () => {
      await expect(importFromJSON('{ invalid json')).rejects.toThrow(
        'Failed to import JSON Resume',
      );
    });

    it('should throw on null data', async () => {
      // Throws Invalid JSON Resume format but catches and re-throws as "Failed to import"
      await expect(importFromJSON(null as unknown as string | object)).rejects.toThrow(
        'Failed to import JSON Resume',
      );
    });

    it('should throw on non-object data', async () => {
      // Throws Invalid JSON Resume format but catches and re-throws as "Failed to import"
      await expect(importFromJSON('string value')).rejects.toThrow('Failed to import JSON Resume');
    });

    it('should handle empty object', async () => {
      const result = await importFromJSON({});
      expect(result).toEqual({});
    });
  });

  describe('importFromPDF', () => {
    it('should import PDF file successfully', async () => {
      const mockFile = new File(['pdf content'], 'resume.pdf', { type: 'application/pdf' });

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResumeData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await importFromPDF(mockFile);
      expect(result).toEqual(mockResumeData);
    });

    it('should include API key in headers if available', async () => {
      localStorage.setItem('RESUMEAI_API_KEY', 'test-api-key');
      const mockFile = new File(['pdf content'], 'resume.pdf', { type: 'application/pdf' });
      const mockFetch = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(mockResumeData), { status: 200 }));

      await importFromPDF(mockFile);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/import/pdf'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'X-API-KEY': 'test-api-key' }),
        }),
      );
    });

    it('should throw on failed response', async () => {
      const mockFile = new File(['pdf content'], 'resume.pdf', { type: 'application/pdf' });

      vi.spyOn(global, 'fetch').mockResolvedValue(new Response('Not found', { status: 404 }));

      await expect(importFromPDF(mockFile)).rejects.toThrow('Failed to import PDF');
    });

    it('should throw on network error', async () => {
      const mockFile = new File(['pdf content'], 'resume.pdf', { type: 'application/pdf' });

      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      await expect(importFromPDF(mockFile)).rejects.toThrow('Failed to import PDF');
    });
  });

  describe('importFromWord', () => {
    it('should import DOCX file successfully', async () => {
      const mockFile = new File(['docx content'], 'resume.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResumeData), { status: 200 }),
      );

      const result = await importFromWord(mockFile);
      expect(result).toEqual(mockResumeData);
    });

    it('should include API key in headers if available', async () => {
      localStorage.setItem('RESUMEAI_API_KEY', 'test-api-key');
      const mockFile = new File(['docx content'], 'resume.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const mockFetch = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(mockResumeData), { status: 200 }));

      await importFromWord(mockFile);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/import/docx'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'X-API-KEY': 'test-api-key' }),
        }),
      );
    });

    it('should throw on failed response', async () => {
      const mockFile = new File(['docx content'], 'resume.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      vi.spyOn(global, 'fetch').mockResolvedValue(new Response('Error', { status: 500 }));

      await expect(importFromWord(mockFile)).rejects.toThrow('Failed to import Word');
    });
  });

  describe('importFromLinkedInUrl', () => {
    it('should import from LinkedIn URL', async () => {
      const mockFetch = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(mockResumeData), { status: 200 }));

      const result = await importFromLinkedInUrl('https://linkedin.com/in/johndoe');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/import/linkedin'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ url: 'https://linkedin.com/in/johndoe' }),
        }),
      );
      expect(result).toEqual(mockResumeData);
    });

    it('should include API key if available', async () => {
      localStorage.setItem('RESUMEAI_API_KEY', 'test-key');
      const mockFetch = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(mockResumeData), { status: 200 }));

      await importFromLinkedInUrl('https://linkedin.com/in/johndoe');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-API-KEY': 'test-key' }),
        }),
      );
    });

    it('should throw on failed response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(new Response('Unauthorized', { status: 401 }));

      await expect(importFromLinkedInUrl('https://linkedin.com/in/johndoe')).rejects.toThrow(
        'Failed to import LinkedIn',
      );
    });
  });

  describe('importFromLinkedInFile', () => {
    it('should import from single File', async () => {
      const mockFile = new File(['linkedin data'], 'profile.json', { type: 'application/json' });
      const mockFetch = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(mockResumeData), { status: 200 }));

      const result = await importFromLinkedInFile(mockFile);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/import/linkedin-file'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result).toEqual(mockResumeData);
    });

    it('should import from array of Files', async () => {
      const mockFiles = [
        new File(['data1'], 'file1.json', { type: 'application/json' }),
        new File(['data2'], 'file2.json', { type: 'application/json' }),
      ];
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResumeData), { status: 200 }),
      );

      const result = await importFromLinkedInFile(mockFiles);

      expect(result).toEqual(mockResumeData);
    });

    it('should import from FileList', async () => {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File(['data'], 'file.json', { type: 'application/json' }));
      const mockFetch = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(mockResumeData), { status: 200 }));

      const result = await importFromLinkedInFile(dataTransfer.files);

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual(mockResumeData);
    });

    it('should handle API error response', async () => {
      const mockFile = new File(['data'], 'file.json');
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Invalid format' }), { status: 400 }),
      );

      // The function throws a generic message, not the error detail
      await expect(importFromLinkedInFile(mockFile)).rejects.toThrow('Failed to import');
    });

    it('should handle JSON parse error in error response', async () => {
      const mockFile = new File(['data'], 'file.json');
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('Invalid response', { status: 400 }),
      );

      await expect(importFromLinkedInFile(mockFile)).rejects.toThrow(
        'Failed to import LinkedIn file',
      );
    });
  });

  describe('importFromLinkedIn', () => {
    it('should be an alias for importFromLinkedInUrl', async () => {
      const mockFetch = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(mockResumeData), { status: 200 }));

      const result = await importFromLinkedIn('https://linkedin.com/in/johndoe');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/import/linkedin'),
        expect.any(Object),
      );
      expect(result).toEqual(mockResumeData);
    });
  });

  describe('validateImportedData', () => {
    it('should validate complete resume data', () => {
      const result = validateImportedData(mockResumeData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should error on missing basics', () => {
      const invalidData = { ...mockResumeData, basics: undefined };
      const result = validateImportedData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing basic information (name, email, etc.)');
    });

    it('should warn on missing name', () => {
      const dataWithoutName = {
        ...mockResumeData,
        basics: { ...mockResumeData.basics!, name: undefined },
      };
      const result = validateImportedData(dataWithoutName);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Missing name in basic information');
    });

    it('should warn on missing email', () => {
      const dataWithoutEmail = {
        ...mockResumeData,
        basics: { ...mockResumeData.basics!, email: undefined },
      };
      const result = validateImportedData(dataWithoutEmail);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Missing email in basic information');
    });

    it('should warn on missing work experience', () => {
      const dataWithoutWork = { ...mockResumeData, work: undefined };
      const result = validateImportedData(dataWithoutWork);

      expect(result.warnings).toContain('No work experience entries found');
    });

    it('should warn on empty work array', () => {
      const dataWithEmptyWork = { ...mockResumeData, work: [] };
      const result = validateImportedData(dataWithEmptyWork);

      expect(result.warnings).toContain('No work experience entries found');
    });

    it('should warn on missing education', () => {
      const dataWithoutEducation = { ...mockResumeData, education: undefined };
      const result = validateImportedData(dataWithoutEducation);

      expect(result.warnings).toContain('No education entries found');
    });

    it('should warn on missing skills', () => {
      const dataWithoutSkills = { ...mockResumeData, skills: undefined };
      const result = validateImportedData(dataWithoutSkills);

      expect(result.warnings).toContain('No skills found');
    });

    it('should accumulate multiple errors and warnings', () => {
      const invalidData = {
        basics: { name: undefined, email: undefined } as any,
        work: [],
        education: [],
        skills: [],
      } as any;
      const result = validateImportedData(invalidData);

      // basics exists but name and email are undefined - no errors, only warnings
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(2);
    });
  });

  describe('detectFileFormat', () => {
    it('should detect PDF format', () => {
      expect(detectFileFormat('resume.pdf')).toBe('pdf');
      expect(detectFileFormat('document.PDF')).toBe('pdf');
      expect(detectFileFormat('My Resume.pdf')).toBe('pdf');
    });

    it('should detect DOCX format', () => {
      expect(detectFileFormat('resume.docx')).toBe('docx');
      expect(detectFileFormat('resume.DOCX')).toBe('docx');
    });

    it('should detect DOC format as DOCX', () => {
      expect(detectFileFormat('resume.doc')).toBe('docx');
      expect(detectFileFormat('resume.DOC')).toBe('docx');
    });

    it('should detect JSON format', () => {
      expect(detectFileFormat('resume.json')).toBe('json');
      expect(detectFileFormat('resume.JSON')).toBe('json');
    });

    it('should return unknown for unrecognized formats', () => {
      expect(detectFileFormat('resume.txt')).toBe('unknown');
      expect(detectFileFormat('resume.docm')).toBe('unknown');
      expect(detectFileFormat('resume')).toBe('unknown');
      expect(detectFileFormat('resume.xyz')).toBe('unknown');
    });

    it('should handle filenames with multiple dots', () => {
      expect(detectFileFormat('my.resume.pdf')).toBe('pdf');
      expect(detectFileFormat('my.resume.backup.docx')).toBe('docx');
    });

    it('should handle empty extensions', () => {
      expect(detectFileFormat('resume.')).toBe('unknown');
    });
  });
});
