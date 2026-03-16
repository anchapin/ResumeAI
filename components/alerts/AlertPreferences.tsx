/**
 * AlertPreferences Component
 * 
 * Manages user notification preferences.
 * 
 * @example
 * <AlertPreferences onSave={handleSave} />
 */

import React, { useState } from 'react';
import { useAlertPreferences } from '../../src/hooks/useAlertPreferences';
import type { AlertPreferences, UpdatePreferencesData } from '../../types/alerts';

export interface AlertPreferencesProps {
  onSave?: () => void;
}

export function AlertPreferences({ onSave }: AlertPreferencesProps) {
  const { preferences, isLoading, error, updatePreferences } = useAlertPreferences();
  const [formData, setFormData] = useState<UpdatePreferencesData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form data when preferences load
  React.useEffect(() => {
    if (preferences) {
      setFormData({
        emailEnabled: preferences.emailEnabled,
        smsEnabled: preferences.smsEnabled,
        phoneCountryCode: preferences.phoneCountryCode,
        dailyDigest: preferences.dailyDigest,
        weeklyDigest: preferences.weeklyDigest,
        instantAlerts: preferences.instantAlerts,
        timezone: preferences.timezone,
      });
    }
  }, [preferences]);

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
        : value,
    }));

    // Clear validation error
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /**
   * Validate phone number.
   */
  const validatePhoneNumber = (): boolean => {
    if (formData.smsEnabled && !formData.phoneCountryCode) {
      setValidationErrors((prev) => ({
        ...prev,
        phoneCountryCode: 'Country code is required for SMS',
      }));
      return false;
    }
    return true;
  };

  /**
   * Handle form submit.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhoneNumber()) {
      return;
    }

    setIsSaving(true);

    try {
      await updatePreferences(formData);
      onSave?.();
    } catch (err) {
      console.error('Failed to update preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !preferences) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#666' }}>
        Loading preferences...
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c00',
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
      {/* Email Notifications */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#333' }}>
          Email Notifications
        </h3>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="emailEnabled"
            checked={formData.emailEnabled ?? preferences?.emailEnabled ?? true}
            onChange={handleChange}
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: '14px', color: '#333' }}>Enable email notifications</span>
        </label>

        {formData.emailEnabled && (
          <div style={{ marginLeft: '24px', marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="instantAlerts"
                checked={formData.instantAlerts ?? preferences?.instantAlerts ?? true}
                onChange={handleChange}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '14px', color: '#666' }}>Instant alerts (when jobs match)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="dailyDigest"
                checked={formData.dailyDigest ?? preferences?.dailyDigest ?? true}
                onChange={handleChange}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '14px', color: '#666' }}>Daily digest (9 AM)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="weeklyDigest"
                checked={formData.weeklyDigest ?? preferences?.weeklyDigest ?? false}
                onChange={handleChange}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '14px', color: '#666' }}>Weekly digest (Monday 9 AM)</span>
            </label>
          </div>
        )}
      </div>

      {/* SMS Notifications */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#333' }}>
          SMS Notifications
        </h3>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="smsEnabled"
            checked={formData.smsEnabled ?? preferences?.smsEnabled ?? false}
            onChange={handleChange}
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: '14px', color: '#333' }}>Enable SMS notifications</span>
        </label>

        {formData.smsEnabled && (
          <div style={{ marginLeft: '24px', marginTop: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label
                htmlFor="phoneCountryCode"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}
              >
                Country Code
              </label>
              <select
                id="phoneCountryCode"
                name="phoneCountryCode"
                value={formData.phoneCountryCode ?? preferences?.phoneCountryCode ?? '+1'}
                onChange={handleChange}
                style={{
                  width: '100%',
                  maxWidth: '200px',
                  padding: '8px 12px',
                  border: validationErrors.phoneCountryCode ? '1px solid #dc3545' : '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                }}
              >
                <option value="+1">🇺🇸 +1 (USA/Canada)</option>
                <option value="+44">🇬🇧 +44 (UK)</option>
                <option value="+61">🇦🇺 +61 (Australia)</option>
                <option value="+91">🇮🇳 +91 (India)</option>
                <option value="+49">🇩🇪 +49 (Germany)</option>
                <option value="+33">🇫🇷 +33 (France)</option>
              </select>
              {validationErrors.phoneCountryCode && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#dc3545' }}>
                  {validationErrors.phoneCountryCode}
                </div>
              )}
            </div>

            <div
              style={{
                padding: '12px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#856404',
              }}
            >
              ⚠️ SMS notifications may incur charges from your carrier.
            </div>
          </div>
        )}
      </div>

      {/* Timezone */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#333' }}>
          Timezone
        </h3>

        <div>
          <label
            htmlFor="timezone"
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}
          >
            Your Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            value={formData.timezone ?? preferences?.timezone ?? 'UTC'}
            onChange={handleChange}
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white',
            }}
          >
            <option value="UTC">UTC (Coordinated Universal Time)</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Kolkata">India (IST)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Australia/Sydney">Sydney (AEST)</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => {}}
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
          Reset to Defaults
        </button>
        <button
          type="submit"
          disabled={isSaving}
          style={{
            padding: '10px 20px',
            backgroundColor: isSaving ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </form>
  );
}

export default AlertPreferences;
