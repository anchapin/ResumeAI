import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { createWebhook, updateWebhook, type Webhook, type WebhookCreateParams, type WebhookUpdateParams } from '../utils/api-client';

interface WebhookFormProps {
  webhook?: Webhook;
  onSuccess: () => void;
  onCancel: () => void;
}

const AVAILABLE_EVENTS = [
  'resume.created',
  'resume.updated',
  'resume.deleted',
  'resume.shared',
  'pdf.generated',
  'ai.tailoring.completed',
  'api.key.created',
  'api.key.revoked',
] as const;

/**
 * @component
 * @description Form for creating or editing webhooks
 */
const WebhookForm: React.FC<WebhookFormProps> = ({ webhook, onSuccess, onCancel }) => {
  const [url, setUrl] = useState<string>(webhook?.url || '');
  const [description, setDescription] = useState<string>(webhook?.description || '');
  const [secret, setSecret] = useState<string>('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(webhook?.events || []);
  const [isActive, setIsActive] = useState<boolean>(webhook?.is_active ?? true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when webhook prop changes
  useEffect(() => {
    if (webhook) {
      setUrl(webhook.url);
      setDescription(webhook.description || '');
      setSecret('');
      setSelectedEvents(webhook.events);
      setIsActive(webhook.is_active);
    } else {
      setUrl('');
      setDescription('');
      setSecret('');
      setSelectedEvents([]);
      setIsActive(true);
    }
    setErrors({});
  }, [webhook]);

  // Toggle event selection
  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(url);
      } catch {
        newErrors.url = 'Please enter a valid URL';
      }
    }

    if (selectedEvents.length === 0) {
      newErrors.events = 'At least one event must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const params: WebhookCreateParams | WebhookUpdateParams = {
        url: url.trim(),
        description: description.trim() || undefined,
        events: selectedEvents,
        is_active: isActive,
      };

      // Only include secret if it's provided (for new webhooks or when updating secret)
      if (secret.trim()) {
        (params as any).secret = secret.trim();
      }

      if (webhook) {
        await updateWebhook(webhook.id, params);
        toast.success('Webhook updated successfully');
      } else {
        await createWebhook(params as WebhookCreateParams);
        toast.success('Webhook created successfully');
      }

      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save webhook';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">
          {webhook ? 'Edit Webhook' : 'Create New Webhook'}
        </h3>
        <button
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Notify Slack when resumes are created"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
            maxLength={200}
          />
          <p className="text-xs text-slate-500">A friendly name to identify this webhook</p>
        </div>

        {/* URL */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">
            Endpoint URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className={`w-full px-4 py-2.5 rounded-lg border ${
              errors.url ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-primary-500 focus:ring-primary-200'
            } focus:ring-2 outline-none transition-all text-slate-900 font-mono`}
          />
          {errors.url && (
            <p className="text-xs text-red-600">{errors.url}</p>
          )}
          <p className="text-xs text-slate-500">The URL where events will be sent via POST requests</p>
        </div>

        {/* Secret (Optional) */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">
            Secret Key <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter a secret to verify webhook authenticity"
              className="w-full px-4 py-2.5 pr-12 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 font-mono"
            />
          </div>
          <p className="text-xs text-slate-500">
            Used to sign webhook payloads. Leave empty to generate a new secret, or leave unchanged to keep existing.
          </p>
        </div>

        {/* Events */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">
            Events <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {AVAILABLE_EVENTS.map((event) => (
              <label
                key={event}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedEvents.includes(event)
                    ? 'bg-primary-50 border-primary-300'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event)}
                  onChange={() => toggleEvent(event)}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="font-mono text-sm text-slate-900">{event}</span>
              </label>
            ))}
          </div>
          {errors.events && (
            <p className="text-xs text-red-600">{errors.events}</p>
          )}
          <p className="text-xs text-slate-500">Select which events should trigger this webhook</p>
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Active</h4>
            <p className="text-sm text-slate-500">Enable or disable this webhook</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                {webhook ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>{webhook ? 'Update Webhook' : 'Create Webhook'}</>
            )}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 p-3 rounded-lg">
        <span className="material-symbols-outlined text-[16px] mt-0.5">info</span>
        <div className="space-y-1">
          <p>
            <strong>Payload Format:</strong> Webhooks receive JSON payloads with event type, timestamp, and event data.
          </p>
          <p>
            <strong>Signature:</strong> If a secret is set, the X-Webhook-Signature header will contain an HMAC SHA256 signature.
          </p>
          <p>
            <strong>Retry Policy:</strong> Failed deliveries are automatically retried with exponential backoff for up to 3 days.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WebhookForm;
