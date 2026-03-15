/**
 * InlineCompletion Component
 * 
 * Displays ghost text inline completion.
 * 
 * @example
 * <InlineCompletion
 *   suggestion="development of new features"
 *   cursorPosition={cursorPos}
 *   onAccept={handleAccept}
 * />
 */

import React from 'react';

export interface InlineCompletionProps {
  suggestion: string;
  cursorPosition: { top: number; left: number };
  onAccept: () => void;
  onDismiss: () => void;
}

export function InlineCompletion({
  suggestion,
  cursorPosition,
  onAccept,
  onDismiss,
}: InlineCompletionProps) {
  if (!suggestion) return null;

  return (
    <>
      {/* Backdrop to capture clicks */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 998,
        }}
        onClick={onDismiss}
        aria-hidden="true"
      />
      
      {/* Ghost text */}
      <span
        style={{
          position: 'absolute',
          top: cursorPosition.top,
          left: cursorPosition.left,
          color: '#999',
          pointerEvents: 'none',
          whiteSpace: 'pre',
        }}
      >
        {suggestion}
      </span>

      {/* Accept button (visible on hover) */}
      <button
        onClick={onAccept}
        style={{
          position: 'absolute',
          top: cursorPosition.top - 20,
          left: cursorPosition.left,
          padding: '2px 8px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '11px',
          cursor: 'pointer',
          zIndex: 999,
          opacity: 0,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0';
        }}
      >
        Tab to accept
      </button>
    </>
  );
}

export default InlineCompletion;
