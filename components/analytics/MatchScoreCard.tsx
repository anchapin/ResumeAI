import React, { useState } from 'react';
import { MatchScoreGauge } from './MatchScoreGauge';
import { ComponentBreakdown } from './ComponentBreakdown';

interface MatchScoreData {
  match_score: number;
  semantic_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  calculation_time_ms?: number;
}

interface MatchScoreCardProps {
  scoreData: MatchScoreData | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  jobTitle?: string;
  companyName?: string;
}

export const MatchScoreCard: React.FC<MatchScoreCardProps> = ({
  scoreData,
  isLoading = false,
  error = null,
  onRetry,
  jobTitle = 'Job Description',
  companyName,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-32 h-32 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Match Calculation Failed
        </h3>
        <p className="text-red-600 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (!scoreData) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">{jobTitle}</h2>
        {companyName && (
          <p className="text-gray-600">{companyName}</p>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gauge */}
        <div className="flex flex-col items-center justify-center">
          <MatchScoreGauge score={scoreData.match_score} size={160} />

          {scoreData.calculation_time_ms && (
            <p className="text-xs text-gray-500 mt-2">
              Calculated in {scoreData.calculation_time_ms}ms
            </p>
          )}
        </div>

        {/* Breakdown */}
        <div>
          <ComponentBreakdown
            semanticScore={scoreData.semantic_score}
            skillsScore={scoreData.skills_score}
            experienceScore={scoreData.experience_score}
            educationScore={scoreData.education_score}
          />
        </div>
      </div>

      {/* Expandable Details */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Show Less' : 'Show Details'}
          <svg
            className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-4 text-sm text-gray-600">
            <p>
              <strong>How this works:</strong> Your resume is compared to the job description
              using AI-powered semantic analysis and keyword matching.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Semantic Similarity (40%):</strong> Overall meaning alignment</li>
              <li><strong>Skills Match (35%):</strong> Required skills you possess</li>
              <li><strong>Experience Match (15%):</strong> Years of experience comparison</li>
              <li><strong>Education Match (10%):</strong> Education level alignment</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
