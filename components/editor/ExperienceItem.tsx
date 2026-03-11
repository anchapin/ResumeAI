import React, { useState, useRef, useEffect } from 'react';
import { WorkExperience } from '../../types';
import { RichTextEditor } from './RichTextEditor';

interface ExperienceItemProps {
  exp: WorkExperience;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    field: keyof WorkExperience,
    value: WorkExperience[keyof WorkExperience],
  ) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
}

/**
 * @component
 * @description Experience item component for the resume editor
 * Displays a single work experience entry with expand/collapse functionality
 */
const ExperienceItem = React.memo(
  ({
    exp,
    isExpanded,
    onToggleExpand,
    onDelete,
    onUpdate,
    onAddTag,
    onRemoveTag,
  }: ExperienceItemProps) => {
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
            className="flex-1 p-6 flex items-center gap-4 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50 transition-colors group"
            onClick={() => onToggleExpand(exp.id)}
            aria-expanded={isExpanded}
            aria-controls={`exp-content-${exp.id}`}
            aria-label={`Expand details for ${exp.role} at ${exp.company}`}
          >
            <div
              className={`p-1 rounded-full transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-slate-100 text-slate-900' : 'text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'}`}
            >
              <span className="material-symbols-outlined">expand_more</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{exp.role}</h3>
              <p className="text-sm text-slate-500 font-medium">
                {exp.company} | {exp.startDate} - {exp.endDate}
              </p>
            </div>
          </button>
          <div className="p-6 pl-0 flex items-center gap-2">
            <button
              className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-lg"
              aria-label={`Edit experience ${exp.role}`}
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>

            {isDeleting ? (
              <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 animate-in fade-in zoom-in duration-200">
                <button
                  ref={confirmBtnRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(exp.id);
                    setIsDeleting(false);
                  }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  aria-label="Confirm delete"
                >
                  <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                <button
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
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleting(true);
                }}
                className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                aria-label={`Delete experience ${exp.role}`}
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Card Body (Expanded) */}
        {isExpanded && (
          <div
            id={`exp-content-${exp.id}`}
            role="region"
            aria-label={`Details for experience ${exp.role}`}
            className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 fade-in duration-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <label
                  htmlFor={`exp-company-${exp.id}`}
                  className="text-sm font-bold text-slate-700"
                >
                  Company Name
                </label>
                <input
                  id={`exp-company-${exp.id}`}
                  type="text"
                  value={exp.company}
                  onChange={(e) => onUpdate(exp.id, 'company', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor={`exp-role-${exp.id}`} className="text-sm font-bold text-slate-700">
                  Job Title
                </label>
                <input
                  id={`exp-role-${exp.id}`}
                  type="text"
                  value={exp.role}
                  onChange={(e) => onUpdate(exp.id, 'role', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`exp-startDate-${exp.id}`}
                  className="text-sm font-bold text-slate-700"
                >
                  Start Date
                </label>
                <input
                  id={`exp-startDate-${exp.id}`}
                  type="text"
                  value={exp.startDate}
                  onChange={(e) => onUpdate(exp.id, 'startDate', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`exp-endDate-${exp.id}`}
                  className="text-sm font-bold text-slate-700"
                >
                  End Date
                </label>
                <input
                  id={`exp-endDate-${exp.id}`}
                  type="text"
                  value={exp.endDate}
                  onChange={(e) => onUpdate(exp.id, 'endDate', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label
                htmlFor={`exp-description-${exp.id}`}
                className="text-sm font-bold text-slate-700"
              >
                Achievements & Responsibilities
              </label>
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
                <RichTextEditor
                  content={exp.description}
                  onChange={(value) => onUpdate(exp.id, 'description', value)}
                  placeholder="Describe your achievements and responsibilities..."
                  minHeight="100px"
                />
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Tags:
                  </span>
                  {exp.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-md text-xs font-bold border border-primary-100"
                    >
                      {tag}
                      <button
                        onClick={() => onRemoveTag(exp.id, tag)}
                        className="hover:text-primary-900"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="+ Add Skill"
                    aria-label="Add new skill tag"
                    title="Press Enter to add"
                    className="bg-transparent text-xs p-1 focus:ring-0 border-none w-24 placeholder-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onAddTag(exp.id, e.currentTarget.value);
                        e.currentTarget.value = '';
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

export default ExperienceItem;
