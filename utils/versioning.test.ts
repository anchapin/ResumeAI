import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectVersionChanges,
  formatVersionNumber,
  getVersionTimeAgo,
  generateChangeDescription,
} from './versioning';
import { ResumeVersion } from '../types';

const createMockVersion = (overrides: unknown = {}): ResumeVersion => ({
  id: 'version-1',
  resumeId: 'resume-1',
  versionNumber: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  data: {
    basics: {
      name: 'John Doe',
      label: 'Engineer',
      image: '',
      email: 'john@example.com',
      phone: '',
      url: '',
      summary: 'Summary',
      location: { address: '', postalCode: '', city: '', countryCode: '', region: '' },
      profiles: [],
    },
    work: [
      {
        name: 'Company',
        position: 'Engineer',
        startDate: '2020-01-01',
        endDate: '',
        summary: '',
        highlights: [],
        url: '',
        location: '',
        isWorkingHere: false,
      },
    ],
    education: [
      {
        institution: 'University',
        studyType: 'Bachelor',
        area: 'CS',
        startDate: '2016-09-01',
        endDate: '2020-05-31',
        score: '',
        courses: [],
      },
    ],
    skills: [{ name: 'JavaScript', level: '', keywords: [] }],
    projects: [],
    certificates: [],
  },
  ...overrides,
});

describe('Versioning Utilities', () => {
  describe('detectVersionChanges', () => {
    it('should detect no changes when versions are identical', () => {
      const version1 = createMockVersion();
      const version2 = createMockVersion();

      const changes = detectVersionChanges(version1, version2);

      expect(changes).toHaveLength(0);
    });

    it('should detect changes in basics section', () => {
      const version1 = createMockVersion();
      const version2 = createMockVersion({
        data: {
          ...createMockVersion().data,
          basics: {
            ...createMockVersion().data.basics,
            name: 'Jane Doe',
          },
        },
      });

      const changes = detectVersionChanges(version1, version2);

      expect(changes).toContain('basics');
    });

    it('should detect changes in work section', () => {
      const version1 = createMockVersion();
      const version2 = createMockVersion({
        data: {
          ...createMockVersion().data,
          work: [
            {
              name: 'New Company',
              position: 'Senior Engineer',
              startDate: '2021-01-01',
              endDate: '',
              summary: '',
              highlights: [],
              url: '',
              location: '',
              isWorkingHere: false,
            },
          ],
        },
      });

      const changes = detectVersionChanges(version1, version2);

      expect(changes).toContain('work');
    });

    it('should detect changes in education section', () => {
      const version1 = createMockVersion();
      const version2 = createMockVersion({
        data: {
          ...createMockVersion().data,
          education: [
            {
              institution: 'MIT',
              studyType: 'Master',
              area: 'Computer Science',
              startDate: '2020-09-01',
              endDate: '2022-05-31',
              score: '4.0',
              courses: [],
            },
          ],
        },
      });

      const changes = detectVersionChanges(version1, version2);

      expect(changes).toContain('education');
    });

    it('should detect changes in skills section', () => {
      const version1 = createMockVersion();
      const version2 = createMockVersion({
        data: {
          ...createMockVersion().data,
          skills: [
            { name: 'JavaScript', level: 'Expert', keywords: [] },
            { name: 'React', level: 'Advanced', keywords: [] },
          ],
        },
      });

      const changes = detectVersionChanges(version1, version2);

      expect(changes).toContain('skills');
    });

    it('should detect changes in projects section', () => {
      const version1 = createMockVersion();
      const version2 = createMockVersion({
        data: {
          ...createMockVersion().data,
          projects: [
            {
              name: 'Project X',
              description: 'Description',
              highlights: [],
              keywords: [],
              startDate: '',
              endDate: '',
              url: '',
              roles: [],
              entity: '',
              type: '',
            },
          ],
        },
      });

      const changes = detectVersionChanges(version1, version2);

      expect(changes).toContain('projects');
    });

    it('should detect multiple changes', () => {
      const version1 = createMockVersion();
      const version2 = createMockVersion({
        data: {
          ...createMockVersion().data,
          basics: { ...createMockVersion().data.basics, name: 'Jane' },
          work: [],
          skills: [
            { name: 'Python', level: '', keywords: [] },
          ],
        },
      });

      const changes = detectVersionChanges(version1, version2);

      expect(changes).toContain('basics');
      expect(changes).toContain('work');
      expect(changes).toContain('skills');
      expect(changes.length).toBe(3);
    });
  });

  describe('formatVersionNumber', () => {
    it('should format single digit version', () => {
      expect(formatVersionNumber(1)).toBe('v1');
    });

    it('should format double digit version', () => {
      expect(formatVersionNumber(10)).toBe('v10');
    });

    it('should format large version number', () => {
      expect(formatVersionNumber(999)).toBe('v999');
    });

    it('should format zero', () => {
      expect(formatVersionNumber(0)).toBe('v0');
    });
  });

  describe('getVersionTimeAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "just now" for very recent timestamps', () => {
      const now = new Date();
      vi.setSystemTime(now);

      const result = getVersionTimeAgo(now.toISOString());

      expect(result).toBe('just now');
    });

    it('should return minutes ago', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      vi.setSystemTime(now);

      const result = getVersionTimeAgo(fiveMinutesAgo.toISOString());

      expect(result).toBe('5m ago');
    });

    it('should return hours ago', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      vi.setSystemTime(now);

      const result = getVersionTimeAgo(threeHoursAgo.toISOString());

      expect(result).toBe('3h ago');
    });

    it('should return days ago', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      vi.setSystemTime(now);

      const result = getVersionTimeAgo(twoDaysAgo.toISOString());

      expect(result).toBe('2d ago');
    });

    it('should return formatted date for older timestamps', () => {
      const now = new Date('2024-03-01');
      const date = new Date('2024-02-01');
      vi.setSystemTime(now);

      const result = getVersionTimeAgo(date.toISOString());

      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should handle edge case of exactly 1 minute', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      vi.setSystemTime(now);

      const result = getVersionTimeAgo(oneMinuteAgo.toISOString());

      expect(result).toBe('1m ago');
    });

    it('should handle edge case of exactly 1 hour', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      vi.setSystemTime(now);

      const result = getVersionTimeAgo(oneHourAgo.toISOString());

      expect(result).toBe('1h ago');
    });

    it('should handle edge case of exactly 1 day', () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      vi.setSystemTime(now);

      const result = getVersionTimeAgo(oneDayAgo.toISOString());

      expect(result).toBe('1d ago');
    });

    it('should handle edge case of exactly 7 days', () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      vi.setSystemTime(now);

      const result = getVersionTimeAgo(sevenDaysAgo.toISOString());

      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe('generateChangeDescription', () => {
    it('should return "No changes" for empty array', () => {
      const result = generateChangeDescription([]);

      expect(result).toBe('No changes');
    });

    it('should return description for single change', () => {
      const result = generateChangeDescription(['skills']);

      expect(result).toBe('Updated skills');
    });

    it('should return description for two changes', () => {
      const result = generateChangeDescription(['basics', 'work']);

      expect(result).toBe('Updated basics and work');
    });

    it('should return description for three changes', () => {
      const result = generateChangeDescription(['basics', 'work', 'education']);

      expect(result).toBe('Updated basics, work, and education');
    });

    it('should return description for many changes', () => {
      const result = generateChangeDescription([
        'basics',
        'work',
        'education',
        'skills',
        'projects',
      ]);

      expect(result).toBe('Updated basics, work, education, skills, and projects');
    });

    it('should handle single letter sections', () => {
      const result = generateChangeDescription(['a', 'b', 'c']);

      expect(result).toBe('Updated a, b, and c');
    });

    it('should properly join array elements', () => {
      const changes = ['section1', 'section2', 'section3', 'section4'];
      const result = generateChangeDescription(changes);

      expect(result).toContain('section1');
      expect(result).toContain('section2');
      expect(result).toContain('section3');
      expect(result).toContain('section4');
      expect(result).toContain('and');
    });
  });
});
