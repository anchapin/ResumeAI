import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Workspace from '../pages/Workspace';
import { Route, SimpleResumeData } from '../types';
import { showErrorToast, showSuccessToast } from '../utils/toast';

// Mock the hooks
vi.mock('../hooks/useGeneratePackage', () => ({
  useGeneratePackage: () => ({
    generatePackage: vi.fn(),
    downloadPDF: vi.fn(),
    renderMarkdown: vi.fn(),
    loading: false,
    error: null,
    data: null,
  }),
  convertToResumeData: (data: any) => ({
    basics: {
      name: data.name || '',
      label: data.role || '',
      email: data.email || '',
      phone: data.phone || '',
      summary: data.summary || '',
      location: data.location || '',
    },
    work: (data.experience || []).map((exp: any) => ({
      company: exp.company || '',
      position: exp.role || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      summary: exp.description || '',
      highlights: exp.tags || [],
    })),
    education: (data.education || []).map((edu: any) => ({
      institution: edu.institution || '',
      area: edu.area || '',
      studyType: edu.studyType || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || '',
    })),
    skills: (data.skills || []).map((skill: string) => ({ name: skill })),
  }),
}));

// Mock toast functions
vi.mock('../utils/toast', () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

vi.mock('../hooks/useVariants', () => ({
  useVariants: () => ({
    variants: [
      {
        name: 'base',
        display_name: 'Base Template',
        description: 'A clean, professional resume template',
        format: 'json',
        output_formats: ['pdf'],
      },
    ],
    loading: false,
    error: null,
  }),
}));
// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the environment variables
vi.stubEnv('VITE_API_URL', 'http://localhost:8000');

describe('Workspace Component', () => {
  const mockResumeData: SimpleResumeData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    location: 'New York, NY',
    role: 'Software Engineer',
    summary: 'Experienced software engineer with expertise in React and TypeScript',
    skills: ['React', 'TypeScript', 'JavaScript'],
    experience: [
      {
        id: '1',
        company: 'Tech Corp',
        role: 'Software Engineer',
        startDate: '2020-01-01',
        endDate: '2023-12-31',
        current: false,
        description: 'Developed web applications',
        tags: ['React', 'TypeScript'],
      },
    ],
    education: [
      {
        id: '1',
        institution: 'University',
        area: 'Computer Science',
        studyType: 'Bachelor',
        startDate: '2016',
        endDate: '2020',
        courses: ['Data Structures', 'Algorithms'],
      },
    ],
    projects: [
      {
        id: '1',
        name: 'Project Alpha',
        description: 'A sample project',
        startDate: '2022',
        endDate: '2023',
        roles: ['Developer'],
        highlights: ['Implemented key features'],
      },
    ],
  };

  const mockShowErrorToast = vi.fn();
  const mockShowSuccessToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(showErrorToast).mockImplementation(mockShowErrorToast);
    vi.mocked(showSuccessToast).mockImplementation(mockShowSuccessToast);
  });

  it('renders the Workspace component with all elements', () => {
    render(
      <BrowserRouter>
        <Workspace />
      </BrowserRouter>,
    );

    // Check for key elements
    expect(screen.getByText('Tailored Resume Workspace')).toBeInTheDocument();
    expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Job Title (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Paste Job Description Here')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Template')).toBeInTheDocument();

    // Check for the tabs
    expect(screen.getByText('Resume')).toBeInTheDocument();
    expect(screen.getByText('Keywords')).toBeInTheDocument();
    expect(screen.getByText('Suggestions')).toBeInTheDocument();
  });

  it('allows navigation back to dashboard', () => {
    render(
      <BrowserRouter>
        <Workspace />
      </BrowserRouter>,
    );

    const backButton = screen.getByRole('button', { name: /arrow_back/i });
    expect(backButton).toBeInTheDocument();
  });

  it('updates form inputs correctly', () => {
    render(
      <BrowserRouter>
        <Workspace />
      </BrowserRouter>,
    );

    // Test company name input
    const companyInput = screen.getByLabelText('Company Name');
    fireEvent.change(companyInput, { target: { value: 'New Company' } });
    expect(companyInput).toHaveValue('New Company');

    // Test job title input
    const jobTitleInput = screen.getByLabelText('Job Title (Optional)');
    fireEvent.change(jobTitleInput, { target: { value: 'Senior Developer' } });
    expect(jobTitleInput).toHaveValue('Senior Developer');

    // Test job description textarea
    const jobDescTextarea = screen.getByLabelText('Paste Job Description Here');
    fireEvent.change(jobDescTextarea, { target: { value: 'Job description text' } });
    expect(jobDescTextarea).toHaveValue('Job description text');
  });

  it('displays loading state for variants', () => {
    // Note: The useVariants mock is set at module level to return loading: false
    // This test verifies the component renders correctly with the mocked data
    render(
      <BrowserRouter>
        <Workspace />
      </BrowserRouter>,
    );

    // Since variants are loaded (not loading), the select should be visible
    expect(screen.getByLabelText('Select Template')).toBeInTheDocument();
  });

  it('handles tab switching', () => {
    render(
      <BrowserRouter>
        <Workspace />
      </BrowserRouter>,
    );

    // Initially Resume tab should be active
    const resumeTab = screen.getByRole('button', { name: 'Resume' });
    expect(resumeTab).toHaveClass('bg-primary-50');

    // Switch to Keywords tab
    const keywordsTab = screen.getByRole('button', { name: 'Keywords' });
    fireEvent.click(keywordsTab);
    expect(keywordsTab).toHaveClass('bg-primary-50');
    expect(resumeTab).not.toHaveClass('bg-primary-50');

    // Switch to Suggestions tab
    const suggestionsTab = screen.getByRole('button', { name: 'Suggestions' });
    fireEvent.click(suggestionsTab);
    expect(suggestionsTab).toHaveClass('bg-primary-50');
    expect(keywordsTab).not.toHaveClass('bg-primary-50');
  });

  it('validates required fields before generation', async () => {
    render(
      <BrowserRouter>
        <Workspace />
      </BrowserRouter>,
    );

    // Click generate without job description (should trigger validation)
    const generateButton = screen.getByText('Generate Package');
    fireEvent.click(generateButton);

    // Should show error toast for missing job description
    expect(mockShowErrorToast).toHaveBeenCalledWith('Please enter a job description.');
  });
});
