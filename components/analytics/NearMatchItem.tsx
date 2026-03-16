import React, { useState } from 'react';

interface NearMatchItemProps {
  missingSkill: string;
  matchedSkill: string;
  confidence?: number;
}

export const NearMatchItem: React.FC<NearMatchItemProps> = ({
  missingSkill,
  matchedSkill,
  confidence = 0.75,
}) => {
  const [isMarkedCovered, setIsMarkedCovered] = useState(false);

  const handleMarkCovered = () => {
    setIsMarkedCovered(true);
  };

  return (
    <li className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">{missingSkill}</span>
            {' '}may be covered by your experience with{' '}
            <span className="font-medium text-blue-700">{matchedSkill}</span>
          </p>

          {/* Confidence indicator */}
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-xs text-gray-500">Match confidence:</span>
            <div className="flex-1 max-w-xs h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600">
              {Math.round(confidence * 100)}%
            </span>
          </div>

          {/* Actions */}
          {!isMarkedCovered ? (
            <div className="mt-2 flex space-x-2">
              <button
                onClick={handleMarkCovered}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                ✓ Mark as covered
              </button>
              <button
                onClick={() => {}}
                className="text-xs font-medium text-gray-600 hover:text-gray-800"
              >
                + Add anyway
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <span className="text-xs font-medium text-green-600">
                ✓ Marked as covered
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Screen reader description */}
      <span className="sr-only">
        {missingSkill} may be covered by your experience with {matchedSkill}.
        Match confidence: {Math.round(confidence * 100)}%.
      </span>
    </li>
  );
};
