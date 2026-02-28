import React from 'react';
import { SimpleResumeData } from '../../types';

interface SkillsSectionProps {
  skills: string[];
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
  onShowCommentPanel: () => void;
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({
  skills,
  onAddSkill,
  onRemoveSkill,
  onShowCommentPanel,
}) => {
  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Skills</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onShowCommentPanel}
            className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors"
            title="Add comment to this section"
          >
            <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
            <span>Add Comment</span>
          </button>
          <span className="text-sm font-medium text-slate-500">{skills.length} skills listed</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
        <label className="text-sm font-bold text-slate-700">Your Skills</label>
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6">
          <div className="flex flex-wrap items-center gap-3">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-bold border border-primary-100"
              >
                {skill}
                <button
                  onClick={() => onRemoveSkill(skill)}
                  className="hover:text-primary-900 ml-1"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="+ Add Skill"
              className="bg-transparent text-sm p-2 focus:ring-0 border-none w-32 placeholder-slate-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onAddSkill(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Tip: List both technical skills (programming languages, tools) and soft skills
          (leadership, communication).
        </p>
      </div>
    </div>
  );
};
