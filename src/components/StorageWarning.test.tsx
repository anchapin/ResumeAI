import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StorageWarning } from './StorageWarning';
import * as storageLib from '../lib/storage';

// Mock the storage library
vi.mock('../lib/storage', () => ({
  getStorageQuota: vi.fn(),
  checkStorageWarning: vi.fn(),
  StorageManager: {
    clear: vi.fn(),
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn(),
    getItemSize: vi.fn(),
    getUsedSize: vi.fn(),
    getStats: vi.fn()
  }
}));

// Mock toast
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
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
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 1000,
      percentUsed: 10
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.queryByText(/Storage Critical/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Storage Getting Full/i)).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should display warning when storage exceeds 80%', async () => {
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 8500,
      percentUsed: 85
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.getByText(/Storage Getting Full/i)).toBeInTheDocument();
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });
  });

  it('should display critical warning when storage exceeds 95%', async () => {
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 9600,
      percentUsed: 96
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.getByText(/Storage Critical/i)).toBeInTheDocument();
      expect(screen.getByText(/96%/)).toBeInTheDocument();
    });
  });

  it('should have dismiss button', async () => {
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 8500,
      percentUsed: 85
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });
  });

  it('should have clean storage button', async () => {
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 8500,
      percentUsed: 85
    });

    render(<StorageWarning />);

    await waitFor(() => {
      expect(screen.getByText('Clean Storage')).toBeInTheDocument();
    });
  });
});
