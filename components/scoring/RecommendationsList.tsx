/**
 * RecommendationsList Component
 * 
 * Displays prioritized recommendations.
 */

import React from 'react';
import type { Recommendation } from '../../types/scoring';

export interface RecommendationsListProps {
  recommendations: Recommendation[];
  onAccept?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const priorityColors = {
  high: '#f44336',
  medium: '#ff9800',
  low: '#4caf50',
};

const effortLabels = {
  low: 'Quick',
  medium: 'Moderate',
  high: 'Involved',
};

export function RecommendationsList({
  recommendations,
  onAccept,
  onDismiss,
}: RecommendationsListProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: '#666',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>✓</div>
        <div>No recommendations - your resume looks great!</div>
      </div>
    );
  }

  // Sort by priority
  const sorted = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

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
        Recommendations ({recommendations.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sorted.map((rec) => (
          <div
            key={rec.id}
            style={{
              border: `1px solid ${priorityColors[rec.priority]}40`,
              borderRadius: '8px',
              padding: '12px',
              backgroundColor: `${priorityColors[rec.priority]}08`,
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
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: priorityColors[rec.priority],
                }}
              />
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {rec.title}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: priorityColors[rec.priority],
                  color: 'white',
                  textTransform: 'capitalize',
                }}
              >
                {rec.priority}
              </span>
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: '13px',
                color: '#666',
                marginBottom: '8px',
              }}
            >
              {rec.description}
            </div>

            {/* Action */}
            <div
              style={{
                fontSize: '13px',
                color: '#333',
                marginBottom: '8px',
                padding: '8px',
                backgroundColor: 'white',
                borderRadius: '4px',
              }}
            >
              <strong>Action:</strong> {rec.action}
            </div>

            {/* Impact & Effort */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                fontSize: '12px',
                color: '#666',
                marginBottom: '12px',
              }}
            >
              <span>
                <strong>Impact:</strong> {rec.impact}
              </span>
              <span>
                <strong>Effort:</strong> {effortLabels[rec.effort]}
              </span>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
              }}
            >
              {onDismiss && (
                <button
                  onClick={() => onDismiss(rec.id)}
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
              {onAccept && (
                <button
                  onClick={() => onAccept(rec.id)}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: priorityColors[rec.priority],
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Mark Done
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecommendationsList;
