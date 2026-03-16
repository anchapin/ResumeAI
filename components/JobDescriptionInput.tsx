import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import { ParsedJobDescription } from '../types';

interface JobDescriptionInputProps {
  onComplete?: (jd: string, parsed?: ParsedJobDescription) => void;
}

// Remove local definition - now imported from types.ts

const MIN_JD_LENGTH = 100;

/**
 * JobDescriptionInput Component
 * Allows users to input job descriptions via text paste or URL fetch
 */
const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { 
    currentJobDescription, 
    jobDescriptionUrl, 
    parsedJobDescription,
    setCurrentJobDescription, 
    setJobDescriptionUrl,
    setParsedJobDescription 
  } = useStore();
  
  // Initialize parsed data from store if available
  const [textInput, setTextInput] = useState(currentJobDescription || '');
  const [urlInput, setUrlInput] = useState(jobDescriptionUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'url'>('text');
  // Use store's parsed data if available, otherwise use local state
  const [localParsedData, setLocalParsedData] = useState<ParsedJobDescription | null>(
    parsedJobDescription as ParsedJobDescription | null
  );

  // Derived state for display - prefer local parsed data
  const parsedData = localParsedData || (parsedJobDescription as ParsedJobDescription | null);

  const charCount = textInput.length;
  const isValid = charCount >= MIN_JD_LENGTH;
  const isTooShort = charCount > 0 && charCount < MIN_JD_LENGTH;

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTextInput(value);
    setCurrentJobDescription(value);
    setError(null);
  }, [setCurrentJobDescription]);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrlInput(value);
    setJobDescriptionUrl(value);
    setError(null);
  }, [setJobDescriptionUrl]);

  const fetchJobDescription = useCallback(async () => {
    if (!urlInput.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/jd/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlInput }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to fetch job description (${response.status})`);
      }

      const data = await response.json();
      setTextInput(data.text);
      setCurrentJobDescription(data.text);
      
      // Parse the fetched text - save to both local state and store
      if (data.parsed) {
        const parsed = data.parsed;
        setLocalParsedData(parsed);
        setParsedJobDescription(parsed);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job description';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [urlInput, setCurrentJobDescription]);

  const handleParse = useCallback(() => {
    if (!textInput || !isValid) return;

    // Simple parsing - extract keywords and requirements
    const words = textInput.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    // Common technical terms to look for
    const techKeywords = [
      'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
      'node', 'express', 'django', 'flask', 'sql', 'mysql', 'postgresql', 'mongodb',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'ci/cd', 'devops',
      'agile', 'scrum', 'rest', 'api', 'graphql', 'microservices'
    ];

    const foundKeywords = techKeywords.filter(kw => 
      words.some(w => w.includes(kw) || kw.includes(w))
    );

    // Extract requirements (lines starting with bullet points or numbered lists)
    const lines = textInput.split('\n');
    const requirements = lines
      .filter(line => {
        const trimmed = line.trim();
        return /^[•\-\d.]/.test(trimmed) && trimmed.length > 20;
      })
      .map(line => line.replace(/^[•\-\d.]+\s*/, '').trim())
      .slice(0, 10);

    const parsed: ParsedJobDescription = {
      requirements,
      keywords: [...new Set(foundKeywords)],
      summary: textInput.substring(0, 200) + (textInput.length > 200 ? '...' : ''),
      rawText: textInput,
      // Required fields with empty defaults
      requiredSkills: [],
      preferredSkills: [],
      responsibilities: [],
      qualifications: [],
      benefits: [],
    };

    setLocalParsedData(parsed);
    setParsedJobDescription(parsed);
  }, [textInput, isValid, setParsedJobDescription]);

  const handleContinue = useCallback(() => {
    if (isValid && onComplete) {
      onComplete(textInput, parsedData || undefined);
    }
  }, [textInput, isValid, parsedData, onComplete]);

  const handleTailorResume = useCallback(() => {
    // Save JD to store before navigating
    if (textInput) {
      setCurrentJobDescription(textInput);
    }
    navigate('/tailor');
  }, [textInput, setCurrentJobDescription, navigate]);

  const handleClear = useCallback(() => {
    setTextInput('');
    setUrlInput('');
    setCurrentJobDescription('');
    setJobDescriptionUrl('');
    setLocalParsedData(null);
    setParsedJobDescription(null);
    setError(null);
  }, [setCurrentJobDescription, setJobDescriptionUrl, setParsedJobDescription]);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Enter Job Description
        </h2>
        <p className="text-gray-600">
          Provide a job description to tailor your resume. You can paste text directly or fetch from a URL.
        </p>
      </div>

      {/* Tab Selection */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'text'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Paste Text
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'url'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Fetch from URL
        </button>
      </div>

      {/* Text Input Tab */}
      {activeTab === 'text' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="jd-text" className="block text-sm font-medium text-gray-700 mb-2">
              Job Description Text
            </label>
            <textarea
              id="jd-text"
              value={textInput}
              onChange={handleTextChange}
              placeholder="Paste the job description here..."
              className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y font-mono text-sm"
              aria-describedby="char-count"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span id="char-count" className="text-sm text-gray-500">
              {charCount} characters
              {isTooShort && (
                <span className="text-amber-600 ml-2">
                  (minimum {MIN_JD_LENGTH} required)
                </span>
              )}
              {isValid && (
                <span className="text-green-600 ml-2">✓ Valid</span>
              )}
            </span>
            
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* URL Input Tab */}
      {activeTab === 'url' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="jd-url" className="block text-sm font-medium text-gray-700 mb-2">
              Job Posting URL
            </label>
            <div className="flex gap-2">
              <input
                id="jd-url"
                type="url"
                value={urlInput}
                onChange={handleUrlChange}
                placeholder="https://example.com/job/12345"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={fetchJobDescription}
                disabled={isLoading || !urlInput.trim()}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Supports LinkedIn, Indeed, and other job boards
            </p>
          </div>

          {textInput && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Fetched Content</span>
                <span className="text-sm text-gray-500">{textInput.length} chars</span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-3">
                {textInput.substring(0, 300)}...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <div>
              <p className="text-sm font-medium text-red-800">Failed to fetch job description</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <p className="text-xs text-red-500 mt-2">
                Try pasting the job description text directly instead
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Parsed Data Display */}
      {parsedData && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">Extracted Information</h3>
          
          {parsedData.keywords.length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-medium text-blue-700">Skills & Keywords:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {parsedData.keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {parsedData.requirements && parsedData.requirements.length > 0 && (
            <div>
              <span className="text-xs font-medium text-blue-700">Key Requirements:</span>
              <ul className="mt-1 space-y-1">
                {parsedData.requirements.slice(0, 5).map((req, idx) => (
                  <li key={idx} className="text-xs text-blue-800 flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3 justify-end">
        <button
          type="button"
          onClick={handleParse}
          disabled={!isValid || isLoading}
          className="px-4 py-2 text-blue-600 font-medium rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Parse JD
        </button>
        {isValid && (
          <button
            type="button"
            onClick={handleTailorResume}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Tailor Resume
          </button>
        )}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!isValid || isLoading}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default JobDescriptionInput;