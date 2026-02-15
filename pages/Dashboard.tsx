import React, { useState, useEffect } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';
import { JobApplication } from '../types';
import StatusBadge from '../components/StatusBadge';

// Types for user and resume data
interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

interface Resume {
  id: number;
  title: string;
  content: any;
  template: string;
  created_at: string;
  updated_at: string;
}

/** Mock data for the application funnel chart */
const data = [
  { name: 'Sent', value: 25, color: '#4f46e5' },
  { name: 'Interview', value: 8, color: '#4f46e5' }, // Using same color but will fade via opacity in custom shape if needed, or distinct colors
  { name: 'Offer', value: 2, color: '#4f46e5' },
];

/** Mock data for recent job applications */
const recentApps: JobApplication[] = [
  {
    id: '1',
    company: 'Google',
    role: 'Software Engineer',
    status: 'Applied',
    dateApplied: 'Oct 24, 2023',
    logo: 'https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-Ca402YwzGNcjqg84afM42nzQ7kXDD0jf986hws20DaEvp_ejg',
  },
  {
    id: '2',
    company: 'Stripe',
    role: 'Product Designer',
    status: 'Interview',
    dateApplied: 'Oct 22, 2023',
    logo: 'https://b.stripecdn.com/docs-statics-srv/assets/b411c60/company-logos/dark/stripe.svg',
  },
  {
    id: '3',
    company: 'Vercel',
    role: 'Frontend Developer',
    status: 'Offer',
    dateApplied: 'Oct 15, 2023',
    logo: 'https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png',
  },
];

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
  const [user, setUser] = useState<User | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get user profile
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const userResponse = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const userData = await userResponse.json();
        setUser(userData);

        // Get user's resumes
        const resumesResponse = await fetch('/api/resumes', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!resumesResponse.ok) {
          throw new Error('Failed to fetch resumes');
        }

        const resumesData = await resumesResponse.json();
        setResumes(resumesData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-full bg-slate-200 bg-cover bg-center border border-slate-200 shadow-sm flex items-center justify-center text-sm font-bold text-slate-700"
            >
              {user?.first_name?.charAt(0) || user?.email.charAt(0) || 'U'}
            </div>
            <span className="text-sm font-medium text-slate-700">
              {user?.first_name ? `${user.first_name} ${user?.last_name || ''}` : user?.email}
            </span>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-[1200px] mx-auto space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-3 transition-transform hover:-translate-y-1 duration-300">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 text-sm font-semibold">Your Resumes</p>
              <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
            </div>
            <div>
              <p className="text-slate-900 text-4xl font-bold tracking-tight">{resumes.length}</p>
              <p className="text-emerald-600 text-sm font-semibold flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                {resumes.length > 0 ? '+1 this week' : 'Get started today'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-3 transition-transform hover:-translate-y-1 duration-300">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 text-sm font-semibold">Account Created</p>
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <span className="material-symbols-outlined text-[20px]">person_add</span>
              </div>
            </div>
            <div>
              <p className="text-slate-900 text-4xl font-bold tracking-tight">
                {user ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}
              </p>
              <p className="text-slate-400 text-sm font-medium mt-1">Since joining</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-3 transition-transform hover:-translate-y-1 duration-300">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 text-sm font-semibold">Last Login</p>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
            </div>
            <div>
              <p className="text-slate-900 text-4xl font-bold tracking-tight">Today</p>
              <p className="text-slate-400 text-sm font-medium mt-1">Active now</p>
            </div>
          </div>
        </div>

        {/* Your Resumes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-slate-900 text-xl font-bold tracking-tight">Your Resumes</h3>
            <button className="text-primary-600 text-sm font-bold hover:text-primary-700 hover:underline">View all</button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">Template</th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-center">Created</th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumes.slice(0, 3).map((resume) => (
                  <tr key={resume.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="bg-white rounded-lg size-10 flex items-center justify-center p-2 border border-slate-100 shadow-sm">
                          <span className="material-symbols-outlined text-slate-600">description</span>
                        </div>
                        <span className="text-slate-900 font-bold text-sm group-hover:text-primary-600 transition-colors">{resume.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-700 text-sm font-medium capitalize">{resume.template}</td>
                    <td className="px-6 py-5 text-center text-slate-500 text-sm font-medium">
                      {new Date(resume.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5 text-slate-500 text-sm text-right font-medium">
                      <button 
                        className="text-blue-600 hover:text-blue-800 mr-3"
                        onClick={() => window.location.href = `/editor/${resume.id}`}
                      >
                        Edit
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-800"
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this resume?')) {
                            try {
                              const token = localStorage.getItem('accessToken');
                              const response = await fetch(`/api/resumes/${resume.id}`, {
                                method: 'DELETE',
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              
                              if (response.ok) {
                                setResumes(resumes.filter(r => r.id !== resume.id));
                              } else {
                                alert('Failed to delete resume');
                              }
                            } catch (error) {
                              console.error('Error deleting resume:', error);
                              alert('Error deleting resume');
                            }
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {resumes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">description</span>
                        <p className="text-slate-500">You don't have any resumes yet</p>
                        <button 
                          className="mt-3 text-primary-600 hover:text-primary-700 font-medium"
                          onClick={() => window.location.href = '/editor'}
                        >
                          Create your first resume
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Funnel Chart */}
        <div className="space-y-4 pb-12">
            <h3 className="text-slate-900 text-xl font-bold tracking-tight px-1">Application Funnel</h3>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={data}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            barSize={32}
                        >
                            <XAxis type="number" hide />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            {/* Background bars */}
                            <Bar dataKey="value" fill="#e0e7ff" radius={[4, 4, 4, 4]} background={{ fill: '#f1f5f9', radius: 4 }}>
                              {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={1 - (index * 0.3)} />
                              ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {/* Custom Labels below chart for aesthetics */}
                <div className="flex flex-col gap-2 mt-4">
                    {data.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm border-b border-slate-50 last:border-0 py-2">
                             <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color, opacity: 1 - (idx * 0.3) }}></div>
                                <span className="font-medium text-slate-600">{item.name}</span>
                             </div>
                             <span className="font-bold text-slate-900">{item.value} ({idx === 0 ? '100%' : idx === 1 ? '32%' : '8%'})</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;