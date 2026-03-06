/**
 * @component ResumePreview
 * @description Real-time resume preview component that renders resume data as a preview
 */

import React, { useState, useEffect, useMemo } from 'react';
import { SimpleResumeData } from '../types';

// Refresh indicator duration in milliseconds
const REFRESH_INDICATOR_DURATION = 300;

interface ResumePreviewProps {
  /** The resume data to preview */
  resumeData: SimpleResumeData;
  /** Selected template variant */
  variant?: string;
  /** Zoom level for the preview (0.5 to 2.0) */
  zoom?: number;
  /** Whether to show the preview in split-screen mode */
  splitMode?: boolean;
  /** Callback when PDF is requested */
  onGeneratePDF?: () => void;
  /** Whether PDF generation is in progress */
  isGeneratingPDF?: boolean;
}

/**
 * ResumePreview component for real-time resume preview
 *
 * @example
 * ```tsx
 * <ResumePreview
 *   resumeData={resumeData}
 *   variant="modern"
 *   zoom={1.0}
 *   splitMode={true}
 * />
 * ```
 */
const ResumePreview = React.memo<ResumePreviewProps>(
  ({
    resumeData,
    variant = 'modern',
    zoom = 1.0,
    splitMode = false,
    onGeneratePDF,
    isGeneratingPDF = false,
  }) => {
    const [previewZoom, setPreviewZoom] = useState(zoom);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Debounced refresh indicator
    useEffect(() => {
      setIsRefreshing(true);
      const timer = setTimeout(() => setIsRefreshing(false), REFRESH_INDICATOR_DURATION);
      return () => clearTimeout(timer);
    }, [resumeData]);

    // Format date range
    const formatDateRange = (start: string, end: string, current?: boolean) => {
      const startStr = start || '';
      const endStr = current ? 'Present' : end || '';
      if (startStr && endStr) {
        return `${startStr} - ${endStr}`;
      }
      return startStr || endStr;
    };

    // Memoize the preview content
    const previewContent = useMemo(
      () => (
        <div
          className="bg-white shadow-2xl rounded-sm min-h-[1000px] w-full max-w-[800px] mx-auto"
          style={{
            transform: `scale(${previewZoom})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Header Section */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-8">
            <h1 className="text-3xl font-bold tracking-tight">{resumeData.name || 'Your Name'}</h1>
            {resumeData.role && (
              <p className="text-lg text-slate-300 mt-1 font-medium">{resumeData.role}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-300">
              {resumeData.email && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">mail</span>
                  {resumeData.email}
                </span>
              )}
              {resumeData.phone && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">phone</span>
                  {resumeData.phone}
                </span>
              )}
              {resumeData.location && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">location_on</span>
                  {resumeData.location}
                </span>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8 space-y-6">
            {/* Summary */}
            {resumeData.summary && (
              <section>
                <h2 className="text-lg font-bold text-slate-800 border-b-2 border-primary-500 pb-1 mb-3">
                  Professional Summary
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">{resumeData.summary}</p>
              </section>
            )}

            {/* Experience */}
            {resumeData.experience.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-800 border-b-2 border-primary-500 pb-1 mb-3">
                  Professional Experience
                </h2>
                <div className="space-y-4">
                  {resumeData.experience.map((exp) => (
                    <div key={exp.id} className="border-l-2 border-slate-200 pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-800">{exp.role}</h3>
                          <p className="text-sm text-primary-600 font-medium">{exp.company}</p>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                      {exp.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {exp.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skills */}
            {resumeData.skills.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-800 border-b-2 border-primary-500 pb-1 mb-3">
                  Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-sm px-3 py-1 bg-primary-50 text-primary-700 rounded-full font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            {resumeData.education && resumeData.education.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-800 border-b-2 border-primary-500 pb-1 mb-3">
                  Education
                </h2>
                <div className="space-y-3">
                  {resumeData.education.map((edu) => (
                    <div key={edu.id}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-800">{edu.institution}</h3>
                          <p className="text-sm text-slate-600">
                            {edu.studyType} {edu.area && `in ${edu.area}`}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {formatDateRange(edu.startDate, edu.endDate)}
                        </span>
                      </div>
                      {edu.courses && edu.courses.length > 0 && (
                        <div className="text-xs text-slate-500 mt-1">
                          Relevant Courses: {edu.courses.slice(0, 5).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {resumeData.projects && resumeData.projects.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-800 border-b-2 border-primary-500 pb-1 mb-3">
                  Projects
                </h2>
                <div className="space-y-3">
                  {resumeData.projects.map((proj) => (
                    <div key={proj.id}>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-800">{proj.name}</h3>
                        <span className="text-xs text-slate-500 font-medium">
                          {formatDateRange(proj.startDate, proj.endDate)}
                        </span>
                      </div>
                      {proj.description && (
                        <p className="text-sm text-slate-600 mt-1">{proj.description}</p>
                      )}
                      {proj.url && (
                        <a
                          href={proj.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-600 hover:underline"
                        >
                          {proj.url}
                        </a>
                      )}
                      {proj.roles && proj.roles.length > 0 && (
                        <div className="text-xs text-slate-500 mt-1">
                          Roles: {proj.roles.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      ),
      [resumeData, previewZoom],
    );

    return (
      <div className={`flex flex-col h-full ${splitMode ? 'bg-slate-100' : ''}`}>
        {/* Preview Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Preview</span>
            {isRefreshing && (
              <span className="material-symbols-outlined text-sm text-primary-500 animate-spin">
                sync
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <button
              onClick={() => setPreviewZoom(Math.max(0.5, previewZoom - 0.1))}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
              title="Zoom Out"
            >
              <span className="material-symbols-outlined text-lg">remove</span>
            </button>
            <span className="text-xs font-medium text-slate-600 min-w-[3rem] text-center">
              {Math.round(previewZoom * 100)}%
            </span>
            <button
              onClick={() => setPreviewZoom(Math.min(2.0, previewZoom + 0.1))}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
              title="Zoom In"
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>

            <div className="h-4 w-px bg-slate-300 mx-2"></div>

            {/* PDF Download */}
            {onGeneratePDF && (
              <button
                onClick={onGeneratePDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download PDF"
              >
                <span className="material-symbols-outlined text-sm">
                  {isGeneratingPDF ? 'hourglass_empty' : 'download'}
                </span>
                {isGeneratingPDF ? 'Generating...' : 'PDF'}
              </button>
            )}
          </div>
        </div>

        {/* Preview Canvas */}
        <div className="flex-1 overflow-auto p-6 flex justify-center bg-slate-200/50">
          {previewContent}
        </div>
      </div>
    );
  },
);

export default ResumePreview;
