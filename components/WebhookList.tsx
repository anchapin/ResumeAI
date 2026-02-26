import React, { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { listWebhooks, deleteWebhook, testWebhook, type Webhook } from '../utils/api-client';

interface WebhookListProps {
  onEdit: (webhook: Webhook) => void;
  onViewDeliveries: (webhookId: number) => void;
  onRefresh: () => void;
}

/**
 * @component
 * @description Displays a list of webhooks with actions to test, edit, delete, and view deliveries
 */
const WebhookList: React.FC<WebhookListProps> = ({ onEdit, onViewDeliveries, onRefresh }) => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<number | null>(null);
  const [deletingWebhookId, setDeletingWebhookId] = useState<number | null>(null);

  // Load webhooks
  const loadWebhooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listWebhooks();
      setWebhooks(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load webhooks';
      setError(errorMessage);
      toast.error(errorMessage);
      setWebhooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount and when onRefresh is called
  React.useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks, onRefresh]);

  // Handle test webhook
  const handleTestWebhook = async (id: number, url: string) => {
    setTestingWebhookId(id);
    try {
      const result = await testWebhook(id);
      if (result.success) {
        toast.success(`Webhook test successful! Event sent to ${url}`);
      } else {
        toast.warning(`Webhook test completed: ${result.message}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test webhook';
      toast.error(errorMessage);
    } finally {
      setTestingWebhookId(null);
    }
  };

  // Handle delete webhook
  const handleDeleteWebhook = async (id: number, description: string) => {
    if (
      !confirm(
        `Are you sure you want to delete webhook "${description || 'Untitled'}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingWebhookId(id);
    try {
      await deleteWebhook(id);
      toast.success('Webhook deleted successfully');
      await loadWebhooks();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete webhook';
      toast.error(errorMessage);
    } finally {
      setDeletingWebhookId(null);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-3">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <span className="material-symbols-outlined animate-spin text-primary-600 text-3xl">
            progress_activity
          </span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-lg">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && webhooks.length === 0 && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">webhook</span>
          <p className="text-slate-500 font-medium mb-2">No webhooks configured</p>
          <p className="text-slate-400 text-sm">
            Create a webhook to receive notifications about events in your account
          </p>
        </div>
      )}

      {/* Webhooks List */}
      {!isLoading && webhooks.length > 0 && (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className={`p-4 rounded-lg border ${
                webhook.is_active
                  ? 'bg-white border-slate-200 hover:border-primary-300'
                  : 'bg-slate-50 border-slate-200 opacity-75'
              } transition-colors`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-slate-900 truncate">
                      {webhook.description || `Webhook #${webhook.id}`}
                    </span>
                    {webhook.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-sm text-slate-600 mb-3 truncate">
                    {webhook.url}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      Created {formatDate(webhook.created_at)}
                    </span>
                    {webhook.last_triggered_at && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">history</span>
                        Last triggered {formatDate(webhook.last_triggered_at)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      {webhook.success_count} success
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">cancel</span>
                      {webhook.failure_count} failed
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleTestWebhook(webhook.id, webhook.url)}
                    disabled={testingWebhookId === webhook.id}
                    className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Test webhook"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {testingWebhookId === webhook.id ? 'progress_activity' : 'play_arrow'}
                    </span>
                  </button>
                  <button
                    onClick={() => onViewDeliveries(webhook.id)}
                    className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="View deliveries"
                  >
                    <span className="material-symbols-outlined text-[20px]">history</span>
                  </button>
                  <button
                    onClick={() => onEdit(webhook)}
                    className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Edit webhook"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(webhook.id, webhook.description || '')}
                    disabled={deletingWebhookId === webhook.id}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete webhook"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WebhookList;
