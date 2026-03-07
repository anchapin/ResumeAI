import React, { useState, useEffect } from 'react';
import { JobOfferFormData } from '../types';
import { Button, Card } from '../components/ui';
import {
  researchSalary,
  createOffer,
  updateOffer,
  deleteOffer,
  listOffers,
  compareOffers,
  getDefaultPriorities,
} from '../utils/api-client';
import {
  SalaryResearchRequest,
  SalaryResearchResponse,
  JobOffer,
  ComparisonPriority,
  OfferComparison as OfferComparisonType,
} from '../types';
import { OfferCard } from '../components/OfferCard';
import { OfferComparison } from '../components/OfferComparison';
import { PrioritySliders } from '../components/PrioritySliders';
import { toast } from 'react-toastify';

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Salary Research Page
 *
 * Allows users to research salaries, manage job offers, and compare offers with weighted scoring
 */
export const SalaryResearch: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'research' | 'offers' | 'comparison'>('research');

  // Research state
  const [researchRequest, setResearchRequest] = useState<SalaryResearchRequest>({
    jobTitle: '',
    location: '',
    company: '',
    experienceLevel: 'mid',
  });
  const [researchResult, setResearchResult] = useState<SalaryResearchResponse | null>(null);
  const [isResearching, setIsResearching] = useState(false);

  // Offers state
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [selectedOfferIds, setSelectedOfferIds] = useState<number[]>([]);
  const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);
  const [isSavingOffer, setIsSavingOffer] = useState(false);

  // Comparison state
  const [priorities, setPriorities] = useState<ComparisonPriority>({
    salary: 30,
    growth: 20,
    workLifeBalance: 20,
    benefits: 15,
    culture: 15,
  });
  const [comparisonResult, setComparisonResult] = useState<OfferComparisonType | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Form modal state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerForm, setOfferForm] = useState<JobOfferFormData>({
    companyName: '',
    jobTitle: '',
    location: '',
    baseSalary: 0,
    currency: 'USD',
    bonus: 0,
    benefits: [],
    growthPotential: 5,
    workLifeBalance: 5,
    cultureScore: 5,
    status: 'pending',
    notes: '',
  });

  // Load offers and priorities on mount
  useEffect(() => {
    loadOffers();
    loadPriorities();
  }, []);

  const loadOffers = async () => {
    setIsLoadingOffers(true);
    try {
      const data = await listOffers();
      setOffers(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load offers');
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const loadPriorities = async () => {
    try {
      const data = await getDefaultPriorities();
      setPriorities(data);
    } catch (error) {
      console.error('Failed to load default priorities:', error);
    }
  };

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResearching(true);

    try {
      const result = await researchSalary(researchRequest);
      setResearchResult(result);
      toast.success('Salary research completed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to research salary');
    } finally {
      setIsResearching(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOffer(true);

    try {
      const newOffer = await createOffer(
        offerForm as Omit<JobOffer, 'id' | 'createdAt' | 'updatedAt'>,
      );
      setOffers([...offers, newOffer]);
      setShowOfferForm(false);
      setOfferForm({
        companyName: '',
        jobTitle: '',
        location: '',
        baseSalary: 0,
        currency: 'USD',
        bonus: 0,
        benefits: [],
        growthPotential: 5,
        workLifeBalance: 5,
        cultureScore: 5,
        status: 'pending',
        notes: '',
      });
      toast.success('Offer created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create offer');
    } finally {
      setIsSavingOffer(false);
    }
  };

  const handleUpdateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffer) return;

    setIsSavingOffer(true);

    try {
      const updatedOffer = await updateOffer(editingOffer.id, offerForm);
      setOffers(offers.map((o) => (o.id === editingOffer.id ? updatedOffer : o)));
      setShowOfferForm(false);
      setEditingOffer(null);
      setOfferForm({
        companyName: '',
        jobTitle: '',
        location: '',
        baseSalary: 0,
        currency: 'USD',
        bonus: 0,
        benefits: [],
        growthPotential: 5,
        workLifeBalance: 5,
        cultureScore: 5,
        status: 'pending',
        notes: '',
      });
      toast.success('Offer updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update offer');
    } finally {
      setIsSavingOffer(false);
    }
  };

  const handleDeleteOffer = async (offerId: number) => {
    try {
      await deleteOffer(offerId);
      setOffers(offers.filter((o) => o.id !== offerId));
      setSelectedOfferIds(selectedOfferIds.filter((id) => id !== offerId));
      toast.success('Offer deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete offer');
    }
  };

  const handleUpdateStatus = async (offerId: number, status: JobOffer['status']) => {
    try {
      const updatedOffer = await updateOffer(offerId, { status });
      setOffers(offers.map((o) => (o.id === offerId ? updatedOffer : o)));
      toast.success('Status updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleCompare = async () => {
    if (selectedOfferIds.length < 2) {
      toast.error('Please select at least 2 offers to compare');
      return;
    }

    setIsComparing(true);

    try {
      const result = await compareOffers(selectedOfferIds, priorities);
      setComparisonResult(result);
      setActiveTab('comparison');
      toast.success('Offers compared successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to compare offers');
    } finally {
      setIsComparing(false);
    }
  };

  const handleExportComparison = (format: 'pdf' | 'csv' | 'json') => {
    if (!comparisonResult) return;

    const data = JSON.stringify(comparisonResult, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offer-comparison.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <h2 className="text-slate-800 font-bold text-xl">Salary Research & Offer Comparison</h2>
      </header>

      <div className="p-8 max-w-[1400px] mx-auto space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 w-fit">
          <Button
            onClick={() => setActiveTab('research')}
            variant={activeTab === 'research' ? 'primary' : 'ghost'}
            className="text-sm"
          >
            Research
          </Button>
          <Button
            onClick={() => setActiveTab('offers')}
            variant={activeTab === 'offers' ? 'primary' : 'ghost'}
            className="text-sm"
          >
            Offers ({offers.length})
          </Button>
          <Button
            onClick={() => setActiveTab('comparison')}
            variant={activeTab === 'comparison' ? 'primary' : 'ghost'}
            className="text-sm"
          >
            Comparison
          </Button>
        </div>

        {/* Research Tab */}
        {activeTab === 'research' && (
          <div className="space-y-6">
            {/* Research Form */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Research Salary</h3>
              <form onSubmit={handleResearch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Job Title *</label>
                  <input
                    type="text"
                    value={researchRequest.jobTitle}
                    onChange={(e) =>
                      setResearchRequest({ ...researchRequest, jobTitle: e.target.value })
                    }
                    placeholder="e.g., Senior Software Engineer"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Location *</label>
                  <input
                    type="text"
                    value={researchRequest.location}
                    onChange={(e) =>
                      setResearchRequest({ ...researchRequest, location: e.target.value })
                    }
                    placeholder="e.g., San Francisco, CA"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Company (optional)</label>
                  <input
                    type="text"
                    value={researchRequest.company}
                    onChange={(e) =>
                      setResearchRequest({ ...researchRequest, company: e.target.value })
                    }
                    placeholder="e.g., Google"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Experience Level</label>
                  <select
                    value={researchRequest.experienceLevel}
                    onChange={(e) =>
                      setResearchRequest({
                        ...researchRequest,
                        experienceLevel: e.target.value as 'entry' | 'mid' | 'senior' | 'executive',
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none bg-white"
                  >
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <Button type="submit" isLoading={isResearching} className="w-full py-3">
                    Research Salary
                  </Button>
                </div>
              </form>
            </Card>

            {/* Research Results */}
            {researchResult && (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Research Results</h3>

                {/* Salary Range */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm mb-1">{researchResult.jobTitle}</p>
                      <p className="text-white/80 text-sm">{researchResult.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/80 text-sm">Median Salary</p>
                      <p className="text-3xl font-bold">
                        {formatCurrency(
                          researchResult.salaryRange.median,
                          researchResult.salaryRange.currency,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-sm">
                    <div>
                      <p className="text-white/80">Range:</p>
                      <p className="font-bold">
                        {formatCurrency(
                          researchResult.salaryRange.min,
                          researchResult.salaryRange.currency,
                        )}{' '}
                        -{' '}
                        {formatCurrency(
                          researchResult.salaryRange.max,
                          researchResult.salaryRange.currency,
                        )}
                      </p>
                    </div>
                    <div className="bg-white/10 px-3 py-1 rounded-full text-xs">
                      {researchResult.experienceLevel?.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Factors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Experience</p>
                    <p className="text-sm text-slate-900">{researchResult.factors.experience}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Education</p>
                    <p className="text-sm text-slate-900">{researchResult.factors.education}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Industry</p>
                    <p className="text-sm text-slate-900">{researchResult.factors.industry}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                      Location Impact
                    </p>
                    <p className="text-sm text-slate-900">{researchResult.factors.location}</p>
                  </div>
                </div>

                {/* Insights */}
                <div className="mb-6">
                  <h4 className="font-bold text-slate-900 mb-3">Key Insights</h4>
                  <div className="space-y-2">
                    {researchResult.insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          insight.importance === 'high'
                            ? 'bg-amber-50 border-amber-200'
                            : insight.importance === 'medium'
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <p className="font-bold text-sm text-slate-900">{insight.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{insight.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {researchResult.recommendations.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined">lightbulb</span>
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {researchResult.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                          <span className="material-symbols-outlined text-[16px] mt-0.5">
                            check
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Offers Tab */}
        {activeTab === 'offers' && (
          <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">{offers.length} offers tracked</p>
              <Button
                onClick={() => {
                  setShowOfferForm(true);
                  setEditingOffer(null);
                }}
                leftIcon={<span className="material-symbols-outlined text-[18px]">add</span>}
              >
                Add Offer
              </Button>
            </div>

            {/* Comparison Bar */}
            {offers.length >= 2 && (
              <Card className="p-4 flex items-center justify-between border border-slate-200">
                <div>
                  <p className="font-bold text-slate-900">Compare Offers</p>
                  <p className="text-sm text-slate-500">
                    {selectedOfferIds.length} of {offers.length} selected
                  </p>
                </div>
                <Button
                  onClick={handleCompare}
                  disabled={selectedOfferIds.length < 2}
                  isLoading={isComparing}
                >
                  Compare
                </Button>
              </Card>
            )}

            {/* Offers Grid */}
            {isLoadingOffers ? (
              <div className="flex items-center justify-center py-12">
                <span className="material-symbols-outlined animate-spin text-primary-600 text-4xl">
                  progress_activity
                </span>
              </div>
            ) : offers.length === 0 ? (
              <Card className="text-center py-12">
                <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">
                  work_off
                </span>
                <p className="text-slate-500 font-medium mb-2">No offers yet</p>
                <p className="text-sm text-slate-400 mb-4">
                  Add your first job offer to start tracking
                </p>
                <Button onClick={() => setShowOfferForm(true)}>Add First Offer</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    isSelected={selectedOfferIds.includes(offer.id)}
                    onSelect={(id) => {
                      setSelectedOfferIds((prev) =>
                        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
                      );
                    }}
                    onEdit={(id) => {
                      setEditingOffer(offers.find((o) => o.id === id)!);
                      setOfferForm(offers.find((o) => o.id === id)!);
                      setShowOfferForm(true);
                    }}
                    onDelete={handleDeleteOffer}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comparison Tab */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            {comparisonResult ? (
              <>
                <OfferComparison comparison={comparisonResult} onExport={handleExportComparison} />

                {/* Priority Adjustment */}
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Adjust Priorities</h3>
                  <PrioritySliders
                    priorities={priorities}
                    onChange={setPriorities}
                    disabled={isComparing}
                  />
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleCompare} isLoading={isComparing}>
                      Re-compare
                    </Button>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="text-center py-12">
                <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">
                  compare_arrows
                </span>
                <p className="text-slate-500 font-medium mb-2">No comparison yet</p>
                <p className="text-sm text-slate-400 mb-4">
                  Select at least 2 offers to compare them
                </p>
                <Button onClick={() => setActiveTab('offers')}>Go to Offers</Button>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Offer Form Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0 border-0 shadow-xl"
            isHoverable={false}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingOffer ? 'Edit Offer' : 'Add New Offer'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowOfferForm(false);
                  setEditingOffer(null);
                }}
                rightIcon={<span className="material-symbols-outlined">close</span>}
              />
            </div>

            <form
              onSubmit={editingOffer ? handleUpdateOffer : handleCreateOffer}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Company *</label>
                  <input
                    type="text"
                    value={offerForm.companyName || ''}
                    onChange={(e) => setOfferForm({ ...offerForm, companyName: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Job Title *</label>
                  <input
                    type="text"
                    value={offerForm.jobTitle || ''}
                    onChange={(e) => setOfferForm({ ...offerForm, jobTitle: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Location *</label>
                  <input
                    type="text"
                    value={offerForm.location || ''}
                    onChange={(e) => setOfferForm({ ...offerForm, location: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Currency</label>
                  <select
                    value={offerForm.currency || 'USD'}
                    onChange={(e) => setOfferForm({ ...offerForm, currency: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none bg-white"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Base Salary *</label>
                  <input
                    type="number"
                    value={offerForm.baseSalary || 0}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, baseSalary: Number(e.target.value) })
                    }
                    required
                    min="0"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Bonus</label>
                  <input
                    type="number"
                    value={offerForm.bonus || 0}
                    onChange={(e) => setOfferForm({ ...offerForm, bonus: Number(e.target.value) })}
                    min="0"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Growth (1-10)</label>
                  <input
                    type="number"
                    value={offerForm.growthPotential || 5}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, growthPotential: Number(e.target.value) })
                    }
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Work-Life (1-10)</label>
                  <input
                    type="number"
                    value={offerForm.workLifeBalance || 5}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, workLifeBalance: Number(e.target.value) })
                    }
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Culture (1-10)</label>
                  <input
                    type="number"
                    value={offerForm.cultureScore || 5}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, cultureScore: Number(e.target.value) })
                    }
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Benefits (comma-separated)
                </label>
                <input
                  type="text"
                  value={offerForm.benefits?.join(', ') || ''}
                  onChange={(e) =>
                    setOfferForm({
                      ...offerForm,
                      benefits: e.target.value
                        .split(',')
                        .map((b) => b.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="e.g., Health insurance, 401k, Remote work"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Status</label>
                <select
                  value={offerForm.status || 'pending'}
                  onChange={(e) =>
                    setOfferForm({ ...offerForm, status: e.target.value as JobOffer['status'] })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Notes</label>
                <textarea
                  value={offerForm.notes || ''}
                  onChange={(e) => setOfferForm({ ...offerForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOfferForm(false);
                    setEditingOffer(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSavingOffer} className="flex-1">
                  {editingOffer ? 'Update Offer' : 'Add Offer'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SalaryResearch;
