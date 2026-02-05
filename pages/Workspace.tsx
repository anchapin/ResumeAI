import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Route, ResumeData } from '../types';
import { useGeneratePackage } from '../hooks/useGeneratePackage';

interface WorkspaceProps {
    resumeData: ResumeData;
    onNavigate: (route: Route) => void;
}

type TabType = 'Resume' | 'Cover Letter' | 'Analysis';

const Workspace: React.FC<WorkspaceProps> = ({ resumeData, onNavigate }) => {
    const { generatePackage, loading, error, data } = useGeneratePackage();
    const [activeTab, setActiveTab] = useState<TabType>('Resume');
    
    // Form State
    const [companyName, setCompanyName] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [variant, setVariant] = useState('Product Designer (Standard)');
    const [includeCoverLetter, setIncludeCoverLetter] = useState(true);
    const [useAIJudge, setUseAIJudge] = useState(false);

    const handleGenerate = async () => {
        if (!jobDescription || !companyName) {
            alert("Please enter company name and job description.");
            return;
        }

        try {
            await generatePackage({
                resume: resumeData,
                job_description: jobDescription,
                company_name: companyName,
                variant: variant,
                include_cover_letter: includeCoverLetter,
                use_ai_judge: useAIJudge
            });
            setActiveTab('Resume');
        } catch (e) {
            console.error(e);
            // Error is handled by hook state, UI displays it below if needed
        }
    };

    const handleDownloadPDF = async () => {
        if (!data && !companyName) {
             alert("Generate a package first or enter a company name.");
             return;
        }

        try {
            // Using 127.0.0.1 instead of localhost avoids IPv6 resolution issues on some systems
            const response = await fetch('http://127.0.0.1:8000/generate/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resume: resumeData,
                    variant: variant,
                    job_description: jobDescription
                })
            });
            
            if (!response.ok) throw new Error('Download failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Resume-${companyName || 'Draft'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            console.error(e);
            alert("Failed to download PDF. Ensure the backend is running.");
        }
    };

    const renderPreviewContent = () => {
        if (!data) return null;

        let content = "";
        switch (activeTab) {
            case 'Resume':
                content = data.resume_markdown;
                break;
            case 'Cover Letter':
                content = data.cover_letter_markdown || "Cover letter was not generated.";
                break;
            case 'Analysis':
                content = data.analysis || "AI Analysis was not requested.";
                break;
        }

        return (
            <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-sm p-12 min-h-[1000px] animate-in fade-in duration-500">
                <div className="markdown-content">
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            </div>
        );
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
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">error</span>
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Company Name</label>
                            <input 
                                type="text" 
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="e.g. Acme Corp" 
                                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Paste Job Description Here</label>
                            <textarea 
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                className="w-full min-h-[200px] px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none"
                                placeholder="Copy and paste the full job posting..."
                            ></textarea>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Select Base Variant</label>
                            <div className="relative">
                                <select 
                                    value={variant}
                                    onChange={(e) => setVariant(e.target.value)}
                                    className="w-full appearance-none px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 outline-none cursor-pointer font-medium text-slate-700"
                                >
                                    <option>Product Designer (Standard)</option>
                                    <option>Senior Designer (Creative)</option>
                                    <option>UX Engineer (Technical)</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>

                        {/* AI Config */}
                        <div className="pt-6 border-t border-slate-100 space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Configuration</h3>
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Generate Cover Letter?</p>
                                    <p className="text-xs text-slate-500">Craft a custom letter based on job requirements</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={includeCoverLetter}
                                        onChange={(e) => setIncludeCoverLetter(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Use AI Judge</p>
                                    <p className="text-xs text-slate-500">Score the resume alignment before finalizing</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={useAIJudge}
                                        onChange={(e) => setUseAIJudge(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div className="flex-1 bg-[#f6f6f8] flex flex-col relative overflow-hidden">
                    {/* Preview Toolbar */}
                    <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-slate-200 shadow-sm z-10">
                         <div className="flex gap-1">
                            {(['Resume', 'Cover Letter', 'Analysis'] as TabType[]).map((tab) => (
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
                                <p className="text-slate-500 max-w-sm mx-auto">Input the company details and job description on the left to generate your optimized resume package.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Workspace;