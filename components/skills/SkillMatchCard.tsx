/**
 * SkillMatchCard Component
 * 
 * Displays a matched skill between JD and resume.
 * Shows match type, confidence, and contexts.
 * 
 * @example
 * <SkillMatchCard
 *   match={skillMatch}
 *   onResumeClick={handleResumeClick}
 * />
 */

import React from 'react';
import type { SkillMatch } from '../../types/skills';

export interface SkillMatchCardProps {
  match: SkillMatch;
  onResumeClick?: () => void;
}

// Icons for match types
const MatchTypeIcons = {
  exact: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 7.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5z"/>
    </svg>
  ),
  semantic: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.536 14.01A14.973 14.973 0 0 0 14 8c0-3.057-2.14-5.63-5.062-6.368a.5.5 0 0 0-.618.484V3.5c0 .26-.206.48-.466.493C5.608 4.118 3 6.34 3 9a5.986 5.986 0 0 0 1.293 3.728.5.5 0 0 0 .677.068l1.74-1.74a.5.5 0 0 0 .068-.677A4.986 4.986 0 0 1 6 9c0-1.79 1.436-3.37 3.5-3.845V6.5a.5.5 0 0 0 .5.5h2.5a.5.5 0 0 0 .5-.5V4a.5.5 0 0 0-.5-.5h-2.5a.5.5 0 0 0-.5.5v.345c-2.67.485-4.5 2.535-4.5 4.655 0 1.218.433 2.352 1.158 3.252L4.26 13.64a.5.5 0 0 0 .068.677 6.975 6.975 0 0 0 3.555 1.655.5.5 0 0 0 .618-.484V14a.5.5 0 0 0 .5-.5h2.5a.5.5 0 0 0 .5-.5v-1.414z"/>
    </svg>
  ),
  synonym: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
      <path d="M4.285 9.567a.5.5 0 0 1 .683-.183 3.5 3.5 0 0 0 6.064 0 .5.5 0 1 1 .866.5A4.5 4.5 0 0 1 8 12.5a4.5 4.5 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683zM8 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>
    </svg>
  ),
};

// Colors for match types
const MatchTypeColors = {
  exact: '#4caf50',
  semantic: '#2196f3',
  synonym: '#ff9800',
};

export function SkillMatchCard({ match, onResumeClick }: SkillMatchCardProps) {
  const icon = MatchTypeIcons[match.match_type] || MatchTypeIcons.exact;
  const color = MatchTypeColors[match.match_type] || MatchTypeColors.exact;

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
          marginBottom: '8px',
        }}
      >
        <span style={{ color }}>{icon}</span>
        <span
          style={{
            fontWeight: 600,
            fontSize: '14px',
            color: '#333',
          }}
        >
          {match.skill}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: color + '20',
            color: color,
            textTransform: 'capitalize',
          }}
        >
          {match.match_type} match
        </span>
      </div>

      {/* Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          fontSize: '12px',
        }}
      >
        {/* JD Context */}
        <div>
          <div
            style={{
              fontSize: '11px',
              color: '#666',
              marginBottom: '4px',
            }}
          >
            In JD:
          </div>
          <div
            style={{
              padding: '6px 8px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              color: '#333',
            }}
          >
            {match.jd_context}
          </div>
        </div>

        {/* Resume Context */}
        <div>
          <div
            style={{
              fontSize: '11px',
              color: '#666',
              marginBottom: '4px',
            }}
          >
            In Resume:
          </div>
          <div
            style={{
              padding: '6px 8px',
              backgroundColor: color + '10',
              borderRadius: '4px',
              color: '#333',
            }}
          >
            {match.resume_context || 'Not found'}
          </div>
        </div>
      </div>

      {/* Confidence */}
      <div
        style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            color: '#666',
          }}
        >
          Confidence:
        </span>
        <div
          style={{
            flex: 1,
            height: '4px',
            backgroundColor: '#e0e0e0',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${match.confidence * 100}%`,
              height: '100%',
              backgroundColor: color,
            }}
          />
        </div>
        <span
          style={{
            fontSize: '11px',
            color: '#666',
            minWidth: '40px',
            textAlign: 'right',
          }}
        >
          {Math.round(match.confidence * 100)}%
        </span>
      </div>

      {/* Action */}
      {onResumeClick && (
        <button
          onClick={onResumeClick}
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            backgroundColor: color,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          View in Resume
        </button>
      )}
    </div>
  );
}

export default SkillMatchCard;
