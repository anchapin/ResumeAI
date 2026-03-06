import { useState, useEffect, useCallback } from 'react';
import { getHeaders } from '../utils/api-client';

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

export const useVariants = () => {
  const [variants, setVariants] = useState<VariantMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/variants`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const result: VariantsResponse = await response.json();
      setVariants(result.variants);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect to backend';
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
  }, []);

  // Fetch variants on mount
  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  return { variants, loading, error, refetch: fetchVariants };
};
