/**
 * A/B Testing Insights Component
 * 
 * Provides statistical analysis and insights for A/B testing resume variants.
 */

import React, { useState, useMemo } from 'react';
import { ResumeVariant, VariantMetric, ABTestResult, AnalyticsAPI } from '@/lib/db/analytics';

interface ABTestingInsightsProps {
  userId: string;
  variants?: ResumeVariant[];
}

// Statistical significance calculation using Z-test
function calculateSignificance(
  conversionsA: number,
  visitorsA: number,
  conversionsB: number,
  visitorsB: number
): { significant: boolean; confidence: number; winner: 'a' | 'b' | 'none' } {
  if (visitorsA < 10 || visitorsB < 10) {
    return { significant: false, confidence: 0, winner: 'none' };
  }
  
  const rateA = conversionsA / visitorsA;
  const rateB = conversionsB / visitorsB;
  
  const pooledRate = (conversionsA + conversionsB) / (visitorsA + visitorsB);
  const standardError = Math.sqrt(
    pooledRate * (1 - pooledRate) * (1 / visitorsA + 1 / visitorsB)
  );
  
  if (standardError === 0) {
    return { significant: false, confidence: 0, winner: 'none' };
  }
  
  const zScore = Math.abs(rateA - rateB) / standardError;
  
  // Convert Z-score to confidence level (approximation)
  const confidence = Math.min(99.9, (1 - 2 * (1 - normalCDF(zScore))) * 100);
  const significant = confidence >= 95;
  
  return {
    significant,
    confidence,
    winner: rateA > rateB ? 'a' : rateB > rateA ? 'b' : 'none',
  };
}

function normalCDF(z: number): number {
  // Approximation of normal CDF
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1.0 + sign * y);
}

export function ABTestingInsights({ userId, variants: initialVariants }: ABTestingInsightsProps) {
  const [metricType, setMetricType] = useState<'response_rate' | 'interview_rate'>('response_rate');
  
  const variants = useMemo(() => 
    initialVariants ?? AnalyticsAPI.getVariants(userId),
    [userId, initialVariants]
  );
  
  const results = useMemo(() => {
    if (variants.length < 2) return [];
    
    const results: ABTestResult[] = [];
    
    // Compare all pairs of variants
    for (let i = 0; i < variants.length; i++) {
      for (let j = i + 1; j < variants.length; j++) {
        const variantA = variants[i];
        const variantB = variants[j];
        
        const metricsA = AnalyticsAPI.getMetrics(variantA.id);
        const metricsB = AnalyticsAPI.getMetrics(variantB.id);
        
        if (metricsA.length === 0 || metricsB.length === 0) {
          results.push({
            variant_a_id: variantA.id,
            variant_b_id: variantB.id,
            metric_name: metricType,
            variant_a_value: 0,
            variant_b_value: 0,
            winner: 'insufficient_data',
            confidence_level: 0,
            sample_size_a: 0,
            sample_size_b: 0,
            recommendation: 'Not enough data to compare',
          });
          continue;
        }
        
        const mA = metricsA[0];
        const mB = metricsB[0];
        
        const valueA = metricType === 'response_rate' ? mA.response_rate : 
          (mA.interviews / Math.max(mA.applications, 1)) * 100;
        const valueB = metricType === 'response_rate' ? mB.response_rate : 
          (mB.interviews / Math.max(mB.applications, 1)) * 100;
        
        const { significant, confidence, winner } = calculateSignificance(
          mA.responses,
          mA.applications,
          mB.responses,
          mB.applications
        );
        
        let recommendation = '';
        if (winner === 'insufficient_data' || mA.applications < 5 || mB.applications < 5) {
          recommendation = 'Need more applications for statistical significance';
        } else if (significant) {
          const winnerVariant = winner === 'a' ? variantA.name : variantB.name;
          recommendation = `${winnerVariant} is performing significantly better (${confidence.toFixed(1)}% confidence)`;
        } else {
          recommendation = 'No statistically significant difference yet';
        }
        
        results.push({
          variant_a_id: variantA.id,
          variant_b_id: variantB.id,
          metric_name: metricType,
          variant_a_value: valueA,
          variant_b_value: valueB,
          winner,
          confidence_level: confidence,
          sample_size_a: mA.applications,
          sample_size_b: mB.applications,
          recommendation,
        });
      }
    }
    
    return results;
  }, [variants, metricType]);
  
  const bestVariant = useMemo(() => {
    if (variants.length === 0) return null;
    
    let best: ResumeVariant | null = null;
    let bestRate = -1;
    
    for (const variant of variants) {
      const metrics = AnalyticsAPI.getMetrics(variant.id);
      if (metrics.length > 0) {
        const rate = metrics[0].response_rate;
        if (rate > bestRate) {
          bestRate = rate;
          best = variant;
        }
      }
    }
    
    return best;
  }, [variants]);
  
  if (variants.length < 2) {
    return (
      <div className="ab-testing-insights-empty">
        <p>You need at least 2 variants with metrics data for A/B testing insights.</p>
        <p className="hint">Track applications for each variant to see insights.</p>
      </div>
    );
  }
  
  return (
    <div className="ab-testing-insights">
      <div className="insights-header">
        <h3>A/B Testing Insights</h3>
        <select 
          value={metricType}
          onChange={(e) => setMetricType(e.target.value as 'response_rate' | 'interview_rate')}
        >
          <option value="response_rate">Response Rate</option>
          <option value="interview_rate">Interview Rate</option>
        </select>
      </div>
      
      {bestVariant && (
        <div className="best-variant-card">
          <h4>🏆 Top Performing Variant</h4>
          <div className="best-variant-name">{bestVariant.name}</div>
          {(() => {
            const metrics = AnalyticsAPI.getMetrics(bestVariant.id);
            if (metrics.length > 0) {
              return (
                <div className="best-variant-metrics">
                  <span>{metrics[0].response_rate.toFixed(1)}% response rate</span>
                  <span>{metrics[0].applications} applications</span>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}
      
      <div className="test-results">
        <h4>Variant Comparisons</h4>
        
        {results.length === 0 ? (
          <p className="no-data">No comparison data available yet.</p>
        ) : (
          results.map((result, index) => {
            const variantA = variants.find(v => v.id === result.variant_a_id);
            const variantB = variants.find(v => v.id === result.variant_b_id);
            
            return (
              <div 
                key={index} 
                className={`test-result-card ${result.winner}`}
              >
                <div className="test-variants">
                  <span className="variant-name">{variantA?.name}</span>
                  <span className="vs">vs</span>
                  <span className="variant-name">{variantB?.name}</span>
                </div>
                
                <div className="test-metrics">
                  <div className={`metric-value ${result.winner === 'a' ? 'winner' : ''}`}>
                    {result.variant_a_value.toFixed(1)}%
                  </div>
                  <div className={`metric-value ${result.winner === 'b' ? 'winner' : ''}`}>
                    {result.variant_b_value.toFixed(1)}%
                  </div>
                </div>
                
                <div className="test-confidence">
                  <span className="confidence-label">Confidence:</span>
                  <span className={`confidence-value ${result.confidence_level >= 95 ? 'significant' : ''}`}>
                    {result.confidence_level.toFixed(1)}%
                  </span>
                </div>
                
                <div className="test-recommendation">
                  {result.recommendation}
                </div>
                
                <div className="test-sample-size">
                  Sample: {result.sample_size_a} vs {result.sample_size_b} applications
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div className="insights-info">
        <h4>Understanding A/B Testing</h4>
        <ul>
          <li><strong>Statistical Significance:</strong> Results are statistically significant at 95% confidence or higher.</li>
          <li><strong>Response Rate:</strong> Percentage of applications that received a response.</li>
          <li><strong>Interview Rate:</strong> Percentage of applications that led to interviews.</li>
          <li><strong>Recommendation:</strong> Use variants with statistically significant results for future applications.</li>
        </ul>
      </div>
    </div>
  );
}

export default ABTestingInsights;
