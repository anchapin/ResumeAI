import React from 'react';

interface ComponentBreakdownProps {
  semanticScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
}

interface Component {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export const ComponentBreakdown: React.FC<ComponentBreakdownProps> = ({
  semanticScore,
  skillsScore,
  experienceScore,
  educationScore,
}) => {
  const components: Component[] = [
    {
      name: 'Semantic Similarity',
      score: semanticScore,
      weight: 40,
      description: 'How similar the overall meaning of your resume is to the job description',
    },
    {
      name: 'Skills Match',
      score: skillsScore,
      weight: 35,
      description: 'How many required skills you have vs what the job requires',
    },
    {
      name: 'Experience Match',
      score: experienceScore,
      weight: 15,
      description: 'Whether your years of experience meet the job requirements',
    },
    {
      name: 'Education Match',
      score: educationScore,
      weight: 10,
      description: 'Whether your education level matches the job requirements',
    },
  ];

  const getScoreColor = (score: number): string => {
    if (score < 40) return 'bg-red-500';
    if (score < 60) return 'bg-yellow-500';
    if (score < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="w-full space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Score Breakdown</h3>

      {components.map((component) => (
        <div key={component.name} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700" title={component.description}>
              {component.name}
              <span className="ml-2 text-xs text-gray-500">
                ({component.weight}% weight)
              </span>
            </span>
            <span className="font-medium text-gray-900">{Math.round(component.score)}%</span>
          </div>

          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full ${getScoreColor(component.score)} transition-all duration-500`}
              style={{ width: `${component.score}%` }}
              role="progressbar"
              aria-valuenow={component.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${component.name}: ${Math.round(component.score)}%`}
            />
          </div>
        </div>
      ))}

      {/* Screen reader only description */}
      <div className="sr-only">
        <p>Score breakdown:</p>
        <ul>
          {components.map((c) => (
            <li key={c.name}>
              {c.name}: {Math.round(c.score)}% ({c.weight}% weight) - {c.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
