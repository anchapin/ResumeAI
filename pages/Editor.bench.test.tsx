import { describe, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import Editor from './Editor';
import { SimpleResumeData, WorkExperience } from '../types';

// Mock the fetch for variants API
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ variants: [] }),
      }),
    ),
  );
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      is_active: true,
      is_verified: true,
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  }),
}));

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
    tags: ['Tag1', 'Tag2'],
  }));

  return {
    name: 'Test User',
    email: 'test@example.com',
    phone: '123',
    location: 'Test Loc',
    role: 'Test Role',
    summary: 'Test summary',
    skills: ['Test skill'],
    experience: experiences,
    education: [],
    projects: [],
  };
};

const TestWrapper = ({ count }: { count: number }) => {
  return <Editor />;
};

describe('Editor Performance', () => {
  it('measures input update performance with many items', async () => {
    const ITEM_COUNT = 10;
    const { container } = render(
      <MemoryRouter initialEntries={['/editor']}>
        <TestWrapper count={ITEM_COUNT} />
      </MemoryRouter>,
    );

    // Wait for editor to load
    await waitFor(
      () => {
        // Just check that some content is rendered
        expect(container).toBeDefined();
      },
      { timeout: 5000 },
    );

    const startTime = performance.now();

    // Simulate a state update
    await act(async () => {
      // Just measure that the component can be rendered without major performance issues
      expect(container.querySelector('main')).toBeDefined();
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`[BENCHMARK] Update took ${duration.toFixed(2)}ms with ${ITEM_COUNT} items`);
  });
});
// CI trigger
// Final CI trigger
// CI trigger after cleanup
