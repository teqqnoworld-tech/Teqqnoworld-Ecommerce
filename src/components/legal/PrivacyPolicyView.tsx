import React from 'react';
import { LegalLayout, MerchantPlaceholderNotice } from './LegalLayout';
import { BUSINESS_DETAILS } from '../../data/legalData';

interface LegalViewProps {
  onNavigate: (route: string) => void;
}

export const PrivacyPolicyView: React.FC<LegalViewProps> = ({ onNavigate }) => {
  const toc = [
    { id: 'introduction', title: '1. Introduction & Scope' },
    { id: 'information-collected', title: '2. Information We Collect' },
    { id: 'custom-artwork-assets', title: '3. Custom Artwork & Design Files' },
    { id: 'how-we-use-info', title: '4. How We Use Information' },
    { id: 'payment-processing', title: '5. Payment Processing & Gateways' },
    { id: 'cookies-technologies', title: '6. Cookies & Local Storage' },
    { id: 'data-sharing', title: '7. Data Sharing & Third Parties' },
    { id: 'data-security', title: '8. Data Retention & Security' },
    { id: 'user-rights', title: '9. Your Privacy Rights & Choices' },
    { id: 'marketing-optout', title: '10. Communications & Opt-Out' },
    { id: 'children-privacy', title: '11. Minors & Children’s Privacy' },
    { id: 'grievance-contact', title: '12. Grievance Officer & Contact' },
  ];

  return (
    <LegalLayout
      currentRoute="/privacy-policy"
      title="Privacy Policy"
      description="Learn how TeqqnoWorld collects, processes, and protects your personal, corporate, and design asset data in compliance with Indian privacy laws."
      lastUpdated="October 25, 2026"
      tableOfContents={toc}
      onNavigate={onNavigate}
    >
      <div className="space-y-8 text-slate-700">
        
        {/* Merchant Review Box */}
        <MerchantPlaceholderNotice
          title="Merchant Action Checklist — Privacy Policy Verification"
          items={[
            `Confirm legal entity name: ${BUSINESS_DETAILS.legalEntityPlaceholder}`,
            `Confirm registered office address: ${BUSINESS_DETAILS.registeredOfficePlaceholder}`,
            `Designate official Grievance Officer name and direct email: ${BUSINESS_DETAILS.grievanceOfficerPlaceholder}`,
          ]}
        />

        {/* 1. Introduction */}
        <section id="introduction">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            1. Introduction & Scope
          </h2>
          <p className="mb-3">
            Welcome to <strong>TeqqnoWorld</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), accessible at{' '}
            <a href={BUSINESS_DETAILS.websiteUrl} className="text-[#FF7A00] underline font-medium" target="_blank" rel="noreferrer">
              {BUSINESS_DETAILS.websiteUrl}
            </a>. 
            TeqqnoWorld specializes in customized corporate merchandise, apparel, promotional gifting, stationery, and enterprise print production.
          </p>
          <p>
            This Privacy Policy sets out how we collect, store, handle, and transfer personal data of individuals and corporate procurement buyers who use our website, place custom printing orders, or interact with our design and proof services, in accordance with the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 (&ldquo;SPDI Rules&rdquo;), and the Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;).
          </p>
        </section>

        {/* 2. Information Collected */}
        <section id="information-collected">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            2. Information We Collect
          </h2>
          <p className="mb-3">
            We collect information that is strictly necessary to provide customized printing services, fulfill purchase orders, and verify billing details. This includes:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-3">
            <li>
              <strong>Contact & Account Data:</strong> Full name, professional designation, corporate organization/employer name, verified mobile number (for OTP authentication and delivery coordination), and business email address.
            </li>
            <li>
              <strong>Delivery & Logistics Data:</strong> Consignee name, company premises or office address, city, state, pin code, and delivery landmark.
            </li>
            <li>
              <strong>Statutory Billing & GSTIN Data:</strong> Corporate name, billing address, state tax code, and 15-digit Goods and Services Tax Identification Number (GSTIN) submitted for B2B Tax Invoicing and Input Tax Credit (ITC) reconciliation.
            </li>
            <li>
              <strong>Transaction & Order Records:</strong> Products selected, sizes, color variants, customization placements, quantities, timestamps, transaction reference IDs, and proof approval logs.
            </li>
          </ul>
        </section>

        {/* 3. Custom Artwork */}
        <section id="custom-artwork-assets">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            3. Custom Artwork, Logos & Design Files
          </h2>
          <p className="mb-3">
            When ordering custom merchandise, customers upload vector logos, graphic artworks, slogans, employee rosters (for personalized ID cards or name badges), and Pantone color specifications (.AI, .EPS, .SVG, .PDF, .PNG formats).
          </p>
          <p className="mb-3">
            <strong>Ownership & Treatment:</strong> You retain full copyright and ownership of all intellectual property, logos, and trademarks you upload. TeqqnoWorld accesses and processes your design files solely for the purpose of:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 mb-3">
            <li>Rendering digital 2D/3D proofs for your visual confirmation and scale review.</li>
            <li>Direct computer-to-plate, screen preparation, DTF film processing, embroidery digitizing, and industrial laser engraving.</li>
            <li>Archiving your approved vector assets in your corporate dashboard to facilitate rapid reorders upon request.</li>
          </ol>
          <p className="text-xs text-slate-500 italic">
            We do not sell, license, or publish your proprietary corporate artwork to third parties for commercial advertising without your explicit written authorization.
          </p>
        </section>

        {/* 4. How We Use Information */}
        <section id="how-we-use-info">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            4. How We Use Your Information
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To process your merchandise orders, prepare digital proofs, and conduct pre-press manufacturing.</li>
            <li>To coordinate doorstep delivery, package tracking, and courier dispatch across India.</li>
            <li>To issue authentic, GST-compliant tax invoices showing SAC 9989 and your corporate GSTIN.</li>
            <li>To provide prompt customer support via email, phone, or WhatsApp regarding proof revisions and shipment updates.</li>
            <li>To detect and prevent fraudulent transactions, unauthorized access, or abusive behavior.</li>
            <li>To comply with statutory legal, accounting, and tax filing obligations under Indian law.</li>
          </ul>
        </section>

        {/* 5. Payment Processing */}
        <section id="payment-processing">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            5. Payment Processing & Security
          </h2>
          <p className="mb-3">
            TeqqnoWorld facilitates payment transactions through authorized, RBI-compliant third-party payment aggregators and gateways (including Razorpay, once merchant live integration is finalized, UPI applications, and direct net banking).
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 mb-3">
            <p className="font-semibold text-slate-900">Important Security Clarification:</p>
            <p>
              TeqqnoWorld <strong>never collects, processes, or stores your confidential payment credentials</strong> (such as complete credit/debit card numbers, CVV codes, banking passwords, or UPI MPINs) on its internal servers.
            </p>
            <p>
              All online payment processing takes place within the tokenized, PCI-DSS compliant infrastructure provided by the payment gateway partner.
            </p>
          </div>
          <p>
            For more details on accepted settlement methods and transaction handling, please review our{' '}
            <button onClick={() => onNavigate('/payment-policy')} className="text-[#FF7A00] font-medium underline cursor-pointer">
              Payment Policy
            </button>.
          </p>
        </section>

        {/* 6. Cookies */}
        <section id="cookies-technologies">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            6. Cookies & Client-Side Local Storage
          </h2>
          <p className="mb-3">
            Our platform uses standard browser local storage and essential session tokens strictly required for the operational functioning of the e-commerce store:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mb-3">
            <li><code>teqqno_cart</code>: Remembers customized merchandise items, quantities, and selected imprint methods in your shopping cart.</li>
            <li><code>teqqno_user</code>: Retains active session details and pre-filled corporate billing addresses for authorized users.</li>
            <li><code>teqqno_orders</code>: Stores recent mock and production tracking IDs for instant offline review.</li>
          </ul>
          <p>
            We do not install invasive third-party behavioral advertising cookies. For full details on cookie categories and browser management, refer to our{' '}
            <button onClick={() => onNavigate('/cookie-policy')} className="text-[#FF7A00] font-medium underline cursor-pointer">
              Cookie Policy
            </button>.
          </p>
        </section>

        {/* 7. Data Sharing */}
        <section id="data-sharing">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            7. Data Sharing & Third-Party Disclosures
          </h2>
          <p className="mb-3">
            We do not rent, trade, or sell your personal or corporate information. Disclosures are limited strictly to trusted operational partners under strict confidentiality:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Logistics & Express Couriers:</strong> Delivery address and recipient phone numbers are shared with courier partners (e.g., BlueDart Apex Express, Delhivery) strictly to facilitate parcel transit, SMS notifications, and delivery completion.
            </li>
            <li>
              <strong>Payment Gateway Providers:</strong> Transaction metadata and order values are transmitted to authorized payment aggregators (e.g., Razorpay) to process authorizations and refunds.
            </li>
            <li>
              <strong>Legal & Statutory Authorities:</strong> Information may be shared where mandated by applicable Indian laws, tax regulations (GSTN filing), court orders, or law enforcement summons.
            </li>
          </ul>
        </section>

        {/* 8. Data Retention & Security */}
        <section id="data-security">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            8. Data Retention & Security Measures
          </h2>
          <p className="mb-3">
            We retain your customer profile, order records, and invoices for the duration required under the Indian Companies Act, 2013 and Goods and Services Tax laws (generally up to 8 financial years for accounting and tax compliance).
          </p>
          <p>
            We implement reasonable technical, operational, and administrative safeguards to protect your personal information against unauthorized access, loss, alteration, or disclosure. However, no data transmission over the Internet can be guaranteed to be 100% invulnerable; you are responsible for maintaining the confidentiality of your account credentials.
          </p>
        </section>

        {/* 9. Your Rights */}
        <section id="user-rights">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            9. Your Privacy Rights & Choices
          </h2>
          <p className="mb-3">
            Under applicable Indian data protection principles, you are entitled to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mb-3">
            <li><strong>Access & Review:</strong> Review the personal and corporate profile data we maintain about you.</li>
            <li><strong>Correction & Rectification:</strong> Request correction of inaccurate contact numbers, delivery addresses, or GSTINs.</li>
            <li><strong>Erasure & Deletion:</strong> Request deletion of your account and archived artwork assets, provided retention is not required by statutory accounting or tax mandates.</li>
            <li><strong>Withdrawal of Consent:</strong> Withdraw consent for non-essential communications at any time.</li>
          </ul>
          <p>
            To exercise any of these rights, please write to us at{' '}
            <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="text-[#FF7A00] font-medium underline">
              {BUSINESS_DETAILS.supportEmail}
            </a>.
          </p>
        </section>

        {/* 10. Marketing Communications */}
        <section id="marketing-optout">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            10. Marketing Communications & Opt-Out
          </h2>
          <p>
            We may occasionally inform registered corporate accounts regarding seasonal product launches (e.g., Diwali corporate gift hampers, new apparel collections) or volume discount slabs. You may unsubscribe at any time by clicking the &ldquo;Unsubscribe&rdquo; link in emails, replying &ldquo;STOP&rdquo; on WhatsApp, or contacting our customer desk. Essential transactional notifications regarding your order proof, payment receipt, and dispatch AWB cannot be opted out of.
          </p>
        </section>

        {/* 11. Minors */}
        <section id="children-privacy">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            11. Minors & Children’s Privacy
          </h2>
          <p>
            TeqqnoWorld services are directed exclusively at business entities, corporate buyers, and individuals who are at least 18 years of age and legally competent to enter into binding contracts under the Indian Contract Act, 1872. We do not knowingly solicit or collect data from minors.
          </p>
        </section>

        {/* 12. Grievance Redressal */}
        <section id="grievance-contact">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            12. Grievance Officer & Contact Information
          </h2>
          <p className="mb-3">
            In accordance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020, the designated Grievance Officer for privacy and data-related concerns is:
          </p>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <p><strong>Grievance Officer:</strong> {BUSINESS_DETAILS.grievanceOfficerPlaceholder}</p>
            <p><strong>Entity Name:</strong> {BUSINESS_DETAILS.brandName} ({BUSINESS_DETAILS.legalEntityPlaceholder})</p>
            <p><strong>Fulfillment Facility:</strong> {BUSINESS_DETAILS.facilityAddress}</p>
            <p><strong>Email:</strong> <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="text-[#FF7A00] underline">{BUSINESS_DETAILS.supportEmail}</a></p>
            <p><strong>Helpdesk / WhatsApp:</strong> {BUSINESS_DETAILS.phoneHelp}</p>
            <p><strong>Working Hours:</strong> {BUSINESS_DETAILS.supportHours}</p>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            We endeavor to acknowledge any privacy grievances within 48 hours and resolve verified complaints within 30 days of receipt.
          </p>
        </section>

      </div>
    </LegalLayout>
  );
};
