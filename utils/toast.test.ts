import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toast } from 'react-toastify';
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  showWarningToast,
  showToast,
} from './toast';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Toast Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('showSuccessToast', () => {
    it('calls toast.success with correct message', () => {
      showSuccessToast('Operation successful');
      expect(toast.success).toHaveBeenCalledWith('Operation successful', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    });

    it('merges custom options with defaults', () => {
      showSuccessToast('Success', { autoClose: 3000 });
      expect(toast.success).toHaveBeenCalledWith('Success', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    });
  });

  describe('showErrorToast', () => {
    it('calls toast.error with correct message', () => {
      showErrorToast('Operation failed');
      expect(toast.error).toHaveBeenCalledWith('Operation failed', expect.any(Object));
    });

    it('merges custom options with defaults', () => {
      showErrorToast('Error', { position: 'bottom-right' });
      expect(toast.error).toHaveBeenCalledWith(
        'Error',
        expect.objectContaining({
          position: 'bottom-right',
        }),
      );
    });
  });

  describe('showInfoToast', () => {
    it('calls toast.info with correct message', () => {
      showInfoToast('Information message');
      expect(toast.info).toHaveBeenCalledWith('Information message', expect.any(Object));
    });

    it('merges custom options with defaults', () => {
      showInfoToast('Info', { hideProgressBar: false });
      expect(toast.info).toHaveBeenCalledWith(
        'Info',
        expect.objectContaining({
          hideProgressBar: false,
        }),
      );
    });
  });

  describe('showWarningToast', () => {
    it('calls toast.warn with correct message', () => {
      showWarningToast('Warning message');
      expect(toast.warn).toHaveBeenCalledWith('Warning message', expect.any(Object));
    });

    it('merges custom options with defaults', () => {
      showWarningToast('Warning', { autoClose: 10000 });
      expect(toast.warn).toHaveBeenCalledWith(
        'Warning',
        expect.objectContaining({
          autoClose: 10000,
        }),
      );
    });
  });

  describe('showToast', () => {
    it('calls showSuccessToast when type is success', () => {
      showToast('Success message', 'success');
      expect(toast.success).toHaveBeenCalled();
    });

    it('calls showErrorToast when type is error', () => {
      showToast('Error message', 'error');
      expect(toast.error).toHaveBeenCalled();
    });

    it('calls showInfoToast when type is info', () => {
      showToast('Info message', 'info');
      expect(toast.info).toHaveBeenCalled();
    });

    it('calls showWarningToast when type is warning', () => {
      showToast('Warning message', 'warning');
      expect(toast.warn).toHaveBeenCalled();
    });

    it('defaults to info for unknown type', () => {
      showToast('Message', 'unknown' as any);
      expect(toast.info).toHaveBeenCalled();
    });

    it('passes options to specific toast function', () => {
      showToast('Message', 'success', { autoClose: 2000 });
      expect(toast.success).toHaveBeenCalledWith(
        'Message',
        expect.objectContaining({
          autoClose: 2000,
        }),
      );
    });
  });
});
