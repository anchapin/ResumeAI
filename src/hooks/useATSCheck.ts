/**
 * useATSCheck Hook
 * 
 * Hook for checking ATS compatibility of resumes.
 */

import { useCallback, useState } from 'react';


export type IssueSeverity = 'critical' | 'warning' | 'info';

export type IssueType = 
  | 'images'
  | 'tables'
  | 'text_in_header_footer'
  | 'special_characters'
  | 'complex_formatting'
  | 'custom_columns'
  | 'two_column_layout'
  | 'footnotes'
  | 'textboxes'
  | 'unsupported_fonts';


export interface ATSIssue {
  type: IssueType;
  severity: IssueSeverity;
  element: string;
  description: string;
  page?: number;
  fix: string;
}


export interface ATSCheckResult {
  file_type: string;
  ats_score: number;
  is_parseable: boolean;
  word_count: number;
  issues: ATSIssue[];
  parsed_text: string;
  calculation_time_ms: number;
}


export interface UseATSCheckReturn {
  result: ATSCheckResult | null;
  isLoading: boolean;
  error: string | null;
  checkResume: (file: File) => Promise<ATSCheckResult | null>;
  clearResult: () => void;
}


const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';


export function useATSCheck(): UseATSCheckReturn {
  const [result, setResult] = useState<ATSCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkResume = useCallback(async (file: File): Promise<ATSCheckResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_URL}/api/ats/check`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          // Don't set Content-Type for FormData - browser sets it with boundary
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data: ATSCheckResult = await response.json();
      
      // Normalize severity types to uppercase for component compatibility
      const normalizedData: ATSCheckResult = {
        ...data,
        issues: data.issues.map((issue) => ({
          ...issue,
          severity: (issue.severity?.toLowerCase() as 'critical' | 'warning' | 'info') || 'info',
        })),
      };
      
      setResult(normalizedData);
      return normalizedData;
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again with a smaller file.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to check ATS compatibility');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    isLoading,
    error,
    checkResume,
    clearResult,
  };
}

export default useATSCheck;
