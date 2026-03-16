import React from 'react';
import { SalaryEstimate, SalaryRange } from '../../utils/benchmarks-api';

interface SalaryEstimatorProps {
  estimate?: SalaryEstimate;
  range?: SalaryRange;
  loading?: boolean;
  error?: string | null;
}

export const SalaryEstimator: React.FC<SalaryEstimatorProps> = ({
  estimate,
  range,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Salary Estimate Failed
        </h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!estimate && !range) {
    return null;
  }

  const formatSalary = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount}`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Estimate</h3>

      {estimate && (
        <div className="mb-6">
          <div className="flex items-baseline space-x-2 mb-2">
            <span className="text-3xl font-bold text-gray-900">
              {formatSalary(estimate.salary_min)} - {formatSalary(estimate.salary_max)}
            </span>
            <span className="text-gray-500">/year</span>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            Median: <span className="font-medium text-gray-900">{formatSalary(estimate.salary_median)}</span>
          </p>

          <div className="flex items-center space-x-4 text-sm">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              estimate.confidence === 'high' ? 'bg-green-100 text-green-700' :
              estimate.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {estimate.confidence.charAt(0).toUpperCase() + estimate.confidence.slice(1)} Confidence
            </span>
            {estimate.source && (
              <span className="text-gray-500">Source: {estimate.source}</span>
            )}
          </div>
        </div>
      )}

      {range && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">By Experience Level</h4>
          <div className="space-y-2">
            {Object.entries(range.ranges).map(([level, data]) => (
              <div
                key={level}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {level}
                </span>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {formatSalary(data.median)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({formatSalary(data.min)} - {formatSalary(data.max)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 mt-4">
        Salary estimates are based on industry data from Levels.fyi, BLS OES, and other sources.
        Actual salaries may vary based on location, company size, and individual qualifications.
      </p>
    </div>
  );
};
