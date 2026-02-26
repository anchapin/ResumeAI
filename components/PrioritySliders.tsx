import React from 'react';
import { ComparisonPriority } from '../types';

interface PrioritySlidersProps {
  priorities: ComparisonPriority;
  onChange: (priorities: ComparisonPriority) => void;
  disabled?: boolean;
}

const PRIORITIES: Array<{
  key: keyof ComparisonPriority;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    key: 'salary',
    label: 'Salary',
    description: 'Base salary, bonus, and equity compensation',
    icon: 'payments',
  },
  {
    key: 'growth',
    label: 'Growth Potential',
    description: 'Career advancement and skill development',
    icon: 'trending_up',
  },
  {
    key: 'workLifeBalance',
    label: 'Work-Life Balance',
    description: 'Flexibility, remote work, and hours',
    icon: 'balance',
  },
  {
    key: 'benefits',
    label: 'Benefits',
    description: 'Healthcare, PTO, and other perks',
    icon: 'verified',
  },
  {
    key: 'culture',
    label: 'Company Culture',
    description: 'Team environment and company values',
    icon: 'groups',
  },
];

/**
 * Priority Sliders Component
 *
 * Allows users to adjust weights for offer comparison factors
 */
export const PrioritySliders: React.FC<PrioritySlidersProps> = ({
  priorities,
  onChange,
  disabled = false,
}) => {
  const handlePriorityChange = (key: keyof ComparisonPriority, value: number) => {
    onChange({
      ...priorities,
      [key]: value,
    });
  };

  const handleReset = () => {
    onChange({
      salary: 30,
      growth: 20,
      workLifeBalance: 20,
      benefits: 15,
      culture: 15,
    });
  };

  const totalWeight = Object.values(priorities).reduce((sum, val) => sum + val, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900">Comparison Priorities</h3>
          <p className="text-sm text-slate-500">Adjust weights to customize offer scoring</p>
        </div>
        <button
          onClick={handleReset}
          disabled={disabled}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Reset to Default
        </button>
      </div>

      <div className="space-y-5">
        {PRIORITIES.map((priority) => (
          <div key={priority.key} className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1">
                <span className="material-symbols-outlined text-slate-500 text-[20px] mt-0.5">
                  {priority.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-900 text-sm">{priority.label}</label>
                    <span className="text-sm font-bold text-primary-600 w-10 text-right">
                      {priorities[priority.key]}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{priority.description}</p>
                </div>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={priorities[priority.key]}
              onChange={(e) => handlePriorityChange(priority.key, Number(e.target.value))}
              disabled={disabled}
              className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{
                background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${priorities[priority.key]}%, #e2e8f0 ${priorities[priority.key]}%, #e2e8f0 100%)`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Total Weight Indicator */}
      <div
        className={`p-4 rounded-lg border ${
          totalWeight === 100
            ? 'bg-green-50 border-green-200'
            : totalWeight > 100
              ? 'bg-amber-50 border-amber-200'
              : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">
              {totalWeight === 100 ? 'check_circle' : 'warning'}
            </span>
            <div>
              <p
                className={`font-bold text-sm ${
                  totalWeight === 100 ? 'text-green-900' : 'text-amber-900'
                }`}
              >
                Total Weight: {totalWeight}%
              </p>
              <p className="text-xs text-slate-600">
                {totalWeight === 100
                  ? 'Weights are perfectly balanced'
                  : totalWeight > 100
                    ? 'Total exceeds 100%. Please adjust the sliders.'
                    : 'Total is below 100%. Consider increasing some priorities.'}
              </p>
            </div>
          </div>
          {totalWeight === 100 && (
            <span className="material-symbols-outlined text-green-600 text-2xl">done</span>
          )}
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
          Quick Presets
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              onChange({ salary: 40, growth: 25, workLifeBalance: 15, benefits: 10, culture: 10 })
            }
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Compensation Focused
          </button>
          <button
            onClick={() =>
              onChange({ salary: 25, growth: 35, workLifeBalance: 20, benefits: 10, culture: 10 })
            }
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Growth Focused
          </button>
          <button
            onClick={() =>
              onChange({ salary: 25, growth: 20, workLifeBalance: 30, benefits: 15, culture: 10 })
            }
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Work-Life Balance
          </button>
          <button
            onClick={() =>
              onChange({ salary: 20, growth: 20, workLifeBalance: 20, benefits: 20, culture: 20 })
            }
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Balanced
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrioritySliders;
