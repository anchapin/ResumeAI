import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsSkeleton from './SettingsSkeleton';

describe('SettingsSkeleton Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<SettingsSkeleton />);
    expect(container).toBeInTheDocument();
  });

  it('renders with correct structure', () => {
    const { container } = render(<SettingsSkeleton />);

    // Check for skeleton elements
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has loading states with proper ARIA attributes', () => {
    render(<SettingsSkeleton />);
    const skeletons = screen.getAllByRole('status');
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveAttribute('aria-label', 'Loading');
    });
  });

  it('renders list items with skeleton placeholders', () => {
    render(<SettingsSkeleton />);
    const skeletons = screen.getAllByRole('status');
    // Should have multiple skeleton lines for settings items
    expect(skeletons.length).toBeGreaterThanOrEqual(10);
  });
});
