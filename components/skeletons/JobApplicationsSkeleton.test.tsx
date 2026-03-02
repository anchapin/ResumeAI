import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import JobApplicationsSkeleton from './JobApplicationsSkeleton';

describe('JobApplicationsSkeleton Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<JobApplicationsSkeleton />);
    expect(container).toBeInTheDocument();
  });

  it('renders with correct structure', () => {
    const { container } = render(<JobApplicationsSkeleton />);

    // Check for header
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();

    // Check for skeleton elements
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has loading states with proper ARIA attributes', () => {
    render(<JobApplicationsSkeleton />);
    const skeletons = screen.getAllByRole('status');
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveAttribute('aria-label', 'Loading');
    });
  });

  it('renders table-like layout with multiple skeleton rows', () => {
    render(<JobApplicationsSkeleton />);
    const skeletons = screen.getAllByRole('status');
    // Should have skeletons for header, filters, stats, and table rows
    expect(skeletons.length).toBeGreaterThanOrEqual(20);
  });
});
