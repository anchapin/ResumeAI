import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeneratePackage, convertToResumeData } from './useGeneratePackage';
import { SimpleResumeData, ResumeData } from '../types';

global.fetch = vi.fn();

vi.mock('../utils/api-client', () => ({
  getHeaders: () => ({ 'Content-Type': 'application/json' }),
}));

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

describe('useGeneratePackage Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('initialization', () => {
    it('initializes with default state', () => {
      (global.fetch as any).mockResolvedValueOnce(new Response('{}', { status: 200 }));

      const { result } = renderHook(() => useGeneratePackage());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeNull();
      expect(result.current.coverLetter).toBeNull();
      expect(result.current.coverLetterLoading).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.lastSaved).toBeNull();
    });
  });

  describe('generatePackage', () => {
    it('successfully generates a tailored resume', async () => {
      const mockResponse = {
        resume_data: convertToResumeData(mockSimpleResume),
        keywords: ['leadership', 'backend', 'typescript'],
        suggestions: ['Add more metrics', 'Include technologies'],
      };

      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        await result.current.generatePackage({
          resume_data: convertToResumeData(mockSimpleResume),
          job_description: 'Looking for senior developer',
          company_name: 'TechCorp',
          job_title: 'Senior Developer',
        });
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('sets loading state during generation', async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(new Response('{}', { status: 200 })), 50)),
      );

      const { result } = renderHook(() => useGeneratePackage());

      const promise = act(async () => {
        result.current.generatePackage({
          resume_data: convertToResumeData(mockSimpleResume),
          job_description: 'Job desc',
        });
      });

      // Check loading state
      expect(result.current.loading).toBe(true);

      await promise;
    });

    it('handles API errors', async () => {
      const errorResponse = { detail: 'Failed to tailor resume' };
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), { status: 400 }),
      );

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        try {
          await result.current.generatePackage({
            resume_data: convertToResumeData(mockSimpleResume),
            job_description: 'Job desc',
          });
        } catch (err) {
          expect(err).toBeDefined();
        }
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.loading).toBe(false);
    });

    it('auto-saves tailored resume to localStorage', async () => {
      const mockResponse = {
        resume_data: convertToResumeData(mockSimpleResume),
        keywords: [],
      };

      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        await result.current.generatePackage({
          resume_data: convertToResumeData(mockSimpleResume),
          job_description: 'Job desc',
        });
      });

      expect(localStorage.getItem('resumeai_resume_data')).toBeDefined();
    });

    it('uses correct API endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ resume_data: {}, keywords: [] }), { status: 200 }),
      );

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        await result.current.generatePackage({
          resume_data: convertToResumeData(mockSimpleResume),
          job_description: 'Job desc',
        });
      });

      const url = (global.fetch as any).mock.calls[0][0];
      expect(url).toContain('/v1/tailor');
    });
  });

  describe('downloadPDF', () => {
    it('downloads PDF successfully', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      (global.fetch as any).mockResolvedValueOnce(
        new Response(mockBlob, { status: 200 }),
      );

      // Mock DOM methods
      const mockLink = { href: '', download: '', click: vi.fn() };
      const originalCreateElement = document.createElement;
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        await result.current.downloadPDF({
          resume_data: convertToResumeData(mockSimpleResume),
          variant: 'base',
        });
      });

      expect(mockLink.click).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('handles PDF download errors', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Failed to generate PDF' }), { status: 500 }),
      );

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        try {
          await result.current.downloadPDF({
            resume_data: convertToResumeData(mockSimpleResume),
            variant: 'base',
          });
        } catch (err) {
          expect(err).toBeDefined();
        }
      });

      expect(result.current.error).toBeDefined();
    });

    it('uses correct PDF endpoint', async () => {
      const mockBlob = new Blob(['PDF'], { type: 'application/pdf' });
      (global.fetch as any).mockResolvedValueOnce(new Response(mockBlob, { status: 200 }));

      vi.spyOn(document, 'createElement').mockReturnValue({ click: vi.fn() } as any);

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        await result.current.downloadPDF({
          resume_data: convertToResumeData(mockSimpleResume),
          variant: 'modern',
        });
      });

      const url = (global.fetch as any).mock.calls[0][0];
      expect(url).toContain('/v1/render/pdf');
    });
  });

  describe('renderMarkdown', () => {
    it('renders markdown preview', async () => {
      const mockMarkdown = '# Resume\n\nJohn Doe\nSenior Developer';
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ markdown: mockMarkdown }), { status: 200 }),
      );

      const { result } = renderHook(() => useGeneratePackage());

      let markdown;
      await act(async () => {
        markdown = await result.current.renderMarkdown({
          resume_data: convertToResumeData(mockSimpleResume),
          variant: 'base',
        });
      });

      expect(markdown).toBe(mockMarkdown);
    });

    it('handles markdown rendering errors', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Failed to render' }), { status: 500 }),
      );

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        try {
          await result.current.renderMarkdown({
            resume_data: convertToResumeData(mockSimpleResume),
            variant: 'base',
          });
        } catch (err) {
          expect(err).toBeDefined();
        }
      });
    });

    it('uses correct markdown endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ markdown: '# Resume' }), { status: 200 }),
      );

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        await result.current.renderMarkdown({
          resume_data: convertToResumeData(mockSimpleResume),
          variant: 'base',
        });
      });

      const url = (global.fetch as any).mock.calls[0][0];
      expect(url).toContain('/v1/render/markdown');
    });
  });

  describe('generateCoverLetterRequest', () => {
    it('generates cover letter successfully', async () => {
      const mockCoverLetter = {
        header: 'Date',
        introduction: 'Dear Hiring Manager',
        body: 'I am interested in...',
        closing: 'Sincerely',
        full_text: 'Full cover letter',
        metadata: {},
      };

      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify(mockCoverLetter), { status: 200 }),
      );

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        await result.current.generateCoverLetterRequest({
          resume_data: convertToResumeData(mockSimpleResume),
          job_description: 'Job desc',
          company_name: 'TechCorp',
          job_title: 'Senior Developer',
        });
      });

      expect(result.current.coverLetter).toEqual(mockCoverLetter);
      expect(result.current.coverLetterLoading).toBe(false);
    });

    it('handles cover letter generation errors', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Failed' }), { status: 500 }),
      );

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        try {
          await result.current.generateCoverLetterRequest({
            resume_data: convertToResumeData(mockSimpleResume),
            job_description: 'Job desc',
            company_name: 'TechCorp',
            job_title: 'Senior Developer',
          });
        } catch (err) {
          expect(err).toBeDefined();
        }
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.coverLetterLoading).toBe(false);
    });

    it('sets loading state during cover letter generation', async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(new Response('{}', { status: 200 })), 50)),
      );

      const { result } = renderHook(() => useGeneratePackage());

      const promise = act(async () => {
        result.current.generateCoverLetterRequest({
          resume_data: convertToResumeData(mockSimpleResume),
          job_description: 'Job desc',
          company_name: 'TechCorp',
          job_title: 'Senior Developer',
        });
      });

      expect(result.current.coverLetterLoading).toBe(true);
      await promise;
    });

    it('uses correct cover letter endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({
          header: '',
          introduction: '',
          body: '',
          closing: '',
          full_text: '',
          metadata: {},
        }), { status: 200 }),
      );

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        await result.current.generateCoverLetterRequest({
          resume_data: convertToResumeData(mockSimpleResume),
          job_description: 'Job desc',
          company_name: 'TechCorp',
          job_title: 'Senior Developer',
        });
      });

      const url = (global.fetch as any).mock.calls[0][0];
      expect(url).toContain('/v1/cover-letter');
    });
  });

  describe('saveResume', () => {
    it('saves resume to localStorage', async () => {
      const { result } = renderHook(() => useGeneratePackage());
      const resumeData = convertToResumeData(mockSimpleResume);

      await act(async () => {
        await result.current.saveResume(resumeData);
      });

      const saved = localStorage.getItem('resumeai_resume_data');
      expect(saved).toBeDefined();
      expect(JSON.parse(saved!)).toEqual(resumeData);
    });

    it('sets lastSaved timestamp', async () => {
      const { result } = renderHook(() => useGeneratePackage());

      expect(result.current.lastSaved).toBeNull();

      await act(async () => {
        await result.current.saveResume(convertToResumeData(mockSimpleResume));
      });

      expect(result.current.lastSaved).not.toBeNull();
      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('removes draft after saving', async () => {
      localStorage.setItem('resumeai_draft', JSON.stringify({ data: {} }));

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        await result.current.saveResume(convertToResumeData(mockSimpleResume));
      });

      expect(localStorage.getItem('resumeai_draft')).toBeNull();
    });
  });

  describe('saveDraft', () => {
    it('saves draft to localStorage', () => {
      const { result } = renderHook(() => useGeneratePackage());
      const resumeData = convertToResumeData(mockSimpleResume);

      act(() => {
        result.current.saveDraft(resumeData);
      });

      const saved = localStorage.getItem('resumeai_draft');
      expect(saved).toBeDefined();
      const draft = JSON.parse(saved!);
      expect(draft.data).toEqual(resumeData);
      expect(draft.timestamp).toBeDefined();
    });
  });

  describe('loadDraft', () => {
    it('loads draft from localStorage', () => {
      const resumeData = convertToResumeData(mockSimpleResume);
      const draft = { data: resumeData, timestamp: new Date().toISOString() };
      localStorage.setItem('resumeai_draft', JSON.stringify(draft));

      const { result } = renderHook(() => useGeneratePackage());

      const loaded = result.current.loadDraft();
      expect(loaded).toEqual(resumeData);
    });

    it('returns null if no draft exists', () => {
      const { result } = renderHook(() => useGeneratePackage());
      const loaded = result.current.loadDraft();
      expect(loaded).toBeNull();
    });

    it('returns null on invalid draft data', () => {
      localStorage.setItem('resumeai_draft', 'invalid json');

      const { result } = renderHook(() => useGeneratePackage());
      const loaded = result.current.loadDraft();
      expect(loaded).toBeNull();
    });
  });

  describe('clearSavedData', () => {
    it('clears all saved data', () => {
      localStorage.setItem('resumeai_resume_data', JSON.stringify({}));
      localStorage.setItem('resumeai_draft', JSON.stringify({}));

      const { result } = renderHook(() => useGeneratePackage());

      act(() => {
        result.current.clearSavedData();
      });

      expect(localStorage.getItem('resumeai_resume_data')).toBeNull();
      expect(localStorage.getItem('resumeai_draft')).toBeNull();
    });

    it('resets component state', () => {
      const { result } = renderHook(() => useGeneratePackage());

      act(() => {
        result.current.clearSavedData();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.lastSaved).toBeNull();
    });
  });

  describe('testConnection', () => {
    it('returns true on successful connection', async () => {
      (global.fetch as any).mockResolvedValueOnce(new Response('{}', { status: 200 }));

      const { result } = renderHook(() => useGeneratePackage());

      let connected = false;
      await act(async () => {
        connected = await result.current.testConnection();
      });

      expect(connected).toBe(true);
    });

    it('returns false on connection failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useGeneratePackage());

      let connected = true;
      await act(async () => {
        connected = await result.current.testConnection();
      });

      expect(connected).toBe(false);
    });

    it('uses health endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce(new Response('{}', { status: 200 }));

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        await result.current.testConnection();
      });

      const url = (global.fetch as any).mock.calls[0][0];
      expect(url).toContain('/health');
    });
  });

  describe('clearError', () => {
    it('clears error state', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Error' }), { status: 400 }),
      );

      const { result } = renderHook(() => useGeneratePackage());

      await act(async () => {
        try {
          await result.current.generatePackage({
            resume_data: convertToResumeData(mockSimpleResume),
            job_description: 'Job',
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});

describe('convertToResumeData', () => {
  it('converts SimpleResumeData to ResumeData format', () => {
    const result = convertToResumeData(mockSimpleResume);

    expect(result.basics?.name).toBe('John Doe');
    expect(result.basics?.email).toBe('john@example.com');
    expect(result.basics?.label).toBe('Senior Developer');
    expect(result.work).toHaveLength(1);
    expect(result.education).toHaveLength(1);
    expect(result.skills).toHaveLength(3);
  });

  it('handles empty data gracefully', () => {
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

    const result = convertToResumeData(emptyResume);

    expect(result.work).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.skills).toEqual([]);
  });

  it('maps all required fields correctly', () => {
    const result = convertToResumeData(mockSimpleResume);

    expect(result).toHaveProperty('basics');
    expect(result).toHaveProperty('location');
    expect(result).toHaveProperty('work');
    expect(result).toHaveProperty('education');
    expect(result).toHaveProperty('skills');
    expect(result).toHaveProperty('projects');
  });

  it('preserves optional fields', () => {
    const result = convertToResumeData(mockSimpleResume);

    expect(result.work[0]?.highlights).toBeDefined();
    expect(result.projects[0]?.highlights).toBeDefined();
  });
});
