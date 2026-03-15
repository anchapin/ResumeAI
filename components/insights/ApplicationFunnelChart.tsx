import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  conversion_rate: number;
}

interface FunnelResponse {
  stages: FunnelStage[];
  total_applications: number;
}

interface ApplicationFunnelChartProps {
  data: FunnelResponse;
}

export const ApplicationFunnelChart: React.FC<ApplicationFunnelChartProps> = ({ data }) => {
  const COLORS = ['#3b82f6', '#8b5cf6', '#eab308', '#22c55e', '#10b981'];

  // Prepare data for chart
  const chartData = data.stages.map((stage, index) => ({
    name: stage.stage,
    count: stage.count,
    percentage: stage.percentage,
    conversion_rate: stage.conversion_rate,
    fill: COLORS[index % COLORS.length],
  }));

  if (data.total_applications === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Funnel</h3>
        <div className="text-center py-12 text-gray-500">
          No application data available.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Funnel</h3>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#6b7280"
              tick={{ fontSize: 12, fontWeight: 500 }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value, name) => {
                if (value === undefined) return ['', ''];
                if (name === 'Count') return [value, 'Applications'];
                if (name === 'Percentage') return [`${value}%`, 'Of Total'];
                if (name === 'Conversion Rate') return [`${value}%`, 'From Previous'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar dataKey="count" name="Applications" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion rates table */}
      <div className="mt-6 grid grid-cols-5 gap-4">
        {data.stages.map((stage, index) => (
          <div
            key={stage.stage}
            className="text-center p-3 rounded-lg"
            style={{ backgroundColor: `${COLORS[index % COLORS.length]}15` }}
          >
            <p className="text-sm font-medium" style={{ color: COLORS[index % COLORS.length] }}>
              {stage.stage}
            </p>
            <p className="text-2xl font-bold text-gray-900">{stage.count}</p>
            <p className="text-xs text-gray-500">{stage.percentage}% of total</p>
            {index > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                {stage.conversion_rate}% conversion
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Total applications: {data.total_applications}
      </p>
    </div>
  );
};
