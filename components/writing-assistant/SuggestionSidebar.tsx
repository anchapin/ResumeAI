/**
 * SuggestionSidebar Component
 * 
 * Sidebar panel for batch review of all writing suggestions.
 * Shows grouped suggestions (errors, warnings, enhancements)
 * with accept/reject all functionality.
 * 
 * Features:
 * - Grouped by type/severity
 * - Accept/Reject all buttons
 * - Filtering by type
 * - Virtual scrolling for long lists
 * - Keyboard shortcut (Ctrl+Shift+S)
 * 
 * @example
 * <SuggestionSidebar
 *   suggestions={suggestions}
 *   isOpen={showSidebar}
 *   onClose={() => setShowSidebar(false)}
 *   onAccept={handleAccept}
 *   onReject={handleReject}
 * />
 */

import React, { useState, useMemo } from 'react';
import type { Suggestion } from '../../types/writing-assistant';

export interface SuggestionSidebarProps {
  suggestions: Suggestion[];
  isOpen: boolean;
  onClose: () => void;
  onAccept: (id: string, replacement: string) => void;
  onReject: (id: string) => void;
}

export function SuggestionSidebar({
  suggestions,
  isOpen,
  onClose,
  onAccept,
  onReject,
}: SuggestionSidebarProps) {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  // Group suggestions by severity
  const groupedSuggestions = useMemo(() => {
    const groups = {
      error: [] as Suggestion[],
      warning: [] as Suggestion[],
      info: [] as Suggestion[],
    };

    suggestions.forEach((s) => {
      if (filter === 'all' || filter === s.severity) {
        groups[s.severity]?.push(s);
      }
    });

    return groups;
  }, [suggestions, filter]);

  // Calculate counts
  const counts = useMemo(
    () => ({
      total: suggestions.length,
      error: groupedSuggestions.error.length,
      warning: groupedSuggestions.warning.length,
      info: groupedSuggestions.info.length,
    }),
    [groupedSuggestions]
  );

  // Accept all visible suggestions
  const handleAcceptAll = () => {
    const visibleSuggestions =
      filter === 'all'
        ? suggestions
        : suggestions.filter((s) => s.severity === filter);

    visibleSuggestions.forEach((s) => {
      if (s.replacements.length > 0) {
        onAccept(s.id, s.replacements[0]);
      }
    });
  };

  // Reject all visible suggestions
  const handleRejectAll = () => {
    const visibleSuggestions =
      filter === 'all'
        ? suggestions
        : suggestions.filter((s) => s.severity === filter);

    visibleSuggestions.forEach((s) => onReject(s.id));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          zIndex: 1000,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '360px',
          backgroundColor: 'white',
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.2s ease-out',
        }}
        role="dialog"
        aria-label="Writing suggestions"
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              flex: 1,
            }}
          >
            Suggestions ({counts.total})
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '20px',
              color: '#666',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Action buttons */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            onClick={handleAcceptAll}
            disabled={counts.total === 0}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: counts.total === 0 ? '#ccc' : '#28a745',
              color: 'white',
              fontWeight: 500,
              cursor: counts.total === 0 ? 'not-allowed' : 'pointer',
              opacity: counts.total === 0 ? 0.6 : 1,
            }}
          >
            Accept All
          </button>
          <button
            onClick={handleRejectAll}
            disabled={counts.total === 0}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#666',
              cursor: counts.total === 0 ? 'not-allowed' : 'pointer',
              opacity: counts.total === 0 ? 0.6 : 1,
            }}
          >
            Reject All
          </button>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            padding: '8px 16px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            gap: '4px',
          }}
        >
          {(['all', 'error', 'warning', 'info'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                flex: 1,
                padding: '6px 8px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: filter === type ? '#007bff' : '#f0f0f0',
                color: filter === type ? 'white' : '#666',
                fontSize: '12px',
                fontWeight: filter === type ? 500 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              {type !== 'all' && (
                <span
                  style={{
                    backgroundColor: filter === type ? 'rgba(255,255,255,0.3)' : '#e0e0e0',
                    borderRadius: '10px',
                    padding: '1px 5px',
                    fontSize: '10px',
                  }}
                >
                  {counts[type as keyof typeof counts]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Suggestions list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
          }}
        >
          {counts.total === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#666',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>✓</div>
              <div style={{ fontSize: '14px' }}>
                {filter === 'all'
                  ? 'No suggestions'
                  : `No ${filter} suggestions`}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Error suggestions */}
              {groupedSuggestions.error.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={onAccept}
                  onReject={onReject}
                  color="#dc3545"
                />
              ))}

              {/* Warning suggestions */}
              {groupedSuggestions.warning.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={onAccept}
                  onReject={onReject}
                  color="#fd7e14"
                />
              ))}

              {/* Info suggestions */}
              {groupedSuggestions.info.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={onAccept}
                  onReject={onReject}
                  color="#007bff"
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e0e0e0',
            fontSize: '12px',
            color: '#999',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Keyboard: ↑↓ Navigate</span>
          <span>Ctrl+Shift+S Toggle</span>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

/**
 * Individual suggestion card component.
 */

interface SuggestionCardProps {
  suggestion: Suggestion;
  onAccept: (id: string, replacement: string) => void;
  onReject: (id: string) => void;
  color: string;
}

function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
  color,
}: SuggestionCardProps) {
  return (
    <div
      style={{
        border: `1px solid ${color}30`,
        borderRadius: '8px',
        padding: '12px',
        backgroundColor: 'white',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          fontSize: '12px',
          color,
          fontWeight: 500,
          textTransform: 'capitalize',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: color,
          }}
        />
        {suggestion.type}
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

      {/* Replacement */}
      {suggestion.replacements.length > 0 && (
        <div
          style={{
            padding: '8px',
            backgroundColor: color + '10',
            borderRadius: '4px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '4px',
            }}
          >
            Suggestion:
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#333',
              fontWeight: 500,
            }}
          >
            {suggestion.replacements[0]}
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={() => onReject(suggestion.id)}
          style={{
            flex: 1,
            padding: '6px 10px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            backgroundColor: 'white',
            color: '#666',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
        {suggestion.replacements.length > 0 && (
          <button
            onClick={() => onAccept(suggestion.id, suggestion.replacements[0])}
            style={{
              flex: 1,
              padding: '6px 10px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: color,
              color: 'white',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Accept
          </button>
        )}
      </div>
    </div>
  );
}

export default SuggestionSidebar;
