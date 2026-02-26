import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Route, SimpleResumeData, ResumeMetadata } from '../types';
import { useGeneratePackage, convertToResumeData } from '../hooks/useGeneratePackage';
import { useVariants } from '../hooks/useVariants';
import { showErrorToast, showSuccessToast } from '../utils/toast';
import { getResume, listResumeVersions, listComments } from '../utils/api-client';

/**
 * @interface WorkspaceProps
 * @description Props for the Workspace component
 * @property {SimpleResumeData} resumeData - The resume data to use in the workspace
 * @property {Function} onNavigate - Callback function to handle navigation
 */
interface WorkspaceProps {
  /** The resume data to use in the workspace */
  resumeData: SimpleResumeData;
  /** Callback function to handle navigation */
  onNavigate: (route: Route) => void;
}

/** Available tab types for the workspace */
type TabType = 'Resume' | 'Keywords' | 'Suggestions' | 'Adjust';

/** Available tabs for the workspace */
const TABS: TabType[] = ['Resume', 'Keywords', 'Suggestions', 'Adjust'];

/**
 * @component
 * @description Workspace page component for tailoring resumes to job descriptions
 * @param {WorkspaceProps} props - Component properties
 * @param {SimpleResumeData} props.resumeData - The resume data to use in the workspace
 * @param {Function} props.onNavigate - Callback function to handle navigation
 * @returns {JSX.Element} The rendered workspace page component
 *
 * @example
 * ```tsx
 * <Workspace
 *   resumeData={sampleResumeData}
 *   onNavigate={(route) => console.log(`Navigating to ${route}`)}
 * />
 * ```
 */
const Workspace: React.FC<WorkspaceProps> = ({ resumeData, onNavigate }) => {
  const { generatePackage, downloadPDF, renderMarkdown, loading, error, data } =
    useGeneratePackage();
  const { variants: apiVariants, loading: variantsLoading, error: variantsError } = useVariants();
  const [activeTab, setActiveTab] = useState<TabType>('Resume');

  // Local Resume Data for manual adjustments
  const [localResumeData, setLocalResumeData] = useState(convertToResumeData(resumeData));
  const [markdownPreview, setMarkdownPreview] = useState<string | null>(null);
  const [isRefreshingMarkdown, setIsRefreshingMarkdown] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [variant, setVariant] = useState('base');

  // Version and comment metadata
  const [versionCount, setVersionCount] = useState<number>(0);
  const [commentCount, setCommentCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(true);

  // Mock resume ID - in real app, this would come from props
  const mockResumeId = 1;

  // Initialize with API variants once loaded
  useEffect(() => {
    if (apiVariants.length > 0) {
      // Set default to first variant if 'base' is not available
      const defaultVariant = apiVariants.some((v) => v.name === 'base')
        ? 'base'
        : apiVariants[0].name;
      setVariant(defaultVariant);
    }
  }, [apiVariants]);

  // Load resume metadata (versions, comments, last updated)
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoadingMetadata(true);
        const [versions, comments] = await Promise.all([
          listResumeVersions(mockResumeId),
          listComments(mockResumeId),
        ]);
        setVersionCount(versions.length);
        setCommentCount(comments.length);

        // Set last updated based on the most recent version or comment
        const allDates = [
          ...versions.map((v: any) => new Date(v.created_at)),
          ...comments.map((c: any) => new Date(c.created_at)),
        ];
        if (allDates.length > 0) {
          const latest = new Date(Math.max(...allDates.map((d) => d.getTime())));
          setLastUpdated(formatTimeAgo(latest));
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
        // Silently fail - metadata is nice to have but not essential
      } finally {
        setLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [mockResumeId]);

  // Helper function to format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Update local data when tailored data arrives
  useEffect(() => {
    if (data?.resume_data) {
      setLocalResumeData(data.resume_data);
    }
    if (data?.markdown) {
      setMarkdownPreview(data.markdown);
    }
  }, [data]);

  const handleRefreshMarkdown = async () => {
    setIsRefreshingMarkdown(true);
    try {
      const md = await renderMarkdown({
        resume_data: localResumeData,
        variant: variant,
      });
      setMarkdownPreview(md);
      setActiveTab('Resume');
      showSuccessToast('Preview updated with your manual changes!');
    } catch (e) {
      console.error(e);
      showErrorToast('Failed to refresh preview.');
    } finally {
      setIsRefreshingMarkdown(false);
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription) {
      showErrorToast('Please enter a job description.');
      return;
    }

    try {
      await generatePackage({
        resume_data: localResumeData,
        job_description: jobDescription,
        company_name: companyName || undefined,
        job_title: jobTitle || undefined,
      });
      showSuccessToast('Resume package generated successfully!');
      setActiveTab('Resume');
    } catch (e) {
      console.error(e);
      showErrorToast('Failed to generate resume package. Please try again.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!companyName) {
      showErrorToast('Please enter a company name before downloading.');
      return;
    }

    try {
      await downloadPDF({
        resume_data: localResumeData,
        variant: variant,
      });
      showSuccessToast('PDF downloaded successfully!');
    } catch (e) {
      console.error(e);
      showErrorToast('Failed to download PDF. Ensure backend is running.');
    }
  };

  const updateBasics = (field: string, value: string) => {
    setLocalResumeData((prev) => ({
      ...prev,
      basics: {
        ...prev.basics,
        [field]: value,
      },
    }));
  };

  const updateWork = (index: number, field: string, value: any) => {
    setLocalResumeData((prev) => {
      const newWork = [...(prev.work || [])];
      newWork[index] = { ...newWork[index], [field]: value };
      return { ...prev, work: newWork };
    });
  };

  const updateBullet = (workIndex: number, bulletIndex: number, value: string) => {
    setLocalResumeData((prev) => {
      const newWork = [...(prev.work || [])];
      const newHighlights = [...(newWork[workIndex].highlights || [])];
      newHighlights[bulletIndex] = value;
      newWork[workIndex] = { ...newWork[workIndex], highlights: newHighlights };
      return { ...prev, work: newWork };
    });
  };

  const renderPreviewContent = () => {
    // API data or edited data available
    switch (activeTab) {
      case 'Resume':
        return (
          <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-sm p-12 min-h-[1000px] animate-in fade-in duration-500 overflow-x-hidden">
            <div className="prose prose-slate max-w-none">
              {markdownPreview ? (
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1
                        className="text-3xl font-black mb-1 border-b-2 border-slate-900 pb-2 uppercase tracking-tight text-slate-900"
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        className="text-lg font-black border-b border-slate-300 mt-8 mb-4 uppercase text-slate-900"
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="text-md font-bold text-slate-800 mt-4 mb-1" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="text-slate-700 text-sm leading-relaxed mb-2" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="text-slate-700 text-sm leading-snug mb-1" {...props} />
                    ),
                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4" {...props} />,
                    hr: ({ node, ...props }) => <hr className="my-6 border-slate-200" {...props} />,
                  }}
                >
                  {markdownPreview}
                </ReactMarkdown>
              ) : (
                <div>
                  <h1 className="text-3xl font-bold mb-1 border-b-2 border-slate-900 pb-2 uppercase tracking-tight">
                    {localResumeData.basics?.name}
                  </h1>
                  <p className="text-slate-600 font-bold mb-6 text-sm tracking-wide">
                    {localResumeData.basics?.label}
                  </p>
                  <pre className="whitespace-pre-wrap text-xs bg-slate-50 p-4 rounded border border-slate-200">
                    {JSON.stringify(localResumeData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
      case 'Keywords':
        return (
          <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-sm p-12 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold mb-6">Extracted Keywords</h2>
            <div className="flex flex-wrap gap-2">
              {data?.keywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                >
                  {keyword}
                </span>
              )) || <p>No keywords extracted yet.</p>}
            </div>
          </div>
        );
      case 'Suggestions':
        return (
          <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-sm p-12 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold mb-6">Improvement Suggestions</h2>
            <ul className="space-y-4">
              {(data?.suggestions || []).map((suggestion, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-900"
                >
                  <span className="material-symbols-outlined text-amber-500 mt-0.5">lightbulb</span>
                  <span className="font-medium">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      case 'Adjust':
        return (
          <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-sm p-12 min-h-[1000px] animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Manual Adjustments</h2>
              <button
                onClick={handleRefreshMarkdown}
                disabled={isRefreshingMarkdown}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold text-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {isRefreshingMarkdown ? 'Refreshing...' : 'Refresh Preview'}
              </button>
            </div>

            <div className="space-y-8">
              <section className="space-y-4">
                <h3 className="text-lg font-bold border-b pb-2">Basics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                    <input
                      value={localResumeData.basics?.name || ''}
                      onChange={(e) => updateBasics('name', e.target.value)}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Tagline / Role
                    </label>
                    <input
                      value={localResumeData.basics?.label || ''}
                      onChange={(e) => updateBasics('label', e.target.value)}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Professional Summary
                  </label>
                  <textarea
                    value={localResumeData.basics?.summary || ''}
                    onChange={(e) => updateBasics('summary', e.target.value)}
                    className="w-full p-2 border rounded h-32 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-lg font-bold border-b pb-2">Professional Experience</h3>
                {(localResumeData.work || []).map((job, idx) => (
                  <div key={idx} className="p-4 border rounded-xl bg-slate-50 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Company
                        </label>
                        <input
                          value={job.company || ''}
                          onChange={(e) => updateWork(idx, 'company', e.target.value)}
                          className="w-full p-2 border rounded bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                        <input
                          value={job.position || ''}
                          onChange={(e) => updateWork(idx, 'position', e.target.value)}
                          className="w-full p-2 border rounded bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Bullet Points
                      </label>
                      {/* Handle both summary text block and highlights array */}
                      {job.highlights && job.highlights.length > 0 ? (
                        job.highlights.map((bullet, bIdx) => (
                          <textarea
                            key={bIdx}
                            value={bullet}
                            onChange={(e) => updateBullet(idx, bIdx, e.target.value)}
                            className="w-full p-2 border rounded bg-white text-sm h-20"
                          />
                        ))
                      ) : (
                        <textarea
                          value={job.summary || ''}
                          onChange={(e) => updateWork(idx, 'summary', e.target.value)}
                          className="w-full p-2 border rounded bg-white text-sm h-32"
                          placeholder="Enter job description or bullets..."
                        />
                      )}
                    </div>
                  </div>
                ))}
              </section>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f6f6f8] relative">
      {/* Top Bar */}
      <header className="flex-none h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate(Route.DASHBOARD)}
            className="text-primary-600 hover:bg-primary-50 p-2 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-600">auto_awesome</span>
            <h1 className="font-bold text-slate-800 text-lg">Tailored Resume Workspace</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Metadata indicators */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
            {loadingMetadata ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-slate-500">history</span>
                  <span className="text-sm font-semibold text-slate-700">
                    {versionCount} versions
                  </span>
                </div>
                <div className="h-4 w-px bg-slate-300"></div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-slate-500">
                    chat_bubble_outline
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {commentCount} comments
                  </span>
                </div>
                {lastUpdated && (
                  <>
                    <div className="h-4 w-px bg-slate-300"></div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-slate-500">
                        update
                      </span>
                      <span className="text-sm font-semibold text-slate-500">
                        Updated {lastUpdated}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="hidden sm:flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  progress_activity
                </span>
                <span>Tailoring...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span>Generate Package</span>
              </>
            )}
          </button>
          <button className="size-10 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Inputs */}
        <div className="w-full lg:w-[480px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10 shadow-lg lg:shadow-none">
          <div className="p-6 border-b border-slate-100">
            <nav className="flex items-center gap-2 mb-2 text-sm">
              <span className="text-slate-400 font-medium">Applications</span>
              <span className="material-symbols-outlined text-slate-300 text-sm">
                chevron_right
              </span>
              <span className="text-slate-800 font-bold">New Application</span>
            </nav>
            <h2 className="text-2xl font-bold text-slate-900">New Application</h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {(error || variantsError) && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">error</span>
                {error || variantsError}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="company-name" className="text-sm font-bold text-slate-700">
                Company Name
              </label>
              <input
                id="company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="job-title" className="text-sm font-bold text-slate-700">
                Job Title (Optional)
              </label>
              <input
                id="job-title"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Product Designer"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="job-description" className="text-sm font-bold text-slate-700">
                Paste Job Description Here
              </label>
              <textarea
                id="job-description"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full min-h-[200px] px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none"
                placeholder="Copy and paste the full job posting..."
              ></textarea>
            </div>

            <div className="space-y-2">
              <label
                id="template-label"
                htmlFor="template-select"
                className="text-sm font-bold text-slate-700"
              >
                Select Template
              </label>
              <div className="relative">
                {variantsLoading ? (
                  <div
                    id="template-select"
                    aria-labelledby="template-label"
                    role="status"
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center"
                  >
                    <span className="text-slate-500">Loading templates...</span>
                  </div>
                ) : (
                  <select
                    id="template-select"
                    value={variant}
                    onChange={(e) => setVariant(e.target.value)}
                    className="w-full appearance-none px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 outline-none cursor-pointer font-medium text-slate-700"
                  >
                    {apiVariants.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.display_name}
                      </option>
                    ))}
                  </select>
                )}
                {!variantsLoading && (
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    expand_more
                  </span>
                )}
              </div>
              {variantsLoading && (
                <p className="text-xs text-slate-500">Fetching available templates...</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 bg-[#f6f6f8] flex flex-col relative overflow-hidden">
          {/* Preview Toolbar */}
          <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-slate-200 shadow-sm z-10">
            <div className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${
                    activeTab === tab
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <button className="p-2 hover:bg-slate-100 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">zoom_out</span>
              </button>
              <span className="text-xs font-bold min-w-[3rem] text-center">100%</span>
              <button className="p-2 hover:bg-slate-100 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">zoom_in</span>
              </button>
              <div className="h-4 w-px bg-slate-300 mx-2"></div>
              <button
                onClick={handleDownloadPDF}
                className="p-2 hover:bg-slate-100 rounded-lg text-primary-600"
                title="Download PDF"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
              </button>
            </div>
          </div>

          {/* Canvas / Render Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-12 flex justify-center bg-slate-100/50">
            {renderPreviewContent() || (
              <div className="flex flex-col items-center justify-center h-full text-center pb-20 opacity-60">
                <div className="bg-white p-6 rounded-full shadow-lg mb-6">
                  <span className="material-symbols-outlined text-5xl text-primary-300">
                    auto_awesome
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to Tailor?</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Input job description on the left to generate your optimized resume package.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Workspace;
