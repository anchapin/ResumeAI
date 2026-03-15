/**
 * MissingSkillItem Component
 * 
 * Displays a missing skill with priority indicator and suggestions.
 * Includes quick action to add to resume.
 * 
 * @example
 * <MissingSkillItem
 *   skill={missingSkill}
 *   onAddSuggestion={handleAddSuggestion}
 * />
 */

import React, { useState } from 'react';
import type { MissingSkill } from '../../types/skills';

export interface MissingSkillItemProps {
  skill: MissingSkill;
  onAddSuggestion?: (suggestion: string) => void;
  onDismiss?: () => void;
}

// Colors for priority levels
const PriorityColors = {
  critical: '#f44336',
  preferred: '#ff9800',
  nice_to_have: '#4caf50',
};

// Icons for priority
const PriorityIcons = {
  critical: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
    </svg>
  ),
  preferred: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
    </svg>
  ),
  nice_to_have: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
      <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
    </svg>
  ),
};

export function MissingSkillItem({
  skill,
  onAddSuggestion,
  onDismiss,
}: MissingSkillItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const color = PriorityColors[skill.priority] || PriorityColors.nice_to_have;
  const icon = PriorityIcons[skill.priority] || PriorityIcons.nice_to_have;

  return (
    <div
      style={{
        border: `1px solid ${color}40`,
        borderRadius: '8px',
        padding: '12px',
        backgroundColor: 'white',
        marginBottom: '8px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ color }}>{icon}</span>
        <span
          style={{
            fontWeight: 600,
            fontSize: '14px',
            color: '#333',
            flex: 1,
          }}
        >
          {skill.name}
        </span>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: color + '20',
            color: color,
            textTransform: 'capitalize',
            fontWeight: 500,
          }}
        >
          {skill.priority.replace('_', ' ')}
        </span>
      </div>

      {/* Category */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#666',
        }}
      >
        Category: <span style={{ textTransform: 'capitalize' }}>{skill.category}</span>
      </div>

      {/* Suggestions */}
      {skill.suggestions && skill.suggestions.length > 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: color + '10',
            borderRadius: '4px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: '#666',
              marginBottom: '6px',
              fontWeight: 500,
            }}
          >
            Where to add:
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: '16px',
              fontSize: '12px',
              color: '#333',
            }}
          >
            {skill.suggestions.map((suggestion, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end',
        }}
      >
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              padding: '6px 12px',
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
        )}
        {onAddSuggestion && (
          <button
            onClick={() => onAddSuggestion(skill.name)}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: color,
              color: 'white',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Add to Resume
          </button>
        )}
      </div>
    </div>
  );
}

export default MissingSkillItem;
