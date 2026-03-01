import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EditorSkeleton from './EditorSkeleton';

describe('EditorSkeleton Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<EditorSkeleton />);
    expect(container).toBeInTheDocument();
  });

  it('renders with correct structure', () => {
    const { container } = render(<EditorSkeleton />);

    // Check for header
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();

    // Check for skeleton elements
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has loading states with proper ARIA attributes', () => {
    render(<EditorSkeleton />);
    const skeletons = screen.getAllByRole('status');
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveAttribute('aria-label', 'Loading');
    });
  });

  it('renders three-panel layout with skeletons', () => {
    const { container } = render(<EditorSkeleton />);

    // Check for flex layout divs for the three panels
    const flexDivs = container.querySelectorAll('div.flex-1, div.w-1\\/3, div.w-1\\/4');
    expect(flexDivs.length).toBeGreaterThan(0);

    // Check for multiple skeleton components
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThanOrEqual(15);
  });
});
