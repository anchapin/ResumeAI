import React, { useState, useEffect } from 'react';
import { PaymentMethod, listPaymentMethods, removePaymentMethod } from '../utils/api-client';

const PaymentMethods: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const data = await listPaymentMethods();
      setPaymentMethods(data);
    } catch (err) {
      setError('Failed to load payment methods. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      setRemovingId(id);
      await removePaymentMethod(id);
      await loadPaymentMethods();
    } catch (err) {
      setError('Failed to remove payment method. Please try again.');
      console.error(err);
    } finally {
      setRemovingId(null);
    }
  };

  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return 'credit_card';
      case 'mastercard':
        return 'credit_card';
      case 'amex':
        return 'credit_card';
      default:
        return 'credit_card';
    }
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

  return (
    <div className="flex-1 min-h-screen bg-[#f6f6f8] pl-72">
      <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
        <h2 className="text-slate-800 font-bold text-xl">Payment Methods</h2>
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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
                credit_card_off
              </span>
              <p className="text-slate-900 font-bold text-lg mb-2">No payment methods</p>
              <p className="text-slate-500 text-sm mb-6">
                Add a payment method to manage your subscription
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    Card
                  </th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    Expiry
                  </th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    Default
                  </th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentMethods.map((pm) => (
                  <tr key={pm.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-100 rounded-lg p-2">
                          <span className="material-symbols-outlined text-slate-600 text-[24px]">
                            {getCardIcon(pm.brand)}
                          </span>
                        </div>
                        <div>
                          <p className="text-slate-900 font-bold text-sm capitalize">{pm.brand}</p>
                          <p className="text-slate-500 text-sm">•••• •••• •••• {pm.last4}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-700 text-sm font-medium">
                      {pm.exp_month && pm.exp_year
                        ? `${String(pm.exp_month).padStart(2, '0')}/${pm.exp_year}`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-5">
                      {pm.is_default ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          Default
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => handleRemove(pm.id)}
                        disabled={removingId === pm.id || pm.is_default}
                        className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={pm.is_default ? 'Cannot remove default payment method' : 'Remove'}
                      >
                        {removingId === pm.id ? (
                          <span className="material-symbols-outlined animate-spin text-[20px]">
                            progress_activity
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-blue-600 text-[32px]">info</span>
            <div>
              <h3 className="text-slate-900 font-bold text-lg mb-2">Add new payment method</h3>
              <p className="text-slate-700 text-sm">
                To add a new payment method, visit the Stripe billing portal where you can securely
                manage your cards and billing information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethods;
