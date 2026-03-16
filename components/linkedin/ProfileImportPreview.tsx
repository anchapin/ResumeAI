/**
 * ProfileImportPreview Component
 * 
 * Previews LinkedIn profile data before importing to resume.
 * Allows selecting which sections to import.
 * 
 * @example
 * <ProfileImportPreview
 *   profile={profile}
 *   onImport={handleImport}
 * />
 */

import React, { useState } from 'react';
import type { LinkedInProfile } from '../../types/linkedin';

export interface ProfileImportPreviewProps {
  profile: LinkedInProfile;
  onImport?: (sections: ImportSections) => void;
  onCancel?: () => void;
}

export interface ImportSections {
  basics: boolean;
  work: boolean;
  education: boolean;
  skills: boolean;
}

export function ProfileImportPreview({
  profile,
  onImport,
  onCancel,
}: ProfileImportPreviewProps) {
  const [sections, setSections] = useState<ImportSections>({
    basics: true,
    work: true,
    education: true,
    skills: true,
  });

  const handleToggle = (section: keyof ImportSections) => {
    setSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleImport = () => {
    onImport?.(sections);
  };

  const selectedCount = Object.values(sections).filter(Boolean).length;

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#333' }}>
          Import LinkedIn Profile
        </h2>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Select which sections to import from your LinkedIn profile
        </p>
      </div>

      {/* Profile Summary */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        {profile.profilePicture?.displayImage && (
          <img
            src={profile.profilePicture.displayImage}
            alt={`${profile.firstName} ${profile.lastName}`}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        )}
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '18px', color: '#333' }}>
            {profile.firstName} {profile.lastName}
          </h3>
          {profile.headline && (
            <p style={{ margin: '0 0 4px', color: '#666', fontSize: '14px' }}>
              {profile.headline}
            </p>
          )}
          {profile.email && (
            <p style={{ margin: 0, color: '#999', fontSize: '13px' }}>
              {profile.email}
            </p>
          )}
        </div>
      </div>

      {/* Section Selection */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#333' }}>
          Import Sections
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SectionCheckbox
            label="Basic Info"
            description="Name, email, headline, location"
            checked={sections.basics}
            onChange={() => handleToggle('basics')}
            count={1}
          />
          <SectionCheckbox
            label="Work Experience"
            description={`${profile.positions?.length || 0} positions`}
            checked={sections.work}
            onChange={() => handleToggle('work')}
            count={profile.positions?.length || 0}
          />
          <SectionCheckbox
            label="Education"
            description={`${profile.education?.length || 0} schools`}
            checked={sections.education}
            onChange={() => handleToggle('education')}
            count={profile.education?.length || 0}
          />
          <SectionCheckbox
            label="Skills"
            description={`${profile.skills?.length || 0} skills`}
            checked={sections.skills}
            onChange={() => handleToggle('skills')}
            count={profile.skills?.length || 0}
          />
        </div>
      </div>

      {/* Merge Options */}
      <div
        style={{
          marginBottom: '24px',
          padding: '12px',
          backgroundColor: '#fff3e0',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#e65100',
        }}
      >
        <strong>Note:</strong> Imported data will be merged with your existing
        resume data. Duplicate entries may need manual review.
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          paddingTop: '16px',
          borderTop: '1px solid #e0e0e0',
        }}
      >
        {onCancel && (
          <button
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
        )}
        <button
          onClick={handleImport}
          disabled={selectedCount === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: selectedCount === 0 ? '#ccc' : '#0077b5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Import {selectedCount > 0 && `(${selectedCount} sections)`}
        </button>
      </div>
    </div>
  );
}

interface SectionCheckboxProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  count: number;
}

function SectionCheckbox({
  label,
  description,
  checked,
  onChange,
  count,
}: SectionCheckboxProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        backgroundColor: checked ? '#e3f2fd' : 'white',
        border: `1px solid ${checked ? '#2196f3' : '#e0e0e0'}`,
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          width: '18px',
          height: '18px',
          cursor: 'pointer',
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, color: '#333' }}>{label}</div>
        <div style={{ fontSize: '13px', color: '#666' }}>{description}</div>
      </div>
      {count > 0 && (
        <span
          style={{
            padding: '2px 8px',
            backgroundColor: '#e0e0e0',
            borderRadius: '12px',
            fontSize: '12px',
            color: '#666',
          }}
        >
          {count}
        </span>
      )}
    </label>
  );
}

export default ProfileImportPreview;
