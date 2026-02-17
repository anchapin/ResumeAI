import React, { useState, useCallback, useMemo } from 'react';
import { JobApplication, SimpleResumeData, ATSReport } from '../types';
import StatusBadge from '../components/StatusBadge';
import { convertToAPIData, tailorResume, checkATSScore, TailoredResumeResponse } from '../utils/api-client';

/** Extended JobApplication type with tracking fields */
interface TrackedJobApplication extends JobApplication {
  resumeVariant?: string;
  applicationMethod?: 'LinkedIn' | 'Direct' | 'Referral' | 'Indeed' | 'Other';
  jobUrl?: string;
  notes?: string;
}

/** Stats calculation from applications */
const calculateStats = (apps: TrackedJobApplication[]) => {
  const total = apps.length;
  const sent = total;
  const pending = apps.filter(a => a.status === 'Applied').length;
  const interviews = apps.filter(a => a.status === 'Interview').length;
  const offers = apps.filter(a => a.status === 'Offer').length;
  const rejected = apps.filter(a => a.status === 'Rejected').length;
  
  const responded = interviews + offers + rejected;
  const interviewRate = responded > 0 ? Math.round((interviews / responded) * 100) : 0;
  
  return { total, sent, pending, interviews, offers, rejected, interviewRate };
};

/** Mock data for job applications */
const initialApplications: TrackedJobApplication[] = [
  { id: '1', company: 'Google', role: 'Software Engineer', status: 'Applied', dateApplied: 'Oct 24, 2023', logo: 'https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-Ca402YwzGNcjqg84afM42nzQ7kXDD0jf986hws20DaEvp_ejg', resumeVariant: 'v1.0.0-backend', applicationMethod: 'LinkedIn', jobUrl: 'https://linkedin.com/jobs/123' },
  { id: '2', company: 'Stripe', role: 'Product Designer', status: 'Interview', dateApplied: 'Oct 22, 2023', logo: 'https://b.stripecdn.com/docs-statics-srv/assets/b411c60/company-logos/dark/stripe.svg', resumeVariant: 'v1.0.0-design', applicationMethod: 'Referral', jobUrl: 'https://stripe.com/careers/456' },
  { id: '3', company: 'Vercel', role: 'Frontend Developer', status: 'Offer', dateApplied: 'Oct 15, 2023', logo: 'https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png', resumeVariant: 'v1.0.0-frontend', applicationMethod: 'Direct', jobUrl: 'https://vercel.com/careers/789' },
  { id: '4', company: 'Netflix', role: 'Senior UI Engineer', status: 'Rejected', dateApplied: 'Sep 28, 2023', logo: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png', resumeVariant: 'v1.0.0-backend', applicationMethod: 'LinkedIn' },
  { id: '5', company: 'Airbnb', role: 'Full Stack Developer', status: 'Applied', dateApplied: 'Nov 01, 2023', logo: 'https://a0.muscache.com/airbnb/static/icons/android/airbnb-logo-256x256.png', resumeVariant: 'v1.0.0-fullstack', applicationMethod: 'Indeed' },
  { id: '6', company: 'Microsoft', role: 'Software Engineer II', status: 'Interview', dateApplied: 'Oct 05, 2023', logo: 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b?ver=5c31', resumeVariant: 'v1.0.0-backend', applicationMethod: 'Referral' },
  { id: '7', company: 'Amazon', role: 'Frontend Engineer', status: 'Applied', dateApplied: 'Nov 03, 2023', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1024px-Amazon_logo.svg.png', resumeVariant: 'v1.0.0-frontend', applicationMethod: 'LinkedIn' },
];

/**
 * @component
 * @description Job Applications page component showing a list of job applications with status badges
 * @returns {JSX.Element} The rendered job applications page component
 */
const JobApplications: React.FC = () => {
  // Applications state
  const [applications, setApplications] = useState<TrackedJobApplication[]>(initialApplications);
  
  // Resume tailoring state
  const [showTailorModal, setShowTailorModal] = useState<boolean>(false);
  const [showATSModal, setShowATSModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [jobDescription, setJobDescription] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [isTailoring, setIsTailoring] = useState<boolean>(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailoredResult, setTailoredResult] = useState<TailoredResumeResponse | null>(null);
  
  // ATS checking state
  const [isCheckingATS, setIsCheckingATS] = useState<boolean>(false);
  const [atsError, setAtsError] = useState<string | null>(null);
  const [atsReport, setAtsReport] = useState<ATSReport | null>(null);
  
  // Calculate stats from applications
  const stats = useMemo(() => calculateStats(applications), [applications]);
  
  // Sample resume data for tailoring (would come from App context in real app)
  const sampleResumeData: SimpleResumeData = {
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    phone: "+1 (555) 012-3456",
    location: "San Francisco, CA",
    role: "Senior Product Designer",
    summary: "Passionate and detail-oriented Senior Product Designer with 8+ years of experience creating user-centered digital experiences.",
    skills: ["Figma", "Sketch", "User Research", "Prototyping", "Design Systems", "React", "TypeScript"],
    experience: [{ id: '1', company: 'TechCorp Solutions', role: 'Senior Software Engineer', startDate: 'Jan 2020', endDate: 'Present', current: true, description: 'Led the migration of legacy monolithic architecture to microservices using AWS and Node.js, improving system scalability by 40%.', tags: ['AWS', 'Microservices'] }],
    education: [{ id: '1', institution: 'Stanford University', area: 'Computer Science', studyType: 'Bachelor of Science', startDate: '2013', endDate: '2017', courses: ['Data Structures', 'Algorithms'] }],
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
  
  // Handle ATS check
  const handleATSCheck = useCallback(async () => {
    if (!jobDescription.trim()) {
      setAtsError('Please enter a job description');
      return;
    }
    
    setIsCheckingATS(true);
    setAtsError(null);
    
    try {
      const apiData = convertToAPIData(sampleResumeData);
      const result = await checkATSScore(apiData, jobDescription);
      setAtsReport(result);
    } catch (err) {
      console.error('ATS check failed:', err);
      setAtsError(err instanceof Error ? err.message : 'Failed to check ATS score');
    } finally {
      setIsCheckingATS(false);
    }
  }, [jobDescription]);
  
  // Reset ATS modal
  const handleCloseATSModal = () => {
    setShowATSModal(false);
    setJobDescription('');
    setAtsError(null);
    setAtsReport(null);
  };
  
  // Get score color based on percentage
  const getScoreColor = (percentage: number): string => {
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // Get score label based on percentage
  const getScoreLabel = (percentage: number): string => {
    if (percentage >= 85) return 'Excellent';
    if (percentage >= 70) return 'Good';
    if (percentage >= 50) return 'Fair';
    return 'Needs Work';
  };
  
  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <h2 className="text-slate-800 font-bold text-xl">Job Applications</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowATSModal(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm shadow-emerald-500/20"
          >
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
            <span>ATS Check</span>
          </button>
          <button 
            onClick={() => setShowTailorModal(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm shadow-amber-500/20"
          >
            <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
            <span>Tailor Resume</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm shadow-primary-600/20"
          >
            <span className="material-symbols-outlined text-[20px]">add</span><span>Add Application</span>
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
          <div className="w-9 h-9 rounded-full bg-slate-200 bg-cover bg-center border border-slate-200 shadow-sm" style={{ backgroundImage: 'url("https://picsum.photos/100/100")' }}></div>
        </div>
      </header>

      <div className="p-8 max-w-[1200px] mx-auto space-y-6">
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

        {/* Stats Dashboard */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <span className="material-symbols-outlined text-primary-600">send</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Applications Sent</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <span className="material-symbols-outlined text-amber-600">hourglass_empty</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Pending</p>
                <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="material-symbols-outlined text-purple-600">forum</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Interviews</p>
                <p className="text-2xl font-bold text-slate-900">{stats.interviews}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="material-symbols-outlined text-green-600">workspace_premium</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Interview Rate</p>
                <p className="text-2xl font-bold text-slate-900">{stats.interviewRate}%</p>
              </div>
            </div>
          </div>
        </div>

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
                           <img src={app.logo} alt={app.company} className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${app.company}&background=random` }}/>
                        </div>
                        <span className="text-slate-900 font-bold text-sm group-hover:text-primary-600 transition-colors">{app.company}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-700 text-sm font-medium">{app.role}</td>
                    <td className="px-6 py-5 text-center"><StatusBadge status={app.status} /></td>
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
      
      {/* ATS Compatibility Check Modal */}
      {showATSModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">ATS Compatibility Check</h2>
                  <p className="text-sm text-slate-500 mt-1">Check how well your resume matches the job description</p>
                </div>
                <button 
                  type="button"
                  onClick={handleCloseATSModal}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  aria-label="Close"
                  title="Close"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
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
              {atsError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {atsError}
                </div>
              )}
              
              {/* Results */}
              {atsReport && (
                <div className="space-y-4">
                  {/* Overall Score */}
                  <div className="bg-slate-50 rounded-xl p-6 text-center">
                    <div className={`text-5xl font-bold ${getScoreColor(atsReport.overall_percentage)}`}>
                      {atsReport.overall_percentage.toFixed(0)}%
                    </div>
                    <div className="text-lg font-semibold text-slate-700 mt-2">
                      {getScoreLabel(atsReport.overall_percentage)} - {atsReport.total_score}/{atsReport.total_possible} points
                    </div>
                    <p className="text-sm text-slate-500 mt-2">{atsReport.summary}</p>
                  </div>
                  
                  {/* Category Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700">Category Breakdown</h4>
                    {Object.entries(atsReport.categories).map(([key, category]) => (
                      <div key={key} className="bg-white border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-800">{category.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          <span className={`font-bold ${getScoreColor(category.percentage)}`}>
                            {category.points_earned}/{category.points_possible} ({category.percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                          <div 
                            className={`h-2 rounded-full ${
                              category.percentage >= 70 ? 'bg-green-500' : 
                              category.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${category.percentage}%` }}
                          ></div>
                        </div>
                        {category.details.length > 0 && (
                          <ul className="text-xs text-slate-600 space-y-1">
                            {category.details.slice(0, 3).map((detail, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-green-600">✓</span> {detail}
                              </li>
                            ))}
                          </ul>
                        )}
                        {category.suggestions.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <p className="text-xs font-semibold text-amber-600 mb-1">Suggestions:</p>
                            <ul className="text-xs text-slate-600 space-y-1">
                              {category.suggestions.slice(0, 2).map((suggestion, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-amber-500">•</span> {suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Top Recommendations */}
                  {atsReport.recommendations.length > 0 && (
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <h4 className="text-sm font-bold text-amber-800 mb-2">Top Recommendations</h4>
                      <ul className="space-y-2">
                        {atsReport.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                            <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5">lightbulb</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={handleCloseATSModal}
                className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleATSCheck}
                disabled={isCheckingATS || !jobDescription.trim()}
                className="px-5 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCheckingATS ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    Checking...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">fact_check</span>
                    Check ATS Score
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
