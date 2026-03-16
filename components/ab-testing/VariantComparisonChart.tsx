import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { VariantComparison } from '../../utils/ab-testing-api';

interface VariantComparisonChartProps {
  data: VariantComparison;
}

export const VariantComparisonChart: React.FC<VariantComparisonChartProps> = ({ data }) => {
  // Prepare data for chart
  const chartData = data.variants.map((variant) => ({
    name: `Variant ${variant.variant_key}`,
    applications: variant.applications,
    interviews: variant.interviews,
    interview_rate: variant.interview_rate,
    fill: variant.variant_key === data.best_variant ? '#22c55e' : '#3b82f6',
  }));

  if (data.variants.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Variant Comparison</h3>
        <div className="text-center py-12 text-gray-500">
          {data.recommendation}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Variant Performance</h3>
        {data.best_variant && (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
            Best: Variant {data.best_variant}
          </span>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              unit="%"
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="applications"
              name="Applications"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="interview_rate"
              name="Interview Rate"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Statistical significance */}
      <div className={`mt-4 p-4 rounded-lg ${
        data.is_significant ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-start space-x-3">
          {data.is_significant ? (
            <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <div>
            <p className={`text-sm font-medium ${data.is_significant ? 'text-green-900' : 'text-gray-900'}`}>
              {data.recommendation}
            </p>
            {data.p_value !== null && (
              <p className="text-xs text-gray-600 mt-1">
                p-value: {data.p_value} | Confidence: {data.confidence !== null ? `${Math.round(data.confidence * 100)}%` : 'N/A'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Performance table */}
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applications</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interviews</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offers</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interview Rate</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer Rate</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.variants
              .sort((a, b) => b.interview_rate - a.interview_rate)
              .map((variant) => (
                <tr key={variant.variant_id} className={variant.variant_key === data.best_variant ? 'bg-green-50' : ''}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    Variant {variant.variant_key}
                    {variant.variant_key === data.best_variant && (
                      <span className="ml-2 text-green-600">✓</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{variant.applications}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{variant.interviews}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{variant.offers}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`font-medium ${
                      variant.interview_rate >= 20 ? 'text-green-600' :
                      variant.interview_rate >= 10 ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      {variant.interview_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {variant.offer_rate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {variant.is_paused ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">Paused</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">Active</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
