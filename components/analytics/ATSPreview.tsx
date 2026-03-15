import React, { useState } from 'react';

interface ATSPreviewProps {
  parsedText: string;
  originalText?: string;
  wordCount: number;
}

export const ATSPreview: React.FC<ATSPreviewProps> = ({
  parsedText,
  originalText,
  wordCount,
}) => {
  const [viewMode, setViewMode] = useState<'parsed' | 'original'>('parsed');

  const displayText = viewMode === 'parsed' ? parsedText : (originalText || parsedText);

  // Highlight potential issues in parsed text
  const highlightIssues = (text: string): React.ReactNode => {
    if (viewMode !== 'parsed') return text;

    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      // Highlight garbled text (potential image parsing issues)
      if (/[$&%#@*]+/.test(part)) {
        return (
          <mark key={index} className="bg-red-200 px-0.5 rounded" title="Potential parsing error">
            {part}
          </mark>
        );
      }
      // Highlight unusual characters
      if (/[<>{}|\\^`]/.test(part)) {
        return (
          <mark key={index} className="bg-yellow-200 px-0.5 rounded" title="Unusual character">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">ATS Preview</h3>

        <div className="flex items-center space-x-2">
          {/* View mode toggle */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('parsed')}
              className={`px-3 py-1.5 text-sm font-medium rounded-l-md border ${
                viewMode === 'parsed'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Parsed Text
            </button>
            {originalText && (
              <button
                onClick={() => setViewMode('original')}
                className={`px-3 py-1.5 text-sm font-medium rounded-r-md border-t border-b ${
                  viewMode === 'original'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } border-r-0`}
              >
                Original
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center space-x-4 text-sm">
        <span className="text-gray-600">
          <strong className="text-gray-900">{wordCount}</strong> words
        </span>
        <span className="text-gray-600">
          <strong className="text-gray-900">{displayText.length}</strong> characters
        </span>
        {viewMode === 'parsed' && (
          <span className="text-blue-600 font-medium">
            This is how ATS systems see your resume
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
            {highlightIssues(displayText)}
          </pre>
        </div>

        {/* Tips */}
        {viewMode === 'parsed' && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What to look for:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <span className="bg-red-200 px-1 rounded">Red highlights</span> indicate garbled text (often from images)</li>
              <li>• <span className="bg-yellow-200 px-1 rounded">Yellow highlights</span> indicate unusual characters</li>
              <li>• Check if the text order makes sense</li>
              <li>• Verify all sections are present and readable</li>
            </ul>
          </div>
        )}
      </div>

      {/* Screen reader description */}
      <div className="sr-only">
        <p>ATS Preview showing {wordCount} words. {viewMode === 'parsed' ? 'Parsed text as ATS systems would read it.' : 'Original resume text.'}</p>
      </div>
    </div>
  );
};
