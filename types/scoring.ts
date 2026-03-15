/**
 * Resume Scoring Types
 */

export interface ResumeScore {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  categories: Record<string, CategoryScore>;
  percentile?: number;
  role?: string;
  industry?: string;
}

export interface CategoryScore {
  name: string;
  score: number;
  weight: number;
  metrics: Record<string, unknown>;
  feedback: string;
}

export interface Recommendation {
  id: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface ScoreHistory {
  date: string;
  score: number;
  grade: string;
}

export interface UseResumeScoreReturn {
  score: ResumeScore | null;
  recommendations: Recommendation[];
  isLoading: boolean;
  error: string | null;
  getScore: (resumeData: Record<string, unknown>, role?: string) => Promise<void>;
  clearScore: () => void;
}

export interface UseScoreTrackingReturn {
  history: ScoreHistory[];
  trend: 'improving' | 'declining' | 'stable';
  improvement: number;
  isLoading: boolean;
  trackScore: (score: number, grade: string) => Promise<void>;
}
