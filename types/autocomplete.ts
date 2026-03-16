/**
 * Auto-Complete Types
 * 
 * Type definitions for AI-powered auto-complete feature.
 */

export interface CompletionSuggestion {
  id: string;
  text: string;
  type: 'inline' | 'bullet' | 'section';
  confidence: number;
  source?: string;
}

export interface CompletionContext {
  text: string;
  cursorPosition: number;
  sectionType?: string;
  role?: string;
}

export interface AutocompleteRequest {
  text: string;
  cursor_position: number;
  section_type?: string;
  role?: string;
  limit?: number;
}

export interface AutocompleteResponse {
  completions: CompletionSuggestion[];
  context: Record<string, unknown>;
  processing_time_ms: number;
  has_more: boolean;
}

export interface BulletRequest {
  section_type: string;
  role?: string;
  industry?: string;
  seniority?: string;
  limit?: number;
}

export interface BulletResponse {
  bullets: string[];
  processing_time_ms: number;
}

export interface ContextResponse {
  section_type: string;
  writing_style: Record<string, unknown>;
  detected_role: string | null;
  seniority_level: string | null;
  bullet_structure: Record<string, unknown>;
}

export interface FeedbackRequest {
  completion_id: string;
  accepted: boolean;
  context?: Record<string, unknown>;
}

export interface UseAutocompleteReturn {
  completions: CompletionSuggestion[];
  isLoading: boolean;
  error: string | null;
  getCompletions: (context: CompletionContext) => Promise<void>;
  getBulletCompletions: (sectionType: string, role?: string) => Promise<string[]>;
  acceptCompletion: (id: string) => void;
  dismissCompletions: () => void;
}

export interface UseCompletionKeyboardReturn {
  onKeyDown: (event: React.KeyboardEvent) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}
