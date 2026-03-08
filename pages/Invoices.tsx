import React, { useState, useEffect } from 'react';
import { Invoice, listInvoices } from '../utils/api-client';

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await listInvoices();
      setInvoices(data);
    } catch (err) {
      setError('Failed to load invoices. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: string }> = {
      paid: { bg: 'bg-green-50', text: 'text-green-700', icon: 'check_circle' },
      open: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'pending' },
      draft: { bg: 'bg-slate-50', text: 'text-slate-700', icon: 'description' },
      void: { bg: 'bg-slate-50', text: 'text-slate-500', icon: 'block' },
      uncollectible: { bg: 'bg-red-50', text: 'text-red-700', icon: 'error' },
    };

    const style = styles[status] || styles.draft;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${style.bg} ${style.text}`}
      >
        <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const handleDownload = (invoice: Invoice) => {
    if (invoice.invoice_pdf_url) {
      window.open(invoice.invoice_pdf_url, '_blank');
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
        <h2 className="text-slate-800 font-bold text-xl">Invoices</h2>
      </header>

      <div className="p-8 max-w-[1200px] mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">error</span>
            <span className="text-sm font-semibold">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
              aria-label="Dismiss error"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {invoices.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
                receipt_long
              </span>
              <p className="text-slate-900 font-bold text-lg mb-2">No invoices yet</p>
              <p className="text-slate-500 text-sm">
                Your invoice history will appear here once you have a paid subscription
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-bold text-sm">
                          {formatDate(invoice.created_at)}
                        </span>
                        {invoice.paid_at && (
                          <span className="text-slate-500 text-xs">
                            Paid: {formatDate(invoice.paid_at)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-slate-700 text-sm font-medium">
                        {invoice.description || `Invoice #${invoice.id}`}
                      </span>
                    </td>
                    <td className="px-6 py-5">{getStatusBadge(invoice.status)}</td>
                    <td className="px-6 py-5">
                      <span className="text-slate-900 font-bold text-sm">
                        {formatAmount(invoice.amount_cents, invoice.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {invoice.invoice_pdf_url ? (
                        <button
                          onClick={() => handleDownload(invoice)}
                          className="text-slate-400 hover:text-primary-600 transition-colors"
                          title="Download PDF"
                          aria-label="Download PDF"
                        >
                          <span
                            className="material-symbols-outlined text-[20px]"
                            aria-hidden="true"
                          >
                            download
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-300">
                          <span
                            className="material-symbols-outlined text-[20px]"
                            aria-hidden="true"
                          >
                            download
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Invoices;
