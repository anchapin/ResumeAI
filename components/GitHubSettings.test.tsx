import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GitHubSettings from './GitHubSettings';

describe('GitHubSettings Component', () => {
  beforeEach(() => {
    // Mock window.location.href for redirect
    (window as any).location = {
      origin: 'http://localhost:3000',
      pathname: '/settings',
      search: '',
      href: 'http://localhost:3000/settings',
    };

    // Mock localStorage
    (window as any).localStorage = {
      getItem: vi.fn(() => null),
    };

    // Mock fetch
    (global as any).fetch = vi.fn();

    vi.clearAllMocks();
  });

  it('renders the component title', () => {
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    });

    render(<GitHubSettings />);
    expect(screen.getByText('GitHub Connection')).toBeInTheDocument();
  });

  it('renders description about importing projects', () => {
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    });

    render(<GitHubSettings />);
    expect(screen.getByText(/Connect your GitHub account to import/)).toBeInTheDocument();
  });
});
