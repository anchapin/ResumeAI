/* eslint-disable complexity */
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import ResumeCard from '../components/ResumeCard';
import ShareDialog from '../components/ShareDialog';
import ResumeManagementSkeleton from '../components/skeletons/ResumeManagementSkeleton';
import { Route, ResumeMetadata, BulkOperationType, BulkOperationResult } from '../types';
import { listResumes, bulkOperation } from '../utils/api-client';
import { showErrorToast, showSuccessToast } from '../utils/toast';

/**
 * @component
 * @description Resume management page with bulk operations (delete, duplicate, tag, export)
 * @returns {JSX.Element} The rendered resume management page
 */
const ResumeManagement: React.FC = () => {
  const [resumes, setResumes] = useState<ResumeMetadata[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('');

  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [sharingResumeId, setSharingResumeId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [operationResult, setOperationResult] = useState<BulkOperationResult | null>(null);
  const [pendingOperation, setPendingOperation] = useState<BulkOperationType | null>(null);

  const loadResumes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listResumes({
        search: searchTerm || undefined,
        tag: filterTag || undefined,
      });
      setResumes(data);
    } catch (error) {
      showErrorToast('Failed to load resumes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterTag]);

  // Load resumes on mount
  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  // Selection handlers
  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(resumes.map((r) => r.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Bulk operation handlers
  const handleBulkDelete = async () => {
    setPendingOperation('delete');
    setShowDeleteDialog(true);
  };

  const handleBulkDuplicate = async () => {
    if (selectedIds.size === 0) return;

    setBulkLoading(true);
    try {
      const result = await bulkOperation(Array.from(selectedIds), 'duplicate');

      setOperationResult(result);
      setShowResultDialog(true);

      if (result.failed.length === 0) {
        showSuccessToast(`Successfully duplicated ${result.successful.length} resume(s)`);
      } else {
        showErrorToast(`Failed to duplicate ${result.failed.length} resume(s)`);
      }

      // Refresh resumes
      await loadResumes();
      deselectAll();
    } catch (error) {
      showErrorToast('Failed to duplicate resumes');
      console.error(error);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkTag = () => {
    if (selectedIds.size === 0) return;
    setShowTagDialog(true);
  };

  const handleConfirmTag = async () => {
    if (!tagInput.trim()) return;

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 0) return;

    setBulkLoading(true);
    try {
      const result = await bulkOperation(Array.from(selectedIds), 'tag', { tags });

      setOperationResult(result);
      setShowResultDialog(true);
      setShowTagDialog(false);
      setTagInput('');

      if (result.failed.length === 0) {
        showSuccessToast(`Successfully tagged ${result.successful.length} resume(s)`);
      } else {
        showErrorToast(`Failed to tag ${result.failed.length} resume(s)`);
      }

      // Refresh resumes
      await loadResumes();
      deselectAll();
    } catch (error) {
      showErrorToast('Failed to tag resumes');
      console.error(error);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedIds.size === 0) return;

    setBulkLoading(true);
    try {
      const result = await bulkOperation(Array.from(selectedIds), 'export');

      setOperationResult(result);
      setShowResultDialog(true);

      if (result.failed.length === 0) {
        showSuccessToast(`Successfully initiated export for ${result.successful.length} resume(s)`);
      } else {
        showErrorToast(`Failed to export ${result.failed.length} resume(s)`);
      }

      deselectAll();
    } catch (error) {
      showErrorToast('Failed to export resumes');
      console.error(error);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setBulkLoading(true);
    setShowDeleteDialog(false);

    try {
      const result = await bulkOperation(Array.from(selectedIds), 'delete');

      setOperationResult(result);
      setShowResultDialog(true);

      if (result.failed.length === 0) {
        showSuccessToast(`Successfully deleted ${result.successful.length} resume(s)`);
      } else {
        showErrorToast(`Failed to delete ${result.failed.length} resume(s)`);
      }

      // Refresh resumes
      await loadResumes();
      deselectAll();
    } catch (error) {
      showErrorToast('Failed to delete resumes');
      console.error(error);
    } finally {
      setBulkLoading(false);
    }
  };

  // Individual action handlers
  const handleEdit = (id: number) => {
    // Navigate to editor with the resume
    window.location.hash = `#editor?id=${id}`;
  };

  const handleDuplicate = async (id: number) => {
    try {
      const result = await bulkOperation([id], 'duplicate');
      if (result.failed.length === 0) {
        showSuccessToast('Resume duplicated successfully');
        await loadResumes();
      } else {
        showErrorToast('Failed to duplicate resume');
      }
    } catch (error) {
      showErrorToast('Failed to duplicate resume');
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    try {
      await bulkOperation([id], 'delete');
      showSuccessToast('Resume deleted successfully');
      await loadResumes();
    } catch (error) {
      showErrorToast('Failed to delete resume');
      console.error(error);
    }
  };

  const handleShare = (id: number) => {
    setSharingResumeId(id);
  };

  // Get selected resumes for display
  const selectedResumes = resumes.filter((r) => selectedIds.has(r.id));

  return (
    <div className="flex min-h-screen bg-[#f6f6f8]">
      <Sidebar currentRoute={Route.BULK} onShowShortcuts={() => {}} />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <h2 className="text-slate-800 font-bold text-xl">My Resumes</h2>
            <span className="text-slate-400 text-sm">({resumes.length} total)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search resumes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none w-64 text-sm"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                search
              </span>
            </div>
            <button
              onClick={() => (window.location.hash = '#editor')}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              New Resume
            </button>
          </div>
        </header>

        {/* Bulk Action Toolbar */}
        {selectedIds.size > 0 && (
          <div className="bg-primary-600 text-white px-6 py-3 flex items-center justify-between sticky top-16 z-9 shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.size === resumes.length}
                  onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                  className="w-4 h-4 rounded border-2 border-white/50 text-white focus:ring-2 focus:ring-white focus:ring-offset-2 cursor-pointer"
                />
                <span className="font-medium">{selectedIds.size} selected</span>
              </div>
              <button
                onClick={selectAll}
                className="text-sm hover:bg-white/10 px-3 py-1 rounded transition-colors"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="text-sm hover:bg-white/10 px-3 py-1 rounded transition-colors"
              >
                Deselect All
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={bulkLoading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete
              </button>
              <button
                onClick={handleBulkDuplicate}
                disabled={bulkLoading}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                Duplicate
              </button>
              <button
                onClick={handleBulkTag}
                disabled={bulkLoading}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">label</span>
                Tag
              </button>
              <button
                onClick={handleBulkExport}
                disabled={bulkLoading}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export
              </button>
            </div>
          </div>
        )}

        {/* Resume Grid */}
        <main className="flex-1 p-8 overflow-y-auto">
          {loading ? (
            <ResumeManagementSkeleton />
          ) : resumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="bg-primary-100 p-6 rounded-full mb-6">
                <span className="material-symbols-outlined text-5xl text-primary-600">
                  description
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No resumes yet</h3>
              <p className="text-slate-500 max-w-sm mb-6">
                Create your first resume to get started with building your professional profile.
              </p>
              <button
                onClick={() => (window.location.hash = '#editor')}
                className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Create Resume
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resumes.map((resume) => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  isSelected={selectedIds.has(resume.id)}
                  onSelect={(selected) => toggleSelection(resume.id)}
                  onEdit={() => handleEdit(resume.id)}
                  onDuplicate={() => handleDuplicate(resume.id)}
                  onDelete={() => handleDelete(resume.id)}
                  onShare={() => handleShare(resume.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Share Dialog */}
      {sharingResumeId !== null && (
        <ShareDialog
          isOpen={sharingResumeId !== null}
          resumeId={sharingResumeId}
          onClose={() => setSharingResumeId(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <span className="material-symbols-outlined text-red-600 text-[28px]">
                    warning
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Delete Resumes</h3>
              </div>

              <p className="text-slate-600 mb-4">
                Are you sure you want to delete {selectedIds.size} resume(s)? This action cannot be
                undone.
              </p>

              <div className="max-h-48 overflow-y-auto mb-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">Affected resumes:</p>
                <ul className="space-y-1">
                  {selectedResumes.map((resume) => (
                    <li key={resume.id} className="text-sm text-slate-600 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">description</span>
                      {resume.title}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="px-4 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">
                        progress_activity
                      </span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      Delete {selectedIds.size} Resume{selectedIds.size > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Dialog */}
      {showTagDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary-100 p-2 rounded-full">
                  <span className="material-symbols-outlined text-primary-600 text-[28px]">
                    label
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Add Tags</h3>
              </div>

              <p className="text-slate-600 mb-4">
                Add tags to {selectedIds.size} resume(s). Separate multiple tags with commas.
              </p>

              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. Software Engineer, Senior, Remote"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none mb-4"
                autoFocus
              />

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowTagDialog(false);
                    setTagInput('');
                  }}
                  className="px-4 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmTag}
                  disabled={bulkLoading || !tagInput.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">
                        progress_activity
                      </span>
                      Adding tags...
                    </>
                  ) : (
                    'Add Tags'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Dialog */}
      {showResultDialog && operationResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`p-2 rounded-full ${
                    (operationResult.failed?.length ?? 0 === 0) ? 'bg-emerald-100' : 'bg-amber-100'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[28px] ${
                      (operationResult.failed?.length ?? 0 === 0)
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {(operationResult.failed?.length ?? 0 === 0) ? 'check_circle' : 'info'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {(operationResult.failed?.length ?? 0 === 0) ? 'Success!' : 'Partial Success'}
                </h3>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">Successful:</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {operationResult.successful?.length ?? 0}
                  </span>
                </div>
                {(operationResult.failed?.length ?? 0) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Failed:</span>
                    <span className="text-sm font-bold text-amber-600">
                      {operationResult.failed?.length ?? 0}
                    </span>
                  </div>
                )}
              </div>

              {(operationResult.failed?.length ?? 0) > 0 && (
                <div className="max-h-48 overflow-y-auto mb-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-2">Failed resumes:</p>
                  <ul className="space-y-1">
                    {operationResult.failed?.map((item, index) => (
                      <li key={index} className="text-sm text-red-600">
                        Resume #{item.id}: {item.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowResultDialog(false);
                    setOperationResult(null);
                  }}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeManagement;
