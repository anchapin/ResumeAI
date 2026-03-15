import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendDataPoint {
  date: string;
  count: number;
  cumulative: number;
}

interface TrendsResponse {
  applied: TrendDataPoint[];
  interviewing: TrendDataPoint[];
  offers: TrendDataPoint[];
}

interface ApplicationTrendsChartProps {
  data: TrendsResponse;
  days?: number;
}

export const ApplicationTrendsChart: React.FC<ApplicationTrendsChartProps> = ({
  data,
  days = 90,
}) => {
  // Merge data by date
  const mergedData = React.useMemo(() => {
    const dateMap = new Map<string, { date: string; applied: number; interviewing: number; offers: number }>();

    // Initialize all dates from applied data
    data.applied.forEach((point) => {
      dateMap.set(point.date, {
        date: point.date,
        applied: point.count,
        interviewing: 0,
        offers: 0,
      });
    });

    // Add interviewing data
    data.interviewing.forEach((point) => {
      const existing = dateMap.get(point.date);
      if (existing) {
        existing.interviewing = point.count;
      } else {
        dateMap.set(point.date, {
          date: point.date,
          applied: 0,
          interviewing: point.count,
          offers: 0,
        });
      }
    });

    // Add offers data
    data.offers.forEach((point) => {
      const existing = dateMap.get(point.date);
      if (existing) {
        existing.offers = point.count;
      } else {
        dateMap.set(point.date, {
          date: point.date,
          applied: 0,
          interviewing: 0,
          offers: point.count,
        });
      }
    });

    // Convert to array and sort by date
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate totals
  const totals = React.useMemo(() => ({
    applied: data.applied.reduce((sum, p) => sum + p.count, 0),
    interviewing: data.interviewing.reduce((sum, p) => sum + p.count, 0),
    offers: data.offers.reduce((sum, p) => sum + p.count, 0),
  }), [data]);

  if (mergedData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Trends</h3>
        <div className="text-center py-12 text-gray-500">
          No application data available for the selected period.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Application Trends</h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
            <span className="text-gray-600">Applied: {totals.applied}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2" />
            <span className="text-gray-600">Interviewing: {totals.interviewing}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            <span className="text-gray-600">Offers: {totals.offers}</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mergedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelFormatter={(label) => `Date: ${formatDate(label)}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="applied"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Applied"
            />
            <Line
              type="monotone"
              dataKey="interviewing"
              stroke="#eab308"
              strokeWidth={2}
              dot={false}
              name="Interviewing"
            />
            <Line
              type="monotone"
              dataKey="offers"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              name="Offers"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Showing daily application activity over the last {days} days
      </p>
    </div>
  );
};
