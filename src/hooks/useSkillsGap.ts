/**
 * useSkillsGap Hook
 * 
 * Hook for analyzing skills gap between job description and resume.
 * 
 * @returns Gap analysis state and actions
 * 
 * @example
 * const {
 *   gapScore,
 *   matchedSkills,
 *   missingCritical,
 *   analyze,
 * } = useSkillsGap();
 * 
 * await analyze(jdText, resumeText);
 */

import { useCallback, useState } from 'react';
import { getSkillsGap } from '../../utils/skills-api';
import type {
  MissingSkill,
  SkillMatch,
  UseSkillsGapReturn,
} from '../../types/skills';

export function useSkillsGap(): UseSkillsGapReturn {
  const [gapScore, setGapScore] = useState(0);
  const [matchedSkills, setMatchedSkills] = useState<SkillMatch[]>([]);
  const [missingCritical, setMissingCritical] = useState<MissingSkill[]>([]);
  const [missingPreferred, setMissingPreferred] = useState<MissingSkill[]>([]);
  const [recommendations, setRecommendations] = useState<Array<{
    skill: string;
    priority: string;
    action: string;
  }>>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, {
    matched: number;
    missing: number;
    coverage: number;
  }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Analyze skills gap.
   */
  const analyze = useCallback(async (jdText: string, resumeText: string) => {
    if (!jdText || !resumeText) {
      setGapScore(0);
      setMatchedSkills([]);
      setMissingCritical([]);
      setMissingPreferred([]);
      setRecommendations([]);
      setCategoryBreakdown({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getSkillsGap(jdText, resumeText);

      setGapScore(response.gap_score);
      setMatchedSkills(response.matched_skills);
      setMissingCritical(response.missing_critical);
      setMissingPreferred(response.missing_preferred);
      setRecommendations(response.recommendations);
      setCategoryBreakdown(response.category_breakdown);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to analyze skills gap');
      console.error('Skills gap analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear gap analysis results.
   */
  const clear = useCallback(() => {
    setGapScore(0);
    setMatchedSkills([]);
    setMissingCritical([]);
    setMissingPreferred([]);
    setRecommendations([]);
    setCategoryBreakdown({});
    setError(null);
  }, []);

  return {
    gapScore,
    matchedSkills,
    missingCritical,
    missingPreferred,
    recommendations,
    categoryBreakdown,
    isLoading,
    error,
    analyze,
    clear,
  };
}

export default useSkillsGap;
