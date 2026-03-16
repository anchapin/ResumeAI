import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SkillData {
  skill: string;
  count: number;
}

interface SkillsDistributionChartProps {
  data: SkillData[];
  maxSkills?: number;
}

export const SkillsDistributionChart: React.FC<SkillsDistributionChartProps> = ({
  data,
  maxSkills = 15,
}) => {
  // Sort and limit data
  const sortedData = React.useMemo(() => {
    return [...data]
      .sort((a, b) => b.count - a.count)
      .slice(0, maxSkills);
  }, [data, maxSkills]);

  // Color scale based on count
  const getColor = (count: number, maxCount: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return '#3b82f6'; // Blue
    if (ratio > 0.6) return '#60a5fa'; // Light blue
    if (ratio > 0.4) return '#93c5fd'; // Lighter blue
    if (ratio > 0.2) return '#bfdbfe'; // Very light blue
    return '#dbeafe'; // Lightest blue
  };

  const maxCount = sortedData.length > 0 ? sortedData[0].count : 0;

  if (sortedData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills Distribution</h3>
        <div className="text-center py-12 text-gray-500">
          No skills data available from job descriptions.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">In-Demand Skills</h3>
      <p className="text-sm text-gray-600 mb-4">
        Skills most frequently mentioned in your saved job descriptions
      </p>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis
              dataKey="skill"
              type="category"
              stroke="#6b7280"
              tick={{ fontSize: 11, fontWeight: 500 }}
              width={90}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value) => value !== undefined ? [`${value} job postings`, 'Mentions'] : ['', '']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColor(entry.count, maxCount)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top skills summary */}
      <div className="mt-6 flex flex-wrap gap-2">
        {sortedData.slice(0, 5).map((skill) => (
          <span
            key={skill.skill}
            className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full"
          >
            {skill.skill} ({skill.count})
          </span>
        ))}
      </div>
    </div>
  );
};
