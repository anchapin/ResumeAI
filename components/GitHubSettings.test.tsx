import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GitHubSettings from './GitHubSettings';

describe('GitHubSettings Component', () => {
  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    (window as any).location = {
      origin: 'http://localhost:3000',
      pathname: '/settings',
      search: '',
      href: 'http://localhost:3000/settings',
    };

    // Mock localStorage
    (window as any).localStorage = {
      getItem: vi.fn(() => 'test_token'),
      setItem: vi.fn(),
    };

    // Mock fetch
    (global as any).fetch = vi.fn();

    vi.clearAllMocks();
  });

  it('renders component title', () => {
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

  it('shows connected state when GitHub is connected', async () => {
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connected: true,
        github_username: 'testuser',
        github_user_id: '123456',
        connected_at: '2024-01-15T00:00:00Z',
      }),
    });

    render(<GitHubSettings />);

    await waitFor(() => {
      expect(screen.getByText('Connected as @testuser')).toBeInTheDocument();
    });
  });

  it('shows not connected state when GitHub is not connected', async () => {
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    });

    render(<GitHubSettings />);

    await waitFor(() => {
      expect(screen.getByText('Connect your GitHub account')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    (global as any).fetch.mockImplementation(() => new Promise(() => {}));

    render(<GitHubSettings />);

    expect(screen.getByText('progress_activity')).toBeInTheDocument();
  });

  it('displays benefits list when not connected', async () => {
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    });

    render(<GitHubSettings />);

    await waitFor(() => {
      expect(screen.getByText('What you can do with GitHub connected:')).toBeInTheDocument();
    });
  });
});
