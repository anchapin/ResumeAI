import React from 'react';
import { WorkExperience } from '../../types';
import ExperienceItem from '../ExperienceItem';

interface ExperienceSectionProps {
  experiences: WorkExperience[];
  expandedExpId: string | null;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    field: keyof WorkExperience,
    value: WorkExperience[keyof WorkExperience],
  ) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onAdd: () => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string) => void;
  draggedItemId: string | null;
  dragOverItemId: string | null;
  onShowCommentPanel: () => void;
}

export const ExperienceSection = React.memo<ExperienceSectionProps>(
  ({
    experiences,
    expandedExpId,
    onToggleExpand,
    onDelete,
    onUpdate,
    onAddTag,
    onRemoveTag,
    onAdd,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    draggedItemId,
    dragOverItemId,
    onShowCommentPanel,
  }) => {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Work Experience</h2>
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
              {experiences.length} positions listed
            </span>
          </div>
        </div>

        {experiences.length > 1 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              drag_indicator
            </span>
            <span>Drag and drop to reorder experience entries</span>
          </div>
        )}

        {experiences.map((exp) => (
          <div
            key={exp.id}
            draggable
            onDragStart={() => onDragStart(exp.id)}
            onDragOver={(e) => onDragOver(e, exp.id)}
            onDragEnd={onDragEnd}
            onDrop={() => onDrop(exp.id)}
            className={`transition-all duration-200 ${
              draggedItemId === exp.id ? 'opacity-50 scale-[0.98]' : ''
            } ${dragOverItemId === exp.id ? 'ring-2 ring-primary-400 ring-offset-2 rounded-xl' : ''}`}
          >
            <ExperienceItem
              exp={exp}
              isExpanded={expandedExpId === exp.id}
              onToggleExpand={onToggleExpand}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
            />
          </div>
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
          Add New Work Experience
        </button>
      </div>
    );
  },
);
