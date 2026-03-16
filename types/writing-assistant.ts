/**
 * Writing Assistant Types
 * 
 * Type definitions for the AI-powered writing assistant feature.
 */

export interface Suggestion {
  id: string;
  type: SuggestionType;
  severity: SuggestionSeverity;
  message: string;
  offset: number;
  length: number;
  replacements: string[];
  explanation: string;
  rule_id: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export type SuggestionType = 
  | 'spelling'
  | 'grammar'
  | 'style'
  | 'enhancement';

export type SuggestionSeverity = 
  | 'error'
  | 'warning'
  | 'info';

export interface SuggestionRequest {
  text: string;
  context?: SuggestionContext;
}

export interface SuggestionContext {
  section_type?: string;
  role?: string;
  industry?: string;
  jd_keywords?: string[];
  [key: string]: unknown;
}

export interface SuggestionResponse {
  suggestions: Suggestion[];
  processing_time_ms: number;
  cache_hit?: boolean;
  quality_score?: number;
}

export interface GrammarCheckRequest {
  text: string;
}

export interface GrammarCheckResponse {
  suggestions: Suggestion[];
  error_count: number;
  warning_count: number;
  processing_time_ms: number;
}

export interface EnhancementRequest {
  text: string;
  enhancement_type: EnhancementType;
  context?: Record<string, unknown>;
}

export type EnhancementType = 
  | 'action_verbs'
  | 'quantification'
  | 'star'
  | 'ats';

export interface EnhancementResponse {
  original: string;
  enhanced: string;
  enhancement_type: string;
  changes: Array<Record<string, unknown>>;
  confidence: number;
  explanation: string;
}

export interface QuantifyRequest {
  text: string;
  role?: string;
}

export interface QualityAssessmentRequest {
  text: string;
  section_type: string;
  context?: Record<string, unknown>;
}

export interface QualityAssessmentResponse {
  quality_score: number;
  grade: string;
  suggestion_count: number;
  error_count: number;
  recommendations: string[];
}

export interface SuggestionHistoryResponse {
  suggestions: Array<Record<string, unknown>>;
  total_count: number;
  stats: {
    total_suggestions: number;
    accepted: number;
    rejected: number;
    acceptance_rate: number;
  };
}

export interface UpdateSuggestionStatusRequest {
  suggestion_id: string;
  status: 'accepted' | 'rejected' | 'ignored';
}

export interface WritingAssistantState {
  suggestions: Suggestion[];
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  history: Suggestion[];
  stats: {
    total: number;
    accepted: number;
    rejected: number;
    acceptanceRate: number;
  };
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  acceptSuggestion: (id: string, replacement: string) => Promise<void>;
  rejectSuggestion: (id: string) => Promise<void>;
  dismissSuggestion: (id: string) => Promise<void>;
  undo: (id: string) => Promise<void>;
  refreshSuggestions: (text: string, context?: SuggestionContext) => Promise<void>;
  clearSuggestions: () => void;
}

// Context type alias for backward compatibility
export type WritingAssistantContext = WritingAssistantState;

export interface UseWritingAssistantOptions {
  enabled?: boolean;
  debounceMs?: number;
  autoRefresh?: boolean;
  context?: SuggestionContext;
}

export interface UseWritingAssistantReturn {
  suggestions: Suggestion[];
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  acceptSuggestion: (id: string, replacement: string) => Promise<void>;
  rejectSuggestion: (id: string) => Promise<void>;
  refreshSuggestions: (text: string, context?: SuggestionContext) => Promise<void>;
  clearSuggestions: () => void;
}

export interface SuggestionPosition {
  top: number;
  left: number;
  width: number;
}

export interface KeyboardHandlers {
  onKeyDown: (event: React.KeyboardEvent) => void;
}

export interface UseSuggestionKeyboardReturn {
  onKeyDown: (event: React.KeyboardEvent) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}
