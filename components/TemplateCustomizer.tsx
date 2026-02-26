import React from 'react';

interface ColorScheme {
  name: string;
  primary: number[];
  accent: number[];
  secondary: number[];
}

interface TemplateCustomizerProps {
  templateName: string;
  customization: {
    color_scheme: string;
    font: string;
    paper_size: string;
    margin_left: number;
    margin_right: number;
    margin_top: number;
    margin_bottom: number;
  };
  availableSchemes?: ColorScheme[];
  availableFonts?: string[];
  onCustomizationChange: (key: string, value: any) => void;
  onApply?: () => void;
}

export const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({
  templateName,
  customization,
  availableSchemes = [],
  availableFonts = [],
  onCustomizationChange,
  onApply,
}) => {
  const rgbToHex = (rgb: number[]): string => {
    return `#${rgb.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  };

  const paperSizes = [
    { value: 'letter', label: 'Letter (8.5" x 11")' },
    { value: 'a4', label: 'A4 (210mm x 297mm)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Customize Template</h3>
        <p className="text-sm text-slate-500">Personalize your {templateName} template</p>
      </div>

      {/* Color Scheme */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Color Scheme</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {availableSchemes.map((scheme) => (
            <button
              key={scheme.name}
              onClick={() => onCustomizationChange('color_scheme', scheme.name)}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                customization.color_scheme === scheme.name
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex gap-1">
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: rgbToHex(scheme.primary) }}
                  title="Primary Color"
                />
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: rgbToHex(scheme.accent) }}
                  title="Accent Color"
                />
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: rgbToHex(scheme.secondary) }}
                  title="Secondary Color"
                />
              </div>
              <span className="text-sm font-medium text-slate-700 capitalize">{scheme.name}</span>
              {customization.color_scheme === scheme.name && (
                <span className="material-symbols-outlined text-primary-600 text-[20px] ml-auto">
                  check_circle
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Font Selection */}
      {availableFonts.length > 0 && (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Font</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableFonts.map((font) => (
              <button
                key={font}
                onClick={() => onCustomizationChange('font', font)}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  customization.font === font
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-medium text-slate-700 capitalize">{font}</span>
                {customization.font === font && (
                  <span className="material-symbols-outlined text-primary-600 text-[20px]">
                    check_circle
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paper Size */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Paper Size</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {paperSizes.map((size) => (
            <button
              key={size.value}
              onClick={() => onCustomizationChange('paper_size', size.value)}
              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                customization.paper_size === size.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-sm font-medium text-slate-700">{size.label}</span>
              {customization.paper_size === size.value && (
                <span className="material-symbols-outlined text-primary-600 text-[20px]">
                  check_circle
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Margins */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Margins (inches)</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Left</label>
            <input
              type="number"
              step="0.05"
              min="0.25"
              max="2.0"
              value={customization.margin_left}
              onChange={(e) => onCustomizationChange('margin_left', parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Right</label>
            <input
              type="number"
              step="0.05"
              min="0.25"
              max="2.0"
              value={customization.margin_right}
              onChange={(e) => onCustomizationChange('margin_right', parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Top</label>
            <input
              type="number"
              step="0.05"
              min="0.25"
              max="2.0"
              value={customization.margin_top}
              onChange={(e) => onCustomizationChange('margin_top', parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Bottom</label>
            <input
              type="number"
              step="0.05"
              min="0.25"
              max="2.0"
              value={customization.margin_bottom}
              onChange={(e) => onCustomizationChange('margin_bottom', parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Recommended: Standard (0.75"), Tight (0.5"), Wide (1.0")
        </p>
      </div>

      {/* Apply Button */}
      {onApply && (
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={onApply}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-[20px]">done</span>
            Apply Customization
          </button>
        </div>
      )}
    </div>
  );
};
