import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StorageWarning from './StorageWarning';
import * as hooks from '../hooks/useStorageQuota';

// Mock the hook
vi.mock('../hooks/useStorageQuota', () => ({
  useStorageQuota: vi.fn()
}));

describe('StorageWarning Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should not display when storage is below 80%', async () => {
    vi.mocked(hooks.useStorageQuota).mockReturnValue({
      stats: { usedBytes: 1000, totalBytes: 10000, usagePercent: 10 },
      isWarning: false,
      isCritical: false,
      refresh: vi.fn(),
      isLoading: false,
      error: null,
      clearOldData: vi.fn(),
      clearAllStorage: vi.fn(),
      formatBytes: (b: number) => `${b}B`
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.queryByText(/Storage Warning/i)).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should display warning when storage exceeds 80%', async () => {
    vi.mocked(hooks.useStorageQuota).mockReturnValue({
      stats: { usedBytes: 8500, totalBytes: 10000, usagePercent: 85 },
      isWarning: true,
      isCritical: false,
      refresh: vi.fn(),
      isLoading: false,
      error: null,
      clearOldData: vi.fn(),
      clearAllStorage: vi.fn(),
      formatBytes: (b: number) => `${b}B`
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.getByText(/Storage Warning/i)).toBeInTheDocument();
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });
  });

  it('should display critical warning when storage exceeds 95%', async () => {
    vi.mocked(hooks.useStorageQuota).mockReturnValue({
      stats: { usedBytes: 9600, totalBytes: 10000, usagePercent: 96 },
      isWarning: true,
      isCritical: true,
      refresh: vi.fn(),
      isLoading: false,
      error: null,
      clearOldData: vi.fn(),
      clearAllStorage: vi.fn(),
      formatBytes: (b: number) => `${b}B`
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.getByText(/Storage Critical/i)).toBeInTheDocument();
      expect(screen.getByText(/96%/)).toBeInTheDocument();
    });
  });

  it('should have refresh button', async () => {
    const mockRefresh = vi.fn();
    vi.mocked(hooks.useStorageQuota).mockReturnValue({
      stats: { usedBytes: 8500, totalBytes: 10000, usagePercent: 85 },
      isWarning: true,
      isCritical: false,
      refresh: mockRefresh,
      isLoading: false,
      error: null,
      clearOldData: vi.fn(),
      clearAllStorage: vi.fn(),
      formatBytes: (b: number) => `${b}B`
    });

    render(<StorageWarning />);

    await waitFor(() => {
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeInTheDocument();
    });
  });

  it('should show manage storage button in critical state', async () => {
    vi.mocked(hooks.useStorageQuota).mockReturnValue({
      stats: { usedBytes: 9600, totalBytes: 10000, usagePercent: 96 },
      isWarning: true,
      isCritical: true,
      refresh: vi.fn(),
      isLoading: false,
      error: null,
      clearOldData: vi.fn(),
      clearAllStorage: vi.fn(),
      formatBytes: (b: number) => `${b}B`
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.getByText('Manage Storage')).toBeInTheDocument();
    });
  });
});
