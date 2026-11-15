import React from 'react';
import { LegalLayout, MerchantPlaceholderNotice } from './LegalLayout';
import { BUSINESS_DETAILS } from '../../data/legalData';
import { Cookie, ShieldCheck, Database, Settings } from 'lucide-react';

interface LegalViewProps {
  onNavigate: (route: string) => void;
}

export const CookiePolicyView: React.FC<LegalViewProps> = ({ onNavigate }) => {
  const toc = [
    { id: 'what-are-cookies', title: '1. What Are Cookies & Local Storage?' },
    { id: 'technologies-used', title: '2. Technologies Actually Used on TeqqnoWorld' },
    { id: 'essential-keys', title: '3. Essential Storage Keys & Function' },
    { id: 'third-party-status', title: '4. Third-Party Analytics & Advertising' },
    { id: 'browser-management', title: '5. How to Manage or Clear Browser Data' },
    { id: 'privacy-relation', title: '6. Relation to Our Privacy Policy' },
    { id: 'cookie-contact', title: '7. Inquiries & Contact Details' },
  ];

  return (
    <LegalLayout
      currentRoute="/cookie-policy"
      title="Cookie Policy"
      description="Truthful and transparent disclosure of browser local storage and essential session technologies used to operate the TeqqnoWorld website."
      lastUpdated="October 25, 2026"
      tableOfContents={toc}
      onNavigate={onNavigate}
    >
      <div className="space-y-8 text-slate-700">
        
        {/* Merchant Review Box */}
        <MerchantPlaceholderNotice
          title="Merchant Action Checklist — Cookie & Analytics Verification"
          items={[
            `Verified: No third-party behavioral ad trackers or invasive tracking pixels are currently loaded in this codebase.`,
            `If you install Google Analytics (GA4) or Meta Pixel in the future, update Section 4 to reflect your active tags.`,
          ]}
        />

        {/* 1. What Are Cookies */}
        <section id="what-are-cookies">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            1. What Are Cookies & Local Storage?
          </h2>
          <p className="mb-3">
            Cookies and HTML5 Local Storage are small data files or storage keys placed on your computer, tablet, or mobile browser by websites you visit. They are widely used to make websites function properly, ensure navigation persistence, and remember your cart selections across page visits without requiring server round-trips.
          </p>
        </section>

        {/* 2. Technologies Used */}
        <section id="technologies-used">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            2. Technologies Actually Used on TeqqnoWorld
          </h2>
          <p className="mb-3">
            TeqqnoWorld prioritizes customer data privacy and website performance. We utilize standard, secure <strong>HTML5 Local Storage</strong> exclusively for essential functional purposes.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 mb-3">
            <p className="font-semibold text-slate-900">Essential-Only Storage Policy:</p>
            <p>
              We do not use tracking cookies to follow your activity across external third-party websites, nor do we sell your browsing behavior to advertising data brokers.
            </p>
          </div>
        </section>

        {/* 3. Essential Keys */}
        <section id="essential-keys">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            3. Essential Storage Keys & Operational Functions
          </h2>
          <p className="mb-3">
            The following storage keys are stored locally on your device to enable smooth e-commerce operations:
          </p>

          <div className="space-y-3 mb-4">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <code className="font-mono font-bold text-[#FF7A00] text-xs">teqqno_cart</code>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">Essential</span>
              </div>
              <p className="text-slate-600">
                Maintains your active shopping cart items, chosen apparel sizes, quantities, and custom logo placement configurations so your order is preserved when you refresh or browse other categories.
              </p>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <code className="font-mono font-bold text-[#FF7A00] text-xs">teqqno_user</code>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">Essential</span>
              </div>
              <p className="text-slate-600">
                Preserves authenticated corporate login session details, saved business shipping addresses, and your corporate GSTIN to allow seamless one-click checkout.
              </p>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <code className="font-mono font-bold text-[#FF7A00] text-xs">teqqno_orders</code>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">Essential</span>
              </div>
              <p className="text-slate-600">
                Caches recent order milestones, digital proof approvals, and tracking numbers for rapid reference in your corporate dashboard.
              </p>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <code className="font-mono font-bold text-[#FF7A00] text-xs">teqqno_inquiries</code>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">Functional</span>
              </div>
              <p className="text-slate-600">
                Records support inquiries submitted via the Contact Us form for immediate user session recall and WhatsApp coordination.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Third-Party Status */}
        <section id="third-party-status">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            4. Third-Party Analytics & Advertising Trackers
          </h2>
          <p className="mb-3">
            TeqqnoWorld operates cleanly without third-party advertising retargeting networks. We do not inject behavioral surveillance trackers or ad cookies.
          </p>
          <p className="text-xs text-slate-500">
            When completing online payments, payment gateway providers (such as Razorpay) may utilize essential security cookies to prevent card fraud and authenticate 3D Secure / OTP transactions within their protected frame.
          </p>
        </section>

        {/* 5. Browser Management */}
        <section id="browser-management">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            5. How to Manage or Clear Browser Data
          </h2>
          <p className="mb-3">
            You can control, review, or clear local storage data at any time through your web browser preferences:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 mb-3">
            <li><strong>Google Chrome:</strong> Settings &rarr; Privacy and security &rarr; Clear browsing data &rarr; Cookies and other site data.</li>
            <li><strong>Apple Safari:</strong> Preferences &rarr; Privacy &rarr; Manage Website Data &rarr; Remove All.</li>
            <li><strong>Mozilla Firefox:</strong> Settings &rarr; Privacy & Security &rarr; Cookies and Site Data &rarr; Clear Data.</li>
            <li><strong>Microsoft Edge:</strong> Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies and site data.</li>
          </ul>
          <p className="text-xs text-slate-500">
            *Please note that clearing local storage will empty your current shopping cart items and require you to sign in again on your next visit.
          </p>
        </section>

        {/* 6. Privacy Relation */}
        <section id="privacy-relation">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            6. Relation to Our Privacy Policy
          </h2>
          <p>
            This Cookie Policy should be read in conjunction with our{' '}
            <button onClick={() => onNavigate('/privacy-policy')} className="text-[#FF7A00] underline font-medium cursor-pointer">
              Privacy Policy
            </button>, which provides comprehensive information on how we collect, safeguard, and process personal and corporate data in compliance with Indian privacy legislation.
          </p>
        </section>

        {/* 7. Contact */}
        <section id="cookie-contact">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            7. Inquiries Regarding Cookie Technologies
          </h2>
          <p className="mb-3">
            If you have questions about our use of essential browser technologies, write to our technical privacy team:
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
            <p><strong>Technical Privacy Desk:</strong> <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="text-[#FF7A00] underline">{BUSINESS_DETAILS.supportEmail}</a></p>
            <p><strong>Website:</strong> {BUSINESS_DETAILS.websiteUrl}</p>
          </div>
        </section>

      </div>
    </LegalLayout>
  );
};
