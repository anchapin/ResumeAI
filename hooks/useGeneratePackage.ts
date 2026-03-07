import { getHeaders } from '../utils/api-client';
import { useState, useCallback } from 'react';
import { ResumeData, SimpleResumeData } from '../types';

// Get API URL from environment variable
const API_URL =
  (typeof import.meta !== 'undefined' &&
    typeof import.meta.env !== 'undefined' &&
    import.meta.env.VITE_API_URL) ||
  'http://localhost:8000';

// Local storage keys
const RESUME_STORAGE_KEY = 'resumeai_resume_data';
const DRAFT_STORAGE_KEY = 'resumeai_draft';

// Convert SimpleResumeData to ResumeData (JSON Resume format)
export function convertToResumeData(data: SimpleResumeData): ResumeData {
  return {
    basics: {
      name: data.name || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      summary: data.summary || undefined,
      label: data.role || undefined,
    },
    location: {
      city: data.location || undefined,
    },
    work: (data.experience || []).map((exp) => ({
      company: exp.company || undefined,
      position: exp.role || undefined,
      startDate: exp.startDate || undefined,
      endDate: exp.endDate || undefined,
      current: exp.current,
      summary: exp.description || undefined,
      highlights: exp.tags || [],
    })),
    education: (data.education || []).map((edu) => ({
      institution: edu.institution || undefined,
      area: edu.area || undefined,
      studyType: edu.studyType || undefined,
      startDate: edu.startDate || undefined,
      endDate: edu.endDate || undefined,
      courses: edu.courses || [],
    })),
    skills: (data.skills || []).map((skill) => ({
      name: skill || undefined,
    })),
    projects: (data.projects || []).map((proj) => ({
      name: proj.name || undefined,
      description: proj.description || undefined,
      url: proj.url || undefined,
      startDate: proj.startDate || undefined,
      endDate: proj.endDate || undefined,
      highlights: proj.highlights || [],
      roles: proj.roles || [],
    })),
    profiles: [],
    volunteer: [],
    awards: [],
    certificates: [],
    publications: [],
    languages: [],
    interests: [],
    references: [],
  };
}

export interface TailorRequest {
  resume_data: ResumeData;
  job_description: string;
  company_name?: string;
  job_title?: string;
}

export interface TailoredResumeResponse {
  resume_data: ResumeData;
  keywords: string[];
  suggestions?: string[];
  markdown?: string;
}

export interface CoverLetterData {
  header: string;
  introduction: string;
  body: string;
  closing: string;
  full_text: string;
  metadata: Record<string, unknown>;
}

export interface RenderPDFRequest {
  resume_data: ResumeData;
  variant: string;
}

// Storage helper functions
const saveToLocalStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

const loadFromLocalStorage = <T>(key: string): T | null => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

const removeFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
};

export const useGeneratePackage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TailoredResumeResponse | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetterData | null>(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load saved resume data on mount
  // REMOVED: This was causing stale data to be displayed in the Workspace
  /*
    useEffect(() => {
        const savedResume = loadFromLocalStorage<ResumeData>(RESUME_STORAGE_KEY);
        if (savedResume) {
            setData({
                resume_data: savedResume,
                keywords: [],
                suggestions: {}
            });
        }
    }, []);
    */

  /**
   * Save resume data to local storage
   */
  const saveResume = useCallback(async (resumeData: ResumeData): Promise<void> => {
    setIsSaving(true);
    try {
      saveToLocalStorage(RESUME_STORAGE_KEY, resumeData);
      setLastSaved(new Date());
      removeFromLocalStorage(DRAFT_STORAGE_KEY);
    } catch (err) {
      setError('Failed to save resume');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Save draft to local storage
   */
  const saveDraft = useCallback((resumeData: ResumeData): void => {
    saveToLocalStorage(DRAFT_STORAGE_KEY, {
      data: resumeData,
      timestamp: new Date().toISOString(),
    });
  }, []);

  /**
   * Load draft from local storage
   */
  const loadDraft = useCallback((): ResumeData | null => {
    const draft = loadFromLocalStorage<{ data: ResumeData; timestamp: string }>(DRAFT_STORAGE_KEY);
    return draft?.data || null;
  }, []);

  /**
   * Clear all saved data
   */
  const clearSavedData = useCallback((): void => {
    removeFromLocalStorage(RESUME_STORAGE_KEY);
    removeFromLocalStorage(DRAFT_STORAGE_KEY);
    setData(null);
    setLastSaved(null);
  }, []);

  /**
   * Tailor a resume to a job description using the production API
   */
  const generatePackage = async (requestBody: TailorRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/tailor`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const result: TailoredResumeResponse = await response.json();
      setData(result);

      // Auto-save the tailored resume
      await saveResume(result.resume_data);

      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect to backend';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate and download a PDF resume using the production API
   */
  const downloadPDF = async (requestBody: RenderPDFRequest) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/render/pdf`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${requestBody.variant}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to download PDF';
      setError(message);
      throw err;
    }
  };

  /**
   * Render a markdown preview of the resume using the production API
   */
  const renderMarkdown = async (requestBody: RenderPDFRequest): Promise<string> => {
    try {
      const response = await fetch(`${API_URL}/api/v1/render/markdown`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const result = await response.json();
      return result.markdown;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to render markdown';
      throw new Error(message);
    }
  };

  /**
   * Generate a cover letter using the production API
   */
  const generateCoverLetterRequest = async (params: {
    resume_data: ResumeData;
    job_description: string;
    company_name: string;
    job_title: string;
    tone?: string;
  }): Promise<CoverLetterData> => {
    setCoverLetterLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/cover-letter`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          resume_data: params.resume_data,
          job_description: params.job_description,
          company_name: params.company_name,
          job_title: params.job_title,
          tone: params.tone || 'professional',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const result: CoverLetterData = await response.json();
      setCoverLetter(result);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate cover letter';
      setError(message);
      throw err;
    } finally {
      setCoverLetterLoading(false);
    }
  };

  /**
   * Test connection to backend API
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/v1/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (err) {
      console.error('Health check failed:', err);
      return false;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generatePackage,
    generateCoverLetterRequest,
    downloadPDF,
    renderMarkdown,
    saveResume,
    saveDraft,
    loadDraft,
    clearSavedData,
    testConnection,
    clearError,
    loading,
    error,
    data,
    coverLetter,
    coverLetterLoading,
    isSaving,
    lastSaved,
  };
};

// Export storage utilities for direct access if needed
export { saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage };
