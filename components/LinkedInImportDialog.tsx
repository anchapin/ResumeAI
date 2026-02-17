import React, { useState, useRef } from 'react';
import { SimpleResumeData } from '../types';
import { importFromLinkedInFile } from '../utils/import';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface LinkedInImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: Partial<SimpleResumeData>) => void;
}

/**
 * LinkedIn Import Dialog Component
 * 
 * Allows users to import their LinkedIn profile data from an exported JSON file.
 * Users can download their LinkedIn data from:
 * Settings > Data privacy > Get a copy of your data
 */
export const LinkedInImportDialog: React.FC<LinkedInImportDialogProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      showErrorToast('Please select a valid JSON file exported from LinkedIn.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showErrorToast('File size exceeds 5MB limit. Please export a smaller dataset from LinkedIn.');
      return;
    }

    setIsImporting(true);

    try {
      const resumeData = await importFromLinkedInFile(file);
      
      // Convert JSON Resume format to SimpleResumeData format
      const importedData: Partial<SimpleResumeData> = {
        name: resumeData.basics?.name || '',
        email: resumeData.basics?.email || '',
        phone: resumeData.basics?.phone || '',
        location: resumeData.location?.city || resumeData.location?.region || '',
        role: resumeData.basics?.label || '',
        summary: resumeData.basics?.summary || '',
        skills: resumeData.skills?.map(s => s.name || '').filter(Boolean) || [],
        experience: resumeData.work?.map(work => ({
          id: Math.random().toString(36).substring(2, 9),
          company: work.company || '',
          role: work.position || '',
          startDate: work.startDate || '',
          endDate: work.endDate || '',
          current: !work.endDate,
          description: work.summary || '',
          tags: [],
        })) || [],
        education: resumeData.education?.map(edu => ({
          id: Math.random().toString(36).substring(2, 9),
          institution: edu.institution || '',
          area: edu.area || '',
          studyType: edu.studyType || '',
          startDate: edu.startDate || '',
          endDate: edu.endDate || '',
          courses: edu.courses || [],
        })) || [],
        projects: resumeData.projects?.map(proj => ({
          id: Math.random().toString(36).substring(2, 9),
          name: proj.name || '',
          description: proj.description || '',
          url: proj.url || '',
          roles: proj.roles || [],
          startDate: proj.startDate || '',
          endDate: proj.endDate || '',
          highlights: proj.highlights || [],
        })) || [],
      };

      onImport(importedData);
      showSuccessToast('LinkedIn profile imported successfully!');
      onClose();
    } catch (error) {
      console.error('LinkedIn import error:', error);
      showErrorToast(error instanceof Error ? error.message : 'Failed to import LinkedIn profile.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-[#0077b5] size-10 rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined">account_circle</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Import from LinkedIn</h2>
              <p className="text-sm text-slate-500">Upload your LinkedIn data export</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={isImporting}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 mb-2">How to export your LinkedIn data:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to LinkedIn Settings & Privacy</li>
              <li>Click on "Data privacy" tab</li>
              <li>Under "Get a copy of your data", click "Request archive"</li>
              <li>Select "Profile" data and request the archive</li>
              <li>Once ready, download and extract the ZIP file</li>
              <li>Upload the Profile.json file here</li>
            </ol>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleButtonClick}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              ${dragOver 
                ? 'border-primary-500 bg-primary-50 scale-[1.02]' 
                : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
              }
              ${isImporting ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleInputChange}
              className="hidden"
              disabled={isImporting}
            />
            
            {isImporting ? (
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                <p className="text-slate-600 font-medium">Importing your LinkedIn data...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-5xl text-slate-400">cloud_upload</span>
                <div>
                  <p className="text-slate-700 font-semibold">
                    Drop your LinkedIn export file here
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    or click to browse (JSON files only, max 5MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* What gets imported */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="font-semibold text-slate-700 mb-2 text-sm">What gets imported:</h4>
            <div className="flex flex-wrap gap-2">
              {['Name', 'Email', 'Phone', 'Location', 'Headline', 'Summary', 'Experience', 'Education', 'Skills', 'Projects'].map((item) => (
                <span key={item} className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
            disabled={isImporting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkedInImportDialog;
