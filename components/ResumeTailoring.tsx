import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, type TailoringChange } from '../store/store';
import type { SimpleResumeData } from '../types';

interface ResumeTailoringProps {
  onComplete?: (tailoredResume: SimpleResumeData) => void;
}

/**
 * ResumeTailoring Component
 * Displays AI-tailored resume changes with accept/reject controls
 */
const ResumeTailoring: React.FC<ResumeTailoringProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const {
    resumeData,
    currentJobDescription,
    parsedJobDescription,
    tailoredResume,
    tailoringChanges,
    isTailoring,
    tailoringError,
    tailoringKeywords,
    tailoringSuggestions,
    setIsTailoring,
    setTailoringError,
    setTailoredResume,
    setTailoringChanges,
    setTailoringKeywords,
    setTailoringSuggestions,
    acceptTailoringChange,
    rejectTailoringChange,
    applyTailoring,
    clearTailoring,
    takeSnapshot,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'changes' | 'preview'>('changes');

  // Auto-analyze keywords when JD changes
  useEffect(() => {
    if (currentJobDescription && !tailoringKeywords.length) {
      // Extract keywords from job description
      const words = currentJobDescription.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3);

      const techKeywords = [
        'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
        'node', 'express', 'django', 'flask', 'sql', 'mysql', 'postgresql', 'mongodb',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'ci/cd', 'devops',
        'agile', 'scrum', 'rest', 'api', 'graphql', 'microservices', 'machine learning',
        'data', 'analytics', 'leadership', 'management', 'communication'
      ];

      const foundKeywords = techKeywords.filter(kw => 
        words.some(w => w.includes(kw) || kw.includes(w))
      );
      
      setTailoringKeywords(foundKeywords);
    }
  }, [currentJobDescription, tailoringKeywords.length, setTailoringKeywords]);

  const generateTailoringChanges = useCallback(async () => {
    if (!currentJobDescription) {
      setTailoringError('No job description provided');
      return;
    }

    // Take a snapshot before AI tailoring
    takeSnapshot('Before AI tailoring', 'auto-before-ai');

    setIsTailoring(true);
    setTailoringError(null);

    try {
      const response = await fetch('/api/v1/tailor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: resumeData,
          job_description: currentJobDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Tailoring failed (${response.status})`);
      }

      const data = await response.json();

      setTailoredResume(data.tailored_resume);
      setTailoringChanges(data.changes || []);
      setTailoringSuggestions(data.suggestions || []);

      if (data.keywords) {
        setTailoringKeywords(data.keywords);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to tailor resume';
      setTailoringError(errorMessage);
      // Fallback: generate local changes if API fails
      generateLocalChanges();
    } finally {
      setIsTailoring(false);
    }
  }, [resumeData, currentJobDescription, setIsTailoring, setTailoringError, setTailoredResume, setTailoringChanges, setTailoringSuggestions, setTailoringKeywords, takeSnapshot]);

  // Fallback local tailoring when API is not available
  const generateLocalChanges = useCallback(() => {
    if (!currentJobDescription || !tailoringKeywords.length) return;

    const changes: TailoringChange[] = [];

    // Generate summary changes
    if (resumeData.summary) {
      const targetRole = (parsedJobDescription?.summary as string)?.split('\n')[0] || '';
      changes.push({
        id: `change-summary-${Date.now()}`,
        type: 'modify',
        section: 'summary',
        field: 'summary',
        originalValue: resumeData.summary,
        newValue: `${resumeData.summary} Experienced with ${tailoringKeywords.slice(0, 3).join(', ')}.`,
        reason: 'Align summary with job requirements',
        accepted: false,
        rejected: false,
        timestamp: new Date(),
      });
    }

    // Generate experience changes
    resumeData.experience.forEach((exp, index) => {
      if (exp.description) {
        const tailoredDescription = enhanceDescription(exp.description, tailoringKeywords);
        if (tailoredDescription !== exp.description) {
          changes.push({
            id: `change-exp-${index}-${Date.now()}`,
            type: 'modify',
            section: 'experience',
            field: String(index),
            originalValue: exp.description,
            newValue: tailoredDescription,
            reason: 'Enhanced with job-relevant keywords',
            accepted: false,
            rejected: false,
            timestamp: new Date(),
          });
        }
      }
    });

    // Generate skills changes
    const existingSkills = resumeData.skills.map(s => s.toLowerCase());
    const missingSkills = tailoringKeywords.filter(kw => !existingSkills.includes(kw.toLowerCase()));

    if (missingSkills.length > 0) {
      const currentSkills = resumeData.skills.join(', ');
      const proposedSkills = [...resumeData.skills, ...missingSkills.slice(0, 5)].join(', ');

      changes.push({
        id: `change-skills-${Date.now()}`,
        type: 'add',
        section: 'skills',
        field: 'skills',
        originalValue: currentSkills,
        newValue: proposedSkills,
        reason: `Add relevant skills from job description: ${missingSkills.slice(0, 3).join(', ')}`,
        accepted: false,
        rejected: false,
        timestamp: new Date(),
      });
    }

    setTailoringChanges(changes);
    setTailoredResume({ ...resumeData });
  }, [currentJobDescription, resumeData, tailoringKeywords, parsedJobDescription, setTailoringChanges, setTailoredResume]);

  const enhanceDescription = (description: string, keywords: string[]): string => {
    // Simple local enhancement - add relevant keywords to experience
    const relevantKeywords = keywords.slice(0, 2);
    if (relevantKeywords.length === 0) return description;
    
    // Check if keywords are already in description
    const descLower = description.toLowerCase();
    const missingKeywords = relevantKeywords.filter(kw => !descLower.includes(kw.toLowerCase()));
    
    if (missingKeywords.length === 0) return description;
    
    // Add keywords naturally to description
    const enhanced = `${description} Strong proficiency in ${missingKeywords.join(' and ')}.`;
    return enhanced;
  };

  const handleAcceptAll = useCallback(() => {
    tailoringChanges.forEach((_, index) => acceptTailoringChange(index));
  }, [tailoringChanges, acceptTailoringChange]);

  const handleRejectAll = useCallback(() => {
    tailoringChanges.forEach((_, index) => rejectTailoringChange(index));
  }, [tailoringChanges, rejectTailoringChange]);

  const handleApply = useCallback(() => {
    applyTailoring();
    if (onComplete && tailoredResume) {
      onComplete(tailoredResume);
    }
    // Navigate to editor after applying
    navigate('/editor');
  }, [applyTailoring, onComplete, tailoredResume, navigate]);

  const handleReset = useCallback(() => {
    clearTailoring();
    navigate('/editor');
  }, [clearTailoring, navigate]);

  // Show loading state
  if (isTailoring) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tailoring Your Resume</h3>
          <p className="text-gray-600">
            Analyzing job description and matching your experience...
          </p>
        </div>
      </div>
    );
  }

  // Show empty state - no JD
  if (!currentJobDescription) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Job Description</h3>
          <p className="text-gray-600 mb-4">
            Please add a job description first to tailor your resume.
          </p>
          <button
            onClick={() => navigate('/jd-input')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Job Description
          </button>
        </div>
      </div>
    );
  }

  // Show error state
  if (tailoringError) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-red-200">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-red-900 mb-2">Tailoring Failed</h3>
          <p className="text-gray-600 mb-4">{tailoringError}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={generateLocalChanges}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Generate Local Changes
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show initial state - ready to generate
  if (!tailoringChanges.length && !tailoredResume) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Tailor Your Resume
          </h2>
          <p className="text-gray-600">
            We'll analyze your resume against the job description and suggest improvements.
          </p>
        </div>

        {/* Keywords detected */}
        {tailoringKeywords.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Keywords Detected</h3>
            <div className="flex flex-wrap gap-2">
              {tailoringKeywords.slice(0, 10).map((kw) => (
                <span
                  key={kw}
                  className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={generateTailoringChanges}
          className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate Tailored Resume
        </button>
      </div>
    );
  }

  // Show changes with accept/reject
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Review Resume Changes
        </h2>
        <p className="text-gray-600">
          Accept or reject each suggested change before applying to your resume.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('changes')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'changes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Changes ({tailoringChanges.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'preview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Preview
        </button>
      </div>

      {/* Changes Tab */}
      {activeTab === 'changes' && (
        <div className="space-y-4">
          {tailoringChanges.map((change, index) => (
            <div
              key={index}
              className={`p-4 border rounded-lg ${
                change.accepted
                  ? 'border-green-200 bg-green-50'
                  : change.accepted === false
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-gray-500 uppercase">
                    {change.section}
                  </span>
                  {change.field && change.section === 'experience' && (
                    <span className="ml-2 text-sm text-gray-400">
                      — Position {parseInt(change.field) + 1}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptTailoringChange(index)}
                    className={`px-3 py-1 text-sm rounded ${
                      change.accepted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-green-100'
                    }`}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectTailoringChange(index)}
                    className={`px-3 py-1 text-sm rounded ${
                      change.accepted === false
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-red-100'
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-sm text-gray-400 mb-1">Original:</div>
                <p className="text-gray-700 text-sm bg-gray-100 p-2 rounded">
                  {change.original}
                </p>
              </div>

              <div className="mb-3">
                <div className="text-sm text-gray-400 mb-1">Proposed:</div>
                <p className="text-gray-900 text-sm bg-blue-50 p-2 rounded font-medium">
                  {change.proposed}
                </p>
              </div>

              <div className="text-sm text-gray-500">
                <span className="font-medium">Reason:</span> {change.reason}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && tailoredResume && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
            <div className="p-3 bg-gray-50 rounded text-sm">
              {tailoredResume.summary || resumeData.summary}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {tailoredResume.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Experience</h3>
            {tailoredResume.experience.map((exp, index) => (
              <div key={index} className="mb-4 p-3 bg-gray-50 rounded">
                <div className="font-medium">{exp.role}</div>
                <div className="text-sm text-gray-600">{exp.company}</div>
                <div className="mt-2 text-sm">{exp.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {tailoringSuggestions.length > 0 && activeTab === 'changes' && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">Suggestions</h3>
          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
            {tailoringSuggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3 justify-end">
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleAcceptAll}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          Accept All
        </button>
        <button
          onClick={handleRejectAll}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          Reject All
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
};

export default ResumeTailoring;