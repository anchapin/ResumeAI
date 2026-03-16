import React from 'react';

interface ATSScoreGaugeProps {
  score: number;
  size?: number;
}

export const ATSScoreGauge: React.FC<ATSScoreGaugeProps> = ({
  score,
  size = 120,
}) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Calculate color based on score
  const getColor = (score: number): string => {
    if (score < 20) return '#ef4444'; // Critical
    if (score < 50) return '#f97316'; // Poor
    if (score < 80) return '#eab308'; // Fair
    return '#22c55e'; // Good
  };

  const color = getColor(score);

  // Get score label
  const getScoreLabel = (score: number): string => {
    if (score < 20) return 'Critical';
    if (score < 50) return 'Poor';
    if (score < 80) return 'Fair';
    return 'Good';
  };

  const getScoreMessage = (score: number): string => {
    if (score < 20) return 'Will likely be rejected by ATS';
    if (score < 50) return 'Significant parsing problems';
    if (score < 80) return 'May have parsing issues';
    return 'ATS-friendly';
  };

  return (
    <div className="inline-flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`ATS compatibility score: ${score}%`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />

        {/* Score text */}
        <text
          x={size / 2}
          y={size / 2 - 10}
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fill={color}
        >
          {score}%
        </text>

        {/* Label */}
        <text
          x={size / 2}
          y={size / 2 + 15}
          textAnchor="middle"
          fontSize="10"
          fill={color}
          fontWeight="600"
        >
          {getScoreLabel(score)}
        </text>

        {/* Message */}
        <text
          x={size / 2}
          y={size / 2 + 30}
          textAnchor="middle"
          fontSize="8"
          fill="#6b7280"
        >
          {getScoreMessage(score)}
        </text>
      </svg>

      {/* Screen reader description */}
      <div className="sr-only">
        <p>ATS Compatibility Score: {score}% - {getScoreLabel(score)}. {getScoreMessage(score)}</p>
      </div>
    </div>
  );
};
