import React, { useState, useRef, useEffect } from 'react';
import { ResumeMetadata } from '../types';
import { Card, Button } from './ui';

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
    <Card isSelected={isSelected} padding="none">
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
                <span>Last updated {formatDate(resume.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onShare}
              title="Share Resume"
              aria-label="Share Resume"
            >
              <span className="material-symbols-outlined text-[20px]">share</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              title="Edit Resume"
              aria-label="Edit Resume"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDuplicate}
              title="Duplicate Resume"
              aria-label="Duplicate Resume"
            >
              <span className="material-symbols-outlined text-[20px]">content_copy</span>
            </Button>

            {isDeleting ? (
              <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 animate-in fade-in zoom-in duration-200">
                <Button
                  ref={confirmBtnRef}
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setIsDeleting(false);
                  }}
                  className="text-red-600 hover:bg-red-50 p-1.5"
                  aria-label="Confirm delete"
                  title="Confirm Delete"
                >
                  <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                </Button>
                <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleting(false);
                  }}
                  className="p-1.5"
                  aria-label="Cancel delete"
                  title="Cancel Delete"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </Button>
              </div>
            ) : (
              <Button
                ref={deleteBtnRef}
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleting(true);
                }}
                className="hover:text-red-600 hover:bg-red-50"
                title="Delete Resume"
                aria-label="Delete Resume"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </Button>
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
            <span>
              {resume.versionCount} version{resume.versionCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div
            className={`px-2 py-1 rounded-md text-xs font-medium ${
              resume.isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {resume.isPublic ? 'Public' : 'Private'}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ResumeCard;
