import React, { useState } from 'react';
import { ATSScoreGauge } from './ATSScoreGauge';
import { ATSIssuesList } from './ATSIssuesList';
import { ATSPreview } from './ATSPreview';

interface ATSIssue {
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  element: string;
  description: string;
  page?: number | null;
  fix: string;
}

interface ATSCheckResult {
  file_type: string;
  ats_score: number;
  is_parseable: boolean;
  word_count: number;
  issues: ATSIssue[];
  parsed_text: string;
  calculation_time_ms: number;
}

interface ATSCheckerCardProps {
  result: ATSCheckResult | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onFixIssue?: (issue: ATSIssue) => void;
}

export const ATSCheckerCard: React.FC<ATSCheckerCardProps> = ({
  result,
  isLoading = false,
  error = null,
  onRetry,
  onFixIssue,
}) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'preview'>('issues');

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center space-x-6">
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
          ATS Check Failed
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

  if (!result) {
    return null;
  }

  // Get score interpretation
  const getScoreInterpretation = (score: number): string => {
    if (score >= 80) return 'Your resume is ATS-friendly and will likely reach the recruiter.';
    if (score >= 50) return 'Your resume may have parsing issues in some ATS systems.';
    if (score >= 20) return 'Your resume has significant parsing problems.';
    return 'Your resume will likely be rejected by ATS systems.';
  };

  const criticalCount = result.issues.filter((i) => i.type === 'CRITICAL').length;
  const warningCount = result.issues.filter((i) => i.type === 'WARNING').length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">ATS Compatibility Check</h2>
        <p className="text-sm text-gray-600 mt-1">
          File type: <strong className="text-gray-900 uppercase">{result.file_type}</strong>
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Score Gauge */}
        <div className="flex flex-col items-center justify-center">
          <ATSScoreGauge score={result.ats_score} size={160} />

          {result.calculation_time_ms && (
            <p className="text-xs text-gray-500 mt-2">
              Analyzed in {result.calculation_time_ms}ms
            </p>
          )}
        </div>

        {/* Summary Stats */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Word Count:</span>
                <span className="font-medium text-gray-900">{result.word_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Parseable:</span>
                <span className={`font-medium ${result.is_parseable ? 'text-green-600' : 'text-red-600'}`}>
                  {result.is_parseable ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Critical Issues:</span>
                <span className="font-medium text-red-600">{criticalCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Warnings:</span>
                <span className="font-medium text-yellow-600">{warningCount}</span>
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-4 ${
            result.ats_score >= 80 ? 'bg-green-50 border border-green-200' :
            result.ats_score >= 50 ? 'bg-yellow-50 border border-yellow-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm ${
              result.ats_score >= 80 ? 'text-green-800' :
              result.ats_score >= 50 ? 'text-yellow-800' :
              'text-red-800'
            }`}>
              {getScoreInterpretation(result.ats_score)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('issues')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'issues'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Issues & Fixes
            {(criticalCount + warningCount) > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                {criticalCount + warningCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ATS Preview
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'issues' ? (
        <ATSIssuesList issues={result.issues} onFixClick={onFixIssue} />
      ) : (
        <ATSPreview
          parsedText={result.parsed_text}
          wordCount={result.word_count}
        />
      )}
    </div>
  );
};
