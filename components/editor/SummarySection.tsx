import React from 'react';

interface SummarySectionProps {
  summary: string;
  onUpdate: (summary: string) => void;
  onShowCommentPanel: () => void;
}

export const SummarySection = React.memo<SummarySectionProps>(
  ({ summary, onUpdate, onShowCommentPanel }) => {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Professional Summary</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onShowCommentPanel}
              className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors"
              title="Add comment to this section"
            >
              <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
              <span>Add Comment</span>
            </button>
            <span className="text-sm font-medium text-slate-500">Brief introduction</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
          <label className="text-sm font-bold text-slate-700">Summary</label>
          <textarea
            value={summary}
            onChange={(e) => onUpdate(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 resize-none"
            placeholder="Write a brief professional summary highlighting your experience, skills, and career goals..."
          />
          <p className="text-xs text-slate-500">
            Tip: Keep your summary concise (3-5 sentences) and focused on your unique value
            proposition.
          </p>
        </div>
      </div>
    );
  },
);
