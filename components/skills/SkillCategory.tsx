/**
 * SkillCategory Component
 * 
 * Displays a category of skills with count badge.
 * Expandable/collapsible with color coding.
 * 
 * @example
 * <SkillCategory
 *   category="technical"
 *   skills={technicalSkills}
 *   onSelect={handleSkillSelect}
 * />
 */

import React, { useState } from 'react';
import type { ExtractedSkill } from '../../types/skills';

export interface SkillCategoryProps {
  category: string;
  skills: ExtractedSkill[];
  onSelect?: (skill: ExtractedSkill) => void;
  defaultExpanded?: boolean;
}

// Color scheme for categories
const CATEGORY_COLORS = {
  technical: {
    bg: '#e3f2fd',
    border: '#2196f3',
    text: '#1565c0',
  },
  tools: {
    bg: '#fff3e0',
    border: '#ff9800',
    text: '#e65100',
  },
  soft: {
    bg: '#e8f5e9',
    border: '#4caf50',
    text: '#2e7d32',
  },
  domain: {
    bg: '#f3e5f5',
    border: '#9c27b0',
    text: '#6a1b9a',
  },
  unknown: {
    bg: '#f5f5f5',
    border: '#9e9e9e',
    text: '#616161',
  },
};

export function SkillCategory({
  category,
  skills,
  onSelect,
  defaultExpanded = true,
}: SkillCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const colors = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.unknown;

  if (!skills || skills.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        marginBottom: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: colors.bg,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(0.95)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: colors.border,
            }}
          />
          <span
            style={{
              fontWeight: 600,
              fontSize: '14px',
              color: colors.text,
              textTransform: 'capitalize',
            }}
          >
            {category}
          </span>
          <span
            style={{
              backgroundColor: colors.border,
              color: 'white',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {skills.length}
          </span>
        </div>
        <span
          style={{
            fontSize: '16px',
            color: colors.text,
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </span>
      </button>

      {/* Skills List */}
      {isExpanded && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {skills.map((skill, index) => (
              <SkillBadge
                key={`${skill.name}-${index}`}
                skill={skill}
                color={colors.text}
                onClick={() => onSelect?.(skill)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SkillBadge Component
 * 
 * Individual skill badge with confidence indicator.
 */

interface SkillBadgeProps {
  skill: ExtractedSkill;
  color: string;
  onClick?: () => void;
}

function SkillBadge({ skill, color, onClick }: SkillBadgeProps) {
  const confidenceColor =
    skill.confidence >= 0.9
      ? '#4caf50'
      : skill.confidence >= 0.7
      ? '#ff9800'
      : '#f44336';

  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        backgroundColor: 'white',
        border: `1px solid ${color}`,
        borderRadius: '16px',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        color: '#333',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = color + '10';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      title={`${skill.original_text} (${Math.round(skill.confidence * 100)}% confidence)`}
    >
      <span>{skill.name}</span>
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: confidenceColor,
        }}
        title={`${Math.round(skill.confidence * 100)}% confidence`}
      />
    </button>
  );
}

export default SkillCategory;
