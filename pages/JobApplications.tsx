import React from 'react';
import { JobApplication } from '../types';
import StatusBadge from '../components/StatusBadge';

/** Mock data for job applications */
const applications: JobApplication[] = [
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
  {
    id: '4',
    company: 'Netflix',
    role: 'Senior UI Engineer',
    status: 'Rejected',
    dateApplied: 'Sep 28, 2023',
    logo: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png',
  },
  {
    id: '5',
    company: 'Airbnb',
    role: 'Full Stack Developer',
    status: 'Applied',
    dateApplied: 'Nov 01, 2023',
    logo: 'https://a0.muscache.com/airbnb/static/icons/android/airbnb-logo-256x256.png',
  },
  {
    id: '6',
    company: 'Microsoft',
    role: 'Software Engineer II',
    status: 'Interview',
    dateApplied: 'Oct 05, 2023',
    logo: 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b?ver=5c31',
  },
  {
    id: '7',
    company: 'Amazon',
    role: 'Frontend Engineer',
    status: 'Applied',
    dateApplied: 'Nov 03, 2023',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1024px-Amazon_logo.svg.png',
  },
];

/**
 * @component
 * @description Job Applications page component showing a list of job applications with status badges
 * @returns {JSX.Element} The rendered job applications page component
 * 
 * @example
 * ```tsx
 * <JobApplications />
 * ```
 */
const JobApplications: React.FC = () => {
  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <h2 className="text-slate-800 font-bold text-xl">Job Applications</h2>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm shadow-primary-600/20">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Add Application</span>
          </button>
          <div className="w-px h-8 bg-slate-200 mx-2"></div>
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

      <div className="p-8 max-w-[1200px] mx-auto space-y-6">

        {/* Filters/Search Bar Placeholder */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                    type="text"
                    placeholder="Search applications..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-100"
                />
            </div>
            <div className="flex items-center gap-2">
                 <button className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors border border-slate-200 bg-white">
                    <span className="material-symbols-outlined text-[20px]">filter_list</span>
                    <span>Filter</span>
                 </button>
                 <button className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors border border-slate-200 bg-white">
                    <span className="material-symbols-outlined text-[20px]">sort</span>
                    <span>Sort</span>
                 </button>
            </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-right">Date Applied</th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="bg-white rounded-lg size-10 flex items-center justify-center p-1 border border-slate-100 shadow-sm">
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
                    <td className="px-6 py-5 text-right">
                        <button className="text-slate-400 hover:text-primary-600 transition-colors">
                            <span className="material-symbols-outlined">more_vert</span>
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default JobApplications;
