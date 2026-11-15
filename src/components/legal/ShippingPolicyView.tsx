import React from 'react';
import { LegalLayout, MerchantPlaceholderNotice } from './LegalLayout';
import { BUSINESS_DETAILS } from '../../data/legalData';
import { Truck, Clock, ShieldCheck, MapPin, AlertCircle } from 'lucide-react';

interface LegalViewProps {
  onNavigate: (route: string) => void;
}

export const ShippingPolicyView: React.FC<LegalViewProps> = ({ onNavigate }) => {
  const toc = [
    { id: 'production-stages', title: '1. Production vs. Shipping Timelines' },
    { id: 'proof-approval-impact', title: '2. Impact of Digital Proof Sign-Off' },
    { id: 'shipping-rates', title: '3. Shipping Rates & Free Shipping Criteria' },
    { id: 'serviceable-areas', title: '4. Serviceable Locations & Couriers' },
    { id: 'consignment-tracking', title: '5. Tracking Your Consignment' },
    { id: 'failed-deliveries', title: '6. Address Accuracy & Re-Delivery' },
    { id: 'bulk-split-shipments', title: '7. Bulk Shipments & Multi-Location Drops' },
    { id: 'transit-damages', title: '8. Damaged, Tampered or Missing Items' },
  ];

  return (
    <LegalLayout
      currentRoute="/shipping-policy"
      title="Shipping and Delivery Policy"
      description="Detailed explanation of production lead times, proof sign-off rules, dispatch schedules, courier partners, and tracking procedures across India."
      lastUpdated="October 25, 2026"
      tableOfContents={toc}
      onNavigate={onNavigate}
    >
      <div className="space-y-8 text-slate-700">
        
        {/* Merchant Review Box */}
        <MerchantPlaceholderNotice
          title="Merchant Action Checklist — Shipping Policy Verification"
          items={[
            `Confirm free shipping threshold: [Currently set to orders >= ₹1,999 at checkout; standard shipping ₹149]`,
            `Confirm express courier partners: [BlueDart Apex Express, Delhivery, DTDC - Subject to active merchant logistics contracts]`,
            `Confirm cutoff time for same-day proof approvals: [e.g. 2:00 PM IST on working days]`,
          ]}
        />

        {/* 1. Production Stages */}
        <section id="production-stages">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            1. Production vs. Shipping Timelines
          </h2>
          <p className="mb-4">
            Because TeqqnoWorld manufactures custom-printed merchandise tailored to your exact brand identity, total fulfillment time consists of two distinct phases: <strong>Production Lead Time</strong> and <strong>Transit Time</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200/70">
              <div className="flex items-center gap-2 font-bold text-[#FF7A00] text-sm mb-1.5">
                <Clock className="w-4 h-4" />
                <span>Phase 1: Production Lead Time</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The time required to review vector files, generate 1:1 scale digital proofs, set up machine plates/screens, embroider/print/engrave the goods, and conduct QA inspection.
              </p>
              <div className="mt-2 text-xs font-semibold text-slate-900">
                • Standard Catalog Lines: 24–48 working hours<br />
                • Custom Gift Hampers / Welcome Kits: 3–5 working days
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1.5">
                <Truck className="w-4 h-4 text-[#FF7A00]" />
                <span>Phase 2: Courier Transit Time</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The transit duration from our industrial dispatch facility in Hyderabad to your doorstep via air express or ground surface cargo.
              </p>
              <div className="mt-2 text-xs font-semibold text-slate-900">
                • Tier 1 Metro Air (BLR, BOM, DEL, HYD, MAA): 24–48 hours<br />
                • Tier 2/3 Cities & Regional Centers: 3–5 business days
              </div>
            </div>
          </div>
        </section>

        {/* 2. Proof Impact */}
        <section id="proof-approval-impact">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            2. Impact of Digital Proof Sign-Off on Schedules
          </h2>
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 text-xs text-amber-950 mb-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 mb-1">Production Begins ONLY After Digital Proof Approval</p>
              <p className="leading-relaxed">
                All production countdowns and dispatch estimates commence from the exact timestamp when you formally approve the digital proof in your corporate dashboard or via official email/WhatsApp confirmation. Any delay in proof review or artwork corrections requested by the client will correspondingly adjust the estimated dispatch date.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Shipping Rates */}
        <section id="shipping-rates">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            3. Shipping Charges & Free Shipping Thresholds
          </h2>
          <p className="mb-3">
            Shipping charges are calculated at checkout based on package weight, volumetric dimensions, and order subtotal:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-3">
            <li>
              <strong>Free Standard Shipping:</strong> Orders with a merchandise subtotal of ₹1,999 or greater automatically qualify for free standard door delivery across all serviceable Indian pin codes.
            </li>
            <li>
              <strong>Standard Orders Below ₹1,999:</strong> A nominal flat logistics fee of ₹149 is applied to cover insured air express courier packaging.
            </li>
            <li>
              <strong>Enterprise Bulk Pallet Shipments:</strong> For bulk orders exceeding 500 units or 100 kg total gross weight requiring dedicated surface cargo trucks or specialized dock unloading, logistics charges are quoted transparently on the custom Purchase Order.
            </li>
          </ul>
        </section>

        {/* 4. Serviceable Locations */}
        <section id="serviceable-areas">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            4. Serviceable Delivery Locations & Logistics Partners
          </h2>
          <p className="mb-3">
            TeqqnoWorld dispatches consignments across India covering over 19,000+ pin codes via leading Tier-1 logistics partners including:
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {['BlueDart Apex Express', 'Delhivery Express Cargo', 'DTDC Air Services', 'Trackon Courier'].map((courier, idx) => (
              <span key={idx} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 shadow-2xs">
                {courier}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            *Deliveries to designated restricted military areas (APO/FPO), remote island territories, or special industrial zones requiring security gate passes may require additional documentation or coordination with the recipient.
          </p>
        </section>

        {/* 5. Tracking */}
        <section id="consignment-tracking">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            5. Tracking Your Consignment
          </h2>
          <p className="mb-3">
            Once your order passes our multi-point quality check and is handed over to the courier partner:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 mb-3">
            <li>An automated Air Waybill (AWB) tracking number is generated and logged in your TeqqnoWorld corporate dashboard.</li>
            <li>An email and WhatsApp dispatch alert containing the direct courier tracking link will be sent to your registered contact coordinates.</li>
            <li>You can track live milestone scans by visiting our{' '}
              <button onClick={() => onNavigate('orders')} className="text-[#FF7A00] underline font-medium cursor-pointer">
                Track Order Portal
              </button>{' '}
              anytime.
            </li>
          </ol>
        </section>

        {/* 6. Failed Deliveries */}
        <section id="failed-deliveries">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            6. Address Accuracy & Unsuccessful Delivery Attempts
          </h2>
          <p className="mb-3">
            <strong>Customer Address Duty:</strong> The buyer is responsible for supplying a complete shipping address including company/building name, floor number, gate number, correct 6-digit pin code, and an active recipient mobile phone number reachable by the delivery courier.
          </p>
          <p className="mb-3">
            Our courier partners make up to three (3) delivery attempts before routing the parcel back to our origin fulfillment hub. In cases where delivery fails due to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 mb-3">
            <li>Incorrect or incomplete address details provided by the customer.</li>
            <li>Consignee premises closed or inaccessible during working hours.</li>
            <li>Consignee continuously unreachable on telephone or refusing parcel acceptance.</li>
          </ul>
          <p className="text-xs text-slate-600">
            The parcel will be returned to our facility. Re-dispatch to a revised address will be scheduled upon payment of standard re-consignment courier fees.
          </p>
        </section>

        {/* 7. Bulk Drops */}
        <section id="bulk-split-shipments">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            7. Bulk Orders & Multi-Location Office Drops
          </h2>
          <p>
            For enterprise onboarding kits and nationwide promotional campaigns, TeqqnoWorld offers split-dispatch to multiple branch offices or direct remote employee home addresses across India. Multi-drop orders are coordinated via our Enterprise Procurement desk with customized packing slips and address-by-address tracking rosters.
          </p>
        </section>

        {/* 8. Transit Damages */}
        <section id="transit-damages">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            8. Damaged, Tampered Cartons & Shortages
          </h2>
          <div className="bg-red-50/60 p-4 rounded-xl border border-red-200 text-xs text-red-950 mb-3">
            <p className="font-bold text-red-900 mb-1">Important Inspection Guideline:</p>
            <p className="leading-relaxed">
              If the outer shipping carton arrives visibly crushed, torn, wet, or with our branded tamper-evident tape cut open, please endorse the physical or digital delivery run sheet as <strong>&ldquo;Received Damaged / Tampered&rdquo;</strong> before signing, or refuse acceptance.
            </p>
          </div>
          <p>
            Please photograph the outer box condition and contact us at{' '}
            <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="text-[#FF7A00] underline font-medium">
              {BUSINESS_DETAILS.supportEmail}
            </a>{' '}
            within {BUSINESS_DETAILS.reportingWindowPlaceholder} to initiate priority courier claim investigation and immediate merchandise remakes. For full replacement guidelines, see our{' '}
            <button onClick={() => onNavigate('/return-replacement-policy')} className="text-[#FF7A00] underline font-medium cursor-pointer">
              Return and Replacement Policy
            </button>.
          </p>
        </section>

      </div>
    </LegalLayout>
  );
};
