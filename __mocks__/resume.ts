import type { SimpleResumeData, WorkExperience, EducationEntry, ProjectEntry } from '../types';

/**
 * Mock resume data for testing and development
 */
export const mockResumeData: SimpleResumeData = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-123-4567',
  location: 'San Francisco, CA',
  role: 'Software Engineer',
  summary: 'Experienced software engineer with 5+ years of experience.',
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
  experience: [
    {
      id: '1',
      company: 'Tech Corp',
      role: 'Senior Developer',
      startDate: '2020-01',
      endDate: 'Present',
      current: true,
      description: 'Led development of key features.',
      tags: ['React', 'TypeScript'],
    },
    {
      id: '2',
      company: 'Startup Inc',
      role: 'Developer',
      startDate: '2018-01',
      endDate: '2019-12',
      current: false,
      description: 'Built customer-facing features.',
      tags: ['JavaScript', 'Node.js'],
    },
  ],
  education: [
    {
      id: '1',
      institution: 'University of Tech',
      area: 'Computer Science',
      studyType: 'Bachelor of Science',
      startDate: '2014-09',
      endDate: '2018-05',
    },
  ],
  projects: [
    {
      id: '1',
      name: 'Awesome App',
      description: 'A web application for task management.',
      startDate: '2021-01',
      endDate: '2021-06',
      highlights: ['Built with React', 'Used Node.js backend'],
    },
  ],
};

/**
 * Create a custom resume with custom data
 */
export const createMockResume = (overrides: Partial<SimpleResumeData> = {}): SimpleResumeData => ({
  ...mockResumeData,
  ...overrides,
});

/**
 * Mock work experience entry
 */
export const mockWorkExperience: WorkExperience = {
  id: '1',
  company: 'Tech Corp',
  role: 'Senior Developer',
  startDate: '2020-01',
  endDate: 'Present',
  current: true,
  description: 'Led development of key features.',
  tags: ['React', 'TypeScript'],
};

/**
 * Mock education entry
 */
export const mockEducationEntry: EducationEntry = {
  id: '1',
  institution: 'University of Tech',
  area: 'Computer Science',
  studyType: 'Bachelor of Science',
  startDate: '2014-09',
  endDate: '2018-05',
};

/**
 * Mock project entry
 */
export const mockProjectEntry: ProjectEntry = {
  id: '1',
  name: 'Awesome App',
  description: 'A web application for task management.',
  startDate: '2021-01',
  endDate: '2021-06',
  highlights: ['Built with React', 'Used Node.js backend'],
};

/**
 * Empty resume data for testing
 */
export const emptyResumeData: SimpleResumeData = {
  name: '',
  email: '',
  phone: '',
  location: '',
  role: '',
  summary: '',
  skills: [],
  experience: [],
  education: [],
  projects: [],
};
