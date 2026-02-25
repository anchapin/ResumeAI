import React, { useState, useRef, useEffect } from 'react';
import { ShareLink } from '../types';
import { shareResume } from '../utils/api-client';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface ShareDialogProps {
  resumeId: number;
  onClose: () => void;
}

/**
 * Share dialog component for sharing resumes
 */
const ShareDialog: React.FC<ShareDialogProps> = ({ resumeId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);

  const [permissions, setPermissions] = useState<'view' | 'comment' | 'edit'>(
    'view'
  );
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [maxViews, setMaxViews] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap and Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0] as HTMLElement;
        const last = focusables[focusables.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Initial focus on the first interactive element or the container
    // We prefer focusing the container to avoid surprising context shifts,
    // but focusing the first input is standard for modals.
    // Here, let's focus the close button or the first permission button.
    const firstInput = dialogRef.current?.querySelector('button, input, select') as HTMLElement;
    if (firstInput) {
        firstInput.focus();
    } else {
        dialogRef.current?.focus();
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Auto-focus copy button when share link is created
  useEffect(() => {
    if (shareLink && dialogRef.current) {
      // Small timeout to allow render
      setTimeout(() => {
        // Find the copy button by its distinctive class or aria-label
        const copyBtn = dialogRef.current?.querySelector('button[aria-label="Copy share link"]') as HTMLElement;
        copyBtn?.focus();
      }, 50);
    }
  }, [shareLink]);

  const handleCreateShare = async () => {
    try {
      setLoading(true);

      // Calculate expiration date
      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const link = await shareResume(resumeId, {
        permissions,
        expires_at: expiresAt,
        max_views: maxViews || undefined,
        password: password || undefined,
      });

      setShareLink(link);
      showSuccessToast('Share link created!');
    } catch (error) {
      showErrorToast('Failed to create share link');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setShareLink(null);
    setPermissions('view');
    setExpiresIn(null);
    setMaxViews(null);
    setPassword('');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-labelledby="share-dialog-title"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 id="share-dialog-title" className="text-xl font-bold text-slate-900">
            Share Resume
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close share dialog"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          {!shareLink ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Permissions
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['view', 'comment', 'edit'].map((perm) => (
                    <button
                      key={perm}
                      onClick={() =>
                        setPermissions(perm as 'view' | 'comment' | 'edit')
                      }
                      className={`px-4 py-3 rounded-lg border-2 font-bold text-sm capitalize transition-all ${
                        permissions === perm
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {perm}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Link expires in (optional)
                </label>
                <select
                  value={expiresIn || ''}
                  onChange={(e) =>
                    setExpiresIn(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-sm"
                >
                  <option value="">Never</option>
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Max views (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxViews || ''}
                  onChange={(e) =>
                    setMaxViews(e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="Unlimited"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Password protection (optional)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleCreateShare}
                disabled={loading}
                className="w-full py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                    <span>Creating link...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">
                      share
                    </span>
                    <span>Create Share Link</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="p-4 bg-green-50 border border-green-200 rounded-lg"
                role="alert"
              >
                <div className="flex items-center gap-2 text-green-800">
                  <span className="material-symbols-outlined text-[24px]">
                    check_circle
                  </span>
                  <span className="font-bold">Share link created!</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink.share_url}
                    readOnly
                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    aria-label="Copy share link"
                    className="px-4 py-2.5 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-slate-400">
                    verified_user
                  </span>
                  <span>
                    Permissions:{' '}
                    <span className="font-bold capitalize text-slate-900">
                      {shareLink.permissions}
                    </span>
                  </span>
                </div>
                {shareLink.expires_at && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-slate-400">
                      schedule
                    </span>
                    <span>
                      Expires:{' '}
                      <span className="font-bold text-slate-900">
                        {new Date(shareLink.expires_at).toLocaleString()}
                      </span>
                    </span>
                  </div>
                )}
                {shareLink.max_views && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-slate-400">
                      visibility
                    </span>
                    <span>
                      Max views:{' '}
                      <span className="font-bold text-slate-900">
                        {shareLink.max_views}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleReset}
                className="w-full py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Create Another Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
