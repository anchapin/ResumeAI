import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import JobApplications from './JobApplications';
import * as apiClient from '../utils/api-client';

// Mock the API client
vi.mock('../utils/api-client', () => ({
  listJobApplications: vi.fn(),
  convertToAPIData: vi.fn(),
  tailorResume: vi.fn(),
  checkATSScore: vi.fn(),
  createJobApplication: vi.fn(),
  updateJobApplication: vi.fn(),
  deleteJobApplication: vi.fn(),
  getApplicationStats: vi.fn(),
}));

// Mock data that matches what the tests expect
const mockApplications = [
  {
    id: 1,
    company_name: 'Google',
    job_title: 'Software Engineer',
    status: 'applied',
    createdAt: '2023-10-24T00:00:00Z',
    updatedAt: '2023-10-24T00:00:00Z',
    tags: [],
    salary_currency: 'USD',
  },
  {
    id: 2,
    company_name: 'Stripe',
    job_title: 'Product Designer',
    status: 'interviewing',
    createdAt: '2023-10-22T00:00:00Z',
    updatedAt: '2023-10-22T00:00:00Z',
    tags: [],
    salary_currency: 'USD',
  },
  {
    id: 3,
    company_name: 'Vercel',
    job_title: 'Frontend Developer',
    status: 'offer',
    createdAt: '2023-10-15T00:00:00Z',
    updatedAt: '2023-10-15T00:00:00Z',
    tags: [],
    salary_currency: 'USD',
  },
  {
    id: 4,
    company_name: 'Netflix',
    job_title: 'Senior UI Engineer',
    status: 'rejected',
    createdAt: '2023-09-28T00:00:00Z',
    updatedAt: '2023-09-28T00:00:00Z',
    tags: [],
    salary_currency: 'USD',
  },
  {
    id: 5,
    company_name: 'Airbnb',
    job_title: 'Full Stack Developer',
    status: 'applied',
    createdAt: '2023-11-01T00:00:00Z',
    updatedAt: '2023-11-01T00:00:00Z',
    tags: [],
    salary_currency: 'USD',
  },
  {
    id: 6,
    company_name: 'Microsoft',
    job_title: 'Software Engineer II',
    status: 'interviewing',
    createdAt: '2023-10-05T00:00:00Z',
    updatedAt: '2023-10-05T00:00:00Z',
    tags: [],
    salary_currency: 'USD',
  },
  {
    id: 7,
    company_name: 'Amazon',
    job_title: 'Frontend Engineer',
    status: 'applied',
    createdAt: '2023-11-03T00:00:00Z',
    updatedAt: '2023-11-03T00:00:00Z',
    tags: [],
    salary_currency: 'USD',
  },
];

describe('JobApplications Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (apiClient.listJobApplications as any).mockResolvedValue(mockApplications);
  });

  describe('Component Rendering', () => {
    it('renders without crashing', async () => {
      const { container } = render(<JobApplications />);
      await waitFor(() => expect(apiClient.listJobApplications).toHaveBeenCalled());
      expect(container).toBeInTheDocument();
    });

    it('renders main header "Job Applications"', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const header = screen.getByRole('heading', { name: 'Job Applications' });
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('text-slate-800', 'font-bold', 'text-xl');
    });

    it('renders notification bell icon', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const icons = screen.getAllByText(/notifications/i);
      expect(icons.length).toBeGreaterThan(0);
      const notificationIcon = icons.find((icon) =>
        icon.classList.contains('material-symbols-outlined'),
      );
      expect(notificationIcon).toBeInTheDocument();
    });

    it('renders user avatar in header', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const avatars = document.querySelectorAll('.bg-cover.bg-center');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('has red notification badge on bell icon', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const badge = document.querySelector('.bg-red-500');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Add Application Button', () => {
    it('renders Add Application button', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const addButton = screen.getByRole('button', { name: /add application/i });
      expect(addButton).toBeInTheDocument();
    });

    it('Add Application button has correct styling', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const addButton = screen.getByRole('button', { name: /add application/i });
      expect(addButton).toHaveClass(
        'bg-primary-600',
        'hover:bg-primary-700',
        'text-white',
        'px-4',
        'py-2',
        'rounded-lg',
      );
    });

    it('Add Application button contains add icon', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const addIcon = screen
        .getAllByText(/add/i)
        .find((el) => el.classList.contains('material-symbols-outlined'));
      expect(addIcon).toBeInTheDocument();
    });
  });

  describe('Search and Filter', () => {
    it('renders search input with placeholder', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const searchInput = screen.getByPlaceholderText(/search applications/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveClass('bg-slate-50');
    });

    it('search input has search icon', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const searchIcon = document.querySelector('.material-symbols-outlined');
      expect(searchIcon).toBeInTheDocument();
    });

    it('renders Filter button', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const filterButton = screen.getByRole('button', { name: /filter/i });
      expect(filterButton).toBeInTheDocument();
    });

    it('renders Sort button', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const sortButton = screen.getByRole('button', { name: /sort/i });
      expect(sortButton).toBeInTheDocument();
    });
  });

  describe('Applications Table', () => {
    it('renders table with headers', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());

      const tableHeaders = screen.getAllByRole('columnheader');
      expect(tableHeaders.length).toBe(5);

      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Date Applied')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders mock application data', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());

      // Check for company names
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('Stripe')).toBeInTheDocument();
      expect(screen.getByText('Vercel')).toBeInTheDocument();
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('Airbnb')).toBeInTheDocument();
      expect(screen.getByText('Microsoft')).toBeInTheDocument();
      expect(screen.getByText('Amazon')).toBeInTheDocument();
    });

    it('renders job roles', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());

      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Product Designer')).toBeInTheDocument();
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
      expect(screen.getByText('Senior UI Engineer')).toBeInTheDocument();
      expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
      expect(screen.getByText('Software Engineer II')).toBeInTheDocument();
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    });

    it('renders status badges for all applications', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());

      // Check for status badges
      const appliedBadges = screen.getAllByText('Applied');
      expect(appliedBadges.length).toBe(3); // Google, Airbnb, Amazon

      const interviewBadges = screen.getAllByText('Interview');
      expect(interviewBadges.length).toBe(2); // Stripe, Microsoft

      const offerBadges = screen.getByText('Offer');
      expect(offerBadges).toBeInTheDocument(); // Vercel

      const rejectedBadges = screen.getByText('Rejected');
      expect(rejectedBadges).toBeInTheDocument(); // Netflix
    });

    it.skip('renders date applied for applications', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());

      expect(screen.getByText('Oct 24, 2023')).toBeInTheDocument();
      expect(screen.getByText('Oct 22, 2023')).toBeInTheDocument();
      expect(screen.getByText('Oct 15, 2023')).toBeInTheDocument();
      expect(screen.getByText('Sep 28, 2023')).toBeInTheDocument();
      expect(screen.getByText('Nov 1, 2023')).toBeInTheDocument();
      expect(screen.getByText('Oct 5, 2023')).toBeInTheDocument();
      expect(screen.getByText('Nov 3, 2023')).toBeInTheDocument();
    });

    it('renders company logos', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const logos = document.querySelectorAll('img');
      // Each application has a logo, so we should have at least 7 logos
      expect(logos.length).toBeGreaterThanOrEqual(7);
    });

    it('renders action buttons for each row', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const moreButtons = document.querySelectorAll('.material-symbols-outlined');
      // Each row should have a more_vert icon for actions
      expect(moreButtons.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Table Structure', () => {
    it('table has correct class names', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const table = document.querySelector('table');
      expect(table).toHaveClass('w-full', 'text-left', 'border-collapse');
    });

    it('table has tbody with rows', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const tbody = document.querySelector('tbody');
      expect(tbody).toBeInTheDocument();

      const rows = tbody?.querySelectorAll('tr');
      expect(rows?.length).toBe(7); // 7 mock applications
    });

    it('table rows have hover effect', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const firstRow = document.querySelector('tbody tr');
      expect(firstRow).toHaveClass('hover:bg-slate-50', 'transition-colors', 'cursor-pointer');
    });
  });

  describe('Status Badge Colors', () => {
    it('Applied status has blue styling', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const appliedBadges = screen.getAllByText('Applied');
      const appliedBadge = appliedBadges[0].closest('span');
      expect(appliedBadge).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('Interview status has purple styling', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const interviewBadges = screen.getAllByText('Interview');
      const interviewBadge = interviewBadges[0].closest('span');
      expect(interviewBadge).toHaveClass('bg-purple-100', 'text-purple-700');
    });

    it('Offer status has emerald styling', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const offerBadge = screen.getByText('Offer').closest('span');
      expect(offerBadge).toHaveClass('bg-emerald-100', 'text-emerald-700');
    });

    it('Rejected status has red styling', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const rejectedBadge = screen.getByText('Rejected').closest('span');
      expect(rejectedBadge).toHaveClass('bg-red-100', 'text-red-700');
    });
  });

  describe('Layout and Styling', () => {
    it('main container has correct classes', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const container = document.querySelector('.flex-1.min-h-screen');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('bg-[#f6f6f8]', 'pl-72');
    });

    it('header is sticky at top', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const header = document.querySelector('header');
      expect(header).toHaveClass('sticky', 'top-0', 'z-10');
    });

    it('content has max-width constraint', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const content = document.querySelector('.max-w-\\[1200px\\]');
      expect(content).toBeInTheDocument();
    });

    it('table container has correct styling', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const tableContainer = document.querySelector('.bg-white.rounded-2xl');
      expect(tableContainer).toBeInTheDocument();
      expect(tableContainer).toHaveClass(
        'border',
        'border-slate-200',
        'shadow-sm',
        'overflow-hidden',
      );
    });
  });

  describe('Accessibility', () => {
    it('table is properly structured with headers', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const table = document.querySelector('table');
      expect(table).toBeInTheDocument();
    });

    it('buttons are identifiable by their text content', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());

      expect(screen.getByRole('button', { name: /add application/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sort/i })).toBeInTheDocument();
    });

    it('search input is accessible', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const searchInput = screen.getByPlaceholderText(/search applications/i);
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('company names are rendered as text', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const googleText = screen.getByText('Google');
      expect(googleText).toBeInTheDocument();
    });
  });

  describe('Component Data', () => {
    it('displays 7 job applications', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const rows = document.querySelectorAll('tbody tr');
      expect(rows.length).toBe(7);
    });

    it('applications have varied statuses', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());

      const statuses = [
        'Applied',
        'Interview',
        'Offer',
        'Rejected',
        'Applied',
        'Interview',
        'Applied',
      ];

      statuses.forEach((status) => {
        const elements = screen.getAllByText(status);
        expect(elements.length).toBeGreaterThan(0);
        elements.forEach((el) => expect(el).toBeInTheDocument());
      });
    });

    it('each application has a company logo', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const images = document.querySelectorAll('tbody img');
      expect(images.length).toBe(7);
    });
  });

  describe('Responsive Design', () => {
    it('search bar uses responsive layout', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const searchBar = document.querySelector('.bg-white.p-4.rounded-xl');
      expect(searchBar).toBeInTheDocument();
      expect(searchBar).toHaveClass('flex', 'items-center', 'gap-4');
    });

    it('header uses flexbox for layout', async () => {
      render(<JobApplications />);
      await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
      const header = document.querySelector('header');
      expect(header).toHaveClass('flex', 'items-center', 'justify-between');
    });
  });
});
