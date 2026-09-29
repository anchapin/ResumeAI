/**
 * Skills Chart Component
 * 
 * Displays skills distribution as a bar or pie chart.
 * Uses native HTML/CSS for visualization (no external chart library needed).
 */

import React, { useState, useMemo } from 'react';
import { AnalyticsSkill, AnalyticsAPI } from '@/lib/db/analytics';

interface SkillsChartProps {
  userId: string;
  skills?: AnalyticsSkill[];
}

type ChartType = 'bar' | 'pie';

const CATEGORY_COLORS: Record<string, string> = {
  technical: '#3b82f6',
  soft: '#10b981',
  domain: '#8b5cf6',
  tool: '#f59e0b',
  language: '#ef4444',
  other: '#6b7280',
};

export function SkillsChart({ userId, skills: initialSkills }: SkillsChartProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const skills = useMemo(() => {
    const data = initialSkills ?? AnalyticsAPI.getSkills(userId);
    if (categoryFilter === 'all') return data;
    return data.filter(s => s.category === categoryFilter);
  }, [userId, initialSkills, categoryFilter]);
  
  const totalFrequency = useMemo(() => 
    skills.reduce((sum, s) => sum + s.frequency, 0), 
    [skills]
  );
  
  const categories = useMemo(() => {
    const cats: Record<string, number> = {};
    skills.forEach(s => {
      cats[s.category] = (cats[s.category] || 0) + s.frequency;
    });
    return Object.entries(cats).map(([name, value]) => ({
      name,
      value,
      percentage: totalFrequency > 0 ? (value / totalFrequency) * 100 : 0,
    }));
  }, [skills, totalFrequency]);
  
  const sortedSkills = useMemo(() => 
    [...skills].sort((a, b) => b.frequency - a.frequency).slice(0, 10),
    [skills]
  );
  
  if (skills.length === 0) {
    return (
      <div className="skills-chart-empty">
        <p>No skills data yet. Add skills from your resume to see the distribution.</p>
      </div>
    );
  }
  
  return (
    <div className="skills-chart">
      <div className="skills-chart-header">
        <h3>Skills Distribution</h3>
        <div className="skills-chart-controls">
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="category-filter"
          >
            <option value="all">All Categories</option>
            <option value="technical">Technical</option>
            <option value="soft">Soft Skills</option>
            <option value="domain">Domain</option>
            <option value="tool">Tools</option>
            <option value="language">Languages</option>
          </select>
          <div className="chart-type-toggle">
            <button 
              className={chartType === 'bar' ? 'active' : ''}
              onClick={() => setChartType('bar')}
            >
              Bar
            </button>
            <button 
              className={chartType === 'pie' ? 'active' : ''}
              onClick={() => setChartType('pie')}
            >
              Pie
            </button>
          </div>
        </div>
      </div>
      
      {chartType === 'bar' ? (
        <div className="skills-bar-chart">
          {sortedSkills.map((skill, index) => {
            const percentage = totalFrequency > 0 
              ? (skill.frequency / totalFrequency) * 100 
              : 0;
            return (
              <div key={skill.id} className="skill-bar-row">
                <div className="skill-bar-label">
                  <span className="skill-name">{skill.skill_name}</span>
                  <span className="skill-category" style={{ 
                    color: CATEGORY_COLORS[skill.category] 
                  }}>
                    {skill.category}
                  </span>
                </div>
                <div className="skill-bar-container">
                  <div 
                    className="skill-bar-fill"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: CATEGORY_COLORS[skill.category],
                    }}
                  />
                  <span className="skill-bar-value">{skill.frequency}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="skills-pie-chart">
          <div className="pie-chart-container">
            <svg viewBox="0 0 100 100" className="pie-chart">
              {(() => {
                let currentAngle = 0;
                return categories.map((cat, index) => {
                  const angle = (cat.percentage / 100) * 360;
                  const startAngle = currentAngle;
                  const endAngle = currentAngle + angle;
                  currentAngle = endAngle;
                  
                  const start = polarToCartesian(50, 50, 40, endAngle);
                  const end = polarToCartesian(50, 50, 40, startAngle);
                  const largeArcFlag = angle > 180 ? 1 : 0;
                  
                  const pathD = [
                    `M 50 50`,
                    `L ${start.x} ${start.y}`,
                    `A 40 40 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
                    `Z`
                  ].join(' ');
                  
                  return (
                    <path
                      key={cat.name}
                      d={pathD}
                      fill={CATEGORY_COLORS[cat.name] || '#6b7280'}
                      className="pie-slice"
                    />
                  );
                });
              })()}
              <circle cx="50" cy="50" r="25" fill="white" />
            </svg>
          </div>
          <div className="pie-chart-legend">
            {categories.map(cat => (
              <div key={cat.name} className="legend-item">
                <span 
                  className="legend-color" 
                  style={{ backgroundColor: CATEGORY_COLORS[cat.name] }}
                />
                <span className="legend-label">{cat.name}</span>
                <span className="legend-value">{cat.value} ({cat.percentage.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export default SkillsChart;
