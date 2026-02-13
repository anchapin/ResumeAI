import { useState } from 'react';
import { ResumeData, SimpleResumeData } from '../types';

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const API_KEY = import.meta.env.RESUMEAI_API_KEY || '';

// Convert SimpleResumeData to ResumeData (JSON Resume format)
function convertToResumeData(data: SimpleResumeData): ResumeData {
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

export const useGeneratePackage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<TailoredResumeResponse | null>(null);

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

    return { generatePackage, downloadPDF, loading, error, data };
};