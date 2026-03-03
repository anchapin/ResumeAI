import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleResumeData, WorkExperience, EducationEntry, ProjectEntry, Comment } from '../types';
import {
  convertToAPIData,
  generatePDF,
  getVariants,
  listComments,
  updateResume,
} from '../utils/api-client';
import { useStore } from '../store/store';
import { LinkedInImportDialog } from '../components/LinkedInImportDialog';
import ResumePreview from '../components/ResumePreview';
import VersionHistory from '../components/VersionHistory';
import CommentPanel from '../components/CommentPanel';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { ContactInfoSection } from '../components/editor/ContactInfoSection';
import { SummarySection } from '../components/editor/SummarySection';
import { ExperienceSection } from '../components/editor/ExperienceSection';
import { SkillsSection } from '../components/editor/SkillsSection';
import { EducationSection } from '../components/editor/EducationSection';
import { ProjectsSection } from '../components/editor/ProjectsSection';
import { EditorTabs } from '../components/editor/EditorTabs';

/** Navigation items for the editor header */
const NAV_ITEMS = ['Dashboard', 'My Resumes', 'Templates', 'Settings'];

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
 */
const Editor = () => {
  const navigate = useNavigate();

  // Store state
  const resumeData = useStore((state) => state.resumeData);
  const setResumeData = useStore((state) => state.setResumeData);

  const [activeTab, setActiveTab] = useState<string>('Experience');

  // PDF generation state
  const [selectedVariant, setSelectedVariant] = useState<string>('modern');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  // LinkedIn import state
  const [showLinkedInImport, setShowLinkedInImport] = useState<boolean>(false);

  // Real-time preview state
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Drag and drop state for section reordering
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Versioning state
  const [showVersionHistory, setShowVersionHistory] = useState<boolean>(false);
  const [showSaveVersionDialog, setShowSaveVersionDialog] = useState<boolean>(false);
  const [versionDescription, setVersionDescription] = useState<string>('');
  const [currentResumeId] = useState<number>(1); // Mock resume ID - in real app, this would come from props or context
  const [savingVersion, setSavingVersion] = useState<boolean>(false);

  // Comments state
  const [showCommentPanel, setShowCommentPanel] = useState<boolean>(false);
  const [unresolvedCommentCount, setUnresolvedCommentCount] = useState<number>(0);

  const handleCommentCountChange = useCallback((count: number) => {
    setUnresolvedCommentCount(count);
  }, []);

  // Use a ref to hold the latest resumeData so that callbacks can be stable
  const resumeDataRef = useRef(resumeData);
  useEffect(() => {
    resumeDataRef.current = resumeData;
  }, [resumeData]);

  // Undo/Redo functionality
  const MAX_HISTORY = 50;
  const [history, setHistory] = useState<SimpleResumeData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef<{ history: SimpleResumeData[]; index: number }>({
    history: [],
    index: -1,
  });

  // Track history in ref for stable callbacks
  useEffect(() => {
    historyRef.current = { history, index: historyIndex };
  }, [history, historyIndex]);

  // Add state to history
  const addToHistory = useCallback((newState: SimpleResumeData) => {
    setHistory((prev) => {
      const newIndex = historyRef.current.index + 1;
      const trimmed = prev.slice(0, newIndex);
      const updated = [...trimmed, newState];
      const final = updated.slice(-MAX_HISTORY);
      return final;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, []);

  // Wrap setResumeData to track history
  const trackedUpdate = useCallback(
    (newData: SimpleResumeData) => {
      const currentData = resumeDataRef.current;
      if (JSON.stringify(currentData) !== JSON.stringify(newData)) {
        addToHistory(newData);
      }
      setResumeData(newData);
    },
    [setResumeData, addToHistory],
  );

  const undo = useCallback(() => {
    const { history: currentHistory, index: currentIndex } = historyRef.current;
    if (currentIndex <= 0) return;
    const newIndex = currentIndex - 1;
    setHistoryIndex(newIndex);
    setResumeData(currentHistory[newIndex]);
  }, [setResumeData]);

  const redo = useCallback(() => {
    const { history: currentHistory, index: currentIndex } = historyRef.current;
    if (currentIndex >= currentHistory.length - 1) return;
    const newIndex = currentIndex + 1;
    setHistoryIndex(newIndex);
    setResumeData(currentHistory[newIndex]);
  }, [setResumeData]);

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
    try {
      const currentData = resumeDataRef.current;
      const pdfBlob = await generatePDF(convertToAPIData(currentData), selectedVariant);
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
      showErrorToast(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [selectedVariant, convertToAPIData]);

  // Handle saving current resume as a new version
  const handleSaveVersion = useCallback(async () => {
    if (!versionDescription.trim()) {
      showErrorToast('Please enter a version description');
      return;
    }

    try {
      setSavingVersion(true);
      const currentData = resumeDataRef.current;
      await updateResume(currentResumeId, {
        data: convertToAPIData(currentData),
        changeDescription: versionDescription.trim(),
      });
      showSuccessToast('Version saved successfully!');
      setVersionDescription('');
      setShowSaveVersionDialog(false);
    } catch (err) {
      console.error('Failed to save version:', err);
      showErrorToast('Failed to save version. Please try again.');
    } finally {
      setSavingVersion(false);
    }
  }, [currentResumeId, versionDescription, convertToAPIData]);

  // Handle Restore Version
  const handleRestoreVersion = useCallback(
    async (version: any) => {
      try {
        const currentData = resumeDataRef.current;
        trackedUpdate({
          ...currentData,
          ...version.data,
        });
        showSuccessToast('Version restored successfully!');
      } catch (err) {
        console.error('Failed to restore version:', err);
        showErrorToast('Failed to restore version. Please try again.');
      }
    },
    [trackedUpdate],
  );

  // Handle Save Profile
  const handleSaveProfile = useCallback(async () => {
    try {
      const currentData = resumeDataRef.current;
      localStorage.setItem('resume_draft', JSON.stringify(currentData));
      alert('Profile saved successfully!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save profile. Please try again.');
    }
  }, []);

  // Handle LinkedIn Import
  const handleLinkedInImport = useCallback(
    (importedData: Partial<SimpleResumeData>) => {
      const currentData = resumeDataRef.current;
      const mergedData: SimpleResumeData = {
        ...currentData,
        name: importedData.name || currentData.name,
        email: importedData.email || currentData.email,
        phone: importedData.phone || currentData.phone,
        location: importedData.location || currentData.location,
        role: importedData.role || currentData.role,
        summary: importedData.summary || currentData.summary,
        skills: importedData.skills?.length ? importedData.skills : currentData.skills,
        experience: importedData.experience?.length
          ? importedData.experience
          : currentData.experience,
        education: importedData.education?.length ? importedData.education : currentData.education,
        projects: importedData.projects?.length ? importedData.projects : currentData.projects,
      };
      trackedUpdate(mergedData);
    },
    [trackedUpdate],
  );

  // Experience state
  const experiences = resumeData.experience;
  const [expandedExpId, setExpandedExpId] = useState<string | null>(
    experiences.length > 0 ? experiences[0].id : null,
  );

  // Education state
  const education = resumeData.education || [];
  const [expandedEduId, setExpandedEduId] = useState<string | null>(
    education.length > 0 ? education[0].id : null,
  );

  // Projects state
  const projects = resumeData.projects || [];
  const [expandedProjId, setExpandedProjId] = useState<string | null>(
    projects.length > 0 ? projects[0].id : null,
  );

  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Track when data is saved (after a short debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLastSaved(new Date());
    }, 500);
    return () => clearTimeout(timer);
  }, [resumeData]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Load unresolved comment count
  useEffect(() => {
    const loadCommentCount = async () => {
      try {
        const comments = await listComments(currentResumeId);
        const unresolvedCount = (comments as Comment[]).filter((c) => !c.isResolved).length;
        setUnresolvedCommentCount(unresolvedCount);
      } catch (err) {
        console.error('Failed to load comments:', err);
      }
    };
    loadCommentCount();
  }, [currentResumeId]);

  const updateContact = useCallback(
    (field: keyof SimpleResumeData, value: string) => {
      const currentData = resumeDataRef.current;
      trackedUpdate({ ...currentData, [field]: value });
    },
    [trackedUpdate],
  );

  const updateSummary = useCallback(
    (summary: string) => {
      const currentData = resumeDataRef.current;
      trackedUpdate({ ...currentData, summary });
    },
    [trackedUpdate],
  );

  const addSkill = useCallback(
    (skill: string) => {
      if (!skill.trim()) return;
      const prev = resumeDataRef.current;
      if (!prev.skills.includes(skill.trim())) {
        trackedUpdate({ ...prev, skills: [...prev.skills, skill.trim()] });
      }
    },
    [trackedUpdate],
  );

  const removeSkill = useCallback(
    (skill: string) => {
      const prev = resumeDataRef.current;
      trackedUpdate({
        ...prev,
        skills: prev.skills.filter((s) => s !== skill),
      });
    },
    [trackedUpdate],
  );

  const handleDeleteExperience = useCallback(
    (id: string) => {
      const prev = resumeDataRef.current;
      trackedUpdate({
        ...prev,
        experience: prev.experience.filter((exp) => exp.id !== id),
      });
    },
    [trackedUpdate],
  );

  const handleToggleExpandExperience = useCallback((id: string) => {
    setExpandedExpId((prev) => (prev === id ? null : id));
  }, []);

  const updateExperience = useCallback(
    <K extends keyof WorkExperience>(id: string, field: K, value: WorkExperience[K]) => {
      const prev = resumeDataRef.current;
      trackedUpdate({
        ...prev,
        experience: prev.experience.map((exp) =>
          exp.id === id ? { ...exp, [field]: value } : exp,
        ),
      });
    },
    [trackedUpdate],
  );

  const addTagToExperience = useCallback(
    (id: string, tag: string) => {
      if (!tag.trim()) return;
      const prev = resumeDataRef.current;
      const exp = prev.experience.find((e) => e.id === id);
      if (exp && !exp.tags.includes(tag.trim())) {
        trackedUpdate({
          ...prev,
          experience: prev.experience.map((e) =>
            e.id === id ? { ...e, tags: [...e.tags, tag.trim()] } : e,
          ),
        });
      }
    },
    [trackedUpdate],
  );

  const removeTagFromExperience = useCallback(
    (id: string, tag: string) => {
      const prev = resumeDataRef.current;
      trackedUpdate({
        ...prev,
        experience: prev.experience.map((e) =>
          e.id === id ? { ...e, tags: e.tags.filter((t) => t !== tag) } : e,
        ),
      });
    },
    [trackedUpdate],
  );

  const addExperience = useCallback(() => {
    const newId = Date.now().toString();
    const prev = resumeDataRef.current;
    trackedUpdate({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: newId,
          company: 'New Company',
          role: 'New Role',
          startDate: '',
          endDate: '',
          current: false,
          description: '',
          tags: [],
        },
      ],
    });
    setExpandedExpId(newId);
  }, [trackedUpdate]);

  // Drag and drop handlers for reordering
  const handleDragStart = useCallback((id: string) => {
    setDraggedItemId(id);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, id: string) => {
      e.preventDefault();
      if (draggedItemId && draggedItemId !== id) {
        setDragOverItemId(id);
      }
    },
    [draggedItemId],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  }, []);

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!draggedItemId || draggedItemId === targetId) return;

      const currentData = resumeDataRef.current;
      const items = [...currentData.experience];
      const draggedIndex = items.findIndex((item) => item.id === draggedItemId);
      const targetIndex = items.findIndex((item) => item.id === targetId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [draggedItem] = items.splice(draggedIndex, 1);
        items.splice(targetIndex, 0, draggedItem);
        trackedUpdate({ ...currentData, experience: items });
      }

      setDraggedItemId(null);
      setDragOverItemId(null);
    },
    [draggedItemId, trackedUpdate],
  );

  const handleDeleteEducation = useCallback(
    (id: string) => {
      const prev = resumeDataRef.current;
      trackedUpdate({
        ...prev,
        education: (prev.education || []).filter((edu) => edu.id !== id),
      });
    },
    [trackedUpdate],
  );

  const handleToggleExpandEducation = useCallback((id: string) => {
    setExpandedEduId((prev) => (prev === id ? null : id));
  }, []);

  const updateEducation = useCallback(
    <K extends keyof EducationEntry>(id: string, field: K, value: EducationEntry[K]) => {
      const prev = resumeDataRef.current;
      trackedUpdate({
        ...prev,
        education: (prev.education || []).map((edu) =>
          edu.id === id ? { ...edu, [field]: value } : edu,
        ),
      });
    },
    [trackedUpdate],
  );

  const addEducation = useCallback(() => {
    const newId = Date.now().toString();
    const prev = resumeDataRef.current;
    trackedUpdate({
      ...prev,
      education: [
        ...(prev.education || []),
        {
          id: newId,
          institution: 'New Institution',
          area: '',
          studyType: '',
          startDate: '',
          endDate: '',
          courses: [],
        },
      ],
    });
    setExpandedEduId(newId);
  }, [trackedUpdate]);

  const handleDeleteProject = useCallback(
    (id: string) => {
      const prev = resumeDataRef.current;
      trackedUpdate({
        ...prev,
        projects: (prev.projects || []).filter((proj) => proj.id !== id),
      });
    },
    [trackedUpdate],
  );

  const handleToggleExpandProject = useCallback((id: string) => {
    setExpandedProjId((prev) => (prev === id ? null : id));
  }, []);

  const updateProject = useCallback(
    <K extends keyof ProjectEntry>(id: string, field: K, value: ProjectEntry[K]) => {
      const prev = resumeDataRef.current;
      trackedUpdate({
        ...prev,
        projects: (prev.projects || []).map((proj) =>
          proj.id === id ? { ...proj, [field]: value } : proj,
        ),
      });
    },
    [trackedUpdate],
  );

  const addProject = useCallback(() => {
    const newId = Date.now().toString();
    const prev = resumeDataRef.current;
    trackedUpdate({
      ...prev,
      projects: [
        ...(prev.projects || []),
        {
          id: newId,
          name: 'New Project',
          description: '',
          url: '',
          roles: [],
          startDate: '',
          endDate: '',
          highlights: [],
        },
      ],
    });
    setExpandedProjId(newId);
  }, [trackedUpdate]);

  const handleShowLinkedInImport = useCallback(() => setShowLinkedInImport(true), []);
  const handleShowCommentPanel = useCallback(() => setShowCommentPanel(true), []);
  const handleShowVersionHistory = useCallback(() => setShowVersionHistory(true), []);
  const handleShowSaveVersionDialog = useCallback(() => setShowSaveVersionDialog(true), []);

  const renderContent = () => {
    switch (activeTab) {
      case 'Contact Info':
        return (
          <ContactInfoSection
            resumeData={resumeData}
            onUpdate={updateContact}
            onShowLinkedInImport={handleShowLinkedInImport}
            onShowCommentPanel={handleShowCommentPanel}
            unresolvedCommentCount={unresolvedCommentCount}
          />
        );

      case 'Summary':
        return (
          <SummarySection
            summary={resumeData.summary}
            onUpdate={updateSummary}
            onShowCommentPanel={handleShowCommentPanel}
          />
        );

      case 'Experience':
        return (
          <ExperienceSection
            experiences={experiences}
            expandedExpId={expandedExpId}
            onToggleExpand={handleToggleExpandExperience}
            onDelete={handleDeleteExperience}
            onUpdate={updateExperience}
            onAddTag={addTagToExperience}
            onRemoveTag={removeTagFromExperience}
            onAdd={addExperience}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            draggedItemId={draggedItemId}
            dragOverItemId={dragOverItemId}
            onShowCommentPanel={handleShowCommentPanel}
          />
        );

      case 'Skills':
        return (
          <SkillsSection
            skills={resumeData.skills}
            onAddSkill={addSkill}
            onRemoveSkill={removeSkill}
            onShowCommentPanel={handleShowCommentPanel}
          />
        );

      case 'Education':
        return (
          <EducationSection
            education={education}
            expandedEduId={expandedEduId}
            onToggleExpand={handleToggleExpandEducation}
            onDelete={handleDeleteEducation}
            onUpdate={updateEducation}
            onAdd={addEducation}
            onShowCommentPanel={handleShowCommentPanel}
          />
        );

      case 'Projects':
        return (
          <ProjectsSection
            projects={projects}
            expandedProjId={expandedProjId}
            onToggleExpand={handleToggleExpandProject}
            onDelete={handleDeleteProject}
            onUpdate={updateProject}
            onAdd={addProject}
            onShowCommentPanel={handleShowCommentPanel}
          />
        );

      default:
        return null;
    }
  };

  const saveStatus = useStore((state) => state.saveStatus);

  return (
    <div className="min-h-screen bg-[#f6f6f8] flex flex-col">
      {/* Navbar */}
      <header className="flex items-center justify-between px-10 py-3 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div
          className="flex items-center gap-4 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          <div className="bg-primary-600 size-8 rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[18px]">description</span>
          </div>
          <h2 className="text-slate-900 text-lg font-bold">ResumeBuilder SaaS</h2>
        </div>
        <div className="flex items-center gap-8">
          <nav className="flex gap-6">
            {NAV_ITEMS.map((item) => (
              <button
                key={item}
                onClick={() => navigate('/dashboard')}
                className="text-sm font-semibold text-slate-500 hover:text-primary-600 transition-colors"
              >
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
        <div
          className={`${showPreview ? 'w-1/2 overflow-y-auto' : 'w-full max-w-[960px]'} px-6 py-8`}
        >
          {/* Header Area */}
          <div className="flex flex-wrap justify-between items-end gap-3 mb-8">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                Edit Professional Profile
              </h1>
              <p
                className={`font-medium text-sm flex items-center gap-1 ${
                  saveStatus === 'error'
                    ? 'text-red-600'
                    : saveStatus === 'saving'
                      ? 'text-amber-600'
                      : saveStatus === 'saved'
                        ? 'text-green-600'
                        : 'text-primary-600'
                }`}
              >
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
              {/* Undo Button */}
              <button
                onClick={undo}
                disabled={!canUndo}
                className="flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <span className="material-symbols-outlined text-lg">undo</span>
                <span className="hidden sm:inline">Undo</span>
              </button>
              {/* Redo Button */}
              <button
                onClick={redo}
                disabled={!canRedo}
                className="flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
              >
                <span className="material-symbols-outlined text-lg">redo</span>
                <span className="hidden sm:inline">Redo</span>
              </button>
              {/* Comments Button */}
              <button
                onClick={handleShowCommentPanel}
                className="flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm relative"
                title="View comments"
              >
                <span className="material-symbols-outlined text-lg">chat_bubble_outline</span>
                <span className="hidden sm:inline">Comments</span>
                {unresolvedCommentCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unresolvedCommentCount}
                  </span>
                )}
              </button>
              {/* View History Button */}
              <button
                onClick={handleShowVersionHistory}
                className="flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
                title="View version history"
              >
                <span className="material-symbols-outlined text-lg">history</span>
                <span className="hidden sm:inline">History</span>
              </button>
              {/* Save Version Button */}
              <button
                onClick={handleShowSaveVersionDialog}
                className="flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
                title="Save as new version"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                <span className="hidden sm:inline">Save Version</span>
              </button>
              {/* Preview Toggle Button */}
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-2 px-4 h-10 rounded-lg border font-bold text-sm transition-colors shadow-sm ${
                  showPreview
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {showPreview ? 'visibility_off' : 'visibility'}
                </span>
                {showPreview ? 'Hide Preview' : 'Preview'}
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 px-6 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
              >
                {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex items-center gap-2 px-6 h-10 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
              >
                Save Profile
              </button>
            </div>
          </div>

          {/* Tabs */}
          <EditorTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Content Area */}
          {renderContent()}

          {/* Bottom Actions */}
          <div className="flex justify-between items-center border-t border-slate-200 pt-8">
            <button className="text-slate-500 font-bold text-sm hover:text-red-600 transition-colors">
              Discard All Changes
            </button>
            <div className="flex gap-4">
              <button className="px-6 py-2.5 rounded-lg border border-primary-600 text-primary-600 font-bold text-sm hover:bg-primary-50 transition-all">
                Save as Draft
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all"
              >
                Save & Continue
              </button>
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

      {/* Version History Dialog */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-max-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-600 text-2xl">history</span>
                <h2 className="text-xl font-bold text-slate-900">Version History</h2>
              </div>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <VersionHistory resumeId={currentResumeId} onRestore={handleRestoreVersion} />
            </div>
          </div>
        </div>
      )}

      {/* Save Version Dialog */}
      {showSaveVersionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-600 text-2xl">save</span>
                <h2 className="text-xl font-bold text-slate-900">Save as Version</h2>
              </div>
              <button
                onClick={() => setShowSaveVersionDialog(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="version-description"
                    className="block text-sm font-bold text-slate-700 mb-2"
                  >
                    Version Description
                  </label>
                  <textarea
                    id="version-description"
                    value={versionDescription}
                    onChange={(e) => setVersionDescription(e.target.value)}
                    placeholder="Describe the changes made in this version..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none"
                  />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-xl mt-0.5">
                      info
                    </span>
                    <p className="text-sm text-amber-900">
                      Saving a version creates a snapshot of your current resume data. You can
                      restore any previous version later from the history.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowSaveVersionDialog(false);
                  setVersionDescription('');
                }}
                className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVersion}
                disabled={savingVersion || !versionDescription.trim()}
                className="px-6 py-2.5 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingVersion ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save Version'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Panel Dialog */}
      {showCommentPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-600 text-2xl">
                  chat_bubble_outline
                </span>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Resume Comments</h2>
                  {unresolvedCommentCount > 0 && (
                    <p className="text-sm text-amber-600 font-medium">
                      {unresolvedCommentCount} unresolved comment
                      {unresolvedCommentCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowCommentPanel(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CommentPanel
                resumeId={currentResumeId}
                onCommentCountChange={handleCommentCountChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
