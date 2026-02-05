import React from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';
import { JobApplication } from '../types';

const data = [
  { name: 'Sent', value: 25, color: '#4f46e5' },
  { name: 'Interview', value: 8, color: '#4f46e5' }, // Using same color but will fade via opacity in custom shape if needed, or distinct colors
  { name: 'Offer', value: 2, color: '#4f46e5' },
];

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

const StatusBadge = ({ status }: { status: string }) => {
  let colorClass = '';
  switch (status) {
    case 'Applied':
      colorClass = 'bg-blue-100 text-blue-700';
      break;
    case 'Interview':
      colorClass = 'bg-purple-100 text-purple-700';
      break;
    case 'Offer':
      colorClass = 'bg-emerald-100 text-emerald-700';
      break;
    default:
      colorClass = 'bg-slate-100 text-slate-700';
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${colorClass}`}>
      {status}
    </span>
  );
};

const Dashboard: React.FC = () => {
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
              <p className="text-slate-900 text-4xl font-bold tracking-tight">25</p>
              <p className="text-emerald-600 text-sm font-semibold flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                +12% this month
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
              <p className="text-slate-900 text-4xl font-bold tracking-tight">32%</p>
              <p className="text-emerald-600 text-sm font-semibold flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                +5% from last week
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
              <p className="text-slate-900 text-4xl font-bold tracking-tight">5</p>
              <p className="text-slate-400 text-sm font-medium mt-1">No change</p>
            </div>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-slate-900 text-xl font-bold tracking-tight">Recent Applications</h3>
            <button className="text-primary-600 text-sm font-bold hover:text-primary-700 hover:underline">View all</button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-right">Date Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="bg-white rounded-lg size-10 flex items-center justify-center p-1 border border-slate-100 shadow-sm">
                           {/* Using a placeholder if logo fails, but styled nicely */}
                           <img src={app.logo} alt={app.company} className="max-w-full max-h-full object-contain" onError={(e) => {
                             (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${app.company}&background=random`
                           }}/>
                        </div>
                        <span className="text-slate-900 font-bold text-sm group-hover:text-primary-600 transition-colors">{app.company}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-700 text-sm font-medium">{app.role}</td>
                    <td className="px-6 py-5 text-center">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-6 py-5 text-slate-500 text-sm text-right font-medium">{app.dateApplied}</td>
                  </tr>
                ))}
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