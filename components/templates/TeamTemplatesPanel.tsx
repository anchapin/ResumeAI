import React, { useState, useEffect } from 'react';
import {
  TeamTemplate,
  listTemplates,
  createTemplate,
  deleteTemplate,
  listTemplateCategories,
} from '../../utils/team-templates-api';

interface TeamTemplatesPanelProps {
  teamId?: number;
  onSelectTemplate?: (template: TeamTemplate) => void;
  onClose?: () => void;
}

export const TeamTemplatesPanel: React.FC<TeamTemplatesPanelProps> = ({
  teamId,
  onSelectTemplate,
  onClose,
}) => {
  const [templates, setTemplates] = useState<TeamTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [teamId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [templatesData, categoriesData] = await Promise.all([
        listTemplates(teamId, selectedCategory === 'all' ? undefined : selectedCategory, searchQuery || undefined),
        listTemplateCategories(),
      ]);
      setTemplates(templatesData);
      setCategories(['all', ...categoriesData]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: number, templateName: string) => {
    if (!confirm(`Delete template "${templateName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTemplate(templateId);
      setTemplates(templates.filter((t) => t.id !== templateId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleCreate = async (name: string, description?: string, category?: string) => {
    try {
      const newTemplate = await createTemplate({ name, description, category });
      setTemplates([newTemplate, ...templates]);
      setShowCreateDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Team Templates</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
          >
            New Template
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-gray-500">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No templates found</p>
            <p className="text-sm mt-1">Create a template to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => onSelectTemplate?.(template)}
                onDelete={() => handleDelete(template.id, template.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <CreateTemplateDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
};

interface TemplateCardProps {
  template: TeamTemplate;
  onSelect: () => void;
  onDelete: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, onDelete }) => {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition bg-white">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 flex-1">{template.name}</h4>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-600 p-1"
          title="Delete template"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {template.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
      )}

      <div className="flex items-center flex-wrap gap-2 mb-3">
        {template.category && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            {template.category}
          </span>
        )}
        {template.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
            {tag}
          </span>
        ))}
        {template.tags.length > 3 && (
          <span className="text-xs text-gray-500">+{template.tags.length - 3} more</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
        {template.is_public && (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Public</span>
        )}
      </div>

      <button
        onClick={onSelect}
        className="mt-3 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
      >
        Use Template
      </button>
    </div>
  );
};

interface CreateTemplateDialogProps {
  onClose: () => void;
  onCreate: (name: string, description?: string, category?: string) => void;
}

const CreateTemplateDialog: React.FC<CreateTemplateDialogProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim() || undefined, category.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Template</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Software Engineer Resume"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Technology, Finance, Healthcare"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe when to use this template..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
