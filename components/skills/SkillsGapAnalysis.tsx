/**
 * SkillsGapAnalysis Component
 * 
 * Main component for displaying skills gap analysis.
 * Shows gap score, matched skills, missing skills, and recommendations.
 * 
 * @example
 * <SkillsGapAnalysis
 *   jdText={jobDescription}
 *   resumeText={resume}
 *   onClose={handleClose}
 * />
 */

import React from 'react';
import { useSkillsGap } from '../../src/hooks/useSkillsGap';
import { SkillMatchCard } from './SkillMatchCard';
import { MissingSkillItem } from './MissingSkillItem';

export interface SkillsGapAnalysisProps {
  jdText: string;
  resumeText: string;
  onClose?: () => void;
  onAddSkill?: (skill: string) => void;
}

export function SkillsGapAnalysis({
  jdText,
  resumeText,
  onClose,
  onAddSkill,
}: SkillsGapAnalysisProps) {
  const {
    gapScore,
    matchedSkills,
    missingCritical,
    missingPreferred,
    recommendations,
    categoryBreakdown,
    isLoading,
    error,
    analyze,
    clear,
  } = useSkillsGap();

  // Analyze on mount
  React.useEffect(() => {
    if (jdText && resumeText) {
      analyze(jdText, resumeText);
    }
    return () => {
      clear();
    };
  }, [jdText, resumeText]);

  // Calculate grade from score
  const grade = gapScore >= 90 ? 'A' : gapScore >= 80 ? 'B' : gapScore >= 70 ? 'C' : gapScore >= 60 ? 'D' : 'F';
  const gradeColor = gapScore >= 80 ? '#4caf50' : gapScore >= 60 ? '#ff9800' : '#f44336';

  if (isLoading) {
    return (
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e0e0e0',
            borderTopColor: '#2196f3',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <div style={{ fontSize: '14px', color: '#666' }}>
          Analyzing skills gap...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: '#f44336',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
        <div style={{ fontSize: '14px' }}>{error}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
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
            fontSize: '18px',
            fontWeight: 600,
            flex: 1,
          }}
        >
          Skills Gap Analysis
        </h2>
        {onClose && (
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
          >
            ×
          </button>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {/* Gap Score */}
        <div
          style={{
            textAlign: 'center',
            padding: '20px',
            marginBottom: '20px',
            backgroundColor: '#f5f5f5',
            borderRadius: '12px',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: gradeColor,
              marginBottom: '8px',
            }}
          >
            {Math.round(gapScore)}
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: gradeColor,
              marginBottom: '8px',
            }}
          >
            Grade: {grade}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#666',
            }}
          >
            Skills Match Score
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div
            style={{
              marginBottom: '20px',
            }}
          >
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#333',
              }}
            >
              Top Recommendations
            </h3>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    backgroundColor: '#fff3e0',
                    borderRadius: '8px',
                    border: '1px solid #ffe0b2',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      color: '#e65100',
                      marginBottom: '4px',
                    }}
                  >
                    {rec.skill}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                    }}
                  >
                    {rec.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical Missing Skills */}
        {missingCritical.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#f44336',
              }}
            >
              Critical Missing Skills ({missingCritical.length})
            </h3>
            {missingCritical.map((skill, index) => (
              <MissingSkillItem
                key={index}
                skill={skill}
                onAddSuggestion={onAddSkill}
              />
            ))}
          </div>
        )}

        {/* Preferred Missing Skills */}
        {missingPreferred.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#ff9800',
              }}
            >
              Preferred Missing Skills ({missingPreferred.length})
            </h3>
            {missingPreferred.map((skill, index) => (
              <MissingSkillItem
                key={index}
                skill={skill}
                onAddSuggestion={onAddSkill}
              />
            ))}
          </div>
        )}

        {/* Matched Skills */}
        {matchedSkills.length > 0 && (
          <div>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#4caf50',
              }}
            >
              Matched Skills ({matchedSkills.length})
            </h3>
            {matchedSkills.map((match, index) => (
              <SkillMatchCard key={index} match={match} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {matchedSkills.length === 0 &&
          missingCritical.length === 0 &&
          missingPreferred.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#666',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
              <div style={{ fontSize: '14px' }}>
                No skills gap data available
              </div>
            </div>
          )}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default SkillsGapAnalysis;
