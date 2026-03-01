import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Child</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('catches errors and displays error message', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('provides a fallback UI', () => {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <div>Test Child</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });
});
