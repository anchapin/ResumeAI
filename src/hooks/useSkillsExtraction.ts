/**
 * useSkillsExtraction Hook
 * 
 * Hook for extracting skills from job description text.
 * 
 * @param options - Configuration options
 * @returns Extraction state and actions
 * 
 * @example
 * const {
 *   skills,
 *   byCategory,
 *   isLoading,
 *   extract,
 * } = useSkillsExtraction();
 * 
 * await extract(jdText);
 */

import { useCallback, useState } from 'react';
import { extractSkills } from '../../utils/skills-api';
import type {
  ExtractedSkill,
  SkillsExtractRequest,
  UseSkillsExtractionReturn,
} from '../../types/skills';

export function useSkillsExtraction(): UseSkillsExtractionReturn {
  const [skills, setSkills] = useState<ExtractedSkill[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, ExtractedSkill[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Extract skills from text.
   */
  const extract = useCallback(async (text: string) => {
    if (!text || text.length < 10) {
      setSkills([]);
      setByCategory({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const request: SkillsExtractRequest = {
        text,
        include_metadata: true,
      };

      const response = await extractSkills(request);

      setSkills(response.skills);
      setByCategory(response.by_category);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to extract skills');
      console.error('Skills extraction error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear extraction results.
   */
  const clear = useCallback(() => {
    setSkills([]);
    setByCategory({});
    setError(null);
  }, []);

  return {
    skills,
    byCategory,
    isLoading,
    error,
    extract,
    clear,
  };
}

export default useSkillsExtraction;
