import { describe, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React, { useState } from 'react';
import Editor from './Editor';
import { SimpleResumeData, WorkExperience } from '../types';
import logger from '../utils/logger';

// Mock data generator
const generateLargeResumeData = (count: number): SimpleResumeData => {
  const experiences: WorkExperience[] = Array.from({ length: count }, (_, i) => ({
    id: `exp-${i}`,
    company: `Company ${i}`,
    role: `Role ${i}`,
    startDate: '2020',
    endDate: '2021',
    current: false,
    description: `Description for ${i}`,
    tags: ['Tag1', 'Tag2']
  }));

  return {
    name: "Test User",
    email: "test@example.com",
    phone: "123",
    location: "Test Loc",
    role: "Test Role",
    summary: "Test summary",
    skills: ["Skill 1", "Skill 2"],
    experience: experiences,
    education: [{
      id: "edu-1",
      institution: "Test Institution",
      area: "Computer Science",
      studyType: "Bachelor's",
      startDate: "2015",
      endDate: "2019"
    }],
    projects: [{
      id: "proj-1",
      name: "Test Project",
      description: "Test Description",
      startDate: "2020",
      endDate: "2021",
      highlights: ["Highlight 1"]
    }]
  };
};

const TestWrapper = ({ count }: { count: number }) => {
  const [resumeData, setResumeData] = useState(generateLargeResumeData(count));

  return (
    <Editor
      resumeData={resumeData}
      onUpdate={setResumeData}
      onBack={() => {}}
    />
  );
};

describe('Editor Performance', () => {
  it('measures input update performance with many items', async () => {
    const ITEM_COUNT = 1000;
    const { container } = render(<TestWrapper count={ITEM_COUNT} />);

    // The first item is expanded by default.
    // Find the input for the first item's company.
    // It should have value "Company 0".
    const input = screen.getByDisplayValue('Company 0');

    const startTime = performance.now();

    // Simulate typing a single character
    // Using fireEvent.change triggers the onChange handler
    await act(async () => {
        fireEvent.change(input, { target: { value: 'Company 0 Updated' } });
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    logger.info(`[BENCHMARK] Update took ${duration.toFixed(2)}ms with ${ITEM_COUNT} items`);
  });
});
// CI trigger
// Final CI trigger
