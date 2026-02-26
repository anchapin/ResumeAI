import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StorageWarning from './StorageWarning';
import { useStorageQuota } from '../src/hooks/useStorageQuota';

// Mock the useStorageQuota hook
vi.mock('../src/hooks/useStorageQuota', () => ({
  useStorageQuota: vi.fn(),
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
    vi.mocked(useStorageQuota).mockReturnValue({
      stats: {
        usedBytes: 1000,
        totalBytes: 10000,
        usagePercent: 10,
        canStore: true,
      },
      isWarning: false,
      isCritical: false,
      refresh: vi.fn(),
    });

    render(<StorageWarning />);

    await waitFor(
      () => {
        expect(screen.queryByText(/Storage Critical/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Storage Warning/i)).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it('should display warning when storage exceeds 80%', async () => {
    vi.mocked(useStorageQuota).mockReturnValue({
      stats: {
        usedBytes: 8500,
        totalBytes: 10000,
        usagePercent: 85,
        canStore: true,
      },
      isWarning: true,
      isCritical: false,
      refresh: vi.fn(),
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.getByText(/Storage Warning/i)).toBeInTheDocument();
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });
  });

  it('should display critical warning when storage exceeds 95%', async () => {
    vi.mocked(useStorageQuota).mockReturnValue({
      stats: {
        usedBytes: 9600,
        totalBytes: 10000,
        usagePercent: 96,
        canStore: false,
      },
      isWarning: true,
      isCritical: true,
      refresh: vi.fn(),
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.getByText(/Storage Critical/i)).toBeInTheDocument();
      expect(screen.getByText(/96%/)).toBeInTheDocument();
    });
  });

  it('should have refresh button', async () => {
    const mockRefresh = vi.fn();
    vi.mocked(useStorageQuota).mockReturnValue({
      stats: {
        usedBytes: 8500,
        totalBytes: 10000,
        usagePercent: 85,
        canStore: true,
      },
      isWarning: true,
      isCritical: false,
      refresh: mockRefresh,
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('should have manage storage button when critical', async () => {
    vi.mocked(useStorageQuota).mockReturnValue({
      stats: {
        usedBytes: 9600,
        totalBytes: 10000,
        usagePercent: 96,
        canStore: false,
      },
      isWarning: true,
      isCritical: true,
      refresh: vi.fn(),
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.getByText('Manage Storage')).toBeInTheDocument();
    });
  });
});
