import { useState, useCallback, useEffect } from 'react';
import { ResumeData, SimpleResumeData } from '../types';

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const API_KEY = import.meta.env.RESUMEAI_API_KEY || '';

// Local storage keys
const RESUME_STORAGE_KEY = 'resumeai_resume_data';
const DRAFT_STORAGE_KEY = 'resumeai_draft';

// Convert SimpleResumeData to ResumeData (JSON Resume format)
export function convertToResumeData(data: SimpleResumeData): ResumeData {
    return {
        basics: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            url: undefined,
            summary: undefined,
            label: data.role
        },
        location: {
            city: data.location,
            region: undefined,
            countryCode: undefined
        },
        work: data.experience.map((exp) => ({
            company: exp.company,
            position: exp.role,
            startDate: exp.startDate,
            endDate: exp.endDate,
            summary: exp.description,
            highlights: exp.tags
        })),
        education: [],
        skills: []
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
    suggestions?: Record<string, unknown>;
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
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Load saved resume data on mount
    useEffect(() => {
        const savedResume = loadFromLocalStorage<ResumeData>(RESUME_STORAGE_KEY);
        if (savedResume) {
            setData({
                resume_data: savedResume,
                keywords: [],
                suggestions: {} as Record<string, unknown>
            });
        }
    }, []);

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
            timestamp: new Date().toISOString()
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
            const response = await fetch(`${API_URL}/v1/tailor`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(API_KEY && { 'X-API-KEY': API_KEY }),
                },
                body: JSON.stringify(requestBody)
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
        } catch (err: any) {
            const message = err.message || "Failed to connect to backend";
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
            const response = await fetch(`${API_URL}/v1/render/pdf`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(API_KEY && { 'X-API-KEY': API_KEY }),
                },
                body: JSON.stringify(requestBody)
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
        } catch (err: any) {
            const message = err.message || "Failed to download PDF";
            setError(message);
            throw err;
        }
    };

    /**
     * Test connection to backend API
     */
    const testConnection = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            return response.ok;
        } catch {
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
        downloadPDF,
        saveResume,
        saveDraft,
        loadDraft,
        clearSavedData,
        testConnection,
        clearError,
        loading,
        error,
        data,
        isSaving,
        lastSaved
    };
};

// Export storage utilities for direct access if needed
export { saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage };
