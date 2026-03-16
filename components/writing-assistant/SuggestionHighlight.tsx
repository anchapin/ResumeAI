/**
 * SuggestionHighlight Component
 * 
 * Displays wavy underlines for writing suggestions in text.
 * Uses color coding for different suggestion types:
 * - Red: Spelling errors
 * - Orange: Grammar issues
 * - Green: Style improvements
 * - Blue: Enhancement suggestions
 * 
 * @param text - The text to display
 * @param suggestions - List of suggestions with positions
 * @param onSuggestionClick - Callback when suggestion is clicked
 * 
 * @example
 * <SuggestionHighlight
 *   text={resumeText}
 *   suggestions={suggestions}
 *   onSuggestionClick={handleSuggestionClick}
 * />
 */

import React, { useMemo, useState } from 'react';
import type { Suggestion } from '../../types/writing-assistant';

export interface SuggestionHighlightProps {
  text: string;
  suggestions: Suggestion[];
  onSuggestionClick: (suggestion: Suggestion) => void;
  className?: string;
  disabled?: boolean;
}

// Color scheme for suggestion types
const SUGGESTION_COLORS = {
  spelling: {
    underline: '#dc3545', // Red
    background: 'rgba(220, 53, 69, 0.1)',
  },
  grammar: {
    underline: '#fd7e14', // Orange
    background: 'rgba(253, 126, 20, 0.1)',
  },
  style: {
    underline: '#28a745', // Green
    background: 'rgba(40, 167, 69, 0.1)',
  },
  enhancement: {
    underline: '#007bff', // Blue
    background: 'rgba(0, 123, 255, 0.1)',
  },
};

// Severity to opacity mapping
const SEVERITY_OPACITY = {
  error: 1,
  warning: 0.8,
  info: 0.6,
};

export function SuggestionHighlight({
  text,
  suggestions,
  onSuggestionClick,
  className = '',
  disabled = false,
}: SuggestionHighlightProps) {
  const [hoveredSuggestionId, setHoveredSuggestionId] = useState<string | null>(
    null
  );

  /**
   * Render text with suggestion highlights.
   */
  const highlightedText = useMemo(() => {
    if (!suggestions.length || disabled) {
      return <span className={className}>{text}</span>;
    }

    // Sort suggestions by offset
    const sortedSuggestions = [...suggestions].sort((a, b) => a.offset - b.offset);

    // Build segments array
    const segments: Array<{
      text: string;
      suggestion?: Suggestion;
      isHighlight?: boolean;
    }> = [];

    let lastIndex = 0;

    for (const suggestion of sortedSuggestions) {
      // Add text before suggestion
      if (suggestion.offset > lastIndex) {
        segments.push({
          text: text.substring(lastIndex, suggestion.offset),
        });
      }

      // Add highlighted text
      const highlightText = text.substring(
        suggestion.offset,
        suggestion.offset + suggestion.length
      );

      segments.push({
        text: highlightText,
        suggestion,
        isHighlight: true,
      });

      lastIndex = suggestion.offset + suggestion.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({
        text: text.substring(lastIndex),
      });
    }

    return (
      <span className={className}>
        {segments.map((segment, index) =>
          segment.isHighlight && segment.suggestion ? (
            <HighlightSpan
              key={`${segment.suggestion.id}-${index}`}
              suggestion={segment.suggestion}
              isHovered={hoveredSuggestionId === segment.suggestion.id}
              onHover={setHoveredSuggestionId}
              onClick={() => onSuggestionClick(segment.suggestion!)}
            >
              {segment.text}
            </HighlightSpan>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        )}
      </span>
    );
  }, [text, suggestions, disabled, className, hoveredSuggestionId, onSuggestionClick]);

  return <div className="suggestion-highlight-container">{highlightedText}</div>;
}

/**
 * HighlightSpan Component
 * 
 * Internal component for rendering individual suggestion highlights.
 */

interface HighlightSpanProps {
  suggestion: Suggestion;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  children: React.ReactNode;
}

function HighlightSpan({
  suggestion,
  isHovered,
  onHover,
  onClick,
  children,
}: HighlightSpanProps) {
  const colors = SUGGESTION_COLORS[suggestion.type as keyof typeof SUGGESTION_COLORS] || SUGGESTION_COLORS.enhancement;
  const opacity = SEVERITY_OPACITY[suggestion.severity as keyof typeof SEVERITY_OPACITY] || 1;

  const style: React.CSSProperties = {
    position: 'relative',
    display: 'inline',
    cursor: 'pointer',
    backgroundColor: isHovered ? colors.background : 'transparent',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 3'%3E%3Cpath d='M0 2.5 L1.5 0.5 L3 2.5 L4.5 0.5 L6 2.5' stroke='${colors.underline.replace('#', '%23')}' fill='none' stroke-width='0.5'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat-x',
    backgroundPosition: 'bottom',
    backgroundSize: '6px 3px',
    paddingBottom: '2px',
    opacity,
    transition: 'background-color 0.15s ease',
    borderRadius: '2px',
  };

  return (
    <span
      style={style}
      onMouseEnter={() => onHover(suggestion.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Suggestion: ${suggestion.message}`}
      data-suggestion-id={suggestion.id}
      data-suggestion-type={suggestion.type}
      data-suggestion-severity={suggestion.severity}
    >
      {children}
    </span>
  );
}

/**
 * SuggestionHighlightOverlay Component
 * 
 * Alternative overlay-based highlight for use with read-only text.
 */

export interface SuggestionHighlightOverlayProps {
  text: string;
  suggestions: Suggestion[];
  onSuggestionClick: (suggestion: Suggestion) => void;
}

export function SuggestionHighlightOverlay({
  text,
  suggestions,
  onSuggestionClick,
}: SuggestionHighlightOverlayProps) {
  return (
    <div className="suggestion-overlay-container" style={{ position: 'relative' }}>
      {/* Base text layer */}
      <div
        style={{
          visibility: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        aria-hidden="true"
      >
        {text}
      </div>

      {/* Highlight layer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'auto',
        }}
      >
        <SuggestionHighlight
          text={text}
          suggestions={suggestions}
          onSuggestionClick={onSuggestionClick}
        />
      </div>
    </div>
  );
}

export default SuggestionHighlight;
