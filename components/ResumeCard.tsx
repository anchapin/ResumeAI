import React, { useState, useRef, useEffect } from 'react';
import { ResumeMetadata } from '../types';

interface ResumeCardProps {
  resume: ResumeMetadata;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onShare: () => void;
}

/**
 * @component
 * @description Resume card component displaying resume information with selection checkbox
 * @param {ResumeCardProps} props - Component properties
 * @returns {JSX.Element} The rendered resume card
 */
const ResumeCard: React.FC<ResumeCardProps> = ({
  resume,
  isSelected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onShare,
}) => {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all duration-200 ${
        isSelected
          ? 'border-primary-500 ring-4 ring-primary-100'
          : 'border-slate-200 hover:border-primary-300 hover:shadow-lg'
      }`}
    >
      <div className="p-5">
        {/* Header with checkbox and actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <label className="relative flex items-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onSelect(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer"
                aria-label={`Select ${resume.title}`}
              />
            </label>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg mb-1">{resume.title}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="material-symbols-outlined text-[16px]">update</span>
                <span>Last updated {formatDate(resume.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onShare}
              className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Share Resume"
              aria-label="Share Resume"
            >
              <span className="material-symbols-outlined text-[20px]">share</span>
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Edit Resume"
              aria-label="Edit Resume"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
            <button
              onClick={onDuplicate}
              className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Duplicate Resume"
              aria-label="Duplicate Resume"
            >
              <span className="material-symbols-outlined text-[20px]">content_copy</span>
            </button>

            {isDeleting ? (
                <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 animate-in fade-in zoom-in duration-200">
                     <button
                        ref={confirmBtnRef}
                        onClick={(e) => { e.stopPropagation(); onDelete(); setIsDeleting(false); }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        aria-label="Confirm delete"
                        title="Confirm Delete"
                     >
                        <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                     </button>
                     <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                     <button
                        onClick={(e) => { e.stopPropagation(); setIsDeleting(false); }}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors"
                        aria-label="Cancel delete"
                        title="Cancel Delete"
                     >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                     </button>
                </div>
             ) : (
                 <button
                    ref={deleteBtnRef}
                    onClick={(e) => { e.stopPropagation(); setIsDeleting(true); }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Resume"
                    aria-label="Delete Resume"
                 >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                 </button>
             )}
          </div>
        </div>

        {/* Tags */}
        {resume.tags && resume.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {resume.tags.slice(0, 4).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md"
              >
                {tag}
              </span>
            ))}
            {resume.tags.length > 4 && (
              <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-md">
                +{resume.tags.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Footer with version count */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="material-symbols-outlined text-[16px]">history</span>
            <span>{resume.version_count} version{resume.version_count !== 1 ? 's' : ''}</span>
          </div>
          <div className={`px-2 py-1 rounded-md text-xs font-medium ${
            resume.is_public
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {resume.is_public ? 'Public' : 'Private'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeCard;
