import React, { useEffect, useState } from 'react';

interface MatchScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export const MatchScoreGauge: React.FC<MatchScoreGaugeProps> = ({
  score,
  size = 120,
  strokeWidth = 10,
  showLabel = true,
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score on mount and change
  useEffect(() => {
    const duration = 1000;
    const startTime = performance.now();
    const startScore = animatedScore;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentScore = startScore + (score - startScore) * eased;

      setAnimatedScore(currentScore);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  // Calculate color based on score
  const getColor = (score: number): string => {
    if (score < 40) return '#ef4444'; // Red
    if (score < 60) return '#eab308'; // Yellow
    if (score < 80) return '#3b82f6'; // Blue
    return '#22c55e'; // Green
  };

  const color = getColor(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Get score label
  const getScoreLabel = (score: number): string => {
    if (score < 40) return 'Poor Match';
    if (score < 60) return 'Fair Match';
    if (score < 80) return 'Good Match';
    return 'Excellent Match';
  };

  return (
    <div className="inline-flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Match score: ${Math.round(score)}%`}
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
          style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
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
          {Math.round(animatedScore)}%
        </text>

        {/* Label */}
        {showLabel && (
          <text
            x={size / 2}
            y={size / 2 + 15}
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {getScoreLabel(score)}
          </text>
        )}
      </svg>

      {/* Tooltip */}
      <div className="sr-only">
        {score >= 80
          ? 'Excellent match! Your resume closely matches the job requirements.'
          : score >= 60
          ? 'Good match. Consider addressing the missing skills to improve your chances.'
          : score >= 40
          ? 'Fair match. Review the gap analysis to identify key improvements.'
          : 'Poor match. This role may require significantly different skills or experience.'}
      </div>
    </div>
  );
};
