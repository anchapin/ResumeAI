import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useATSCheck } from '../../src/hooks/useATSCheck';

// Mock fetch globally
global.fetch = vi.fn();

describe('useATSCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockATSSuccessResponse = {
    file_type: 'pdf',
    ats_score: 85,
    is_parseable: true,
    word_count: 450,
    issues: [
      {
        type: 'two_column_layout',
        severity: 'CRITICAL',
        element: 'two_column_layout',
        description: 'Two-column layout may cause parsing issues',
        fix: 'Convert to single-column format'
      }
    ],
    parsed_text: 'John Doe - Software Engineer...',
    calculation_time_ms: 150
  };

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useATSCheck());
    
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set loading state when checking ATS', async () => {
    vi.mocked(fetch).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => mockATSSuccessResponse
      } as Response), 100))
    );

    const { result } = renderHook(() => useATSCheck());
    
    const mockFile = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
    
    act(() => {
      result.current.checkResume(mockFile);
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should return ATS result on successful check', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockATSSuccessResponse
    } as Response);

    const { result } = renderHook(() => useATSCheck());
    
    const mockFile = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
    
    await act(async () => {
      await result.current.checkResume(mockFile);
    });

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
      expect(result.current.result?.ats_score).toBe(85);
      expect(result.current.result?.file_type).toBe('pdf');
      expect(result.current.result?.is_parseable).toBe(true);
    });
  });

  it('should normalize issue severity types to uppercase', async () => {
    const responseWithLowercase = {
      ...mockATSSuccessResponse,
      issues: [
        {
          type: 'two_column_layout',
          severity: 'critical', // lowercase - should be normalized to CRITICAL
          element: 'two_column_layout',
          description: 'Test issue',
          fix: 'Test fix'
        }
      ]
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => responseWithLowercase
    } as Response);

    const { result } = renderHook(() => useATSCheck());
    
    const mockFile = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
    
    await act(async () => {
      await result.current.checkResume(mockFile);
    });

    await waitFor(() => {
      expect(result.current.result?.issues[0].severity).toBe('CRITICAL');
    });
  });

  it('should handle API errors correctly', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Invalid file format' })
    } as Response);

    const { result } = renderHook(() => useATSCheck());
    
    const mockFile = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
    
    await act(async () => {
      await result.current.checkResume(mockFile);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Invalid file format');
      expect(result.current.result).toBeNull();
    });
  });

  it('should handle network errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useATSCheck());
    
    const mockFile = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
    
    await act(async () => {
      await result.current.checkResume(mockFile);
    });

    await waitFor(() => {
      expect(result.current.error).toContain('Network error');
    });
  });

  it('should reset error state when retrying', async () => {
    // First call fails
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockATSSuccessResponse
      } as Response);

    const { result } = renderHook(() => useATSCheck());
    
    const mockFile = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
    
    // First attempt fails
    await act(async () => {
      await result.current.checkResume(mockFile);
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Second attempt succeeds
    await act(async () => {
      await result.current.checkResume(mockFile);
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.result).not.toBeNull();
    });
  });
});
