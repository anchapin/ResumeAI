/**
 * SuggestionPopup Component
 * 
 * Displays a popup card with suggestion details and actions.
 * Shows explanation, replacement options, and accept/reject buttons.
 * 
 * Features:
 * - Positioning at text cursor
 * - Multiple replacement options
 * - Accept/Reject actions
 * - Click-outside-to-close
 * - Keyboard navigation (Enter, Escape)
 * - Fade animation
 * 
 * @param suggestion - The suggestion to display
 * - position - Popup position coordinates
 * - onAccept - Callback when suggestion is accepted
 * - onReject - Callback when suggestion is rejected
 * - onClose - Callback when popup is closed
 * 
 * @example
 * <SuggestionPopup
 *   suggestion={currentSuggestion}
 *   position={{ top: 100, left: 200, width: 300 }}
 *   onAccept={handleAccept}
 *   onReject={handleReject}
 *   onClose={handleClose}
 * />
 */

import React, { useEffect, useRef, useState } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react-dom';
import type { Suggestion, SuggestionPosition } from '../../types/writing-assistant';

export interface SuggestionPopupProps {
  suggestion: Suggestion | null;
  position?: SuggestionPosition;
  onAccept: (replacement: string) => void;
  onReject: () => void;
  onClose: () => void;
  anchorElement?: HTMLElement | null;
}

// Icon components for suggestion types
const TypeIcons = {
  spelling: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4.5 11.5l3-5 3 5h-6z"/>
    </svg>
  ),
  grammar: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
    </svg>
  ),
  style: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 4a.5.5 0 0 1 .5.5v2h2a.5.5 0 0 1 0 1h-2v2a.5.5 0 0 1-1 0v-2h-2a.5.5 0 0 1 0-1h2v-2A.5.5 0 0 1 8 4z"/>
    </svg>
  ),
  enhancement: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.536 14.01A14.973 14.973 0 0 0 14 8c0-3.057-2.14-5.63-5.062-6.368a.5.5 0 0 0-.618.484V3.5c0 .26-.206.48-.466.493C5.608 4.118 3 6.34 3 9a5.986 5.986 0 0 0 1.293 3.728.5.5 0 0 0 .677.068l1.74-1.74a.5.5 0 0 0 .068-.677A4.986 4.986 0 0 1 6 9c0-1.79 1.436-3.37 3.5-3.845V6.5a.5.5 0 0 0 .5.5h2.5a.5.5 0 0 0 .5-.5V4a.5.5 0 0 0-.5-.5h-2.5a.5.5 0 0 0-.5.5v.345c-2.67.485-4.5 2.535-4.5 4.655 0 1.218.433 2.352 1.158 3.252L4.26 13.64a.5.5 0 0 0 .068.677 6.975 6.975 0 0 0 3.555 1.655.5.5 0 0 0 .618-.484V14a.5.5 0 0 0 .5-.5h2.5a.5.5 0 0 0 .5-.5v-1.414z"/>
    </svg>
  ),
};

export function SuggestionPopup({
  suggestion,
  position,
  onAccept,
  onReject,
  onClose,
  anchorElement,
}: SuggestionPopupProps) {
  const [selectedReplacement, setSelectedReplacement] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Use floating-ui for positioning if anchor element provided
  const { x, y, strategy } = useFloating({
    open: !!suggestion,
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        overlayRef.current &&
        !overlayRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle keyboard events
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!suggestion) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'Enter':
          event.preventDefault();
          if (suggestion.replacements[selectedReplacement]) {
            onAccept(suggestion.replacements[selectedReplacement]);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedReplacement((prev) =>
            prev > 0 ? prev - 1 : suggestion.replacements.length - 1
          );
          break;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedReplacement((prev) =>
            prev < suggestion.replacements.length - 1 ? prev + 1 : 0
          );
          break;
        default:
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestion, selectedReplacement, onAccept, onClose]);

  // Reset selection when suggestion changes
  useEffect(() => {
    setSelectedReplacement(0);
  }, [suggestion]);

  if (!suggestion) return null;

  // Calculate position
  const inlineStyle: React.CSSProperties = anchorElement
    ? {
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
        zIndex: 1000,
      }
    : position
    ? {
        position: 'absolute',
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 1000,
      }
    : {};

  const typeColor = getTypeColor(suggestion.type);
  const severityLabel = getSeverityLabel(suggestion.severity);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          zIndex: 999,
        }}
        aria-hidden="true"
      />

      {/* Popup card */}
      <div
        ref={popupRef}
        style={{
          ...inlineStyle,
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          border: `1px solid ${typeColor}`,
          padding: '12px',
          maxWidth: '320px',
          minWidth: '240px',
          animation: 'fadeIn 0.15s ease-out',
        }}
        role="dialog"
        aria-label={`Suggestion: ${suggestion.message}`}
        data-suggestion-popup
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
            color: typeColor,
          }}
        >
          {TypeIcons[suggestion.type as keyof typeof TypeIcons] || TypeIcons.enhancement}
          <span
            style={{
              fontWeight: 600,
              fontSize: '14px',
              textTransform: 'capitalize',
            }}
          >
            {suggestion.type}
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: typeColor + '20',
              color: typeColor,
            }}
          >
            {severityLabel}
          </span>
        </div>

        {/* Message */}
        <div
          style={{
            fontSize: '13px',
            color: '#333',
            marginBottom: '8px',
            lineHeight: 1.5,
          }}
        >
          {suggestion.message}
        </div>

        {/* Explanation */}
        {suggestion.explanation && (
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '12px',
              fontStyle: 'italic',
            }}
          >
            {suggestion.explanation}
          </div>
        )}

        {/* Replacement options */}
        {suggestion.replacements.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '6px',
                color: '#555',
              }}
            >
              Suggestions:
            </div>
            {suggestion.replacements.map((replacement, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedReplacement(index);
                  onAccept(replacement);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 10px',
                  marginBottom: '4px',
                  border: `1px solid ${
                    index === selectedReplacement ? typeColor : '#e0e0e0'
                  }`,
                  borderRadius: '4px',
                  backgroundColor:
                    index === selectedReplacement ? typeColor + '10' : 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = typeColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    index === selectedReplacement ? typeColor : '#e0e0e0';
                }}
              >
                {replacement}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onReject}
            style={{
              padding: '6px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#666',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            Dismiss
          </button>
          {suggestion.replacements.length > 0 && (
            <button
              onClick={() =>
                onAccept(suggestion.replacements[selectedReplacement])
              }
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: typeColor,
                cursor: 'pointer',
                fontSize: '13px',
                color: 'white',
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Accept
            </button>
          )}
        </div>

        {/* Keyboard shortcuts hint */}
        <div
          style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #e0e0e0',
            fontSize: '11px',
            color: '#999',
            display: 'flex',
            gap: '12px',
          }}
        >
          <span>↑↓ Navigate</span>
          <span>Enter Accept</span>
          <span>Esc Close</span>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

/**
 * Get color for suggestion type.
 */
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    spelling: '#dc3545',
    grammar: '#fd7e14',
    style: '#28a745',
    enhancement: '#007bff',
  };
  return colors[type] || '#007bff';
}

/**
 * Get label for severity.
 */
function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    error: 'Error',
    warning: 'Warning',
    info: 'Suggestion',
  };
  return labels[severity] || severity;
}

export default SuggestionPopup;
