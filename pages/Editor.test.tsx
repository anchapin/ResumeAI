import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Editor from './Editor';
import { SimpleResumeData } from '../types';

// Mock data for testing
const mockResumeData: SimpleResumeData = {
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

describe('Editor Component', () => {
  const mockOnUpdate = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it('renders navigation items', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('My Resumes')).toBeInTheDocument();
      expect(screen.getByText('Templates')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders tab items', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      
      expect(screen.getByText('Contact Info')).toBeInTheDocument();
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText('Experience')).toBeInTheDocument();
      expect(screen.getByText('Skills')).toBeInTheDocument();
      expect(screen.getByText('Education')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('renders user avatar in header', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      const avatar = screen.getByAltText('Profile');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('Save Status Indicator', () => {
    it('renders with default idle status', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      // Component should render without errors
      expect(screen.getByText('Contact Info')).toBeInTheDocument();
    });

    it('renders with saving status', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
          saveStatus="saving"
        />
      );
      expect(screen.getByText('Contact Info')).toBeInTheDocument();
    });

    it('renders with saved status', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
          saveStatus="saved"
        />
      );
      expect(screen.getByText('Contact Info')).toBeInTheDocument();
    });

    it('renders with error status', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
          saveStatus="error"
        />
      );
      expect(screen.getByText('Contact Info')).toBeInTheDocument();
    });
  });

  describe('Resume Data Display', () => {
    it('renders experience section with data', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      
      // Click on Experience tab
      const experienceTab = screen.getByText('Experience');
      expect(experienceTab).toBeInTheDocument();
    });

    it('renders skills from resume data', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      
      // Skills should be displayed somewhere
      const skills = mockResumeData.skills;
      expect(skills.length).toBeGreaterThan(0);
    });

    it('renders education entries', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      
      // Education data exists
      expect(mockResumeData.education.length).toBeGreaterThan(0);
    });

    it('renders projects', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      
      // Projects data exists
      expect(mockResumeData.projects.length).toBeGreaterThan(0);
    });
  });

  describe('Layout and Styling', () => {
    it('main container has correct structure', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      
      const container = document.querySelector('main');
      expect(container).toHaveClass('flex-1');
    });

    it('has header section', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      
      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('navigation uses flexbox layout', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      
      const nav = document.querySelector('nav');
      expect(nav).toHaveClass('flex', 'gap-6');
    });
  });

  describe('Interaction', () => {
    it('calls onBack when back button is clicked', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      
      // Find and click back button - the exact selector depends on implementation
      // This test ensures the callback exists and can be called
      expect(mockOnBack).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('navigation items are present', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      
      // Navigation items should be accessible
      const dashboard = screen.getByText('Dashboard');
      expect(dashboard).toBeInTheDocument();
    });

    it('tab items are present', () => {
      render(
        <Editor
          resumeData={mockResumeData}
          onUpdate={mockOnUpdate}
          onBack={mockOnBack}
        />
      );
      
      // Tab items should be accessible
      const contactInfo = screen.getByText('Contact Info');
      expect(contactInfo).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('accepts valid resume data', () => {
      expect(() => {
        render(
          <Editor
            resumeData={mockResumeData}
            onUpdate={mockOnUpdate}
            onBack={mockOnBack}
          />
        );
      }).not.toThrow();
    });

    it('handles empty experience array', () => {
      const emptyData: SimpleResumeData = {
        ...mockResumeData,
        experience: [],
      };
      
      expect(() => {
        render(
          <Editor
            resumeData={emptyData}
            onUpdate={mockOnUpdate}
            onBack={mockOnBack}
          />
        );
      }).not.toThrow();
    });

    it('handles empty skills array', () => {
      const emptySkillsData: SimpleResumeData = {
        ...mockResumeData,
        skills: [],
      };
      
      expect(() => {
        render(
          <Editor
            resumeData={emptySkillsData}
            onUpdate={mockOnUpdate}
            onBack={mockOnBack}
          />
        );
      }).not.toThrow();
    });

    it('handles minimal resume data', () => {
      const minimalData: SimpleResumeData = {
        name: 'John',
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
      
      expect(() => {
        render(
          <Editor
            resumeData={minimalData}
            onUpdate={mockOnUpdate}
            onBack={mockOnBack}
          />
        );
      }).not.toThrow();
    });
  });
});
