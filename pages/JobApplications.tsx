import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { JobApplication, SimpleResumeData, ATSReport } from '../types';
import StatusBadge from '../components/StatusBadge';
import JobApplicationsSkeleton from '../components/skeletons/JobApplicationsSkeleton';
import AccessibleDialog from '../components/AccessibleDialog';
import { useStore } from '../store/store';
import {
  convertToAPIData,
  tailorResume,
  checkATSScore,
  TailoredResumeResponse,
  listJobApplications,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication,
  getApplicationStats,
  ApplicationStats,
  ApplicationStatus,
} from '../utils/api-client';

/** Map API status to display status */
const mapApiStatusToDisplay = (status: ApplicationStatus): string => {
  const statusMap: Record<ApplicationStatus, string> = {
    draft: 'Draft',
    applied: 'Applied',
    screening: 'Screening',
    interviewing: 'Interview',
    offer: 'Offer',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };
  return statusMap[status] || status;
};

/** Map display status to API status */
const mapDisplayToApiStatus = (status: string): ApplicationStatus => {
  const statusMap: Record<string, ApplicationStatus> = {
    Draft: 'draft',
    Applied: 'applied',
    Screening: 'screening',
    Interview: 'interviewing',
    Offer: 'offer',
    Accepted: 'accepted',
    Rejected: 'rejected',
    Withdrawn: 'withdrawn',
  };
  return statusMap[status] || 'draft';
};

/** Extended JobApplication type with tracking fields */
interface TrackedJobApplication {
  id: number;
  company_name: string;
  job_title: string;
  job_url?: string;
  location?: string;
  status: ApplicationStatus;
  resumeVariant?: string;
  applicationMethod?: 'LinkedIn' | 'Direct' | 'Referral' | 'Indeed' | 'Other';
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  dateApplied?: string;
  logo?: string;
}

/** Stats calculation from applications */
const calculateStats = (apps: TrackedJobApplication[], apiStats?: ApplicationStats) => {
  // Use API stats if available
  if (apiStats) {
    return {
      total: apiStats.total_applications,
      sent: apiStats.total_applications,
      pending: apiStats.by_status['applied'] || 0,
      interviews: apiStats.by_status['interviewing'] || 0,
      offers: apiStats.by_status['offer'] || 0,
      rejected: apiStats.by_status['rejected'] || 0,
      interviewRate: Math.round(apiStats.interview_rate * 100),
    };
  }

  // Fall back to calculating from apps array
  const total = apps.length;
  const sent = total;
  const pending = apps.filter((a) => a.status === 'applied').length;
  const interviews = apps.filter((a) => a.status === 'interviewing').length;
  const offers = apps.filter((a) => a.status === 'offer').length;
  const rejected = apps.filter((a) => a.status === 'rejected').length;

  const responded = interviews + offers + rejected;
  const interviewRate = responded > 0 ? Math.round((interviews / responded) * 100) : 0;

  return { total, sent, pending, interviews, offers, rejected, interviewRate };
};

/**
 * @component
 * @description Job Applications page component showing a list of job applications with status badges
 * @returns {JSX.Element} The rendered job applications page component
 */
const JobApplications: React.FC = () => {
  // Global loading state
  const setGlobalLoading = useStore((state) => state.setGlobalLoading);

  // Applications state
  const [applications, setApplications] = useState<TrackedJobApplication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch applications from API on mount
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const apps = await listJobApplications();
        // Map API response to display format
        const mappedApps: TrackedJobApplication[] = apps.map((app) => ({
          ...app,
          dateApplied: new Date(app.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          company: app.company_name,
          role: app.job_title,
        }));
        setApplications(mappedApps);
      } catch (err) {
        console.error('Failed to load applications:', err);
        setError(err instanceof Error ? err.message : 'Failed to load applications');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  // Calculate stats from applications
  const stats = useMemo(() => calculateStats(applications), [applications]);

  // Sample resume data for tailoring (would come from App context in real app)
  const sampleResumeData: SimpleResumeData = {
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    phone: '+1 (555) 012-3456',
    location: 'San Francisco, CA',
    role: 'Senior Product Designer',
    summary:
      'Passionate and detail-oriented Senior Product Designer with 8+ years of experience creating user-centered digital experiences.',
    skills: [
      'Figma',
      'Sketch',
      'User Research',
      'Prototyping',
      'Design Systems',
      'React',
      'TypeScript',
    ],
    experience: [
      {
        id: '1',
        company: 'TechCorp Solutions',
        role: 'Senior Software Engineer',
        startDate: 'Jan 2020',
        endDate: 'Present',
        current: true,
        description:
          'Led the migration of legacy monolithic architecture to microservices using AWS and Node.js, improving system scalability by 40%.',
        tags: ['AWS', 'Microservices'],
      },
    ],
    education: [
      {
        id: '1',
        institution: 'Stanford University',
        area: 'Computer Science',
        studyType: 'Bachelor of Science',
        startDate: '2013',
        endDate: '2017',
        courses: ['Data Structures', 'Algorithms'],
      },
    ],
    projects: [],
  };

  // Handle resume tailoring
  const handleTailorResume = useCallback(async () => {
    if (!jobDescription.trim()) {
      setTailorError('Please enter a job description');
      return;
    }

    setIsTailoring(true);
    setGlobalLoading(true);
    setTailorError(null);

    try {
      const apiData = convertToAPIData(sampleResumeData);
      const result = await tailorResume(
        apiData,
        jobDescription,
        companyName || undefined,
        jobTitle || undefined,
      );
      setTailoredResult(result);
    } catch (err) {
      console.error('Resume tailoring failed:', err);
      setTailorError(err instanceof Error ? err.message : 'Failed to tailor resume');
    } finally {
      setIsTailoring(false);
      setGlobalLoading(false);
    }
  }, [jobDescription, companyName, jobTitle, setGlobalLoading]);

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
    setGlobalLoading(true);
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
      setGlobalLoading(false);
    }
  }, [jobDescription, setGlobalLoading]);

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

  if (isLoading) {
    return <JobApplicationsSkeleton />;
  }

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
            <span className="material-symbols-outlined" aria-hidden="true">
              notifications
            </span>
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
          </button>
          <div
            className="w-9 h-9 rounded-full bg-slate-200 bg-cover bg-center border border-slate-200 shadow-sm"
            style={{ backgroundImage: 'url("https://picsum.photos/100/100")' }}
          ></div>
        </div>
      </header>

      <div className="p-8 max-w-[1200px] mx-auto space-y-6">
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex-1 relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search applications..."
              aria-label="Search applications"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors border border-slate-200 bg-white"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                filter_list
              </span>
              <span>Filter</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors border border-slate-200 bg-white"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                sort
              </span>
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
                <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-red-500">
                      <span className="material-symbols-outlined text-4xl mb-4">error</span>
                      <p className="font-medium">{error}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined text-6xl mb-4">work_off</span>
                      <p className="font-medium text-slate-500">No job applications yet</p>
                      <p className="text-sm">
                        Click "Add Application" to track your first job application
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="bg-white rounded-lg size-10 flex items-center justify-center p-1 border border-slate-100 shadow-sm">
                          <img
                            src={app.logo}
                            alt={app.company_name}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(app.company_name)}&background=random`;
                            }}
                          />
                        </div>
                        <span className="text-slate-900 font-bold text-sm group-hover:text-primary-600 transition-colors">
                          {app.company_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-700 text-sm font-medium">
                      {app.job_title}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <StatusBadge status={mapApiStatusToDisplay(app.status)} />
                    </td>
                    <td className="px-6 py-5 text-slate-500 text-sm text-right font-medium">
                      {app.dateApplied}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        type="button"
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
                        aria-label="More options"
                        title="More options"
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
                          more_vert
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tailor Resume Modal */}
      <AccessibleDialog
        isOpen={showTailorModal}
        onClose={handleCloseModal}
        title={
          <div>
            <h2 className="text-xl font-bold text-slate-900">Tailor Resume to Job</h2>
            <p className="text-sm text-slate-500 mt-1 font-normal">
              Paste a job description to customize your resume
            </p>
          </div>
        }
        className="max-w-2xl"
        footer={
          <>
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
          </>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
                    <span
                      key={idx}
                      className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium"
                    >
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
                      <span className="material-symbols-outlined text-[16px] text-primary-600">
                        lightbulb
                      </span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </AccessibleDialog>

      {/* ATS Compatibility Check Modal */}
      <AccessibleDialog
        isOpen={showATSModal}
        onClose={handleCloseATSModal}
        title={
          <div>
            <h2 className="text-xl font-bold text-slate-900">ATS Compatibility Check</h2>
            <p className="text-sm text-slate-500 mt-1 font-normal">
              Check how well your resume matches the job description
            </p>
          </div>
        }
        className="max-w-3xl"
        footer={
          <>
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
          </>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
                <div className={`text-5xl font-bold ${getScoreColor(atsReport.overallPercentage)}`}>
                  {atsReport.overallPercentage.toFixed(0)}%
                </div>
                <div className="text-lg font-semibold text-slate-700 mt-2">
                  {getScoreLabel(atsReport.overallPercentage)} - {atsReport.totalScore}/
                  {atsReport.totalPossible} points
                </div>
                <p className="text-sm text-slate-500 mt-2">{atsReport.summary}</p>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700">Category Breakdown</h4>
                {Object.entries(atsReport.categories).map(([key, category]) => (
                  <div key={key} className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-800">
                        {category.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                      <span className={`font-bold ${getScoreColor(category.percentage)}`}>
                        {category.pointsEarned}/{category.pointsPossible} (
                        {category.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                      <div
                        className={`h-2 rounded-full ${
                          category.percentage >= 70
                            ? 'bg-green-500'
                            : category.percentage >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
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
                        <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5">
                          lightbulb
                        </span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </AccessibleDialog>
    </div>
  );
};

export default JobApplications;
