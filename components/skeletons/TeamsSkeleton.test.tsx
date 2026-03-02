import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamsSkeleton from './TeamsSkeleton';

describe('TeamsSkeleton Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<TeamsSkeleton />);
    expect(container).toBeInTheDocument();
  });

  it('renders with correct structure', () => {
    const { container } = render(<TeamsSkeleton />);

    // Check for skeleton elements
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has loading states with proper ARIA attributes', () => {
    render(<TeamsSkeleton />);
    const skeletons = screen.getAllByRole('status');
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveAttribute('aria-label', 'Loading');
    });
  });

  it('renders grid layout with multiple skeleton cards', () => {
    render(<TeamsSkeleton />);
    const skeletons = screen.getAllByRole('status');
    // Should have skeletons for multiple team cards
    expect(skeletons.length).toBeGreaterThanOrEqual(12);
  });
});
