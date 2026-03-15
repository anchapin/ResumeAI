import React, { useState, useRef, useEffect } from 'react';
import { ProjectEntry } from '../../types';
import { RichTextEditor } from './RichTextEditor';

interface ProjectItemProps {
  project: ProjectEntry;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    field: keyof ProjectEntry,
    value: ProjectEntry[keyof ProjectEntry],
  ) => void;
}

/**
 * @component
 * @description Project item component for the resume editor
 * Displays a single project entry with expand/collapse functionality
 */
const ProjectItem = React.memo(
  ({ project, isExpanded, onToggleExpand, onDelete, onUpdate }: ProjectItemProps) => {
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
            onClick={() => onToggleExpand(project.id)}
            aria-expanded={isExpanded}
            aria-controls={`proj-content-${project.id}`}
            aria-label={`Expand details for ${project.name}`}
          >
            <div
              className={`p-1 rounded-full transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-slate-100 text-slate-900' : 'text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'}`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                expand_more
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{project.name}</h3>
              <p className="text-sm text-slate-500 font-medium">
                {project.startDate} - {project.endDate}
              </p>
            </div>
          </button>
          <div className="p-6 pl-0 flex items-center gap-2">
            <button
              className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-lg"
              aria-label={`Edit project ${project.name}`}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                edit
              </span>
            </button>

            {isDeleting ? (
              <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 animate-in fade-in zoom-in duration-200">
                <button
                  ref={confirmBtnRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id);
                    setIsDeleting(false);
                  }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  aria-label="Confirm delete"
                >
                  <span
                    className="material-symbols-outlined text-[18px] font-bold"
                    aria-hidden="true"
                  >
                    check
                  </span>
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
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    close
                  </span>
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
                aria-label={`Delete project ${project.name}`}
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  delete
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Card Body (Expanded) */}
        {isExpanded && (
          <div
            id={`proj-content-${project.id}`}
            role="region"
            aria-label={`Project details for ${project.name}`}
            className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 fade-in duration-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pt-4 border-t border-slate-100">
              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor={`proj-name-${project.id}`}
                  className="text-sm font-bold text-slate-700"
                >
                  Project Name
                </label>
                <input
                  id={`proj-name-${project.id}`}
                  type="text"
                  value={project.name}
                  onChange={(e) => onUpdate(project.id, 'name', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor={`proj-desc-${project.id}`}
                  className="text-sm font-bold text-slate-700"
                >
                  Description
                </label>
                <RichTextEditor
                  content={project.description}
                  onChange={(value) => onUpdate(project.id, 'description', value)}
                  placeholder="Describe your project..."
                  minHeight="100px"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor={`proj-url-${project.id}`}
                  className="text-sm font-bold text-slate-700"
                >
                  Project URL
                </label>
                <input
                  id={`proj-url-${project.id}`}
                  type="url"
                  value={project.url || ''}
                  onChange={(e) => onUpdate(project.id, 'url', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`proj-start-${project.id}`}
                  className="text-sm font-bold text-slate-700"
                >
                  Start Date
                </label>
                <input
                  id={`proj-start-${project.id}`}
                  type="text"
                  value={project.startDate}
                  onChange={(e) => onUpdate(project.id, 'startDate', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`proj-end-${project.id}`}
                  className="text-sm font-bold text-slate-700"
                >
                  End Date
                </label>
                <input
                  id={`proj-end-${project.id}`}
                  type="text"
                  value={project.endDate}
                  onChange={(e) => onUpdate(project.id, 'endDate', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700">Roles</label>
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(project.roles || []).map((role, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-md text-xs font-bold border border-primary-100"
                    >
                      {role}
                      <button
                        onClick={() => {
                          const newRoles = (project.roles || []).filter((_, i) => i !== index);
                          onUpdate(project.id, 'roles', newRoles);
                        }}
                        className="hover:text-primary-900"
                        aria-label={`Remove role ${role}`}
                      >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                          close
                        </span>
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="+ Add Role"
                    aria-label="Add new role"
                    title="Press Enter to add"
                    className="bg-transparent text-xs p-1 focus:ring-0 border-none w-24 placeholder-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const role = e.currentTarget.value.trim();
                        if (role) {
                          onUpdate(project.id, 'roles', [...(project.roles || []), role]);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-6">
              <label className="text-sm font-bold text-slate-700">Key Highlights</label>
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
                <div className="flex flex-wrap items-start gap-2">
                  {(project.highlights || []).map((highlight, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs font-bold border border-green-100"
                    >
                      {highlight}
                      <button
                        onClick={() => {
                          const newHighlights = (project.highlights || []).filter(
                            (_, i) => i !== index,
                          );
                          onUpdate(project.id, 'highlights', newHighlights);
                        }}
                        className="hover:text-green-900"
                        aria-label={`Remove highlight ${highlight}`}
                      >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                          close
                        </span>
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="+ Add Highlight"
                    aria-label="Add new highlight"
                    title="Press Enter to add"
                    className="bg-transparent text-xs p-1 focus:ring-0 border-none w-32 placeholder-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const highlight = e.currentTarget.value.trim();
                        if (highlight) {
                          onUpdate(project.id, 'highlights', [
                            ...(project.highlights || []),
                            highlight,
                          ]);
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

export default ProjectItem;
