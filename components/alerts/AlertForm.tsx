/**
 * AlertForm Component
 * 
 * Form for creating/editing job alerts.
 * 
 * @example
 * <AlertForm
 *   alert={alertToEdit}
 *   onSubmit={handleSubmit}
 *   onCancel={handleCancel}
 * />
 */

import React, { useState, useEffect } from 'react';
import type { JobAlert, CreateAlertData } from '../../types/alerts';

export interface AlertFormProps {
  alert?: JobAlert;
  onSubmit: (data: CreateAlertData) => void;
  onCancel: () => void;
}

export function AlertForm({ alert, onSubmit, onCancel }: AlertFormProps) {
  const [formData, setFormData] = useState<CreateAlertData>({
    name: '',
    query: '',
    remote: undefined,
    location: '',
    minSalary: undefined,
    employmentType: '',
    experienceLevel: '',
    frequency: 'daily',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form when editing
  useEffect(() => {
    if (alert) {
      setFormData({
        name: alert.name,
        query: alert.query || '',
        remote: alert.remote,
        location: alert.location || '',
        minSalary: alert.minSalary,
        employmentType: alert.employmentType || '',
        experienceLevel: alert.experienceLevel || '',
        frequency: alert.frequency,
      });
    }
  }, [alert]);

  /**
   * Handle input change.
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : type === 'number'
        ? value === '' ? undefined : Number(value)
        : value,
    }));

    // Clear error when user types
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

    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Alert name is required';
    }

    if (formData.minSalary !== undefined && formData.minSalary < 0) {
      newErrors.minSalary = 'Minimum salary must be positive';
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

    // Clean up empty fields
    const cleanData: CreateAlertData = {
      ...formData,
      query: formData.query || undefined,
      location: formData.location || undefined,
      employmentType: formData.employmentType || undefined,
      experienceLevel: formData.experienceLevel || undefined,
    };

    onSubmit(cleanData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
      {/* Alert Name */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="name"
          style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#333' }}
        >
          Alert Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Remote Python Jobs"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${errors.name ? '#dc3545' : '#ddd'}`,
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
        {errors.name && (
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#dc3545' }}>
            {errors.name}
          </div>
        )}
      </div>

      {/* Search Query */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="query"
          style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}
        >
          Keywords (optional)
        </label>
        <input
          type="text"
          id="query"
          name="query"
          value={formData.query}
          onChange={handleChange}
          placeholder="e.g., Python, React, Engineer"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Remote Toggle */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="remote"
            checked={formData.remote || false}
            onChange={handleChange}
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: '14px', color: '#333' }}>Remote jobs only</span>
        </label>
      </div>

      {/* Location */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="location"
          style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}
        >
          Location (optional)
        </label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="e.g., San Francisco, New York"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Min Salary */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="minSalary"
          style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}
        >
          Minimum Salary (optional)
        </label>
        <input
          type="number"
          id="minSalary"
          name="minSalary"
          value={formData.minSalary || ''}
          onChange={handleChange}
          placeholder="e.g., 100000"
          min="0"
          step="1000"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: errors.minSalary ? '1px solid #dc3545' : '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
        {errors.minSalary && (
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#dc3545' }}>
            {errors.minSalary}
          </div>
        )}
      </div>

      {/* Employment Type */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="employmentType"
          style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}
        >
          Employment Type (optional)
        </label>
        <select
          id="employmentType"
          name="employmentType"
          value={formData.employmentType || ''}
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
          <option value="">Any</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
        </select>
      </div>

      {/* Experience Level */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="experienceLevel"
          style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}
        >
          Experience Level (optional)
        </label>
        <select
          id="experienceLevel"
          name="experienceLevel"
          value={formData.experienceLevel || ''}
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
          <option value="">Any</option>
          <option value="entry">Entry Level</option>
          <option value="mid">Mid Level</option>
          <option value="senior">Senior Level</option>
          <option value="executive">Executive</option>
        </select>
      </div>

      {/* Frequency */}
      <div style={{ marginBottom: '24px' }}>
        <label
          htmlFor="frequency"
          style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#333' }}
        >
          Notification Frequency *
        </label>
        <select
          id="frequency"
          name="frequency"
          value={formData.frequency}
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
          <option value="instant">⚡ Instant (as soon as jobs match)</option>
          <option value="daily">📅 Daily digest (9 AM)</option>
          <option value="weekly">📆 Weekly digest (Monday 9 AM)</option>
        </select>
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
          {alert ? 'Update Alert' : 'Create Alert'}
        </button>
      </div>
    </form>
  );
}

export default AlertForm;
