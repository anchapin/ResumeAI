/**
 * Skills API Types
 * 
 * Type definitions for the skills extraction and gap analysis feature.
 */

export interface ExtractedSkill {
  name: string;
  category: string;
  original_text: string;
  confidence: number;
  synonyms?: string[];
}

export interface SkillMatch {
  skill: string;
  category: string;
  match_type: 'exact' | 'semantic' | 'synonym';
  confidence: number;
  jd_context: string;
  resume_context: string;
}

export interface MissingSkill {
  name: string;
  category: string;
  priority: 'critical' | 'preferred' | 'nice_to_have';
  suggestions: string[];
}

export interface PartialMatch {
  jd_skill: string;
  resume_skill: string;
  similarity: number;
  relationship: string;
}

export interface SkillsExtractRequest {
  text: string;
  include_metadata?: boolean;
}

export interface SkillsExtractResponse {
  skills: ExtractedSkill[];
  by_category: Record<string, ExtractedSkill[]>;
  total_count: number;
  processing_time_ms: number;
}

export interface SkillsMatchRequest {
  jd_text: string;
  resume_text: string;
  resume_skills?: string[];
}

export interface SkillsMatchResponse {
  matched_skills: SkillMatch[];
  missing_skills: MissingSkill[];
  partial_matches: PartialMatch[];
  coverage_score: number;
  jd_skills_count: number;
  resume_skills_count: number;
}

export interface SkillsGapResponse {
  gap_score: number;
  matched_skills: SkillMatch[];
  missing_critical: MissingSkill[];
  missing_preferred: MissingSkill[];
  recommendations: Array<{
    skill: string;
    priority: string;
    action: string;
  }>;
  category_breakdown: Record<string, {
    matched: number;
    missing: number;
    coverage: number;
  }>;
}

export interface CategoriesResponse {
  categories: Record<string, string[]>;
  statistics: {
    total_skills: number;
    total_synonyms: number;
    by_category: Record<string, number>;
  };
}

export interface SkillsSearchResponse {
  query: string;
  results: Array<{
    name: string;
    category: string;
    subcategory?: string;
    synonyms: string[];
  }>;
  count: number;
}

export interface UseSkillsExtractionReturn {
  skills: ExtractedSkill[];
  byCategory: Record<string, ExtractedSkill[]>;
  isLoading: boolean;
  error: string | null;
  extract: (text: string) => Promise<void>;
  clear: () => void;
}

export interface UseSkillsGapReturn {
  gapScore: number;
  matchedSkills: SkillMatch[];
  missingCritical: MissingSkill[];
  missingPreferred: MissingSkill[];
  recommendations: Array<{ skill: string; priority: string; action: string }>;
  categoryBreakdown: Record<string, { matched: number; missing: number; coverage: number }>;
  isLoading: boolean;
  error: string | null;
  analyze: (jdText: string, resumeText: string) => Promise<void>;
  clear: () => void;
}
