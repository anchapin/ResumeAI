import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkipNavigation from './SkipNavigation';

describe('SkipNavigation Component', () => {
  it('renders skip to main content link', () => {
    render(<SkipNavigation />);
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
  });

  it('renders skip to navigation link', () => {
    render(<SkipNavigation />);
    expect(screen.getByText('Skip to navigation')).toBeInTheDocument();
  });

  it('has correct href for main content link', () => {
    render(<SkipNavigation />);
    const link = screen.getByText('Skip to main content');
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('has correct href for navigation link', () => {
    render(<SkipNavigation />);
    const link = screen.getByText('Skip to navigation');
    expect(link).toHaveAttribute('href', '#main-nav');
  });

  it('has accessibility attributes', () => {
    render(<SkipNavigation />);
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link).toHaveAttribute('tabindex', '0');
    });
  });
});
