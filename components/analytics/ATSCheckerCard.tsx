/**
 * ATSCheckerCard Component
 * 
 * Card component for checking ATS compatibility of resumes.
 * Provides file upload, analysis, and results display.
 */

import React, { useCallback, useState, useRef } from 'react';
import { useATSCheck, ATSCheckResult, ATSIssue } from '../../src/hooks/useATSCheck';

// Import UI components - we'll create these
// For now, use basic HTML elements with styling

interface ATSScoreGaugeProps {
  score: number;
}

const ATSScoreGauge: React.FC<ATSScoreGaugeProps> = ({ score }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#eab308'; // yellow
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Poor';
  };

  return (
    <div className="ats-score-gauge" style={{ textAlign: 'center', padding: '1rem' }}>
      <div 
        className="score-circle"
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: `conic-gradient(${getScoreColor(score)} ${score * 3.6}deg, #e5e7eb 0deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 0.5rem',
        }}
      >
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '2rem', fontWeight: 'bold', color: getScoreColor(score) }}>
            {score}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>/100</span>
        </div>
      </div>
      <p style={{ fontWeight: '600', color: getScoreColor(score), marginTop: '0.5rem' }}>
        {getScoreLabel(score)} - ATS Compatible
      </p>
    </div>
  );
};

interface ATSIssuesListProps {
  issues: ATSIssue[];
}

const ATSIssuesList: React.FC<ATSIssuesListProps> = ({ issues }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' };
      case 'WARNING':
        return { bg: '#fffbeb', border: '#f97316', text: '#9a3412' };
      default:
        return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' };
    }
  };

  if (issues.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
        <p>✅ No ATS issues detected! Your resume is well-formatted for ATS systems.</p>
      </div>
    );
  }

  return (
    <div className="ats-issues-list" style={{ padding: '1rem' }}>
      <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
        Issues Found ({issues.length})
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {issues.map((issue, index) => {
          const colors = getSeverityColor(issue.severity || 'INFO');
          return (
            <div
              key={index}
              style={{
                padding: '0.75rem',
                borderRadius: '0.375rem',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: colors.text, textTransform: 'capitalize' }}>
                  {issue.severity?.toLowerCase()}: {issue.type?.replace(/_/g, ' ')}
                </span>
                {issue.page && <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Page {issue.page}</span>}
              </div>
              <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: colors.text }}>
                {issue.description}
              </p>
              {issue.fix && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'white', borderRadius: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#059669' }}>💡 Fix: </span>
                  <span style={{ fontSize: '0.875rem', color: '#065f46' }}>{issue.fix}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ATSPreviewProps {
  text: string;
  wordCount: number;
}

const ATSPreview: React.FC<ATSPreviewProps> = ({ text, wordCount }) => {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="ats-preview" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>ATS Preview</h4>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{wordCount} words</span>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button
          onClick={() => setShowRaw(false)}
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '0.25rem',
            border: 'none',
            background: !showRaw ? '#3b82f6' : '#e5e7eb',
            color: !showRaw ? 'white' : '#374151',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Formatted
        </button>
        <button
          onClick={() => setShowRaw(true)}
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '0.25rem',
            border: 'none',
            background: showRaw ? '#3b82f6' : '#e5e7eb',
            color: showRaw ? 'white' : '#374151',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Raw Text
        </button>
      </div>

      <div
        style={{
          padding: '0.75rem',
          background: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
          maxHeight: '300px',
          overflow: 'auto',
          fontFamily: showRaw ? 'monospace' : 'inherit',
          fontSize: '0.875rem',
          whiteSpace: showRaw ? 'pre-wrap' : 'pre-wrap',
          lineHeight: '1.5',
        }}
      >
        {text || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No text extracted</span>}
      </div>
    </div>
  );
};

interface ATSCheckerCardProps {
  onAnalysisComplete?: (result: ATSCheckResult) => void;
  initialFile?: File;
}

export const ATSCheckerCard: React.FC<ATSCheckerCardProps> = ({ 
  onAnalysisComplete,
  initialFile 
}) => {
  const { result, isLoading, error, checkResume, clearResult } = useATSCheck();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      checkResume(file).then((result) => {
        if (result && onAnalysisComplete) {
          onAnalysisComplete(result);
        }
      });
    }
  }, [checkResume, onAnalysisComplete]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      checkResume(file).then((result) => {
        if (result && onAnalysisComplete) {
          onAnalysisComplete(result);
        }
      });
    }
  }, [checkResume, onAnalysisComplete]);

  const handleBrowseClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    clearResult();
  }, [clearResult]);

  return (
    <div 
      className="ats-checker-card"
      style={{
        padding: '1.5rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>
        📋 ATS Compatibility Check
      </h3>

      {/* File Upload Area */}
      {!result && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? '#3b82f6' : '#d1d5db'}`,
            borderRadius: '0.5rem',
            padding: '2rem',
            textAlign: 'center',
            background: dragActive ? '#eff6ff' : '#f9fafb',
            transition: 'all 0.2s',
            cursor: 'pointer',
          }}
          onClick={handleBrowseClick}
        >
          <input
            ref={inputRef}
            id="resume-file-input"
            aria-label="Resume file input"
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          
          {isLoading ? (
            <div style={{ padding: '2rem' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '3px solid #e5e7eb', 
                borderTopColor: '#3b82f6', 
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem',
              }} />
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Analyzing your resume...
              </p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
              <p style={{ color: '#374151', fontWeight: '500', margin: '0 0 0.25rem' }}>
                Drop your resume here or click to browse
              </p>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
                Supports PDF, DOCX, and TXT files
              </p>
            </>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
        }}>
          <p style={{ color: '#991b1b', margin: 0, fontWeight: '500' }}>❌ {error}</p>
          <button
            onClick={handleClear}
            style={{
              marginTop: '0.5rem',
              padding: '0.25rem 0.75rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* Score */}
            <div style={{
              background: '#f9fafb',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
            }}>
              <ATSScoreGauge score={result.ats_score} />
            </div>
            
            {/* Stats */}
            <div style={{ padding: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                FILE INFO
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: '#6b7280' }}>Type:</span>
                  <span style={{ marginLeft: '0.5rem', fontWeight: '500' }}>{result.file_type?.toUpperCase()}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Words:</span>
                  <span style={{ marginLeft: '0.5rem', fontWeight: '500' }}>{result.word_count}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Parseable:</span>
                  <span style={{ marginLeft: '0.5rem', fontWeight: '500' }}>
                    {result.is_parseable ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Analysis Time:</span>
                  <span style={{ marginLeft: '0.5rem', fontWeight: '500' }}>
                    {result.calculation_time_ms?.toFixed(0)}ms
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Issues */}
          <div style={{ marginBottom: '1rem' }}>
            <ATSIssuesList issues={result.issues || []} />
          </div>

          {/* Preview */}
          <div style={{ marginBottom: '1rem' }}>
            <ATSPreview text={result.parsed_text || ''} wordCount={result.word_count || 0} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={handleClear}
              style={{
                padding: '0.5rem 1rem',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Check Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ATSCheckerCard;
