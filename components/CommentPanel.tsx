import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/store';
import { formatDistanceToNow } from '../utils/date-formatter';
import { Comment, CommentFilter } from '../types';

interface CommentPanelProps {
  comments: Comment[];
  onAddComment: (text: string, elementId?: string) => void;
  onResolveComment: (id: string) => void;
  onDeleteComment: (id: string) => void;
  onReplyToComment?: (parentId: string, text: string) => void;
  isOpen: boolean;
  onClose: () => void;
  activeElementId?: string | null;
}

export const CommentPanel: React.FC<CommentPanelProps> = ({
  comments = [], // Provide default empty array
  onAddComment,
  onResolveComment,
  onDeleteComment,
  onReplyToComment,
  isOpen,
  onClose,
  activeElementId = null,
}) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [filter, setFilter] = useState<CommentFilter>('all');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set(),
  );

  if (!isOpen) return null;

  // Safety check for user
  const currentUserId = user?.id || 'anonymous';
  const currentUserName = user?.name || 'Anonymous User';

  const filteredComments = comments.filter((comment) => {
    if (!comment) return false;

    // Filter by element if one is active
    if (activeElementId && comment.elementId !== activeElementId) {
      return false;
    }

    // Filter by status
    if (filter === 'unresolved') return !comment.resolved;
    return true;
  });

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim(), activeElementId || undefined);
      setNewComment('');
    }
  };

  const handleAddReply = (parentId: string) => {
    const text = replyText[parentId];
    if (text?.trim() && onReplyToComment) {
      onReplyToComment(parentId, text.trim());
      setReplyText((prev) => ({ ...prev, [parentId]: '' }));

      // Automatically expand replies when adding one
      setExpandedReplies((prev) => {
        const next = new Set(prev);
        next.add(parentId);
        return next;
      });
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl border-l border-gray-200 flex flex-col z-50 transition-transform duration-300 ease-in-out">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">
          {activeElementId ? t('comments.section') : t('comments.title')}
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
            {filteredComments.length}
          </span>
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-1 rounded-full transition-colors"
          aria-label={t('common.close')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      </div>

      <div className="p-3 border-b border-gray-200 flex space-x-2 bg-white">
        <button
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
          className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('comments.filterAll')}
        </button>
        <button
          onClick={() => setFilter('unresolved')}
          aria-pressed={filter === 'unresolved'}
          className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors flex justify-center items-center ${
            filter === 'unresolved'
              ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></span>
          {t('comments.filterUnresolved')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {filteredComments.length === 0 ? (
          <div className="text-center text-gray-500 py-8 px-4 bg-white rounded-lg border border-dashed border-gray-200">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">
              chat_bubble
            </span>
            <p className="text-sm">{t('comments.noComments')}</p>
            {activeElementId && (
              <p className="text-xs text-gray-400 mt-1">
                {t('comments.noCommentsSection')}
              </p>
            )}
          </div>
        ) : (
          filteredComments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded-lg border ${
                comment.resolved
                  ? 'bg-gray-50 border-gray-200 opacity-75'
                  : 'bg-white border-blue-100 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mr-2">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium text-sm text-gray-900">
                      {comment.authorName}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatDistanceToNow(new Date(comment.timestamp))}
                    </span>
                  </div>
                </div>
                {comment.resolved && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] uppercase font-bold rounded-full">
                    {t('comments.resolvedStatus')}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
                {comment.text}
              </p>

              {/* Replies Section */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 pl-3 border-l-2 border-gray-200">
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center mb-2"
                  >
                    <span
                      className="material-symbols-outlined text-[14px] mr-1"
                      aria-hidden="true"
                    >
                      {expandedReplies.has(comment.id)
                        ? 'expand_less'
                        : 'expand_more'}
                    </span>
                    {expandedReplies.has(comment.id)
                      ? t('comments.hideReplies')
                      : t('comments.showReplies', {
                          count: comment.replies.length,
                        })}
                  </button>

                  {expandedReplies.has(comment.id) && (
                    <div className="space-y-3 mt-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-gray-50 p-2 rounded">
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-xs text-gray-900">
                              {reply.authorName}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {formatDistanceToNow(new Date(reply.timestamp))}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 mt-1">
                            {reply.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reply Input */}
              {onReplyToComment && !comment.resolved && (
                <div className="mt-3 flex items-center space-x-2">
                  <input
                    type="text"
                    value={replyText[comment.id] || ''}
                    onChange={(e) =>
                      setReplyText((prev) => ({
                        ...prev,
                        [comment.id]: e.target.value,
                      }))
                    }
                    placeholder={t('comments.replyPlaceholder')}
                    className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddReply(comment.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleAddReply(comment.id)}
                    disabled={!replyText[comment.id]?.trim()}
                    className="p-1.5 text-blue-600 disabled:text-gray-400 hover:bg-blue-50 rounded"
                    aria-label={t('comments.submitReply')}
                  >
                    <span
                      className="material-symbols-outlined text-[16px]"
                      aria-hidden="true"
                    >
                      send
                    </span>
                  </button>
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-3 pt-2 border-t border-gray-100">
                {!comment.resolved && (
                  <button
                    onClick={() => onResolveComment(comment.id)}
                    className="text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 px-2 py-1 rounded flex items-center transition-colors"
                  >
                    <span
                      className="material-symbols-outlined text-[14px] mr-1"
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                    {t('common.resolve')}
                  </button>
                )}
                {(comment.authorId === currentUserId ||
                  user?.role === 'admin') && (
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded flex items-center transition-colors"
                  >
                    <span
                      className="material-symbols-outlined text-[14px] mr-1"
                      aria-hidden="true"
                    >
                      delete
                    </span>
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleAddComment} className="flex flex-col space-y-2">
          {activeElementId && (
            <div className="text-xs text-blue-600 flex items-center bg-blue-50 p-1.5 rounded-md border border-blue-100">
              <span
                className="material-symbols-outlined text-[14px] mr-1"
                aria-hidden="true"
              >
                info
              </span>
              {t('comments.commentingOnSection')}
            </div>
          )}
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('comments.addPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm transition-shadow"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddComment(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex justify-center items-center"
          >
            <span className="material-symbols-outlined mr-2" aria-hidden="true">
              add_comment
            </span>
            {t('comments.submit')}
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-1">
            {t('comments.pressEnter')}
          </p>
        </form>
      </div>
    </div>
  );
};
