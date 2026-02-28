import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToHTML, exportToWord, DEFAULT_FORMAT_OPTIONS } from './export';
import { ResumeData } from '../types';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock import.meta.env
vi.mock('import.meta.env', () => ({
  VITE_API_URL: 'http://localhost:8000',
}));

describe('export utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DEFAULT_FORMAT_OPTIONS', () => {
    it('has correct default values', () => {
      expect(DEFAULT_FORMAT_OPTIONS.fontFamily).toBe('Arial');
      expect(DEFAULT_FORMAT_OPTIONS.fontSize).toBe(11);
      expect(DEFAULT_FORMAT_OPTIONS.lineSpacing).toBe(1.15);
      expect(DEFAULT_FORMAT_OPTIONS.layout).toBe('single');
      expect(DEFAULT_FORMAT_OPTIONS.showSectionDividers).toBe(true);
    });
  });

  describe('exportToHTML', () => {
    it('creates a downloadable HTML file', async () => {
      const mockResumeData: ResumeData = {
        basics: {
          name: 'John Doe',
          label: 'Software Engineer',
          email: 'john@example.com',
          phone: '555-1234',
          summary: 'Experienced developer',
        },
        work: [],
        education: [],
        skills: [],
      };

      // Mock document.createElement
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockCreateObjectURL = vi.fn(() => 'blob:http://localhost');
      const mockRevokeObjectURL = vi.fn();

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };

      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return mockAnchor as any;
        return document.createElement(tag);
      });

      Object.defineProperty(window, 'URL', {
        value: {
          createObjectURL: mockCreateObjectURL,
          revokeObjectURL: mockRevokeObjectURL,
        },
        writable: true,
      });

      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => document.body);
      const removeChildSpy = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation(() => document.body);

      await exportToHTML(mockResumeData);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAnchor.download).toContain('resume-');
      expect(mockAnchor.download).toContain('.html');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('handles resume with full data', async () => {
      const mockResumeData: ResumeData = {
        basics: {
          name: 'Jane Smith',
          label: 'Product Manager',
          email: 'jane@example.com',
          phone: '555-5678',
          url: 'https://jane.dev',
          summary: 'Product leader with 10 years of experience',
        },
        work: [
          {
            company: 'Tech Corp',
            position: 'Senior PM',
            startDate: '2020-01',
            endDate: 'Present',
            summary: 'Led product strategy',
            highlights: ['Grew revenue 50%', 'Launched 5 products'],
          },
        ],
        education: [
          {
            institution: 'State University',
            area: 'Business',
            studyType: 'MBA',
            startDate: '2010',
            endDate: '2012',
          },
        ],
        skills: [{ name: 'Product Management' }, { name: 'Agile' }],
      };

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };

      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return mockAnchor as any;
        return document.createElement(tag);
      });

      Object.defineProperty(window, 'URL', {
        value: {
          createObjectURL: vi.fn(() => 'blob:http://localhost'),
          revokeObjectURL: vi.fn(),
        },
        writable: true,
      });

      vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.body);

      // Should not throw
      await expect(exportToHTML(mockResumeData)).resolves.not.toThrow();
    });
  });

  describe('exportToWord', () => {
    it('creates a downloadable Word file', async () => {
      const mockResumeData: ResumeData = {
        basics: {
          name: 'John Doe',
        },
        work: [],
        education: [],
        skills: [],
      };

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };

      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return mockAnchor as any;
        return document.createElement(tag);
      });

      Object.defineProperty(window, 'URL', {
        value: {
          createObjectURL: vi.fn(() => 'blob:http://localhost'),
          revokeObjectURL: vi.fn(),
        },
        writable: true,
      });

      vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.body);

      await exportToWord(mockResumeData);

      expect(mockAnchor.download).toContain('.doc');
    });

    it('applies custom format options', async () => {
      const mockResumeData: ResumeData = {
        basics: { name: 'Test User' },
        work: [],
        education: [],
        skills: [],
      };

      const customOptions = {
        ...DEFAULT_FORMAT_OPTIONS,
        fontFamily: 'Times New Roman',
        fontSize: 12,
      };

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };

      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return mockAnchor as any;
        return document.createElement(tag);
      });

      Object.defineProperty(window, 'URL', {
        value: {
          createObjectURL: vi.fn(() => 'blob:http://localhost'),
          revokeObjectURL: vi.fn(),
        },
        writable: true,
      });

      vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.body);

      // Should not throw
      await expect(exportToWord(mockResumeData, customOptions)).resolves.not.toThrow();
    });
  });
});
