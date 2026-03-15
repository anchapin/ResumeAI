/**
 * BulletSuggestions Component
 * 
 * Displays bullet point suggestions for sections.
 * 
 * @example
 * <BulletSuggestions
 *   suggestions={bullets}
 *   sectionType="experience"
 *   onSelect={handleSelect}
 * />
 */

import React from 'react';

export interface BulletSuggestionsProps {
  suggestions: string[];
  sectionType: string;
  onSelect: (bullet: string) => void;
  onDismiss: () => void;
}

export function BulletSuggestions({
  suggestions,
  sectionType,
  onSelect,
  onDismiss,
}: BulletSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: '#333',
            textTransform: 'capitalize',
          }}
        >
          {sectionType} suggestions
        </h4>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            fontSize: '16px',
            color: '#999',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {suggestions.map((bullet, index) => (
          <button
            key={index}
            onClick={() => onSelect(bullet)}
            style={{
              padding: '8px 10px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px',
              color: '#333',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#007bff';
              e.currentTarget.style.backgroundColor = '#007bff10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <span style={{ color: '#007bff', marginRight: '6px' }}>•</span>
            {bullet}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #f0f0f0',
          fontSize: '11px',
          color: '#999',
        }}
      >
        Click to insert • Esc to close
      </div>
    </div>
  );
}

export default BulletSuggestions;
