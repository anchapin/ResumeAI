import React, { useState } from 'react';
import WebhookList from '../components/WebhookList';
import WebhookForm from '../components/WebhookForm';
import DeliveryLogs from '../components/DeliveryLogs';
import { type Webhook } from '../utils/api-client';

/**
 * @component
 * @description Webhooks management page - allows users to create, edit, test, and monitor webhooks
 */
const Webhooks: React.FC = () => {
  const [showWebhookModal, setShowWebhookModal] = useState<boolean>(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | undefined>(undefined);
  const [webhookRefreshKey, setWebhookRefreshKey] = useState<number>(0);
  const [selectedWebhookId, setSelectedWebhookId] = useState<number | null>(null);

  const handleCreateWebhook = () => {
    setEditingWebhook(undefined);
    setShowWebhookModal(true);
  };

  const handleEditWebhook = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setShowWebhookModal(true);
  };

  const handleViewDeliveries = (webhookId: number) => {
    setSelectedWebhookId(webhookId);
  };

  const handleWebhookSuccess = () => {
    setShowWebhookModal(false);
    setEditingWebhook(undefined);
    setWebhookRefreshKey((k) => k + 1);
  };

  const handleCloseDeliveries = () => {
    setSelectedWebhookId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
            <p className="text-slate-500 text-sm mt-1">
              Configure webhooks to receive event notifications
            </p>
          </div>
          <button
            onClick={handleCreateWebhook}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-bold text-sm rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Webhook
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <WebhookList
          onEdit={handleEditWebhook}
          onViewDeliveries={handleViewDeliveries}
          onRefresh={() => setWebhookRefreshKey((k) => k + 1)}
        />
      </div>

      {/* Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <WebhookForm
              webhook={editingWebhook}
              onSuccess={handleWebhookSuccess}
              onCancel={() => {
                setShowWebhookModal(false);
                setEditingWebhook(undefined);
              }}
            />
          </div>
        </div>
      )}

      {/* Delivery Logs Modal */}
      {selectedWebhookId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] overflow-hidden">
            <DeliveryLogs webhookId={selectedWebhookId} onClose={handleCloseDeliveries} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Webhooks;
