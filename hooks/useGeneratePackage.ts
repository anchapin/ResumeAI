import { useState } from 'react';
import { ResumeData } from '../types';

export interface GeneratePackageRequest {
    resume: ResumeData;
    job_description: string;
    company_name: string;
    variant: string;
    include_cover_letter: boolean;
    use_ai_judge: boolean;
}

export interface PackageResponse {
    resume_markdown: string;
    cover_letter_markdown?: string;
    analysis?: string;
}

export const useGeneratePackage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<PackageResponse | null>(null);

    const generatePackage = async (requestBody: GeneratePackageRequest) => {
        setLoading(true);
        setError(null);
        try {
            // Using 127.0.0.1 instead of localhost avoids IPv6 resolution issues on some systems
            const response = await fetch('http://127.0.0.1:8000/generate/package', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error: ${response.status}`);
            }

            const result: PackageResponse = await response.json();
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

    return { generatePackage, loading, error, data };
};