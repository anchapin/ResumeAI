import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SimpleResumeData, WorkExperience, EducationEntry, ProjectEntry } from '../types';
import { convertToAPIData, generatePDF, getVariants, VariantMetadata } from '../utils/api-client';
import { TemplateSelector } from '../components/TemplateSelector';
import { LinkedInImportDialog } from '../components/LinkedInImportDialog';
import ExperienceItem from '../components/ExperienceItem';
import ResumePreview from '../components/ResumePreview';

interface EducationItemProps {
    edu: EducationEntry;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onDelete: (id: string) => void;
    onUpdate: (id: string, field: keyof EducationEntry, value: any) => void;
}

const EducationItem = React.memo(({
    edu,
    isExpanded,
    onToggleExpand,
    onDelete,
    onUpdate
}: EducationItemProps) => {
    return (
        <div
            className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${
                isExpanded ? 'border-primary-200 shadow-md ring-1 ring-primary-100' : 'border-slate-200 opacity-80 hover:opacity-100'
            }`}
        >
            {/* Card Header */}
            <div className="p-6 flex items-start justify-between cursor-pointer" onClick={() => onToggleExpand(edu.id)}>
                <div className="flex items-center gap-4">
                    <button className={`p-1 rounded-full transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-slate-100 text-slate-900' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined">expand_more</span>
                    </button>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">{edu.institution}</h3>
                        <p className="text-sm text-slate-500 font-medium">{edu.studyType} in {edu.area} | {edu.startDate} - {edu.endDate}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     <button className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-lg">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                     </button>
                     <button
                        onClick={(e) => { e.stopPropagation(); onDelete(edu.id); }}
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
                            <label className="text-sm font-bold text-slate-700">Institution</label>
                            <input
                                type="text"
                                value={edu.institution}
                                onChange={(e) => onUpdate(edu.id, 'institution', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Degree Type</label>
                            <input
                                type="text"
                                value={edu.studyType}
                                onChange={(e) => onUpdate(edu.id, 'studyType', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Field of Study</label>
                            <input
                                type="text"
                                value={edu.area}
                                onChange={(e) => onUpdate(edu.id, 'area', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                            />
                        </div>
                        <div className="space-y-2"></div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Start Date</label>
                            <input
                                type="text"
                                value={edu.startDate}
                                onChange={(e) => onUpdate(edu.id, 'startDate', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">End Date</label>
                            <input
                                type="text"
                                value={edu.endDate}
                                onChange={(e) => onUpdate(edu.id, 'endDate', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">Relevant Courses</label>
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                {(edu.courses || []).map((course, index) => (
                                    <span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-md text-xs font-bold border border-primary-100">
                                        {course}
                                        <button
                                            onClick={() => {
                                                const newCourses = (edu.courses || []).filter((_, i) => i !== index);
                                                onUpdate(edu.id, 'courses', newCourses);
                                            }}
                                            className="hover:text-primary-900"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    placeholder="+ Add Course"
                                    className="bg-transparent text-xs p-1 focus:ring-0 border-none w-28 placeholder-slate-400"
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter') {
                                            const course = e.currentTarget.value.trim();
                                            if(course) {
                                                onUpdate(edu.id, 'courses', [...(edu.courses || []), course]);
                                                e.currentTarget.value = '';
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

interface ProjectItemProps {
    project: ProjectEntry;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onDelete: (id: string) => void;
    onUpdate: (id: string, field: keyof ProjectEntry, value: any) => void;
}

const ProjectItem = React.memo(({
    project,
    isExpanded,
    onToggleExpand,
    onDelete,
    onUpdate
}: ProjectItemProps) => {
    return (
        <div
            className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${
                isExpanded ? 'border-primary-200 shadow-md ring-1 ring-primary-100' : 'border-slate-200 opacity-80 hover:opacity-100'
            }`}
        >
            {/* Card Header */}
            <div className="p-6 flex items-start justify-between cursor-pointer" onClick={() => onToggleExpand(project.id)}>
                <div className="flex items-center gap-4">
                    <button className={`p-1 rounded-full transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-slate-100 text-slate-900' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined">expand_more</span>
                    </button>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">{project.name}</h3>
                        <p className="text-sm text-slate-500 font-medium">{project.startDate} - {project.endDate}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     <button className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-lg">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                     </button>
                     <button
                        onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
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
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">Project Name</label>
                            <input
                                type="text"
                                value={project.name}
                                onChange={(e) => onUpdate(project.id, 'name', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">Description</label>
                            <textarea
                                value={project.description}
                                onChange={(e) => onUpdate(project.id, 'description', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 h-24 resize-none"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">Project URL</label>
                            <input
                                type="url"
                                value={project.url || ''}
                                onChange={(e) => onUpdate(project.id, 'url', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Start Date</label>
                            <input
                                type="text"
                                value={project.startDate}
                                onChange={(e) => onUpdate(project.id, 'startDate', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">End Date</label>
                            <input
                                type="text"
                                value={project.endDate}
                                onChange={(e) => onUpdate(project.id, 'endDate', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">Roles</label>
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                {(project.roles || []).map((role, index) => (
                                    <span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-md text-xs font-bold border border-primary-100">
                                        {role}
                                        <button
                                            onClick={() => {
                                                const newRoles = (project.roles || []).filter((_, i) => i !== index);
                                                onUpdate(project.id, 'roles', newRoles);
                                            }}
                                            className="hover:text-primary-900"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    placeholder="+ Add Role"
                                    className="bg-transparent text-xs p-1 focus:ring-0 border-none w-24 placeholder-slate-400"
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter') {
                                            const role = e.currentTarget.value.trim();
                                            if(role) {
                                                onUpdate(project.id, 'roles', [...(project.roles || []), role]);
                                                e.currentTarget.value = '';
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 mt-6">
                        <label className="text-sm font-bold text-slate-700">Key Highlights</label>
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
                            <div className="flex flex-wrap items-start gap-2">
                                {(project.highlights || []).map((highlight, index) => (
                                    <span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs font-bold border border-green-100">
                                        {highlight}
                                        <button
                                            onClick={() => {
                                                const newHighlights = (project.highlights || []).filter((_, i) => i !== index);
                                                onUpdate(project.id, 'highlights', newHighlights);
                                            }}
                                            className="hover:text-green-900"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    placeholder="+ Add Highlight"
                                    className="bg-transparent text-xs p-1 focus:ring-0 border-none w-32 placeholder-slate-400"
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter') {
                                            const highlight = e.currentTarget.value.trim();
                                            if(highlight) {
                                                onUpdate(project.id, 'highlights', [...(project.highlights || []), highlight]);
                                                e.currentTarget.value = '';
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

/**
 * @interface EditorProps
 * @description Props for the Editor component
 * @property {SimpleResumeData} resumeData - The resume data to edit
 * @property {Function} onUpdate - Callback to update resume data
 * @property {Function} onBack - Callback to navigate back
 * @property {string} saveStatus - Current save status: 'idle', 'saving', 'saved', or 'error'
 */
interface EditorProps {
  /** The resume data to edit */
  resumeData: SimpleResumeData;
  /** Callback to update resume data */
  onUpdate: (data: SimpleResumeData) => void;
  /** Callback to navigate back */
  onBack: () => void;
  /** Current save status for auto-save indicator */
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

/** Navigation items for the editor header */
const NAV_ITEMS = ['Dashboard', 'My Resumes', 'Templates', 'Settings'];
/** Tab items for the editor content */
const TAB_ITEMS = ['Contact Info', 'Summary', 'Experience', 'Skills', 'Education', 'Projects'];

/**
 * Helper function to get a human-readable time difference
 * @param {Date} date - The date to compare against the current time
 * @returns {string} A human-readable time difference string
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

/**
 * @component
 * @description Editor page component for editing resume data
 * @param {EditorProps} props - Component properties
 * @param {SimpleResumeData} props.resumeData - The resume data to edit
 * @param {Function} props.onUpdate - Callback to update resume data
 * @param {Function} props.onBack - Callback to navigate back
 * @returns {JSX.Element} The rendered editor page component
 * 
 * @example
 * ```tsx
 * <Editor 
 *   resumeData={sampleResumeData} 
 *   onUpdate={(data) => console.log('Updated:', data)} 
 *   onBack={() => console.log('Going back')} 
 * />
 * ```
 */
const Editor: React.FC<EditorProps> = ({ resumeData, onUpdate, onBack, saveStatus = 'idle' }) => {
  const [activeTab, setActiveTab] = useState<string>('Experience');
  
  // PDF generation state
  const [selectedVariant, setSelectedVariant] = useState<string>('modern');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState<boolean>(false);

  // LinkedIn import state
  const [showLinkedInImport, setShowLinkedInImport] = useState<boolean>(false);

  // Real-time preview state
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Drag and drop state for section reordering
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  
  // Fetch variants on mount
  useEffect(() => {
    const loadVariants = async () => {
      try {
        const variants = await getVariants();
        if (variants.length > 0) {
          setSelectedVariant(variants[0].name);
        }
      } catch (err) {
        console.error('Failed to load variants:', err);
      }
    };
    loadVariants();
  }, []);
  
  // Handle PDF generation
  const handleGeneratePDF = useCallback(async () => {
    setIsGeneratingPDF(true);
    setPdfError(null);
    try {
      const pdfBlob = await generatePDF(convertToAPIData(resumeData), selectedVariant);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resume-${selectedVariant}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setPdfError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [resumeData, selectedVariant]);
  
  const handleTemplateChange = useCallback((template: string) => {
    setSelectedVariant(template);
    setShowTemplateSelector(false);
  }, []);
  
  // Handle Save Profile
  const handleSaveProfile = useCallback(async () => {
    try {
      // Save to localStorage as backup
      localStorage.setItem('resume_draft', JSON.stringify(resumeData));

      // TODO: Connect to backend API when available
      // For now, just show success
      alert('Profile saved successfully!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save profile. Please try again.');
    }
  }, [resumeData]);

  // Handle LinkedIn Import
  const handleLinkedInImport = useCallback((importedData: Partial<SimpleResumeData>) => {
    const currentData = resumeDataRef.current;
    
    // Merge imported data with existing data (imported data takes precedence)
    const mergedData: SimpleResumeData = {
      ...currentData,
      name: importedData.name || currentData.name,
      email: importedData.email || currentData.email,
      phone: importedData.phone || currentData.phone,
      location: importedData.location || currentData.location,
      role: importedData.role || currentData.role,
      summary: importedData.summary || currentData.summary,
      skills: importedData.skills?.length ? importedData.skills : currentData.skills,
      experience: importedData.experience?.length ? importedData.experience : currentData.experience,
      education: importedData.education?.length ? importedData.education : currentData.education,
      projects: importedData.projects?.length ? importedData.projects : currentData.projects,
    };
    
    onUpdate(mergedData);
  }, [onUpdate]);

  // Experience state
  const experiences = resumeData.experience;
  const [expandedExpId, setExpandedExpId] = useState<string | null>(experiences.length > 0 ? experiences[0].id : null);

  // Education state
  const education = resumeData.education || [];
  const [expandedEduId, setExpandedEduId] = useState<string | null>(education.length > 0 ? education[0].id : null);

  // Projects state
  const projects = resumeData.projects || [];
  const [expandedProjId, setExpandedProjId] = useState<string | null>(projects.length > 0 ? projects[0].id : null);

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

  // Contact Info handlers
  const updateContact = useCallback((field: keyof SimpleResumeData, value: string) => {
    const currentData = resumeDataRef.current;
    onUpdate({ ...currentData, [field]: value });
  }, [onUpdate]);

  // Summary handlers
  const updateSummary = useCallback((summary: string) => {
    const currentData = resumeDataRef.current;
    onUpdate({ ...currentData, summary });
  }, [onUpdate]);

  // Skills handlers
  const addSkill = useCallback((skill: string) => {
    if(!skill.trim()) return;
    const prev = resumeDataRef.current;
    if(!prev.skills.includes(skill.trim())) {
      onUpdate({ ...prev, skills: [...prev.skills, skill.trim()] });
    }
  }, [onUpdate]);

  const removeSkill = useCallback((skill: string) => {
    const prev = resumeDataRef.current;
    onUpdate({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    });
  }, [onUpdate]);

  // Experience handlers
  const handleDeleteExperience = useCallback((id: string) => {
    const prev = resumeDataRef.current;
    onUpdate({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    });
  }, [onUpdate]);

  const handleToggleExpandExperience = useCallback((id: string) => {
    setExpandedExpId(prev => prev === id ? null : id);
  }, []);

  const updateExperience = useCallback((id: string, field: keyof WorkExperience, value: any) => {
    const prev = resumeDataRef.current;
    onUpdate({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    });
  }, [onUpdate]);

  const addTagToExperience = useCallback((id: string, tag: string) => {
    if(!tag.trim()) return;
    const prev = resumeDataRef.current;
    const exp = prev.experience.find(e => e.id === id);
    if(exp && !exp.tags.includes(tag.trim())) {
      onUpdate({
        ...prev,
        experience: prev.experience.map(e =>
          e.id === id ? { ...e, tags: [...e.tags, tag.trim()] } : e
        )
      });
    }
  }, [onUpdate]);

  const removeTagFromExperience = useCallback((id: string, tag: string) => {
    const prev = resumeDataRef.current;
    onUpdate({
      ...prev,
      experience: prev.experience.map(e =>
        e.id === id ? { ...e, tags: e.tags.filter(t => t !== tag) } : e
      )
    });
  }, [onUpdate]);

  const addExperience = useCallback(() => {
    const newId = Date.now().toString();
    const prev = resumeDataRef.current;
    onUpdate({
      ...prev,
      experience: [...prev.experience, {
        id: newId,
        company: 'New Company',
        role: 'New Role',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
        tags: []
      }]
    });
    setExpandedExpId(newId);
  }, [onUpdate]);

  // Drag and drop handlers for reordering
  const handleDragStart = useCallback((id: string) => {
    setDraggedItemId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedItemId && draggedItemId !== id) {
      setDragOverItemId(id);
    }
  }, [draggedItemId]);

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    if (!draggedItemId || draggedItemId === targetId) return;
    
    const currentData = resumeDataRef.current;
    const items = [...currentData.experience];
    const draggedIndex = items.findIndex(item => item.id === draggedItemId);
    const targetIndex = items.findIndex(item => item.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [draggedItem] = items.splice(draggedIndex, 1);
      items.splice(targetIndex, 0, draggedItem);
      onUpdate({ ...currentData, experience: items });
    }
    
    setDraggedItemId(null);
    setDragOverItemId(null);
  }, [draggedItemId, onUpdate]);

  // Education handlers
  const handleDeleteEducation = useCallback((id: string) => {
    const prev = resumeDataRef.current;
    onUpdate({
      ...prev,
      education: (prev.education || []).filter(edu => edu.id !== id)
    });
  }, [onUpdate]);

  const handleToggleExpandEducation = useCallback((id: string) => {
    setExpandedEduId(prev => prev === id ? null : id);
  }, []);

  const updateEducation = useCallback((id: string, field: keyof EducationEntry, value: any) => {
    const prev = resumeDataRef.current;
    onUpdate({
      ...prev,
      education: (prev.education || []).map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    });
  }, [onUpdate]);

  const addEducation = useCallback(() => {
    const newId = Date.now().toString();
    const prev = resumeDataRef.current;
    onUpdate({
      ...prev,
      education: [...(prev.education || []), {
        id: newId,
        institution: 'New Institution',
        area: '',
        studyType: '',
        startDate: '',
        endDate: '',
        courses: []
      }]
    });
    setExpandedEduId(newId);
  }, [onUpdate]);

  // Projects handlers
  const handleDeleteProject = useCallback((id: string) => {
    const prev = resumeDataRef.current;
    onUpdate({
      ...prev,
      projects: (prev.projects || []).filter(proj => proj.id !== id)
    });
  }, [onUpdate]);

  const handleToggleExpandProject = useCallback((id: string) => {
    setExpandedProjId(prev => prev === id ? null : id);
  }, []);

  const updateProject = useCallback((id: string, field: keyof ProjectEntry, value: any) => {
    const prev = resumeDataRef.current;
    onUpdate({
      ...prev,
      projects: (prev.projects || []).map(proj =>
        proj.id === id ? { ...proj, [field]: value } : proj
      )
    });
  }, [onUpdate]);

  const addProject = useCallback(() => {
    const newId = Date.now().toString();
    const prev = resumeDataRef.current;
    onUpdate({
      ...prev,
      projects: [...(prev.projects || []), {
        id: newId,
        name: 'New Project',
        description: '',
        url: '',
        roles: [],
        startDate: '',
        endDate: '',
        highlights: []
      }]
    });
    setExpandedProjId(newId);
  }, [onUpdate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'Contact Info':
        return (
          <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Contact Information</h2>
                <span className="text-sm font-medium text-slate-500">Basic profile details</span>
            </div>

            {/* LinkedIn Import Card */}
            <div className="bg-gradient-to-r from-[#0077b5] to-[#00a0dc] rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 size-12 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">account_circle</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Import from LinkedIn</h3>
                    <p className="text-sm text-white/80">Quickly populate your profile with LinkedIn data</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLinkedInImport(true)}
                  className="px-4 py-2 bg-white text-[#0077b5] font-semibold rounded-lg hover:bg-white/90 transition-colors shadow-md"
                >
                  Import Now
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Full Name</label>
                        <input
                            type="text"
                            value={resumeData.name}
                            onChange={(e) => updateContact('name', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Email</label>
                        <input
                            type="email"
                            value={resumeData.email}
                            onChange={(e) => updateContact('email', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Phone</label>
                        <input
                            type="tel"
                            value={resumeData.phone}
                            onChange={(e) => updateContact('phone', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Location</label>
                        <input
                            type="text"
                            value={resumeData.location}
                            onChange={(e) => updateContact('location', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-slate-700">Job Title / Role</label>
                        <input
                            type="text"
                            value={resumeData.role}
                            onChange={(e) => updateContact('role', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                        />
                    </div>
                </div>
            </div>
          </div>
        );

      case 'Summary':
        return (
          <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Professional Summary</h2>
                <span className="text-sm font-medium text-slate-500">Brief introduction</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
                <label className="text-sm font-bold text-slate-700">Summary</label>
                <textarea
                    value={resumeData.summary}
                    onChange={(e) => updateSummary(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 resize-none"
                    placeholder="Write a brief professional summary highlighting your experience, skills, and career goals..."
                />
                <p className="text-xs text-slate-500">
                    Tip: Keep your summary concise (3-5 sentences) and focused on your unique value proposition.
                </p>
            </div>
          </div>
        );

      case 'Experience':
        return (
          <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Work Experience</h2>
                <span className="text-sm font-medium text-slate-500">{experiences.length} positions listed</span>
            </div>

            {/* Drag and Drop Hint */}
            {experiences.length > 1 && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">
                <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
                <span>Drag and drop to reorder experience entries</span>
              </div>
            )}

            {experiences.map((exp) => (
                <div
                  key={exp.id}
                  draggable
                  onDragStart={() => handleDragStart(exp.id)}
                  onDragOver={(e) => handleDragOver(e, exp.id)}
                  onDragEnd={handleDragEnd}
                  onDrop={() => handleDrop(exp.id)}
                  className={`transition-all duration-200 ${
                    draggedItemId === exp.id ? 'opacity-50 scale-[0.98]' : ''
                  } ${
                    dragOverItemId === exp.id ? 'ring-2 ring-primary-400 ring-offset-2 rounded-xl' : ''
                  }`}
                >
                  <ExperienceItem
                    exp={exp}
                    isExpanded={expandedExpId === exp.id}
                    onToggleExpand={handleToggleExpandExperience}
                    onDelete={handleDeleteExperience}
                    onUpdate={updateExperience}
                    onAddTag={addTagToExperience}
                    onRemoveTag={removeTagFromExperience}
                  />
                </div>
            ))}

            <button
                onClick={addExperience}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 rounded-xl py-6 text-primary-600 font-bold hover:bg-primary-50/50 hover:border-primary-300 transition-all group"
            >
                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_box</span>
                Add New Work Experience
            </button>
          </div>
        );

      case 'Skills':
        return (
          <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Skills</h2>
                <span className="text-sm font-medium text-slate-500">{resumeData.skills.length} skills listed</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
                <label className="text-sm font-bold text-slate-700">Your Skills</label>
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6">
                    <div className="flex flex-wrap items-center gap-3">
                        {resumeData.skills.map((skill) => (
                            <span key={skill} className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-bold border border-primary-100">
                                {skill}
                                <button
                                    onClick={() => removeSkill(skill)}
                                    className="hover:text-primary-900 ml-1"
                                >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            placeholder="+ Add Skill"
                            className="bg-transparent text-sm p-2 focus:ring-0 border-none w-32 placeholder-slate-400"
                            onKeyDown={(e) => {
                                if(e.key === 'Enter') {
                                    addSkill(e.currentTarget.value);
                                    e.currentTarget.value = '';
                                }
                            }}
                        />
                    </div>
                </div>
                <p className="text-xs text-slate-500">
                    Tip: List both technical skills (programming languages, tools) and soft skills (leadership, communication).
                </p>
            </div>
          </div>
        );

      case 'Education':
        return (
          <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Education</h2>
                <span className="text-sm font-medium text-slate-500">{education.length} entries listed</span>
            </div>

            {education.map((edu) => (
                <EducationItem
                    key={edu.id}
                    edu={edu}
                    isExpanded={expandedEduId === edu.id}
                    onToggleExpand={handleToggleExpandEducation}
                    onDelete={handleDeleteEducation}
                    onUpdate={updateEducation}
                />
            ))}

            <button
                onClick={addEducation}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 rounded-xl py-6 text-primary-600 font-bold hover:bg-primary-50/50 hover:border-primary-300 transition-all group"
            >
                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_box</span>
                Add Education
            </button>
          </div>
        );

      case 'Projects':
        return (
          <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Projects</h2>
                <span className="text-sm font-medium text-slate-500">{projects.length} projects listed</span>
            </div>

            {projects.map((proj) => (
                <ProjectItem
                    key={proj.id}
                    project={proj}
                    isExpanded={expandedProjId === proj.id}
                    onToggleExpand={handleToggleExpandProject}
                    onDelete={handleDeleteProject}
                    onUpdate={updateProject}
                />
            ))}

            <button
                onClick={addProject}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 rounded-xl py-6 text-primary-600 font-bold hover:bg-primary-50/50 hover:border-primary-300 transition-all group"
            >
                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_box</span>
                Add Project
            </button>
          </div>
        );

      default:
        return null;
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

      <main className={`flex-1 flex w-full ${showPreview ? 'flex-row' : 'flex-col items-center'}`}>
        {/* Editor Panel */}
        <div className={`${showPreview ? 'w-1/2 overflow-y-auto' : 'w-full max-w-[960px]'} px-6 py-8`}>
            {/* Header Area */}
            <div className="flex flex-wrap justify-between items-end gap-3 mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Edit Professional Profile</h1>
                    <p className={`font-medium text-sm flex items-center gap-1 ${
                      saveStatus === 'error' ? 'text-red-600' :
                      saveStatus === 'saving' ? 'text-amber-600' :
                      saveStatus === 'saved' ? 'text-green-600' : 'text-primary-600'
                    }`}>
                        {saveStatus === 'saving' && (
                          <>
                            <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                            Saving...
                          </>
                        )}
                        {saveStatus === 'saved' && (
                          <>
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Saved
                          </>
                        )}
                        {saveStatus === 'error' && (
                          <>
                            <span className="material-symbols-outlined text-sm">error</span>
                            Save failed
                          </>
                        )}
                        {saveStatus === 'idle' && lastSaved && (
                          <>
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Saved {getTimeSince(lastSaved)} ago
                          </>
                        )}
                        {saveStatus === 'idle' && !lastSaved && (
                          <>
                            <span className="material-symbols-outlined text-sm">edit</span>
                            Changes not yet saved
                          </>
                        )}
                    </p>
                </div>
                <div className="flex gap-3">
                    {/* Preview Toggle Button */}
                    <button 
                        onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-2 px-4 h-10 rounded-lg border font-bold text-sm transition-colors shadow-sm ${
                          showPreview 
                            ? 'bg-primary-600 text-white border-primary-600' 
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">{showPreview ? 'visibility_off' : 'visibility'}</span>
                        {showPreview ? 'Hide Preview' : 'Preview'}
                    </button>
                    <button 
                        onClick={handleGeneratePDF}
                        disabled={isGeneratingPDF}
                        className="flex items-center gap-2 px-6 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
                    </button>
                    <button onClick={handleSaveProfile} className="flex items-center gap-2 px-6 h-10 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20">
                        Save Profile
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-8 overflow-x-auto">
                <div className="flex gap-8">
                    {TAB_ITEMS.map((tab) => {
                        const active = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
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

            {/* Content Area */}
            {renderContent()}

            {/* Bottom Actions */}
            <div className="flex justify-between items-center border-t border-slate-200 pt-8">
                <button className="text-slate-500 font-bold text-sm hover:text-red-600 transition-colors">Discard All Changes</button>
                <div className="flex gap-4">
                    <button className="px-6 py-2.5 rounded-lg border border-primary-600 text-primary-600 font-bold text-sm hover:bg-primary-50 transition-all">Save as Draft</button>
                    <button onClick={onBack} className="px-6 py-2.5 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all">Save & Continue</button>
                </div>
            </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2 h-[calc(100vh-60px)] sticky top-[60px] border-l border-slate-200">
            <ResumePreview
              resumeData={resumeData}
              variant={selectedVariant}
              splitMode={true}
              onGeneratePDF={handleGeneratePDF}
              isGeneratingPDF={isGeneratingPDF}
            />
          </div>
        )}
      </main>

      {/* LinkedIn Import Dialog */}
      <LinkedInImportDialog
        isOpen={showLinkedInImport}
        onClose={() => setShowLinkedInImport(false)}
        onImport={handleLinkedInImport}
      />
    </div>
  );
};

export default Editor;
