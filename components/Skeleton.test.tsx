import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Skeleton from './Skeleton';

describe('Skeleton Component', () => {
  it('renders with default props', () => {
    render(<Skeleton />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
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
  });

  it('renders with custom width', () => {
    render(<Skeleton width="100px" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders with custom height', () => {
    render(<Skeleton height="50px" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders with custom animation', () => {
    render(<Skeleton animation="wave" />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
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
});
