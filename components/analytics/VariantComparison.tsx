/**
 * Variant Comparison Component
 * 
 * Displays side-by-side comparison of two resume variants.
 */

import React, { useState, useMemo } from 'react';
import { ResumeVariant, VariantMetric, AnalyticsAPI } from '@/lib/db/analytics';

interface VariantComparisonProps {
  userId: string;
  variants?: ResumeVariant[];
}

export function VariantComparison({ userId, variants: initialVariants }: VariantComparisonProps) {
  const [variantIdA, setVariantIdA] = useState<string>('');
  const [variantIdB, setVariantIdB] = useState<string>('');
  
  const variants = useMemo(() => 
    initialVariants ?? AnalyticsAPI.getVariants(userId),
    [userId, initialVariants]
  );
  
  const variantA = useMemo(() => 
    variants.find(v => v.id === variantIdA),
    [variants, variantIdA]
  );
  
  const variantB = useMemo(() => 
    variants.find(v => v.id === variantIdB),
    [variants, variantIdB]
  );
  
  const metricsA = useMemo(() => 
    variantA ? AnalyticsAPI.getMetrics(variantA.id) : [],
    [variantA]
  );
  
  const metricsB = useMemo(() => 
    variantB ? AnalyticsAPI.getMetrics(variantB.id) : [],
    [variantB]
  );
  
  const latestMetricsA = metricsA[0];
  const latestMetricsB = metricsB[0];
  
  if (variants.length < 2) {
    return (
      <div className="variant-comparison-empty">
        <p>You need at least 2 variants to compare. Create more variants first.</p>
      </div>
    );
  }
  
  return (
    <div className="variant-comparison">
      <h3>Compare Variants</h3>
      
      <div className="comparison-selectors">
        <div className="selector-group">
          <label>Variant A</label>
          <select 
            value={variantIdA}
            onChange={(e) => setVariantIdA(e.target.value)}
          >
            <option value="">Select variant...</option>
            {variants.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} {v.is_default ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>
        
        <div className="vs-badge">VS</div>
        
        <div className="selector-group">
          <label>Variant B</label>
          <select 
            value={variantIdB}
            onChange={(e) => setVariantIdB(e.target.value)}
          >
            <option value="">Select variant...</option>
            {variants.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} {v.is_default ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {variantA && variantB && (
        <div className="comparison-content">
          <div className="comparison-header">
            <div className="comparison-variant">
              <h4>{variantA.name}</h4>
              {variantA.target_job_title && (
                <span className="target">🎯 {variantA.target_job_title}</span>
              )}
            </div>
            <div className="comparison-variant">
              <h4>{variantB.name}</h4>
              {variantB.target_job_title && (
                <span className="target">🎯 {variantB.target_job_title}</span>
              )}
            </div>
          </div>
          
          <div className="comparison-metrics">
            <div className="metric-row header">
              <span className="metric-label">Metric</span>
              <span className="metric-value-a">Variant A</span>
              <span className="metric-value-b">Variant B</span>
            </div>
            
            {[
              { label: 'Views', key: 'views' },
              { label: 'Downloads', key: 'downloads' },
              { label: 'Applications', key: 'applications' },
              { label: 'Responses', key: 'responses' },
              { label: 'Interviews', key: 'interviews' },
              { label: 'Response Rate', key: 'response_rate', isPercent: true },
            ].map(metric => {
              const valueA = latestMetricsA?.[metric.key as keyof VariantMetric] as number ?? 0;
              const valueB = latestMetricsB?.[metric.key as keyof VariantMetric] as number ?? 0;
              const winner = valueA > valueB ? 'a' : valueB > valueA ? 'b' : 'tie';
              
              return (
                <div key={metric.key} className={`metric-row ${winner}`}>
                  <span className="metric-label">{metric.label}</span>
                  <span className="metric-value-a">
                    {metric.isPercent ? `${valueA.toFixed(1)}%` : valueA}
                  </span>
                  <span className="metric-value-b">
                    {metric.isPercent ? `${valueB.toFixed(1)}%` : valueB}
                  </span>
                  {winner !== 'tie' && (
                    <span className={`winner-badge ${winner}`}>
                      {winner === 'a' ? '← A' : 'B →'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default VariantComparison;
