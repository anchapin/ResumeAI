import React, { useState, useEffect } from 'react';
import { Comment, getResumeComments, createComment, resolveComment, unresolveComment, deleteComment } from '../../utils/comments-api';

interface CommentsPanelProps {
  resumeId: number;
  onClose?: () => void;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({ resumeId, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; author: string } | null>(null);

  useEffect(() => {
    loadComments();
  }, [resumeId]);

  const loadComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getResumeComments(resumeId);
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    try {
      const comment = await createComment({
        resume_id: resumeId,
        content: newComment,
        parent_id: replyTo?.id,
      });

      if (replyTo) {
        // Add reply to existing comment
        setComments(comments.map((c) => 
          c.id === replyTo.id 
            ? { ...c, replies: [...c.replies, comment] }
            : c
        ));
      } else {
        // Add new top-level comment
        setComments([comment, ...comments]);
      }

      setNewComment('');
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    }
  };

  const handleResolve = async (commentId: number) => {
    try {
      await resolveComment(commentId);
      setComments(comments.map((c) => 
        c.id === commentId ? { ...c, is_resolved: true } : c
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve comment');
    }
  };

  const handleUnresolve = async (commentId: number) => {
    try {
      await unresolveComment(commentId);
      setComments(comments.map((c) => 
        c.id === commentId ? { ...c, is_resolved: false } : c
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unresolve comment');
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Comments ({comments.reduce((sum, c) => sum + 1 + c.replies.length, 0)})
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-gray-500">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No comments yet</p>
            <p className="text-sm mt-1">Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={(author) => setReplyTo({ id: comment.id, author })}
              onResolve={() => handleResolve(comment.id)}
              onUnresolve={() => handleUnresolve(comment.id)}
              onDelete={() => handleDelete(comment.id)}
              formatDate={formatDate}
            />
          ))
        )}
      </div>

      {/* Comment Input */}
      <div className="p-4 border-t">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
            <span className="text-sm text-blue-700">
              Replying to {replyTo.author}
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex space-x-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.author}...` : "Add a comment..."}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePostComment();
              }
            }}
          />
          <button
            onClick={handlePostComment}
            disabled={!newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            {replyTo ? 'Reply' : 'Post'}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Use @ to mention team members (e.g., @user@example.com)
        </p>
      </div>
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  onReply: (author: string) => void;
  onResolve: () => void;
  onUnresolve: () => void;
  onDelete: () => void;
  formatDate: (dateString: string) => string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onResolve,
  onUnresolve,
  onDelete,
  formatDate,
}) => {
  const [showReplies, setShowReplies] = useState(true);

  return (
    <div className={`border rounded-lg p-4 ${comment.is_resolved ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
      {/* Comment Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 font-medium text-sm">
              {comment.author_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{comment.author_name}</p>
            <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
          </div>
        </div>

        {comment.is_resolved ? (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Resolved
          </span>
        ) : (
          <div className="flex items-center space-x-1">
            <button
              onClick={onResolve}
              className="text-gray-400 hover:text-green-600 text-sm"
              title="Mark as resolved"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-600 text-sm"
              title="Delete comment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Comment Content */}
      <p className="text-gray-800 mb-3 whitespace-pre-wrap">{comment.content}</p>

      {/* Comment Actions */}
      <div className="flex items-center space-x-4 text-sm">
        <button
          onClick={() => onReply(comment.author_name)}
          className="text-blue-600 hover:text-blue-800"
        >
          Reply
        </button>
        {comment.is_resolved && (
          <button
            onClick={onUnresolve}
            className="text-gray-600 hover:text-gray-800"
          >
            Reopen
          </button>
        )}
        {comment.section && (
          <span className="text-gray-500">
            in {comment.section}
          </span>
        )}
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-4 ml-8 space-y-3">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showReplies ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </button>

          {showReplies && comment.replies.map((reply) => (
            <div key={reply.id} className="border-l-2 border-gray-200 pl-4">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-700 font-medium text-xs">
                    {reply.author_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-medium text-gray-900 text-sm">{reply.author_name}</span>
                <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
              </div>
              <p className="text-gray-800 text-sm">{reply.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
