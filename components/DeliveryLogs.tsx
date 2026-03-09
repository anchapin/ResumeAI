import React, { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  getWebhookDeliveries,
  retryWebhookDelivery,
  type WebhookDelivery,
} from '../utils/api-client';
import AccessibleDialog from './AccessibleDialog';

interface DeliveryLogsProps {
  webhookId: number;
  onClose: () => void;
}

/**
 * @component
 * @description Displays delivery logs for a webhook with retry capability
 */
const DeliveryLogs: React.FC<DeliveryLogsProps> = ({ webhookId, onClose }) => {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingDeliveryId, setRetryingDeliveryId] = useState<number | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);
  const [showPayload, setShowPayload] = useState<boolean>(false);

  // Load deliveries
  const loadDeliveries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getWebhookDeliveries(webhookId);
      setDeliveries(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load delivery logs';
      setError(errorMessage);
      toast.error(errorMessage);
      setDeliveries([]);
    } finally {
      setIsLoading(false);
    }
  }, [webhookId]);

  // Load on mount
  React.useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  // Handle retry delivery
  const handleRetryDelivery = async (deliveryId: number) => {
    setRetryingDeliveryId(deliveryId);
    try {
      await retryWebhookDelivery(webhookId, deliveryId);
      toast.success('Delivery retry initiated');
      await loadDeliveries();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry delivery';
      toast.error(errorMessage);
    } finally {
      setRetryingDeliveryId(null);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Pending';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <span className="material-symbols-outlined text-[14px] mr-1">check_circle</span>
            Delivered
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <span className="material-symbols-outlined text-[14px] mr-1">cancel</span>
            Failed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            <span className="material-symbols-outlined text-[14px] mr-1">schedule</span>
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Delivery Logs</h3>
          <p className="text-sm text-slate-500">View and manage webhook delivery attempts</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close delivery logs"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-primary-600 text-3xl">
              progress_activity
            </span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 m-6 rounded-lg">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && deliveries.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">history</span>
            <p className="text-slate-500 font-medium mb-2">No delivery logs yet</p>
            <p className="text-slate-400 text-sm">
              Deliveries will appear here once the webhook is triggered
            </p>
          </div>
        )}

        {/* Deliveries List */}
        {!isLoading && !error && deliveries.length > 0 && (
          <div className="divide-y divide-slate-100">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className={`p-4 hover:bg-slate-50 transition-colors ${
                  selectedDelivery?.id === delivery.id ? 'bg-primary-50/50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(delivery.status)}
                      <span className="font-mono text-sm text-slate-900">
                        {delivery.event_type}
                      </span>
                      {delivery.retry_count > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                          Retry {delivery.retry_count}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {formatDate(delivery.delivered_at)}
                      </span>
                      {delivery.response_status && (
                        <span
                          className={`font-mono ${
                            delivery.response_status >= 200 && delivery.response_status < 300
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {delivery.response_status}
                        </span>
                      )}
                    </div>

                    {delivery.error_message && (
                      <div className="flex items-start gap-1 text-xs text-red-600 bg-red-50 p-2 rounded">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        <span className="truncate">{delivery.error_message}</span>
                      </div>
                    )}

                    {delivery.next_retry_at && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 mt-2">
                        <span className="material-symbols-outlined text-[14px]">update</span>
                        Next retry: {formatDate(delivery.next_retry_at)}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 ml-4">
                    {delivery.status === 'failed' && (
                      <button
                        onClick={() => handleRetryDelivery(delivery.id)}
                        disabled={retryingDeliveryId === delivery.id}
                        className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Retry delivery"
                        aria-label="Retry delivery"
                      >
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                          {retryingDeliveryId === delivery.id ? 'progress_activity' : 'refresh'}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedDelivery(delivery);
                        setShowPayload(true);
                      }}
                      className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="View payload"
                      aria-label="View payload"
                    >
                      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                        code
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payload Modal */}
      <AccessibleDialog
        isOpen={showPayload && !!selectedDelivery}
        onClose={() => {
          setShowPayload(false);
          setSelectedDelivery(null);
        }}
        title="Delivery Payload"
        className="max-w-2xl"
      >
        {selectedDelivery && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Event Type */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700">Event Type</h4>
              <code className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-900">
                {selectedDelivery.event_type}
              </code>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700">Status</h4>
              {getStatusBadge(selectedDelivery.status)}
            </div>

            {/* Response */}
            {selectedDelivery.response_status && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-700">Response Status</h4>
                <code
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    selectedDelivery.response_status >= 200 &&
                    selectedDelivery.response_status < 300
                      ? 'bg-green-100 text-green-900'
                      : 'bg-red-100 text-red-900'
                  }`}
                >
                  {selectedDelivery.response_status}
                </code>
              </div>
            )}

            {/* Response Body */}
            {selectedDelivery.response_body && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-700">Response Body</h4>
                <pre className="px-3 py-2.5 bg-slate-100 rounded-lg text-xs text-slate-900 overflow-x-auto">
                  {selectedDelivery.response_body}
                </pre>
              </div>
            )}

            {/* Payload */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700">Payload</h4>
              <pre className="px-3 py-2.5 bg-slate-100 rounded-lg text-xs text-slate-900 overflow-x-auto max-h-40 overflow-y-auto">
                {JSON.stringify(selectedDelivery.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </AccessibleDialog>
    </div>
  );
};

export default DeliveryLogs;
