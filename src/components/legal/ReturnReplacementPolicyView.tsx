import React from 'react';
import { LegalLayout, MerchantPlaceholderNotice } from './LegalLayout';
import { BUSINESS_DETAILS } from '../../data/legalData';
import { RefreshCw, CheckCircle, ShieldAlert, Truck, FileCheck } from 'lucide-react';

interface LegalViewProps {
  onNavigate: (route: string) => void;
}

export const ReturnReplacementPolicyView: React.FC<LegalViewProps> = ({ onNavigate }) => {
  const toc = [
    { id: 'replacement-philosophy', title: '1. Priority Replacement First Policy' },
    { id: 'eligibility-criteria', title: '2. Eligibility Criteria for Replacements' },
    { id: 'reporting-evidence', title: '3. Reporting Deadlines & Evidence' },
    { id: 'reverse-pickup', title: '4. Return Logistics & Courier Expenses' },
    { id: 'non-eligible-scenarios', title: '5. Non-Eligible Situations' },
    { id: 'resolution-timeline', title: '6. Inspection & Replacement Timelines' },
    { id: 'support-channels', title: '7. Customer Resolution Support' },
  ];

  return (
    <LegalLayout
      currentRoute="/return-replacement-policy"
      title="Return and Replacement Policy"
      description="Clear, hassle-free procedures for reporting manufacturing discrepancies, damaged shipments, and initiating express reprints for your corporate merchandise."
      lastUpdated="October 25, 2026"
      tableOfContents={toc}
      onNavigate={onNavigate}
    >
      <div className="space-y-8 text-slate-700">
        
        {/* Merchant Review Box */}
        <MerchantPlaceholderNotice
          title="Merchant Action Checklist — Return & Replacement Verification"
          items={[
            `Confirm reverse pickup logistics provider availability across non-metro hubs`,
            `Confirm reporting deadline: ${BUSINESS_DETAILS.reportingWindowPlaceholder}`,
            `Confirm sample retention period for batch re-printing`,
          ]}
        />

        {/* 1. Priority Replacement */}
        <section id="replacement-philosophy">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            1. Priority Replacement First Policy
          </h2>
          <p className="mb-3">
            At TeqqnoWorld, we understand that corporate merchandise is often time-sensitive—ordered for upcoming developer conferences, investor summits, trade exhibitions, or new employee onboarding cohorts.
          </p>
          <div className="bg-orange-50/60 p-4 rounded-xl border border-orange-200/70 text-xs text-slate-800 space-y-1.5 mb-3">
            <div className="flex items-center gap-2 font-bold text-[#FF7A00] text-sm">
              <RefreshCw className="w-4 h-4" />
              <span>Express Priority Remake Guarantee</span>
            </div>
            <p className="leading-relaxed">
              If an order arrives defective or does not match your approved prepress proof, our primary and most rapid remedy is an <strong>express reprint and priority air dispatch at zero additional cost to you</strong>. Alternatively, you may choose a full refund under our{' '}
              <button onClick={() => onNavigate('/cancellation-refund-policy')} className="text-[#FF7A00] underline font-medium cursor-pointer">
                Cancellation and Refund Policy
              </button>.
            </p>
          </div>
        </section>

        {/* 2. Eligibility Criteria */}
        <section id="eligibility-criteria">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            2. Eligibility Criteria for Replacement
          </h2>
          <p className="mb-3">
            Merchandise qualifies for an immediate free replacement if any of the following verified conditions exist:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-3 text-xs sm:text-sm">
            <li>
              <strong>Proof Non-Conformity:</strong> The delivered printing, embroidery, or engraving materially differs in logo placement, dimensions, text content, or Pantone shade from the signed digital proof.
            </li>
            <li>
              <strong>Garment & Material Flaws:</strong> Visible weaving holes, structural tears, broken snap closures, uneven hem lines, or defective sewing seams on apparel.
            </li>
            <li>
              <strong>Hardware & Drinkware Defects:</strong> Broken lids on sippers/flasks, cracked mugs, defective badge reel springs, or malfunctioning flash drive chips.
            </li>
            <li>
              <strong>Transit Damage:</strong> Physical breakage, crushing, or water contamination occurring during courier transit.
            </li>
            <li>
              <strong>Incorrect Variants:</strong> You received colors, styles, or sizing ratios that do not match your confirmed order specifications.
            </li>
          </ul>
        </section>

        {/* 3. Reporting Deadlines */}
        <section id="reporting-evidence">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            3. Reporting Deadlines & Evidence Submission
          </h2>
          <p className="mb-3">
            To ensure swift resolution and timely courier insurance reporting, claims must be registered within <strong>{BUSINESS_DETAILS.reportingWindowPlaceholder}</strong> of the delivery timestamp recorded by the courier network.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 mb-3">
            <p className="font-semibold text-slate-900">Required Documentation:</p>
            <ol className="list-decimal pl-4 space-y-1 text-slate-600">
              <li>Order Number and Corporate Entity Name.</li>
              <li>Clear photographs or a continuous unboxing video showing the affected batch, the defect, and the shipping parcel label.</li>
              <li>Brief description of the quantity affected (e.g. 15 out of 100 polo shirts).</li>
            </ol>
          </div>
          <p className="text-xs text-slate-500">
            Submit your claim via email to{' '}
            <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="text-[#FF7A00] underline font-medium">
              {BUSINESS_DETAILS.supportEmail}
            </a>{' '}
            or via WhatsApp to <strong>{BUSINESS_DETAILS.whatsappHelp}</strong>.
          </p>
        </section>

        {/* 4. Reverse Pickup */}
        <section id="reverse-pickup">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            4. Return Logistics & Courier Expenses
          </h2>
          <ul className="list-disc pl-5 space-y-2 mb-3 text-xs sm:text-sm">
            <li>
              <strong>Zero Cost to Buyer for Defective Goods:</strong> If physical return of the damaged or defective merchandise is deemed necessary by our QA team for forensic review or scrap salvage, TeqqnoWorld will schedule a reverse courier pickup at our own expense.
            </li>
            <li>
              <strong>Self-Shipment Reimbursement:</strong> If your location is not serviceable for reverse courier pickup by our logistics partners, we will request you to dispatch the parcel via a trackable surface courier and reimburse the verified shipping receipt within 48 hours.
            </li>
            <li>
              <strong>Minor Quantity Dispensation:</strong> For isolated issues (e.g. 1 or 2 defective mugs in a large bulk batch), our team will typically issue an immediate credit or replacement without requiring physical return of the broken goods, upon verification of photo evidence.
            </li>
          </ul>
        </section>

        {/* 5. Non-Eligible Situations */}
        <section id="non-eligible-scenarios">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            5. Non-Eligible Situations
          </h2>
          <p className="mb-2">Replacement or return claims cannot be honored under the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 mb-3">
            <li>
              <strong>Client Typographical Errors in Approved Proofs:</strong> Errors in spelling, phone numbers, website URLs, or slogans that were present in the digital proof and formally approved by the customer.
            </li>
            <li>
              <strong>Subjective Preference Changes:</strong> Deciding after delivery that you would have preferred a different garment color, fit, or design theme.
            </li>
            <li>
              <strong>Incorrect Sizing Selection:</strong> Garments manufactured accurately to the centimeter measurements published in our official product size chart.
            </li>
            <li>
              <strong>Customer Misuse or Improper Laundering:</strong> Damage resulting from harsh chemical bleaching, boiling washes, or direct iron contact on silicone/DTF print transfers contrary to garment care label instructions.
            </li>
            <li>
              <strong>Untimely Notification:</strong> Claims raised after our confirmed reporting window has lapsed.
            </li>
          </ul>
        </section>

        {/* 6. Replacement Timelines */}
        <section id="resolution-timeline">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            6. Inspection & Replacement Turnaround Timelines
          </h2>
          <p className="mb-3">
            Once your claim documentation is received:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm mb-3">
            <li><strong>Assessment:</strong> Our Prepress & QA Lead evaluates the claim and responds with approval within <strong>24 business hours</strong>.</li>
            <li><strong>Priority Machine Queuing:</strong> Replacement items are queued on an expedited rush line, bypassing regular queues.</li>
            <li><strong>Expedited Dispatch:</strong> Re-manufactured items are dispatched via express air courier within <strong>48 to 72 hours</strong> of claim validation.</li>
          </ul>
        </section>

        {/* 7. Support Channels */}
        <section id="support-channels">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            7. Customer Resolution Support Channels
          </h2>
          <p className="mb-3">
            Our resolution desk is dedicated to ensuring you never face an event or brand launch without your merchandise:
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <p><strong>Direct Helpdesk Email:</strong> <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="text-[#FF7A00] underline">{BUSINESS_DETAILS.supportEmail}</a></p>
            <p><strong>WhatsApp Escalations:</strong> {BUSINESS_DETAILS.whatsappHelp}</p>
            <p><strong>Hours:</strong> {BUSINESS_DETAILS.supportHours}</p>
          </div>
        </section>

      </div>
    </LegalLayout>
  );
};
