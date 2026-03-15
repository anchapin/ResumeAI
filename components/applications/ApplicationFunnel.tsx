/**
 * ApplicationFunnel Component
 * 
 * Visualizes application funnel with conversion rates.
 * 
 * @example
 * <ApplicationFunnel funnelData={funnelData} />
 */

import React from 'react';
import type { FunnelData } from '../../types/applications';

export interface ApplicationFunnelProps {
  funnelData: FunnelData;
}

export function ApplicationFunnel({ funnelData }: ApplicationFunnelProps) {
  const { stages } = funnelData;

  // Find max count for scaling
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h3 style={{ margin: '0 0 24px', fontSize: '18px', color: '#333' }}>
        Application Funnel
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {stages.map((stage, index) => {
          const width = (stage.count / maxCount) * 100;
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.stage}>
              {/* Stage Label */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                  {stage.label}
                </span>
                <span style={{ fontSize: '14px', color: '#666' }}>
                  {stage.count}
                </span>
              </div>

              {/* Bar */}
              <div
                style={{
                  height: '32px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${width}%`,
                    height: '100%',
                    backgroundColor: getStageColor(stage.stage),
                    borderRadius: '6px',
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '12px',
                  }}
                >
                  {width > 15 && (
                    <span style={{ fontSize: '12px', color: 'white', fontWeight: 600 }}>
                      {stage.count}
                    </span>
                  )}
                </div>
              </div>

              {/* Conversion Rate */}
              {!isLast && stage.conversionRate !== undefined && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', textAlign: 'right' }}>
                  ↓ {stage.conversionRate}% conversion
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div
        style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-around',
        }}
      >
        <StatItem
          label="Total Applied"
          value={stages[0]?.count || 0}
        />
        <StatItem
          label="Interviewing"
          value={stages.find((s) => s.stage === 'interviewing')?.count || 0}
        />
        <StatItem
          label="Offers"
          value={stages.find((s) => s.stage === 'offer')?.count || 0}
        />
        <StatItem
          label="Accepted"
          value={stages.find((s) => s.stage === 'accepted')?.count || 0}
        />
      </div>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 700, color: '#007bff' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
        {label}
      </div>
    </div>
  );
}

function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    applied: '#007bff',
    screening: '#17a2b8',
    interviewing: '#ffc107',
    offer: '#28a745',
    accepted: '#28a745',
    rejected: '#dc3545',
    withdrawn: '#6c757d',
    archived: '#6c757d',
  };

  return colors[stage] || '#6c757d';
}

export default ApplicationFunnel;
