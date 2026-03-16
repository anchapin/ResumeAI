import React, { useRef, useState } from 'react';
import { RequirementItem } from './RequirementItem';
import { ResumeCoverageItem } from './ResumeCoverageItem';

interface Requirement {
  id: string;
  text: string;
  category: 'skill' | 'experience' | 'education' | 'other';
  matched: boolean;
  matchScore: number;
  resumeMatches?: string[];
}

interface ComparisonViewProps {
  jobDescription: string;
  resumeText: string;
  requirements?: Requirement[];
  isLoading?: boolean;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  jobDescription, // Used for future JD parsing
  resumeText,
  requirements = [],
  isLoading = false,
}) => {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [syncEnabled, setSyncEnabled] = useState(true);

  // Handle scroll synchronization
  const handleLeftScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!syncEnabled || !rightRef.current) return;

    const scrollTop = e.currentTarget.scrollTop;
    const scrollHeight = e.currentTarget.scrollHeight - e.currentTarget.clientHeight;
    const scrollRatio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

    const rightScrollHeight = rightRef.current.scrollHeight - rightRef.current.clientHeight;
    rightRef.current.scrollTop = scrollRatio * rightScrollHeight;
  };

  const handleRightScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!syncEnabled || !leftRef.current) return;

    const scrollTop = e.currentTarget.scrollTop;
    const scrollHeight = e.currentTarget.scrollHeight - e.currentTarget.clientHeight;
    const scrollRatio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

    const leftScrollHeight = leftRef.current.scrollHeight - leftRef.current.clientHeight;
    leftRef.current.scrollTop = scrollRatio * leftScrollHeight;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 animate-pulse">
        <div className="h-96 bg-gray-200 rounded-lg" />
        <div className="h-96 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  // Group requirements by status
  const matchedReqs = requirements.filter((r) => r.matched);
  const missingReqs = requirements.filter((r) => !r.matched);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Side-by-Side Comparison
        </h3>

        <div className="flex items-center space-x-4">
          {/* Legend */}
          <div className="flex items-center space-x-2 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
              <span className="text-gray-600">Matched</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
              <span className="text-gray-600">Missing</span>
            </div>
          </div>

          {/* Scroll sync toggle */}
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={(e) => setSyncEnabled(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-600">Sync scroll</span>
          </label>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column: JD Requirements */}
        <div
          ref={leftRef}
          className="h-96 overflow-y-auto border border-gray-200 rounded-lg bg-white"
          onScroll={handleLeftScroll}
        >
          <div className="sticky top-0 bg-blue-50 px-4 py-3 border-b border-blue-200">
            <h4 className="font-semibold text-blue-900">Job Requirements</h4>
            <p className="text-xs text-blue-700 mt-1">
              {matchedReqs.length} of {requirements.length} matched
            </p>
          </div>

          <div className="p-4 space-y-3">
            {/* Missing requirements first (higher priority) */}
            {missingReqs.map((req) => (
              <RequirementItem
                key={req.id}
                requirement={req}
                isMatched={false}
              />
            ))}

            {/* Then matched requirements */}
            {matchedReqs.map((req) => (
              <RequirementItem
                key={req.id}
                requirement={req}
                isMatched={true}
              />
            ))}

            {requirements.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                No requirements extracted. Enter a job description to see comparison.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Resume Coverage */}
        <div
          ref={rightRef}
          className="h-96 overflow-y-auto border border-gray-200 rounded-lg bg-white"
          onScroll={handleRightScroll}
        >
          <div className="sticky top-0 bg-green-50 px-4 py-3 border-b border-green-200">
            <h4 className="font-semibold text-green-900">Your Resume</h4>
            <p className="text-xs text-green-700 mt-1">
              {resumeText.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          <div className="p-4 space-y-3">
            {requirements.map((req) =>
              req.resumeMatches?.map((match, idx) => (
                <ResumeCoverageItem
                  key={`${req.id}-coverage-${idx}`}
                  resumeMatch={match}
                  requirement={req.text}
                  matchScore={req.matchScore}
                  isMatched={req.matched}
                />
              ))
            )}

            {requirements.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                Your resume content will appear here.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Screen reader summary */}
      <div className="sr-only">
        <p>Comparison View Summary:</p>
        <ul>
          <li>{matchedReqs.length} requirements matched in your resume</li>
          <li>{missingReqs.length} requirements not found in your resume</li>
        </ul>
      </div>
    </div>
  );
};
