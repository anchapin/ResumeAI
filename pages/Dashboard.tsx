import React, { useState, useEffect } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';
import { JobApplication } from '../types';
import StatusBadge from '../components/StatusBadge';
import {
  getApplicationStats,
  getApplicationFunnel,
  listJobApplications,
  ApplicationStats,
  ApplicationFunnel,
} from '../utils/api-client';

/**
 * @component
 * @description Dashboard page component showing job search overview with statistics and charts
 * @returns {JSX.Element} The rendered dashboard page component
 *
 * @example
 * ```tsx
 * <Dashboard />
 * ```
 */
const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [funnel, setFunnel] = useState<ApplicationFunnel | null>(null);
  const [recentApps, setRecentApps] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsData, funnelData, appsData] = await Promise.all([
        getApplicationStats(30),
        getApplicationFunnel(30),
        listJobApplications(undefined, 10, 0),
      ]);
      setStats(statsData);
      setFunnel(funnelData);
      setRecentApps(
        appsData.map((app) => {
          let mappedStatus: 'Applied' | 'Interview' | 'Offer' | 'Rejected' = 'Applied';
          if (app.status === 'interviewing') mappedStatus = 'Interview';
          else if (app.status === 'offer') mappedStatus = 'Offer';
          else if (app.status === 'rejected') mappedStatus = 'Rejected';

          return {
            id: String(app.id),
            company: app.company_name,
            role: app.job_title,
            status: mappedStatus,
            dateApplied: new Date(app.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(app.company_name)}&background=random`,
          };
        }),
      );
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFunnelData = () => {
    if (!funnel) return [];
    return funnel.stages.map((stage, idx) => ({
      name: stage.name.charAt(0).toUpperCase() + stage.name.slice(1),
      value: stage.count,
      color: '#4f46e5',
      percentage: stage.percentage,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary-600 text-4xl">
          progress_activity
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const funnelData = formatFunnelData();
  const pendingCount = stats?.by_status?.['applied'] || 0;

  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <h2 className="text-slate-800 font-bold text-xl">Job Search Overview</h2>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
          </button>
          <div
            className="w-9 h-9 rounded-full bg-slate-200 bg-cover bg-center border border-slate-200 shadow-sm"
            style={{ backgroundImage: 'url("https://picsum.photos/100/100")' }}
          ></div>
        </div>
      </header>

      <div className="p-8 max-w-[1200px] mx-auto space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-3 transition-transform hover:-translate-y-1 duration-300">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 text-sm font-semibold">Applications Sent</p>
              <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                <span className="material-symbols-outlined text-[20px]">send</span>
              </div>
            </div>
            <div>
              <p className="text-slate-900 text-4xl font-bold tracking-tight">
                {stats?.total_applications || 0}
              </p>
              <p className="text-emerald-600 text-sm font-semibold flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                Last 30 days
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-3 transition-transform hover:-translate-y-1 duration-300">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 text-sm font-semibold">Interview Rate</p>
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <span className="material-symbols-outlined text-[20px]">record_voice_over</span>
              </div>
            </div>
            <div>
              <p className="text-slate-900 text-4xl font-bold tracking-tight">
                {stats?.interview_rate ? `${(stats.interview_rate * 100).toFixed(0)}%` : '0%'}
              </p>
              <p className="text-emerald-600 text-sm font-semibold flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                Based on interviews
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-3 transition-transform hover:-translate-y-1 duration-300">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 text-sm font-semibold">Pending Responses</p>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
              </div>
            </div>
            <div>
              <p className="text-slate-900 text-4xl font-bold tracking-tight">{pendingCount}</p>
              <p className="text-slate-400 text-sm font-medium mt-1">
                Applications awaiting response
              </p>
            </div>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-slate-900 text-xl font-bold tracking-tight">Recent Applications</h3>
            <button className="text-primary-600 text-sm font-bold hover:text-primary-700 hover:underline">
              View all
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {recentApps.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-2">No applications yet</p>
                <p className="text-sm text-slate-400">Start tracking your job applications</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-center">
                      Status
                    </th>
                    <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-right">
                      Date Applied
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentApps.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="bg-white rounded-lg size-10 flex items-center justify-center p-1 border border-slate-100 shadow-sm">
                            <img
                              src={app.logo}
                              alt={app.company}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <span className="text-slate-900 font-bold text-sm group-hover:text-primary-600 transition-colors">
                            {app.company}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-slate-700 text-sm font-medium">{app.role}</td>
                      <td className="px-6 py-5 text-center">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-5 text-slate-500 text-sm text-right font-medium">
                        {app.dateApplied}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Funnel Chart */}
        <div className="space-y-4 pb-12">
          <h3 className="text-slate-900 text-xl font-bold tracking-tight px-1">
            Application Funnel
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            {funnelData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-2">No data available</p>
                <p className="text-sm text-slate-400">
                  Start tracking applications to see funnel data
                </p>
              </div>
            ) : (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={funnelData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      barSize={32}
                    >
                      <XAxis type="number" hide />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar
                        dataKey="value"
                        fill="#e0e7ff"
                        radius={[4, 4, 4, 4]}
                        background={{ fill: '#f1f5f9', radius: 4 }}
                      >
                        {funnelData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            fillOpacity={1 - index * 0.3}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  {funnelData.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color, opacity: 1 - idx * 0.3 }}
                        ></div>
                        <span className="font-medium text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {item.value} (
                        {item.percentage
                          ? `${item.percentage.toFixed(0)}%`
                          : idx === 0
                            ? '100%'
                            : '0%'}
                        )
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
