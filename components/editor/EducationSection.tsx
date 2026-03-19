import React from 'react';
import { EducationEntry } from '../../types';
import EducationItem from './EducationItem';

interface EducationSectionProps {
  education: EducationEntry[];
  expandedEduId: string | null;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    field: keyof EducationEntry,
    value: EducationEntry[keyof EducationEntry],
  ) => void;
  onAdd: () => void;
  onShowCommentPanel: () => void;
}

export const EducationSection = React.memo<EducationSectionProps>(
  ({ education, expandedEduId, onToggleExpand, onDelete, onUpdate, onAdd, onShowCommentPanel }) => {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Education</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onShowCommentPanel}
              className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors"
              title="Add comment to this section"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                chat_bubble_outline
              </span>
              <span>Add Comment</span>
            </button>
            <span className="text-sm font-medium text-slate-500">
              {education.length} entries listed
            </span>
          </div>
        </div>

        {education.map((edu) => (
          <EducationItem
            key={edu.id}
            edu={edu}
            isExpanded={expandedEduId === edu.id}
            onToggleExpand={onToggleExpand}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}

        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 rounded-xl py-6 text-primary-600 font-bold hover:bg-primary-50/50 hover:border-primary-300 transition-all group"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined group-hover:scale-110 transition-transform"
          >
            add_box
          </span>
          Add Education
        </button>
      </div>
    );
  },
);
