import React, { useState, useRef, useEffect } from 'react';
import { EducationEntry } from '../../types';

interface EducationItemProps {
  edu: EducationEntry;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, field: keyof EducationEntry, value: any) => void;
}

/**
 * @component
 * @description Education item component for the resume editor
 * Displays a single education entry with expand/collapse functionality
 */
const EducationItem = React.memo(
  ({ edu, isExpanded, onToggleExpand, onDelete, onUpdate }: EducationItemProps) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const deleteBtnRef = useRef<HTMLButtonElement>(null);
    const confirmBtnRef = useRef<HTMLButtonElement>(null);
    const prevIsDeleting = useRef(isDeleting);

    useEffect(() => {
      if (isDeleting && !prevIsDeleting.current) {
        confirmBtnRef.current?.focus();
      } else if (!isDeleting && prevIsDeleting.current) {
        deleteBtnRef.current?.focus();
      }
      prevIsDeleting.current = isDeleting;
    }, [isDeleting]);

    return (
      <div
        className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${
          isExpanded
            ? 'border-primary-200 shadow-md ring-1 ring-primary-100'
            : 'border-slate-200 opacity-80 hover:opacity-100'
        }`}
      >
        {/* Card Header */}
        <div className="flex items-start">
          <button
            data-testid={`edu-header-${edu.id}`}
            className="flex-1 p-6 flex items-center gap-4 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50 transition-colors group"
            onClick={() => onToggleExpand(edu.id)}
            aria-expanded={isExpanded}
            aria-controls={`edu-content-${edu.id}`}
            aria-label={`Expand details for ${edu.institution}`}
          >
            <div
              className={`p-1 rounded-full transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-slate-100 text-slate-900' : 'text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'}`}
            >
              <span className="material-symbols-outlined">expand_more</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{edu.institution}</h3>
              <p className="text-sm text-slate-500 font-medium">
                {edu.studyType} in {edu.area} | {edu.startDate} - {edu.endDate}
              </p>
            </div>
          </button>
          <div className="p-6 pl-0 flex items-center gap-2">
            <button
              className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-lg"
              aria-label="Edit education"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>

            {isDeleting ? (
              <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 animate-in fade-in zoom-in duration-200">
                <button
                  ref={confirmBtnRef}
                  data-testid={`edu-confirm-delete-${edu.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(edu.id);
                    setIsDeleting(false);
                  }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  aria-label="Confirm delete"
                >
                  <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                <button
                  data-testid={`edu-cancel-delete-${edu.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleting(false);
                  }}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors"
                  aria-label="Cancel delete"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <button
                ref={deleteBtnRef}
                data-testid={`edu-delete-${edu.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleting(true);
                }}
                className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                aria-label="Delete education"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Card Body (Expanded) */}
        {isExpanded && (
          <div
            id={`edu-content-${edu.id}`}
            role="region"
            aria-label={`Details for ${edu.institution}`}
            className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 fade-in duration-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <label
                  htmlFor={`edu-institution-${edu.id}`}
                  className="text-sm font-bold text-slate-700"
                >
                  Institution
                </label>
                <input
                  id={`edu-institution-${edu.id}`}
                  data-testid={`edu-institution-${edu.id}`}
                  type="text"
                  value={edu.institution}
                  onChange={(e) => onUpdate(edu.id, 'institution', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`edu-studyType-${edu.id}`}
                  className="text-sm font-bold text-slate-700"
                >
                  Degree Type
                </label>
                <input
                  id={`edu-studyType-${edu.id}`}
                  data-testid={`edu-studyType-${edu.id}`}
                  type="text"
                  value={edu.studyType}
                  onChange={(e) => onUpdate(edu.id, 'studyType', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor={`edu-area-${edu.id}`} className="text-sm font-bold text-slate-700">
                  Field of Study
                </label>
                <input
                  id={`edu-area-${edu.id}`}
                  data-testid={`edu-area-${edu.id}`}
                  type="text"
                  value={edu.area}
                  onChange={(e) => onUpdate(edu.id, 'area', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="space-y-2"></div>
              <div className="space-y-2">
                <label
                  htmlFor={`edu-startDate-${edu.id}`}
                  className="text-sm font-bold text-slate-700"
                >
                  Start Date
                </label>
                <input
                  id={`edu-startDate-${edu.id}`}
                  data-testid={`edu-startDate-${edu.id}`}
                  type="text"
                  value={edu.startDate}
                  onChange={(e) => onUpdate(edu.id, 'startDate', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`edu-endDate-${edu.id}`}
                  className="text-sm font-bold text-slate-700"
                >
                  End Date
                </label>
                <input
                  id={`edu-endDate-${edu.id}`}
                  data-testid={`edu-endDate-${edu.id}`}
                  type="text"
                  value={edu.endDate}
                  onChange={(e) => onUpdate(edu.id, 'endDate', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700">Relevant Courses</label>
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(edu.courses || []).map((course, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-md text-xs font-bold border border-primary-100"
                    >
                      {course}
                      <button
                        onClick={() => {
                          const newCourses = (edu.courses || []).filter((_, i) => i !== index);
                          onUpdate(edu.id, 'courses', newCourses);
                        }}
                        className="hover:text-primary-900"
                        aria-label={`Remove course ${course}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="+ Add Course"
                    aria-label="Add new course"
                    title="Press Enter to add"
                    className="bg-transparent text-xs p-1 focus:ring-0 border-none w-28 placeholder-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const course = e.currentTarget.value.trim();
                        if (course) {
                          onUpdate(edu.id, 'courses', [...(edu.courses || []), course]);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default EducationItem;
