import React, { useState } from 'react';

type Priority = 'high' | 'medium' | 'low';

interface MissingSkillItemProps {
  skill: string;
  priority: Priority;
  onAddToResume?: (skill: string) => void;
}

export const MissingSkillItem: React.FC<MissingSkillItemProps> = ({
  skill,
  priority,
  onAddToResume,
}) => {
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToResume = () => {
    onAddToResume?.(skill);
    setIsAdded(true);

    // Reset after 2 seconds
    setTimeout(() => setIsAdded(false), 2000);
  };

  const getPriorityStyles = (priority: Priority): string => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: Priority): string => {
    switch (priority) {
      case 'high':
        return 'High Priority';
      case 'medium':
        return 'Medium Priority';
      case 'low':
        return 'Low Priority';
      default:
        return '';
    }
  };

  return (
    <li className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
      <div className="flex items-center space-x-3">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          priority === 'high' ? 'bg-red-200' : 'bg-yellow-200'
        }`}>
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>

        {/* Skill name */}
        <div>
          <span className="font-medium text-gray-900">{skill}</span>
          <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityStyles(priority)}`}>
            {getPriorityLabel(priority)}
          </span>
        </div>
      </div>

      {/* Action button */}
      <button
        onClick={handleAddToResume}
        disabled={isAdded}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
          isAdded
            ? 'bg-green-100 text-green-800 cursor-default'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        aria-label={`Add ${skill} to resume`}
      >
        {isAdded ? '✓ Added' : 'Add to Resume'}
      </button>

      {/* Screen reader priority info */}
      <span className="sr-only">
        Priority: {getPriorityLabel(priority)}
      </span>
    </li>
  );
};
