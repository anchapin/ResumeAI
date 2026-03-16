import React from 'react';
import { MissingSkillItem } from './MissingSkillItem';
import { NearMatchItem } from './NearMatchItem';
import { SuggestionsList } from './SuggestionsList';

interface GapAnalysisProps {
  missingSkills: string[];
  semanticMatches: Record<string, string>;
  suggestions: string[];
  onAddToResume?: (skill: string) => void;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: number;
}

const Section: React.FC<SectionProps> = ({
  title,
  icon,
  children,
  defaultExpanded = true,
  badge,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center space-x-2">
          {icon}
          <span className="font-semibold text-gray-800">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

export const GapAnalysis: React.FC<GapAnalysisProps> = ({
  missingSkills,
  semanticMatches,
  suggestions,
  onAddToResume,
}) => {
  const hasContent = missingSkills.length > 0 ||
                     Object.keys(semanticMatches).length > 0 ||
                     suggestions.length > 0;

  if (!hasContent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-green-800 mb-1">
          Great Match!
        </h3>
        <p className="text-green-700">
          Your resume closely matches the job requirements. No critical gaps detected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Gap Analysis</h3>
      <p className="text-sm text-gray-600">
        Identify missing skills and opportunities to improve your match score.
      </p>

      {/* Missing Skills Section */}
      {missingSkills.length > 0 && (
        <Section
          title="Missing Skills"
          icon={
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          badge={missingSkills.length}
          defaultExpanded={true}
        >
          <p className="text-sm text-gray-600 mb-3">
            These skills are mentioned in the job description but not found in your resume.
          </p>
          <ul className="space-y-2">
            {missingSkills.map((skill, index) => (
              <MissingSkillItem
                key={skill}
                skill={skill}
                priority={index < 3 ? 'high' : 'medium'}
                onAddToResume={onAddToResume}
              />
            ))}
          </ul>
        </Section>
      )}

      {/* Semantic Near-Matches Section */}
      {Object.keys(semanticMatches).length > 0 && (
        <Section
          title="Semantic Matches"
          icon={
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
          badge={Object.keys(semanticMatches).length}
          defaultExpanded={false}
        >
          <p className="text-sm text-gray-600 mb-3">
            These skills from the job description may already be covered by your experience.
          </p>
          <ul className="space-y-2">
            {Object.entries(semanticMatches).map(([missing, matched]) => (
              <NearMatchItem
                key={missing}
                missingSkill={missing}
                matchedSkill={matched}
              />
            ))}
          </ul>
        </Section>
      )}

      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <Section
          title="Actionable Suggestions"
          icon={
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          badge={suggestions.length}
          defaultExpanded={true}
        >
          <SuggestionsList suggestions={suggestions} onAddToResume={onAddToResume} />
        </Section>
      )}

      {/* Screen reader summary */}
      <div className="sr-only">
        <p>Gap Analysis Summary:</p>
        <ul>
          {missingSkills.length > 0 && (
            <li>{missingSkills.length} missing skills detected</li>
          )}
          {Object.keys(semanticMatches).length > 0 && (
            <li>{Object.keys(semanticMatches).length} semantic matches found</li>
          )}
          {suggestions.length > 0 && (
            <li>{suggestions.length} actionable suggestions</li>
          )}
        </ul>
      </div>
    </div>
  );
};
