/**
 * SavedJobs Component
 * 
 * Displays user's saved jobs list.
 * 
 * @example
 * <SavedJobs userId={userId} />
 */

import React, { useState } from 'react';
import { useSavedJobs } from '../../src/hooks/useSavedJobs';
import { JobCard } from './JobCard';

export interface SavedJobsProps {
  userId: string;
}

export function SavedJobs({ userId }: SavedJobsProps) {
  const {
    savedJobs,
    isLoading,
    error,
    fetchSaved,
    saveJob,
    removeJob,
  } = useSavedJobs();

  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  /**
   * Handle remove job.
   */
  const handleRemove = async (savedId: number) => {
    if (window.confirm('Remove this saved job?')) {
      try {
        await removeJob(savedId);
      } catch (err) {
        console.error('Failed to remove job:', err);
      }
    }
  };

  /**
   * Handle save notes.
   */
  const handleSaveNotes = async (savedId: number) => {
    // Would need API endpoint for updating notes
    setEditingNotes(null);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#333' }}>
          Saved Jobs
        </h2>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          {savedJobs.length} job{savedJobs.length !== 1 ? 's' : ''} saved
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#666' }}>
          Loading saved jobs...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c00',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && savedJobs.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            color: '#666',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            No saved jobs yet
          </div>
          <div style={{ fontSize: '14px' }}>
            Save jobs to keep track of opportunities
          </div>
        </div>
      )}

      {/* Saved Jobs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {savedJobs.map((saved) => (
          <div key={saved.id} style={{ position: 'relative' }}>
            <JobCard
              job={saved.job}
              isSaved={true}
              onSave={() => handleRemove(saved.id)}
            />

            {/* Notes Section */}
            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
              {editingNotes === saved.id ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes..."
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNotes(saved.id);
                      if (e.key === 'Escape') setEditingNotes(null);
                    }}
                  />
                  <button
                    onClick={() => handleSaveNotes(saved.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: saved.notes ? '#333' : '#999' }}>
                    {saved.notes || 'Add notes...'}
                  </div>
                  <button
                    onClick={() => {
                      setEditingNotes(saved.id);
                      setNotes(saved.notes || '');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#007bff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: '4px 8px',
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Saved Date */}
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#999' }}>
              Saved {new Date(saved.savedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SavedJobs;
