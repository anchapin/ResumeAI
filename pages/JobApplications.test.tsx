import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import JobApplications from './JobApplications';

describe('JobApplications Component', () => {
  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<JobApplications />);
      expect(container).toBeInTheDocument();
    });

    it('renders main header "Job Applications"', () => {
      render(<JobApplications />);
      const header = screen.getByRole('heading', { name: 'Job Applications' });
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('text-slate-800', 'font-bold', 'text-xl');
    });

    it('renders notification bell icon', () => {
      render(<JobApplications />);
      const icons = screen.getAllByText(/notifications/i);
      expect(icons.length).toBeGreaterThan(0);
      const notificationIcon = icons.find(icon => icon.classList.contains('material-symbols-outlined'));
      expect(notificationIcon).toBeInTheDocument();
    });

    it('renders user avatar in header', () => {
      render(<JobApplications />);
      const avatars = document.querySelectorAll('.bg-cover.bg-center');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('has red notification badge on bell icon', () => {
      render(<JobApplications />);
      const badge = document.querySelector('.bg-red-500');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Add Application Button', () => {
    it('renders Add Application button', () => {
      render(<JobApplications />);
      const addButton = screen.getByRole('button', { name: /add application/i });
      expect(addButton).toBeInTheDocument();
    });

    it('Add Application button has correct styling', () => {
      render(<JobApplications />);
      const addButton = screen.getByRole('button', { name: /add application/i });
      expect(addButton).toHaveClass(
        'bg-primary-600',
        'hover:bg-primary-700',
        'text-white',
        'px-4',
        'py-2',
        'rounded-lg'
      );
    });

    it('Add Application button contains add icon', () => {
      render(<JobApplications />);
      const addIcon = screen.getAllByText(/add/i).find(el => el.classList.contains('material-symbols-outlined'));
      expect(addIcon).toBeInTheDocument();
    });
  });

  describe('Search and Filter', () => {
    it('renders search input with placeholder', () => {
      render(<JobApplications />);
      const searchInput = screen.getByPlaceholderText(/search applications/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveClass('bg-slate-50');
    });

    it('search input has search icon', () => {
      render(<JobApplications />);
      const searchIcon = document.querySelector('.material-symbols-outlined');
      expect(searchIcon).toBeInTheDocument();
    });

    it('renders Filter button', () => {
      render(<JobApplications />);
      const filterButton = screen.getByRole('button', { name: /filter/i });
      expect(filterButton).toBeInTheDocument();
    });

    it('renders Sort button', () => {
      render(<JobApplications />);
      const sortButton = screen.getByRole('button', { name: /sort/i });
      expect(sortButton).toBeInTheDocument();
    });
  });

  describe('Applications Table', () => {
    it('renders table with headers', () => {
      render(<JobApplications />);
      
      const tableHeaders = screen.getAllByRole('columnheader');
      expect(tableHeaders.length).toBe(5);
      
      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Date Applied')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders mock application data', () => {
      render(<JobApplications />);
      
      // Check for company names
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('Stripe')).toBeInTheDocument();
      expect(screen.getByText('Vercel')).toBeInTheDocument();
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('Airbnb')).toBeInTheDocument();
      expect(screen.getByText('Microsoft')).toBeInTheDocument();
      expect(screen.getByText('Amazon')).toBeInTheDocument();
    });

    it('renders job roles', () => {
      render(<JobApplications />);
      
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Product Designer')).toBeInTheDocument();
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
      expect(screen.getByText('Senior UI Engineer')).toBeInTheDocument();
      expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
      expect(screen.getByText('Software Engineer II')).toBeInTheDocument();
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    });

    it('renders status badges for all applications', () => {
      render(<JobApplications />);
      
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

    it('renders date applied for applications', () => {
      render(<JobApplications />);
      
      expect(screen.getByText('Oct 24, 2023')).toBeInTheDocument();
      expect(screen.getByText('Oct 22, 2023')).toBeInTheDocument();
      expect(screen.getByText('Oct 15, 2023')).toBeInTheDocument();
      expect(screen.getByText('Sep 28, 2023')).toBeInTheDocument();
      expect(screen.getByText('Nov 01, 2023')).toBeInTheDocument();
      expect(screen.getByText('Oct 05, 2023')).toBeInTheDocument();
      expect(screen.getByText('Nov 03, 2023')).toBeInTheDocument();
    });

    it('renders company logos', () => {
      render(<JobApplications />);
      const logos = document.querySelectorAll('img');
      // Each application has a logo, so we should have at least 7 logos
      expect(logos.length).toBeGreaterThanOrEqual(7);
    });

    it('renders action buttons for each row', () => {
      render(<JobApplications />);
      const moreButtons = document.querySelectorAll('.material-symbols-outlined');
      // Each row should have a more_vert icon for actions
      expect(moreButtons.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Table Structure', () => {
    it('table has correct class names', () => {
      render(<JobApplications />);
      const table = document.querySelector('table');
      expect(table).toHaveClass('w-full', 'text-left', 'border-collapse');
    });

    it('table has tbody with rows', () => {
      render(<JobApplications />);
      const tbody = document.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
      
      const rows = tbody?.querySelectorAll('tr');
      expect(rows?.length).toBe(7); // 7 mock applications
    });

    it('table rows have hover effect', () => {
      render(<JobApplications />);
      const firstRow = document.querySelector('tbody tr');
      expect(firstRow).toHaveClass('hover:bg-slate-50', 'transition-colors', 'cursor-pointer');
    });
  });

  describe('Status Badge Colors', () => {
    it('Applied status has blue styling', () => {
      render(<JobApplications />);
      const appliedBadges = screen.getAllByText('Applied');
      const appliedBadge = appliedBadges[0].closest('span');
      expect(appliedBadge).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('Interview status has purple styling', () => {
      render(<JobApplications />);
      const interviewBadges = screen.getAllByText('Interview');
      const interviewBadge = interviewBadges[0].closest('span');
      expect(interviewBadge).toHaveClass('bg-purple-100', 'text-purple-700');
    });

    it('Offer status has emerald styling', () => {
      render(<JobApplications />);
      const offerBadge = screen.getByText('Offer').closest('span');
      expect(offerBadge).toHaveClass('bg-emerald-100', 'text-emerald-700');
    });

    it('Rejected status has red styling', () => {
      render(<JobApplications />);
      const rejectedBadge = screen.getByText('Rejected').closest('span');
      expect(rejectedBadge).toHaveClass('bg-red-100', 'text-red-700');
    });
  });

  describe('Layout and Styling', () => {
    it('main container has correct classes', () => {
      render(<JobApplications />);
      const container = document.querySelector('.flex-1.min-h-screen');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('bg-[#f6f6f8]', 'pl-72');
    });

    it('header is sticky at top', () => {
      render(<JobApplications />);
      const header = document.querySelector('header');
      expect(header).toHaveClass('sticky', 'top-0', 'z-10');
    });

    it('content has max-width constraint', () => {
      render(<JobApplications />);
      const content = document.querySelector('.max-w-\\[1200px\\]');
      expect(content).toBeInTheDocument();
    });

    it('table container has correct styling', () => {
      render(<JobApplications />);
      const tableContainer = document.querySelector('.bg-white.rounded-2xl');
      expect(tableContainer).toBeInTheDocument();
      expect(tableContainer).toHaveClass('border', 'border-slate-200', 'shadow-sm', 'overflow-hidden');
    });
  });

  describe('Accessibility', () => {
    it('table is properly structured with headers', () => {
      render(<JobApplications />);
      const table = document.querySelector('table');
      expect(table).toBeInTheDocument();
    });

    it('buttons are identifiable by their text content', () => {
      render(<JobApplications />);
      
      expect(screen.getByRole('button', { name: /add application/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sort/i })).toBeInTheDocument();
    });

    it('search input is accessible', () => {
      render(<JobApplications />);
      const searchInput = screen.getByPlaceholderText(/search applications/i);
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('company names are rendered as text', () => {
      render(<JobApplications />);
      const googleText = screen.getByText('Google');
      expect(googleText).toBeInTheDocument();
    });
  });

  describe('Component Data', () => {
    it('displays 7 job applications', () => {
      render(<JobApplications />);
      const rows = document.querySelectorAll('tbody tr');
      expect(rows.length).toBe(7);
    });

    it('applications have varied statuses', () => {
      render(<JobApplications />);
      
      const statuses = [
        'Applied',
        'Interview',
        'Offer',
        'Rejected',
        'Applied',
        'Interview',
        'Applied'
      ];
      
      statuses.forEach(status => {
        expect(screen.getByText(status)).toBeInTheDocument();
      });
    });

    it('each application has a company logo', () => {
      render(<JobApplications />);
      const images = document.querySelectorAll('tbody img');
      expect(images.length).toBe(7);
    });
  });

  describe('Responsive Design', () => {
    it('search bar uses responsive layout', () => {
      render(<JobApplications />);
      const searchBar = document.querySelector('.bg-white.p-4.rounded-xl');
      expect(searchBar).toBeInTheDocument();
      expect(searchBar).toHaveClass('flex', 'items-center', 'gap-4');
    });

    it('header uses flexbox for layout', () => {
      render(<JobApplications />);
      const header = document.querySelector('header');
      expect(header).toHaveClass('flex', 'items-center', 'justify-between');
    });
  });
});
