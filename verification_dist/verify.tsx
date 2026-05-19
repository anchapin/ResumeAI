import React from 'react';
import { createRoot } from 'react-dom/client';
import { OfferComparison } from '/app/components/OfferComparison';

const mockComparison = {
  id: 'comp_1',
  title: 'Test Comparison',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  offers: [
    {
      id: 'offer_1',
      companyName: 'Tech Corp',
      jobTitle: 'Senior Engineer',
      baseSalary: 150000,
      signOnBonus: 20000,
      equity: 50000,
      equityType: 'RSU',
      equityVestingSchedule: '4 years, 1 year cliff',
      performanceBonus: 15000,
      annualBonus: 0,
      ptoDays: 20,
      remotePolicy: 'Hybrid',
      benefits: ['Health', '401k matching', 'Dental'],
      notes: 'Great team',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  priorities: {
    baseSalary: 5,
    totalCompensation: 5,
    equity: 3,
    benefits: 4,
    pto: 4,
    remote: 5,
    culture: 4,
    growth: 5
  },
  scores: [
    {
        offerId: 'offer_1',
        totalScore: 90,
        categoryScores: {
          compensation: 95,
          benefits: 85,
          workLife: 90
        },
        breakdown: {
            "test": 100
        },
        pros: ['High base salary', 'Good PTO'],
        cons: ['Hybrid instead of remote']
    }
  ],
  recommendation: {
    topOfferId: 'offer_1',
    reason: 'Matches all top priorities',
    scores: {
      offer_1: {
        totalScore: 90,
        categoryScores: {
          compensation: 95,
          benefits: 85,
          workLife: 90
        },
        pros: ['High base salary', 'Good PTO'],
        cons: ['Hybrid instead of remote']
      }
    }
  }
};

const App = () => (
    <div className="bg-white p-8">
        <OfferComparison comparison={mockComparison as any} />
    </div>
);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
