import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastContainer } from 'react-toastify';
import StorageWarning from './StorageWarning';
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

describe('StorageWarning Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should not display when storage quota is below 80%', async () => {
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 1000,
      percentUsed: 10
    });

    render(
      <>
        <StorageWarning />
        <ToastContainer />
      </>
    );

    // Component should not be visible
    await waitFor(() => {
      expect(screen.queryByText(/Storage Getting Full/i)).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should display warning when storage quota exceeds 80%', async () => {
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 8500,
      percentUsed: 85
    });

    render(
      <>
        <StorageWarning />
        <ToastContainer />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText(/Storage Getting Full/i)).toBeInTheDocument();
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });
  });

  it('should display critical warning when storage quota exceeds 95%', async () => {
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 9600,
      percentUsed: 96
    });

    render(
      <>
        <StorageWarning />
        <ToastContainer />
      </>
    );

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

    render(
      <>
        <StorageWarning />
        <ToastContainer />
      </>
    );

    await waitFor(() => {
      const dismissButton = screen.getByText('Dismiss');
      expect(dismissButton).toBeInTheDocument();
    });
  });

  it('should have clean storage button', async () => {
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 8500,
      percentUsed: 85
    });

    render(
      <>
        <StorageWarning />
        <ToastContainer />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText('Clean Storage')).toBeInTheDocument();
    });
  });

  it('should have clear all button', async () => {
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 8500,
      percentUsed: 85
    });

    render(
      <>
        <StorageWarning />
        <ToastContainer />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
  });

  it('should call onStorageCleaned callback when storage is cleaned', async () => {
    const mockCallback = vi.fn();
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 8500,
      percentUsed: 85
    });

    const { rerender } = render(
      <>
        <StorageWarning onStorageCleaned={mockCallback} />
        <ToastContainer />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText('Clean Storage')).toBeInTheDocument();
    });

    // Set up localStorage items to clean
    localStorage.setItem('resumeai_old_data', 'some data');
    
    const cleanButton = screen.getByText('Clean Storage');
    fireEvent.click(cleanButton);

    // After cleaning, quota should be re-checked
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 2000,
      percentUsed: 20
    });

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should check storage quota periodically', async () => {
    vi.mocked(storageLib.getStorageQuota).mockResolvedValue({
      estimatedQuota: 10000,
      estimatedUsage: 5000,
      percentUsed: 50
    });

    const { unmount } = render(
      <>
        <StorageWarning />
        <ToastContainer />
      </>
    );

    // Wait for initial check
    await waitFor(() => {
      expect(storageLib.getStorageQuota).toHaveBeenCalledTimes(1);
    });

    // Fast-forward time and check periodic update
    vi.useFakeTimers();
    vi.advanceTimersByTime(31000); // 31 seconds

    vi.useRealTimers();
    unmount();
  });
});
