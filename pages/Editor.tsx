import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SimpleResumeData, WorkExperience } from '../types';
import ExperienceItem from '../components/ExperienceItem';

interface EditorProps {
  resumeData: SimpleResumeData;
  onUpdate: (data: SimpleResumeData) => void;
  onBack: () => void;
}

const NAV_ITEMS = ['Dashboard', 'My Resumes', 'Templates', 'Settings'];
const TAB_ITEMS = ['Contact Info', 'Summary', 'Experience', 'Skills', 'Education', 'Projects'];

/**
 * Helper function to get a human-readable time difference
 */
function getTimeSince(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

const Editor: React.FC<EditorProps> = ({ resumeData, onUpdate, onBack }) => {
  const experiences = resumeData.experience;
  const [expandedId, setExpandedId] = useState<string | null>(experiences.length > 0 ? experiences[0].id : null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Track when data is saved (after a short debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLastSaved(new Date());
    }, 500); // Debounce to avoid updating too frequently

    return () => clearTimeout(timer);
  }, [resumeData]);

  // Use a ref to hold the latest resumeData so that callbacks can be stable
  const resumeDataRef = useRef(resumeData);
  useEffect(() => {
    resumeDataRef.current = resumeData;
  }, [resumeData]);

  const handleDelete = useCallback((id: string) => {
    const currentData = resumeDataRef.current;
    const newExperiences = currentData.experience.filter(exp => exp.id !== id);
    onUpdate({ ...currentData, experience: newExperiences });
  }, [onUpdate]);

  const handleToggleExpand = useCallback((id: string) => {
    // This depends on expandedId which is local state.
    // However, setExpandedId uses functional update or current state.
    // We can use functional update if we needed, but we toggle based on id.
    // If we want this callback to be stable, it shouldn't depend on expandedId.
    // setExpandedId(prev => prev === id ? null : id);
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const updateExperience = useCallback((id: string, field: keyof WorkExperience, value: any) => {
    const currentData = resumeDataRef.current;
    const newExperiences = currentData.experience.map(exp =>
      exp.id === id ? { ...exp, [field]: value } : exp
    );
    onUpdate({ ...currentData, experience: newExperiences });
  }, [onUpdate]);

  const addTag = useCallback((id: string, tag: string) => {
      if(!tag.trim()) return;
      const currentData = resumeDataRef.current;
      const exp = currentData.experience.find(e => e.id === id);
      if(exp && !exp.tags.includes(tag)) {
          // Logic duplicated from updateExperience to avoid dependency or closure issues, or we could call updateExperience if we are careful.
          // Calling updateExperience inside here is fine if updateExperience is in scope.
          // But updateExperience is defined in the same scope.
          // Since updateExperience is stable, we can use it?
          // No, updateExperience is a const. It might not be initialized if we use it before declaration?
          // It is declared before.
          // But adding it to dependency array makes addTag depend on it.
          // Since updateExperience is stable (only depends on onUpdate), it is fine.
          // However, simpler to just implement the logic directly using the ref.
          const newExperiences = currentData.experience.map(e =>
            e.id === id ? { ...e, tags: [...e.tags, tag] } : e
          );
          onUpdate({ ...currentData, experience: newExperiences });
      }
  }, [onUpdate]);

  const removeTag = useCallback((id: string, tag: string) => {
      const currentData = resumeDataRef.current;
      const exp = currentData.experience.find(e => e.id === id);
      if(exp) {
          const newExperiences = currentData.experience.map(e =>
            e.id === id ? { ...e, tags: e.tags.filter(t => t !== tag) } : e
          );
          onUpdate({ ...currentData, experience: newExperiences });
      }
  }, [onUpdate]);

  return (
    <div className="min-h-screen bg-[#f6f6f8] flex flex-col">
      {/* Navbar */}
      <header className="flex items-center justify-between px-10 py-3 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4 cursor-pointer" onClick={onBack}>
           <div className="bg-primary-600 size-8 rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[18px]">description</span>
           </div>
           <h2 className="text-slate-900 text-lg font-bold">ResumeBuilder SaaS</h2>
        </div>
        <div className="flex items-center gap-8">
            <nav className="flex gap-6">
                {NAV_ITEMS.map(item => (
                    <button key={item} onClick={onBack} className="text-sm font-semibold text-slate-500 hover:text-primary-600 transition-colors">
                        {item}
                    </button>
                ))}
            </nav>
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-200">
                <img src="https://picsum.photos/100/100" alt="Profile" />
            </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center w-full">
        <div className="w-full max-w-[960px] px-6 py-8">
            {/* Header Area */}
            <div className="flex flex-wrap justify-between items-end gap-3 mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Edit Professional Profile</h1>
                    <p className="text-primary-600 font-medium text-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        {lastSaved
                          ? `Saved ${getTimeSince(lastSaved)} ago`
                          : 'Changes not yet saved'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 h-10 rounded-lg bg-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-300 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                        Preview
                    </button>
                    <button className="flex items-center gap-2 px-6 h-10 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20">
                        Save Profile
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-8 overflow-x-auto">
                <div className="flex gap-8">
                    {TAB_ITEMS.map((tab) => {
                        const active = tab === 'Experience';
                        return (
                            <button 
                                key={tab}
                                className={`pb-3 pt-2 text-sm font-bold border-b-[3px] transition-colors ${
                                    active 
                                    ? 'border-primary-600 text-slate-900' 
                                    : 'border-transparent text-slate-500 hover:text-primary-600 hover:border-slate-200'
                                }`}
                            >
                                {tab}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Experience Section */}
            <div className="space-y-6 pb-20">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-900">Work Experience</h2>
                    <span className="text-sm font-medium text-slate-500">{experiences.length} positions listed</span>
                </div>

                {experiences.map((exp) => (
                    <ExperienceItem
                        key={exp.id}
                        exp={exp}
                        isExpanded={expandedId === exp.id}
                        onToggleExpand={handleToggleExpand}
                        onDelete={handleDelete}
                        onUpdate={updateExperience}
                        onAddTag={addTag}
                        onRemoveTag={removeTag}
                    />
                ))}

                <button 
                    onClick={() => {
                        const newId = Date.now().toString();
                        const currentData = resumeDataRef.current;
                        const newExperiences = [...currentData.experience, {
                            id: newId,
                            company: 'New Company',
                            role: 'New Role',
                            startDate: '',
                            endDate: '',
                            current: false,
                            description: '',
                            tags: []
                        }];
                        onUpdate({ ...currentData, experience: newExperiences });
                        setExpandedId(newId);
                    }}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 rounded-xl py-6 text-primary-600 font-bold hover:bg-primary-50/50 hover:border-primary-300 transition-all group"
                >
                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_box</span>
                    Add New Work Experience
                </button>

                {/* Bottom Actions */}
                <div className="flex justify-between items-center border-t border-slate-200 pt-8">
                    <button className="text-slate-500 font-bold text-sm hover:text-red-600 transition-colors">Discard All Changes</button>
                    <div className="flex gap-4">
                        <button className="px-6 py-2.5 rounded-lg border border-primary-600 text-primary-600 font-bold text-sm hover:bg-primary-50 transition-all">Save as Draft</button>
                        <button onClick={onBack} className="px-6 py-2.5 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all">Save & Continue</button>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default Editor;
