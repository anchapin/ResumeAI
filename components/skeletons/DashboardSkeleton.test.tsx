import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardSkeleton from './DashboardSkeleton';

describe('DashboardSkeleton Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container).toBeInTheDocument();
  });

  it('renders with correct structure', () => {
    const { container } = render(<DashboardSkeleton />);

    // Check for header
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();

    // Check for skeleton elements
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has loading states with proper ARIA attributes', () => {
    render(<DashboardSkeleton />);
    const skeletons = screen.getAllByRole('status');
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveAttribute('aria-label', 'Loading');
    });
  });

  it('renders multiple skeleton components for content layout', () => {
    render(<DashboardSkeleton />);
    const skeletons = screen.getAllByRole('status');
    // Dashboard should have multiple skeletons for various UI elements
    expect(skeletons.length).toBeGreaterThanOrEqual(10);
  });
});
