/**
 * Variant Manager Component
 * 
 * Manages resume variants - create, edit, delete, and set defaults.
 */

import React, { useState, useMemo } from 'react';
import { ResumeVariant, AnalyticsAPI } from '@/lib/db/analytics';

interface VariantManagerProps {
  userId: string;
  variants?: ResumeVariant[];
  onSelectVariant?: (variant: ResumeVariant) => void;
}

export function VariantManager({ 
  userId, 
  variants: initialVariants,
  onSelectVariant 
}: VariantManagerProps) {
  const [variants, setVariants] = useState<ResumeVariant[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const loadVariants = () => {
    const data = AnalyticsAPI.getVariants(userId);
    setVariants(data);
  };
  
  const data = variants.length > 0 ? variants : (
    initialVariants ?? AnalyticsAPI.getVariants(userId)
  );
  
  const sortedVariants = useMemo(() => 
    [...data].sort((a, b) => {
      // Default variant first
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      // Then by date
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }),
    [data]
  );
  
  const handleSetDefault = (id: string) => {
    AnalyticsAPI.updateVariant(id, userId, { is_default: true });
    loadVariants();
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this variant?')) {
      AnalyticsAPI.deleteVariant(id, userId);
      loadVariants();
    }
  };
  
  const handleDuplicate = (variant: ResumeVariant) => {
    AnalyticsAPI.addVariant({
      user_id: userId,
      name: `${variant.name} (Copy)`,
      description: variant.description,
      content: variant.content,
      is_default: false,
      target_job_title: variant.target_job_title,
      target_company: variant.target_company,
    });
    loadVariants();
  };
  
  return (
    <div className="variant-manager">
      <div className="variant-manager-header">
        <h3>Resume Variants</h3>
        <button 
          className="create-variant-btn"
          onClick={() => setIsCreating(true)}
        >
          + New Variant
        </button>
      </div>
      
      {sortedVariants.length === 0 ? (
        <div className="variant-manager-empty">
          <p>No variants yet. Create your first resume variant to start A/B testing.</p>
          <button 
            className="create-variant-btn"
            onClick={() => setIsCreating(true)}
          >
            Create Variant
          </button>
        </div>
      ) : (
        <div className="variant-list">
          {sortedVariants.map(variant => (
            <div 
              key={variant.id} 
              className={`variant-card ${variant.is_default ? 'default' : ''}`}
            >
              <div className="variant-card-header">
                <h4 className="variant-name">{variant.name}</h4>
                {variant.is_default && (
                  <span className="default-badge">Default</span>
                )}
              </div>
              
              {variant.description && (
                <p className="variant-description">{variant.description}</p>
              )}
              
              <div className="variant-meta">
                {variant.target_job_title && (
                  <span className="meta-item">
                    🎯 {variant.target_job_title}
                  </span>
                )}
                {variant.target_company && (
                  <span className="meta-item">
                    🏢 {variant.target_company}
                  </span>
                )}
              </div>
              
              <div className="variant-date">
                Updated {new Date(variant.updated_at).toLocaleDateString()}
              </div>
              
              <div className="variant-actions">
                <button 
                  className="action-btn primary"
                  onClick={() => onSelectVariant?.(variant)}
                >
                  Use
                </button>
                {!variant.is_default && (
                  <button 
                    className="action-btn"
                    onClick={() => handleSetDefault(variant.id)}
                  >
                    Set Default
                  </button>
                )}
                <button 
                  className="action-btn"
                  onClick={() => handleDuplicate(variant)}
                >
                  Duplicate
                </button>
                <button 
                  className="action-btn"
                  onClick={() => setEditingId(variant.id)}
                >
                  Edit
                </button>
                <button 
                  className="action-btn danger"
                  onClick={() => handleDelete(variant.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isCreating && (
        <VariantForm
          userId={userId}
          onClose={() => setIsCreating(false)}
          onSave={() => {
            setIsCreating(false);
            loadVariants();
          }}
        />
      )}
      
      {editingId && (
        <VariantForm
          userId={userId}
          variantId={editingId}
          onClose={() => setEditingId(null)}
          onSave={() => {
            setEditingId(null);
            loadVariants();
          }}
        />
      )}
    </div>
  );
}

interface VariantFormProps {
  userId: string;
  variantId?: string;
  onClose: () => void;
  onSave: () => void;
}

function VariantForm({ userId, variantId, onClose, onSave }: VariantFormProps) {
  const existing = variantId 
    ? AnalyticsAPI.getVariant(variantId, userId)
    : null;
  
  const [formData, setFormData] = useState({
    name: existing?.name ?? '',
    description: existing?.description ?? '',
    content: existing?.content ?? '{}',
    is_default: existing?.is_default ?? false,
    target_job_title: existing?.target_job_title ?? '',
    target_company: existing?.target_company ?? '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    try {
      JSON.parse(formData.content);
    } catch {
      newErrors.content = 'Invalid JSON';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    const data = {
      user_id: userId,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      content: formData.content,
      is_default: formData.is_default,
      target_job_title: formData.target_job_title.trim() || undefined,
      target_company: formData.target_company.trim() || undefined,
    };
    
    if (variantId) {
      AnalyticsAPI.updateVariant(variantId, userId, data);
    } else {
      AnalyticsAPI.addVariant(data);
    }
    
    onSave();
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-content variant-form-modal">
        <h3>{variantId ? 'Edit' : 'Create'} Variant</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Software Engineer - Google"
              required
            />
            {errors.name && <span className="error">{errors.name}</span>}
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this variant"
              rows={2}
            />
          </div>
          
          <div className="form-group">
            <label>Target Job Title</label>
            <input
              type="text"
              value={formData.target_job_title}
              onChange={(e) => setFormData({ ...formData, target_job_title: e.target.value })}
              placeholder="e.g., Senior Software Engineer"
            />
          </div>
          
          <div className="form-group">
            <label>Target Company</label>
            <input
              type="text"
              value={formData.target_company}
              onChange={(e) => setFormData({ ...formData, target_company: e.target.value })}
              placeholder="e.g., Google"
            />
          </div>
          
          <div className="form-group">
            <label>Resume Content (JSON)</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
              placeholder='{"personal_info": {...}, "experience": [...]}'
            />
            {errors.content && <span className="error">{errors.content}</span>}
          </div>
          
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              />
              Set as default variant
            </label>
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="save-btn">
              {variantId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VariantManager;
