import React, { useState } from 'react';

interface Requirement {
  id: string;
  text: string;
  category: 'skill' | 'experience' | 'education' | 'other';
  matched: boolean;
  matchScore: number;
}

interface RequirementItemProps {
  requirement: Requirement;
  isMatched: boolean;
}

export const RequirementItem: React.FC<RequirementItemProps> = ({
  requirement,
  isMatched,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'skill':
        return 'bg-blue-100 text-blue-800';
      case 'experience':
        return 'bg-purple-100 text-purple-800';
      case 'education':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusStyles = (): string => {
    return isMatched
      ? 'bg-green-50 border-green-200 hover:bg-green-100'
      : 'bg-red-50 border-red-200 hover:bg-red-100';
  };

  return (
    <div
      className={`border rounded-lg p-3 transition ${getStatusStyles()}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Status icon */}
          <div className="flex items-center space-x-2 mb-2">
            {isMatched ? (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}

            <span className={`font-medium ${isMatched ? 'text-green-900' : 'text-red-900'}`}>
              {isMatched ? 'Matched' : 'Missing'}
            </span>

            {/* Category badge */}
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(requirement.category)}`}>
              {requirement.category}
            </span>
          </div>

          {/* Requirement text */}
          <p className={`text-sm ${isMatched ? 'text-green-800' : 'text-red-800'}`}>
            {requirement.text}
          </p>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-2 p-1 text-gray-400 hover:text-gray-600"
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Match Score:</span>
            <span className="font-medium text-gray-900">{requirement.matchScore}%</span>
          </div>

          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${isMatched ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${requirement.matchScore}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
