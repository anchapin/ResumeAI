import React, { useState, useCallback } from 'react';
import { JobApplication, SimpleResumeData } from '../types';
import StatusBadge from '../components/StatusBadge';
import { convertToAPIData, tailorResume, ResumeDataForAPI, TailoredResumeResponse } from '../utils/api-client';

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
  // Resume tailoring state
  const [showTailorModal, setShowTailorModal] = useState<boolean>(false);
  const [jobDescription, setJobDescription] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [isTailoring, setIsTailoring] = useState<boolean>(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailoredResult, setTailoredResult] = useState<TailoredResumeResponse | null>(null);
  
  // Sample resume data for tailoring (would come from App context in real app)
  const sampleResumeData: SimpleResumeData = {
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    phone: "+1 (555) 012-3456",
    location: "San Francisco, CA",
    role: "Senior Product Designer",
    summary: "Passionate and detail-oriented Senior Product Designer with 8+ years of experience creating user-centered digital experiences.",
    skills: ["Figma", "Sketch", "User Research", "Prototyping", "Design Systems", "React", "TypeScript"],
    experience: [
      {
        id: '1',
        company: 'TechCorp Solutions',
        role: 'Senior Software Engineer',
        startDate: 'Jan 2020',
        endDate: 'Present',
        current: true,
        description: 'Led the migration of legacy monolithic architecture to microservices using AWS and Node.js, improving system scalability by 40%.',
        tags: ['AWS', 'Microservices']
      }
    ],
    education: [
      {
        id: '1',
        institution: 'Stanford University',
        area: 'Computer Science',
        studyType: 'Bachelor of Science',
        startDate: '2013',
        endDate: '2017',
        courses: ['Data Structures', 'Algorithms']
      }
    ],
    projects: []
  };
  
  // Handle resume tailoring
  const handleTailorResume = useCallback(async () => {
    if (!jobDescription.trim()) {
      setTailorError('Please enter a job description');
      return;
    }
    
    setIsTailoring(true);
    setTailorError(null);
    
    try {
      const apiData = convertToAPIData(sampleResumeData);
      const result = await tailorResume(
        apiData,
        jobDescription,
        companyName || undefined,
        jobTitle || undefined
      );
      setTailoredResult(result);
    } catch (err) {
      console.error('Resume tailoring failed:', err);
      setTailorError(err instanceof Error ? err.message : 'Failed to tailor resume');
    } finally {
      setIsTailoring(false);
    }
  }, [jobDescription, companyName, jobTitle]);
  
  // Reset modal
  const handleCloseModal = () => {
    setShowTailorModal(false);
    setJobDescription('');
    setCompanyName('');
    setJobTitle('');
    setTailorError(null);
    setTailoredResult(null);
  };
  
  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <h2 className="text-slate-800 font-bold text-xl">Job Applications</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowTailorModal(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm shadow-amber-500/20"
          >
            <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
            <span>Tailor Resume</span>
          </button>
          <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm shadow-primary-600/20">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Add Application</span>
          </button>
          <div className="w-px h-8 bg-slate-200 mx-2"></div>
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative"
            aria-label="Notifications"
            title="Notifications"
          >
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
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
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">search</span>
                <input
                    type="text"
                    placeholder="Search applications..."
                    aria-label="Search applications"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-100"
                />
            </div>
            <div className="flex items-center gap-2">
                 <button type="button" className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors border border-slate-200 bg-white">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">filter_list</span>
                    <span>Filter</span>
                 </button>
                 <button type="button" className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors border border-slate-200 bg-white">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">sort</span>
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
                        <button
                            type="button"
                            className="text-slate-400 hover:text-primary-600 transition-colors"
                            aria-label="More options"
                            title="More options"
                        >
                            <span className="material-symbols-outlined" aria-hidden="true">more_vert</span>
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>

      {/* Tailor Resume Modal */}
      {showTailorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Tailor Resume to Job</h2>
                  <p className="text-sm text-slate-500 mt-1">Paste a job description to customize your resume</p>
                </div>
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  aria-label="Close"
                  title="Close"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Job Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Company Name (Optional)</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Google"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Job Title (Optional)</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Software Engineer"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                  />
                </div>
              </div>
              
              {/* Job Description */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Job Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={8}
                  placeholder="Paste the full job description here..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 resize-none"
                />
              </div>
              
              {/* Error Message */}
              {tailorError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {tailorError}
                </div>
              )}
              
              {/* Results */}
              {tailoredResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Resume tailored successfully!
                  </div>
                  
                  {/* Keywords */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Keywords Found</h4>
                    <div className="flex flex-wrap gap-2">
                      {tailoredResult.keywords.map((keyword, idx) => (
                        <span key={idx} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Suggestions */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-2">AI Suggestions</h4>
                    <ul className="space-y-2">
                      {tailoredResult.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="material-symbols-outlined text-[16px] text-primary-600">lightbulb</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTailorResume}
                disabled={isTailoring}
                className="px-5 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isTailoring ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    Tailoring...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                    Tailor Resume
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobApplications;
