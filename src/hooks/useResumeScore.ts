/**
 * useResumeScore Hook
 * 
 * Hook for getting resume score and recommendations.
 */

import { useCallback, useState } from 'react';
import type { ResumeScore, Recommendation, UseResumeScoreReturn } from '../../types/scoring';

// Mock data for development
const mockScore: ResumeScore = {
  overall: 75.5,
  grade: 'C',
  categories: {
    content_quality: {
      name: 'content_quality',
      score: 70,
      weight: 0.35,
      metrics: { action_verb_ratio: 0.6, quantification_ratio: 0.4 },
      feedback: 'Add more action verbs and quantifiable metrics',
    },
    skills_coverage: {
      name: 'skills_coverage',
      score: 80,
      weight: 0.30,
      metrics: { resume_skills_count: 15 },
      feedback: 'Skills coverage is good',
    },
    experience_relevance: {
      name: 'experience_relevance',
      score: 75,
      weight: 0.20,
      metrics: { years_experience: 5 },
      feedback: 'Experience section is strong',
    },
    formatting: {
      name: 'formatting',
      score: 80,
      weight: 0.15,
      metrics: { sections_count: 5 },
      feedback: 'Formatting is excellent',
    },
  },
};

const mockRecommendations: Recommendation[] = [
  {
    id: 'rec_1',
    category: 'content_quality',
    priority: 'high',
    title: 'Add quantifiable metrics',
    description: 'Include numbers to show impact',
    action: 'Add metrics to at least 50% of bullet points',
    impact: '+10-15 points',
    effort: 'medium',
  },
  {
    id: 'rec_2',
    category: 'skills_coverage',
    priority: 'high',
    title: 'Add missing key skills',
    description: 'Include skills from job description',
    action: 'Review JD and add relevant skills',
    impact: '+10-20 points',
    effort: 'low',
  },
];

export function useResumeScore(): UseResumeScoreReturn {
  const [score, setScore] = useState<ResumeScore | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getScore = useCallback(async (
    resumeData: Record<string, unknown>,
    role?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock API call - would use actual API in production
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      setScore(mockScore);
      setRecommendations(mockRecommendations);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to get score');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearScore = useCallback(() => {
    setScore(null);
    setRecommendations([]);
    setError(null);
  }, []);

  return {
    score,
    recommendations,
    isLoading,
    error,
    getScore,
    clearScore,
  };
}

export default useResumeScore;
