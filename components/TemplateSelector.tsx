import React, { useState, useEffect } from 'react';

interface TemplateMetadata {
  name: string;
  display_name: string;
  description: string;
  category: string;
  style: string;
  features: string[];
  recommended_for: string[];
  color_schemes: Array<{
    name: string;
    primary: number[];
    accent: number[];
    secondary: number[];
  }>;
}

interface TemplateSelectorProps {
  selectedTemplate: string;
  onTemplateChange: (template: string) => void;
  onPreview?: (template: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateChange,
  onPreview
}) => {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/v1/templates`);
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = categoryFilter === 'all'
    ? templates
    : templates.filter(t => t.category === categoryFilter);

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'technical', label: 'Technical' },
    { value: 'creative', label: 'Creative' },
    { value: 'executive', label: 'Executive' },
    { value: 'modern', label: 'Modern' },
    { value: 'academic', label: 'Academic' },
    { value: 'general', label: 'General' }
  ];

  const getTemplateIcon = (category: string): string => {
    const icons: Record<string, string> = {
      technical: 'code',
      creative: 'palette',
      executive: 'military_tech',
      modern: 'auto_awesome',
      academic: 'school',
      general: 'description'
    };
    return icons[category] || 'description';
  };

  const rgbToHex = (rgb: number[]): string => {
    return `#${rgb.map(x => x.toString(16).padStart(2, '0')).join('')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
        <button
          onClick={fetchTemplates}
          className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Filter by Category</label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === cat.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template List */}
      <div className="space-y-3">
        {filteredTemplates.map(template => (
          <div
            key={template.name}
            className={`bg-white rounded-lg border-2 transition-all ${
              selectedTemplate === template.name
                ? 'border-primary-500 shadow-md ring-2 ring-primary-200'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Template Header */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedTemplate(
                expandedTemplate === template.name ? null : template.name
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedTemplate === template.name
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    <span className="material-symbols-outlined text-[24px]">
                      {getTemplateIcon(template.category)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">
                      {template.display_name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {template.description}
                    </p>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-slate-600">
                  <span className={`material-symbols-outlined transition-transform ${
                    expandedTemplate === template.name ? 'rotate-180' : ''
                  }`}>
                    expand_more
                  </span>
                </button>
              </div>

              {/* Selection Radio */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="radio"
                  id={`template-${template.name}`}
                  name="template"
                  value={template.name}
                  checked={selectedTemplate === template.name}
                  onChange={() => onTemplateChange(template.name)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <label
                  htmlFor={`template-${template.name}`}
                  className="text-sm text-slate-700 cursor-pointer"
                >
                  Use this template
                </label>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedTemplate === template.name && (
              <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  {/* Features */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium"
                        >
                          {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recommended For */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Recommended For</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.recommended_for.map((role, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-1 bg-primary-50 text-primary-700 rounded-md text-xs font-medium"
                        >
                          {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Color Schemes */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Color Schemes</h4>
                    <div className="flex gap-2">
                      {template.color_schemes.map((scheme, idx) => (
                        <div
                          key={idx}
                          className="flex gap-1"
                          title={scheme.name}
                        >
                          <div
                            className="w-6 h-6 rounded-full border border-slate-200"
                            style={{ backgroundColor: rgbToHex(scheme.primary) }}
                          />
                          <div
                            className="w-6 h-6 rounded-full border border-slate-200"
                            style={{ backgroundColor: rgbToHex(scheme.accent) }}
                          />
                          <div
                            className="w-6 h-6 rounded-full border border-slate-200"
                            style={{ backgroundColor: rgbToHex(scheme.secondary) }}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {template.color_schemes.length} color scheme{template.color_schemes.length > 1 ? 's' : ''} available
                    </p>
                  </div>

                  {/* Style & Category */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Style & Category</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-slate-500">
                          style
                        </span>
                        <span className="text-sm text-slate-700 capitalize">
                          {template.style}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-slate-500">
                          category
                        </span>
                        <span className="text-sm text-slate-700 capitalize">
                          {template.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Button */}
                {onPreview && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => onPreview(template.name)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        visibility
                      </span>
                      Preview Template
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 bg-slate-50 rounded-lg">
          <span className="material-symbols-outlined text-[48px] text-slate-400 mb-2">
            folder_open
          </span>
          <p className="text-slate-600">No templates found in this category</p>
        </div>
      )}
    </div>
  );
};
