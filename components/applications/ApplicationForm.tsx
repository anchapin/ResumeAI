/**
 * ApplicationForm Component
 * 
 * Form for creating/editing job applications.
 * 
 * @example
 * <ApplicationForm
 *   application={applicationToEdit}
 *   onSubmit={handleSubmit}
 *   onCancel={handleCancel}
 * />
 */

import React, { useState } from 'react';
import type { JobApplication, ApplicationStatus, CreateApplicationData } from '../../types/applications';

export interface ApplicationFormProps {
  application?: JobApplication;
  job?: { id: string; title: string; company: string };
  onSubmit: (data: CreateApplicationData) => void;
  onCancel: () => void;
}

const STATUS_OPTIONS: ApplicationStatus[] = [
  'draft',
  'applied',
  'screening',
  'interviewing',
  'offer',
  'accepted',
  'rejected',
  'withdrawn',
  'archived',
];

const SOURCE_OPTIONS = [
  'LinkedIn',
  'Indeed',
  'Glassdoor',
  'Company Website',
  'Referral',
  'Recruiter',
  'Other',
];

export function ApplicationForm({ application, job, onSubmit, onCancel }: ApplicationFormProps) {
  const [formData, setFormData] = useState<CreateApplicationData>({
    jobId: job?.id || application?.jobId || '',
    status: application?.status || 'applied',
    externalSource: application?.externalSource || '',
    externalId: application?.externalId || '',
    externalStatus: application?.externalStatus || '',
    submittedAt: application?.submittedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
    notes: application?.notes || '',
    autofilled: application?.autofilled || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Handle input change.
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /**
   * Validate form.
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.jobId) {
      newErrors.jobId = 'Job ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submit.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
      {/* Job Selection (if not provided) */}
      {!job && (
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="jobId"
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#333' }}
          >
            Job ID *
          </label>
          <input
            type="text"
            id="jobId"
            name="jobId"
            value={formData.jobId}
            onChange={handleChange}
            placeholder="Enter job ID"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: errors.jobId ? '1px solid #dc3545' : '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          {errors.jobId && (
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#dc3545' }}>
              {errors.jobId}
            </div>
          )}
        </div>
      )}

      {/* Status */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="status"
          style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#333' }}
        >
          Status *
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
          }}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Source */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="externalSource"
          style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}
        >
          Source (optional)
        </label>
        <select
          id="externalSource"
          name="externalSource"
          value={formData.externalSource || ''}
          onChange={handleChange}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
          }}
        >
          <option value="">Select source</option>
          {SOURCE_OPTIONS.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>

      {/* External ID */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="externalId"
          style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}
        >
          External Application ID (optional)
        </label>
        <input
          type="text"
          id="externalId"
          name="externalId"
          value={formData.externalId || ''}
          onChange={handleChange}
          placeholder="e.g., LinkedIn application ID"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Submitted Date */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="submittedAt"
          style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}
        >
          Date Applied
        </label>
        <input
          type="date"
          id="submittedAt"
          name="submittedAt"
          value={formData.submittedAt || ''}
          onChange={handleChange}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Notes */}
      <div style={{ marginBottom: '24px' }}>
        <label
          htmlFor="notes"
          style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}
        >
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          placeholder="Add notes about this application..."
          rows={4}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            backgroundColor: 'white',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {application ? 'Update Application' : 'Create Application'}
        </button>
      </div>
    </form>
  );
}

export default ApplicationForm;
