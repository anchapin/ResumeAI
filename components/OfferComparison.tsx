import React, { useState } from 'react';
import { OfferComparison as OfferComparisonType, JobOffer } from '../types';
import { showSuccessToast } from '../utils/toast';

interface OfferComparisonProps {
  comparison: OfferComparisonType;
  onExport?: (format: 'pdf' | 'csv' | 'json') => void;
}

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Offer Comparison Component
 *
 * Displays side-by-side comparison of job offers with scores and recommendations
 */
export const OfferComparison: React.FC<OfferComparisonProps> = ({ comparison, onExport }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'analysis'>('overview');
  const topOffer = comparison.offers.find((o) => o.id === comparison.recommendation.topOfferId);

  const getScoreColor = (score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 60) return 'text-blue-600 bg-blue-50';
    if (percentage >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'overview'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'details'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'analysis'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Analysis
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Recommendation Banner */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="bg-white/20 size-12 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">star</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Recommended Offer</h3>
                <p className="text-white/90 mb-3">{comparison.recommendation.reason}</p>
                {topOffer && (
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <p className="font-bold">{topOffer.companyName}</p>
                    <p className="text-white/80">{topOffer.jobTitle}</p>
                    <p className="text-white/90 mt-1 font-bold text-lg">
                      {formatCurrency(
                        topOffer.baseSalary + (topOffer.bonus || 0),
                        topOffer.currency,
                      )}
                      /year
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Score Comparison Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h4 className="font-bold text-slate-900 mb-4">Score Comparison</h4>
            <div className="space-y-4">
              {comparison.scores.map((score) => {
                const offer = comparison.offers.find((o) => o.id === score.offerId);
                if (!offer) return null;

                return (
                  <div key={score.offerId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            score.offerId === comparison.recommendation.topOfferId
                              ? 'bg-green-500'
                              : 'bg-slate-300'
                          }`}
                        />
                        <span className="font-medium text-slate-900">{offer.companyName}</span>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(score.totalScore)}`}
                      >
                        {score.totalScore.toFixed(1)}
                      </div>
                    </div>

                    {/* Breakdown Bars */}
                    <div className="space-y-1">
                      {Object.entries(score.breakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-20 text-xs text-slate-600 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                value > 20
                                  ? 'bg-primary-500'
                                  : value > 10
                                    ? 'bg-primary-400'
                                    : 'bg-primary-300'
                              }`}
                              style={{ width: `${(value / 30) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-xs text-slate-600 text-right">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Weights */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h4 className="font-bold text-slate-900 mb-4">Priority Weights</h4>
            <div className="grid grid-cols-5 gap-3">
              {Object.entries(comparison.priorities).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="bg-primary-50 text-primary-700 rounded-lg p-3 mb-1">
                    <p className="text-xs text-slate-600 uppercase">{key}</p>
                    <p className="text-xl font-bold">{value}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Side-by-side Comparison */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Feature
                  </th>
                  {comparison.offers.map((offer) => (
                    <th
                      key={offer.id}
                      className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wide ${
                        offer.id === comparison.recommendation.topOfferId
                          ? 'bg-green-50 text-green-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {offer.companyName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-600 font-medium">Job Title</td>
                  {comparison.offers.map((offer) => (
                    <td
                      key={offer.id}
                      className={`px-4 py-3 text-sm text-slate-900 ${
                        offer.id === comparison.recommendation.topOfferId ? 'bg-green-50/50' : ''
                      }`}
                    >
                      {offer.jobTitle}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-600 font-medium">Location</td>
                  {comparison.offers.map((offer) => (
                    <td
                      key={offer.id}
                      className={`px-4 py-3 text-sm text-slate-900 ${
                        offer.id === comparison.recommendation.topOfferId ? 'bg-green-50/50' : ''
                      }`}
                    >
                      {offer.location}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-600 font-medium">Base Salary</td>
                  {comparison.offers.map((offer) => (
                    <td
                      key={offer.id}
                      className={`px-4 py-3 text-sm font-bold text-slate-900 ${
                        offer.id === comparison.recommendation.topOfferId ? 'bg-green-50/50' : ''
                      }`}
                    >
                      {formatCurrency(offer.baseSalary, offer.currency)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-600 font-medium">Bonus</td>
                  {comparison.offers.map((offer) => (
                    <td
                      key={offer.id}
                      className={`px-4 py-3 text-sm text-slate-900 ${
                        offer.id === comparison.recommendation.topOfferId ? 'bg-green-50/50' : ''
                      }`}
                    >
                      {offer.bonus ? formatCurrency(offer.bonus, offer.currency) : 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-600 font-medium">Equity</td>
                  {comparison.offers.map((offer) => (
                    <td
                      key={offer.id}
                      className={`px-4 py-3 text-sm text-slate-900 ${
                        offer.id === comparison.recommendation.topOfferId ? 'bg-green-50/50' : ''
                      }`}
                    >
                      {offer.equity
                        ? `${offer.equity.type}: ${formatCurrency(offer.equity.value, offer.currency)}`
                        : 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-600 font-medium">
                    Total Compensation
                  </td>
                  {comparison.offers.map((offer) => (
                    <td
                      key={offer.id}
                      className={`px-4 py-3 text-sm font-bold text-primary-600 ${
                        offer.id === comparison.recommendation.topOfferId ? 'bg-green-50/50' : ''
                      }`}
                    >
                      {formatCurrency(offer.baseSalary + (offer.bonus || 0), offer.currency)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-600 font-medium">Benefits</td>
                  {comparison.offers.map((offer) => (
                    <td
                      key={offer.id}
                      className={`px-4 py-3 text-sm text-slate-900 ${
                        offer.id === comparison.recommendation.topOfferId ? 'bg-green-50/50' : ''
                      }`}
                    >
                      {offer.benefits?.length ? offer.benefits.slice(0, 3).join(', ') : 'N/A'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {comparison.scores.map((score) => {
            const offer = comparison.offers.find((o) => o.id === score.offerId);
            if (!offer) return null;

            const isTop = score.offerId === comparison.recommendation.topOfferId;

            return (
              <div
                key={score.offerId}
                className={`bg-white rounded-xl border-2 p-6 ${
                  isTop ? 'border-green-500' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-lg text-slate-900">{offer.companyName}</h4>
                      {isTop && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{offer.jobTitle}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${getScoreColor(score.totalScore)}`}>
                    <p className="text-xs uppercase font-bold">Total Score</p>
                    <p className="text-2xl font-bold">{score.totalScore.toFixed(1)}</p>
                  </div>
                </div>

                {/* Reasoning */}
                <div className="mb-4">
                  <h5 className="text-sm font-bold text-slate-900 mb-2">Analysis</h5>
                  <p className="text-sm text-slate-600">{score.reasoning}</p>
                </div>

                {/* Pros and Cons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {score.pros.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h5 className="text-sm font-bold text-green-900 mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">thumb_up</span>
                        Pros
                      </h5>
                      <ul className="space-y-1">
                        {score.pros.map((pro, idx) => (
                          <li key={idx} className="text-sm text-green-800 flex items-start gap-1">
                            <span className="material-symbols-outlined text-[14px] mt-0.5">
                              check
                            </span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {score.cons.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <h5 className="text-sm font-bold text-red-900 mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">thumb_down</span>
                        Cons
                      </h5>
                      <ul className="space-y-1">
                        {score.cons.map((con, idx) => (
                          <li key={idx} className="text-sm text-red-800 flex items-start gap-1">
                            <span className="material-symbols-outlined text-[14px] mt-0.5">
                              close
                            </span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Export Options */}
      {onExport && (
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <span className="text-sm text-slate-600">Export comparison:</span>
          <button
            onClick={() => {
              onExport('json');
              showSuccessToast('Comparison exported as JSON');
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            JSON
          </button>
          <button
            onClick={() => {
              onExport('csv');
              showSuccessToast('Comparison exported as CSV');
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            CSV
          </button>
          <button
            onClick={() => {
              onExport('pdf');
              showSuccessToast('Comparison exported as PDF');
            }}
            className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors"
          >
            PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default OfferComparison;
