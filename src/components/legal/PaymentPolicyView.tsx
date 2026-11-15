import React from 'react';
import { LegalLayout, MerchantPlaceholderNotice } from './LegalLayout';
import { BUSINESS_DETAILS } from '../../data/legalData';
import { CreditCard, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Lock } from 'lucide-react';

interface LegalViewProps {
  onNavigate: (route: string) => void;
}

export const PaymentPolicyView: React.FC<LegalViewProps> = ({ onNavigate }) => {
  const toc = [
    { id: 'accepted-methods', title: '1. Supported Payment Modes' },
    { id: 'payment-timing', title: '2. Point of Payment Collection' },
    { id: 'gateway-security', title: '3. Gateway Security & Compliance' },
    { id: 'failed-transactions', title: '4. Failed, Interrupted & Duplicate Charges' },
    { id: 'corporate-po', title: '5. Corporate PO & Net-30 Terms' },
    { id: 'chargebacks-refunds', title: '6. Chargebacks & Reversal Process' },
    { id: 'payment-support', title: '7. Payment Issue Assistance' },
  ];

  return (
    <LegalLayout
      currentRoute="/payment-policy"
      title="Payment Policy"
      description="Clear information on accepted payment instruments, gateway security, corporate credit accounts, and handling of failed transactions."
      lastUpdated="October 25, 2026"
      tableOfContents={toc}
      onNavigate={onNavigate}
    >
      <div className="space-y-8 text-slate-700">
        
        {/* Merchant Review Box */}
        <MerchantPlaceholderNotice
          title="Merchant Action Checklist — Payment Policy Verification"
          items={[
            `Razorpay Merchant Onboarding Status: [Application in Progress / Sandbox Testing Mode - To be switched to Live API Keys upon gateway underwriting approval]`,
            `Confirm supported corporate bank account for NEFT/RTGS transfers: [Bank Name, Account Number, IFSC to be officially listed on invoices]`,
            `Confirm Corporate Net-30 credit underwriting policy`,
          ]}
        />

        {/* 1. Accepted Methods */}
        <section id="accepted-methods">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            1. Supported Payment Methods
          </h2>
          <p className="mb-3">
            TeqqnoWorld supports secure, convenient payment options tailored for both retail merchandise buyers and enterprise procurement departments:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-900 block">Unified Payments Interface (UPI)</span>
              <p className="text-slate-600">Google Pay, PhonePe, Paytm, BHIM, and bank UPI apps with zero convenience surcharge.</p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-900 block">Cards & NetBanking</span>
              <p className="text-slate-600">Visa, Mastercard, RuPay, Corporate Credit/Debit Cards, and 50+ Indian commercial banks.</p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-900 block">Corporate PO & NEFT/RTGS</span>
              <p className="text-slate-600">Direct wire transfers and 30-day corporate credit terms for pre-vetted corporate entities.</p>
            </div>
          </div>
        </section>

        {/* 2. Collection Timing */}
        <section id="payment-timing">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            2. Point of Payment Collection & Order Confirmation
          </h2>
          <ul className="list-disc pl-5 space-y-2 mb-3 text-xs sm:text-sm">
            <li>
              <strong>Instant Online Orders:</strong> For standard catalog orders, payment authorization is captured at checkout. Your order status transitions to <em>&ldquo;Artwork Verification&rdquo;</em>, prompting our prepress team to generate your digital proof.
            </li>
            <li>
              <strong>Pay on Proof Approval:</strong> Customers selecting &ldquo;Pay on Approval&rdquo; submit artwork upfront without payment. We prepare your 1:1 scale digital proof for review; full payment must be authorized upon clicking &ldquo;Approve Proof&rdquo; before machine production commences.
            </li>
            <li>
              <strong>Order Confirmation Email:</strong> An automated digital order confirmation accompanied by an itemized GST calculation is dispatched to your registered email immediately upon payment authorization.
            </li>
          </ul>
        </section>

        {/* 3. Gateway Security */}
        <section id="gateway-security">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            3. Payment Gateway Infrastructure & Security Standards
          </h2>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 mb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Tokenized, RBI-Compliant Gateway Processing</span>
            </div>
            <p className="leading-relaxed">
              TeqqnoWorld is currently onboarding authorized Indian payment gateway aggregators (including Razorpay) to process digital card, net banking, and UPI transactions. All payment processing complies with Reserve Bank of India (RBI) tokenization guidelines and PCI-DSS Level 1 compliance.
            </p>
            <p className="font-semibold text-slate-900">
              *TeqqnoWorld never handles, reads, or stores your confidential credit/debit card numbers, CVVs, or bank credentials.
            </p>
          </div>
        </section>

        {/* 4. Failed Transactions */}
        <section id="failed-transactions">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            4. Failed, Interrupted & Duplicate Charges
          </h2>
          <p className="mb-3">
            In rare instances where a payment is debited from your bank account or card but our website displays a failure, session timeout, or pending status:
          </p>
          <div className="space-y-3 mb-3 text-xs sm:text-sm">
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-950">
              <strong>Automated Bank Reconciliation:</strong> Most interrupted transactions are automatically refunded by your acquiring bank within <strong>24 to 48 banking hours</strong> without merchant intervention.
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
              <strong>Order Verification Option:</strong> If money was deducted, note your bank transaction reference ID / UPI UTR number and email it to{' '}
              <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="text-[#FF7A00] underline font-medium">
                {BUSINESS_DETAILS.supportEmail}
              </a>. If the funds reached our merchant account, our billing desk will manually confirm your order within two hours.
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
              <strong>Accidental Duplicate Orders:</strong> If an inadvertent double-click resulted in two identical orders, notify our team immediately before proof approval; the duplicate transaction will be reversed 100% to your original payment method.
            </div>
          </div>
        </section>

        {/* 5. Corporate PO */}
        <section id="corporate-po">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            5. Corporate Purchase Orders & Net-30 Invoicing
          </h2>
          <p className="mb-3">
            Established corporate enterprises, tech startups, and institutional procurement teams may apply for credit billing terms:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mb-3 text-xs sm:text-sm">
            <li>Orders are booked against a digitally signed and authorized corporate Purchase Order (PO).</li>
            <li>Invoices are payable within 15 to 30 calendar days of merchandise dispatch, subject to prior credit assessment and KYC verification.</li>
            <li>Wire payments are accepted via RTGS/NEFT to our verified corporate bank account.</li>
          </ul>
        </section>

        {/* 6. Chargebacks */}
        <section id="chargebacks-refunds">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            6. Chargebacks & Reversal Process
          </h2>
          <p className="mb-3">
            We encourage all buyers to contact our dedicated customer resolution desk before initiating a bank chargeback. If you believe a billing error has occurred or you are entitled to a refund, we will investigate and resolve the issue directly in accordance with our{' '}
            <button onClick={() => onNavigate('/cancellation-refund-policy')} className="text-[#FF7A00] underline font-medium cursor-pointer">
              Cancellation and Refund Policy
            </button>.
          </p>
        </section>

        {/* 7. Support */}
        <section id="payment-support">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            7. Payment & Billing Assistance
          </h2>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <p><strong>Billing Desk Email:</strong> <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="text-[#FF7A00] underline">{BUSINESS_DETAILS.supportEmail}</a></p>
            <p><strong>WhatsApp Support:</strong> {BUSINESS_DETAILS.whatsappHelp}</p>
            <p><strong>Helpdesk Hours:</strong> {BUSINESS_DETAILS.supportHours}</p>
          </div>
        </section>

      </div>
    </LegalLayout>
  );
};
