import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Skeleton from './Skeleton';

describe('Skeleton Component', () => {
  it('renders with default props', () => {
    render(<Skeleton />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('bg-slate-200');
  });

  it('renders with custom className', () => {
    render(<Skeleton className="custom-class" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveClass('custom-class');
  });

  it('renders with custom variant', () => {
    render(<Skeleton variant="rectangular" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('rounded-none');
  });

  it('renders with custom width', () => {
    render(<Skeleton width="100px" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveStyle({ width: '100px' });
  });

  it('renders with custom height', () => {
    render(<Skeleton height="50px" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveStyle({ height: '50px' });
  });

  it('renders with shimmer animation', () => {
    render(<Skeleton animation="wave" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveClass('animate-shimmer');
  });

  it('renders with no animation', () => {
    render(<Skeleton animation="none" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).not.toHaveClass('animate-pulse');
    expect(skeleton).not.toHaveClass('animate-shimmer');
  });

  it('renders with circular variant', () => {
    render(<Skeleton variant="circular" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveClass('rounded-full');
  });

  it('renders with rounded variant', () => {
    render(<Skeleton variant="rounded" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveClass('rounded-lg');
  });

  it('renders text variant with default rounding', () => {
    render(<Skeleton variant="text" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveClass('rounded');
  });

  it('has proper ARIA attributes', () => {
    render(<Skeleton />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders with data-testid attribute', () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector('[data-testid="skeleton"]')).toBeInTheDocument();
  });
});
