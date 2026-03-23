/**
 * ATSOptimizerCard Component
 * 
 * Card component for ATS-aware job matching and optimization suggestions.
 */

import React, { useState, useCallback } from 'react';


interface ATSAwareScore {
  base_match_score: number;
  ats_factor: number;
  adjusted_score: number;
  confidence: string;
  recommendations: string[];
}


interface ATSOptimizerCardProps {
  initialAtsScore?: number;
  onOptimizeComplete?: (result: ATSAwareScore) => void;
}

// Simulated ATS optimizer - in production this would call an API endpoint
const optimizeForJob = async (
  jobDescription: string,
  resumeData: Record<string, unknown>,
  atsScore: number,
  baseMatchScore: number
): Promise<ATSAwareScore> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Calculate ATS factor based on score
  let atsFactor = 1.0;
  let confidence = 'high';
  
  if (atsScore >= 80) {
    atsFactor = 1.0;
    confidence = 'high';
  } else if (atsScore >= 60) {
    atsFactor = 0.95;
    confidence = 'high';
  } else if (atsScore >= 50) {
    atsFactor = 0.85;
    confidence = 'medium';
  } else if (atsScore >= 20) {
    atsFactor = 0.7;
    confidence = 'low';
  } else {
    atsFactor = 0.5;
    confidence = 'very_low';
  }
  
  const adjustedScore = baseMatchScore * atsFactor;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (atsScore < 60) {
    if (atsScore < 20) {
      recommendations.push(
        "⚠️ Your resume has critical ATS issues. Fix them before applying - the resume may not be parsed correctly."
      );
    } else {
      recommendations.push(
        "📄 Improve ATS compatibility to increase your chances. Consider regenerating your resume in a simpler format."
      );
    }
  }
  
  if (baseMatchScore < 50) {
    recommendations.push(
      "🎯 Low match score - tailor your resume more specifically to this job description."
    );
  } else if (baseMatchScore < 70) {
    recommendations.push(
      "✏️ Consider adding more keywords from the job description to improve your match score."
    );
  }
  
  if (atsScore < 50 && baseMatchScore < 60) {
    recommendations.push(
      "💡 Both ATS compatibility and job match need improvement. Fix the resume format first, then tailor content."
    );
  }
  
  if (atsScore >= 80 && baseMatchScore >= 70) {
    recommendations.push(
      "✅ Great! Your resume is ATS-friendly and well-matched to this job."
    );
  }
  
  return {
    base_match_score: baseMatchScore,
    ats_factor: atsFactor,
    adjusted_score: Math.round(adjustedScore * 100) / 100,
    confidence,
    recommendations,
  };
};


const ATSOptimizerCard: React.FC<ATSOptimizerCardProps> = ({
  initialAtsScore = 0,
  onOptimizeComplete,
}) => {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeData, setResumeData] = useState<Record<string, unknown>>({});
  const [atsScore, setAtsScore] = useState(initialAtsScore);
  const [baseMatchScore, setBaseMatchScore] = useState(50);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<ATSAwareScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = useCallback(async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      const optimizationResult = await optimizeForJob(
        jobDescription,
        resumeData,
        atsScore || initialAtsScore,
        baseMatchScore
      );
      setResult(optimizationResult);
      if (onOptimizeComplete) {
        onOptimizeComplete(optimizationResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setIsOptimizing(false);
    }
  }, [jobDescription, resumeData, atsScore, initialAtsScore, baseMatchScore, onOptimizeComplete]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return '#22c55e';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#f97316';
      default:
        return '#ef4444';
    }
  };

  const getScoreChange = () => {
    if (!result) return null;
    const change = result.adjusted_score - result.base_match_score;
    if (change > 0) {
      return { text: `+${change.toFixed(1)}`, color: '#22c55e', arrow: '↑' };
    } else if (change < 0) {
      return { text: change.toFixed(1), color: '#ef4444', arrow: '↓' };
    }
    return { text: '0', color: '#6b7280', arrow: '→' };
  };

  return (
    <div
      style={{
        padding: '1.5rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>
        🎯 ATS-Aware Job Match Optimizer
      </h3>

      {/* Input Section */}
      <div style={{ marginBottom: '1rem' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            fontSize: '0.875rem',
            color: '#374151',
          }}
        >
          Job Description
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here..."
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* ATS Score Input */}
      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="ats-score-input"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            fontSize: '0.875rem',
            color: '#374151',
          }}
        >
          Current ATS Score (0-100)
        </label>
        <input
          id="ats-score-input"
          type="number"
          min="0"
          max="100"
          value={atsScore}
          onChange={(e) => setAtsScore(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
          }}
        />
      </div>

      {/* Base Match Score Input */}
      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="base-match-score-input"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            fontSize: '0.875rem',
            color: '#374151',
          }}
        >
          Base Job Match Score (0-100)
        </label>
        <input
          id="base-match-score-input"
          type="number"
          min="0"
          max="100"
          value={baseMatchScore}
          onChange={(e) => setBaseMatchScore(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
          }}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: '0.75rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
          }}
        >
          <p style={{ color: '#991b1b', margin: 0, fontSize: '0.875rem' }}>❌ {error}</p>
        </div>
      )}

      {/* Optimize Button */}
      <button
        type="button"
        onClick={handleOptimize}
        disabled={isOptimizing}
        aria-label="Optimize for Job"
        style={{
          width: '100%',
          padding: '0.75rem',
          background: isOptimizing ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          fontWeight: '600',
          cursor: isOptimizing ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {isOptimizing ? (
          <span>
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '0.5rem',
              }}
            />
            Analyzing...
          </span>
        ) : (
          '🚀 Optimize for Job'
        )}
      </button>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Results Section */}
      {result && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '600' }}>Optimization Results</h4>

          {/* Score Comparison */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            {/* Base Score */}
            <div
              style={{
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '0.375rem',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>
                Base Match
              </p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#374151' }}>
                {result.base_match_score.toFixed(1)}
              </p>
            </div>

            {/* Adjusted Score */}
            <div
              style={{
                padding: '1rem',
                background: '#f0fdf4',
                borderRadius: '0.375rem',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>
                ATS-Adjusted
              </p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>
                {result.adjusted_score.toFixed(1)}
              </p>
            </div>
          </div>

          {/* Score Change Indicator */}
          {getScoreChange() && (
            <div
              style={{
                textAlign: 'center',
                padding: '0.5rem',
                background: getScoreChange()!.color === '#22c55e' ? '#f0fdf4' :
                           getScoreChange()!.color === '#ef4444' ? '#fef2f2' : '#f9fafb',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
              }}
            >
              <span style={{ fontSize: '1.25rem', marginRight: '0.25rem' }}>{getScoreChange()!.arrow}</span>
              <span style={{ fontWeight: '600', color: getScoreChange()!.color }}>
                {getScoreChange()!.text} points
              </span>
              <span style={{ color: '#6b7280', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                (ATS Factor: {result.ats_factor.toFixed(2)})
              </span>
            </div>
          )}

          {/* Confidence Badge */}
          <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                background: getConfidenceColor(result.confidence) + '20',
                color: getConfidenceColor(result.confidence),
              }}
            >
              {result.confidence.replace('_', ' ')} confidence
            </span>
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div>
              <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                💡 Recommendations
              </h5>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#4b5563' }}>
                {result.recommendations.map((rec, index) => (
                  <li key={index} style={{ marginBottom: '0.5rem' }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ATSOptimizerCard;
