import React from 'react';
import { SimpleResumeData } from '../../types';

// LinkedIn brand colors
const LINKEDIN_BRAND_PRIMARY = '#0077b5';
const LINKEDIN_BRAND_SECONDARY = '#00a0dc';

interface ContactInfoSectionProps {
  resumeData: SimpleResumeData;
  onUpdate: (field: keyof SimpleResumeData, value: string) => void;
  onShowLinkedInImport: () => void;
  onShowCommentPanel: () => void;
  unresolvedCommentCount: number;
}

export const ContactInfoSection = React.memo<ContactInfoSectionProps>(
  ({ resumeData, onUpdate, onShowLinkedInImport, onShowCommentPanel, unresolvedCommentCount }) => {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Contact Information</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onShowCommentPanel}
              className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors relative"
              title="Add comment to this section"
            >
              <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
              <span>Add Comment</span>
              {unresolvedCommentCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {unresolvedCommentCount}
                </span>
              )}
            </button>
            <span className="text-sm font-medium text-slate-500">Basic profile details</span>
          </div>
        </div>

        <div
          style={{
            background: `linear-gradient(to right, ${LINKEDIN_BRAND_PRIMARY}, ${LINKEDIN_BRAND_SECONDARY})`,
          }}
          className="rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 size-12 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white">account_circle</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Import from LinkedIn</h3>
                <p className="text-sm text-white/80">
                  Quickly populate your profile with LinkedIn data
                </p>
              </div>
            </div>
            <button
              onClick={onShowLinkedInImport}
              style={{ color: LINKEDIN_BRAND_PRIMARY }}
              className="px-4 py-2 bg-white font-semibold rounded-lg hover:bg-white/90 transition-colors shadow-md"
            >
              Import Now
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Full Name</label>
              <input
                type="text"
                value={resumeData.name}
                onChange={(e) => onUpdate('name', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email</label>
              <input
                type="email"
                value={resumeData.email}
                onChange={(e) => onUpdate('email', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Phone</label>
              <input
                type="tel"
                value={resumeData.phone}
                onChange={(e) => onUpdate('phone', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Location</label>
              <input
                type="text"
                value={resumeData.location}
                onChange={(e) => onUpdate('location', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Job Title / Role</label>
              <input
                type="text"
                value={resumeData.role}
                onChange={(e) => onUpdate('role', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
