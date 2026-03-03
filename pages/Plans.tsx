import React, { useState, useEffect } from 'react';
import { Button, Card } from '../components/ui';
import {
  BillingPlan,
  listBillingPlans,
  createCheckoutSession,
  CheckoutSessionRequest,
} from '../utils/api-client';

const Plans: React.FC = () => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await listBillingPlans();
      setPlans(data);
    } catch (err) {
      setError('Failed to load plans. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: BillingPlan) => {
    try {
      setProcessingPlan(plan.name);
      const request: CheckoutSessionRequest = {
        plan_name: plan.name,
        success_url: `${window.location.origin}/billing?checkout=success`,
        cancel_url: `${window.location.origin}/billing?checkout=cancelled`,
      };
      const session = await createCheckoutSession(request);
      window.location.href = session.url;
    } catch (err) {
      setError('Failed to start checkout. Please try again.');
      console.error(err);
    } finally {
      setProcessingPlan(null);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
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

  if (error) {
    return (
      <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">{error}</p>
          <Button onClick={loadPlans} variant="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      <header className="h-16 flex items-center px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <h2 className="text-slate-800 font-bold text-xl">Choose Your Plan</h2>
      </header>

      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-slate-900 text-4xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Choose the perfect plan for your job search needs. All plans include core features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              isSelected={plan.is_popular}
              isHoverable={false}
              padding="none"
              className="overflow-hidden relative border-slate-200"
            >
              {plan.is_popular && (
                <div className="bg-primary-600 text-white text-xs font-bold uppercase tracking-wider py-2 text-center">
                  Most Popular
                </div>
              )}
              <div className="p-8">
                <h3 className="text-slate-900 text-xl font-bold mb-2">{plan.display_name}</h3>
                {plan.description && (
                  <p className="text-slate-600 text-sm mb-6">{plan.description}</p>
                )}
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-slate-900 text-5xl font-bold tracking-tight">
                      {formatPrice(plan.price_cents, plan.currency)}
                    </span>
                    <span className="text-slate-600 ml-2 text-lg font-medium">
                      /{plan.interval}
                    </span>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">
                      check_circle
                    </span>
                    <span className="text-slate-700 text-sm">
                      {plan.max_resumes_per_month === -1 ? 'Unlimited' : plan.max_resumes_per_month}{' '}
                      resumes/month
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">
                      check_circle
                    </span>
                    <span className="text-slate-700 text-sm">
                      {plan.max_ai_tailorings_per_month === -1
                        ? 'Unlimited'
                        : plan.max_ai_tailorings_per_month}{' '}
                      AI tailoring/month
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">
                      check_circle
                    </span>
                    <span className="text-slate-700 text-sm">
                      {plan.max_templates} resume templates
                    </span>
                  </li>
                  {plan.include_priority_support && (
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">
                        check_circle
                      </span>
                      <span className="text-slate-700 text-sm">Priority support</span>
                    </li>
                  )}
                  {plan.include_custom_domains && (
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">
                        check_circle
                      </span>
                      <span className="text-slate-700 text-sm">Custom domains</span>
                    </li>
                  )}
                  {plan.features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">
                        check_circle
                      </span>
                      <span className="text-slate-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  isLoading={processingPlan === plan.name}
                  variant={plan.is_popular ? 'primary' : 'secondary'}
                  className="w-full py-3 px-4 rounded-xl font-bold"
                >
                  Get Started
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Plans;
