import React, { useState } from 'react';

interface ResumeCoverageItemProps {
  resumeMatch: string;
  requirement: string;
  matchScore: number;
  isMatched: boolean;
}

export const ResumeCoverageItem: React.FC<ResumeCoverageItemProps> = ({
  resumeMatch,
  requirement,
  matchScore,
  isMatched,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Simple keyword highlighting (in production, use more sophisticated highlighting)
  const highlightKeywords = (text: string): React.ReactNode => {
    const keywords = requirement
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 5);

    let highlighted = text;
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      highlighted = highlighted.replace(
        regex,
        '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>'
      );
    });

    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  return (
    <div
      className={`p-3 border rounded-lg transition ${
        isHovered ? 'shadow-md' : ''
      } ${isMatched ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${isMatched ? 'text-green-700' : 'text-yellow-700'}`}>
          {isMatched ? 'Matches requirement' : 'Partial match'}
        </span>
        <span className="text-xs text-gray-500">{matchScore}% similarity</span>
      </div>

      {/* Resume content */}
      <p className="text-sm text-gray-800">
        {highlightKeywords(resumeMatch)}
      </p>

      {/* Edit button (appears on hover) */}
      {isHovered && (
        <div className="mt-2 flex justify-end">
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
            onClick={() => {}}
          >
            Edit in resume
          </button>
        </div>
      )}
    </div>
  );
};
