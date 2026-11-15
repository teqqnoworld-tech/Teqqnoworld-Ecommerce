import React from 'react';
import { LegalLayout, MerchantPlaceholderNotice } from './LegalLayout';
import { BUSINESS_DETAILS } from '../../data/legalData';

interface LegalViewProps {
  onNavigate: (route: string) => void;
}

export const TermsAndConditionsView: React.FC<LegalViewProps> = ({ onNavigate }) => {
  const toc = [
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'eligibility', title: '2. User Eligibility & Accounts' },
    { id: 'custom-orders', title: '3. Custom Merchandise & Artwork' },
    { id: 'ip-warranty', title: '4. Intellectual Property & Customer Warranty' },
    { id: 'proof-approval', title: '5. Digital Proofs & Production Approval' },
    { id: 'pricing-payment', title: '6. Pricing, GST & Payment Obligations' },
    { id: 'order-acceptance', title: '7. Order Confirmation & Cancellation Rights' },
    { id: 'shipping-delivery', title: '8. Shipping, Delivery & Transit Risk' },
    { id: 'returns-remedies', title: '9. Defective Items & Remedy Rights' },
    { id: 'prohibited-use', title: '10. Prohibited Conduct' },
    { id: 'liability', title: '11. Limitation of Liability' },
    { id: 'governing-law', title: '12. Governing Law & Dispute Resolution' },
  ];

  return (
    <LegalLayout
      currentRoute="/terms-and-conditions"
      title="Terms and Conditions"
      description="The standard commercial terms, intellectual property representations, proof sign-off covenants, and service policies governing all orders placed with TeqqnoWorld."
      lastUpdated="October 25, 2026"
      tableOfContents={toc}
      onNavigate={onNavigate}
    >
      <div className="space-y-8 text-slate-700">
        
        {/* Merchant Review Box */}
        <MerchantPlaceholderNotice
          title="Merchant Action Checklist — Terms & Conditions Verification"
          items={[
            `Confirm legal entity name: ${BUSINESS_DETAILS.legalEntityPlaceholder}`,
            `Confirm exclusive court jurisdiction: [${BUSINESS_DETAILS.jurisdiction} - Subject to final legal review]`,
            `Confirm corporate identification & registered office: ${BUSINESS_DETAILS.registeredOfficePlaceholder}`,
          ]}
        />

        {/* 1. Acceptance */}
        <section id="acceptance">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            1. Acceptance of Terms
          </h2>
          <p className="mb-3">
            These Terms and Conditions (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;Customer&rdquo;, &ldquo;Buyer&rdquo;, or &ldquo;you&rdquo;) and <strong>TeqqnoWorld</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), operating the e-commerce website located at{' '}
            <a href={BUSINESS_DETAILS.websiteUrl} className="text-[#FF7A00] underline font-medium" target="_blank" rel="noreferrer">
              {BUSINESS_DETAILS.websiteUrl}
            </a>.
          </p>
          <p>
            By accessing our website, creating an account, approving a digital proof, or placing an order for custom merchandise, you acknowledge that you have read, understood, and agree to be bound by these Terms, together with our{' '}
            <button onClick={() => onNavigate('/privacy-policy')} className="text-[#FF7A00] underline font-medium cursor-pointer">
              Privacy Policy
            </button>{' '}
            and{' '}
            <button onClick={() => onNavigate('/cancellation-refund-policy')} className="text-[#FF7A00] underline font-medium cursor-pointer">
              Cancellation & Refund Policy
            </button>.
          </p>
        </section>

        {/* 2. Eligibility */}
        <section id="eligibility">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            2. User Eligibility & Account Responsibilities
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Contractual Capacity:</strong> You represent that you are at least 18 years of age and legally competent to enter into a valid binding contract under the Indian Contract Act, 1872.
            </li>
            <li>
              <strong>Corporate Authority:</strong> If you place an order on behalf of a company, corporate enterprise, partnership, or institution, you warrant that you are authorized to bind that entity to purchase obligations and submit company trademarks.
            </li>
            <li>
              <strong>Account Safeguards:</strong> You are responsible for safeguarding your login credentials and mobile OTP tokens. You agree to notify us immediately of any unauthorized use of your account.
            </li>
          </ul>
        </section>

        {/* 3. Custom Merchandise */}
        <section id="custom-orders">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            3. Custom Merchandise & Production Specifications
          </h2>
          <p className="mb-3">
            TeqqnoWorld provides customized corporate apparel, drinkware, stationery, ID accessories, and gift hampers manufactured according to your requested specifications, sizes, colors, and printing techniques (including DTF printing, embroidery, screen printing, UV spot curing, and laser engraving).
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 mb-3">
            <p className="font-semibold text-slate-900">Color Reproduction & Technical Tolerances:</p>
            <p>
              Digital screens emit colors via RGB light pixels, whereas physical production uses Pantone (PMS) matching, reactive textile dyes, and CMYK ink formulations. While TeqqnoWorld adheres to high-precision color calibration, minor variances within standard commercial textile/print tolerances (±5% hue or tonal variation) are industry standard and do not constitute a defect.
            </p>
          </div>
        </section>

        {/* 4. IP Warranty & Indemnity */}
        <section id="ip-warranty">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            4. Intellectual Property & Customer Artwork Warranty
          </h2>
          <p className="mb-3">
            When you upload or transmit logos, graphics, brand marks, or text (&ldquo;Customer Artwork&rdquo;) to TeqqnoWorld:
          </p>
          <ol className="list-decimal pl-5 space-y-2 mb-3">
            <li>
              <strong>Customer Warranty:</strong> You represent, warrant, and covenant that you own all rights, title, and interest in the Customer Artwork, or hold a valid, worldwide, transferable license from the rightful trademark/copyright owner authorizing its reproduction on customized goods.
            </li>
            <li>
              <strong>Indemnification:</strong> You agree to fully indemnify, defend, and hold harmless TeqqnoWorld, its directors, officers, employees, and fulfillment contractors from and against any third-party claims, liabilities, damages, legal costs, or settlements arising out of any actual or alleged trademark infringement, copyright violation, trade secret misappropriation, or unfair competition resulting from our printing of Customer Artwork supplied by you.
            </li>
            <li>
              <strong>Right to Decline Infringing Material:</strong> We reserve the right, without liability, to reject or cancel any order containing defamatory, obscene, politically inflammatory, or visibly counterfeit intellectual property.
            </li>
          </ol>
        </section>

        {/* 5. Proof Approval */}
        <section id="proof-approval">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            5. Digital Proofs & Production Approval Policy
          </h2>
          <p className="mb-3">
            To ensure zero discrepancy between your vision and the finished merchandise, TeqqnoWorld operates a mandatory <strong>Digital Proof Sign-Off Policy</strong>:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-3">
            <li>
              Prior to commencing production, our prepress team generates a 1:1 scale digital mockup showing artwork placement, dimensions in millimeters, and specified color codes.
            </li>
            <li>
              <strong>Customer Verification Responsibility:</strong> You are responsible for carefully verifying all text spelling, contact numbers, email addresses, layout dimensions, and garment colors displayed on the proof.
            </li>
            <li>
              <strong>Production Lock:</strong> Once you click &ldquo;Approve Proof&rdquo; or confirm via email/WhatsApp, your order is locked and immediately scheduled for plate making, film output, and automated machine production.
            </li>
            <li>
              <strong>Post-Approval Modifications:</strong> Any change requested after proof approval is subject to raw material and setup reimbursement fees if production has commenced.
            </li>
          </ul>
        </section>

        {/* 6. Pricing & Taxes */}
        <section id="pricing-payment">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            6. Pricing, GST & Payment Obligations
          </h2>
          <p className="mb-3">
            All prices on product catalog pages are displayed in Indian Rupees (INR). Unless explicitly noted as tax-inclusive, base catalog prices exclude applicable Goods and Services Tax (GST).
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mb-3">
            <li>Applicable 18% GST (under SAC Code 9989 for custom printing and branding services) is clearly itemized in the cart and checkout summary before final order placement.</li>
            <li>B2B corporate buyers must supply a valid 15-digit GSTIN at checkout to receive an authentic Tax Invoice for Input Tax Credit (ITC) claiming.</li>
            <li>Orders must be paid in full via approved payment gateways (UPI, Cards, NetBanking) or under pre-authorized Corporate Purchase Order (PO) terms.</li>
          </ul>
          <p>
            For complete tax guidance and SAC breakdowns, refer to our{' '}
            <button onClick={() => onNavigate('/pricing-and-taxes')} className="text-[#FF7A00] underline font-medium cursor-pointer">
              Pricing & Taxes Policy
            </button>.
          </p>
        </section>

        {/* 7. Order Confirmation & Cancellation */}
        <section id="order-acceptance">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            7. Order Confirmation & Cancellation
          </h2>
          <p className="mb-3">
            Your receipt of an electronic order confirmation does not signify our final acceptance of your order. TeqqnoWorld reserves the right to decline or cancel an order in whole or in part due to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mb-3">
            <li>Unavailability of raw material stock or factory capacity constraints.</li>
            <li>Inability to obtain payment authorization or detection of fraudulent activity.</li>
            <li>Unresolvable artwork resolution issues that would prevent satisfactory printing quality.</li>
          </ul>
          <p>
            In the event we cancel an order prior to proof approval or production, any payment received will be refunded 100% to your original payment method. For customer cancellation guidelines, see our{' '}
            <button onClick={() => onNavigate('/cancellation-refund-policy')} className="text-[#FF7A00] underline font-medium cursor-pointer">
              Cancellation & Refund Policy
            </button>.
          </p>
        </section>

        {/* 8. Shipping & Delivery */}
        <section id="shipping-delivery">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            8. Shipping, Delivery & Transit Risk
          </h2>
          <p className="mb-3">
            TeqqnoWorld arranges delivery via reputable logistics partners (e.g., BlueDart Apex Express, Delhivery). Delivery timelines are estimates calculated from the date of <strong>digital proof approval</strong>, not order placement.
          </p>
          <p>
            We are not liable for courier delays resulting from severe weather disruptions, regional transport strikes, regulatory inspections, incomplete shipping addresses provided by the buyer, or recipient unavailability. For detailed shipping tiers and tracking rules, consult our{' '}
            <button onClick={() => onNavigate('/shipping-policy')} className="text-[#FF7A00] underline font-medium cursor-pointer">
              Shipping and Delivery Policy
            </button>.
          </p>
        </section>

        {/* 9. Returns & Remedies */}
        <section id="returns-remedies">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            9. Defective Items & Statutory Consumer Remedies
          </h2>
          <p className="mb-3">
            Because custom-printed merchandise is customized specifically with your proprietary logos, it cannot be returned for resale due to change of mind. However:
          </p>
          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-950 mb-3">
            <strong>Preservation of Statutory Rights:</strong> If delivered goods exhibit verifiable manufacturing defects, transit damage, or material deviation from your approved digital proof, you are 100% entitled to an immediate priority reprint/replacement or appropriate refund in accordance with the Consumer Protection Act, 2019.
          </div>
          <p>
            Please inspect deliveries upon arrival and report any defect within our confirmed notification window as outlined in our{' '}
            <button onClick={() => onNavigate('/return-replacement-policy')} className="text-[#FF7A00] underline font-medium cursor-pointer">
              Return and Replacement Policy
            </button>.
          </p>
        </section>

        {/* 10. Prohibited Conduct */}
        <section id="prohibited-use">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            10. Prohibited Conduct
          </h2>
          <p className="mb-2">You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Use the website or services for any fraudulent or unlawful purpose under Indian law.</li>
            <li>Submit artwork that infringes third-party patents, copyrights, trademarks, or publicity rights.</li>
            <li>Introduce computer viruses, worms, trojans, or malicious scripts into our digital portal.</li>
            <li>Attempt unauthorized access to our servers, user accounts, or backend systems.</li>
            <li>Scrape, reverse-engineer, or duplicate website layout designs, product customizer code, or proprietary graphics.</li>
          </ul>
        </section>

        {/* 11. Limitation of Liability */}
        <section id="liability">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            11. Limitation of Liability
          </h2>
          <p className="mb-3">
            To the maximum extent permitted by applicable Indian law:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              TeqqnoWorld shall not be liable for any indirect, incidental, special, punitive, or consequential damages, including loss of business profits, goodwill, event cancellation costs, or data loss, arising from the use or inability to use our services or products.
            </li>
            <li>
              Our total aggregate liability for any proven claim arising out of an order shall not exceed the actual purchase price paid by the customer for the specific batch of merchandise giving rise to the claim.
            </li>
            <li>
              Nothing in these Terms limits or excludes liability that cannot be excluded under statutory Indian consumer protection legislation.
            </li>
          </ul>
        </section>

        {/* 12. Governing Law */}
        <section id="governing-law">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            12. Governing Law & Dispute Resolution
          </h2>
          <p className="mb-3">
            These Terms, their interpretation, and any disputes arising out of or related to our merchandise or website shall be governed exclusively by the laws of India.
          </p>
          <p className="mb-3">
            <strong>Amicable Negotiation:</strong> In the event of any disagreement or dispute, both parties shall first endeavor to resolve the matter through good-faith discussion within thirty (30) days of formal written notice to{' '}
            <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="text-[#FF7A00] underline font-medium">
              {BUSINESS_DETAILS.supportEmail}
            </a>.
          </p>
          <p>
            <strong>Jurisdiction:</strong> Subject to good-faith mediation, any legal proceedings shall be subject to the exclusive jurisdiction of the competent civil courts situated in Hyderabad, Telangana, India.
          </p>
        </section>

      </div>
    </LegalLayout>
  );
};
