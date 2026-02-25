import React, { useState, useEffect } from 'react';
import { Comment } from '../types';
import {
  listComments,
  createComment,
  resolveComment,
  deleteComment,
} from '../utils/api-client';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface CommentPanelProps {
  resumeId: number;
  onCommentCountChange?: (count: number) => void;
}

/**
 * Comment panel component for collaboration
 */
const CommentPanel: React.FC<CommentPanelProps> = ({ resumeId, onCommentCountChange }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewComment, setShowNewComment] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newCommentSection, setNewCommentSection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('all');

  useEffect(() => {
    loadComments();
  }, [resumeId]);

  // Notify parent of unresolved comment count whenever comments change
  useEffect(() => {
    if (onCommentCountChange) {
      const unresolvedCount = comments.filter(c => !c.is_resolved).length;
      onCommentCountChange(unresolvedCount);
    }
  }, [comments, onCommentCountChange]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await listComments(resumeId);
      setComments(data);
    } catch (error) {
      showErrorToast('Failed to load comments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      await createComment(resumeId, {
        author_name: 'Current User', // In a real app, this would come from user session
        author_email: 'user@example.com',
        content: newComment,
        section: newCommentSection || undefined,
      });
      showSuccessToast('Comment added');
      setNewComment('');
      setNewCommentSection('');
      setShowNewComment(false);
      await loadComments();
    } catch (error) {
      showErrorToast('Failed to add comment');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveComment = async (commentId: number) => {
    try {
      await resolveComment(commentId);
      showSuccessToast('Comment resolved');
      await loadComments();
    } catch (error) {
      showErrorToast('Failed to resolve comment');
      console.error(error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await deleteComment(commentId);
      showSuccessToast('Comment deleted');
      await loadComments();
    } catch (error) {
      showErrorToast('Failed to delete comment');
      console.error(error);
    }
  };

  const filteredComments = comments.filter((comment) =>
    filter === 'unresolved' ? !comment.is_resolved : true
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-slate-900">
          Comments ({filteredComments.length})
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unresolved')}
              className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${
                filter === 'unresolved'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Unresolved
            </button>
          </div>
          <button
            onClick={() => setShowNewComment(!showNewComment)}
            className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            aria-label="Add new comment"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>
      </div>

      {showNewComment && (
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <form onSubmit={handleSubmitComment}>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="comment-section"
                  className="block text-sm font-bold text-slate-700 mb-1"
                >
                  Section (optional)
                </label>
                <input
                  id="comment-section"
                  type="text"
                  value={newCommentSection}
                  onChange={(e) => setNewCommentSection(e.target.value)}
                  placeholder="e.g., Work Experience, Skills"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="comment-content"
                  className="block text-sm font-bold text-slate-700 mb-1"
                >
                  Comment
                </label>
                <textarea
                  id="comment-content"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add your comment..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-sm resize-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewComment(false);
                    setNewComment('');
                    setNewCommentSection('');
                  }}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">
                        progress_activity
                      </span>
                      <span>Adding...</span>
                    </>
                  ) : (
                    'Add Comment'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2">
              chat_bubble_outline
            </span>
            <p>
              {filter === 'unresolved'
                ? 'No unresolved comments'
                : 'No comments yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={`p-4 rounded-lg border transition-all ${
                  comment.is_resolved
                    ? 'bg-slate-50 border-slate-200 opacity-75'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-sm">
                        {comment.author_name}
                      </span>
                      {comment.section && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                          {comment.section}
                        </span>
                      )}
                      {comment.is_resolved && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">
                            check_circle
                          </span>
                          Resolved
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded transition-colors"
                    title="Delete comment"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
                <p className="text-sm text-slate-700 mb-3">{comment.content}</p>
                {!comment.is_resolved && (
                  <button
                    onClick={() => handleResolveComment(comment.id)}
                    className="text-sm font-bold text-green-600 hover:text-green-700 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      check_circle
                    </span>
                    Mark as Resolved
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentPanel;
