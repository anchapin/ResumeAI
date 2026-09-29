/**
 * Experience Timeline Component
 * 
 * Displays career experience as a horizontal scrollable timeline.
 */

import React, { useState, useMemo } from 'react';
import { AnalyticsTimelineEntry, AnalyticsAPI } from '@/lib/db/analytics';

interface ExperienceTimelineProps {
  userId: string;
  entries?: AnalyticsTimelineEntry[];
  editable?: boolean;
}

export function ExperienceTimeline({ 
  userId, 
  entries: initialEntries,
  editable = false 
}: ExperienceTimelineProps) {
  const [entries, setEntries] = useState(initialEntries ?? []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const loadEntries = () => {
    const data = AnalyticsAPI.getTimeline(userId);
    setEntries(data);
  };
  
  const data = entries.length > 0 ? entries : (
    initialEntries ?? AnalyticsAPI.getTimeline(userId)
  );
  
  const sortedEntries = useMemo(() => 
    [...data].sort((a, b) => {
      const dateA = new Date(a.start_date).getTime();
      const dateB = new Date(b.start_date).getTime();
      return dateB - dateA;
    }),
    [data]
  );
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  
  const getDuration = (start: string, end: string | null) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                  (endDate.getMonth() - startDate.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) return `${remainingMonths} months`;
    if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${years}y ${remainingMonths}m`;
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      AnalyticsAPI.deleteTimelineEntry(id, userId);
      loadEntries();
    }
  };
  
  if (sortedEntries.length === 0) {
    return (
      <div className="experience-timeline-empty">
        <p>No experience entries yet. Add your work history to see the timeline.</p>
        {editable && (
          <button className="add-entry-btn" onClick={() => setIsAdding(true)}>
            Add Experience
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="experience-timeline">
      <div className="timeline-header">
        <h3>Career Timeline</h3>
        {editable && (
          <button className="add-entry-btn" onClick={() => setIsAdding(true)}>
            + Add Position
          </button>
        )}
      </div>
      
      <div className="timeline-scroll-container">
        <div className="timeline-line" />
        
        {sortedEntries.map((entry, index) => (
          <div key={entry.id} className="timeline-entry">
            <div className="timeline-dot" />
            <div className="timeline-card">
              <div className="timeline-card-header">
                <div className="timeline-dates">
                  <span className="date-range">
                    {formatDate(entry.start_date)} - {entry.end_date ? formatDate(entry.end_date) : 'Present'}
                  </span>
                  <span className="duration">
                    {getDuration(entry.start_date, entry.end_date)}
                  </span>
                </div>
                {editable && (
                  <div className="timeline-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => setEditingId(entry.id)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              
              <h4 className="timeline-title">{entry.title}</h4>
              <p className="timeline-company">{entry.company}</p>
              
              {entry.description && (
                <p className="timeline-description">{entry.description}</p>
              )}
              
              {entry.is_current && (
                <span className="current-badge">Current</span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {isAdding && (
        <TimelineEntryForm 
          userId={userId}
          onClose={() => setIsAdding(false)}
          onSave={() => {
            setIsAdding(false);
            loadEntries();
          }}
        />
      )}
      
      {editingId && (
        <TimelineEntryForm 
          userId={userId}
          entryId={editingId}
          onClose={() => setEditingId(null)}
          onSave={() => {
            setEditingId(null);
            loadEntries();
          }}
        />
      )}
    </div>
  );
}

interface TimelineEntryFormProps {
  userId: string;
  entryId?: string;
  onClose: () => void;
  onSave: () => void;
}

function TimelineEntryForm({ userId, entryId, onClose, onSave }: TimelineEntryFormProps) {
  const existing = entryId 
    ? AnalyticsAPI.getTimeline(userId).find(e => e.id === entryId)
    : null;
  
  const [formData, setFormData] = useState({
    company: existing?.company ?? '',
    title: existing?.title ?? '',
    start_date: existing?.start_date?.split('T')[0] ?? '',
    end_date: existing?.end_date?.split('T')[0] ?? '',
    description: existing?.description ?? '',
    is_current: existing?.is_current ?? false,
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      user_id: userId,
      company: formData.company,
      title: formData.title,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      description: formData.description || undefined,
      order_index: 0,
      is_current: formData.is_current,
    };
    
    if (entryId) {
      AnalyticsAPI.updateTimelineEntry(entryId, userId, data);
    } else {
      AnalyticsAPI.addTimelineEntry(data);
    }
    
    onSave();
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{entryId ? 'Edit' : 'Add'} Experience</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Company</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                disabled={formData.is_current}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_current}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  is_current: e.target.checked,
                  end_date: e.target.checked ? '' : formData.end_date,
                })}
              />
              I currently work here
            </label>
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="save-btn">
              {entryId ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExperienceTimeline;
