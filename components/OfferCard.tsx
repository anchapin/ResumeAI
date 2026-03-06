import React from 'react';
import { JobOffer } from '../types';
import { Card } from './ui';

interface OfferCardProps {
  offer: JobOffer;
  isSelected?: boolean;
  onSelect?: (offerId: number) => void;
  onEdit?: (offerId: number) => void;
  onDelete?: (offerId: number) => void;
  onUpdateStatus?: (offerId: number, status: JobOffer['status']) => void;
  disabled?: boolean;
}

const STATUS_COLORS: Record<JobOffer['status'], { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  negotiating: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  accepted: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Offer Card Component
 *
 * Displays a job offer with key details and actions
 */
export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onUpdateStatus,
  disabled = false,
}) => {
  const statusColors = STATUS_COLORS[offer.status];
  const totalCompensation = offer.baseSalary + (offer.bonus || 0);

  return (
    <Card
      isSelected={isSelected}
      padding="lg"
      className={`${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
      onClick={() => onSelect && !disabled && onSelect(offer.id)}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-4 right-4">
          <span className="material-symbols-outlined text-2xl">
            {isSelected ? 'check_box' : 'check_box_outline_blank'}
          </span>
        </div>
      )}

      {/* Company and Job Title */}
      <div className="mb-4">
        <h3 className="font-bold text-slate-900 text-lg">{offer.companyName}</h3>
        <p className="text-slate-600">{offer.jobTitle}</p>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">location_on</span>
          {offer.location}
        </p>
      </div>

      {/* Compensation */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-600">payments</span>
            <span className="text-sm text-slate-600">Base Salary</span>
          </div>
          <span className="font-bold text-slate-900">
            {formatCurrency(offer.baseSalary, offer.currency)}
          </span>
        </div>

        {offer.bonus && (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600">card_giftcard</span>
              <span className="text-sm text-slate-600">Bonus</span>
            </div>
            <span className="font-bold text-slate-900">
              {formatCurrency(offer.bonus, offer.currency)}
            </span>
          </div>
        )}

        {offer.equity && (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600">trending_up</span>
              <div className="text-sm">
                <p className="text-slate-600">Equity ({offer.equity.type})</p>
                <p className="text-xs text-slate-500">{offer.equity.vesting}</p>
              </div>
            </div>
            <span className="font-bold text-slate-900">
              {formatCurrency(offer.equity.value, offer.currency)}
            </span>
          </div>
        )}

        {offer.bonus || offer.equity ? (
          <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border border-primary-200">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-600">
                account_balance_wallet
              </span>
              <span className="text-sm text-primary-900 font-medium">Total Compensation</span>
            </div>
            <span className="font-bold text-primary-900 text-lg">
              {formatCurrency(totalCompensation, offer.currency)}
            </span>
          </div>
        ) : null}
      </div>

      {/* Benefits */}
      {offer.benefits && offer.benefits.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Benefits</p>
          <div className="flex flex-wrap gap-1">
            {offer.benefits.slice(0, 5).map((benefit, idx) => (
              <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs">
                {benefit}
              </span>
            ))}
            {offer.benefits.length > 5 && (
              <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-md text-xs">
                +{offer.benefits.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Scores */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {offer.growthPotential !== undefined && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">
              trending_up
            </span>
            <div className="flex-1">
              <p className="text-xs text-slate-500">Growth</p>
              <p className="text-sm font-bold text-slate-900">{offer.growthPotential}/10</p>
            </div>
          </div>
        )}
        {offer.workLifeBalance !== undefined && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">balance</span>
            <div className="flex-1">
              <p className="text-xs text-slate-500">Work-Life</p>
              <p className="text-sm font-bold text-slate-900">{offer.workLifeBalance}/10</p>
            </div>
          </div>
        )}
        {offer.cultureScore !== undefined && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">groups</span>
            <div className="flex-1">
              <p className="text-xs text-slate-500">Culture</p>
              <p className="text-sm font-bold text-slate-900">{offer.cultureScore}/10</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium mb-4 ${statusColors.bg} ${statusColors.text}`}
      >
        <span className="material-symbols-outlined text-[14px]">circle</span>
        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
      </div>

      {/* Notes */}
      {offer.notes && (
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-slate-600 line-clamp-2">{offer.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
        {onUpdateStatus && (
          <select
            value={offer.status}
            onChange={(e) => onUpdateStatus(offer.id, e.target.value as JobOffer['status'])}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          >
            <option value="pending">Pending</option>
            <option value="negotiating">Negotiating</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        )}

        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(offer.id);
            }}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit offer"
            aria-label="Edit offer"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span>
          </button>
        )}

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this offer?')) {
                onDelete(offer.id);
              }
            }}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete offer"
            aria-label="Delete offer"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span>
          </button>
        )}
      </div>
    </Card>
  );
};

export default OfferCard;
