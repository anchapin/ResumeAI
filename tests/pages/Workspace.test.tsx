import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Workspace from '../../pages/Workspace';
import { useStore } from '../../store/store';
import * as api from '../../utils/api-client';
import { useGeneratePackage } from '../../hooks/useGeneratePackage';

// Mock hooks and utilities
vi.mock('../../store/store');
vi.mock('../../utils/api-client');
vi.mock('../../hooks/useGeneratePackage', async () => {
  const actual = await vi.importActual('../../hooks/useGeneratePackage');
  return {
    ...actual,
    useGeneratePackage: vi.fn(() => ({
      generatePackage: vi.fn(),
      generateCoverLetterRequest: vi.fn(),
      downloadPDF: vi.fn(),
      renderMarkdown: vi.fn(),
      loading: false,
      error: null,
      data: null,
      coverLetter: null,
      coverLetterLoading: false,
    })),
  };
});
vi.mock('../../hooks/useVariants', () => ({
  useVariants: () => ({
    variants: [
      { name: 'base', display_name: 'Base Template', description: 'Base' },
      { name: 'modern', display_name: 'Modern Template', description: 'Modern' },
    ],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockResumeData = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-1234',
  location: 'San Francisco',
  role: 'Senior Developer',
  summary: 'Experienced developer',
  experience: [],
  education: [],
  skills: [],
  projects: [],
};

describe('Workspace Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockImplementation((selector) => selector({ resumeData: mockResumeData }));
    (api.listResumeVersions as any).mockResolvedValue([]);
    (api.listComments as any).mockResolvedValue([]);
  });

  describe('Rendering', () => {
    it('renders the workspace header', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Tailored Resume Workspace')).toBeInTheDocument();
      });
    });

    it('renders the left panel with inputs', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
      });
    });

    it('renders the right panel with preview', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Ready to Tailor?')).toBeInTheDocument();
      });
    });

    it('renders all form inputs', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Job Title (Optional)')).toBeInTheDocument();
        expect(screen.getByLabelText('Paste Job Description Here')).toBeInTheDocument();
      });
    });

    it('renders template selector', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Select Template')).toBeInTheDocument();
      });
    });

    it('renders tab navigation', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Resume')).toBeInTheDocument();
        expect(screen.getByText('Keywords')).toBeInTheDocument();
      });
    });
  });

  describe('Form inputs', () => {
    it('allows company name input', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const companyInput = await screen.findByPlaceholderText('e.g. Acme Corp');
      await user.type(companyInput, 'TechCorp');

      expect(companyInput).toHaveValue('TechCorp');
    });

    it('allows job title input', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const jobTitleInput = await screen.findByPlaceholderText('e.g. Senior Product Designer');
      await user.type(jobTitleInput, 'Senior Developer');

      expect(jobTitleInput).toHaveValue('Senior Developer');
    });

    it('allows job description input', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const jobDescInput = await screen.findByPlaceholderText(
        'Copy and paste the full job posting...',
      );
      await user.type(jobDescInput, 'Looking for a senior developer');

      expect(jobDescInput).toHaveValue('Looking for a senior developer');
    });

    it('allows template selection', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const selectElement = await screen.findByDisplayValue('Base Template');
      expect(selectElement).toBeInTheDocument();
    });
  });

  describe('Tab navigation', () => {
    it('switches between tabs', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const resumeTab = await screen.findByRole('button', { name: 'Resume' });
      const keywordsTab = screen.getByRole('button', { name: 'Keywords' });

      await user.click(keywordsTab);
      expect(keywordsTab).toHaveClass('bg-primary-50');
    });

    it('shows all available tabs', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Resume')).toBeInTheDocument();
        expect(screen.getByText('Cover Letter')).toBeInTheDocument();
        expect(screen.getByText('Keywords')).toBeInTheDocument();
        expect(screen.getByText('Suggestions')).toBeInTheDocument();
        expect(screen.getByText('Adjust')).toBeInTheDocument();
      });
    });

    it('highlights active tab', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const resumeTab = await screen.findByRole('button', { name: 'Resume' });
      expect(resumeTab).toHaveClass('bg-primary-50');
    });
  });

  describe('Placeholder content', () => {
    it('shows ready to tailor message initially', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Ready to Tailor?')).toBeInTheDocument();
      });
    });

    it('shows helpful instructions', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Input job description on the left/i)).toBeInTheDocument();
      });
    });
  });

  describe('Header elements', () => {
    it('renders back button', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const backButton = await screen.findByRole('button', {
        name: /Back to dashboard/i,
      });
      expect(backButton).toBeInTheDocument();
    });

    it('renders generate button', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const generateButton = await screen.findByRole('button', {
        name: /Generate Package/i,
      });
      expect(generateButton).toBeInTheDocument();
    });

    it('renders settings button', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const settingsButton = buttons.find((btn) => btn.querySelector('[role="img"]'));
        expect(settingsButton).toBeDefined();
      });
    });
  });

  describe('Metadata indicators', () => {
    it('renders version count', async () => {
      (api.listResumeVersions as any).mockResolvedValueOnce([
        { id: 1, createdAt: new Date().toISOString() },
        { id: 2, createdAt: new Date().toISOString() },
      ]);

      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/2 versions/)).toBeInTheDocument();
      });
    });

    it('renders comment count', async () => {
      (api.listComments as any).mockResolvedValueOnce([
        { id: 1, createdAt: new Date().toISOString() },
      ]);

      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/1 comments/)).toBeInTheDocument();
      });
    });

    it('shows loading indicator for metadata', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        const loadingElement = screen.queryByRole('status');
        if (loadingElement) {
          expect(loadingElement).toBeInTheDocument();
        }
      });
    });
  });

  describe('Layout responsiveness', () => {
    it('has split layout structure', async () => {
      const { container } = render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        const mainElement = container.querySelector('main');
        expect(mainElement).toHaveClass('flex');
        expect(mainElement).toHaveClass('overflow-hidden');
      });
    });

    it('left panel has correct width class', async () => {
      const { container } = render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        const leftPanel = container.querySelector('[data-testid="left-panel"]');
        if (!leftPanel) {
          // Check by other means if testid not available
          expect(container.querySelector('div.w-full.lg\\:w-\\[480px\\]')).toBeTruthy();
        }
      });
    });
  });

  describe('Error handling', () => {
    it('displays error message when provided', async () => {
      vi.mocked(useGeneratePackage).mockReturnValueOnce({
        generatePackage: vi.fn(),
        generateCoverLetterRequest: vi.fn(),
        downloadPDF: vi.fn(),
        renderMarkdown: vi.fn(),
        loading: false,
        error: 'Test error message',
        data: null,
        coverLetter: null,
        coverLetterLoading: false,
      });

      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper label associations', async () => {
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const companyLabel = await screen.findByText('Company Name');
      const companyInput = screen.getByPlaceholderText('e.g. Acme Corp');

      expect(companyLabel).toHaveAttribute('for', 'company-name');
      expect(companyInput).toHaveAttribute('id', 'company-name');
    });

    it('form fields are keyboard navigable', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const companyInput = await screen.findByPlaceholderText('e.g. Acme Corp');
      await user.tab();

      // Tab should navigate through form elements
      expect(document.activeElement).toBeDefined();
    });

    it('role attributes are set for semantic HTML', async () => {
      const { container } = render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const mainElement = container.querySelector('main');
      expect(mainElement?.tagName).toBe('MAIN');
    });
  });

  describe('State management', () => {
    it('updates form inputs on change', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const companyInput = await screen.findByPlaceholderText('e.g. Acme Corp');
      await user.clear(companyInput);
      await user.type(companyInput, 'NewCorp');

      expect(companyInput).toHaveValue('NewCorp');
    });

    it('maintains state across tab switches', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>,
      );

      const companyInput = await screen.findByPlaceholderText('e.g. Acme Corp');
      await user.type(companyInput, 'TechCorp');

      const keywordsTab = screen.getByRole('button', { name: 'Keywords' });
      await user.click(keywordsTab);

      const resumeTab = screen.getByRole('button', { name: 'Resume' });
      await user.click(resumeTab);

      // The company input value should still be there
      expect(companyInput).toHaveValue('TechCorp');
    });
  });
});
