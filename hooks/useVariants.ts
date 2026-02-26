import { useState, useEffect } from 'react';

// Define the types for variants
interface VariantMetadata {
  name: string;
  display_name: string;
  description: string;
  format: string;
  output_formats: string[];
}

export interface VariantsResponse {
  variants: VariantMetadata[];
}

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const API_KEY = import.meta.env.RESUMEAI_API_KEY || '';

export const useVariants = () => {
  const [variants, setVariants] = useState<VariantMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVariants = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/v1/variants`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(API_KEY && { 'X-API-KEY': API_KEY }),
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const result: VariantsResponse = await response.json();
      setVariants(result.variants);
    } catch (err: any) {
      const message = err.message || 'Failed to connect to backend';
      setError(message);
      // Fallback to default variant if API fails
      setVariants([
        {
          name: 'base',
          display_name: 'Base Template',
          description: 'A clean, professional resume template',
          format: 'json',
          output_formats: ['pdf', 'html'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch variants on mount
  useEffect(() => {
    fetchVariants();
  }, []);

  return { variants, loading, error, refetch: fetchVariants };
};
