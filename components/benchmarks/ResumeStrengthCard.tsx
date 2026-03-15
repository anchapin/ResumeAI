import React from 'react';
import { ResumeStrengthResult, SkillsGapAnalysis } from '../../utils/benchmarks-api';

interface ResumeStrengthCardProps {
  result?: ResumeStrengthResult;
  loading?: boolean;
  error?: string | null;
}

export const ResumeStrengthCard: React.FC<ResumeStrengthCardProps> = ({
  result,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-32 bg-gray-200 rounded mb-4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Analysis Failed
        </h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  // Get color based on percentile
  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return 'text-green-600 bg-green-50';
    if (percentile >= 50) return 'text-blue-600 bg-blue-50';
    if (percentile >= 25) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const colorClass = getPercentileColor(result.percentile);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Resume Strength</h3>

      {/* Overall Score */}
      <div className={`rounded-lg p-6 mb-6 ${colorClass}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">Overall Score</p>
            <p className="text-4xl font-bold mt-1">{result.overall_score}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium opacity-80">Percentile</p>
            <p className="text-4xl font-bold mt-1">{result.percentile}%</p>
            <p className="text-sm font-medium mt-1">{result.percentile_label}</p>
          </div>
        </div>
      </div>

      {/* Category Scores */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Breakdown</h4>
        <div className="space-y-3">
          <CategoryBar
            label="Skills Match"
            score={result.category_scores.skills_match}
            color="blue"
          />
          <CategoryBar
            label="Experience"
            score={result.category_scores.experience}
            color="green"
          />
          <CategoryBar
            label="Education"
            score={result.category_scores.education}
            color="purple"
          />
        </div>
      </div>

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Strengths
          </h4>
          <ul className="space-y-1">
            {result.strengths.map((strength, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <span className="text-green-500 mr-2">•</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {result.weaknesses.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Areas for Improvement
          </h4>
          <ul className="space-y-1">
            {result.weaknesses.map((weakness, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                {weakness}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Recommendations
          </h4>
          <ul className="space-y-2">
            {result.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface CategoryBarProps {
  label: string;
  score: number;
  color: 'blue' | 'green' | 'purple';
}

const CategoryBar: React.FC<CategoryBarProps> = ({ label, score, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{score.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

interface SkillsGapCardProps {
  analysis?: SkillsGapAnalysis;
  loading?: boolean;
  error?: string | null;
}

export const SkillsGapCard: React.FC<SkillsGapCardProps> = ({
  analysis,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Skills Gap Analysis Failed
        </h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Skills Gap Analysis
      </h3>

      {/* Gap Summary */}
      <div className={`rounded-lg p-4 mb-6 ${
        analysis.gap_percentage < 30 ? 'bg-green-50 border border-green-200' :
        analysis.gap_percentage < 60 ? 'bg-yellow-50 border border-yellow-200' :
        'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">Skills Gap</p>
            <p className="text-2xl font-bold mt-1">
              {analysis.missing_skills.length} of {analysis.required_skills.length} skills missing
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {100 - Math.round(analysis.gap_percentage)}% Match
            </p>
          </div>
        </div>
      </div>

      {/* Missing Skills */}
      {analysis.missing_skills.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Missing Skills</h4>
          <div className="space-y-2">
            {analysis.missing_skills.map((item, index) => (
              <div
                key={item.skill}
                className={`p-3 rounded-lg border ${
                  item.priority === 'high' ? 'bg-red-50 border-red-200' :
                  item.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${
                      item.priority === 'high' ? 'bg-red-500' :
                      item.priority === 'medium' ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`} />
                    <span className="font-medium text-gray-900">{item.skill}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-500">
                      Demand: {item.demand_score}/100
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      item.priority === 'high' ? 'bg-red-100 text-red-700' :
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)} Priority
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transferable Skills */}
      {analysis.transferable_skills.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Your Relevant Skills ({analysis.transferable_skills.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.transferable_skills.map((item) => (
              <span
                key={item.skill}
                className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full"
              >
                {item.skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Priority Recommendations */}
      {analysis.priority_recommendations.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Priority Actions</h4>
          <ul className="space-y-1">
            {analysis.priority_recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-blue-800">
                • {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
