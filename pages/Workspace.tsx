import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Route, SimpleResumeData } from '../types';
import { useGeneratePackage, convertToResumeData } from '../hooks/useGeneratePackage';
import { useVariants } from '../hooks/useVariants';

interface WorkspaceProps {
    resumeData: SimpleResumeData;
    onNavigate: (route: Route) => void;
}

type TabType = 'Resume' | 'Keywords' | 'Suggestions';

const TABS: TabType[] = ['Resume', 'Keywords', 'Suggestions'];

const Workspace: React.FC<WorkspaceProps> = ({ resumeData, onNavigate }) => {
    const { generatePackage, downloadPDF, loading, error, data } = useGeneratePackage();
    const { variants: apiVariants, loading: variantsLoading, error: variantsError } = useVariants();
    const [activeTab, setActiveTab] = useState<TabType>('Resume');

    // Form State
    const [companyName, setCompanyName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [variant, setVariant] = useState('base');

    // Initialize with API variants once loaded
    useEffect(() => {
        if (apiVariants.length > 0) {
            // Set default to first variant if 'base' is not available
            const defaultVariant = apiVariants.some(v => v.name === 'base') ? 'base' : apiVariants[0].name;
            setVariant(defaultVariant);
        }
    }, [apiVariants]);

    const handleGenerate = async () => {
        if (!jobDescription) {
            alert("Please enter a job description.");
            return;
        }

        try {
            await generatePackage({
                resume_data: convertToResumeData(resumeData),
                job_description: jobDescription,
                company_name: companyName || undefined,
                job_title: jobTitle || undefined
            });
            setActiveTab('Resume');
        } catch (e) {
            console.error(e);
            // Error is handled by hook state, UI displays it below if needed
        }
    };

    const handleDownloadPDF = async () => {
        if (!companyName) {
            alert("Please enter a company name before downloading.");
            return;
        }

        try {
            await downloadPDF({
                resume_data: convertToResumeData(resumeData),
                variant: variant
            });
        } catch (e) {
            console.error(e);
            alert("Failed to download PDF. Ensure backend is running.");
        }
    };

    const renderPreviewContent = () => {
        if (!data) {
            // No API data yet, display local resumeData
            return (
                <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-sm p-12 min-h-[1000px] animate-in fade-in duration-500">
                    <div className="markdown-content">
                        <h2 className="text-xl font-bold mb-4">{resumeData.name || 'Resume'}</h2>
                        <p className="text-gray-600 mb-6">{resumeData.role || 'Professional'}</p>
                        <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(resumeData, null, 2)}</pre>
                    </div>
                </div>
            );
        }

        // API data available, display the tailored resume
        switch (activeTab) {
            case 'Resume':
                return (
                    <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-sm p-12 min-h-[1000px] animate-in fade-in duration-500">
                        <div className="markdown-content">
                            <h2 className="text-xl font-bold mb-4">{data.resume_data.basics?.name || 'Resume'}</h2>
                            <p className="text-gray-600 mb-6">{data.resume_data.basics?.label || 'Professional'}</p>
                            <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(data.resume_data, null, 2)}</pre>
                        </div>
                    </div>
                );
            case 'Keywords':
                return (
                    <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-sm p-12 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold mb-6">Extracted Keywords</h2>
                        <div className="flex flex-wrap gap-2">
                            {data.keywords.map((keyword, idx) => (
                                <span key={idx} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                                    {keyword}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            case 'Suggestions':
                return (
                    <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-sm p-12 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold mb-6">Improvement Suggestions</h2>
                        <div className="prose">
                            <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(data.suggestions, null, 2)}</pre>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#f6f6f8]">
            {/* Top Bar */}
            <header className="flex-none h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                     <button onClick={() => onNavigate(Route.DASHBOARD)} className="text-primary-600 hover:bg-primary-50 p-2 rounded-lg transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                     </button>
                     <div className="h-6 w-px bg-slate-200"></div>
                     <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-600">auto_awesome</span>
                        <h1 className="font-bold text-slate-800 text-lg">Tailored Resume Workspace</h1>
                     </div>
                </div>
                <div className="flex items-center gap-3">
                     <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="hidden sm:flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                             <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
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
                             <span className="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
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
                            <label htmlFor="companyName" className="text-sm font-bold text-slate-700">Company Name</label>
                            <input
                                id="companyName"
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="e.g. Acme Corp"
                                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="jobTitle" className="text-sm font-bold text-slate-700">Job Title (Optional)</label>
                            <input
                                id="jobTitle"
                                type="text"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                placeholder="e.g. Senior Product Designer"
                                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="jobDescription" className="text-sm font-bold text-slate-700">Paste Job Description Here</label>
                            <textarea
                                id="jobDescription"
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                className="w-full min-h-[200px] px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none"
                                placeholder="Copy and paste the full job posting..."
                            ></textarea>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="templateSelect" className="text-sm font-bold text-slate-700">Select Template</label>
                            <div className="relative">
                                {variantsLoading ? (
                                    <div className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center">
                                        <span className="text-slate-500">Loading templates...</span>
                                    </div>
                                ) : (
                                    <select
                                        value={variant}
                                        onChange={(e) => setVariant(e.target.value)}
                                        className="w-full appearance-none px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 outline-none cursor-pointer font-medium text-slate-700"
                                    >
                                        {apiVariants.map(v => (
                                            <option key={v.name} value={v.name}>{v.display_name}</option>
                                        ))}
                                    </select>
                                )}
                                {!variantsLoading && (
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
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
                             <button className="p-2 hover:bg-slate-100 rounded-lg"><span className="material-symbols-outlined text-[20px]">zoom_out</span></button>
                             <span className="text-xs font-bold min-w-[3rem] text-center">100%</span>
                             <button className="p-2 hover:bg-slate-100 rounded-lg"><span className="material-symbols-outlined text-[20px]">zoom_in</span></button>
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
                        {data ? renderPreviewContent() : (
                            <div className="flex flex-col items-center justify-center h-full text-center pb-20 opacity-60">
                                <div className="bg-white p-6 rounded-full shadow-lg mb-6">
                                     <span className="material-symbols-outlined text-5xl text-primary-300">auto_awesome</span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to Tailor?</h3>
                                <p className="text-slate-500 max-w-sm mx-auto">Input job description on the left to generate your optimized resume package.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Workspace;