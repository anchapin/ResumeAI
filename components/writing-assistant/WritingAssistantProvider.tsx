/**
 * WritingAssistantProvider Component
 * 
 * Context provider for writing assistant state and actions.
 * Uses Zustand for state management.
 * 
 * @example
 * <WritingAssistantProvider>
 *   <Editor />
 * </WritingAssistantProvider>
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useWritingAssistant } from '../../src/hooks/useWritingAssistant';
import type {
  WritingAssistantContext,
  SuggestionContext,
} from '../../types/writing-assistant';

// Create context
const WritingAssistantContext = createContext<WritingAssistantContext | null>(null);

export interface WritingAssistantProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  context?: SuggestionContext;
}

export function WritingAssistantProvider({
  children,
  enabled = true,
  context,
}: WritingAssistantProviderProps) {
  // Use the writing assistant hook
  const {
    suggestions,
    isActive,
    isLoading,
    error,
    enable,
    disable,
    toggle,
    acceptSuggestion,
    rejectSuggestion,
    refreshSuggestions,
    clearSuggestions,
  } = useWritingAssistant({
    enabled,
    debounceMs: 300,
    autoRefresh: true,
    context,
  });

  // Placeholder stats (would come from API in real implementation)
  const stats = useMemo(
    () => ({
      total: suggestions.length,
      accepted: 0,
      rejected: 0,
      acceptanceRate: 0,
    }),
    [suggestions.length]
  );

  // Placeholder history (would come from API in real implementation)
  const history = useMemo(() => [], []);

  // Placeholder undo (would need more complex state tracking)
  const undo = async (id: string) => {
    console.log('Undo suggestion:', id);
    // Implementation would restore original text
  };

  const contextValue: WritingAssistantContext = {
    suggestions,
    isActive,
    isLoading,
    error,
    history,
    stats,
    enable,
    disable,
    toggle,
    acceptSuggestion,
    rejectSuggestion,
    dismissSuggestion: rejectSuggestion,
    undo,
    refreshSuggestions,
    clearSuggestions,
  };

  return (
    <WritingAssistantContext.Provider value={contextValue}>
      {children}
    </WritingAssistantContext.Provider>
  );
}

/**
 * Hook to access writing assistant context.
 */
export function useWritingAssistantContext(): WritingAssistantContext {
  const context = useContext(WritingAssistantContext);
  if (!context) {
    throw new Error(
      'useWritingAssistantContext must be used within WritingAssistantProvider'
    );
  }
  return context;
}

export default WritingAssistantProvider;
