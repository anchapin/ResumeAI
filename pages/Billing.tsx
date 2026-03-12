/* eslint-disable complexity */
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Subscription,
  BillingUsage,
  getSubscription,
  getBillingUsage,
  getBillingStatus,
  cancelSubscription,
  resumeSubscription,
  createPortalSession,
} from '../utils/api-client';

const Billing: React.FC = () => {
  const location = useLocation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('checkout') === 'success') {
      loadData();
    }
  }, [location.search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subData, usageData, statusData] = await Promise.all([
        getSubscription(),
        getBillingUsage(),
        getBillingStatus(),
      ]);
      setSubscription(subData);
      setUsage(usageData);
      setBillingEnabled(statusData.enabled);
    } catch (err) {
      setError('Failed to load billing information. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }
    try {
      setActionLoading('cancel');
      await cancelSubscription(true);
      await loadData();
    } catch (err) {
      setError('Failed to cancel subscription. Please try again.');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    try {
      setActionLoading('resume');
      await resumeSubscription();
      await loadData();
    } catch (err) {
      setError('Failed to resume subscription. Please try again.');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleManagePortal = async () => {
    try {
      setActionLoading('portal');
      const session = await createPortalSession({
        return_url: `${window.location.origin}/billing`,
      });
      window.location.href = session.url;
    } catch (err) {
      setError('Failed to open billing portal. Please try again.');
      console.error(err);
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: string }> = {
      active: { bg: 'bg-green-50', text: 'text-green-700', icon: 'check_circle' },
      trialing: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'rocket_launch' },
      past_due: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'warning' },
      canceled: { bg: 'bg-slate-50', text: 'text-slate-700', icon: 'cancel' },
      incomplete: { bg: 'bg-red-50', text: 'text-red-700', icon: 'error' },
      inactive: { bg: 'bg-slate-50', text: 'text-slate-500', icon: 'block' },
    };

    const style = styles[status] || styles.inactive;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${style.bg} ${style.text}`}
      >
        <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getUsageProgress = (usage: BillingUsage, key: 'resume_generated' | 'ai_tailored') => {
    const stat = usage[key];
    if (!stat || stat.limit === undefined || stat.limit === -1)
      return { percentage: 0, isUnlimited: true };
    const percentage = Math.min((stat.used / stat.limit) * 100, 100);
    return { percentage, isUnlimited: false };
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary-600 text-4xl">
          progress_activity
        </span>
      </div>
    );
  }

  if (!billingEnabled) {
    return (
      <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
        <header className="h-16 flex items-center px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
          <h2 className="text-slate-800 font-bold text-xl">Billing</h2>
        </header>
        <div className="p-8 max-w-[1200px] mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <span className="material-symbols-outlined text-6xl text-amber-600 mb-4">
              construction
            </span>
            <h3 className="text-slate-900 text-2xl font-bold mb-4">Billing Coming Soon</h3>
            <p className="text-slate-700 max-w-lg mx-auto mb-6">
              Our billing system is currently being developed. You can continue using the free tier
              with basic features. We'll notify you when subscription plans become available.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined">dashboard</span>
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <h2 className="text-slate-800 font-bold text-xl">Billing</h2>
        <div className="flex items-center gap-4">
          <Link
            to="/billing/plans"
            className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors"
          >
            Plans
          </Link>
          <Link
            to="/billing/payment-methods"
            className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors"
          >
            Payment Methods
          </Link>
          <Link
            to="/billing/invoices"
            className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors"
          >
            Invoices
          </Link>
        </div>
      </header>

      <div className="p-8 max-w-[1200px] mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">error</span>
            <span className="text-sm font-semibold">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 text-sm font-semibold mb-1">Current Plan</p>
                {subscription?.plan ? (
                  <>
                    <h3 className="text-slate-900 text-xl font-bold">
                      {subscription.plan.display_name}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {formatPrice(subscription.plan.price_cents, subscription.plan.currency)} /{' '}
                      {subscription.plan.interval}
                    </p>
                  </>
                ) : (
                  <h3 className="text-slate-900 text-xl font-bold">Free Tier</h3>
                )}
              </div>
              {subscription?.status && getStatusBadge(subscription.status)}
            </div>

            {subscription && subscription.current_period_end && (
              <div className="text-sm text-slate-600">
                {subscription.status === 'active' ? (
                  <p>Renews on {formatDate(subscription.current_period_end)}</p>
                ) : subscription.cancel_at_period_end ? (
                  <p>Expires on {formatDate(subscription.current_period_end)}</p>
                ) : null}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100">
              {subscription?.status === 'active' && !subscription.cancel_at_period_end && (
                <button
                  onClick={handleCancel}
                  disabled={actionLoading === 'cancel'}
                  className="w-full py-2 px-4 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel Subscription'}
                </button>
              )}
              {subscription?.cancel_at_period_end && (
                <button
                  onClick={handleResume}
                  disabled={actionLoading === 'resume'}
                  className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'resume' ? 'Resuming...' : 'Resume Subscription'}
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-semibold mb-4">This Period</p>
            {usage && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">Resumes Generated</span>
                    <span className="text-sm text-slate-600">
                      {usage.resume_generated.used}
                      {usage.resume_generated.limit !== undefined &&
                        usage.resume_generated.limit !== -1 &&
                        ` / ${usage.resume_generated.limit}`}
                    </span>
                  </div>
                  {(() => {
                    const { percentage, isUnlimited } = getUsageProgress(usage, 'resume_generated');
                    return !isUnlimited ? (
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-600 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    ) : (
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" />
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">AI Tailoring</span>
                    <span className="text-sm text-slate-600">
                      {usage.ai_tailored.used}
                      {usage.ai_tailored.limit !== undefined &&
                        usage.ai_tailored.limit !== -1 &&
                        ` / ${usage.ai_tailored.limit}`}
                    </span>
                  </div>
                  {(() => {
                    const { percentage, isUnlimited } = getUsageProgress(usage, 'ai_tailored');
                    return !isUnlimited ? (
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-600 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    ) : (
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" />
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-semibold mb-4">Quick Actions</p>
            <div className="space-y-2">
              <button
                onClick={handleManagePortal}
                disabled={actionLoading === 'portal'}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium text-left hover:bg-slate-50 transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-slate-600 text-[20px]">
                  settings
                </span>
                <span className="text-slate-700">
                  {actionLoading === 'portal' ? 'Opening...' : 'Manage in Portal'}
                </span>
              </button>
              <Link
                to="/billing/plans"
                className="w-full py-2 px-4 rounded-lg text-sm font-medium text-left hover:bg-slate-50 transition-colors flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-slate-600 text-[20px]">
                  arrow_upward
                </span>
                <span className="text-slate-700">Upgrade Plan</span>
              </Link>
              <Link
                to="/billing/invoices"
                className="w-full py-2 px-4 rounded-lg text-sm font-medium text-left hover:bg-slate-50 transition-colors flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-slate-600 text-[20px]">
                  receipt_long
                </span>
                <span className="text-slate-700">View Invoices</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
