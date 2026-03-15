import React, { useState, useEffect } from 'react';
import { ApplicationTrendsChart } from './ApplicationTrendsChart';
import { ApplicationFunnelChart } from './ApplicationFunnelChart';
import { SkillsDistributionChart } from './SkillsDistributionChart';
import {
  getApplicationTrends,
  getApplicationFunnel,
  getInsightsSummary,
  getSkillsDistribution,
  type TrendsResponse,
  type FunnelResponse,
  type InsightsSummary,
  type SkillsResponse,
} from '../../utils/insights-api';

interface InsightsDashboardProps {
  defaultDays?: number;
}

export const InsightsDashboard: React.FC<InsightsDashboardProps> = ({
  defaultDays = 90,
}) => {
  const [days, setDays] = useState(defaultDays);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null);
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [skills, setSkills] = useState<SkillsResponse | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [days]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [trendsData, funnelData, summaryData, skillsData] = await Promise.all([
        getApplicationTrends(days),
        getApplicationFunnel(),
        getInsightsSummary(days),
        getSkillsDistribution(),
      ]);

      setTrends(trendsData);
      setFunnel(funnelData);
      setSummary(summaryData);
      setSkills(skillsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Failed to Load Dashboard
        </h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Insights Dashboard</h2>

        {/* Time range selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Time range:</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Applications"
            value={summary.total_applications.toString()}
            subtitle={`${summary.active_applications} active`}
            color="blue"
          />
          <StatCard
            title="Interview Rate"
            value={`${summary.interview_rate}%`}
            subtitle="Of total applications"
            color="yellow"
          />
          <StatCard
            title="Offer Rate"
            value={`${summary.offer_rate}%`}
            subtitle="Of total applications"
            color="green"
          />
          <StatCard
            title="Avg Salary Range"
            value={
              summary.salary_range.avg_min && summary.salary_range.avg_max
                ? `$${(summary.salary_range.avg_min / 1000).toFixed(0)}k - $${(summary.salary_range.avg_max / 1000).toFixed(0)}k`
                : 'N/A'
            }
            subtitle="Based on posted ranges"
            color="purple"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Trends */}
        {trends && (
          <div className="lg:col-span-2">
            <ApplicationTrendsChart data={trends} days={days} />
          </div>
        )}

        {/* Application Funnel */}
        {funnel && (
          <div>
            <ApplicationFunnelChart data={funnel} />
          </div>
        )}

        {/* Skills Distribution */}
        {skills && (
          <div>
            <SkillsDistributionChart data={skills.skills} />
          </div>
        )}
      </div>

      {/* Top Companies */}
      {summary && summary.top_companies.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Companies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {summary.top_companies.map((company) => (
              <div
                key={company.company_name}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="font-medium text-gray-900 truncate">
                  {company.company_name}
                </p>
                <p className="text-sm text-gray-600">
                  {company.application_count} applications
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Latest: {company.latest_status}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Breakdown */}
      {summary && summary.source_breakdown.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Application Sources
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Applications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Interview Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.source_breakdown
                  .sort((a, b) => b.count - a.count)
                  .map((source) => (
                    <tr key={source.source}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {source.source}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {source.count}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {source.percentage}%
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            source.interview_rate > 20
                              ? 'bg-green-100 text-green-700'
                              : source.interview_rate > 10
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {source.interview_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: 'blue' | 'yellow' | 'green' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${colorClasses[color].replace('bg-', 'text-').split(' ')[1]}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
};
