/**
 * ResumeScoreCard Component
 * 
 * Displays overall resume score with grade.
 */

import React from 'react';
import type { ResumeScore } from '../../types/scoring';

export interface ResumeScoreCardProps {
  score: ResumeScore;
  previousScore?: number;
  onImprove?: () => void;
}

const gradeColors = {
  A: '#4caf50',
  B: '#8bc34a',
  C: '#ff9800',
  D: '#f44336',
  F: '#d32f2f',
};

export function ResumeScoreCard({ score, previousScore, onImprove }: ResumeScoreCardProps) {
  const gradeColor = gradeColors[score.grade];
  const improvement = previousScore ? score.overall - previousScore : 0;

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
      }}
    >
      {/* Score Circle */}
      <div
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          border: `6px solid ${gradeColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: gradeColor,
            }}
          >
            {score.overall}
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#666',
            }}
          >
            Grade: {score.grade}
          </div>
        </div>
      </div>

      {/* Improvement Indicator */}
      {previousScore !== undefined && (
        <div
          style={{
            marginBottom: '16px',
            fontSize: '14px',
            color: improvement >= 0 ? '#4caf50' : '#f44336',
          }}
        >
          {improvement >= 0 ? '↑' : '↓'} {Math.abs(improvement).toFixed(1)} points
          {improvement >= 0 ? ' improvement' : ' decline'}
        </div>
      )}

      {/* Percentile */}
      {score.percentile && (
        <div
          style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '16px',
          }}
        >
          Top {100 - score.percentile}% of resumes
        </div>
      )}

      {/* Improve Button */}
      {onImprove && (
        <button
          onClick={onImprove}
          style={{
            padding: '10px 24px',
            backgroundColor: gradeColor,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          See Recommendations
        </button>
      )}
    </div>
  );
}

export default ResumeScoreCard;
