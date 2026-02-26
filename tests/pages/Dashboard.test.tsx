import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../../pages/Dashboard';
import {
  getApplicationStats,
  getApplicationFunnel,
  listJobApplications,
} from '../../utils/api-client';

// Mock recharts components since we don't need to test actual chart rendering
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    BarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    Bar: ({ children }: { children: React.ReactNode }) => <div data-testid="bar">{children}</div>,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    XAxis: () => <div data-testid="x-axis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Cell: ({ children }: { children: React.ReactNode }) => <div data-testid="cell">{children}</div>,
  };
});

// Mock StatusBadge component
vi.mock('../../components/StatusBadge', async () => {
  const actual = await vi.importActual('../../components/StatusBadge');
  return {
    default: ({ status }: { status: string }) => (
      <span data-testid="status-badge" data-status={status}>
        {status}
      </span>
    ),
  };
});

// Mock API calls
vi.mock('../../utils/api-client', () => ({
  getApplicationStats: vi.fn(),
  getApplicationFunnel: vi.fn(),
  listJobApplications: vi.fn(),
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock API responses
    vi.mocked(getApplicationStats).mockResolvedValue({
      total_applications: 25,
      interview_rate: 0.32,
      response_rate: 0.4,
      offer_rate: 0.12,
      by_status: {
        applied: 5,
        interviewing: 8,
        offer: 2,
        rejected: 10,
      },
    });
    vi.mocked(getApplicationFunnel).mockResolvedValue({
      stages: [
        { name: 'applied', count: 25, percentage: 100 },
        { name: 'interviewing', count: 8, percentage: 32 },
        { name: 'offer', count: 2, percentage: 8 },
      ],
      total_applications: 25,
    });
    vi.mocked(listJobApplications).mockResolvedValue([
      {
        id: 1,
        company_name: 'Google',
        job_title: 'Software Engineer',
        status: 'applied',
        salary_currency: 'USD',
        tags: [],
        created_at: '2023-10-24T00:00:00Z',
        updated_at: '2023-10-24T00:00:00Z',
      },
      {
        id: 2,
        company_name: 'Stripe',
        job_title: 'Product Designer',
        status: 'interviewing',
        salary_currency: 'USD',
        tags: [],
        created_at: '2023-10-22T00:00:00Z',
        updated_at: '2023-10-22T00:00:00Z',
      },
      {
        id: 3,
        company_name: 'Vercel',
        job_title: 'Frontend Developer',
        status: 'offer',
        salary_currency: 'USD',
        tags: [],
        created_at: '2023-10-15T00:00:00Z',
        updated_at: '2023-10-15T00:00:00Z',
      },
    ]);
  });

  it('renders without crashing', async () => {
    const { container } = render(<Dashboard />);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(container).toBeInTheDocument();
  });

  describe('Header Section', () => {
    it('renders main header with correct title', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const title = screen.getByText('Job Search Overview');
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('text-slate-800', 'font-bold', 'text-xl');
    });

    it('renders notifications button', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const notificationButton = screen.getByText('notifications').closest('button');
      expect(notificationButton).toBeInTheDocument();
    });

    it('renders user avatar in header', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const avatarDiv = screen
        .getByText('notifications')
        .closest('div')
        ?.parentElement?.querySelector('.bg-slate-200');
      expect(avatarDiv).toBeInTheDocument();
    });
  });

  describe('Statistics Cards', () => {
    it('renders three statistics cards', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const gridContainer = screen.getByText('Applications Sent').closest('.grid');
      if (gridContainer) {
        const statsCards = gridContainer.querySelectorAll(':scope > div');
        expect(statsCards.length).toBe(3);
      }
    });

    it('renders Applications Sent card with correct data', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(screen.getByText('Applications Sent')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });

    it('renders Interview Rate card with correct data', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(screen.getByText('Interview Rate')).toBeInTheDocument();
      expect(screen.getByText('32%')).toBeInTheDocument();
      expect(screen.getByText('Based on interviews')).toBeInTheDocument();
    });

    it('renders Pending Responses card with correct data', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(screen.getByText('Pending Responses')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Applications awaiting response')).toBeInTheDocument();
    });
  });

  describe('Recent Applications Table', () => {
    it('renders Recent Applications section header', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const sectionHeader = screen.getByText('Recent Applications');
      expect(sectionHeader).toBeInTheDocument();

      const viewAllButton = screen.getByRole('button', { name: 'View all' });
      expect(viewAllButton).toBeInTheDocument();
    });

    it('renders table with correct headers', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Date Applied')).toBeInTheDocument();
    });

    it('renders recent applications data', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      await screen.findByText('Google');
      await screen.findByText('Software Engineer');

      await screen.findByText('Stripe');
      await screen.findByText('Product Designer');

      await screen.findByText('Vercel');
      await screen.findByText('Frontend Developer');
    });

    it('renders status badges for each application', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const statusBadges = screen.getAllByTestId('status-badge');
      expect(statusBadges.length).toBe(3);

      const appliedBadge = statusBadges.find(
        (badge) => badge.getAttribute('data-status') === 'Applied',
      );
      const interviewBadge = statusBadges.find(
        (badge) => badge.getAttribute('data-status') === 'Interview',
      );
      const offerBadge = statusBadges.find(
        (badge) => badge.getAttribute('data-status') === 'Offer',
      );

      expect(appliedBadge).toBeInTheDocument();
      expect(interviewBadge).toBeInTheDocument();
      expect(offerBadge).toBeInTheDocument();
    });
  });

  describe('Application Funnel Chart', () => {
    it('renders Application Funnel section header', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const funnelHeader = screen.getByText('Application Funnel');
      expect(funnelHeader).toBeInTheDocument();
    });

    it('renders chart container', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const chartContainer = screen.getByTestId('responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });

    it('renders chart labels with correct data', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const sentElements = screen.getAllByText('Applied');
      expect(sentElements.length).toBeGreaterThan(0);

      const interviewElements = screen.getAllByText('Interviewing');
      expect(interviewElements.length).toBeGreaterThan(0);

      const offerElements = screen.getAllByText('Offer');
      expect(offerElements.length).toBeGreaterThan(0);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('has correct main container classes', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const mainContainer = screen.getByText('Job Search Overview').closest('div');
      expect(mainContainer).toBeInTheDocument();
    });

    it('has the sidebar offset class (pl-72)', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const mainDiv = screen.getByText('Job Search Overview').closest('div');
      expect(mainDiv?.classList.contains('pl-72')).toBe(true);
    });
  });

  describe('Component Integration', () => {
    it('properly integrates all dashboard elements', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(screen.getByText('Job Search Overview')).toBeInTheDocument();
      expect(screen.getByText('Applications Sent')).toBeInTheDocument();
      expect(screen.getByText('Recent Applications')).toBeInTheDocument();
      expect(screen.getByText('Application Funnel')).toBeInTheDocument();
    });

    it('displays correct initial data', async () => {
      render(<Dashboard />);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('32%')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});
