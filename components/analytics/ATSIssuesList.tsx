import React, { useState } from 'react';

interface ATSIssue {
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  element: string;
  description: string;
  page?: number | null;
  fix: string;
}

interface ATSIssuesListProps {
  issues: ATSIssue[];
  onFixClick?: (issue: ATSIssue) => void;
}

export const ATSIssuesList: React.FC<ATSIssuesListProps> = ({
  issues,
  onFixClick,
}) => {
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  // Group issues by severity
  const criticalIssues = issues.filter((i) => i.type === 'CRITICAL');
  const warningIssues = issues.filter((i) => i.type === 'WARNING');
  const infoIssues = issues.filter((i) => i.type === 'INFO');

  const getSeverityStyles = (type: string): string => {
    switch (type) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200';
      case 'INFO':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (type: string): React.ReactNode => {
    switch (type) {
      case 'CRITICAL':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'WARNING':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'INFO':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const IssueItem: React.FC<{ issue: ATSIssue; index: number }> = ({ issue, index }) => (
    <div
      className={`border rounded-lg mb-3 overflow-hidden ${getSeverityStyles(issue.type)}`}
    >
      <button
        onClick={() => setExpandedIssue(expandedIssue === index ? null : index)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 transition"
        aria-expanded={expandedIssue === index}
      >
        <div className="flex items-center space-x-3">
          {getSeverityIcon(issue.type)}
          <div className="text-left">
            <p className={`font-medium ${
              issue.type === 'CRITICAL' ? 'text-red-900' :
              issue.type === 'WARNING' ? 'text-yellow-900' :
              'text-blue-900'
            }`}>
              {issue.element.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
            {issue.page && (
              <p className="text-xs text-gray-600">Page {issue.page}</p>
            )}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${expandedIssue === index ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expandedIssue === index && (
        <div className="px-4 pb-4">
          <p className={`text-sm mb-3 ${
            issue.type === 'CRITICAL' ? 'text-red-800' :
            issue.type === 'WARNING' ? 'text-yellow-800' :
            'text-blue-800'
          }`}>
            {issue.description}
          </p>

          <div className="bg-white rounded-lg p-3 border">
            <p className="text-sm font-medium text-gray-700 mb-1">How to fix:</p>
            <p className="text-sm text-gray-600">{issue.fix}</p>
          </div>

          {onFixClick && (
            <button
              onClick={() => onFixClick(issue)}
              className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition"
            >
              Apply Fix
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (issues.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-green-800 mb-1">
          No ATS Issues Found!
        </h3>
        <p className="text-green-700">
          Your resume appears to be ATS-friendly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Critical Issues */}
      {criticalIssues.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Critical Issues ({criticalIssues.length})
          </h3>
          <p className="text-sm text-red-700 mb-3">
            These issues will likely cause your resume to be rejected by ATS systems.
          </p>
          {criticalIssues.map((issue, index) => (
            <IssueItem key={`critical-${index}`} issue={issue} index={index} />
          ))}
        </section>
      )}

      {/* Warning Issues */}
      {warningIssues.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Warnings ({warningIssues.length})
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            These issues may cause parsing problems in some ATS systems.
          </p>
          {warningIssues.map((issue, index) => (
            <IssueItem key={`warning-${index}`} issue={issue} index={criticalIssues.length + index} />
          ))}
        </section>
      )}

      {/* Info Issues */}
      {infoIssues.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Suggestions ({infoIssues.length})
          </h3>
          {infoIssues.map((issue, index) => (
            <IssueItem key={`info-${index}`} issue={issue} index={criticalIssues.length + warningIssues.length + index} />
          ))}
        </section>
      )}
    </div>
  );
};
