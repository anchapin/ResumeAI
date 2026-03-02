import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../../components/StatusBadge';

describe('StatusBadge Component', () => {
  describe('Rendering', () => {
    it('should render the badge with status text', () => {
      render(<StatusBadge status="Applied" />);
      expect(screen.getByTestId('status-badge')).toHaveTextContent('Applied');
    });

    it('should set data-status attribute correctly', () => {
      render(<StatusBadge status="Interview" />);
      expect(screen.getByTestId('status-badge')).toHaveAttribute('data-status', 'Interview');
    });

    it('should be a span element', () => {
      render(<StatusBadge status="Applied" />);
      expect(screen.getByTestId('status-badge').tagName).toBe('SPAN');
    });
  });

  describe('Status "Applied"', () => {
    it('should render with correct styling', () => {
      render(<StatusBadge status="Applied" />);
      const badge = screen.getByTestId('status-badge');
      
      expect(badge).toHaveClass('bg-blue-100');
      expect(badge).toHaveClass('text-blue-700');
    });

    it('should display "Applied" text', () => {
      render(<StatusBadge status="Applied" />);
      expect(screen.getByText('Applied')).toBeInTheDocument();
    });
  });

  describe('Status "Interview"', () => {
    it('should render with correct styling', () => {
      render(<StatusBadge status="Interview" />);
      const badge = screen.getByTestId('status-badge');
      
      expect(badge).toHaveClass('bg-purple-100');
      expect(badge).toHaveClass('text-purple-700');
    });

    it('should display "Interview" text', () => {
      render(<StatusBadge status="Interview" />);
      expect(screen.getByText('Interview')).toBeInTheDocument();
    });
  });

  describe('Status "Offer"', () => {
    it('should render with correct styling', () => {
      render(<StatusBadge status="Offer" />);
      const badge = screen.getByTestId('status-badge');
      
      expect(badge).toHaveClass('bg-emerald-100');
      expect(badge).toHaveClass('text-emerald-700');
    });

    it('should display "Offer" text', () => {
      render(<StatusBadge status="Offer" />);
      expect(screen.getByText('Offer')).toBeInTheDocument();
    });
  });

  describe('Status "Rejected"', () => {
    it('should render with correct styling', () => {
      render(<StatusBadge status="Rejected" />);
      const badge = screen.getByTestId('status-badge');
      
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-700');
    });

    it('should display "Rejected" text', () => {
      render(<StatusBadge status="Rejected" />);
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  describe('Unknown Status', () => {
    it('should use default styling for unknown status', () => {
      render(<StatusBadge status="Unknown" />);
      const badge = screen.getByTestId('status-badge');
      
      expect(badge).toHaveClass('bg-slate-100');
      expect(badge).toHaveClass('text-slate-700');
    });

    it('should display the unknown status text', () => {
      render(<StatusBadge status="CustomStatus" />);
      expect(screen.getByText('CustomStatus')).toBeInTheDocument();
    });
  });

  describe('Styling Classes', () => {
    it('should always have base badge classes', () => {
      render(<StatusBadge status="Applied" />);
      const badge = screen.getByTestId('status-badge');
      
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('px-3');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-bold');
    });
  });

  describe('Accessibility', () => {
    it('should have test id for accessibility testing', () => {
      render(<StatusBadge status="Applied" />);
      expect(screen.getByTestId('status-badge')).toBeInTheDocument();
    });

    it('should not have interactive elements', () => {
      render(<StatusBadge status="Applied" />);
      const badge = screen.getByTestId('status-badge');
      
      // Should be a simple span, not a button or link
      expect(badge.tagName).toBe('SPAN');
      expect(badge).not.toHaveAttribute('onClick');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string status', () => {
      render(<StatusBadge status="" />);
      expect(screen.getByTestId('status-badge')).toBeInTheDocument();
      expect(screen.getByTestId('status-badge')).toHaveTextContent('');
    });

    it('should handle status with different casing', () => {
      render(<StatusBadge status="applied" />);
      const badge = screen.getByTestId('status-badge');
      
      // lowercase doesn't match 'Applied', so should get default styling
      expect(badge).toHaveClass('bg-slate-100');
    });

    it('should handle status with extra spaces', () => {
      render(<StatusBadge status="  Applied  " />);
      // Extra spaces mean it doesn't match the exact "Applied" case
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('bg-slate-100');
    });
  });

  describe('Multiple Instances', () => {
    it('should render multiple badges independently', () => {
      const { rerender } = render(
        <>
          <StatusBadge status="Applied" />
          <StatusBadge status="Interview" />
          <StatusBadge status="Offer" />
        </>
      );

      const badges = screen.getAllByTestId('status-badge');
      expect(badges).toHaveLength(3);
      expect(badges[0]).toHaveTextContent('Applied');
      expect(badges[1]).toHaveTextContent('Interview');
      expect(badges[2]).toHaveTextContent('Offer');
    });
  });
});
