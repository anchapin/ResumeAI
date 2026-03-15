import React, { useState, useEffect } from 'react';

interface SuggestionsListProps {
  suggestions: string[];
  onAddToResume?: (skill: string) => void;
}

interface SuggestionItem {
  text: string;
  completed: boolean;
  skill?: string;
}

export const SuggestionsList: React.FC<SuggestionsListProps> = ({
  suggestions,
  onAddToResume,
}) => {
  const [items, setItems] = useState<SuggestionItem[]>([]);

  // Load completed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('match-suggestions');
    const completedSkills = stored ? JSON.parse(stored) : [];

    const initialItems: SuggestionItem[] = suggestions.map((suggestion) => {
      // Extract skill name from suggestion text
      const skillMatch = suggestion.match(/'([^']+)'/);
      const skill = skillMatch ? skillMatch[1] : undefined;
      const completed = skill ? completedSkills.includes(skill) : false;

      return {
        text: suggestion,
        completed,
        skill,
      };
    });

    setItems(initialItems);
  }, [suggestions]);

  const toggleCompleted = (index: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], completed: !updated[index].completed };

      // Persist to localStorage
      const completedSkills = updated
        .filter((item) => item.completed && item.skill)
        .map((item) => item.skill!);
      localStorage.setItem('match-suggestions', JSON.stringify(completedSkills));

      return updated;
    });
  };

  const extractSkillFromSuggestion = (suggestion: string): string | undefined => {
    const match = suggestion.match(/'([^']+)'/);
    return match ? match[1] : undefined;
  };

  const handleAddToResume = (skill: string) => {
    onAddToResume?.(skill);

    // Mark as completed
    const index = items.findIndex((item) => item.skill === skill);
    if (index !== -1) {
      toggleCompleted(index);
    }
  };

  const completedCount = items.filter((item) => item.completed).length;
  const progress = suggestions.length > 0 ? (completedCount / suggestions.length) * 100 : 0;

  return (
    <div>
      {/* Progress bar */}
      {suggestions.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">
              {completedCount}/{suggestions.length} completed
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Suggestions list */}
      <ul className="space-y-2">
        {items.map((item, index) => {
          const skill = extractSkillFromSuggestion(item.text);

          return (
            <li
              key={index}
              className={`flex items-start space-x-3 p-3 rounded-lg transition ${
                item.completed ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleCompleted(index)}
                className="mt-0.5 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                aria-label={`Mark suggestion as completed: ${item.text}`}
              />

              {/* Suggestion text */}
              <span
                className={`flex-1 text-sm ${
                  item.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                }`}
              >
                {item.text}
              </span>

              {/* Add to Resume button */}
              {skill && !item.completed && (
                <button
                  onClick={() => handleAddToResume(skill)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Add to Resume
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Empty state */}
      {items.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No suggestions at this time. Your resume looks great!
        </p>
      )}
    </div>
  );
};
