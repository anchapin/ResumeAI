/**
 * CategoryBreakdown Component
 * 
 * Displays category scores breakdown.
 */

import React from 'react';
import type { CategoryScore } from '../../types/scoring';

export interface CategoryBreakdownProps {
  categories: Record<string, CategoryScore>;
  onSelect?: (category: string) => void;
}

const categoryNames: Record<string, string> = {
  content_quality: 'Content Quality',
  skills_coverage: 'Skills Coverage',
  experience_relevance: 'Experience',
  formatting: 'Formatting',
};

const categoryColors: Record<string, string> = {
  content_quality: '#2196f3',
  skills_coverage: '#4caf50',
  experience_relevance: '#ff9800',
  formatting: '#9c27b0',
};

export function CategoryBreakdown({ categories, onSelect }: CategoryBreakdownProps) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <h3
        style={{
          margin: '0 0 16px',
          fontSize: '16px',
          fontWeight: 600,
        }}
      >
        Category Breakdown
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(categories).map(([key, category]) => (
          <div
            key={key}
            onClick={() => onSelect?.(key)}
            style={{
              cursor: onSelect ? 'pointer' : 'default',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: categoryColors[key] || '#666',
                }}
              >
                {categoryNames[key] || key}
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {category.score.toFixed(0)}
              </span>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                height: '8px',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${category.score}%`,
                  backgroundColor: categoryColors[key] || '#666',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Feedback */}
            {category.feedback && (
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#666',
                  fontStyle: 'italic',
                }}
              >
                {category.feedback}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategoryBreakdown;
