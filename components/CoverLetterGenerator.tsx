import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import { RichTextEditor } from './editor/RichTextEditor';
import {
  exportCoverLetterToPDF,
  exportCoverLetterToWord,
  exportCoverLetterToTXT,
  exportCoverLetterToMarkdown,
} from '../utils/export';

/**
 * CoverLetterGenerator Component
 * Generates AI-powered cover letters based on resume and job description
 */
const CoverLetterGenerator: React.FC = () => {
  const navigate = useNavigate();
  const {
    resumeData,
    currentJobDescription,
    coverLetter,
    coverLetterTone,
    isGeneratingCoverLetter,
    coverLetterError,
    setCoverLetter,
    setCoverLetterTone,
    setIsGeneratingCoverLetter,
    setCoverLetterError,
    clearCoverLetter,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [companyName, setCompanyName] = useState('');
  const [hiringManager, setHiringManager] = useState('');

  const tones: Array<{ value: 'formal' | 'conversational' | 'enthusiastic'; label: string }> = [
    { value: 'formal', label: 'Formal' },
    { value: 'conversational', label: 'Conversational' },
    { value: 'enthusiastic', label: 'Enthusiastic' },
  ];

  const generateCoverLetter = useCallback(async () => {
    if (!currentJobDescription) {
      setCoverLetterError('No job description provided. Please add a job description first.');
      return;
    }

    // Take a snapshot before AI cover letter generation
    const { takeSnapshot } = useStore.getState();
    takeSnapshot('Before cover letter generation', 'auto-before-ai');

    setIsGeneratingCoverLetter(true);
    setCoverLetterError(null);

    try {
      const response = await fetch('/api/v1/cover-letter/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: resumeData,
          job_description: currentJobDescription,
          tone: coverLetterTone,
          company_name: companyName,
          hiring_manager: hiringManager || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Cover letter generation failed (${response.status})`);
      }

      const data = await response.json();
      setCoverLetter(data.cover_letter);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate cover letter';
      setCoverLetterError(errorMessage);
      // Fallback: generate a local template
      generateLocalTemplate();
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  }, [
    resumeData,
    currentJobDescription,
    coverLetterTone,
    companyName,
    hiringManager,
    setCoverLetter,
    setCoverLetterError,
    setIsGeneratingCoverLetter,
  ]);

  // Fallback local template when API is not available
  const generateLocalTemplate = useCallback(() => {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const greeting = hiringManager
      ? `Dear ${hiringManager},`
      : 'Dear Hiring Manager,';

    const template = `${date}

${greeting}

I am writing to express my strong interest in the position at ${companyName || '[Company Name]'}. With my background in ${resumeData.role || 'the field'}, I believe I would be a valuable addition to your team.

${resumeData.summary || `Throughout my career, I have developed a diverse set of skills that align well with the requirements outlined in your job posting.`}

In my previous roles, I have demonstrated:
${resumeData.experience.slice(0, 2).map(exp => `- ${exp.role || 'Position'} at ${exp.company}`).join('\n')}

${getToneStatement()}

Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience would benefit ${companyName || 'your organization'}.

Sincerely,
${resumeData.name || '[Your Name]'}
${resumeData.email || '[Your Email]'}
`;

    setCoverLetter(template);
  }, [resumeData, companyName, hiringManager, coverLetterTone, setCoverLetter]);

  const getToneStatement = () => {
    switch (coverLetterTone) {
      case 'formal':
        return 'I am eager to contribute my expertise to your organization and would welcome the opportunity to discuss this further.';
      case 'conversational':
        return "I'd love to bring my experience to your team and chat about how I can help make an impact.";
      case 'enthusiastic':
        return "I'm thrilled about the possibility of joining your team and can't wait to bring my passion and skills to the role!";
      default:
        return '';
    }
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'txt' | 'md') => {
    if (!coverLetter) return;

    try {
      switch (format) {
        case 'pdf':
          await exportCoverLetterToPDF(coverLetter);
          break;
        case 'docx':
          await exportCoverLetterToWord(coverLetter);
          break;
        case 'txt':
          await exportCoverLetterToTXT(coverLetter);
          break;
        case 'md':
          await exportCoverLetterToMarkdown(coverLetter);
          break;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export cover letter';
      setCoverLetterError(errorMessage);
    }
  };

  return (
    <div className="cover-letter-generator p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cover Letter Generator</h1>
        <button
          onClick={() => navigate('/editor')}
          className="text-blue-600 hover:text-blue-800"
        >
          Go to Editor
        </button>
      </div>

      {/* Summary Context */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="font-semibold mb-2">Current Context</h2>
        <div className="text-sm text-gray-600">
          <p><strong>Resume:</strong> {resumeData.name || 'Not set'}</p>
          <p><strong>Job Description:</strong> {currentJobDescription ? '✓ Provided' : '✗ Missing'}</p>
        </div>
      </div>

      {/* Tone Selection */}
      <div className="mb-6">
        <label className="block font-medium mb-2">Select Tone</label>
        <div className="flex gap-2">
          {tones.map((tone) => (
            <button
              key={tone.value}
              onClick={() => setCoverLetterTone(tone.value)}
              className={`px-4 py-2 rounded-lg border ${
                coverLetterTone === tone.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tone.label}
            </button>
          ))}
        </div>
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block font-medium mb-2">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., Acme Corp"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block font-medium mb-2">Hiring Manager (Optional)</label>
          <input
            type="text"
            value={hiringManager}
            onChange={(e) => setHiringManager(e.target.value)}
            placeholder="e.g., John Smith"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={generateCoverLetter}
          disabled={isGeneratingCoverLetter || !currentJobDescription}
          className={`px-6 py-3 rounded-lg font-medium ${
            isGeneratingCoverLetter || !currentJobDescription
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isGeneratingCoverLetter ? 'Generating...' : 'Generate Cover Letter'}
        </button>

        {coverLetter && (
          <button
            onClick={clearCoverLetter}
            className="px-6 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error Display */}
      {coverLetterError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{coverLetterError}</p>
        </div>
      )}

      {/* Cover Letter Output */}
      {coverLetter && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-2 ${
                activeTab === 'edit'
                  ? 'bg-white border-b-2 border-blue-600 text-blue-600'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 ${
                activeTab === 'preview'
                  ? 'bg-white border-b-2 border-blue-600 text-blue-600'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Content */}
          <div className="p-4 bg-white">
            {activeTab === 'edit' ? (
              <RichTextEditor
                content={coverLetter}
                onChange={setCoverLetter}
                placeholder="Your cover letter will appear here..."
                minHeight="400px"
              />
            ) : (
              <div className="prose max-w-none whitespace-pre-wrap">
                {coverLetter}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Word Count */}
      {coverLetter && (
        <div className="mt-4 text-sm text-gray-500">
          Word count: {coverLetter.split(/\s+/).filter(Boolean).length}
        </div>
      )}

      {/* Export Options */}
      {coverLetter && (
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Export as PDF
          </button>
          <button
            onClick={() => handleExport('docx')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Export as DOCX
          </button>
          <button
            onClick={() => handleExport('txt')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Export as TXT
          </button>
          <button
            onClick={() => handleExport('md')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Export as Markdown
          </button>
        </div>
      )}
    </div>
  );
};

export default CoverLetterGenerator;
