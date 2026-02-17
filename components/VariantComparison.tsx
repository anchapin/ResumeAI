import React, { useState, useMemo } from 'react';

interface Variant {
  id: string;
  name: string;
  template: string;
  createdAt: string;
  tailoredFor?: string;
  score?: number;
}

/** Mock variants data - in production this would come from the API */
const mockVariants: Variant[] = [
  { id: '1', name: 'v1.0.0-original', template: 'modern', createdAt: '2026-02-15', score: 75 },
  { id: '2', name: 'v1.0.0-google', template: 'modern', createdAt: '2026-02-16', tailoredFor: 'Google - Software Engineer', score: 88 },
  { id: '3', name: 'v1.0.0-stripe', template: 'minimal', createdAt: '2026-02-17', tailoredFor: 'Stripe - Product Designer', score: 92 },
];

/**
 * @component
 * @description Variant comparison component for comparing different resume versions
 * @returns {JSX.Element} The rendered variant comparison component
 */
const VariantComparison: React.FC = () => {
  const [variants] = useState<Variant[]>(mockVariants);
  const [selectedVariants, setSelectedVariants] = useState<string[]>(['1', '2']);
  const [compareMode, setCompareMode] = useState<'side-by-side' | 'diff'>('side-by-side');

  // Toggle variant selection
  const toggleVariant = (id: string) => {
    setSelectedVariants(prev => {
      if (prev.includes(id)) {
        return prev.filter(v => v !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  // Get selected variant objects
  const selectedVariantObjects = useMemo(() => {
    return selectedVariants.map(id => variants.find(v => v.id === id)).filter(Boolean) as Variant[];
  }, [selectedVariants, variants]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Resume Variants</h2>
          <p className="text-sm text-slate-500">Compare different versions of your tailored resumes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompareMode('side-by-side')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              compareMode === 'side-by-side' 
                ? 'bg-primary-600 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Side by Side
          </button>
          <button
            onClick={() => setCompareMode('diff')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              compareMode === 'diff' 
                ? 'bg-primary-600 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Difference
          </button>
        </div>
      </div>

      {/* Variant Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Select variants to compare (select 2)</h3>
        <div className="flex flex-wrap gap-3">
          {variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => toggleVariant(variant.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                selectedVariants.includes(variant.id)
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedVariants.includes(variant.id)
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-slate-300'
              }`}>
                {selectedVariants.includes(variant.id) && (
                  <span className="material-symbols-outlined text-white text-[14px]">check</span>
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-slate-900">{variant.name}</div>
                <div className="text-xs text-slate-500">
                  {variant.tailoredFor || 'Original'} • Score: {variant.score}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Comparison View */}
      {selectedVariantObjects.length === 2 ? (
        compareMode === 'side-by-side' ? (
          <div className="grid grid-cols-2 gap-6">
            {selectedVariantObjects.map((variant, idx) => (
              <div key={variant.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{variant.name}</h3>
                      <p className="text-sm text-slate-500">{variant.tailoredFor || 'Original Resume'}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary-600">{variant.score}</div>
                      <div className="text-xs text-slate-500">ATS Score</div>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="text-sm text-slate-600">
                    <p className="font-bold mb-2">Template: {variant.template}</p>
                    <p>Created: {variant.createdAt}</p>
                  </div>
                  {/* Placeholder for actual resume preview */}
                  <div className="bg-slate-50 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                    <p className="text-sm text-slate-400">Resume preview would appear here</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Key Differences</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <span className="material-symbols-outlined text-green-600">add</span>
                <div>
                  <h4 className="font-bold text-green-800">Added in {selectedVariantObjects[1].name}</h4>
                  <ul className="text-sm text-green-700 mt-1 space-y-1">
                    <li>• Keywords: AWS, Microservices, Kubernetes</li>
                    <li>• Achievement metrics: "improved scalability by 40%"</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <span className="material-symbols-outlined text-amber-600">edit</span>
                <div>
                  <h4 className="font-bold text-amber-800">Modified</h4>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    <li>• Summary - tailored for {selectedVariantObjects[1].tailoredFor}</li>
                    <li>• Skills - reordered by relevance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="bg-slate-50 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300">compare</span>
          <p className="text-slate-500 mt-4">Select exactly 2 variants to compare</p>
        </div>
      )}

      {/* Generate New Variant */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20">
          <span className="material-symbols-outlined">add</span>
          Generate New Variant
        </button>
      </div>
    </div>
  );
};

export default VariantComparison;
