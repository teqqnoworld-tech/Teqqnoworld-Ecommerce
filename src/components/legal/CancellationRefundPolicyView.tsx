import React from 'react';
import { LegalLayout, MerchantPlaceholderNotice } from './LegalLayout';
import { BUSINESS_DETAILS } from '../../data/legalData';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

interface LegalViewProps {
  onNavigate: (route: string) => void;
}

export const CancellationRefundPolicyView: React.FC<LegalViewProps> = ({ onNavigate }) => {
  const toc = [
    { id: 'cancellation-stages', title: '1. Order Cancellation Stages' },
    { id: 'custom-merchandise-rules', title: '2. Policy for Custom-Printed Goods' },
    { id: 'defective-damaged-refunds', title: '3. Defective, Damaged & Misprinted Goods' },
    { id: 'evidence-reporting', title: '4. How to Report an Issue' },
    { id: 'refund-timeline-process', title: '5. Refund Timelines & Settlement Method' },
    { id: 'statutory-rights', title: '6. Consumer Rights & Regulatory Compliance' },
    { id: 'cancellation-contact', title: '7. Cancellation & Refund Desk' },
  ];

  return (
    <LegalLayout
      currentRoute="/cancellation-refund-policy"
      title="Cancellation and Refund Policy"
      description="Clear, balanced, and legally compliant policies governing order cancellations, custom printing production locks, defective merchandise refunds, and statutory consumer protections."
      lastUpdated="October 25, 2026"
      tableOfContents={toc}
      onNavigate={onNavigate}
    >
      <div className="space-y-8 text-slate-700">
        
        {/* Merchant Review Box */}
        <MerchantPlaceholderNotice
          title="Merchant Action Checklist — Cancellation & Refund Policy Verification"
          items={[
            `Confirm official refund processing SLA: ${BUSINESS_DETAILS.refundSlaPlaceholder}`,
            `Confirm customer issue reporting window: ${BUSINESS_DETAILS.reportingWindowPlaceholder}`,
            `Confirm merchant bank / Razorpay settlement reversal cycle`,
          ]}
        />

        {/* 1. Cancellation Stages */}
        <section id="cancellation-stages">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            1. Order Cancellation Stages & Eligibility
          </h2>
          <p className="mb-4">
            At TeqqnoWorld, we recognize that procurement needs may evolve. Cancellation eligibility depends strictly on the stage of the order lifecycle:
          </p>

          <div className="space-y-4 mb-4">
            {/* Stage A */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-950 text-sm">Stage A: Prior to Digital Proof Approval (100% Full Refund)</h4>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  If you request cancellation <strong>before</strong> you have formally approved the millimeter-precise digital proof and before raw materials have been assigned to factory machine queues, your order will be cancelled immediately and you will receive a <strong>100% full refund</strong> with zero cancellation penalties.
                </p>
              </div>
            </div>

            {/* Stage B */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start gap-3.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-950 text-sm">Stage B: After Proof Approval, During Pre-Press Preparation</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  If proof approval has been granted and prepress tooling (such as rotary screen engraving, embroidery digitizing, or laser jig calibration) has commenced but physical printing onto garments/products has not yet started, cancellation may be accepted subject to deducting actual incurred prepress setup and tooling costs.
                </p>
              </div>
            </div>

            {/* Stage C */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3.5">
              <XCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Stage C: In-Production / Customization Underway</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Once goods have entered active physical production (textile printing, chest embroidery, laser marking), the raw materials are irreversibly personalized with your company branding and cannot be resold or repurposed. At this stage, orders cannot be cancelled for arbitrary change of mind, <em>except</em> as provided under our Defective & Misprinted Goods policy below.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Custom Goods Rules */}
        <section id="custom-merchandise-rules">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            2. Policy for Custom-Printed & Personalized Merchandise
          </h2>
          <p className="mb-3">
            Custom merchandise is produced specifically to your corporate specifications, logos, and custom dimensions. Consequently, commercial trade standards in India recognize that customized goods are exempt from standard &ldquo;change-of-mind&rdquo; returns.
          </p>
          <p>
            However, this exemption applies <strong>solely to subjective preference changes</strong> (e.g., deciding you no longer need the shirts or prefer a different slogan after production). It does <strong>not</strong> waive our responsibility to deliver flawless merchandise matching your approved digital proof.
          </p>
        </section>

        {/* 3. Defective Goods */}
        <section id="defective-damaged-refunds">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            3. Defective, Damaged & Misprinted Goods (100% Eligible)
          </h2>
          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-950 mb-3">
            <p className="font-bold text-emerald-900 mb-1">Guaranteed Quality Assurance & Statutory Remedy:</p>
            <p className="leading-relaxed">
              If any merchandise delivered by TeqqnoWorld does not conform to your approved proof or arrives damaged, you are <strong>100% entitled to an immediate free priority reprint/remake or a full refund</strong>.
            </p>
          </div>

          <p className="mb-2 font-semibold text-slate-900 text-sm">Eligible Circumstances for Full Refund or Remake:</p>
          <ul className="list-disc pl-5 space-y-1.5 mb-3 text-xs sm:text-sm">
            <li>
              <strong>Misprint Deviation:</strong> The printed artwork, logo size, orientation, or Pantone color materially deviates from the final signed-off digital proof.
            </li>
            <li>
              <strong>Manufacturing Flaws:</strong> Torn fabric seams, broken zippers, malfunctioning badge clips, damaged bottle seals, or chipped ceramics.
            </li>
            <li>
              <strong>Transit Damage:</strong> Consignment was crushed, punctured, or fractured during transit by our courier partner.
            </li>
            <li>
              <strong>Order Inaccuracy:</strong> Delivered sizes, garment styles, or total quantities differ from the confirmed purchase invoice.
            </li>
            <li>
              <strong>Courier Loss:</strong> Consignment confirmed permanently lost in transit by the courier network.
            </li>
          </ul>
        </section>

        {/* 4. Evidence */}
        <section id="evidence-reporting">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            4. How to Report a Problem & Required Evidence
          </h2>
          <p className="mb-3">
            To ensure swift resolution within 24 hours of notification, please follow this straightforward procedure:
          </p>
          <ol className="list-decimal pl-5 space-y-2 mb-3">
            <li>
              <strong>Reporting Window:</strong> Notify our customer resolution desk within <strong>{BUSINESS_DETAILS.reportingWindowPlaceholder}</strong> of the delivery timestamp recorded by the courier partner.
            </li>
            <li>
              <strong>Submit Photographic Evidence:</strong> Email{' '}
              <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="text-[#FF7A00] underline font-medium">
                {BUSINESS_DETAILS.supportEmail}
              </a>{' '}
              or message our WhatsApp desk at <strong>{BUSINESS_DETAILS.whatsappHelp}</strong> with:
              <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-slate-600">
                <li>Your Order Number (e.g. TQ-98104).</li>
                <li>Clear, well-lit photos or a short video demonstrating the specific defect, misprint, or damage.</li>
                <li>A photo of the shipping label and outer carton barcode.</li>
              </ul>
            </li>
            <li>
              <strong>Prepress & QA Review:</strong> Our quality assurance team cross-checks the photos against the approved prepress proof file and provides a resolution assessment within one (1) working day.
            </li>
          </ol>
        </section>

        {/* 5. Timelines */}
        <section id="refund-timeline-process">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            5. Refund Timelines & Settlement Method
          </h2>
          <p className="mb-3">
            When a refund is approved by our quality desk:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-3">
            <li>
              <strong>Initiation SLA:</strong> The refund is initiated into our payment gateway system within <strong>24 to 48 hours</strong> of verification.
            </li>
            <li>
              <strong>Gateway & Banking Settlement:</strong> In accordance with standard Indian banking settlement cycles (RBI guidelines and Razorpay gateway processing), funds typically reflect in your original payment source (credit card, debit card, UPI account, or net banking) within <strong>{BUSINESS_DETAILS.refundSlaPlaceholder}</strong>.
            </li>
            <li>
              <strong>Destination Account:</strong> Refunds are strictly credited back to the original funding account or credit instrument used to place the order. We do not issue cash refunds for online transactions.
            </li>
            <li>
              <strong>NEFT/IMPS Alternative:</strong> For corporate purchase orders paid via direct bank wire transfer, refunds are processed via NEFT/RTGS to the verified company bank account on receipt of a cancelled cheque or bank verification letter.
            </li>
          </ul>
        </section>

        {/* 6. Statutory Rights */}
        <section id="statutory-rights">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            6. Statutory Consumer Rights & Regulatory Compliance
          </h2>
          <p>
            This policy is formulated in strict accordance with the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020. Nothing in this policy shall be construed as diminishing, overriding, or restricting your statutory consumer rights regarding defective, deficient, or deceptively delivered merchandise.
          </p>
        </section>

        {/* 7. Contact */}
        <section id="cancellation-contact">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            7. Cancellation & Refund Assistance Desk
          </h2>
          <p className="mb-3">
            To submit an urgent cancellation notice or report a shipment issue, contact our dedicated team:
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <p><strong>Email:</strong> <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="text-[#FF7A00] underline">{BUSINESS_DETAILS.supportEmail}</a></p>
            <p><strong>WhatsApp Support:</strong> {BUSINESS_DETAILS.whatsappHelp}</p>
            <p><strong>Operating Hours:</strong> {BUSINESS_DETAILS.supportHours}</p>
            <p><strong>Subject Line Format:</strong> Urgent Cancellation / Refund Request &ndash; [Order Number]</p>
          </div>
        </section>

      </div>
    </LegalLayout>
  );
};
