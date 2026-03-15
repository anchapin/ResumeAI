/**
 * AutocompletePopup Component

 * Displays completion suggestions in a popup.
 * 
 * @example
 * <AutocompletePopup
 *   completions={completions}
 *   selectedIndex={selectedIndex}
 *   position={position}
 *   onAccept={handleAccept}
 * />
 */

import React from 'react';
import type { CompletionSuggestion } from '../../types/autocomplete';

export interface AutocompletePopupProps {
  completions: CompletionSuggestion[];
  selectedIndex: number;
  position: { top: number; left: number; width: number };
  onAccept: (completion: CompletionSuggestion) => void;
  onDismiss: () => void;
}

export function AutocompletePopup({
  completions,
  selectedIndex,
  position,
  onAccept,
  onDismiss,
}: AutocompletePopupProps) {
  if (!completions || completions.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        width: position.width,
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        overflow: 'hidden',
      }}
      role="listbox"
    >
      {completions.map((completion, index) => (
        <button
          key={completion.id}
          onClick={() => onAccept(completion)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            borderBottom: index < completions.length - 1 ? '1px solid #f0f0f0' : 'none',
            backgroundColor: index === selectedIndex ? '#007bff15' : 'white',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '13px',
            color: '#333',
          }}
          role="option"
          aria-selected={index === selectedIndex}
        >
          <span style={{ color: '#666' }}>{completion.text}</span>
          {completion.confidence > 0.8 && (
            <span
              style={{
                marginLeft: '8px',
                fontSize: '11px',
                color: '#4caf50',
              }}
            >
              ●
            </span>
          )}
        </button>
      ))}
      <div
        style={{
          padding: '6px 12px',
          backgroundColor: '#f5f5f5',
          fontSize: '11px',
          color: '#999',
          borderTop: '1px solid #e0e0e0',
        }}
      >
        Tab to accept • Esc to dismiss
      </div>
    </div>
  );
}

export default AutocompletePopup;
