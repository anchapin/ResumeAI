import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkspaceSkeleton from './WorkspaceSkeleton';

describe('WorkspaceSkeleton Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<WorkspaceSkeleton />);
    expect(container).toBeInTheDocument();
  });

  it('renders with correct structure', () => {
    const { container } = render(<WorkspaceSkeleton />);

    // Check for header
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();

    // Check for skeleton elements
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has loading states with proper ARIA attributes', () => {
    render(<WorkspaceSkeleton />);
    const skeletons = screen.getAllByRole('status');
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveAttribute('aria-label', 'Loading');
    });
  });

  it('renders multi-panel layout with skeleton content', () => {
    render(<WorkspaceSkeleton />);
    const skeletons = screen.getAllByRole('status');
    // Should have skeletons for multiple content areas
    expect(skeletons.length).toBeGreaterThanOrEqual(15);
  });
});
