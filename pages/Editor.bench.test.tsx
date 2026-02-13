import { describe, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React, { useState } from 'react';
import Editor from './Editor';
import { ResumeData, WorkItem } from '../types';

// Mock data generator
const generateLargeResumeData = (count: number): ResumeData => {
  const work: WorkItem[] = Array.from({ length: count }, (_, i) => ({
    
    company: `Company ${i}`,
    position: `Role ${i}`,
    startDate: '2020',
    endDate: '2021',
    current: false,
    summary: `Description for ${i}`,
    highlights: ['Tag1', 'Tag2']
  }));

  return {
    name: "Test User",
    email: "test@example.com",
    phone: "123",
    location: "Test Loc",
    role: "Test Role",
    experience: experiences
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

    console.log(`[BENCHMARK] Update took ${duration.toFixed(2)}ms with ${ITEM_COUNT} items`);
  });
});
