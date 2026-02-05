import React, { useState } from 'react';
import { ResumeData, WorkExperience } from '../types';

interface EditorProps {
  resumeData: ResumeData;
  onUpdate: (data: ResumeData) => void;
  onBack: () => void;
}

const NAV_ITEMS = ['Dashboard', 'My Resumes', 'Templates', 'Settings'];
const TAB_ITEMS = ['Contact Info', 'Summary', 'Experience', 'Skills', 'Education', 'Projects'];

const Editor: React.FC<EditorProps> = ({ resumeData, onUpdate, onBack }) => {
  const experiences = resumeData.experience;
  const [expandedId, setExpandedId] = useState<string | null>(experiences.length > 0 ? experiences[0].id : null);

  const setExperiences = (newExperiences: WorkExperience[]) => {
      onUpdate({ ...resumeData, experience: newExperiences });
  };

  const handleDelete = (id: string) => {
    setExperiences(experiences.filter(exp => exp.id !== id));
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const updateExperience = (id: string, field: keyof WorkExperience, value: any) => {
    setExperiences(experiences.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  const addTag = (id: string, tag: string) => {
      if(!tag.trim()) return;
      const exp = experiences.find(e => e.id === id);
      if(exp && !exp.tags.includes(tag)) {
          updateExperience(id, 'tags', [...exp.tags, tag]);
      }
  };

  const removeTag = (id: string, tag: string) => {
      const exp = experiences.find(e => e.id === id);
      if(exp) {
          updateExperience(id, 'tags', exp.tags.filter(t => t !== tag));
      }
  };

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
                        Last saved 2 minutes ago
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

                {experiences.map((exp) => {
                    const isExpanded = expandedId === exp.id;
                    return (
                        <div 
                            key={exp.id} 
                            className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${
                                isExpanded ? 'border-primary-200 shadow-md ring-1 ring-primary-100' : 'border-slate-200 opacity-80 hover:opacity-100'
                            }`}
                        >
                            {/* Card Header */}
                            <div className="p-6 flex items-start justify-between cursor-pointer" onClick={() => handleToggleExpand(exp.id)}>
                                <div className="flex items-center gap-4">
                                    <button className={`p-1 rounded-full transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-slate-100 text-slate-900' : 'text-slate-400'}`}>
                                        <span className="material-symbols-outlined">expand_more</span>
                                    </button>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg">{exp.role}</h3>
                                        <p className="text-sm text-slate-500 font-medium">{exp.company} | {exp.startDate} - {exp.endDate}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-lg">
                                        <span className="material-symbols-outlined text-[20px]">edit</span>
                                     </button>
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(exp.id); }}
                                        className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg"
                                     >
                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                     </button>
                                </div>
                            </div>

                            {/* Card Body (Expanded) */}
                            {isExpanded && (
                                <div className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 fade-in duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pt-4 border-t border-slate-100">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Company Name</label>
                                            <input 
                                                type="text" 
                                                value={exp.company}
                                                onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Job Title</label>
                                            <input 
                                                type="text" 
                                                value={exp.role}
                                                onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Start Date</label>
                                            <input 
                                                type="text" 
                                                value={exp.startDate}
                                                onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">End Date</label>
                                            <input 
                                                type="text" 
                                                value={exp.endDate}
                                                onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-slate-700">Achievements & Responsibilities</label>
                                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
                                            <textarea 
                                                value={exp.description}
                                                onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-slate-700 resize-none h-20 placeholder-slate-400"
                                                placeholder="Describe your achievements..."
                                            />
                                            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tags:</span>
                                                {exp.tags.map(tag => (
                                                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-md text-xs font-bold border border-primary-100">
                                                        {tag}
                                                        <button 
                                                            onClick={() => removeTag(exp.id, tag)}
                                                            className="hover:text-primary-900"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                                        </button>
                                                    </span>
                                                ))}
                                                <input 
                                                    type="text"
                                                    placeholder="+ Add Skill"
                                                    className="bg-transparent text-xs p-1 focus:ring-0 border-none w-24 placeholder-slate-400"
                                                    onKeyDown={(e) => {
                                                        if(e.key === 'Enter') {
                                                            addTag(exp.id, e.currentTarget.value);
                                                            e.currentTarget.value = '';
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <button className="flex items-center text-primary-600 text-sm font-bold hover:underline gap-1 mt-2">
                                            <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                            Add Another Achievement
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                <button 
                    onClick={() => {
                        const newId = Date.now().toString();
                        setExperiences([...experiences, {
                            id: newId,
                            company: 'New Company',
                            role: 'New Role',
                            startDate: '',
                            endDate: '',
                            current: false,
                            description: '',
                            tags: []
                        }]);
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